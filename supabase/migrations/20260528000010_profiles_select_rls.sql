-- =======================================================
-- MIGRATION: 20260528000010_profiles_select_rls.sql
-- DESCRIPTION: Resolves 500 stack overflow/infinite recursion on workspace_members RLS,
--              and enables secure, non-recursive SELECT permissions on profiles
--              for authenticated users sharing a workspace, resolving blank member card UIs.
-- =======================================================

-- 1. Drop existing recursive and restrictive policies
DROP POLICY IF EXISTS "Members view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owner/Admin manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;

-- 2. Create the non-recursive SECURITY DEFINER helper function for workspace partner checks
CREATE OR REPLACE FUNCTION public.share_any_workspace(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members wm1
    JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = p_user_a AND wm2.user_id = p_user_b
  );
END;
$$;

-- 3. Re-create the SELECT policy on workspace_members using is_workspace_member function
CREATE POLICY "Members view workspace members" ON public.workspace_members
  FOR SELECT TO authenticated USING (
    public.is_workspace_member(workspace_id, auth.uid())
  );

-- 4. Re-create the ALL policy on workspace_members using is_workspace_admin_or_owner function
CREATE POLICY "Owner/Admin manage members" ON public.workspace_members
  FOR ALL TO authenticated USING (
    public.is_workspace_admin_or_owner(workspace_id, auth.uid())
  );

-- 5. Re-create the SELECT policy on profiles to allow users to view profiles of workspace partners
CREATE POLICY "Users view profiles of workspace partners" ON public.profiles
  FOR SELECT TO authenticated USING (
    id = auth.uid()
    OR public.share_any_workspace(auth.uid(), id)
  );
