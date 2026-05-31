-- ============================================================
-- Marketplace Nodes System Migration
-- Creates tables for: marketplace_nodes, marketplace_installs,
-- marketplace_ratings, workspace_node_settings
-- ============================================================

-- 1. Marketplace Nodes — published node extensions
CREATE TABLE IF NOT EXISTS marketplace_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  long_description TEXT,
  -- Classification
  category TEXT NOT NULL DEFAULT 'general',
  domain TEXT,
  tags TEXT[] DEFAULT '{}',
  -- Appearance
  icon TEXT DEFAULT 'settings',
  color TEXT DEFAULT 'bg-primary',
  accent_bar TEXT DEFAULT 'bg-primary',
  badge_color TEXT DEFAULT 'bg-primary/10 text-primary',
  color_class TEXT,
  preview_image_url TEXT,
  -- Technical config
  base_type TEXT NOT NULL DEFAULT 'process',
  default_data JSONB DEFAULT '{}',
  default_style JSONB DEFAULT '{}',
  handles JSONB DEFAULT '{"inputsCount": 1, "outputsCount": 1}',
  fields_schema JSONB DEFAULT '[]',
  -- Publishing
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'workspace', 'public')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'under_review', 'rejected', 'archived')),
  -- Stats
  install_count INT DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  -- Pricing
  is_free BOOLEAN NOT NULL DEFAULT TRUE,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  -- Metadata
  version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Marketplace Installs — track node installations per workspace
CREATE TABLE IF NOT EXISTS marketplace_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  marketplace_node_id UUID NOT NULL REFERENCES marketplace_nodes(id) ON DELETE CASCADE,
  installed_by UUID NOT NULL REFERENCES profiles(id),
  installed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, marketplace_node_id)
);

-- 3. Marketplace Ratings — user ratings and reviews
CREATE TABLE IF NOT EXISTS marketplace_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_node_id UUID NOT NULL REFERENCES marketplace_nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(marketplace_node_id, user_id)
);

-- 4. Workspace Node Settings — per-workspace node group/visibility config
CREATE TABLE IF NOT EXISTS workspace_node_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  node_groups JSONB DEFAULT '[]',
  hidden_nodes TEXT[] DEFAULT '{}',
  custom_order JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id)
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_marketplace_nodes_author ON marketplace_nodes(author_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_nodes_status ON marketplace_nodes(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_nodes_visibility ON marketplace_nodes(visibility);
CREATE INDEX IF NOT EXISTS idx_marketplace_nodes_category ON marketplace_nodes(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_installs_workspace ON marketplace_installs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_installs_node ON marketplace_installs(marketplace_node_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_node ON marketplace_ratings(marketplace_node_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_user ON marketplace_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_node_settings_ws ON workspace_node_settings(workspace_id);

-- ============================================================
-- RLS Policies
-- ============================================================

-- Enable RLS
ALTER TABLE marketplace_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_node_settings ENABLE ROW LEVEL SECURITY;

-- marketplace_nodes: anyone can read public/published, authors can manage their own
CREATE POLICY "marketplace_nodes_select_public" ON marketplace_nodes
  FOR SELECT USING (
    visibility = 'public' AND status = 'published'
    OR author_id = auth.uid()
  );

CREATE POLICY "marketplace_nodes_insert_own" ON marketplace_nodes
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "marketplace_nodes_update_own" ON marketplace_nodes
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "marketplace_nodes_delete_own" ON marketplace_nodes
  FOR DELETE USING (author_id = auth.uid());

-- marketplace_installs: workspace members can read/write
CREATE POLICY "marketplace_installs_select" ON marketplace_installs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = marketplace_installs.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "marketplace_installs_insert" ON marketplace_installs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = marketplace_installs.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "marketplace_installs_delete" ON marketplace_installs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = marketplace_installs.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- marketplace_ratings: anyone can read, authenticated users can write their own
CREATE POLICY "marketplace_ratings_select" ON marketplace_ratings
  FOR SELECT USING (true);

CREATE POLICY "marketplace_ratings_insert" ON marketplace_ratings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "marketplace_ratings_update" ON marketplace_ratings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "marketplace_ratings_delete" ON marketplace_ratings
  FOR DELETE USING (user_id = auth.uid());

-- workspace_node_settings: workspace owner/admin can manage
CREATE POLICY "workspace_node_settings_select" ON workspace_node_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_node_settings.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_node_settings_insert" ON workspace_node_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_node_settings.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_node_settings_update" ON workspace_node_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_node_settings.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_node_settings_delete" ON workspace_node_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_node_settings.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- Function to update avg_rating when ratings change
-- ============================================================
CREATE OR REPLACE FUNCTION update_marketplace_node_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_nodes
  SET
    avg_rating = COALESCE((
      SELECT AVG(rating)::NUMERIC(3,2)
      FROM marketplace_ratings
      WHERE marketplace_node_id = COALESCE(NEW.marketplace_node_id, OLD.marketplace_node_id)
    ), 0),
    rating_count = (
      SELECT COUNT(*)
      FROM marketplace_ratings
      WHERE marketplace_node_id = COALESCE(NEW.marketplace_node_id, OLD.marketplace_node_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.marketplace_node_id, OLD.marketplace_node_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_rating_on_insert
  AFTER INSERT ON marketplace_ratings
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_node_rating();

CREATE TRIGGER trg_update_rating_on_update
  AFTER UPDATE ON marketplace_ratings
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_node_rating();

CREATE TRIGGER trg_update_rating_on_delete
  AFTER DELETE ON marketplace_ratings
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_node_rating();

-- Function to update install_count when installs change
CREATE OR REPLACE FUNCTION update_marketplace_node_install_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_nodes
  SET
    install_count = (
      SELECT COUNT(*)
      FROM marketplace_installs
      WHERE marketplace_node_id = COALESCE(NEW.marketplace_node_id, OLD.marketplace_node_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.marketplace_node_id, OLD.marketplace_node_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_installs_on_insert
  AFTER INSERT ON marketplace_installs
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_node_install_count();

CREATE TRIGGER trg_update_installs_on_delete
  AFTER DELETE ON marketplace_installs
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_node_install_count();
