-- =======================================================
-- MIGRATION: 20260606000000_rls_hotfix_v4.sql
-- DESCRIPTION: Relax workflows UPDATE WITH CHECK clause to allow shared editors to update,
--              and create indexes on workflow_shares and workspace_members tables.
-- =======================================================

-- 1. Drop the existing update policy on workflows
DROP POLICY IF EXISTS "Workspace members update workflows" ON public.workflows;

-- 2. Re-create the update policy with the relaxed WITH CHECK clause
CREATE POLICY "Workspace members update workflows" ON public.workflows
  FOR UPDATE USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR
    public.has_shared_workflow_access(id, auth.uid())
  ) WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    OR
    public.has_shared_workflow_access(id, auth.uid())
  );

-- 3. Create performance indexes to speed up RLS evaluations and queries
CREATE INDEX IF NOT EXISTS workflow_shares_workflow_id_idx ON public.workflow_shares(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_shares_user_id_idx ON public.workflow_shares(user_id);
CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx ON public.workspace_members(user_id);
