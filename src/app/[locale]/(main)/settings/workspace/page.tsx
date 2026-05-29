import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WorkspaceSettings } from '@/components/dashboard/WorkspaceSettings';
import { getWorkspaceShareLinks } from '@/actions/workspace.actions';

interface WorkspaceRecord {
  role: string;
  workspaces: {
    id: string;
    name: string;
    owner_id: string;
    color: string | null;
    icon: string | null;
    banner: string | null;
    settings: Record<string, unknown> | null;
  } | null;
}

interface MemberRecord {
  role: 'owner' | 'admin' | 'editor' | 'commenter' | 'viewer';
  joined_at: string;
  profiles: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default async function WorkspaceSettingsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ w?: string }>;
}) {
  const { locale } = await params;
  const { w: activeWorkspaceId } = (await searchParams) || {};
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  // 2. Fetch all workspace memberships for this user
  const { data: memberRecords } = await (supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, owner_id, color, icon, banner, settings)')
    .eq('user_id', user.id) as unknown as { data: WorkspaceRecord[] | null });

  if (!memberRecords || memberRecords.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold font-sans">No workspaces found</h2>
      </div>
    );
  }

  // Find the requested workspace, or fallback to the first one
  let activeRecord = memberRecords[0];
  if (activeWorkspaceId) {
    const found = memberRecords.find((r) => r.workspaces?.id === activeWorkspaceId);
    if (found) {
      activeRecord = found;
    }
  }

  if (!activeRecord || !activeRecord.workspaces) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold font-sans">No active workspace found</h2>
      </div>
    );
  }

  const workspace = {
    id: activeRecord.workspaces.id,
    name: activeRecord.workspaces.name,
    owner_id: activeRecord.workspaces.owner_id,
    color: activeRecord.workspaces.color,
    icon: activeRecord.workspaces.icon,
    banner: activeRecord.workspaces.banner,
    settings: activeRecord.workspaces.settings,
  };

  const currentUserRole = activeRecord.role;

  // 3. Fetch all members inside this workspace
  const { data: membersRecord } = await (supabase
    .from('workspace_members')
    .select('role, joined_at, profiles(id, email, full_name, avatar_url)')
    .eq('workspace_id', workspace.id) as unknown as { data: MemberRecord[] | null });

  const members = membersRecord || [];

  // 4. Fetch workspace share links
  const shareLinks = await getWorkspaceShareLinks(workspace.id);

  return (
    <WorkspaceSettings
      initialWorkspace={workspace}
      initialMembers={members}
      initialShareLinks={shareLinks}
      currentUserRole={currentUserRole}
      currentUserId={user.id}
      locale={locale}
    />
  );
}

export const metadata = {
  title: "Workspace Settings — Visual Workflow SaaS",
  description: "Configure workspace profiles and manage active member roles.",
};
