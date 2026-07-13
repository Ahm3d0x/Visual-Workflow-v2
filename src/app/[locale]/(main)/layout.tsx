import { createClient, getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { provisionWorkspaceIfNeeded } from '@/lib/supabase/provision';

interface ProfileRecord {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
}

interface WorkspaceRecord {
  role: string;
  workspaces: {
    id: string;
    name: string;
    plan: string;
  } | null;
}

export default async function MainLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Cached getUser() — React.cache() deduplicates this across layout + page.
  // Only one network call to Supabase Auth is made per request.
  const { user } = await getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  // Supabase client needed for DB queries (profile + workspaces)
  const supabase = await createClient();

  // 3. Fetch profile + workspaces in parallel — eliminates sequential DB round-trips
  const [
    { data: profile },
    { data: memberRecords },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email, avatar_url, is_admin')
      .eq('id', user.id)
      .single() as unknown as Promise<{ data: ProfileRecord | null }>,

    supabase
      .from('workspace_members')
      .select('role, workspaces(id, name, plan)')
      .eq('user_id', user.id) as unknown as Promise<{ data: WorkspaceRecord[] | null }>,
  ]);

  // Map joined records to workspace list (including user role)
  let workspaces: Array<{ id: string; name: string; plan: string; role?: string }> = memberRecords
    ? memberRecords
        .map((r) => r.workspaces ? { ...r.workspaces, role: r.role } : null)
        .filter((w): w is { id: string; name: string; plan: string; role: string } => w !== null)
    : [];

  // Fallback: self-heal if DB trigger hasn't provisioned workspace yet
  if (workspaces.length === 0) {
    await provisionWorkspaceIfNeeded(user.id, user.email || '', profile?.full_name || null);

    const { data: refetchedRecords } = await (supabase
      .from('workspace_members')
      .select('role, workspaces(id, name, plan)')
      .eq('user_id', user.id) as unknown as Promise<{ data: WorkspaceRecord[] | null }>);

    workspaces = refetchedRecords
      ? refetchedRecords
          .map((r) => r.workspaces ? { ...r.workspaces, role: r.role } : null)
          .filter((w): w is { id: string; name: string; plan: string; role: string } => w !== null)
      : [];
  }

  // Double fallback: local mock workspace if RLS prevents inserts
  if (workspaces.length === 0) {
    workspaces.push({
      id: 'default',
      name: `${profile?.full_name || 'My'} Workspace`,
      plan: 'legend',
      role: 'owner',
    });
  }

  return (
    <DashboardShell locale={locale} profile={profile} workspaces={workspaces}>
      {children}
    </DashboardShell>
  );
}
