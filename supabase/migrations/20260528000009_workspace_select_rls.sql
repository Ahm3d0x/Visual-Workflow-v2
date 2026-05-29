-- =======================================================
-- MIGRATION: 20260528000009_workspace_select_rls.sql
-- DESCRIPTION: Relaxes SELECT RLS on workspaces table
--              so that users joining via a valid, unexpired share link
--              can read basic workspace details (name, icon, banner, color).
-- =======================================================

-- 1. Create a security definer helper to check if a workspace has an active share link
CREATE OR REPLACE FUNCTION public.has_active_share_link(p_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_share_links
    WHERE workspace_id = p_workspace_id
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- 2. Drop the existing restrictive SELECT policy on workspaces
DROP POLICY IF EXISTS "Members can view workspace" ON public.workspaces;

-- 3. Re-create the SELECT policy on workspaces
CREATE POLICY "Members can view workspace" ON public.workspaces
  FOR SELECT TO authenticated USING (
    auth.uid() = owner_id OR
    public.is_workspace_member(id, auth.uid()) OR
    public.has_active_share_link(id)
  );
