import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { SharedWorkflowViewer } from '@/components/share/SharedWorkflowViewer';
import type { Node, Edge } from '@xyflow/react';
import type { Metadata } from 'next';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShareRecord {
  id: string;
  workflow_id: string;
  user_id: string | null;
  role: string;
  share_token: string;
  expires_at: string | null;
  created_by: string;
}

interface WorkflowRecord {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface NodeRecord {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  style?: Record<string, unknown>;
}

interface EdgeRecord {
  id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: string | null;
  target_handle: string | null;
  data: Record<string, unknown>;
}

interface ProfileRecord {
  full_name: string | null;
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const supabase = await createClient();

  const { data: share } = await (supabase
    .from('workflow_shares')
    .select('workflow_id')
    .eq('share_token', shareId)
    .maybeSingle() as unknown as Promise<{ data: { workflow_id: string } | null }>);

  if (!share) return { title: 'Shared Workflow' };

  const { data: workflow } = await (supabase
    .from('workflows')
    .select('name, description')
    .eq('id', share.workflow_id)
    .maybeSingle() as unknown as Promise<{ data: { name: string; description: string | null } | null }>);

  return {
    title: workflow ? `${workflow.name} — Visual Workflow` : 'Shared Workflow',
    description: workflow?.description || 'View this shared workflow on Visual Workflow.',
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SharedWorkflowPage({
  params,
}: {
  params: Promise<{ locale: string; shareId: string }>;
}) {
  const { locale, shareId } = await params;
  const supabase = await createClient();

  // 1. Look up the share token
  const { data: share } = await (supabase
    .from('workflow_shares')
    .select('id, workflow_id, user_id, role, share_token, expires_at, created_by')
    .eq('share_token', shareId)
    .maybeSingle() as unknown as Promise<{ data: ShareRecord | null }>);

  if (!share) notFound();

  // 2. Check expiry
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Link Expired</h1>
        <p className="text-zinc-500 text-sm mb-8 max-w-sm">
          This share link has expired. Please contact the workflow owner to get a new link.
        </p>
        <a
          href={`/${locale}/sign-in`}
          className="px-6 py-2.5 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl text-sm font-bold transition-all"
        >
          Sign in to your account
        </a>
      </div>
    );
  }

  // 3. If commenter link: require authentication
  if (share.role === 'commenter') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect(`/${locale}/sign-in?redirect=/${locale}/share/${shareId}`);
    }
  }

  // 4. Fetch the workflow
  const { data: workflow } = await (supabase
    .from('workflows')
    .select('id, name, description, created_at, updated_at')
    .eq('id', share.workflow_id)
    .maybeSingle() as unknown as Promise<{ data: WorkflowRecord | null }>);

  if (!workflow) notFound();

  // 5. Fetch creator profile
  const { data: creatorProfile } = await (supabase
    .from('profiles')
    .select('full_name')
    .eq('id', share.created_by)
    .maybeSingle() as unknown as Promise<{ data: ProfileRecord | null }>);

  // 6. Fetch nodes
  const { data: nodeRecords } = await (supabase
    .from('workflow_nodes')
    .select('id, type, position, data, style')
    .eq('workflow_id', workflow.id) as unknown as Promise<{ data: NodeRecord[] | null }>);

  const initialNodes: Node[] = (nodeRecords || []).map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position || { x: 100, y: 100 },
    data: n.data || {},
    style: n.style || {},
  }));

  // 7. Fetch edges
  const { data: edgeRecords } = await (supabase
    .from('workflow_edges')
    .select('id, source_node_id, target_node_id, source_handle, target_handle, data')
    .eq('workflow_id', workflow.id) as unknown as Promise<{ data: EdgeRecord[] | null }>);

  const initialEdges: Edge[] = (edgeRecords || []).map((e) => ({
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    sourceHandle: e.source_handle,
    targetHandle: e.target_handle,
    data: e.data || {},
  }));

  return (
    <SharedWorkflowViewer
      workflow={workflow}
      nodes={initialNodes}
      edges={initialEdges}
      role={share.role}
      creatorName={creatorProfile?.full_name || null}
    />
  );
}
