'use server';

import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { checkPlanLimit } from '@/lib/planLimits';
import type { SupabaseClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15' as never,
});

export async function createCheckoutSession(
  workspaceId: string,
  priceId: string,
  locale: string = 'en'
): Promise<{ url: string | null; error?: string }> {
  try {
    const supabase = await createClient();
    
    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { url: null, error: 'Unauthorized. Please sign in.' };
    }

    // 2. Fetch workspace details
    const { data: workspace, error: wsError } = await (supabase
      .from('workspaces')
      .select('name, stripe_customer_id, owner_id')
      .eq('id', workspaceId)
      .single() as unknown as Promise<{
        data: { name: string; stripe_customer_id: string | null; owner_id: string } | null;
        error: { message: string } | null;
      }>);

    if (wsError || !workspace) {
      return { url: null, error: 'Workspace not found.' };
    }

    // Only workspace owners or administrators can initiate checkout
    // Check membership role
    const { data: member } = await (supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single() as unknown as Promise<{
        data: { role: string } | null;
        error: { message: string } | null;
      }>);

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return { url: null, error: 'Only owners or administrators can manage billing.' };
    }

    // 3. Resolve Stripe Customer ID
    let customerId = workspace.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: workspace.name,
        metadata: {
          workspace_id: workspaceId,
        },
      });
      customerId = customer.id;

      // Update workspace table with stripe customer id
      await (supabase.from('workspaces') as unknown as {
        update: (arg: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
      })
        .update({ stripe_customer_id: customerId })
        .eq('id', workspaceId);
    }

    // 4. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/billing?canceled=true`,
      metadata: {
        workspace_id: workspaceId,
      },
    });

    return { url: session.url };
  } catch (err: unknown) {
    console.error('Error creating Stripe Checkout session:', err);
    return { url: null, error: (err as Error).message || 'Failed to initiate checkout.' };
  }
}

export async function createPortalSession(
  workspaceId: string,
  locale: string = 'en'
): Promise<{ url: string | null; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { url: null, error: 'Unauthorized. Please sign in.' };
    }

    // 2. Fetch workspace details
    const { data: workspace, error: wsError } = await (supabase
      .from('workspaces')
      .select('stripe_customer_id')
      .eq('id', workspaceId)
      .single() as unknown as Promise<{
        data: { stripe_customer_id: string | null } | null;
        error: { message: string } | null;
      }>);

    if (wsError || !workspace || !workspace.stripe_customer_id) {
      return { url: null, error: 'Stripe customer record not found for this workspace.' };
    }

    // 3. Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: workspace.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/billing`,
    });

    return { url: session.url };
  } catch (err: unknown) {
    console.error('Error creating Stripe Customer Portal session:', err);
    return { url: null, error: (err as Error).message || 'Failed to initiate customer portal.' };
  }
}

export async function getWorkspaceSubscription(workspaceId: string) {
  try {
    const supabase = await createClient();

    const { data: subscription } = await (supabase
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle() as unknown as Promise<{ data: unknown; error: { message: string } | null }>);

    return { subscription };
  } catch (err) {
    console.error('Error fetching subscription details:', err);
    return { subscription: null };
  }
}

export async function getUsageMetrics(workspaceId: string, userId: string) {
  try {
    const supabase = await createClient();

    const workflows = await checkPlanLimit(supabase as unknown as SupabaseClient, workspaceId, 'workflows');
    const customElements = await checkPlanLimit(supabase as unknown as SupabaseClient, workspaceId, 'custom_elements');
    const favorites = await checkPlanLimit(supabase as unknown as SupabaseClient, workspaceId, 'favorites', userId);
    const aiCredits = await checkPlanLimit(supabase as unknown as SupabaseClient, workspaceId, 'ai_credits');

    return {
      workflows,
      customElements,
      favorites,
      aiCredits,
    };
  } catch (err) {
    console.error('Error resolving usage metrics:', err);
    return null;
  }
}
