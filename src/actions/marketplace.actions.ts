'use server';

import { createClient } from '@/lib/supabase/server';
import { PLAN_LIMITS, type PlanType, checkPlanLimit } from '@/lib/planLimits';

// ─── Install a marketplace node into a workspace ───
export async function installMarketplaceNode(workspaceId: string, marketplaceNodeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthenticated' };

  // Check plan limits
  const { data: sub } = await (supabase
    .from('subscriptions')
    .select('plan')
    .eq('workspace_id', workspaceId)
    .maybeSingle() as unknown as Promise<{ data: { plan: string } | null }>);

  const plan: PlanType = (sub?.plan as PlanType) || 'free';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const maxInstalls = limits.max_marketplace_installs;

  const { count } = await (supabase
    .from('marketplace_installs')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId) as unknown as Promise<{ count: number | null }>);

  if ((count || 0) >= maxInstalls) {
    return { error: 'PLAN_LIMIT_REACHED', data: { limit: maxInstalls } };
  }

  const { error } = await (supabase.from('marketplace_installs') as unknown as {
    insert: (arg: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  }).insert({
    workspace_id: workspaceId,
    marketplace_node_id: marketplaceNodeId,
    installed_by: user.id,
  });

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Uninstall a marketplace node from a workspace ───
export async function uninstallMarketplaceNode(workspaceId: string, marketplaceNodeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthenticated' };

  const { error } = await supabase
    .from('marketplace_installs')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('marketplace_node_id', marketplaceNodeId);

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Rate a marketplace node ───
export async function rateMarketplaceNode(
  marketplaceNodeId: string,
  rating: number,
  review?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthenticated' };

  if (rating < 1 || rating > 5) return { error: 'Rating must be between 1 and 5' };

  // Upsert rating (update if exists, insert if not)
  const { error } = await (supabase.from('marketplace_ratings') as unknown as {
    upsert: (arg: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
  }).upsert(
    {
      marketplace_node_id: marketplaceNodeId,
      user_id: user.id,
      rating,
      review: review || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'marketplace_node_id,user_id' }
  );

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Publish a new node to the marketplace ───
export async function publishMarketplaceNode(
  workspaceId: string,
  nodeData: {
    name: string;
    description: string;
    long_description?: string;
    category: string;
    domain?: string;
    tags: string[];
    icon: string;
    color: string;
    accent_bar: string;
    badge_color: string;
    color_class: string;
    base_type: string;
    default_data: Record<string, unknown>;
    default_style: Record<string, unknown>;
    handles: Record<string, unknown>;
    fields_schema: Record<string, unknown>[];
    visibility: 'private' | 'workspace' | 'public';
    is_free?: boolean;
    price?: number;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthenticated' };

  // Check plan limits for node creation
  const limitCheck = await checkPlanLimit(supabase, workspaceId, 'created_nodes', user.id);
  if (!limitCheck.allowed) {
    return { error: 'PLAN_LIMIT_REACHED', data: { limit: limitCheck.limit } };
  }

  // Public nodes require admin review/approval
  const status = nodeData.visibility === 'public' ? 'under_review' : 'draft';

  const { data, error } = await (supabase.from('marketplace_nodes') as unknown as {
    insert: (arg: Record<string, unknown>) => {
      select: (fields: string) => {
        single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
  }).insert({
    author_id: user.id,
    name: nodeData.name,
    description: nodeData.description,
    long_description: nodeData.long_description || null,
    category: nodeData.category,
    domain: nodeData.domain || null,
    tags: nodeData.tags,
    icon: nodeData.icon,
    color: nodeData.color,
    accent_bar: nodeData.accent_bar,
    badge_color: nodeData.badge_color,
    color_class: nodeData.color_class,
    base_type: nodeData.base_type,
    default_data: nodeData.default_data,
    default_style: nodeData.default_style,
    handles: nodeData.handles,
    fields_schema: nodeData.fields_schema,
    visibility: nodeData.visibility,
    status,
    is_free: nodeData.is_free ?? true,
    price: nodeData.price ?? 0.00,
  }).select('id').single();

  if (error) return { error: error.message };
  return { success: true, data: { id: data?.id } };
}

// ─── Update an existing marketplace node ───
export async function updateMarketplaceNode(
  nodeId: string,
  updates: Partial<{
    name: string;
    description: string;
    long_description: string;
    category: string;
    domain: string;
    tags: string[];
    icon: string;
    color: string;
    accent_bar: string;
    badge_color: string;
    color_class: string;
    base_type: string;
    default_data: Record<string, unknown>;
    default_style: Record<string, unknown>;
    handles: Record<string, unknown>;
    fields_schema: Record<string, unknown>[];
    visibility: 'private' | 'workspace' | 'public';
    status: 'draft' | 'published' | 'archived';
  }>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthenticated' };

  const { error } = await (supabase.from('marketplace_nodes') as unknown as {
    update: (arg: Record<string, unknown>) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  }).update({
    ...updates,
    updated_at: new Date().toISOString(),
  }).eq('id', nodeId).eq('author_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Delete a marketplace node ───
export async function deleteMarketplaceNode(nodeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthenticated' };

  const { error } = await supabase
    .from('marketplace_nodes')
    .delete()
    .eq('id', nodeId)
    .eq('author_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}
