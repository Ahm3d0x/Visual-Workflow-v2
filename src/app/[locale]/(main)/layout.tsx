import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { provisionWorkspaceIfNeeded } from '@/lib/supabase/provision';

interface ProfileRecord {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
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
  
  // 1. Create Supabase Server Client
  const supabase = await createClient();

  // 2. Validate current session user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect unauthenticated users straight to localized sign-in
    redirect(`/${locale}/auth/sign-in`);
  }

  // 3. Fetch user profile record
  const { data: profile } = await (supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .single() as unknown as { data: ProfileRecord | null });

  // 4. Fetch workspaces this user is a member of
  const { data: memberRecords } = await (supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, plan)')
    .eq('user_id', user.id) as unknown as { data: WorkspaceRecord[] | null });

  // Map joined records to workspace lists (including user role in workspace)
  let workspaces: Array<{ id: string; name: string; plan: string; role?: string }> = memberRecords
    ? memberRecords
        .map((r) => r.workspaces ? { ...r.workspaces, role: r.role } : null)
        .filter((w): w is { id: string; name: string; plan: string; role: string } => w !== null)
    : [];

  // Fallback workspace if user trigger hasn't finished in rare races
  if (workspaces.length === 0) {
    // Dynamically self-heal profile by provisioning missing workspaces
    await provisionWorkspaceIfNeeded(user.id, user.email || '', profile?.full_name || null);

    // Refetch membership records
    const { data: refetchedRecords } = await (supabase
      .from('workspace_members')
      .select('role, workspaces(id, name, plan)')
      .eq('user_id', user.id) as unknown as { data: WorkspaceRecord[] | null });

    workspaces = refetchedRecords
      ? refetchedRecords
          .map((r) => r.workspaces ? { ...r.workspaces, role: r.role } : null)
          .filter((w): w is { id: string; name: string; plan: string; role: string } => w !== null)
      : [];
  }

  // Double fallback to local mock workspace if RLS prevents inserts
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
