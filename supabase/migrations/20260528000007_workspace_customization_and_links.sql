-- =======================================================
-- MIGRATION: 20260528000007_workspace_customization_and_links.sql
-- DESCRIPTION: Adds workspace color, icon, banner, settings JSONB columns, 
--              and a workspace share links table with RLS policies.
-- =======================================================

-- 1. Add customization columns to workspaces table
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS banner TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Create the workspace_share_links table
CREATE TABLE IF NOT EXISTS public.workspace_share_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'commenter', 'viewer')),
  share_token  TEXT UNIQUE NOT NULL,
  label        TEXT NOT NULL,
  expires_at   TIMESTAMPTZ DEFAULT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS on workspace_share_links
ALTER TABLE public.workspace_share_links ENABLE ROW LEVEL SECURITY;

-- 4. Create security definer helper to check if a user is an owner or admin of the workspace
CREATE OR REPLACE FUNCTION public.has_workspace_admin_access(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id
    AND role IN ('owner', 'admin')
  );
END;
$$;

-- 5. Policies for workspace_share_links
-- SELECT policy: Anyone can select/read share link by token (to support checking token validity on dynamic join page)
DROP POLICY IF EXISTS "Anyone can view workspace share link by token" ON public.workspace_share_links;
CREATE POLICY "Anyone can view workspace share link by token" ON public.workspace_share_links
  FOR SELECT USING (true);

-- ALL policy for admins: Members with owner or admin role can insert, update, delete share links.
DROP POLICY IF EXISTS "Admins can manage workspace share links" ON public.workspace_share_links;
CREATE POLICY "Admins can manage workspace share links" ON public.workspace_share_links
  FOR ALL TO authenticated USING (
    public.has_workspace_admin_access(workspace_id, auth.uid())
  ) WITH CHECK (
    public.has_workspace_admin_access(workspace_id, auth.uid())
  );
