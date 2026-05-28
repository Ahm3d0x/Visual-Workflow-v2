-- =======================================================
-- MIGRATION: 20260528000004_rls_shares_public.sql
-- DESCRIPTION: Resolves 404 Not Found on public shared links
--              by allowing SELECT on workflow_shares for public link visitors.
-- =======================================================

-- 1. Drop the existing generic policy on workflow_shares
DROP POLICY IF EXISTS "Workflow owner manages shares" ON public.workflow_shares;

-- 2. Create a SELECT policy that allows anyone (including anonymous/guests)
--    to read a share record if it is a public link (share_token IS NOT NULL)
--    or if they have management rights.
CREATE POLICY "Public read workflow_shares by token" ON public.workflow_shares
  FOR SELECT USING (
    share_token IS NOT NULL
    OR
    public.can_manage_workflow_shares(workflow_id, auth.uid())
  );

-- 3. Create modify policy (INSERT, UPDATE, DELETE) restricted to authorized workspace members
CREATE POLICY "Workflow admins manage shares" ON public.workflow_shares
  FOR ALL TO authenticated
  USING (
    public.can_manage_workflow_shares(workflow_id, auth.uid())
  )
  WITH CHECK (
    public.can_manage_workflow_shares(workflow_id, auth.uid())
  );
