import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { PlanType } from '@/lib/planLimits';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15' as never,
});

// Safe system Supabase client using Service Role Key to safely bypass RLS checks in system webhook
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getPlanFromPriceId(priceId: string): PlanType {
  const p = priceId.toLowerCase();
  if (p.includes('legend')) return 'legend';
  if (p.includes('champion')) return 'champion';
  if (p.includes('elite')) return 'elite';
  if (p.includes('warrior')) return 'warrior';
  return 'free';
}

interface StripeSubscriptionStub {
  id: string;
  status: string;
  customer: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items: {
    data: Array<{
      price: {
        id: string;
      };
    }>;
  };
}

interface StripeInvoiceStub {
  subscription: string | null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return new NextResponse('Missing Stripe signature header', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    console.error(`Webhook signature verification failed: ${(err as Error).message}`);
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspace_id;

        if (!workspaceId) {
          console.warn('Checkout session completed missing workspace_id in metadata');
          break;
        }

        const subscriptionId = session.subscription as string;
        const rawSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        const subscription = rawSubscription as unknown as StripeSubscriptionStub;
        const priceId = subscription.items.data[0].price.id;
        const plan = getPlanFromPriceId(priceId);

        type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete';
        const subStatus = subscription.status as SubscriptionStatus;

        // Update Subscriptions record
        await (supabaseAdmin.from('subscriptions') as unknown as {
          upsert: (arg: Record<string, unknown>) => Promise<unknown>;
        }).upsert({
          workspace_id: workspaceId,
          plan,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          status: subStatus,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        });

        // Update workspaces plan & customer identifier
        await (supabaseAdmin.from('workspaces') as unknown as {
          update: (arg: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
        })
          .update({ 
            plan, 
            stripe_customer_id: session.customer as string 
          })
          .eq('id', workspaceId);

        console.log(`Successfully completed checkout for workspace ${workspaceId} to plan ${plan}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as unknown as StripeSubscriptionStub;
        const customerId = subscription.customer;

        // Resolve workspace by stripe customer identifier
        const { data: workspace } = await (supabaseAdmin
          .from('workspaces')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle() as unknown as Promise<{ data: { id: string } | null; error: unknown }>);

        if (!workspace) {
          console.warn(`Customer subscription updated: workspace not found for customer ${customerId}`);
          break;
        }

        const priceId = subscription.items.data[0].price.id;
        const plan = getPlanFromPriceId(priceId);

        type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete';
        const subStatus = subscription.status as SubscriptionStatus;

        // Sync Subscriptions record
        await (supabaseAdmin.from('subscriptions') as unknown as {
          update: (arg: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
        })
          .update({
            plan,
            status: subStatus,
            stripe_price_id: priceId,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscription.id);

        // Sync workspaces plan
        await (supabaseAdmin.from('workspaces') as unknown as {
          update: (arg: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
        })
          .update({ plan })
          .eq('id', workspace.id);

        console.log(`Successfully updated subscription for workspace ${workspace.id} to plan ${plan}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as unknown as StripeSubscriptionStub;
        const customerId = subscription.customer;

        const { data: workspace } = await (supabaseAdmin
          .from('workspaces')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle() as unknown as Promise<{ data: { id: string } | null; error: unknown }>);

        if (!workspace) {
          console.warn(`Customer subscription deleted: workspace not found for customer ${customerId}`);
          break;
        }

        // Downgrade to Free tier in workspaces
        await (supabaseAdmin.from('workspaces') as unknown as {
          update: (arg: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
        })
          .update({ plan: 'free' })
          .eq('id', workspace.id);

        // Sync Subscriptions record to fallback Free
        await (supabaseAdmin.from('subscriptions') as unknown as {
          update: (arg: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
        })
          .update({
            plan: 'free',
            status: 'active', // Free plan stays active
            stripe_subscription_id: null,
            stripe_price_id: null,
            cancel_at_period_end: false,
          })
          .eq('workspace_id', workspace.id);

        console.log(`Successfully deleted subscription for workspace ${workspace.id}, downgraded to free.`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as StripeInvoiceStub;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          await (supabaseAdmin.from('subscriptions') as unknown as {
            update: (arg: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
          })
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId);

          console.log(`Updated subscription ${subscriptionId} status to past_due on invoice failure.`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as unknown as StripeInvoiceStub;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          await (supabaseAdmin.from('subscriptions') as unknown as {
            update: (arg: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
          })
            .update({ status: 'active' })
            .eq('stripe_subscription_id', subscriptionId);

          console.log(`Restored subscription ${subscriptionId} status to active on successful invoice paid.`);
        }
        break;
      }
    }

    return new NextResponse('Webhook processed successfully', { status: 200 });
  } catch (err: unknown) {
    console.error('Error executing Stripe Webhook handler:', err);
    return new NextResponse(`Internal Webhook Error: ${(err as Error).message}`, { status: 500 });
  }
}
