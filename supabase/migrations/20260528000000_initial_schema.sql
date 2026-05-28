-- ==========================================
-- VISUAL WORKFLOW SaaS INITIAL DATABASE SCHEMA
-- Migration: 20260528000000_initial_schema.sql
-- ==========================================

-- ------------------------------------------
-- 1. EXTENSIONS & PUBLICATIONS SETUP
-- ------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------
-- 2. CREATE TABLES
-- ------------------------------------------

-- Table 1: profiles
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 2: user_preferences
CREATE TABLE public.user_preferences (
  user_id          UUID PRIMARY KEY REFERENCES public.profiles ON DELETE CASCADE,
  language         TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  theme            TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  editor_layout    JSONB NOT NULL DEFAULT '{}',
  collapsed_panels TEXT[] NOT NULL DEFAULT '{}'
);

-- Table 3: workspaces
CREATE TABLE public.workspaces (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  owner_id          UUID REFERENCES public.profiles ON DELETE RESTRICT NOT NULL,
  plan              TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'warrior', 'elite', 'champion', 'legend')),
  trial_ends_at     TIMESTAMPTZ,
  stripe_customer_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 4: workspace_members
CREATE TABLE public.workspace_members (
  workspace_id UUID REFERENCES public.workspaces ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'commenter', 'viewer')),
  invited_by   UUID REFERENCES public.profiles ON DELETE SET NULL,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Table 5: dashboards
CREATE TABLE public.dashboards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  created_by   UUID REFERENCES public.profiles ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 6: workflows
CREATE TABLE public.workflows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id  UUID REFERENCES public.dashboards ON DELETE SET NULL,
  workspace_id  UUID REFERENCES public.workspaces ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'published')),
  thumbnail_url TEXT,
  node_count    INT NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES public.profiles ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 7: workflow_nodes
CREATE TABLE public.workflow_nodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflows ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL,
  position    JSONB NOT NULL,           -- Format: {x: number, y: number}
  data        JSONB NOT NULL DEFAULT '{}',  -- Label, properties, config
  style       JSONB NOT NULL DEFAULT '{}',
  parent_id   UUID REFERENCES public.workflow_nodes ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 8: workflow_edges
CREATE TABLE public.workflow_edges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     UUID REFERENCES public.workflows ON DELETE CASCADE NOT NULL,
  source_node_id  UUID REFERENCES public.workflow_nodes ON DELETE CASCADE NOT NULL,
  target_node_id  UUID REFERENCES public.workflow_nodes ON DELETE CASCADE NOT NULL,
  source_handle   TEXT,
  target_handle   TEXT,
  data            JSONB NOT NULL DEFAULT '{}', -- Style, label, animations
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 9: workflow_versions
CREATE TABLE public.workflow_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflows ON DELETE CASCADE NOT NULL,
  snapshot    JSONB NOT NULL,  -- Full state: {nodes: [...], edges: [...]}
  label       TEXT,            -- e.g. "Auto-save v1", "Pre-deployment stable"
  created_by  UUID REFERENCES public.profiles ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 10: workflow_comments
CREATE TABLE public.workflow_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflows ON DELETE CASCADE NOT NULL,
  node_id     UUID REFERENCES public.workflow_nodes ON DELETE SET NULL, -- NULL = canvas-level
  parent_id   UUID REFERENCES public.workflow_comments ON DELETE CASCADE, -- Thread replies
  body        TEXT NOT NULL,
  created_by  UUID REFERENCES public.profiles ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Table 11: workflow_activity
CREATE TABLE public.workflow_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflows ON DELETE CASCADE NOT NULL,
  actor_id    UUID REFERENCES public.profiles ON DELETE SET NULL,
  action      TEXT NOT NULL, -- e.g. 'node_created', 'edge_deleted', 'member_joined'
  meta        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 12: workflow_shares
CREATE TABLE public.workflow_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflows ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES public.profiles ON DELETE CASCADE, -- NULL = public link share
  role        TEXT NOT NULL CHECK (role IN ('editor', 'commenter', 'viewer')),
  share_token TEXT UNIQUE, -- Used for public access links
  expires_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES public.profiles ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 13: custom_node_templates
CREATE TABLE public.custom_node_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID REFERENCES public.workspaces ON DELETE CASCADE NOT NULL,
  created_by        UUID REFERENCES public.profiles ON DELETE RESTRICT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  base_type         TEXT NOT NULL,
  icon              TEXT,
  color             TEXT,
  default_data      JSONB NOT NULL DEFAULT '{}',
  default_style     JSONB NOT NULL DEFAULT '{}',
  handles           JSONB NOT NULL DEFAULT '{}',
  validation_schema JSONB NOT NULL DEFAULT '{}',
  tags              TEXT[] NOT NULL DEFAULT '{}',
  visibility        TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'workspace')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 14: user_favorite_nodes
CREATE TABLE public.user_favorite_nodes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  node_type               TEXT, -- Standard node type (e.g., 'start', 'api_request')
  custom_node_template_id UUID REFERENCES public.custom_node_templates ON DELETE CASCADE,
  sort_order              INT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exactly_one_source CHECK (
    (node_type IS NOT NULL AND custom_node_template_id IS NULL) OR
    (node_type IS NULL AND custom_node_template_id IS NOT NULL)
  )
);

-- Table 15: subscriptions
CREATE TABLE public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            UUID REFERENCES public.workspaces ON DELETE CASCADE UNIQUE NOT NULL,
  plan                    TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'warrior', 'elite', 'champion', 'legend')),
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  stripe_price_id         TEXT,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'canceled', 'past_due', 'incomplete')),
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false
);

-- Table 16: ai_requests
CREATE TABLE public.ai_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID REFERENCES public.workspaces ON DELETE CASCADE NOT NULL,
  user_id          UUID REFERENCES public.profiles ON DELETE SET NULL,
  workflow_id      UUID REFERENCES public.workflows ON DELETE SET NULL,
  action           TEXT NOT NULL CHECK (action IN ('generate', 'analyze', 'suggest', 'summarize', 'layout', 'chat')),
  prompt_tokens    INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  credits_used     INT NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------
-- 3. ENABLING ROW LEVEL SECURITY (RLS)
-- ------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_node_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorite_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- 4. RLS POLICIES DEFINITIONS
-- ------------------------------------------

-- profiles: Users read and update only their own rows
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- user_preferences: Read and update only their own preferences
CREATE POLICY "Users manage own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- workspaces: View workspace if they are owner OR listed as workspace member
CREATE POLICY "Members can view workspace" ON public.workspaces
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.workspaces.id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update workspace" ON public.workspaces
  FOR UPDATE USING (auth.uid() = owner_id);

-- workspace_members: View fellow workspace members if active inside that workspace
CREATE POLICY "Members view workspace members" ON public.workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.workspace_members.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner/Admin manage members" ON public.workspace_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- dashboards: Accessible to all workspace members
CREATE POLICY "Workspace members access dashboards" ON public.dashboards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.dashboards.workspace_id AND wm.user_id = auth.uid()
    )
  );

-- workflows: Access if member of workspace OR listed under direct workflow share policies
CREATE POLICY "Workspace members access workflows" ON public.workflows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.workflows.workspace_id AND wm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.workflow_shares ws
      WHERE ws.workflow_id = public.workflows.id AND (ws.user_id = auth.uid() OR ws.share_token IS NOT NULL)
    )
  );

-- workflow_nodes & workflow_edges: Inherit permissions from parent workflow access
CREATE POLICY "Workflow access controls nodes" ON public.workflow_nodes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = public.workflow_nodes.workflow_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workflow access controls edges" ON public.workflow_edges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = public.workflow_edges.workflow_id AND wm.user_id = auth.uid()
    )
  );

-- workflow_versions: Inherit parent workflow access policies
CREATE POLICY "Workflow members access versions" ON public.workflow_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = public.workflow_versions.workflow_id AND wm.user_id = auth.uid()
    )
  );

-- workflow_comments: Access if workspace member
CREATE POLICY "Workflow members access comments" ON public.workflow_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = public.workflow_comments.workflow_id AND wm.user_id = auth.uid()
    )
  );

-- workflow_activity: SELECT allowed for workspace members
CREATE POLICY "Workflow members view activity" ON public.workflow_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = public.workflow_activity.workflow_id AND wm.user_id = auth.uid()
    )
  );

-- workflow_shares: Manage shares if workspace Admin or Owner
CREATE POLICY "Workflow owner manages shares" ON public.workflow_shares
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.workflows w ON w.workspace_id = wm.workspace_id
      WHERE w.id = public.workflow_shares.workflow_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- custom_node_templates: View template if private & created_by user OR workspace public & user is workspace member
CREATE POLICY "Users access custom templates" ON public.custom_node_templates
  FOR ALL USING (
    created_by = auth.uid()
    OR (
      visibility = 'workspace' AND
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = public.custom_node_templates.workspace_id
        AND wm.user_id = auth.uid()
      )
    )
  );

-- user_favorite_nodes: Read and update only their own favorites
CREATE POLICY "Users manage own favorites" ON public.user_favorite_nodes
  FOR ALL USING (auth.uid() = user_id);

-- subscriptions: Read subscription detail if workspace owner
CREATE POLICY "Workspace owner views subscription" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = public.subscriptions.workspace_id AND w.owner_id = auth.uid()
    )
  );

-- ai_requests: View list if workspace member
CREATE POLICY "Workspace members view AI requests" ON public.ai_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.ai_requests.workspace_id AND wm.user_id = auth.uid()
    )
  );

-- ------------------------------------------
-- 5. TRIGGER FUNCTIONS & TRIGGERS
-- ------------------------------------------

-- Trigger A: handle_new_user()
-- Automatically creates profile, preferences, custom workspace, and default subscription trial on user sign up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_workspace_id UUID;
  v_fallback_name TEXT;
BEGIN
  -- Determine profile name fallback
  v_fallback_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  -- 1. Provision profile record
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- 2. Provision preferences record
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);

  -- 3. Provision default workspace record
  INSERT INTO public.workspaces (name, owner_id, plan, trial_ends_at)
  VALUES (
    v_fallback_name || '''s Workspace',
    NEW.id,
    'legend',
    now() + INTERVAL '14 days'
  )
  RETURNING id INTO v_workspace_id;

  -- 4. Set user as Owner inside members join table
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, NEW.id, 'owner');

  -- 5. Set default Trial subscription record
  INSERT INTO public.subscriptions (workspace_id, plan, status, current_period_start, current_period_end)
  VALUES (
    v_workspace_id,
    'legend',
    'trialing',
    now(),
    now() + INTERVAL '14 days'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger B: update_workflow_node_count()
-- Increments/decrements workflow node counts dynamically
CREATE OR REPLACE FUNCTION public.update_workflow_node_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.workflows SET node_count = node_count + 1
    WHERE id = NEW.workflow_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.workflows SET node_count = node_count - 1
    WHERE id = OLD.workflow_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER on_workflow_node_change
  AFTER INSERT OR DELETE ON public.workflow_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_workflow_node_count();

-- Function C: get_workspace_plan()
-- Helper to return the current plan of a workspace
CREATE OR REPLACE FUNCTION public.get_workspace_plan(p_workspace_id UUID)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT plan FROM public.subscriptions WHERE workspace_id = p_workspace_id;
$$;

-- ------------------------------------------
-- 6. INDEXES FOR PERFORMANCE
-- ------------------------------------------

CREATE INDEX IF NOT EXISTS workflows_workspace_id_idx ON public.workflows(workspace_id);
CREATE INDEX IF NOT EXISTS workflows_dashboard_id_idx ON public.workflows(dashboard_id);
CREATE INDEX IF NOT EXISTS workflows_updated_at_idx   ON public.workflows(updated_at DESC);

CREATE INDEX IF NOT EXISTS workflow_nodes_workflow_id_idx ON public.workflow_nodes(workflow_id);

CREATE INDEX IF NOT EXISTS workflow_edges_workflow_id_idx    ON public.workflow_edges(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_edges_source_node_id_idx ON public.workflow_edges(source_node_id);
CREATE INDEX IF NOT EXISTS workflow_edges_target_node_id_idx ON public.workflow_edges(target_node_id);

CREATE INDEX IF NOT EXISTS workflow_versions_workflow_id_created_at_idx
  ON public.workflow_versions(workflow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS workflow_comments_workflow_id_idx ON public.workflow_comments(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_comments_node_id_idx     ON public.workflow_comments(node_id);

CREATE INDEX IF NOT EXISTS ai_requests_workspace_id_idx ON public.ai_requests(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_favorite_nodes_user_id_idx ON public.user_favorite_nodes(user_id);

-- ------------------------------------------
-- 7. ENABLE REALTIME
-- ------------------------------------------

-- Add newly created tables to the Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_edges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_activity;

