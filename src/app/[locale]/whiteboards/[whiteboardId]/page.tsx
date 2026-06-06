import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { WhiteboardClient } from '@/components/whiteboard/WhiteboardClient';

interface WorkspaceMemberRecord {
  role: 'owner' | 'admin' | 'editor' | 'commenter' | 'viewer';
}

interface WhiteboardRecord {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived' | 'published';
  is_whiteboard: boolean;
  board_data: unknown;
}

export default async function WhiteboardEditorPage({
  params
}: {
  params: Promise<{ locale: string; whiteboardId: string }>;
}) {
  const { locale, whiteboardId } = await params;
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?redirect=/${locale}/whiteboards/${whiteboardId}`);
  }

  // 2. Fetch the target whiteboard
  const { data: whiteboard } = await (supabase
    .from('workflows')
    .select('id, workspace_id, name, description, status, is_whiteboard, board_data')
    .eq('id', whiteboardId)
    .maybeSingle() as unknown as { data: WhiteboardRecord | null });

  if (!whiteboard) {
    notFound();
  }

  // Symmetric redirect check: if it is NOT a whiteboard, send to workflows editor
  if (!whiteboard.is_whiteboard) {
    redirect(`/${locale}/workflows/${whiteboardId}`);
  }

  // 3. Verify user membership and role in this workspace
  let userRole: string | null = null;
  const { data: member } = await (supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', whiteboard.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle() as unknown as { data: WorkspaceMemberRecord | null });

  if (member) {
    userRole = member.role;
  } else {
    // Check if there is a direct share for this user
    const { data: share } = await supabase
      .from('workflow_shares')
      .select('role')
      .eq('workflow_id', whiteboardId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (share) {
      // @ts-expect-error - Custom table type not in auto-generated schema
      userRole = share.role;
    }
  }

  if (!userRole) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <WhiteboardClient
      whiteboardId={whiteboard.id}
      name={whiteboard.name}
      initialBoardData={(whiteboard.board_data as any) || {}}
      workspaceId={whiteboard.workspace_id}
      userRole={userRole}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; whiteboardId: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'لوحة بيضاء مستقلة — Visual Workflow SaaS' : 'Standalone Whiteboard — Visual Workflow SaaS',
    description: isAr
      ? 'أنشئ وارسم وشارك الأفكار على لوحة بيضاء مستقلة في الوقت الفعلي.'
      : 'Create, draw, and brainstorm on a standalone whiteboard in real time.',
  };
}
