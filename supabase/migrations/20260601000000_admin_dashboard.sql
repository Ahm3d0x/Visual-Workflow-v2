-- ============================================================
-- Admin Dashboard Migration
-- Adds is_admin flag to profiles and enables admin RLS policies
-- ============================================================

-- 1. Add is_admin column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Make the first registered user an admin by default for convenience
UPDATE public.profiles 
SET is_admin = TRUE 
WHERE id = (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1);

-- 3. Create a SECURITY DEFINER function to check admin status
-- This avoids infinite recursion in RLS policies when querying public.profiles
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND is_admin = TRUE
  );
END;
$$;

-- 4. Add administrative RLS policies to allow full access to admins
-- Profiles
CREATE POLICY "Admins select all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- Workspaces
CREATE POLICY "Admins select all workspaces" ON public.workspaces
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Subscriptions
CREATE POLICY "Admins select all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Marketplace Nodes (Admins can perform any action)
CREATE POLICY "Admins manage all marketplace_nodes" ON public.marketplace_nodes
  FOR ALL USING (public.is_admin(auth.uid()));
