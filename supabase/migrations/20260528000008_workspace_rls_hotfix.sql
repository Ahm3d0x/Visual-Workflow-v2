-- =======================================================
-- MIGRATION: 20260528000008_workspace_rls_hotfix.sql
-- DESCRIPTION: Adds critical INSERT and manage policies for workspaces, 
--              workspace_members, and subscriptions to allow multi-workspace
--              creation and joining by invite link under authenticated sessions.
-- =======================================================

-- 1. Enable RLS on core tables (safety assertion)
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing conflicting policies if any to prevent duplicate errors
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owner can delete workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Allow members to insert themselves" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owner can insert subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Workspace owner can update subscription" ON public.subscriptions;

-- 3. Define workspaces policies
-- Allows authenticated users to create a workspace (they must be the owner)
CREATE POLICY "Users can create workspaces" ON public.workspaces
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = owner_id
  );

-- Allows owners to delete their own workspaces
CREATE POLICY "Owner can delete workspace" ON public.workspaces
  FOR DELETE TO authenticated USING (
    auth.uid() = owner_id
  );

-- 4. Define workspace_members policies
-- Allows users to insert themselves as members under two conditions:
--   A: They are the owner of the newly created workspace.
--   B: They are joining via a valid, unexpired workspace share link.
CREATE POLICY "Allow members to insert themselves" ON public.workspace_members
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND (
      -- Condition A: User is the owner of the target workspace
      EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = workspace_members.workspace_id 
        AND w.owner_id = auth.uid()
      )
      OR
      -- Condition B: User is joining via a valid, unexpired share link
      EXISTS (
        SELECT 1 FROM public.workspace_share_links wsl
        WHERE wsl.workspace_id = workspace_members.workspace_id
        AND wsl.role = workspace_members.role
        AND (wsl.expires_at IS NULL OR wsl.expires_at > now())
      )
    )
  );

-- 5. Define subscriptions policies
-- Allows creating a default subscription record when creating a workspace
CREATE POLICY "Workspace owner can insert subscription" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = subscriptions.workspace_id 
      AND w.owner_id = auth.uid()
    )
  );

-- Allows updating the subscription if the user is owner/admin
CREATE POLICY "Workspace owner can update subscription" ON public.subscriptions
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = subscriptions.workspace_id 
      AND w.owner_id = auth.uid()
    )
  );
