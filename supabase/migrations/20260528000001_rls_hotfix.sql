-- =======================================================
-- MIGRATION: 20260528000001_rls_hotfix.sql
-- DESCRIPTION: Resolves 500 infinite recursion & 403 Forbidden on workflows RLS policies
-- =======================================================

-- 1. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Workspace members access workflows" ON public.workflows;
DROP POLICY IF EXISTS "Workspace members insert workflows" ON public.workflows;
DROP POLICY IF EXISTS "Workspace members update workflows" ON public.workflows;
DROP POLICY IF EXISTS "Workspace members delete workflows" ON public.workflows;

DROP POLICY IF EXISTS "Workflow owner manages shares" ON public.workflow_shares;
DROP POLICY IF EXISTS "Workflow access controls nodes" ON public.workflow_nodes;
DROP POLICY IF EXISTS "Workflow access controls edges" ON public.workflow_edges;
DROP POLICY IF EXISTS "Workflow members access versions" ON public.workflow_versions;
DROP POLICY IF EXISTS "Workflow members access comments" ON public.workflow_comments;
DROP POLICY IF EXISTS "Workflow members view activity" ON public.workflow_activity;
DROP POLICY IF EXISTS "Workspace owner views subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Workspace members view AI requests" ON public.ai_requests;
DROP POLICY IF EXISTS "Users access custom templates" ON public.custom_node_templates;

-- 2. Create the SECURITY DEFINER helper functions to bypass recursive RLS evaluations

CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin_or_owner(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = p_user_id
    AND wm.role IN ('owner', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_workflow_access(p_workflow_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
    WHERE w.id = p_workflow_id AND wm.user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.workflow_shares ws
    WHERE ws.workflow_id = p_workflow_id
    AND (ws.user_id = p_user_id OR ws.share_token IS NOT NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_workflow_shares(p_workflow_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.workflows w ON w.workspace_id = wm.workspace_id
    WHERE w.id = p_workflow_id
    AND wm.user_id = p_user_id
    AND wm.role IN ('owner', 'admin')
  );
END;
$$;

-- 3. Re-create the policies using the split-policy model for workflows table

-- workflows SELECT: Access if member of workspace OR listed under direct workflow share policies
CREATE POLICY "Workspace members access workflows" ON public.workflows
  FOR SELECT USING (
    public.has_workflow_access(id, auth.uid())
  );

-- workflows INSERT: Allowed if user is a member of the workspace
CREATE POLICY "Workspace members insert workflows" ON public.workflows
  FOR INSERT WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
  );

-- workflows UPDATE: Allowed if user has access to workflow and remains member of workspace
CREATE POLICY "Workspace members update workflows" ON public.workflows
  FOR UPDATE USING (
    public.has_workflow_access(id, auth.uid())
  ) WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
  );

-- workflows DELETE: Allowed if user has access to workflow
CREATE POLICY "Workspace members delete workflows" ON public.workflows
  FOR DELETE USING (
    public.has_workflow_access(id, auth.uid())
  );

-- workflow_shares: Manage shares if workspace Admin or Owner
CREATE POLICY "Workflow owner manages shares" ON public.workflow_shares
  FOR ALL USING (
    public.can_manage_workflow_shares(workflow_id, auth.uid())
  );

-- workflow_nodes & workflow_edges: Inherit permissions from parent workflow access
CREATE POLICY "Workflow access controls nodes" ON public.workflow_nodes
  FOR ALL USING (
    public.has_workflow_access(workflow_id, auth.uid())
  );

CREATE POLICY "Workflow access controls edges" ON public.workflow_edges
  FOR ALL USING (
    public.has_workflow_access(workflow_id, auth.uid())
  );

-- workflow_versions: Inherit parent workflow access policies
CREATE POLICY "Workflow members access versions" ON public.workflow_versions
  FOR ALL USING (
    public.has_workflow_access(workflow_id, auth.uid())
  );

-- workflow_comments: Access if workspace member
CREATE POLICY "Workflow members access comments" ON public.workflow_comments
  FOR ALL USING (
    public.has_workflow_access(workflow_id, auth.uid())
  );

-- workflow_activity: SELECT allowed for workspace members
CREATE POLICY "Workflow members view activity" ON public.workflow_activity
  FOR SELECT USING (
    public.has_workflow_access(workflow_id, auth.uid())
  );

-- custom_node_templates: View template if private & created_by user OR workspace public & user is workspace member
CREATE POLICY "Users access custom templates" ON public.custom_node_templates
  FOR ALL USING (
    created_by = auth.uid()
    OR (
      visibility = 'workspace' AND
      public.is_workspace_member(workspace_id, auth.uid())
    )
  );

-- subscriptions: Read subscription detail if workspace owner
CREATE POLICY "Workspace owner views subscription" ON public.subscriptions
  FOR SELECT USING (
    public.is_workspace_admin_or_owner(workspace_id, auth.uid())
  );

-- ai_requests: View list if workspace member
CREATE POLICY "Workspace members view AI requests" ON public.ai_requests
  FOR SELECT USING (
    public.is_workspace_member(workspace_id, auth.uid())
  );
