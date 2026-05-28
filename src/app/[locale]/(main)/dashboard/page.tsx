import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { WorkflowsList } from '@/components/dashboard/WorkflowsList';

interface WorkspaceRecord {
  role: string;
  workspaces: {
    id: string;
    name: string;
    plan: string;
    trial_ends_at: string | null;
  } | null;
}

interface AIRequestRecord {
  credits_used: number;
}

interface WorkflowItem {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived' | 'published';
  node_count: number;
  updated_at: string;
}

export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  // 1. Validate active user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  // 2. Fetch user's workspaces
  const { data: memberRecords } = await (supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, plan, trial_ends_at)')
    .eq('user_id', user.id) as unknown as { data: WorkspaceRecord[] | null });

  const workspaces = memberRecords
    ? memberRecords
        .map((r) => r.workspaces)
        .filter((w): w is { id: string; name: string; plan: string; trial_ends_at: string | null } => w !== null)
    : [];

  const activeWorkspace = workspaces[0];

  if (!activeWorkspace) {
    // Return early if workspace triggers are still executing (graceful fallback)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 space-y-4">
        <h2 className="text-2xl font-bold font-sans">Setting up your Workspace...</h2>
        <p className="text-sm text-muted-foreground font-light max-w-sm">
          Please wait a moment while we provision your custom workflows canvas and Legend trial dashboard.
        </p>
      </div>
    );
  }

  // 3. Fetch workflows inside this workspace
  const { data: workflowsRecord } = await supabase
    .from('workflows')
    .select('id, name, description, status, node_count, updated_at')
    .eq('workspace_id', activeWorkspace.id)
    .order('updated_at', { ascending: false });

  const workflows = (workflowsRecord || []) as WorkflowItem[];

  // 4. Fetch metrics for StatsBar
  const { count: customNodesCount } = await supabase
    .from('custom_node_templates')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', activeWorkspace.id);

  const { count: membersCount } = await supabase
    .from('workspace_members')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', activeWorkspace.id);

  // AI credits calculation
  const { data: requests } = await (supabase
    .from('ai_requests')
    .select('credits_used')
    .eq('workspace_id', activeWorkspace.id) as unknown as { data: AIRequestRecord[] | null });

  const aiCreditsUsed = requests ? requests.reduce((sum, r) => sum + r.credits_used, 0) : 0;

  // Trial duration calculation
  const trialEnds = activeWorkspace.trial_ends_at ? new Date(activeWorkspace.trial_ends_at) : null;
  const trialDaysRemaining = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  const stats = {
    workflowsCount: workflows.length,
    customNodesCount: customNodesCount || 0,
    membersCount: membersCount || 1,
    aiCreditsUsed,
    plan: activeWorkspace.plan,
    trialDaysRemaining,
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold font-sans tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground font-light">
          Monitor your active visual canvas runs, provision node structures, and invite collaborators.
        </p>
      </div>

      {/* Plan Usage Stats Bar */}
      <StatsBar stats={stats} />

      {/* Sticky Quick Actions Bar */}
      <QuickActions workspaceId={activeWorkspace.id} locale={locale} />

      {/* Localized Workflows list */}
      <WorkflowsList initialWorkflows={workflows} workspaceId={activeWorkspace.id} locale={locale} />
    </div>
  );
}
export const metadata = {
  title: "Dashboard — Visual Workflow SaaS",
  description: "Manage your workflows, check your active limits, and run integrations.",
};
