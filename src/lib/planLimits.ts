import type { SupabaseClient } from '@supabase/supabase-js';

export interface PlanLimits {
  max_workflows: number;
  max_nodes_per_workflow: number;
  max_dashboards: number;
  max_collaborators: number;
  max_custom_elements: number;
  max_favorites: number;
  max_version_history: number;
  ai_credits_monthly: number;
  can_realtime_collab: boolean;
  can_share_links: boolean;
  can_export_svg_pdf: boolean;
  can_workspace_elements: boolean;
  priority_support: boolean;
  max_workspaces: number;
  max_workspace_share_links: number;
  max_marketplace_installs: number;
  max_created_nodes: number;
  max_node_groups: number;
}

export type PlanType = 'free' | 'warrior' | 'elite' | 'champion' | 'legend';

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    max_workflows: 3,
    max_nodes_per_workflow: 50,
    max_dashboards: 1,
    max_collaborators: 0,
    max_custom_elements: 2,
    max_favorites: 5,
    max_version_history: 3,
    ai_credits_monthly: 10,
    can_realtime_collab: false,
    can_share_links: false,
    can_export_svg_pdf: false,
    can_workspace_elements: false,
    priority_support: false,
    max_workspaces: 1,
    max_workspace_share_links: 0,
    max_marketplace_installs: 5,
    max_created_nodes: 2,
    max_node_groups: 3,
  },
  warrior: {
    max_workflows: 20,
    max_nodes_per_workflow: 250,
    max_dashboards: 5,
    max_collaborators: 3,
    max_custom_elements: 10,
    max_favorites: 20,
    max_version_history: 10,
    ai_credits_monthly: 50,
    can_realtime_collab: false,
    can_share_links: true,
    can_export_svg_pdf: false,
    can_workspace_elements: false,
    priority_support: false,
    max_workspaces: 3,
    max_workspace_share_links: 3,
    max_marketplace_installs: 20,
    max_created_nodes: 10,
    max_node_groups: 6,
  },
  elite: {
    max_workflows: 75,
    max_nodes_per_workflow: 1000,
    max_dashboards: 20,
    max_collaborators: 10,
    max_custom_elements: 50,
    max_favorites: 50,
    max_version_history: 30,
    ai_credits_monthly: 200,
    can_realtime_collab: true,
    can_share_links: true,
    can_export_svg_pdf: true,
    can_workspace_elements: true,
    priority_support: false,
    max_workspaces: 9999,
    max_workspace_share_links: 9999,
    max_marketplace_installs: 50,
    max_created_nodes: 30,
    max_node_groups: 12,
  },
  champion: {
    max_workflows: 250,
    max_nodes_per_workflow: 5000,
    max_dashboards: 100,
    max_collaborators: 30,
    max_custom_elements: 200,
    max_favorites: 150,
    max_version_history: 100,
    ai_credits_monthly: 500,
    can_realtime_collab: true,
    can_share_links: true,
    can_export_svg_pdf: true,
    can_workspace_elements: true,
    priority_support: true,
    max_workspaces: 9999,
    max_workspace_share_links: 9999,
    max_marketplace_installs: 200,
    max_created_nodes: 100,
    max_node_groups: 25,
  },
  legend: {
    max_workflows: 9999,
    max_nodes_per_workflow: 99999,
    max_dashboards: 9999,
    max_collaborators: 9999,
    max_custom_elements: 9999,
    max_favorites: 9999,
    max_version_history: 9999,
    ai_credits_monthly: 2000,
    can_realtime_collab: true,
    can_share_links: true,
    can_export_svg_pdf: true,
    can_workspace_elements: true,
    priority_support: true,
    max_workspaces: 9999,
    max_workspace_share_links: 9999,
    max_marketplace_installs: 9999,
    max_created_nodes: 9999,
    max_node_groups: 9999,
  },
};

export function checkFavoriteLimit(activePlan: PlanType, currentCount: number): boolean {
  const limits = PLAN_LIMITS[activePlan] || PLAN_LIMITS.free;
  return currentCount < limits.max_favorites;
}

export function checkCustomElementLimit(activePlan: PlanType, currentCount: number): boolean {
  const limits = PLAN_LIMITS[activePlan] || PLAN_LIMITS.free;
  return currentCount < limits.max_custom_elements;
}

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  plan: PlanType;
}

export async function checkPlanLimit(
  supabase: SupabaseClient,
  workspaceId: string,
  resource: 'workflows' | 'dashboards' | 'collaborators' | 'custom_elements' | 'favorites' | 'version_history' | 'ai_credits' | 'marketplace_installs' | 'created_nodes' | 'node_groups',
  extraId?: string // userId for favorites, workflowId for version_history, or authorId for created_nodes
): Promise<LimitCheckResult> {
  // 1. Fetch current subscription details
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const plan: PlanType = (sub?.plan as PlanType) || 'free';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  let current = 0;
  let limit = 0;

  switch (resource) {
    case 'workflows': {
      limit = limits.max_workflows;
      const { count } = await supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .neq('status', 'archived');
      current = count || 0;
      break;
    }
    case 'dashboards': {
      limit = limits.max_dashboards;
      const { count } = await supabase
        .from('dashboards')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      current = count || 0;
      break;
    }
    case 'collaborators': {
      limit = limits.max_collaborators;
      const { count } = await supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .neq('role', 'owner');
      current = count || 0;
      break;
    }
    case 'custom_elements': {
      limit = limits.max_custom_elements;
      const { count } = await supabase
        .from('custom_node_templates')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      current = count || 0;
      break;
    }
    case 'favorites': {
      limit = limits.max_favorites;
      const userId = extraId;
      if (userId) {
        const { count } = await supabase
          .from('user_favorite_nodes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        current = count || 0;
      }
      break;
    }
    case 'version_history': {
      limit = limits.max_version_history;
      const workflowId = extraId;
      if (workflowId) {
        const { count } = await supabase
          .from('workflow_versions')
          .select('*', { count: 'exact', head: true })
          .eq('workflow_id', workflowId);
        current = count || 0;
      }
      break;
    }
    case 'ai_credits': {
      limit = limits.ai_credits_monthly;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: requests } = await supabase
        .from('ai_requests')
        .select('credits_used')
        .eq('workspace_id', workspaceId)
        .gte('created_at', startOfMonth.toISOString());

      current = (requests || []).reduce((acc: number, req: { credits_used: number }) => acc + (req.credits_used || 0), 0);
      break;
    }
    case 'marketplace_installs': {
      limit = limits.max_marketplace_installs;
      const { count } = await supabase
        .from('marketplace_installs')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      current = count || 0;
      break;
    }
    case 'created_nodes': {
      limit = limits.max_created_nodes;
      const authorId = extraId;
      if (authorId) {
        const { count } = await supabase
          .from('marketplace_nodes')
          .select('*', { count: 'exact', head: true })
          .eq('author_id', authorId);
        current = count || 0;
      }
      break;
    }
    case 'node_groups': {
      limit = limits.max_node_groups;
      const { data } = await supabase
        .from('workspace_node_settings')
        .select('node_groups')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      const groups = (data?.node_groups as Array<{ id?: string }> | null) || [];
      const defaultGroupIds = ['basic', 'human', 'board', 'marketplace', 'custom', 'favorites'];
      const customGroups = groups.filter((g) => g && g.id && !defaultGroupIds.includes(g.id));
      current = customGroups.length;
      break;
    }
  }

  return {
    allowed: current < limit,
    current,
    limit,
    plan,
  };
}
