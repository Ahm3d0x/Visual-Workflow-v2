-- =======================================================
-- MIGRATION: 20260528000006_workflow_shares_rls.sql
-- DESCRIPTION: Relaxes RLS on workflow_shares for SELECT
--              so that users can query records shared directly with them (user_id = auth.uid()).
-- =======================================================

-- 1. Create a SELECT policy that allows users to see their own share records
CREATE POLICY "Users access their own direct workflow shares" ON public.workflow_shares
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
  );
