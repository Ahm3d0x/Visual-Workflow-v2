'use server';

import { createClient } from '@/lib/supabase/server';
import { checkPlanLimit } from '@/lib/planLimits';

// ─── Save workspace node settings ───
export async function saveWorkspaceNodeSettings(
  workspaceId: string,
  settings: {
    node_groups?: Array<{ id?: string; [key: string]: unknown }>;
    hidden_nodes?: string[];
    custom_order?: Record<string, unknown>;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthenticated' };

  // Check plan limit for custom node groups
  if (settings.node_groups) {
    const defaultGroupIds = ['basic', 'human', 'board', 'marketplace', 'custom', 'favorites'];
    const customGroups = settings.node_groups.filter(
      (g) => g && g.id && !defaultGroupIds.includes(g.id)
    );

    const limitCheck = await checkPlanLimit(supabase, workspaceId, 'node_groups');
    if (customGroups.length > limitCheck.limit) {
      return { error: 'PLAN_LIMIT_REACHED', data: { limit: limitCheck.limit } };
    }
  }

  // Upsert workspace node settings
  const { error } = await (supabase.from('workspace_node_settings') as unknown as {
    upsert: (arg: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
  }).upsert(
    {
      workspace_id: workspaceId,
      node_groups: settings.node_groups || [],
      hidden_nodes: settings.hidden_nodes || [],
      custom_order: settings.custom_order || {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'workspace_id' }
  );

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Get workspace node settings ───
export async function getWorkspaceNodeSettings(workspaceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthenticated', data: null };

  const { data, error } = await (supabase
    .from('workspace_node_settings')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle() as unknown as Promise<{
      data: {
        id: string;
        workspace_id: string;
        node_groups: unknown[];
        hidden_nodes: string[];
        custom_order: Record<string, unknown>;
      } | null;
      error: { message: string } | null;
    }>);

  if (error) return { error: error.message, data: null };
  return { data };
}

// ─── Reset workspace node settings to default ───
export async function resetWorkspaceNodeSettings(workspaceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthenticated' };

  const { error } = await supabase
    .from('workspace_node_settings')
    .delete()
    .eq('workspace_id', workspaceId);

  if (error) return { error: error.message };
  return { success: true };
}
