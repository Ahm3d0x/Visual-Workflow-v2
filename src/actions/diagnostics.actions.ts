'use server';

import { createClient } from '@/lib/supabase/server';
import { PLAN_LIMITS, type PlanType } from '@/lib/planLimits';

export interface TableAuditResult {
  tableName: string;
  status: 'ok' | 'error';
  rowCount: number;
  errorReason: string | null;
}

export interface DiagnosticsAuditResult {
  databaseAudit: TableAuditResult[];
  planAudit: {
    plan: string;
    workflows: { current: number; limit: number; status: 'ok' | 'warn' | 'limit' };
    customElements: { current: number; limit: number; status: 'ok' | 'warn' | 'limit' };
    collaborators: { current: number; limit: number; status: 'ok' | 'warn' | 'limit' };
    aiCredits: { current: number; limit: number; status: 'ok' | 'warn' | 'limit' };
  } | null;
  aiConfigured: boolean;
  systemLocale: string[];
}

const TABLES_TO_AUDIT = [
  'profiles',
  'user_preferences',
  'workspaces',
  'workspace_members',
  'dashboards',
  'workflows',
  'workflow_nodes',
  'workflow_edges',
  'workflow_versions',
  'workflow_comments',
  'workflow_activity',
  'workflow_shares',
  'custom_node_templates',
  'user_favorite_nodes',
  'subscriptions',
  'ai_requests',
];

export async function runDiagnosticsAudit(workspaceId: string): Promise<DiagnosticsAuditResult> {
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // 2. Perform Database Audit (16 tables)
  const databaseAudit: TableAuditResult[] = [];
  
  for (const tableName of TABLES_TO_AUDIT) {
    try {
      // Execute count query using type safe query structures
      const { count, error } = await (supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true }) as unknown as Promise<{ count: number | null; error: { message: string } | null }>);

      if (error) {
        databaseAudit.push({
          tableName,
          status: 'error',
          rowCount: 0,
          errorReason: error.message,
        });
      } else {
        databaseAudit.push({
          tableName,
          status: 'ok',
          rowCount: count || 0,
          errorReason: null,
        });
      }
    } catch (err: unknown) {
      databaseAudit.push({
        tableName,
        status: 'error',
        rowCount: 0,
        errorReason: (err as Error).message,
      });
    }
  }

  // 3. Perform Plan & Resource Limits Audit
  let planAuditResult: DiagnosticsAuditResult['planAudit'] = null;

  try {
    // A. Fetch active workspace info
    const { data: workspace } = await (supabase
      .from('workspaces')
      .select('plan')
      .eq('id', workspaceId)
      .single() as unknown as Promise<{ data: { plan: string } | null }>);

    if (workspace) {
      const planKey = (workspace.plan.toLowerCase() as PlanType) || 'free';
      const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;

      // B. Fetch Resource counts:
      // i. Workflows Count
      const { count: workflowsCount } = await supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      // ii. Custom Elements Count
      const { count: customElementsCount } = await supabase
        .from('custom_node_templates')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      // iii. Collaborators Count
      const { count: collaboratorsCount } = await supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      // iv. AI Requests credits used count
      const { data: requests } = await (supabase
        .from('ai_requests')
        .select('credits_used')
        .eq('workspace_id', workspaceId) as unknown as Promise<{ data: { credits_used: number }[] | null }>);

      const aiCreditsUsed = requests ? requests.reduce((sum, r) => sum + r.credits_used, 0) : 0;

      const getMetricStatus = (current: number, limit: number) => {
        if (current >= limit) return 'limit';
        if (current >= limit * 0.8) return 'warn';
        return 'ok';
      };

      planAuditResult = {
        plan: workspace.plan,
        workflows: {
          current: workflowsCount || 0,
          limit: limits.max_workflows,
          status: getMetricStatus(workflowsCount || 0, limits.max_workflows),
        },
        customElements: {
          current: customElementsCount || 0,
          limit: limits.max_custom_elements,
          status: getMetricStatus(customElementsCount || 0, limits.max_custom_elements),
        },
        collaborators: {
          current: collaboratorsCount || 0,
          limit: limits.max_collaborators,
          status: getMetricStatus(collaboratorsCount || 0, limits.max_collaborators),
        },
        aiCredits: {
          current: aiCreditsUsed,
          limit: limits.ai_credits_monthly,
          status: getMetricStatus(aiCreditsUsed, limits.ai_credits_monthly),
        },
      };
    }
  } catch (err) {
    console.error('Failed to run plan audit:', err);
  }

  // 4. Validate Environment Variables Configuration
  const aiConfigured = !!process.env.OPENAI_API_KEY;

  return {
    databaseAudit,
    planAudit: planAuditResult,
    aiConfigured,
    systemLocale: ['en', 'ar'],
  };
}
