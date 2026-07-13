import { createClient, getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { WorkflowsList } from '@/components/dashboard/WorkflowsList';
import { provisionWorkspaceIfNeeded } from '@/lib/supabase/provision';

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
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ w?: string }>;
}) {
  const { locale } = await params;
  const { w: activeWorkspaceId } = (await searchParams) || {};
  const supabase = await createClient();

  // Cached getUser() — React.cache() deduplicates with the layout's call.
  // Secure (full JWT validation) with zero extra network round-trip.
  const { user } = await getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  // 2. Fetch user's workspaces
  const { data: memberRecords } = await (supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, plan, trial_ends_at)')
    .eq('user_id', user.id) as unknown as { data: WorkspaceRecord[] | null });

  let workspaces = memberRecords
    ? memberRecords
        .map((r) => r.workspaces)
        .filter((w): w is { id: string; name: string; plan: string; trial_ends_at: string | null } => w !== null)
    : [];

  // Fallback dynamic self-healing provisioning if empty
  if (workspaces.length === 0) {
    const { data: profile } = await (supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle() as unknown as Promise<{ data: { full_name: string | null } | null }>);

    await provisionWorkspaceIfNeeded(user.id, user.email || '', profile?.full_name || null);

    // Refetch membership records
    const { data: refetchedRecords } = await (supabase
      .from('workspace_members')
      .select('role, workspaces(id, name, plan, trial_ends_at)')
      .eq('user_id', user.id) as unknown as { data: WorkspaceRecord[] | null });

    workspaces = refetchedRecords
      ? refetchedRecords
          .map((r) => r.workspaces)
          .filter((w): w is { id: string; name: string; plan: string; trial_ends_at: string | null } => w !== null)
      : [];
  }

  // Double fallback to local mock workspace if RLS prevents inserts
  if (workspaces.length === 0) {
    const { data: profile } = await (supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle() as unknown as Promise<{ data: { full_name: string | null } | null }>);

    workspaces.push({
      id: 'default',
      name: `${profile?.full_name || 'My'} Workspace`,
      plan: 'legend',
      // eslint-disable-next-line
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  let activeWorkspace = workspaces[0];
  if (activeWorkspaceId) {
    const found = workspaces.find((ws) => ws.id === activeWorkspaceId);
    if (found) {
      activeWorkspace = found;
    }
  }

  if (!activeWorkspace) {
    // Return early if workspace triggers are still executing (graceful fallback)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 space-y-4">
        <h2 className="text-2xl font-bold font-sans">
          {locale === 'ar' ? 'جاري إعداد مساحة العمل الخاصة بك...' : 'Setting up your Workspace...'}
        </h2>
        <p className="text-sm text-muted-foreground font-light max-w-sm">
          {locale === 'ar'
            ? 'يرجى الانتظار لحظة بينما نقوم بتهيئة لوحة سير العمل المخصصة ولوحة تحكم الفترة التجريبية لباقة Legend.'
            : 'Please wait a moment while we provision your custom workflows canvas and Legend trial dashboard.'}
        </p>
      </div>
    );
  }

  // 3. Fetch workflows, whiteboards, shared items, and metrics all in parallel
  const [
    { data: workflowsRecord },
    { data: whiteboardsRecord },
    { data: sharedRecords },
    { count: customNodesCount },
    { count: membersCount },
    { data: requests },
  ] = await Promise.all([
    // Workflows (exclude whiteboards)
    supabase
      .from('workflows')
      .select('id, name, description, status, node_count, updated_at, is_whiteboard')
      .eq('workspace_id', activeWorkspace.id)
      .eq('is_whiteboard', false)
      .order('updated_at', { ascending: false }),

    // Whiteboards
    supabase
      .from('workflows')
      .select('id, name, description, status, node_count, updated_at, is_whiteboard, board_data')
      .eq('workspace_id', activeWorkspace.id)
      .eq('is_whiteboard', true)
      .order('updated_at', { ascending: false }),

    // Shared with this user
    supabase
      .from('workflow_shares')
      .select(`role, workflows (id, name, description, status, node_count, updated_at, is_whiteboard, board_data)`)
      .eq('user_id', user.id),

    // Custom nodes count
    supabase
      .from('custom_node_templates')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', activeWorkspace.id),

    // Members count
    supabase
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', activeWorkspace.id),

    // AI credits
    (supabase
      .from('ai_requests')
      .select('credits_used')
      .eq('workspace_id', activeWorkspace.id) as unknown as Promise<{ data: AIRequestRecord[] | null }>),
  ]);


  // Derive typed arrays from raw records
  const workflows = (workflowsRecord || []) as WorkflowItem[];
  const whiteboards = (whiteboardsRecord || []) as WorkflowItem[];

  interface SharedWorkflowJoint {
    role: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workflows: any;
  }

  const sharedWorkflows = sharedRecords
    ? (sharedRecords as unknown as SharedWorkflowJoint[])
        .map((r) => {
          const wf = Array.isArray(r.workflows) ? r.workflows[0] : r.workflows;
          return { wf, role: r.role };
        })
        .filter((item) => item.wf?.id && !item.wf.is_whiteboard && !workflows.some((w) => w.id === item.wf.id))
        .map((item) => ({
          id: item.wf.id,
          name: item.wf.name,
          description: item.wf.description,
          status: item.wf.status,
          node_count: item.wf.node_count,
          updated_at: item.wf.updated_at,
          role: item.role,
          is_whiteboard: false,
        }))
    : [];

  const sharedWhiteboards = sharedRecords
    ? (sharedRecords as unknown as SharedWorkflowJoint[])
        .map((r) => {
          const wf = Array.isArray(r.workflows) ? r.workflows[0] : r.workflows;
          return { wf, role: r.role };
        })
        .filter((item) => item.wf?.id && item.wf.is_whiteboard && !whiteboards.some((w) => w.id === item.wf.id))
        .map((item) => ({
          id: item.wf.id,
          name: item.wf.name,
          description: item.wf.description,
          status: item.wf.status,
          node_count: item.wf.node_count,
          updated_at: item.wf.updated_at,
          role: item.role,
          is_whiteboard: true,
          board_data: item.wf.board_data || {},
        }))
    : [];

  const aiCreditsUsed = requests ? requests.reduce((sum, r) => sum + r.credits_used, 0) : 0;


  // Trial duration calculation
  const trialEnds = activeWorkspace.trial_ends_at ? new Date(activeWorkspace.trial_ends_at) : null;
  // eslint-disable-next-line
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
      <div className="flex flex-col gap-1.5 font-sans">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
        </h1>
        <p className="text-sm text-muted-foreground font-light">
          {locale === 'ar'
            ? 'راقب عمليات لوحة العمل النشطة، وقم بتهيئة هياكل العقد، ودعوة المتعاونين.'
            : 'Monitor your active visual canvas runs, provision node structures, and invite collaborators.'}
        </p>
      </div>

      {/* Plan Usage Stats Bar */}
      <StatsBar stats={stats} />

      {/* Sticky Quick Actions Bar */}
      <QuickActions workspaceId={activeWorkspace.id} locale={locale} />

      {/* Localized Workflows list */}
      <WorkflowsList
        key={activeWorkspace.id}
        initialWorkflows={workflows}
        initialWhiteboards={whiteboards}
        sharedWorkflows={sharedWorkflows}
        sharedWhiteboards={sharedWhiteboards}
        workspaceId={activeWorkspace.id}
        workspaces={workspaces}
        locale={locale}
      />
    </div>
  );
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'لوحة التحكم — Skima' : 'Dashboard — Skima',
    description: isAr
      ? 'إدارة سير العمل الخاص بك، والتحقق من حدودك النشطة، وتشغيل عمليات التكامل.'
      : 'Manage your workflows, check your active limits, and run integrations.',
  };
}
