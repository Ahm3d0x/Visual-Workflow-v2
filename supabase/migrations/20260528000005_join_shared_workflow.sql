-- =======================================================
-- MIGRATION: 20260528000005_join_shared_workflow.sql
-- DESCRIPTION: Creates join_shared_workflow helper function (SECURITY DEFINER)
--              to allow logged-in users to link public shared workflows to their workspace.
--              Also updates the workflows UPDATE policy to allow shared editors to perform updates.
-- =======================================================

-- 1. Create the join_shared_workflow helper function
CREATE OR REPLACE FUNCTION public.join_shared_workflow(
  p_workflow_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_created_by UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Insert only if not already linked to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.workflow_shares
    WHERE workflow_id = p_workflow_id AND user_id = p_user_id
  ) THEN
    INSERT INTO public.workflow_shares (workflow_id, user_id, role, created_by)
    VALUES (p_workflow_id, p_user_id, p_role, p_created_by);
  END IF;
END;
$$;

-- 2. Drop the restrictive workflows UPDATE policy
DROP POLICY IF EXISTS "Workspace members update workflows" ON public.workflows;

-- 3. Re-create the workflows UPDATE policy to allow shared editors to perform updates
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
