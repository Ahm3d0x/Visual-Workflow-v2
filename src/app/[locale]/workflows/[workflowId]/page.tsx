import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { EditorClient } from '@/components/editor/EditorClient';
import { PLAN_LIMITS } from '@/lib/planLimits';
import type { PlanType } from '@/lib/planLimits';

interface WorkspaceMemberRecord {
  role: 'owner' | 'admin' | 'editor' | 'commenter' | 'viewer';
}

interface WorkflowRecord {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived' | 'published';
  node_count: number;
}

interface NodeRecord {
  id: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  position: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any;
}

interface EdgeRecord {
  id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: string | null;
  target_handle: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export default async function WorkflowEditorPage({
  params
}: {
  params: Promise<{ locale: string; workflowId: string }>;
}) {
  const { locale, workflowId } = await params;
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/sign-in`);
  }

  // 2. Fetch the target workflow
  const { data: workflow } = await (supabase
    .from('workflows')
    .select('id, workspace_id, name, description, status, node_count')
    .eq('id', workflowId)
    .maybeSingle() as unknown as { data: WorkflowRecord | null });

  if (!workflow) {
    notFound();
  }

  // 3. Verify user membership and role in this workspace
  const { data: member } = await (supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workflow.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle() as unknown as { data: WorkspaceMemberRecord | null });

  if (!member) {
    redirect(`/${locale}/dashboard`);
  }

  // 4. Fetch subscription to determine plan feature gates
  const { data: sub } = await (supabase
    .from('subscriptions')
    .select('plan')
    .eq('workspace_id', workflow.workspace_id)
    .maybeSingle() as unknown as { data: { plan: string } | null });

  const plan = (sub?.plan as PlanType) || 'free';
  const canShareLinks = PLAN_LIMITS[plan]?.can_share_links ?? false;

  // 5. Fetch nodes
  const { data: nodeRecords } = await (supabase
    .from('workflow_nodes')
    .select('id, type, position, data, style')
    .eq('workflow_id', workflowId) as unknown as { data: NodeRecord[] | null });

  const initialNodes = (nodeRecords || []).map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position || { x: 100, y: 100 },
    data: node.data || {},
    style: node.style || {},
  }));

  // 6. Fetch edges
  const { data: edgeRecords } = await (supabase
    .from('workflow_edges')
    .select('id, source_node_id, target_node_id, source_handle, target_handle, data')
    .eq('workflow_id', workflowId) as unknown as { data: EdgeRecord[] | null });

  const initialEdges = (edgeRecords || []).map((edge) => ({
    id: edge.id,
    source: edge.source_node_id,
    target: edge.target_node_id,
    sourceHandle: edge.source_handle,
    targetHandle: edge.target_handle,
    data: edge.data || {},
  }));

  return (
    <EditorClient
      workflow={workflow}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      userRole={member.role}
      userId={user.id}
      locale={locale}
      canShareLinks={canShareLinks}
    />
  );
}
