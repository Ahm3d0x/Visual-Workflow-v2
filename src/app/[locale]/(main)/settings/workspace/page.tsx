import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WorkspaceSettings } from '@/components/dashboard/WorkspaceSettings';

interface WorkspaceRecord {
  role: string;
  workspaces: {
    id: string;
    name: string;
    owner_id: string;
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
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  // 2. Fetch active workspace membership
  const { data: memberRecords } = await (supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, owner_id)')
    .eq('user_id', user.id) as unknown as { data: WorkspaceRecord[] | null });

  const activeRecord = memberRecords?.[0];

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
  };

  const currentUserRole = activeRecord.role;

  // 3. Fetch all members inside this workspace
  const { data: membersRecord } = await (supabase
    .from('workspace_members')
    .select('role, joined_at, profiles(id, email, full_name, avatar_url)')
    .eq('workspace_id', workspace.id) as unknown as { data: MemberRecord[] | null });

  const members = membersRecord || [];

  return (
    <WorkspaceSettings
      initialWorkspace={workspace}
      initialMembers={members}
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
