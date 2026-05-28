-- =======================================================
-- MIGRATION: 20260528000003_rls_hotfix_v3.sql
-- DESCRIPTION: Resolves 403 Forbidden / RLS violation on workflows INSERT with SELECT
-- =======================================================

-- 1. Drop existing policies on workflows to prevent conflicts
DROP POLICY IF EXISTS "Workspace members access workflows" ON public.workflows;
DROP POLICY IF EXISTS "Workspace members insert workflows" ON public.workflows;
DROP POLICY IF EXISTS "Workspace members update workflows" ON public.workflows;
DROP POLICY IF EXISTS "Workspace members delete workflows" ON public.workflows;

-- 2. Create the SECURITY DEFINER helper function for shared workflow access
-- This avoids querying public.workflows recursively inside the policy
CREATE OR REPLACE FUNCTION public.has_shared_workflow_access(p_workflow_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workflow_shares ws
    WHERE ws.workflow_id = p_workflow_id
    AND (ws.user_id = p_user_id OR ws.share_token IS NOT NULL)
  );
END;
$$;

-- 3. Re-create the workflows RLS policies using column-based workspace_id checks
-- This eliminates circular dependencies and allows INSERT with SELECT (.select().single())

-- workflows SELECT: Access if member of workspace OR listed under direct workflow shares
CREATE POLICY "Workspace members access workflows" ON public.workflows
  FOR SELECT USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR
    public.has_shared_workflow_access(id, auth.uid())
  );

-- workflows INSERT: Allowed if user is a member of the workspace
CREATE POLICY "Workspace members insert workflows" ON public.workflows
  FOR INSERT WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
  );

-- workflows UPDATE: Allowed if user is member of workspace or has shared access, but must remain workspace member
CREATE POLICY "Workspace members update workflows" ON public.workflows
  FOR UPDATE USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR
    public.has_shared_workflow_access(id, auth.uid())
  ) WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
  );

-- workflows DELETE: Allowed if user is workspace member or has shared access
CREATE POLICY "Workspace members delete workflows" ON public.workflows
  FOR DELETE USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR
    public.has_shared_workflow_access(id, auth.uid())
  );
