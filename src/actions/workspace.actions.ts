/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createClient } from '@/lib/supabase/server';
import { PLAN_LIMITS } from '@/lib/planLimits';
import type { PlanType } from '@/lib/planLimits';
import { revalidatePath } from 'next/cache';

export interface WorkspaceActionResult {
  success?: boolean;
  error?: string;
  data?: Record<string, any>;
}

// ─── Create Workspace ──────────────────────────────────────────────────────────

export async function createWorkspace(name: string): Promise<WorkspaceActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  if (!name.trim()) return { error: 'Workspace name is required' };

  // 1. Fetch user's workspaces where they are the owner
  const { data: ownedWorkspaces } = await (supabase
    .from('workspaces') as any)
    .select('id, plan')
    .eq('owner_id', user.id);

  const workspacesCount = ownedWorkspaces?.length || 0;

  // 2. Fetch the plan limits from the first workspace (or default to free)
  const currentPlan: PlanType = (ownedWorkspaces?.[0]?.plan as PlanType) || 'free';
  const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;

  // 3. Enforce plan limit for workspaces
  // Free: 1 workspace, Warrior: 3 workspaces, Elite+: Unlimited
  const maxWorkspaces = limits.max_workspaces ?? 1;
  if (workspacesCount >= maxWorkspaces) {
    return { 
      error: `PLAN_LIMIT_REACHED`, 
      data: { 
        limit: maxWorkspaces, 
        current: workspacesCount,
        requiredPlan: maxWorkspaces === 1 ? 'warrior' : 'elite'
      } 
    };
  }

  // 4. Insert new workspace
  const { data: workspace, error: wsError } = await (supabase
    .from('workspaces') as any)
    .insert({
      name: name.trim(),
      owner_id: user.id,
      plan: currentPlan, // Inherit user's primary plan
    })
    .select('id')
    .single();

  if (wsError || !workspace) {
    return { error: wsError?.message || 'Failed to create workspace' };
  }

  // 5. Add user as owner inside workspace_members
  const { error: memberError } = await (supabase
    .from('workspace_members') as any)
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    });

  if (memberError) {
    return { error: memberError.message };
  }

  // 6. Create default subscription record for the new workspace
  await (supabase
    .from('subscriptions') as any)
    .insert({
      workspace_id: workspace.id,
      plan: currentPlan,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

  revalidatePath('/dashboard');
  return { success: true, data: { workspaceId: workspace.id } };
}

// ─── Update Workspace Customization ──────────────────────────────────────────

export async function updateWorkspaceCustomization(
  workspaceId: string,
  name: string,
  color: string | null,
  icon: string | null,
  banner: string | null
): Promise<WorkspaceActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // 1. Verify user is owner or admin of the workspace
  const { data: member } = await (supabase
    .from('workspace_members') as any)
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member || !['owner', 'admin'].includes((member as any).role)) {
    return { error: 'Insufficient permissions' };
  }

  // 2. Perform customization updates
  const { error } = await (supabase
    .from('workspaces') as any)
    .update({
      name: name.trim(),
      color: color || null,
      icon: icon || null,
      banner: banner || null,
    })
    .eq('id', workspaceId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/settings/workspace`);
  return { success: true };
}

// ─── Create Workspace Share Link ─────────────────────────────────────────────

export async function createWorkspaceShareLink(
  workspaceId: string,
  label: string,
  role: 'admin' | 'editor' | 'commenter' | 'viewer',
  expiresInDays?: number
): Promise<WorkspaceActionResult & { token?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  if (!label.trim()) return { error: 'Link description is required' };

  // 1. Verify user is owner or admin
  const { data: member } = await (supabase
    .from('workspace_members') as any)
    .select('role, workspaces(plan)')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

  const activeMember = member as any;
  if (!activeMember || !['owner', 'admin'].includes(activeMember.role)) {
    return { error: 'Insufficient permissions' };
  }

  // 2. Enforce active invite links limits based on plan
  const plan: PlanType = activeMember.workspaces?.plan || 'free';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const maxLinks = limits.max_workspace_share_links ?? 0;

  // Count active share links for this workspace
  const { count: activeLinksCount } = await (supabase
    .from('workspace_share_links') as any)
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  const currentCount = activeLinksCount || 0;

  if (currentCount >= maxLinks) {
    return { 
      error: 'PLAN_LIMIT_REACHED', 
      data: { 
        limit: maxLinks, 
        current: currentCount,
        requiredPlan: maxLinks === 0 ? 'warrior' : 'elite'
      } 
    };
  }

  // 3. Generate token & expires_at
  const token = crypto.randomUUID();
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // 4. Insert link record
  const { error } = await (supabase
    .from('workspace_share_links') as any)
    .insert({
      workspace_id: workspaceId,
      role,
      share_token: token,
      label: label.trim(),
      expires_at: expiresAt,
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/settings/workspace`);
  return { success: true, token };
}

// ─── Get Workspace Share Links ────────────────────────────────────────────────

export async function getWorkspaceShareLinks(workspaceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await (supabase
    .from('workspace_share_links') as any)
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  return data || [];
}

// ─── Revoke Workspace Share Link ─────────────────────────────────────────────

export async function revokeWorkspaceShareLink(
  linkId: string,
  workspaceId: string
): Promise<WorkspaceActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // 1. Verify user is owner or admin
  const { data: member } = await (supabase
    .from('workspace_members') as any)
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member || !['owner', 'admin'].includes((member as any).role)) {
    return { error: 'Insufficient permissions' };
  }

  // 2. Delete share link
  const { error } = await (supabase
    .from('workspace_share_links') as any)
    .delete()
    .eq('id', linkId)
    .eq('workspace_id', workspaceId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/settings/workspace`);
  return { success: true };
}

// ─── Join Workspace By Share Token ────────────────────────────────────────────

export async function joinWorkspaceByShareToken(token: string): Promise<WorkspaceActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // 1. Fetch share link
  const { data: link, error: linkError } = await (supabase
    .from('workspace_share_links') as any)
    .select('*, workspaces(name)')
    .eq('share_token', token)
    .maybeSingle();

  const activeLink = link as any;

  if (linkError || !activeLink) {
    return { error: 'Invalid or expired invitation link' };
  }

  // 2. Check if expired
  if (activeLink.expires_at && new Date(activeLink.expires_at).getTime() < Date.now()) {
    return { error: 'This invitation link has expired' };
  }

  // 3. Check if user is already a member
  const { data: existingMember } = await (supabase
    .from('workspace_members') as any)
    .select('role')
    .eq('workspace_id', activeLink.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMember) {
    return { success: true, data: { workspaceId: activeLink.workspace_id, alreadyMember: true } };
  }

  // 4. Insert user into workspace_members
  const { error: joinError } = await (supabase
    .from('workspace_members') as any)
    .insert({
      workspace_id: activeLink.workspace_id,
      user_id: user.id,
      role: activeLink.role,
    });

  if (joinError) {
    return { error: joinError.message };
  }

  revalidatePath('/dashboard');
  return { success: true, data: { workspaceId: activeLink.workspace_id, name: activeLink.workspaces?.name } };
}

// ─── Update Advanced Workspace Settings ──────────────────────────────────────

export async function updateWorkspaceSettingsAction(
  workspaceId: string,
  settings: any
): Promise<WorkspaceActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // 1. Verify user is owner of the workspace
  const { data: member } = await (supabase
    .from('workspace_members') as any)
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member || (member as any).role !== 'owner') {
    return { error: 'Insufficient permissions. Only workspace owners can modify advanced operational settings.' };
  }

  // 2. Perform settings updates
  const { error } = await (supabase
    .from('workspaces') as any)
    .update({ settings })
    .eq('id', workspaceId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/settings/workspace`);
  return { success: true };
}

// ─── Delete Workspace Securely ────────────────────────────────────────────────

export async function deleteWorkspaceAction(workspaceId: string): Promise<WorkspaceActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // 1. Verify user is owner
  const { data: member } = await (supabase
    .from('workspace_members') as any)
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member || (member as any).role !== 'owner') {
    return { error: 'Only the Workspace Owner can delete this workspace.' };
  }

  // 2. Prevent deleting the user's last remaining workspace to avoid orphaned states
  const { data: ownedWorkspaces } = await (supabase
    .from('workspaces') as any)
    .select('id')
    .eq('owner_id', user.id);

  if (ownedWorkspaces && ownedWorkspaces.length <= 1) {
    return { error: 'You must own at least one workspace. Create a new workspace before deleting your last one.' };
  }

  // 3. Delete workspace (cascade deletes memberships, links, and subscriptions via supabase foreign key cascades)
  const { error } = await (supabase
    .from('workspaces') as any)
    .delete()
    .eq('id', workspaceId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

