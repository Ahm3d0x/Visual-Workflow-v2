/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { type PlanType, DEFAULT_PRICING } from '@/lib/planLimits';

// Helper to verify admin privileges and return authorized Supabase client as any
async function verifyAdmin(): Promise<any> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthenticated');
  }

  const { data: profile, error: profileError } = await (supabase
    .from('profiles') as any)
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.is_admin) {
    throw new Error('Unauthorized');
  }

  return supabase as any;
}

// 1. Fetch administrative overview metrics
export async function getAdminStats() {
  try {
    const supabase = await verifyAdmin();

    const [
      { count: totalUsers },
      { count: totalWorkspaces },
      { count: totalMarketplaceNodes },
      { data: subs },
      { count: pendingNodesCount }
    ] = await Promise.all([
      (supabase.from('profiles') as any).select('*', { count: 'exact', head: true }),
      (supabase.from('workspaces') as any).select('*', { count: 'exact', head: true }),
      (supabase.from('marketplace_nodes') as any).select('*', { count: 'exact', head: true }),
      (supabase.from('subscriptions') as any).select('plan, status'),
      (supabase.from('marketplace_nodes') as any).select('*', { count: 'exact', head: true }).eq('status', 'under_review')
    ]);

    // Fetch pricing settings to compute estimated MRR dynamically
    const pricingRes = await getPricingSettings();
    const pricingMap: Record<string, number> = {};
    if (pricingRes.success && pricingRes.data) {
      pricingRes.data.forEach((p: any) => {
        pricingMap[p.plan] = Number(p.price_monthly);
      });
    }

    // Compute estimated MRR in EGP
    let estimatedMrr = 0;
    let activeSubscriptionsCount = 0;

    (subs || []).forEach((sub: any) => {
      if (sub.status === 'active' || sub.status === 'trialing') {
        activeSubscriptionsCount++;
        const planPrice = pricingMap[sub.plan] || (DEFAULT_PRICING[sub.plan as keyof typeof DEFAULT_PRICING]?.price_monthly || 0);
        estimatedMrr += planPrice;
      }
    });

    return {
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        totalWorkspaces: totalWorkspaces || 0,
        totalMarketplaceNodes: totalMarketplaceNodes || 0,
        totalSubscriptions: activeSubscriptionsCount,
        pendingNodesCount: pendingNodesCount || 0,
        estimatedMrr,
      }
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to retrieve stats' };
  }
}

// 2. Fetch list of users for administration
export async function getAdminUsers() {
  try {
    const supabase = await verifyAdmin();

    const { data: users, error } = await (supabase
      .from('profiles') as any)
      .select('id, email, full_name, avatar_url, created_at, is_admin')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: users };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to fetch users' };
  }
}

// 3. Promote or demote an administrator
export async function toggleAdminStatus(targetUserId: string, isAdmin: boolean) {
  try {
    const supabase = await verifyAdmin();

    // Prevent removing own admin permissions
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === targetUserId && !isAdmin) {
      return { error: 'CANNOT_DEMOTE_SELF' };
    }

    const { error } = await (supabase
      .from('profiles') as any)
      .update({ is_admin: isAdmin })
      .eq('id', targetUserId);

    if (error) throw error;

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to update admin privileges' };
  }
}

// 4. Fetch subscriptions configuration
export async function getAdminSubscriptions() {
  try {
    const supabase = await verifyAdmin();

    interface WorkspaceProfile {
      email: string;
      full_name: string | null;
    }

    interface WorkspaceInfo {
      id: string;
      name: string;
      plan: string;
      owner_id: string;
      profiles: WorkspaceProfile | null;
    }

    interface SubscriptionRow {
      id: string;
      workspace_id: string;
      plan: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      stripe_price_id: string | null;
      status: string;
      current_period_start: string | null;
      current_period_end: string | null;
      cancel_at_period_end: boolean;
      workspaces: WorkspaceInfo | null;
    }

    const { data, error } = await (supabase
      .from('subscriptions') as any)
      .select(`
        id,
        workspace_id,
        plan,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_price_id,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        workspaces (
          id,
          name,
          plan,
          owner_id,
          profiles:owner_id (
            email,
            full_name
          )
        )
      `) as unknown as { data: SubscriptionRow[] | null; error: { message: string } | null };

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to retrieve subscriptions' };
  }
}

// 5. Fetch marketplace nodes pending administrator review
export async function getAdminPendingNodes() {
  try {
    const supabase = await verifyAdmin();

    interface AuthorProfile {
      email: string;
      full_name: string | null;
    }

    interface MarketplaceNodeRow {
      id: string;
      author_id: string;
      name: string;
      description: string;
      category: string;
      domain: string | null;
      icon: string;
      accent_bar: string;
      badge_color: string;
      color_class: string;
      visibility: string;
      status: string;
      created_at: string;
      profiles: AuthorProfile | null;
    }

    const { data, error } = await (supabase
      .from('marketplace_nodes') as any)
      .select(`
        id,
        author_id,
        name,
        description,
        category,
        domain,
        icon,
        accent_bar,
        badge_color,
        color_class,
        visibility,
        status,
        created_at,
        profiles:author_id (
          email,
          full_name
        )
      `)
      .eq('status', 'under_review')
      .order('created_at', { ascending: false }) as unknown as { data: MarketplaceNodeRow[] | null; error: { message: string } | null };

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to retrieve pending reviews' };
  }
}

// 6. Approve or reject marketplace node
export async function reviewMarketplaceNode(nodeId: string, action: 'approve' | 'reject') {
  try {
    const supabase = await verifyAdmin();

    const status = action === 'approve' ? 'published' : 'rejected';

    const { error } = await (supabase
      .from('marketplace_nodes') as any)
      .update({ status })
      .eq('id', nodeId);

    if (error) throw error;

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to review node' };
  }
}

// 7. Update workspace plan limits manually
export async function updateWorkspacePlan(workspaceId: string, plan: PlanType) {
  try {
    const supabase = await verifyAdmin();

    // 1. Update workspaces table plan
    const { error: wsError } = await (supabase
      .from('workspaces') as any)
      .update({ plan })
      .eq('id', workspaceId);

    if (wsError) throw wsError;

    // 2. Check if subscription record exists to update or insert
    const { data: existingSub, error: selectError } = await (supabase
      .from('subscriptions') as any)
      .select('id')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (!existingSub) {
      const { error: insertError } = await (supabase
        .from('subscriptions') as any)
        .insert({
          workspace_id: workspaceId,
          plan,
          status: 'active'
        });
      if (insertError) throw insertError;
    } else {
      const { error: updateError } = await (supabase
        .from('subscriptions') as any)
        .update({ plan })
        .eq('workspace_id', workspaceId);
      if (updateError) throw updateError;
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to manually adjust plan limits' };
  }
}



// 8. Fetch pricing settings (publicly accessible)
export async function getPricingSettings() {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase
      .from('pricing_settings') as any)
      .select('*');

    if (error || !data || data.length === 0) {
      return { 
        success: true, 
        data: Object.entries(DEFAULT_PRICING).map(([plan, pricing]) => ({
          plan: plan as PlanType,
          price_monthly: pricing.price_monthly,
          price_annual: pricing.price_annual,
          stripe_monthly_price_id: pricing.stripe_monthly_price_id,
          stripe_annual_price_id: pricing.stripe_annual_price_id
        }))
      };
    }

    return { success: true, data };
  } catch {
    return { 
      success: true, 
      data: Object.entries(DEFAULT_PRICING).map(([plan, pricing]) => ({
        plan: plan as PlanType,
        price_monthly: pricing.price_monthly,
        price_annual: pricing.price_annual,
        stripe_monthly_price_id: pricing.stripe_monthly_price_id,
        stripe_annual_price_id: pricing.stripe_annual_price_id
      }))
    };
  }
}

// 9. Update pricing settings for a plan (admin-only)
export async function updatePricingSettings(
  plan: PlanType,
  pricingData: {
    price_monthly: number;
    price_annual: number;
    stripe_monthly_price_id: string;
    stripe_annual_price_id: string;
  }
) {
  try {
    const supabase = await verifyAdmin();

    const { error } = await (supabase
      .from('pricing_settings') as any)
      .upsert({
        plan,
        price_monthly: pricingData.price_monthly,
        price_annual: pricingData.price_annual,
        stripe_monthly_price_id: pricingData.stripe_monthly_price_id,
        stripe_annual_price_id: pricingData.stripe_annual_price_id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'plan' });

    if (error) throw error;

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to update pricing settings' };
  }
}

