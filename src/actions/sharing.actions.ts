'use server';

import { createClient } from '@/lib/supabase/server';
import { PLAN_LIMITS } from '@/lib/planLimits';
import type { PlanType } from '@/lib/planLimits';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShareRole = 'editor' | 'commenter' | 'viewer';

export interface WorkflowShareRecord {
  id: string;
  workflow_id: string;
  user_id: string | null;
  role: ShareRole;
  share_token: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
}

export interface ActionResult {
  success?: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

// Helper type to bypass strict Supabase table types for workflow_shares (not in DB types)
type UntypedTable = {
  select: (q: string) => {
    eq: (col: string, val: string | null) => {
      maybeSingle: () => Promise<{ data: unknown }>;
      order: (col: string, opts: object) => Promise<{ data: unknown[] | null }>;
    };
    order: (col: string, opts: object) => Promise<{ data: unknown[] | null }>;
  };
  insert: (data: Record<string, unknown> | Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
  update: (data: Record<string, unknown>) => {
    eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
  };
  delete: () => {
    eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
  };
};

// ─── Fetch current shares for a workflow ────────────────────────────────────

export async function getWorkflowShares(workflowId: string): Promise<WorkflowShareRecord[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await (supabase
    .from('workflow_shares') as unknown as {
      select: (q: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: object) => Promise<{ data: WorkflowShareRecord[] | null }>;
        };
      };
    })
    .select('*, profiles:user_id (full_name, avatar_url, email)')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: true });

  return data || [];
}

// ─── Invite a user by email ──────────────────────────────────────────────────

export async function inviteToWorkflow(
  workflowId: string,
  workspaceId: string,
  email: string,
  role: ShareRole
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Verify invoker can share (owner or admin)
  const { data: member } = await (supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle() as unknown as Promise<{ data: { role: string } | null }>);

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { error: 'Insufficient permissions to share this workflow' };
  }

  // Look up target user in profiles
  const { data: profile } = await (supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle() as unknown as Promise<{ data: { id: string; email: string } | null }>);

  if (!profile) {
    return { error: `No account found for ${email}. They must sign up first.` };
  }

  if (profile.id === user.id) {
    return { error: 'You cannot share a workflow with yourself.' };
  }

  // Check if already shared
  const { data: existing } = await (supabase
    .from('workflow_shares')
    .select('id')
    .eq('workflow_id', workflowId)
    .eq('user_id', profile.id)
    .maybeSingle() as unknown as Promise<{ data: { id: string } | null }>);

  const sharesTable = supabase.from('workflow_shares') as unknown as UntypedTable;

  if (existing) {
    const { error } = await sharesTable
      .update({ role })
      .eq('id', (existing as { id: string }).id);
    if (error) return { error: error.message };
  } else {
    const { error } = await sharesTable.insert({
      workflow_id: workflowId,
      user_id: profile.id,
      role,
      created_by: user.id,
    });
    if (error) return { error: error.message };
  }

  return { success: true };
}

// ─── Update share role ───────────────────────────────────────────────────────

export async function updateShareRole(
  shareId: string,
  workspaceId: string,
  newRole: ShareRole
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: member } = await (supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle() as unknown as Promise<{ data: { role: string } | null }>);

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { error: 'Insufficient permissions' };
  }

  const sharesTable = supabase.from('workflow_shares') as unknown as UntypedTable;
  const { error } = await sharesTable.update({ role: newRole }).eq('id', shareId);
  if (error) return { error: error.message };
  return { success: true };
}

// ─── Remove a share ──────────────────────────────────────────────────────────

export async function removeShare(
  shareId: string,
  workspaceId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: member } = await (supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle() as unknown as Promise<{ data: { role: string } | null }>);

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { error: 'Insufficient permissions' };
  }

  const sharesTable = supabase.from('workflow_shares') as unknown as UntypedTable;
  const { error } = await sharesTable.delete().eq('id', shareId);
  if (error) return { error: error.message };
  return { success: true };
}

// ─── Create public share link ────────────────────────────────────────────────

export async function createShareLink(
  workflowId: string,
  workspaceId: string,
  role: 'commenter' | 'viewer',
  expiresInDays?: number
): Promise<ActionResult & { url?: string; token?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Plan check — share links require Warrior+
  const { data: sub } = await (supabase
    .from('subscriptions')
    .select('plan')
    .eq('workspace_id', workspaceId)
    .maybeSingle() as unknown as Promise<{ data: { plan: string } | null }>);

  const plan = (sub?.plan as PlanType) || 'free';
  if (!PLAN_LIMITS[plan].can_share_links) {
    return { error: 'PLAN_REQUIRED', data: { requiredPlan: 'warrior' } };
  }

  const { data: member } = await (supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle() as unknown as Promise<{ data: { role: string } | null }>);

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { error: 'Insufficient permissions' };
  }

  const token = crypto.randomUUID();
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const sharesTable = supabase.from('workflow_shares') as unknown as UntypedTable;
  const { error } = await sharesTable.insert({
    workflow_id: workflowId,
    user_id: null,
    role,
    share_token: token,
    expires_at: expiresAt,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  const url = `${process.env.NEXT_PUBLIC_APP_URL || ''}/en/share/${token}`;
  return { success: true, url, token };
}

// ─── Revoke (delete) public share link ──────────────────────────────────────

export async function revokeShareLink(
  shareId: string,
  workspaceId: string
): Promise<ActionResult> {
  return removeShare(shareId, workspaceId);
}
