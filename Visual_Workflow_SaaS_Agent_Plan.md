# VISUAL WORKFLOW SaaS — COMPLETE AGENT EXECUTION PLAN

> **Mission:** Transform a local HTML + IndexedDB workflow builder into a full-scale SaaS platform with real-time collaboration, AI assistance, subscription billing, multi-language support, and a professional visual editor.

---

## LOCKED ASSUMPTIONS (Never Deviate From These)

- This is a **full SaaS release** — NOT a limited MVP.
- **Mobile = View + Comments ONLY.** No canvas editing on mobile, even on paid plans.
- **Real-time collaboration** is live from day one: nodes, edges, comments, and presence.
- **Custom elements** are user-private by default; workspace sharing is plan-gated.
- **AI Assistant** is included in the first release.
- **Supabase** is the single source of truth. No hybrid local/cloud storage.
- **Conflict resolution** = last-write-wins + version history snapshots.
- **No automation execution engine in v1** — visual design, collaboration, and AI analysis only.
- Old `index.html` kept as temporary reference only; archived after migration completes.

---

## TECHNOLOGY STACK

| Layer | Technology |
|---|---|
| Framework | Next.js App Router + TypeScript |
| Canvas | React Flow / XYFlow |
| UI | Tailwind CSS + shadcn/ui + lucide-react |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Database / Auth / Realtime | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Payments | Stripe (Subscriptions + Webhooks) |
| AI | OpenAI API (GPT-4o) |
| i18n | next-intl (AR + EN, RTL + LTR) |
| Theme | next-themes (Light / Dark / System) |

---

## MASTER PHASE OVERVIEW

| # | Phase | Key Deliverables | Est. Duration |
|---|---|---|---|
| 1 | Project Foundation | Next.js setup, folder structure, env config, tooling | 1–2 days |
| 2 | Database & Schema | 16 Supabase tables, RLS policies, indexes, triggers | 2–3 days |
| 3 | Authentication | Email/password, Google OAuth, verification, middleware | 2 days |
| 4 | i18n & Theming | AR/EN translations, RTL/LTR, Light/Dark/System themes | 1–2 days |
| 5 | Dashboard | Workflows list, stats cards, quick actions, filters | 2–3 days |
| 6 | Workflow Editor Core | React Flow canvas, panels, toolbar, undo/redo, export | 3–4 days |
| 7 | Node Library | 40+ nodes across 6 categories, properties panel, validation | 3–4 days |
| 8 | Favorites & Custom Elements | Custom node designer, favorites system, plan limits | 2–3 days |
| 9 | Real-time Collaboration | Presence, cursors, live sync, comments, activity log | 3–4 days |
| 10 | Billing & Plans | Stripe checkout, 5 tiers, trial logic, usage guards | 2–3 days |
| 11 | AI Assistant | Workflow gen, analysis, suggestions, credit metering | 2–3 days |
| 12 | Sharing & Permissions | Share links, role enforcement, public view | 2 days |
| 13 | Mobile & Tablet UX | Responsive editor, view-only mobile, bottom sheets | 2 days |
| 14 | QA & Testing | Functional, realtime, billing, AI, UI/UX test suites | 2–3 days |
| 15 | Deploy & Launch | Vercel, Supabase prod, Stripe live mode, monitoring | 1–2 days |

**Total: 30–45 working days (solo developer). Parallelizable with a team.**

---

---

# PHASE 1 — PROJECT FOUNDATION & ARCHITECTURE
**Duration: 1–2 Days**
**Goal:** Bootstrap a production-ready Next.js monorepo with every tool, linter, and configuration locked in before writing any feature code.

---

## STEP 1.1 — Initialize Next.js App Router Project

```bash
npx create-next-app@latest visual-workflow \
  --typescript \
  --tailwind \
  --app \
  --eslint \
  --src-dir
```

- Select: App Router = **YES**
- Select: src/ directory = **YES**
- Select: import alias = `@/*`
- Set Node.js `>= 20.x` in `package.json` engines field
- Confirm TypeScript strict mode is enabled in `tsconfig.json`

---

## STEP 1.2 — Install All Dependencies

```bash
# Core canvas and state
npm install @xyflow/react zustand

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Payments and AI
npm install stripe @stripe/stripe-js openai

# Internationalization and theme
npm install next-intl next-themes

# Forms and validation
npm install react-hook-form zod @hookform/resolvers

# UI utilities
npm install lucide-react class-variance-authority clsx tailwind-merge

# Export utilities
npm install html-to-image jspdf

# Auto-layout
npm install dagre @types/dagre

# Initialize shadcn/ui
npx shadcn@latest init
# When prompted: New York style, CSS variables: YES

# Add shadcn components
npx shadcn@latest add button input dialog sheet tabs badge select \
  dropdown-menu card separator skeleton tooltip popover command \
  scroll-area avatar progress switch label textarea
```

---

## STEP 1.3 — Define Complete Folder Structure

Create exactly this structure. Every folder must exist before writing code:

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/
│   │   │   ├── sign-in/page.tsx
│   │   │   ├── sign-up/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── verify-email/page.tsx
│   │   ├── (main)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── workflows/[workflowId]/page.tsx
│   │   │   ├── billing/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── profile/page.tsx
│   │   │   │   └── workspace/page.tsx
│   │   │   └── layout.tsx          ← protected layout
│   │   ├── share/[shareId]/page.tsx ← public, no auth
│   │   └── layout.tsx              ← locale + theme providers
│   ├── api/
│   │   ├── stripe/webhook/route.ts
│   │   ├── ai/generate/route.ts
│   │   ├── ai/analyze/route.ts
│   │   └── ai/suggest/route.ts
│   └── auth/callback/route.ts      ← OAuth + email verify handler
│
├── components/
│   ├── editor/
│   │   ├── Canvas.tsx
│   │   ├── NodeLibrary.tsx
│   │   ├── PropertiesPanel.tsx
│   │   ├── EditorToolbar.tsx
│   │   ├── Minimap.tsx
│   │   ├── LayersPanel.tsx
│   │   ├── CommentsPanel.tsx
│   │   ├── HistoryPanel.tsx
│   │   └── AIAssistantPanel.tsx
│   ├── nodes/
│   │   ├── BaseNode.tsx            ← shared wrapper for all node types
│   │   ├── BasicNodes/             ← Start, End, Process, Decision, Note, Group, Delay
│   │   ├── LogicNodes/             ← If/Else, Switch, Loop, Parallel, Merge, Retry, ErrorHandler
│   │   ├── DataNodes/              ← Input, Output, Variable, Transform, Filter, Mapper
│   │   ├── IntegrationNodes/       ← APIRequest, Webhook, Email, Database, GoogleSheets...
│   │   ├── HumanNodes/             ← FormStep, ApprovalStep, UserTask, Checklist, Signature
│   │   └── AINodes/                ← GenerateText, Classify, ExtractData, Summarize, Route...
│   ├── dashboard/
│   │   ├── WorkflowCard.tsx
│   │   ├── StatsBar.tsx
│   │   ├── QuickActions.tsx
│   │   └── FilterBar.tsx
│   ├── billing/
│   │   ├── PlanCard.tsx
│   │   ├── UsageMeter.tsx
│   │   └── UpgradeModal.tsx
│   └── ui/                         ← shadcn + custom shared components
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← browser client
│   │   ├── server.ts               ← server client (cookies)
│   │   └── middleware.ts           ← middleware client
│   ├── stripe.ts
│   ├── openai.ts
│   ├── planLimits.ts               ← all plan limit constants + check functions
│   └── cn.ts                       ← clsx + tailwind-merge utility
│
├── stores/
│   ├── workflowStore.ts
│   ├── editorStore.ts
│   ├── collaborationStore.ts
│   └── uiStore.ts
│
├── hooks/
│   ├── useWorkflow.ts
│   ├── useNodes.ts
│   ├── useRealtime.ts
│   ├── usePlanLimits.ts
│   ├── useAI.ts
│   └── useWindowSize.ts
│
├── types/
│   ├── database.types.ts           ← auto-generated by Supabase CLI
│   ├── workflow.types.ts
│   ├── node.types.ts
│   └── plan.types.ts
│
├── actions/                        ← Next.js Server Actions
│   ├── auth.actions.ts
│   ├── workflow.actions.ts
│   ├── node.actions.ts
│   ├── billing.actions.ts
│   └── ai.actions.ts
│
├── middleware.ts                   ← locale + auth protection
│
└── messages/
    ├── en.json
    └── ar.json
```

---

## STEP 1.4 — Configure Environment Variables

Create `.env.local` with these exact keys:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never expose to client

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# OpenAI
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=              # e.g. https://your-domain.com
```

Create `.env.example` with all keys but empty values. Commit `.env.example`, never commit `.env.local`.

---

## STEP 1.5 — Configure Tailwind & Design Tokens

In `tailwind.config.ts`, extend the theme:

```ts
extend: {
  colors: {
    primary: { DEFAULT: '#1E3A5F', ... },
    accent:  { DEFAULT: '#2563EB', ... },
    canvas:  { DEFAULT: '#F8FAFC', dark: '#0F172A' },
    sidebar: { DEFAULT: '#FFFFFF', dark: '#1E293B' },
    node: {
      basic:       '#6B7280',
      logic:       '#D97706',
      data:        '#2563EB',
      integration: '#16A34A',
      human:       '#EA580C',
      ai:          '#7C3AED',
    },
  },
  fontFamily: {
    sans: ['Inter', 'Tajawal', 'sans-serif'],
  },
}
```

In `globals.css`, define CSS variables for light and dark mode:

```css
:root {
  --background: 248 250 252;
  --foreground: 15 23 42;
  --canvas-bg: 248 250 252;
  --sidebar-bg: 255 255 255;
  --panel-bg: 255 255 255;
  --border: 226 232 240;
}

.dark {
  --background: 15 23 42;
  --foreground: 248 250 252;
  --canvas-bg: 15 23 42;
  --sidebar-bg: 30 41 59;
  --panel-bg: 30 41 59;
  --border: 51 65 85;
}
```

---

## STEP 1.6 — Configure Middleware

`src/middleware.ts`:

```ts
import { createMiddlewareClient } from '@supabase/ssr'
import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
})

const PROTECTED_PATHS = ['/dashboard', '/workflows', '/billing', '/settings']
const PUBLIC_PATHS = ['/auth', '/share', '/api']

export async function middleware(request: NextRequest) {
  // 1. Handle locale routing
  const intlResponse = intlMiddleware(request)

  // 2. Create Supabase client and refresh session
  const response = intlResponse || NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res: response })
  const { data: { session } } = await supabase.auth.getSession()

  // 3. Protect routes
  const pathname = request.nextUrl.pathname
  const isProtected = PROTECTED_PATHS.some(p => pathname.includes(p))
  const isPublic = PUBLIC_PATHS.some(p => pathname.includes(p))

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/en/auth/sign-in', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

---

# PHASE 2 — DATABASE SCHEMA & SECURITY
**Duration: 2–3 Days**
**Goal:** Create all 16 Supabase tables with correct columns, foreign keys, indexes, and RLS policies so no schema changes are needed later.

---

## STEP 2.1 — Create All Tables (Run in Supabase SQL Editor)

### Table 1: profiles

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
```

### Table 2: user_preferences

```sql
CREATE TABLE user_preferences (
  user_id          UUID PRIMARY KEY REFERENCES profiles ON DELETE CASCADE,
  language         TEXT DEFAULT 'en'     CHECK (language IN ('en', 'ar')),
  theme            TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  editor_layout    JSONB DEFAULT '{}',
  collapsed_panels TEXT[] DEFAULT '{}'
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON user_preferences FOR ALL USING (auth.uid() = user_id);
```

### Table 3: workspaces

```sql
CREATE TABLE workspaces (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  owner_id          UUID REFERENCES profiles NOT NULL,
  plan              TEXT DEFAULT 'free',
  trial_ends_at     TIMESTAMPTZ,
  stripe_customer_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace"
  ON workspaces FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update workspace"
  ON workspaces FOR UPDATE USING (auth.uid() = owner_id);
```

### Table 4: workspace_members

```sql
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces ON DELETE CASCADE,
  user_id      UUID REFERENCES profiles ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('owner','admin','editor','commenter','viewer')),
  invited_by   UUID REFERENCES profiles,
  joined_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view workspace members"
  ON workspace_members FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner/Admin manage members"
  ON workspace_members FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );
```

### Table 5: dashboards

```sql
CREATE TABLE dashboards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  created_by   UUID REFERENCES profiles,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members access dashboards"
  ON dashboards FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = dashboards.workspace_id AND user_id = auth.uid()
    )
  );
```

### Table 6: workflows

```sql
CREATE TABLE workflows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id  UUID REFERENCES dashboards ON DELETE SET NULL,
  workspace_id  UUID REFERENCES workspaces ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','archived','published')),
  thumbnail_url TEXT,
  node_count    INT DEFAULT 0,
  created_by    UUID REFERENCES profiles,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE INDEX workflows_workspace_id_idx ON workflows(workspace_id);
CREATE INDEX workflows_dashboard_id_idx ON workflows(dashboard_id);
CREATE INDEX workflows_updated_at_idx   ON workflows(updated_at DESC);

-- RLS: workspace members OR direct share access
CREATE POLICY "Workspace members access workflows"
  ON workflows FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workflows.workspace_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM workflow_shares
      WHERE workflow_id = workflows.id AND user_id = auth.uid()
    )
  );
```

### Table 7: workflow_nodes

```sql
CREATE TABLE workflow_nodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL,
  position    JSONB NOT NULL,           -- {x: number, y: number}
  data        JSONB NOT NULL DEFAULT '{}',  -- label, config, properties
  style       JSONB DEFAULT '{}',
  parent_id   UUID REFERENCES workflow_nodes ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
CREATE INDEX workflow_nodes_workflow_id_idx ON workflow_nodes(workflow_id);

CREATE POLICY "Workflow access controls nodes"
  ON workflow_nodes FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = workflow_nodes.workflow_id AND wm.user_id = auth.uid()
    )
  );
```

### Table 8: workflow_edges

```sql
CREATE TABLE workflow_edges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     UUID REFERENCES workflows ON DELETE CASCADE NOT NULL,
  source_node_id  UUID REFERENCES workflow_nodes ON DELETE CASCADE,
  target_node_id  UUID REFERENCES workflow_nodes ON DELETE CASCADE,
  source_handle   TEXT,
  target_handle   TEXT,
  data            JSONB DEFAULT '{}',    -- label, animated, style
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;
CREATE INDEX workflow_edges_workflow_id_idx    ON workflow_edges(workflow_id);
CREATE INDEX workflow_edges_source_node_id_idx ON workflow_edges(source_node_id);
CREATE INDEX workflow_edges_target_node_id_idx ON workflow_edges(target_node_id);

CREATE POLICY "Workflow access controls edges"
  ON workflow_edges FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = workflow_edges.workflow_id AND wm.user_id = auth.uid()
    )
  );
```

### Table 9: workflow_versions

```sql
CREATE TABLE workflow_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows ON DELETE CASCADE NOT NULL,
  snapshot    JSONB NOT NULL,  -- full {nodes: [...], edges: [...]}
  label       TEXT,            -- e.g. "Auto-save v3" or user-defined
  created_by  UUID REFERENCES profiles,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
CREATE INDEX workflow_versions_workflow_id_created_at_idx
  ON workflow_versions(workflow_id, created_at DESC);

CREATE POLICY "Workflow members access versions"
  ON workflow_versions FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = workflow_versions.workflow_id AND wm.user_id = auth.uid()
    )
  );
```

### Table 10: workflow_comments

```sql
CREATE TABLE workflow_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows ON DELETE CASCADE NOT NULL,
  node_id     UUID REFERENCES workflow_nodes ON DELETE SET NULL,  -- NULL = canvas-level
  parent_id   UUID REFERENCES workflow_comments ON DELETE CASCADE,  -- for threaded replies
  body        TEXT NOT NULL,
  created_by  UUID REFERENCES profiles,
  created_at  TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE workflow_comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX workflow_comments_workflow_id_idx ON workflow_comments(workflow_id);
CREATE INDEX workflow_comments_node_id_idx     ON workflow_comments(node_id);

CREATE POLICY "Workflow members access comments"
  ON workflow_comments FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = workflow_comments.workflow_id AND wm.user_id = auth.uid()
    )
  );
```

### Table 11: workflow_activity

```sql
CREATE TABLE workflow_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows ON DELETE CASCADE,
  actor_id    UUID REFERENCES profiles,
  action      TEXT NOT NULL,  -- node_created | edge_deleted | member_invited | ...
  meta        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflow_activity ENABLE ROW LEVEL SECURITY;
CREATE INDEX workflow_activity_workflow_id_idx ON workflow_activity(workflow_id);

CREATE POLICY "Workflow members view activity"
  ON workflow_activity FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = workflow_activity.workflow_id AND wm.user_id = auth.uid()
    )
  );
```

### Table 12: workflow_shares

```sql
CREATE TABLE workflow_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES profiles ON DELETE CASCADE,  -- NULL = public link
  role        TEXT NOT NULL CHECK (role IN ('editor','commenter','viewer')),
  share_token TEXT UNIQUE,  -- used for public share links
  expires_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES profiles,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflow_shares ENABLE ROW LEVEL SECURITY;
CREATE INDEX workflow_shares_workflow_id_idx ON workflow_shares(workflow_id);
CREATE INDEX workflow_shares_share_token_idx ON workflow_shares(share_token);

CREATE POLICY "Workflow owner manages shares"
  ON workflow_shares FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN workflows w ON w.workspace_id = wm.workspace_id
      WHERE w.id = workflow_shares.workflow_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );
```

### Table 13: custom_node_templates

```sql
CREATE TABLE custom_node_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID REFERENCES workspaces ON DELETE CASCADE,
  created_by        UUID REFERENCES profiles NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  base_type         TEXT NOT NULL,        -- system node type it extends
  icon              TEXT,                 -- lucide icon name
  color             TEXT,                 -- hex color
  default_data      JSONB DEFAULT '{}',   -- preset property values
  default_style     JSONB DEFAULT '{}',   -- visual defaults
  handles           JSONB DEFAULT '{}',   -- {inputs: [...], outputs: [...]}
  validation_schema JSONB DEFAULT '{}',
  tags              TEXT[] DEFAULT '{}',
  visibility        TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'workspace')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE custom_node_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own custom templates"
  ON custom_node_templates FOR ALL USING (
    created_by = auth.uid()
    OR (
      visibility = 'workspace' AND
      EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = custom_node_templates.workspace_id
        AND user_id = auth.uid()
      )
    )
  );
```

### Table 14: user_favorite_nodes

```sql
CREATE TABLE user_favorite_nodes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID REFERENCES profiles ON DELETE CASCADE NOT NULL,
  node_type              TEXT,     -- system node type (e.g. 'process', 'decision')
  custom_node_template_id UUID REFERENCES custom_node_templates ON DELETE CASCADE,
  sort_order             INT DEFAULT 0,
  created_at             TIMESTAMPTZ DEFAULT now(),
  -- Exactly one of node_type or custom_node_template_id must be set
  CONSTRAINT exactly_one_source CHECK (
    (node_type IS NOT NULL AND custom_node_template_id IS NULL) OR
    (node_type IS NULL AND custom_node_template_id IS NOT NULL)
  )
);

ALTER TABLE user_favorite_nodes ENABLE ROW LEVEL SECURITY;
CREATE INDEX user_favorite_nodes_user_id_idx ON user_favorite_nodes(user_id);

CREATE POLICY "Users manage own favorites"
  ON user_favorite_nodes FOR ALL USING (auth.uid() = user_id);
```

### Table 15: subscriptions

```sql
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            UUID REFERENCES workspaces ON DELETE CASCADE UNIQUE NOT NULL,
  plan                    TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  stripe_price_id         TEXT,
  status                  TEXT DEFAULT 'active'
    CHECK (status IN ('active','trialing','canceled','past_due','incomplete')),
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN DEFAULT false
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owner views subscription"
  ON subscriptions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = subscriptions.workspace_id AND owner_id = auth.uid()
    )
  );
```

### Table 16: ai_requests

```sql
CREATE TABLE ai_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID REFERENCES workspaces ON DELETE CASCADE,
  user_id          UUID REFERENCES profiles,
  workflow_id      UUID REFERENCES workflows ON DELETE SET NULL,
  action           TEXT NOT NULL,  -- generate | analyze | suggest | summarize | layout | chat
  prompt_tokens    INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  credits_used     INT DEFAULT 0,
  status           TEXT DEFAULT 'success' CHECK (status IN ('success','error')),
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX ai_requests_workspace_id_idx ON ai_requests(workspace_id, created_at DESC);

CREATE POLICY "Workspace members view AI requests"
  ON ai_requests FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = ai_requests.workspace_id AND user_id = auth.uid()
    )
  );
```

---

## STEP 2.2 — Database Functions & Triggers

```sql
-- Auto-create profile, preferences, workspace, and subscription on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  workspace_id UUID;
BEGIN
  -- 1. Create profile
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- 2. Create user preferences
  INSERT INTO user_preferences (user_id) VALUES (NEW.id);

  -- 3. Create default workspace
  INSERT INTO workspaces (name, owner_id, plan, trial_ends_at)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
    NEW.id,
    'legend',
    now() + INTERVAL '14 days'
  )
  RETURNING id INTO workspace_id;

  -- 4. Add user as workspace owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (workspace_id, NEW.id, 'owner');

  -- 5. Create subscription (trial)
  INSERT INTO subscriptions (workspace_id, plan, status)
  VALUES (workspace_id, 'legend', 'trialing');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

```sql
-- Auto-update node_count on workflows when nodes are added/removed
CREATE OR REPLACE FUNCTION update_workflow_node_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE workflows SET node_count = node_count + 1
    WHERE id = NEW.workflow_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE workflows SET node_count = node_count - 1
    WHERE id = OLD.workflow_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_workflow_node_change
  AFTER INSERT OR DELETE ON workflow_nodes
  FOR EACH ROW EXECUTE FUNCTION update_workflow_node_count();
```

```sql
-- Check plan limits helper function
CREATE OR REPLACE FUNCTION get_workspace_plan(p_workspace_id UUID)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT plan FROM subscriptions WHERE workspace_id = p_workspace_id;
$$;
```

---

## STEP 2.3 — Enable Realtime on Required Tables

In Supabase Dashboard → Realtime → Tables, enable for:

- `workflow_nodes`
- `workflow_edges`
- `workflow_comments`
- `workflow_activity`

Or via SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_edges;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_activity;
```

---

## STEP 2.4 — Generate TypeScript Types

```bash
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  > src/types/database.types.ts
```

**Re-run this command after every schema migration.**

---

---

# PHASE 3 — AUTHENTICATION SYSTEM
**Duration: 2 Days**
**Goal:** Full auth system: email/password, Google OAuth, email verification, password reset, and automatic workspace provisioning on signup.

---

## STEP 3.1 — Configure Supabase Auth Settings

In Supabase Dashboard → Authentication → Providers:

- **Email provider:** Enable, set "Confirm email" = YES
- **Google provider:** Enable, add Google OAuth Client ID + Secret
  - Create Google OAuth credentials at console.cloud.google.com
  - Authorized redirect URI: `https://[project].supabase.co/auth/v1/callback`
- **Site URL:** Set to `NEXT_PUBLIC_APP_URL`
- **Redirect URLs:** Add:
  - `https://your-domain.com/auth/callback`
  - `http://localhost:3000/auth/callback` (for development)

In Supabase Dashboard → Authentication → Email Templates, customize:

- **Confirm signup:** Subject: "Verify your email — Visual Workflow"
- **Reset password:** Subject: "Reset your password — Visual Workflow"
- **Magic Link:** Not used but configure anyway

---

## STEP 3.2 — Create Supabase Clients

`src/lib/supabase/client.ts` — Browser client (use in Client Components):

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`src/lib/supabase/server.ts` — Server client (use in Server Components + Server Actions):

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}
```

---

## STEP 3.3 — Build Auth Pages (UI)

### Sign In Page (`/[locale]/auth/sign-in`)

Fields:
- Email input (type="email", required)
- Password input (type="password", required, min 8 chars)
- "Forgot password?" link → `/forgot-password`
- Submit button: "Sign In"
- Divider: "or"
- "Continue with Google" button (Google icon + text)
- Footer: "Don't have an account? Sign up" link

Behavior:
- Use React Hook Form + Zod for validation
- Show inline field errors
- Show loading spinner on submit button during request
- Show error toast on failed sign-in
- On success: redirect to `/dashboard`

### Sign Up Page (`/[locale]/auth/sign-up`)

Fields:
- Full Name input (required)
- Email input (required)
- Password input (required, min 8 chars)
- Confirm Password input (must match)
- Submit button: "Create Account"
- "Continue with Google" button
- Footer: "Already have an account? Sign in" link

Behavior:
- On success: show "Please check your email to verify your account" message
- Redirect to `/verify-email` page

### Forgot Password Page

Fields:
- Email input
- Submit button: "Send Reset Link"

Behavior:
- On success: "Password reset email sent. Check your inbox."

### Verify Email Page

- Show: "We sent a verification link to [email]"
- "Resend email" button
- "Back to sign in" link

### All Auth Pages Must:
- Show language switcher (AR/EN) at top-right
- Support RTL layout in Arabic
- Work in Light and Dark mode
- Show all error messages in selected language

---

## STEP 3.4 — Server Actions for Authentication

`src/actions/auth.actions.ts`:

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData) {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function signUp(formData: FormData) {
  const supabase = createClient()
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: { full_name: formData.get('fullName') as string },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })
  if (error) return { error: error.message }
  redirect('/auth/verify-email')
}

export async function signInWithGoogle() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })
  if (error) return { error: error.message }
  redirect(data.url)
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/auth/sign-in')
}

export async function resetPassword(email: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })
  if (error) return { error: error.message }
  return { success: true }
}
```

---

## STEP 3.5 — Auth Callback Route

`src/app/auth/callback/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=auth_failed`)
}
```

---

## STEP 3.6 — Profile Settings Page

Route: `/[locale]/settings/profile`

Sections:
1. **Avatar** — current avatar image, upload button (uploads to Supabase Storage bucket: `avatars`)
2. **Personal Info** — full_name field, email field (read-only; change email is a separate flow)
3. **Change Password** — current password + new password + confirm fields
4. **Connected Accounts** — show if Google is linked; option to link/unlink
5. **Danger Zone** — "Delete Account" button → confirmation dialog → deletes auth user (cascade deletes all data)

All updates use server actions that call `supabase.auth.updateUser()` and update `profiles` table.

---

---

# PHASE 4 — INTERNATIONALIZATION & THEMING
**Duration: 1–2 Days**
**Goal:** Full Arabic (RTL) + English (LTR) support with proper direction switching, and Light / Dark / System theme system.

---

## STEP 4.1 — Configure next-intl

`src/i18n.ts`:

```ts
import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

export const locales = ['en', 'ar'] as const
export type Locale = typeof locales[number]

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound()
  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

`src/app/[locale]/layout.tsx`:

```tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'

export default async function LocaleLayout({ children, params: { locale } }) {
  const messages = await getMessages()
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

---

## STEP 4.2 — Translation File Structure

`messages/en.json` — create these top-level keys with all values in English:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "loading": "Loading...",
    "error": "Something went wrong",
    "success": "Done!",
    "upgrade": "Upgrade Plan",
    "trial_banner": "{days} days left in your Legend trial"
  },
  "auth": {
    "sign_in": "Sign In",
    "sign_up": "Create Account",
    "sign_out": "Sign Out",
    "email": "Email address",
    "password": "Password",
    "full_name": "Full Name",
    "forgot_password": "Forgot password?",
    "google_login": "Continue with Google",
    "verify_email_title": "Check your inbox",
    "verify_email_desc": "We sent a verification link to {email}"
  },
  "dashboard": {
    "title": "Dashboard",
    "new_workflow": "New Workflow",
    "search_placeholder": "Search workflows...",
    "no_workflows": "No workflows yet. Create your first one!",
    "last_modified": "Last modified",
    "node_count": "{count} nodes"
  },
  "editor": {
    "auto_saved": "Saved",
    "saving": "Saving...",
    "unsaved": "Unsaved changes",
    "undo": "Undo",
    "redo": "Redo",
    "export": "Export",
    "share": "Share",
    "fit_view": "Fit View",
    "zoom_in": "Zoom In",
    "zoom_out": "Zoom Out"
  },
  "nodes": {
    "categories": {
      "basic": "Basic",
      "logic": "Logic",
      "data": "Data",
      "integration": "Integration",
      "human": "Human",
      "ai": "AI"
    },
    "types": {
      "start": "Start",
      "end": "End",
      "process": "Process",
      "decision": "Decision",
      "note": "Note",
      "group": "Group",
      "delay": "Delay",
      "if_else": "If / Else",
      "switch": "Switch",
      "loop": "Loop",
      "parallel": "Parallel",
      "merge": "Merge",
      "retry": "Retry",
      "error_handler": "Error Handler",
      "api_request": "API Request",
      "webhook": "Webhook",
      "email": "Email",
      "database": "Database Query",
      "google_sheets": "Google Sheets",
      "form_step": "Form Step",
      "approval": "Approval Step",
      "ai_generate": "Generate Text",
      "ai_classify": "Classify",
      "ai_summarize": "Summarize"
    }
  },
  "billing": {
    "current_plan": "Current Plan",
    "upgrade": "Upgrade",
    "trial_ends": "Trial ends {date}",
    "plans": {
      "free": "Free",
      "warrior": "Warrior",
      "elite": "Elite",
      "champion": "Champion",
      "legend": "Legend"
    }
  },
  "errors": {
    "limit_reached": "You've reached the {plan} plan limit for {resource}. Upgrade to continue.",
    "no_credits": "You have no AI credits remaining. Upgrade your plan to continue.",
    "permission_denied": "You don't have permission to perform this action.",
    "not_found": "This workflow doesn't exist or you don't have access."
  }
}
```

`messages/ar.json` — translate every single key to Arabic. No English strings should appear in the Arabic experience.

---

## STEP 4.3 — RTL/LTR Implementation Rules

**In all components:**

- Use `ms-` (margin-start) instead of `ml-` (margin-left) in Tailwind
- Use `me-` (margin-end) instead of `mr-`
- Use `ps-` (padding-start) instead of `pl-`
- Use `pe-` (padding-end) instead of `pr-`
- Use `start-` instead of `left-` for positioning
- Use `end-` instead of `right-`

**In the editor layout:**

- LTR: Library Sidebar | Canvas | Properties Panel
- RTL: Properties Panel | Canvas | Library Sidebar (flip via CSS `flex-direction`)
- Use `flex-row` on the container; sidebar uses `order-first` / `order-last` based on locale

**Icons that must mirror in RTL:**

- Chevron left/right → swap direction
- Arrow left/right → swap direction
- Use `rtl:scale-x-[-1]` Tailwind class on directional icons

**React Flow canvas:**

- Does NOT need RTL override — coordinate system stays LTR
- Canvas controls panel: reposition to bottom-start instead of bottom-left

---

## STEP 4.4 — Theme Implementation

**Do not use hard-coded colors anywhere in components.** Every color must use a CSS variable or Tailwind token that changes between light/dark mode.

Theme toggle component — show in navbar:

```tsx
'use client'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  // Cycle: system → light → dark → system
  return (
    <button onClick={() => setTheme(
      theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    )}>
      {theme === 'light' ? <Sun /> : theme === 'dark' ? <Moon /> : <Monitor />}
    </button>
  )
}
```

---

## STEP 4.5 — Language & Theme Persistence

On language change:

1. Update `user_preferences.language` in Supabase
2. Set locale cookie: `document.cookie = 'NEXT_LOCALE=' + locale`
3. Use `next-intl` router to navigate to same page with new locale prefix

On theme change:

1. Update `user_preferences.theme` in Supabase
2. `next-themes` handles the DOM class automatically

On app load (in root layout server component):

1. Fetch `user_preferences` from Supabase
2. Set `lang` and `dir` on `<html>` element
3. Pass `theme` as `defaultTheme` to ThemeProvider

---

---

# PHASE 5 — DASHBOARD
**Duration: 2–3 Days**
**Goal:** Professional main dashboard with workflows list, stats, quick actions, and plan usage.

---

## STEP 5.1 — Dashboard Layout

The dashboard layout (`/[locale]/(main)/layout.tsx`) wraps all main pages:

```
┌─────────────────────────────────────────────────────────┐
│ NAVBAR: Logo | Workspace Selector | Search | Theme | Avatar │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  LEFT        │   MAIN CONTENT AREA                     │
│  SIDEBAR     │   (changes per route)                   │
│  (collapsible│                                         │
│  260px)      │                                         │
│              │                                         │
└──────────────┴──────────────────────────────────────────┘
```

**Navbar items (left to right in LTR):**
- Logo + App name
- Workspace selector dropdown (shows all workspaces user belongs to)
- Global search input
- Theme toggle
- Language switcher (EN / AR)
- User avatar → dropdown: Profile, Settings, Sign Out

**Left Sidebar links:**
- Dashboard (home icon)
- Workflows (git-branch icon)
- Workspaces (building icon)
- Billing (credit-card icon)
- Settings (settings icon)
- Collapse button at bottom

Save collapsed state to `user_preferences.collapsed_panels`.

---

## STEP 5.2 — Plan Usage Stats Bar

Show at top of dashboard page, below any banners:

```
┌──────────────┬────────────────┬──────────────┬─────────────┬───────────────┐
│ Workflows    │ Custom Elements│ Collaborators│ Favorites   │ AI Credits    │
│ 7 / 20       │ 3 / 10         │ 2 / 3        │ 8 / 20      │ 47 / 50       │
│ [progress]   │ [progress]     │ [progress]   │ [progress]  │ [progress]    │
└──────────────┴────────────────┴──────────────┴─────────────┴───────────────┘
```

- Progress bar turns orange at 80% usage, red at 95%
- Click any card → navigates to `/billing`
- Show plan badge: "Warrior Plan" with upgrade button if not Legend
- **Trial banner** (if status = 'trialing'):
  ```
  ┌─────────────────────────────────────────────────────────┐
  │ 🎉 You're on a Legend trial — 11 days remaining         │
  │ [Upgrade Now] to keep access after your trial ends      │
  └─────────────────────────────────────────────────────────┘
  ```

---

## STEP 5.3 — Workflows List

**Data fetching:** Server component, fetch from `workflows` table ordered by `updated_at DESC`.

**Display modes:** Grid (default) | List toggle (save to user_preferences)

**Workflow Card (Grid mode):**

```
┌────────────────────────────────┐
│  [THUMBNAIL PREVIEW / ICON]    │  ← PNG thumbnail or generated placeholder
│                                │
├────────────────────────────────┤
│ Workflow Name             [●]  │  ← status dot
│ Updated 2 hours ago            │
│ 12 nodes  │  3 collaborators   │
│ [Avatar] [Avatar] [Avatar]     │
│                            [⋮] │  ← context menu
└────────────────────────────────┘
```

**Context menu (`⋮`) items:**
- Open Editor
- Duplicate → creates copy with "Copy of [name]"
- Archive → sets status = 'archived'
- Delete → confirmation dialog → delete workflow + all nodes/edges
- Share → opens share dialog

**Status dot colors:**
- Draft → gray
- Active → green
- Archived → orange
- Published → blue

**Filter bar:**
- Status: All | Draft | Active | Archived | Published
- Owner: All | Created by me | Shared with me
- Sort: Last Modified | Name A-Z | Node Count | Status

**Search:** Client-side filter on name and description. Updates results as user types.

---

## STEP 5.4 — Quick Actions

Sticky bar below the stats cards:

| Button | Action |
|---|---|
| + New Workflow | Opens create dialog |
| + New Dashboard | Creates dashboard folder |
| Import JSON | File picker → parse → create workflow |
| Open Template | Browse template gallery |
| Invite Member | Email invite dialog |

**Create Workflow Dialog fields:**
- Name (required)
- Description (optional)
- Dashboard (select from list or "None")
- Starting template (Blank, or category templates)
- Create button → creates workflow record → redirect to editor

---

## STEP 5.5 — Workspace Settings Page

Route: `/[locale]/settings/workspace`

Sections:

1. **General** — workspace name, avatar (upload to Storage)
2. **Members** — table of all members

Members table columns:
- Avatar + Name + Email
- Role (badge)
- Joined date
- Actions: Change Role (dropdown) | Remove (trash icon)

3. **Invite Member** form:
- Email input
- Role selector: Admin | Editor | Commenter | Viewer
- Send Invite button
- Pending invites list (if implementing)

4. **Danger Zone:**
- Delete Workspace button (Owner only) → full confirmation with workspace name re-entry

---

---

# PHASE 6 — WORKFLOW EDITOR CORE
**Duration: 3–4 Days**
**Goal:** Full React Flow canvas with all panels, toolbar, keyboard shortcuts, undo/redo, auto-save, and export.

---

## STEP 6.1 — Editor Page Structure

Route: `/[locale]/workflows/[workflowId]/page.tsx`

This page is a **client component** (or has a client wrapper). Full-screen layout:

```
┌──────────────────────────────────────────────────────────────┐
│  EDITOR TOOLBAR (top bar, full width)                        │
├───────────────┬──────────────────────────────┬───────────────┤
│               │                              │               │
│  LIBRARY      │   REACT FLOW CANVAS          │  PROPERTIES   │
│  SIDEBAR      │                              │  PANEL        │
│  (280px)      │   [nodes, edges, minimap]    │  (320px)      │
│  collapsible  │                              │  collapsible  │
│               │                              │               │
├───────────────┴──────────────────────────────┴───────────────┤
│  STATUS BAR: Auto-save status | Zoom % | Selected: 3 nodes   │
└──────────────────────────────────────────────────────────────┘
```

Load on mount:

1. Fetch workflow metadata from `workflows`
2. Fetch all nodes from `workflow_nodes`
3. Fetch all edges from `workflow_edges`
4. Fetch user's role for this workflow
5. Subscribe to Realtime channel
6. Load user panel preferences

---

## STEP 6.2 — React Flow Canvas Configuration

```tsx
import ReactFlow, {
  Background, BackgroundVariant,
  Controls, MiniMap,
  Panel, useNodesState, useEdgesState,
  addEdge, MarkerType
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  nodeTypes={nodeTypes}       // register all 40+ custom node components
  edgeTypes={edgeTypes}       // register custom edge types
  snapToGrid={true}
  snapGrid={[15, 15]}
  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
  minZoom={0.1}
  maxZoom={4}
  fitView={false}
  multiSelectionKeyCode="Shift"
  deleteKeyCode="Delete"
  selectionKeyCode="Shift"
>
  <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
  <Controls showInteractive={false} />
  <MiniMap nodeStrokeWidth={3} zoomable pannable />
</ReactFlow>
```

**nodeTypes object — register every node type:**

```ts
const nodeTypes = {
  // Basic
  start: StartNode,
  end: EndNode,
  process: ProcessNode,
  decision: DecisionNode,
  note: NoteNode,
  group: GroupNode,
  delay: DelayNode,
  // Logic
  if_else: IfElseNode,
  switch: SwitchNode,
  loop: LoopNode,
  parallel: ParallelNode,
  merge: MergeNode,
  retry: RetryNode,
  error_handler: ErrorHandlerNode,
  // Data
  input: InputNode,
  output: OutputNode,
  variable: VariableNode,
  transform: TransformNode,
  filter: FilterNode,
  mapper: MapperNode,
  // Integration
  api_request: APIRequestNode,
  webhook: WebhookNode,
  email: EmailNode,
  sms: SMSNode,
  database: DatabaseNode,
  file_upload: FileUploadNode,
  google_sheets: GoogleSheetsNode,
  // Human
  form_step: FormStepNode,
  approval: ApprovalNode,
  user_task: UserTaskNode,
  checklist: ChecklistNode,
  signature: SignatureNode,
  // AI
  ai_generate: AIGenerateNode,
  ai_classify: AIClassifyNode,
  ai_extract: AIExtractNode,
  ai_summarize: AISummarizeNode,
  ai_route: AIRouteNode,
  ai_validator: AIValidatorNode,
}
```

---

## STEP 6.3 — Zustand Editor Store

`src/stores/editorStore.ts`:

```ts
import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'

interface EditorState {
  // Flow state
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null

  // Panel state
  panels: {
    library: boolean
    properties: boolean
    layers: boolean
    comments: boolean
    history: boolean
    aiAssistant: boolean
  }

  // Save state
  isSaving: boolean
  lastSavedAt: Date | null
  hasUnsavedChanges: boolean

  // Undo/Redo
  undoStack: { nodes: Node[], edges: Edge[] }[]
  redoStack: { nodes: Node[], edges: Edge[] }[]

  // Actions
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  addNode: (node: Node) => void
  updateNode: (id: string, data: Partial<Node>) => void
  deleteNode: (id: string) => void
  addEdge: (edge: Edge) => void
  deleteEdge: (id: string) => void
  setSelectedNode: (id: string | null) => void
  togglePanel: (panel: keyof EditorState['panels']) => void
  pushToUndo: () => void
  undo: () => void
  redo: () => void
  setSaving: (saving: boolean) => void
  setLastSaved: (date: Date) => void
}
```

**Key implementation rules:**

- `pushToUndo()` must be called **before** every mutating action (addNode, updateNode, deleteNode, etc.)
- Max undo stack depth: **50 snapshots**
- When `addNode` is called from realtime sync: do NOT push to undo stack

---

## STEP 6.4 — Undo / Redo System

```ts
pushToUndo: () => {
  const snapshot = { nodes: get().nodes, edges: get().edges }
  const undoStack = [snapshot, ...get().undoStack].slice(0, 50)
  set({ undoStack, redoStack: [] })
},

undo: () => {
  const { undoStack, redoStack, nodes, edges } = get()
  if (!undoStack.length) return
  const [prev, ...rest] = undoStack
  const currentSnapshot = { nodes, edges }
  set({
    nodes: prev.nodes,
    edges: prev.edges,
    undoStack: rest,
    redoStack: [currentSnapshot, ...redoStack],
    hasUnsavedChanges: true,
  })
},

redo: () => {
  const { redoStack, undoStack, nodes, edges } = get()
  if (!redoStack.length) return
  const [next, ...rest] = redoStack
  const currentSnapshot = { nodes, edges }
  set({
    nodes: next.nodes,
    edges: next.edges,
    redoStack: rest,
    undoStack: [currentSnapshot, ...undoStack],
    hasUnsavedChanges: true,
  })
},
```

---

## STEP 6.5 — Auto-Save Implementation

```ts
// In Canvas component, watch nodes/edges with debounce
import { useDebouncedCallback } from 'use-debounce'

const debouncedSave = useDebouncedCallback(async () => {
  store.setSaving(true)

  // 1. Upsert all nodes
  await supabase.from('workflow_nodes').upsert(
    nodes.map(n => ({
      id: n.id,
      workflow_id: workflowId,
      type: n.type,
      position: n.position,
      data: n.data,
      style: n.style,
    })),
    { onConflict: 'id' }
  )

  // 2. Delete removed nodes (compare with DB)
  // Track deleted node IDs in store and send delete operations

  // 3. Upsert all edges
  await supabase.from('workflow_edges').upsert(
    edges.map(e => ({
      id: e.id,
      workflow_id: workflowId,
      source_node_id: e.source,
      target_node_id: e.target,
      source_handle: e.sourceHandle,
      target_handle: e.targetHandle,
      data: e.data,
    })),
    { onConflict: 'id' }
  )

  // 4. Update workflow updated_at
  await supabase.from('workflows')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', workflowId)

  store.setSaving(false)
  store.setLastSaved(new Date())
}, 1500) // 1.5 second debounce

useEffect(() => {
  if (hasUnsavedChanges) debouncedSave()
}, [nodes, edges])
```

**Version snapshot** — runs every 5 minutes of active editing:

```ts
// Triggered by interval in editor component
async function createVersionSnapshot(label?: string) {
  await supabase.from('workflow_versions').insert({
    workflow_id: workflowId,
    snapshot: { nodes, edges },
    label: label ?? `Auto-save ${new Date().toLocaleTimeString()}`,
    created_by: userId,
  })
  // Enforce plan limit: delete oldest version if over limit
  // Free=3, Warrior=10, Elite=30, Champion=100, Legend=unlimited
}
```

---

## STEP 6.6 — Keyboard Shortcuts

Register in the editor using a `useEffect` with `document.addEventListener`:

| Key Combination | Action |
|---|---|
| `Delete` / `Backspace` | Delete selected node or edge |
| `Ctrl+A` | Select all nodes |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` or `Ctrl+Y` | Redo |
| `Ctrl+S` | Manual save (immediate) |
| `Ctrl+C` | Copy selected nodes |
| `Ctrl+V` | Paste nodes (with offset) |
| `Ctrl+D` | Duplicate selected node |
| `Escape` | Deselect all + close panels |
| `Ctrl+Shift+F` | Fit view |
| `Ctrl+B` | Toggle Library sidebar |
| `Ctrl+P` | Toggle Properties panel |
| `Ctrl+M` | Toggle Minimap |
| `?` | Show keyboard shortcut reference dialog |

---

## STEP 6.7 — Export Functions

**Export PNG:**

```ts
import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { toPng } from 'html-to-image'

async function exportPng() {
  const nodesBounds = getNodesBounds(nodes)
  const viewport = getViewportForBounds(nodesBounds, 1200, 800, 0.5, 2)
  const canvas = document.querySelector('.react-flow__viewport') as HTMLElement
  const dataUrl = await toPng(canvas, { width: 1200, height: 800 })
  const link = document.createElement('a')
  link.download = `${workflowName}.png`
  link.href = dataUrl
  link.click()
}
```

**Export JSON:**

```ts
function exportJson() {
  const data = {
    id: workflowId,
    name: workflowName,
    version: '1.0',
    exportedAt: new Date().toISOString(),
    nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
    edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, data: e.data })),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `${workflowName}.json`
  link.href = url
  link.click()
}
```

**Export PDF:** requires Elite+ plan. Use jsPDF to embed the PNG export.

**Export SVG:** requires Elite+ plan.

---

## STEP 6.8 — Auto-Layout with Dagre

```ts
import dagre from 'dagre'

function applyAutoLayout(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' | 'BT' = 'TB'
): { nodes: Node[], edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 })
  g.setDefaultEdgeLabel(() => ({}))

  nodes.forEach(node => {
    g.setNode(node.id, { width: 200, height: 60 })
  })

  edges.forEach(edge => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map(node => {
    const { x, y } = g.node(node.id)
    return { ...node, position: { x: x - 100, y: y - 30 } }
  })

  return { nodes: layoutedNodes, edges }
}
```

Before applying: push undo snapshot. Then call `setNodes` and `setEdges` with layouted results.

---

---

# PHASE 7 — NODE LIBRARY (40+ NODES)
**Duration: 3–4 Days**
**Goal:** All 6 node categories, 40+ node types, custom React Flow components, properties panel schema.

---

## STEP 7.1 — Node Type Catalog

### Category: Basic (8 nodes)

| Node Type | Icon | Color | Handles |
|---|---|---|---|
| start | Play | #22C55E | 1 output |
| end | Square | #EF4444 | 1 input |
| process | Rectangle | #6B7280 | 1 input, 1 output |
| decision | Diamond | #D97706 | 1 input, 2+ outputs |
| note | StickyNote | #FBBF24 | no handles (annotation) |
| group | BoxSelect | #94A3B8 | no handles (container) |
| connector | ArrowRight | #6B7280 | 1 input, 1 output |
| delay | Clock | #8B5CF6 | 1 input, 1 output |

### Category: Logic (7 nodes)

| Node Type | Icon | Color | Handles |
|---|---|---|---|
| if_else | GitBranch | #D97706 | 1 input, True output, False output |
| switch | Shuffle | #D97706 | 1 input, N outputs |
| loop | RefreshCw | #D97706 | 1 input, loop output, exit output |
| parallel | GitMerge | #D97706 | 1 input, N parallel outputs |
| merge | Merge | #D97706 | N inputs, 1 output |
| retry | RotateCcw | #D97706 | 1 input, 1 success, 1 fail |
| error_handler | AlertTriangle | #EF4444 | 1 input, handled output, unhandled output |

### Category: Data (7 nodes)

| Node Type | Icon | Color | Handles |
|---|---|---|---|
| input | LogIn | #2563EB | 0 inputs, 1 output |
| output | LogOut | #2563EB | 1 input, 0 outputs |
| variable | Variable | #2563EB | 1 input, 1 output |
| transform | Wand2 | #2563EB | 1 input, 1 output |
| filter | Filter | #2563EB | 1 input, match/no-match outputs |
| mapper | Map | #2563EB | 1 input, 1 output |
| table_lookup | Table | #2563EB | 1 input, found/not-found outputs |

### Category: Integration (9 nodes)

| Node Type | Icon | Color | Description |
|---|---|---|---|
| api_request | Globe | #16A34A | HTTP request to external API |
| webhook | Zap | #16A34A | Receive or send webhook |
| email | Mail | #16A34A | Send email |
| sms | MessageSquare | #16A34A | Send SMS |
| database | Database | #16A34A | SQL/NoSQL query |
| file_upload | Upload | #16A34A | Handle file operations |
| google_sheets | FileSpreadsheet | #16A34A | Read/write Google Sheets |
| slack | MessageCircle | #16A34A | Send Slack/Discord message |
| crm | Users | #16A34A | CRM action (HubSpot, Salesforce) |

### Category: Human (6 nodes)

| Node Type | Icon | Color | Description |
|---|---|---|---|
| form_step | ClipboardList | #EA580C | Collect user input via form |
| approval | CheckSquare | #EA580C | Wait for human approval |
| user_task | UserCheck | #EA580C | Assign task to user |
| checklist | ListChecks | #EA580C | Multi-item checklist |
| attachment | Paperclip | #EA580C | Attach files to workflow |
| signature | PenLine | #EA580C | Electronic signature |

### Category: AI (7 nodes)

| Node Type | Icon | Color | Description |
|---|---|---|---|
| ai_generate | Sparkles | #7C3AED | Generate text with AI |
| ai_classify | Tags | #7C3AED | Classify input into categories |
| ai_extract | Scissors | #7C3AED | Extract structured data |
| ai_summarize | FileText | #7C3AED | Summarize long content |
| ai_route | GitBranch | #7C3AED | AI-powered routing decision |
| ai_validator | ShieldCheck | #7C3AED | Validate data with AI |
| ai_assistant | Bot | #7C3AED | General AI workflow assistant |

---

## STEP 7.2 — Base Node Component

`src/components/nodes/BaseNode.tsx`:

```tsx
import { Handle, Position, NodeProps } from '@xyflow/react'

interface BaseNodeProps extends NodeProps {
  category: 'basic' | 'logic' | 'data' | 'integration' | 'human' | 'ai'
  color: string
  icon: React.ReactNode
  inputs?: { id: string, label?: string }[]
  outputs?: { id: string, label?: string }[]
}

export function BaseNode({ data, selected, category, color, icon, inputs = [{ id: 'in' }], outputs = [{ id: 'out' }] }: BaseNodeProps) {
  return (
    <div className={`
      relative min-w-[180px] rounded-lg border-2 bg-white dark:bg-slate-800
      shadow-sm transition-shadow
      ${selected ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-slate-200 dark:border-slate-600'}
    `}>
      {/* Color band at top */}
      <div className="h-1 rounded-t-lg" style={{ backgroundColor: color }} />

      {/* Input handles */}
      {inputs.map((handle, i) => (
        <Handle
          key={handle.id}
          type="target"
          position={Position.Top}
          id={handle.id}
          style={{ left: inputs.length === 1 ? '50%' : `${(i + 1) * 100 / (inputs.length + 1)}%` }}
        />
      ))}

      {/* Node content */}
      <div className="flex items-center gap-2 p-3">
        <span style={{ color }} className="flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
            {data.label as string}
          </p>
          {data.description && (
            <p className="text-xs text-slate-500 truncate">{data.description as string}</p>
          )}
        </div>
      </div>

      {/* Output handles */}
      {outputs.map((handle, i) => (
        <Handle
          key={handle.id}
          type="source"
          position={Position.Bottom}
          id={handle.id}
          style={{ left: outputs.length === 1 ? '50%' : `${(i + 1) * 100 / (outputs.length + 1)}%` }}
        />
      ))}
    </div>
  )
}
```

---

## STEP 7.3 — Properties Panel Schema System

Create a schema definition for each node type in `src/lib/nodeSchemas.ts`:

```ts
export type FieldType =
  | 'text' | 'textarea' | 'number' | 'select' | 'multi-select'
  | 'boolean' | 'code' | 'key-value' | 'json' | 'url'

export interface FieldSchema {
  key: string
  label: string
  type: FieldType
  required?: boolean
  default?: unknown
  options?: { label: string, value: string }[]
  placeholder?: string
  helpText?: string
  validation?: (value: unknown) => string | null
  showWhen?: (data: Record<string, unknown>) => boolean  // conditional display
}

export interface NodeSchema {
  type: string
  category: string
  label: string
  description: string
  fields: FieldSchema[]
}

// Example: API Request schema
export const apiRequestSchema: NodeSchema = {
  type: 'api_request',
  category: 'integration',
  label: 'API Request',
  description: 'Make an HTTP request to an external service',
  fields: [
    { key: 'label', label: 'Node Name', type: 'text', required: true },
    { key: 'method', label: 'Method', type: 'select', required: true,
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
        { label: 'PATCH', value: 'PATCH' },
      ],
      default: 'GET'
    },
    { key: 'url', label: 'URL', type: 'url', required: true, placeholder: 'https://api.example.com/endpoint' },
    { key: 'headers', label: 'Headers', type: 'key-value' },
    { key: 'body', label: 'Request Body', type: 'json',
      showWhen: (data) => ['POST', 'PUT', 'PATCH'].includes(data.method as string)
    },
    { key: 'auth_type', label: 'Authentication', type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Bearer Token', value: 'bearer' },
        { label: 'Basic Auth', value: 'basic' },
        { label: 'API Key', value: 'api_key' },
      ],
      default: 'none'
    },
    { key: 'timeout', label: 'Timeout (seconds)', type: 'number', default: 30 },
    { key: 'retry_count', label: 'Retry Count', type: 'number', default: 0 },
    { key: 'success_label', label: 'Success Branch Label', type: 'text', default: 'Success' },
    { key: 'error_label', label: 'Error Branch Label', type: 'text', default: 'Error' },
  ]
}

// Define similar schemas for ALL 40+ node types
export const NODE_SCHEMAS: Record<string, NodeSchema> = {
  api_request: apiRequestSchema,
  // ... all others
}
```

**Properties Panel** renders the active node's schema dynamically using React Hook Form. On every field change, immediately call `updateNode(selectedNodeId, { data: newData })` in the store.

---

## STEP 7.4 — Library Sidebar Component

Structure:

```
┌─────────────────────────────┐
│ 🔍 Search nodes...          │
├─────────────────────────────┤
│ ★ FAVORITES (if any)        │
│   ▸ Process                 │
│   ▸ API Request             │
├─────────────────────────────┤
│ MY ELEMENTS (custom)        │
│   ▸ My API Template         │
├─────────────────────────────┤
│ ▾ BASIC                     │
│   ▸ Start        ★          │
│   ▸ End          ★          │
│   ▸ Process      ★          │
│   ▸ Decision     ★          │
├─────────────────────────────┤
│ ▾ LOGIC                     │
│   ▸ If / Else    ★          │
│   ...                       │
└─────────────────────────────┘
```

- Drag a node onto canvas: `onDragStart` sets `dataTransfer.setData('nodeType', type)`
- Canvas `onDrop`: read type → create node at drop coordinates
- Click a node: create at center of visible viewport
- `★` icon: toggle favorite. Check plan limit first.
- Search: filter all node types by name. Show matching nodes across all categories.
- "Create Custom Element" button at the very bottom

---

---

# PHASE 8 — FAVORITES & CUSTOM ELEMENTS
**Duration: 2–3 Days**

---

## STEP 8.1 — Plan Limits for Favorites & Custom Elements

```ts
// src/lib/planLimits.ts

export const PLAN_LIMITS = {
  free:     { max_favorites: 5,   max_custom_elements: 2,   can_share_elements: false },
  warrior:  { max_favorites: 20,  max_custom_elements: 10,  can_share_elements: false },
  elite:    { max_favorites: 50,  max_custom_elements: 50,  can_share_elements: true },
  champion: { max_favorites: 150, max_custom_elements: 200, can_share_elements: true },
  legend:   { max_favorites: 9999, max_custom_elements: 9999, can_share_elements: true },
} as const
```

Before adding a favorite or custom element: fetch current count and compare against plan limit. If at limit, show upgrade modal instead of completing the action.

---

## STEP 8.2 — Favorites Implementation

```ts
// Add favorite
async function addFavorite(nodeType?: string, customTemplateId?: string) {
  // 1. Check current count vs plan limit
  const count = await getFavoriteCount(userId)
  const limit = PLAN_LIMITS[currentPlan].max_favorites
  if (count >= limit) {
    showUpgradeModal('favorites')
    return
  }

  // 2. Insert into user_favorite_nodes
  await supabase.from('user_favorite_nodes').insert({
    user_id: userId,
    node_type: nodeType ?? null,
    custom_node_template_id: customTemplateId ?? null,
    sort_order: count, // append to end
  })
}

// Remove favorite
async function removeFavorite(favoriteId: string) {
  await supabase.from('user_favorite_nodes').delete().eq('id', favoriteId)
}

// Reorder favorites (drag-to-reorder)
async function reorderFavorites(orderedIds: string[]) {
  const updates = orderedIds.map((id, index) => ({
    id,
    sort_order: index,
    user_id: userId,
  }))
  await supabase.from('user_favorite_nodes').upsert(updates)
}
```

---

## STEP 8.3 — Custom Element Designer

Multi-step modal with live preview:

**Step 1: Basic Info**
- Name (text, required, max 50 chars)
- Description (textarea, optional)
- Tags (tag input, comma-separated)

**Step 2: Appearance**
- Icon picker: searchable grid of all lucide-react icons (show 100+ common icons)
- Color picker: 16 preset colors + custom hex input
- Preview updates live on right panel

**Step 3: Base Type**
- "What kind of node is this based on?"
- Select from dropdown of all 40+ system node types
- Inherits that type's handle configuration and default properties

**Step 4: Default Properties**
- Show the base type's property fields
- User can set default values (these will be pre-filled when node is dropped on canvas)
- Leave blank = user must fill when dropped

**Step 5: Handles**
- Input handles: number (0–5) + optional labels for each
- Output handles: number (0–5) + optional labels for each
- Preview shows handle positions on node

**Step 6: Visibility**
- Private (only I can use this)
- Workspace (Elite+ — all workspace members can use this)

**Save:** Insert into `custom_node_templates`. Node immediately appears in library.

---

## STEP 8.4 — "Save as Custom Element" from Existing Node

Right-click menu on any canvas node:

```ts
async function saveNodeAsCustomElement(node: Node) {
  // Pre-fill designer with node's current state
  openCustomElementDesigner({
    base_type: node.type,
    default_data: node.data,
    default_style: node.style,
    // User fills: name, description, icon, color
  })
}
```

---

---

# PHASE 9 — REAL-TIME COLLABORATION
**Duration: 3–4 Days**

---

## STEP 9.1 — Supabase Realtime Channel Setup

```ts
// src/hooks/useRealtime.ts

export function useRealtime(workflowId: string, userId: string, userInfo: UserInfo) {
  const channel = supabase.channel(`workflow:${workflowId}`)

  useEffect(() => {
    // Subscribe
    channel
      .on('presence', { event: 'sync' }, handlePresenceSync)
      .on('presence', { event: 'join' }, handlePresenceJoin)
      .on('presence', { event: 'leave' }, handlePresenceLeave)
      .on('broadcast', { event: 'cursor' }, handleCursorUpdate)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'workflow_nodes', filter: `workflow_id=eq.${workflowId}` },
        handleNodeChange
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'workflow_edges', filter: `workflow_id=eq.${workflowId}` },
        handleEdgeChange
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'workflow_comments', filter: `workflow_id=eq.${workflowId}` },
        handleNewComment
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track user presence
          await channel.track({
            userId,
            fullName: userInfo.fullName,
            avatarUrl: userInfo.avatarUrl,
            color: getCollaboratorColor(userId),
            role: userInfo.role,
          })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [workflowId])
}
```

---

## STEP 9.2 — Collaborator Color Assignment

```ts
const COLLABORATOR_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#06B6D4', // cyan
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
]

function getCollaboratorColor(userId: string): string {
  // Deterministic color from userId hash
  let hash = 0
  for (const char of userId) hash = char.charCodeAt(0) + ((hash << 5) - hash)
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length]
}
```

---

## STEP 9.3 — Cursor Broadcasting

```ts
// Broadcast cursor position (throttled to 30fps)
import { throttle } from 'lodash'

const broadcastCursor = throttle((x: number, y: number) => {
  channel.send({
    type: 'broadcast',
    event: 'cursor',
    payload: { userId, x, y, color: myColor, name: myName },
  })
}, 33) // ~30fps

// In Canvas component
<div onMouseMove={(e) => {
  const rect = canvasRef.current!.getBoundingClientRect()
  broadcastCursor(e.clientX - rect.left, e.clientY - rect.top)
}}>
```

Render other cursors as overlay SVG elements above the canvas.

---

## STEP 9.4 — Realtime Node/Edge Sync Handlers

```ts
function handleNodeChange(payload: RealtimePostgresChangesPayload<Node>) {
  const { eventType, new: newNode, old: oldNode } = payload

  // Skip changes made by current user (already applied optimistically)
  if (newNode?.created_by === currentUserId) return

  switch (eventType) {
    case 'INSERT':
      store.addNode(mapDbNodeToFlowNode(newNode), { skipUndo: true })
      break
    case 'UPDATE':
      store.updateNode(newNode.id, mapDbNodeToFlowNode(newNode), { skipUndo: true })
      break
    case 'DELETE':
      store.deleteNode(oldNode.id, { skipUndo: true })
      break
  }
}

// Same pattern for edges
function handleEdgeChange(payload) { /* ... */ }
```

---

## STEP 9.5 — Comments System

**Comment bubble on canvas:**
- Rendered as an overlay `<div>` positioned at node's canvas coordinates
- Shows count badge if multiple unresolved comments on same node
- Color = commenter's assigned color

**Comment thread component:**
- Popover or slide-in panel
- Shows thread: original comment + replies
- Reply input at bottom (Commenter+ role only)
- Resolve button (Editor+ role)
- @mention support: type `@` → show user autocomplete from workspace members

**Realtime new comments:**
- On `INSERT` in `workflow_comments` → show toast notification + update comment bubble

---

## STEP 9.6 — Permission Enforcement

```ts
// src/hooks/useEditorPermissions.ts

export function useEditorPermissions(userRole: string) {
  return {
    canEdit: ['owner', 'admin', 'editor'].includes(userRole),
    canComment: ['owner', 'admin', 'editor', 'commenter'].includes(userRole),
    canShare: ['owner', 'admin'].includes(userRole),
    canDelete: userRole === 'owner',
    canRestoreVersion: ['owner', 'admin', 'editor'].includes(userRole),
  }
}
```

In the canvas: if `!canEdit`, set React Flow props:

```tsx
<ReactFlow
  nodesDraggable={canEdit}
  nodesConnectable={canEdit}
  elementsSelectable={true}  // always allow selection for viewing
  edgesUpdatable={canEdit}
/>
```

---

---

# PHASE 10 — BILLING & SUBSCRIPTION PLANS
**Duration: 2–3 Days**

---

## STEP 10.1 — Plan Feature Matrix (Complete Reference)

| Limit | Free | Warrior | Elite | Champion | Legend |
|---|---|---|---|---|---|
| max_workflows | 3 | 20 | 75 | 250 | 9999 |
| max_nodes_per_workflow | 50 | 250 | 1,000 | 5,000 | 99999 |
| max_dashboards | 1 | 5 | 20 | 100 | 9999 |
| max_collaborators | 0 | 3 | 10 | 30 | 9999 |
| max_custom_elements | 2 | 10 | 50 | 200 | 9999 |
| max_favorites | 5 | 20 | 50 | 150 | 9999 |
| max_version_history | 3 | 10 | 30 | 100 | 9999 |
| ai_credits_monthly | 10 | 50 | 200 | 500 | 2000 |
| can_realtime_collab | false | false | true | true | true |
| can_share_links | false | true | true | true | true |
| can_export_svg_pdf | false | false | true | true | true |
| can_workspace_elements | false | false | true | true | true |
| priority_support | false | false | false | true | true |

---

## STEP 10.2 — Stripe Setup

1. Create 4 products in Stripe Dashboard: Warrior, Elite, Champion, Legend
2. For each product, create:
   - Monthly price (e.g. Warrior: $12/mo)
   - Annual price (e.g. Warrior: $99/yr = 30% off)
3. Store all Price IDs as environment variables:

```env
STRIPE_WARRIOR_MONTHLY_PRICE_ID=price_xxx
STRIPE_WARRIOR_ANNUAL_PRICE_ID=price_xxx
STRIPE_ELITE_MONTHLY_PRICE_ID=price_xxx
# ... etc
```

---

## STEP 10.3 — Trial Logic (14-Day Legend)

**On signup:** Database trigger creates subscription with `plan='legend'`, `status='trialing'`, `trial_ends_at = now() + 14 days`. No credit card required.

**Cron job** (Supabase Edge Function, scheduled daily at midnight UTC):

```ts
// supabase/functions/check-trial-expiry/index.ts

const { data: expiredTrials } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('status', 'trialing')
  .lt('trial_ends_at', new Date().toISOString())

for (const sub of expiredTrials) {
  // Downgrade to free
  await supabase.from('subscriptions')
    .update({ plan: 'free', status: 'active', trial_ends_at: null })
    .eq('id', sub.id)

  // Update workspace plan
  await supabase.from('workspaces')
    .update({ plan: 'free' })
    .eq('id', sub.workspace_id)

  // Send "Trial ended" email
  await sendTrialEndedEmail(sub.workspace_id)
}
```

**Trial warning emails:**
- At 7 days remaining: "1 week left in your trial"
- At 3 days remaining: "3 days left — upgrade now"
- At 1 day remaining: "Your trial ends tomorrow"

---

## STEP 10.4 — Stripe Checkout

Server action to create checkout session:

```ts
export async function createCheckoutSession(
  workspaceId: string,
  priceId: string,
  interval: 'month' | 'year'
) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  // Get or create Stripe customer
  let customerId = await getStripeCustomerId(workspaceId)
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { workspace_id: workspaceId } })
    customerId = customer.id
    await supabase.from('workspaces').update({ stripe_customer_id: customerId }).eq('id', workspaceId)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
    metadata: { workspace_id: workspaceId },
  })

  return { url: session.url }
}
```

---

## STEP 10.5 — Stripe Webhook Handler

`src/app/api/stripe/webhook/route.ts`:

```ts
export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      const workspaceId = session.metadata?.workspace_id
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      const priceId = subscription.items.data[0].price.id
      const plan = getPlanFromPriceId(priceId)

      await supabase.from('subscriptions').upsert({
        workspace_id: workspaceId,
        plan,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        status: 'active',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      await supabase.from('workspaces').update({ plan }).eq('id', workspaceId)
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const workspaceId = await getWorkspaceIdFromCustomer(sub.customer as string)
      const plan = getPlanFromPriceId(sub.items.data[0].price.id)
      await supabase.from('subscriptions').update({
        plan, status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }).eq('stripe_subscription_id', sub.id)
      await supabase.from('workspaces').update({ plan }).eq('id', workspaceId)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const workspaceId = await getWorkspaceIdFromCustomer(sub.customer as string)
      await supabase.from('subscriptions').update({ plan: 'free', status: 'active' })
        .eq('stripe_subscription_id', sub.id)
      await supabase.from('workspaces').update({ plan: 'free' }).eq('id', workspaceId)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await supabase.from('subscriptions').update({ status: 'past_due' })
        .eq('stripe_subscription_id', invoice.subscription as string)
      // Send payment failed email
      break
    }

    case 'invoice.paid': {
      // Reset AI credits for the month
      const invoice = event.data.object as Stripe.Invoice
      const workspaceId = await getWorkspaceIdFromCustomer(invoice.customer as string)
      await supabase.from('subscriptions').update({ status: 'active' })
        .eq('stripe_subscription_id', invoice.subscription as string)
      // Reset ai_requests count tracking or use a separate monthly counter
      break
    }
  }

  return new Response(null, { status: 200 })
}
```

---

## STEP 10.6 — Plan Limit Enforcement

`src/lib/planLimits.ts`:

```ts
export async function checkPlanLimit(
  workspaceId: string,
  resource: 'workflows' | 'nodes' | 'dashboards' | 'collaborators' | 'custom_elements' | 'favorites' | 'version_history' | 'ai_credits'
): Promise<{ allowed: boolean, current: number, limit: number, plan: string }> {

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('workspace_id', workspaceId)
    .single()

  const plan = sub?.plan ?? 'free'
  const limits = PLAN_LIMITS[plan]

  // Count current usage based on resource type
  let current = 0
  switch (resource) {
    case 'workflows':
      const { count } = await supabase.from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .neq('status', 'archived')
      current = count ?? 0
      break
    // ... handle all resource types
  }

  const limitKey = `max_${resource}` as keyof typeof limits
  const limit = limits[limitKey] as number

  return { allowed: current < limit, current, limit, plan }
}
```

**Use before every resource creation:**

```ts
// In workflow create server action:
const check = await checkPlanLimit(workspaceId, 'workflows')
if (!check.allowed) {
  return {
    error: 'LIMIT_REACHED',
    message: `You've reached the ${check.plan} plan limit (${check.limit} workflows). Upgrade to create more.`,
    current: check.current,
    limit: check.limit,
  }
}
```

---

---

# PHASE 11 — AI ASSISTANT
**Duration: 2–3 Days**

---

## STEP 11.1 — AI Credit Cost Reference

| Action | Credits | Notes |
|---|---|---|
| Generate workflow from description | 10 | Creates full node/edge graph |
| Analyze workflow (error detection) | 5 | Checks all nodes and edges |
| Suggest improvements | 5 | Returns 3–5 actionable suggestions |
| Generate node description | 1 | Per single node |
| Summarize workflow | 3 | Plain English summary |
| Auto-layout suggestion | 2 | Recommends optimal direction |
| AI chat message | 2 | Per message sent |

---

## STEP 11.2 — AI API Route

`src/app/api/ai/generate/route.ts`:

```ts
export async function POST(request: Request) {
  const { prompt, workflowId, workspaceId } = await request.json()

  // 1. Auth check
  const session = await getServerSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  // 2. Credits check
  const creditsUsed = await getAICreditsUsed(workspaceId)
  const creditsLimit = await getAICreditsLimit(workspaceId)
  const actionCost = 10 // generate costs 10 credits

  if (creditsUsed + actionCost > creditsLimit) {
    return Response.json({ error: 'NO_CREDITS', message: 'Insufficient AI credits' }, { status: 403 })
  }

  // 3. Build prompt for OpenAI
  const systemPrompt = `
    You are a workflow design assistant. The user will describe a business process
    and you will create a visual workflow using these available node types:
    ${JSON.stringify(Object.keys(NODE_SCHEMAS))}

    Respond ONLY with a valid JSON object in this exact format:
    {
      "nodes": [
        {
          "id": "node_1",
          "type": "start",
          "position": {"x": 250, "y": 50},
          "data": {"label": "Start", "description": ""}
        }
      ],
      "edges": [
        {
          "id": "edge_1",
          "source": "node_1",
          "target": "node_2",
          "sourceHandle": "out",
          "targetHandle": "in"
        }
      ]
    }

    Rules:
    - Always start with a "start" node and end with at least one "end" node
    - Space nodes at least 150px apart vertically
    - Use appropriate node types from the catalog
    - Give meaningful labels to each node
    - Connect all nodes logically
  `

  // 4. Call OpenAI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4000,
  })

  const result = JSON.parse(completion.choices[0].message.content!)

  // 5. Log usage
  await supabase.from('ai_requests').insert({
    workspace_id: workspaceId,
    user_id: session.user.id,
    workflow_id: workflowId,
    action: 'generate',
    prompt_tokens: completion.usage?.prompt_tokens ?? 0,
    completion_tokens: completion.usage?.completion_tokens ?? 0,
    credits_used: actionCost,
    status: 'success',
  })

  return Response.json(result)
}
```

---

## STEP 11.3 — AI Workflow Analysis

`src/app/api/ai/analyze/route.ts` — same auth/credits pattern, different system prompt:

```
System prompt:
You are a workflow quality analyst. Analyze this workflow and identify problems.
Look for:
1. Dead-end nodes: nodes with no outgoing edges (except End nodes)
2. Disconnected nodes: nodes not reachable from Start
3. Missing fallback: Decision/Switch nodes without a default/fallback branch
4. Infinite loops: Loop nodes with no exit condition visible
5. Isolated subgraphs: groups of nodes not connected to main flow

Respond ONLY with a JSON array:
[
  {
    "severity": "error" | "warning" | "info",
    "node_id": "node_x" | null,
    "title": "Short issue title",
    "description": "Explanation of the issue and how to fix it"
  }
]
```

---

## STEP 11.4 — AI Chat Panel UI

```
┌─────────────────────────────────────┐
│ 🤖 AI Assistant    💳 47/50 credits │
├─────────────────────────────────────┤
│                                     │
│  [Chat message history]             │
│                                     │
│  You: Generate an approval flow     │
│  AI: I've created a 6-node...  ✓    │
│      [Apply to Canvas]              │
│                                     │
├─────────────────────────────────────┤
│ Quick actions:                      │
│ [Analyze] [Suggest] [Summarize]     │
├─────────────────────────────────────┤
│ Ask anything about your workflow... │
│                               [↑]   │
└─────────────────────────────────────┘
```

- "Apply to Canvas" button: clears current canvas (with confirmation) and applies generated nodes/edges
- "Insert into Canvas" alternative: adds generated nodes alongside existing ones
- Chat history persists in component state (not saved to DB in v1)

---

---

# PHASE 12 — SHARING & PERMISSIONS
**Duration: 2 Days**

---

## STEP 12.1 — Share Dialog

Triggered by "Share" button in editor toolbar. Opens as a modal:

```
Share "My Workflow"
─────────────────────────────────────────
Invite people:
[email input                ] [Editor ▾] [Send]

Current collaborators:
● Ahmed Sayed   ahmed@co.com    [Editor ▾]   [✕]
● Sara Ali      sara@co.com     [Viewer ▾]   [✕]

─────────────────────────────────────────
Share link (Warrior+ only):
[https://app.com/share/abc123       ] [Copy]

Link role: [Viewer ▾]    Expires: [Never ▾]
[Revoke Link]
```

---

## STEP 12.2 — Invite by Email Server Action

```ts
export async function inviteToWorkflow(
  workflowId: string,
  email: string,
  role: 'editor' | 'commenter' | 'viewer'
) {
  // 1. Check if user exists in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (profile) {
    // Existing user: create share record directly
    await supabase.from('workflow_shares').upsert({
      workflow_id: workflowId,
      user_id: profile.id,
      role,
      created_by: currentUserId,
    })
  } else {
    // New user: send invite email with sign-up link
    const inviteToken = crypto.randomUUID()
    // Store pending invite (add pending_invites table if needed)
    await sendInviteEmail(email, workflowId, inviteToken, role)
  }

  // Log to activity
  await logActivity(workflowId, 'member_invited', { email, role })
}
```

---

## STEP 12.3 — Public Share Link

```ts
export async function createShareLink(
  workflowId: string,
  role: 'commenter' | 'viewer',
  expiresAt?: Date
) {
  // Plan check: Warrior+ only
  const planCheck = await checkPlanLimit(workspaceId, 'share_links')
  if (!planCheck.allowed) {
    return { error: 'PLAN_REQUIRED', requiredPlan: 'warrior' }
  }

  const token = crypto.randomUUID()
  await supabase.from('workflow_shares').insert({
    workflow_id: workflowId,
    user_id: null,  // null = public link
    role,
    share_token: token,
    expires_at: expiresAt?.toISOString(),
    created_by: currentUserId,
  })

  return { url: `${process.env.NEXT_PUBLIC_APP_URL}/share/${token}` }
}
```

---

## STEP 12.4 — Public View Route

`src/app/[locale]/share/[shareId]/page.tsx`:

```ts
export default async function SharedWorkflowPage({ params: { shareId } }) {
  // 1. Look up share record
  const { data: share } = await supabase
    .from('workflow_shares')
    .select('*, workflows(*)')
    .eq('share_token', shareId)
    .single()

  // 2. Validate
  if (!share) return notFound()
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return <ExpiredLinkPage />
  }

  // 3. If Commenter link: require auth
  if (share.role === 'commenter') {
    const session = await getServerSession()
    if (!session) return redirect(`/auth/sign-in?redirect=/share/${shareId}`)
  }

  // 4. Render read-only canvas
  return <SharedWorkflowViewer workflow={share.workflows} role={share.role} />
}
```

The shared viewer:
- Full-screen canvas, read-only
- No Library sidebar
- No Properties panel
- No Toolbar edit actions
- Show: workflow name, creator name, last updated
- "Sign up to edit" CTA at bottom
- Comments visible; add comment button if role = commenter

---

## STEP 12.5 — Permission Table

| Action | Owner | Admin | Editor | Commenter | Viewer |
|---|---|---|---|---|---|
| View workflow | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create/move/delete nodes | ✓ | ✓ | ✓ | ✗ | ✗ |
| Create/delete edges | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit node properties | ✓ | ✓ | ✓ | ✗ | ✗ |
| Post comments | ✓ | ✓ | ✓ | ✓ | ✗ |
| Resolve comments | ✓ | ✓ | ✓ | ✗ | ✗ |
| Export workflow | ✓ | ✓ | ✓ | ✗ | ✗ |
| Share workflow | ✓ | ✓ | ✗ | ✗ | ✗ |
| Change member roles | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete workflow | ✓ | ✗ | ✗ | ✗ | ✗ |
| Restore version | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage share links | ✓ | ✓ | ✗ | ✗ | ✗ |

---

---

# PHASE 13 — MOBILE & TABLET UX
**Duration: 2 Days**

---

## STEP 13.1 — Responsive Breakpoints

| Breakpoint | Screen Width | Experience |
|---|---|---|
| Mobile | < 768px | View + Comments ONLY |
| Tablet | 768px – 1024px | Limited editing, drawers |
| Desktop | > 1024px | Full editor |

---

## STEP 13.2 — Mobile Experience (< 768px)

**Dashboard on mobile:**
- Full workflow list in single-column card layout
- Search bar at top
- Quick action: "+ New Workflow" button
- No complex filter bar (keep it simple)
- Stats bar collapsed to a single "Plan Usage" link

**Editor on mobile:**

```
┌────────────────────────────────────┐
│ Workflow Name     [⋮]  [👤][👤]   │ ← top bar
├────────────────────────────────────┤
│                                    │
│   [CANVAS — read-only]            │
│   Pinch to zoom                   │
│   Drag to pan                     │
│   Tap node → bottom sheet         │
│                                    │
└────────────────────────────────────┘
│  [Overview]  [Comments]  [Info]   │ ← bottom tab bar
```

**Mobile banner** (shown at top of canvas):
> "Editing is available on desktop or tablet for the best experience."

**Node tap on mobile:** Opens bottom sheet with:
- Node label and type badge
- Node description (read-only)
- Properties values (read-only)
- "Add Comment" button (if allowed)

**Gestures:**
- Two-finger pinch: zoom in/out
- One-finger drag: pan canvas
- Double-tap: zoom to fit

---

## STEP 13.3 — Tablet Experience (768px – 1024px)

```
┌────────────────────────────────────────┐
│ EDITOR TOOLBAR (condensed — icons only)│
├────────────────────────────────────────┤
│                                        │
│   [CANVAS — full editing]             │
│                                        │
│   [Library drawer button ←]           │
│   [Properties drawer button →]        │
│                                        │
└────────────────────────────────────────┘
```

- Library sidebar: hidden, opens as **left drawer** on button tap
- Properties panel: hidden, opens as **right drawer** on node selection
- Minimap: hidden, show toggle in toolbar
- All toolbar buttons: icon-only (no text labels)
- Touch targets: minimum 44x44px

---

## STEP 13.4 — RTL Adaptation for Mobile/Tablet

- In Arabic: drawers flip sides (library from right, properties from left)
- Bottom navigation tab text is right-aligned
- All text: `text-right` in Arabic
- Bottom sheet animations: slide up from bottom (direction-agnostic ✓)

---

## STEP 13.5 — Implementation Code Pattern

```tsx
// src/hooks/useWindowSize.ts
export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return size
}

// In editor component:
const { width } = useWindowSize()
const isMobile = width < 768
const isTablet = width >= 768 && width < 1024
const isDesktop = width >= 1024

if (isMobile) return <MobileWorkflowViewer workflow={workflow} />
if (isTablet) return <TabletEditor workflow={workflow} />
return <DesktopEditor workflow={workflow} />
```

---

---

# PHASE 14 — QA & TESTING CHECKLIST
**Duration: 2–3 Days**

**The agent must verify every item below before marking a feature complete.**

---

## Authentication Tests

- [ ] Sign up with email/password → verification email sent → click link → redirect to dashboard
- [ ] Sign up with Google → profile created → workspace created → redirect to dashboard
- [ ] Sign in with email/password → correct session → dashboard loads
- [ ] Wrong password → clear error message shown
- [ ] Forgot password → email received → reset link works → new password works
- [ ] Unauth user visits `/dashboard` → redirected to `/sign-in`
- [ ] Unauth user visits `/workflows/[id]` → redirected to `/sign-in`
- [ ] Unauth user visits `/share/[token]` → can view if viewer link, no redirect
- [ ] Session persists after browser refresh
- [ ] Session persists across tabs
- [ ] Sign out → session cleared → dashboard redirect fails

## Profile & Workspace Tests

- [ ] Default workspace created automatically on first signup
- [ ] Workspace name matches "[User's Name]'s Workspace"
- [ ] User role in workspace = "owner" on creation
- [ ] Profile name editable → saved → shown in navbar
- [ ] Avatar upload → shows in navbar and collaboration presence
- [ ] Workspace name editable by owner
- [ ] Invite member by email → invitee sees workflow after signing in
- [ ] Change member role → reflected immediately
- [ ] Remove member → they lose access immediately

## i18n & Theme Tests

- [ ] Switch to Arabic → all UI text in Arabic → dir="rtl" on html element
- [ ] Switch to English → all UI text in English → dir="ltr" on html element
- [ ] Language preference saved → sign out → sign in → language restored
- [ ] Dark mode → all surfaces dark → canvas grid adapts → node text readable
- [ ] Light mode → all surfaces light
- [ ] System mode → follows OS → changes if OS changes
- [ ] Theme preference saved → restores after refresh
- [ ] No hardcoded colors anywhere (all use CSS variables)
- [ ] Editor panels look correct in all 3 themes × 2 languages = 6 combinations
- [ ] RTL: Library sidebar on right, Properties panel on left
- [ ] RTL: Directional icons (arrows, chevrons) are mirrored

## Dashboard Tests

- [ ] Workflows list shows all workspace workflows
- [ ] Grid/List view toggle works
- [ ] Sort by Last Modified → newest first
- [ ] Sort by Name A-Z → alphabetical
- [ ] Search filters results in real time
- [ ] Filter by Status works for each status value
- [ ] Filter by "Created by me" shows only own workflows
- [ ] Create workflow → redirects to editor → workflow saved to DB
- [ ] Duplicate workflow → copy created with "Copy of [name]"
- [ ] Archive workflow → removed from active list → appears in archived filter
- [ ] Delete workflow → confirmation dialog → deleted from DB
- [ ] Stats cards show correct counts
- [ ] Trial banner shows with correct days remaining
- [ ] Trial banner disappears after trial ends

## Editor Core Tests

- [ ] Drag node from library → drops at cursor position on canvas
- [ ] Click node in library → drops at viewport center
- [ ] Connect two nodes → edge appears
- [ ] Move node → position updates
- [ ] Click node → Properties panel shows correct fields for that node type
- [ ] Edit a property → node data updates (label changes on canvas)
- [ ] Delete node → all connected edges also removed
- [ ] Undo → previous state → Redo → action re-applied
- [ ] Undo/redo across 5+ actions
- [ ] Auto-save triggers within 2 seconds of last change
- [ ] Auto-save status shows: "Saving..." → "Saved ✓"
- [ ] Ctrl+S → immediate save → "Saved" status
- [ ] Auto-layout → nodes rearranged logically
- [ ] Undo restores layout before auto-layout
- [ ] Export PNG → file downloaded → contains all nodes
- [ ] Export JSON → file downloaded → valid JSON
- [ ] Import JSON → workflow recreated correctly
- [ ] Version snapshot created every 5 minutes
- [ ] Version history panel shows snapshots
- [ ] Restore version → workflow reverts → confirmation dialog shown
- [ ] All keyboard shortcuts work (test each one)

## Node Library Tests

- [ ] All 6 categories visible in sidebar
- [ ] Each category expands/collapses on click
- [ ] All 40+ node types present
- [ ] Each node type has correct icon and color
- [ ] Search "api" → shows "API Request" node
- [ ] Favorites section appears when favorites exist
- [ ] Star node → appears in favorites → star fills
- [ ] Unstar node → removed from favorites
- [ ] Favorite limit enforced → upgrade modal shown when exceeded
- [ ] Decision node: has True + False output handles
- [ ] Error Handler node: has Main + Error output handles
- [ ] Properties panel shows different fields for each node type
- [ ] Required fields marked → validation on save

## Custom Elements Tests

- [ ] Create custom element → multi-step modal works
- [ ] Live preview updates as user configures
- [ ] Custom element appears in "My Elements" section
- [ ] Drag custom element onto canvas → creates node with default properties
- [ ] Right-click node → "Save as Custom Element" → opens pre-filled designer
- [ ] Edit custom element → changes reflected
- [ ] Delete custom element → confirmation → removed from library
- [ ] Custom element limit enforced per plan
- [ ] Workspace visibility option only shows on Elite+

## Real-time Collaboration Tests

- [ ] Open same workflow in two browsers → both users appear in presence avatars
- [ ] Hover collaborator avatar → shows name
- [ ] User A moves node → User B sees it move within 1–2 seconds
- [ ] User A deletes edge → User B sees it disappear
- [ ] User A adds node → User B sees new node appear
- [ ] User A closes browser → User A's avatar disappears from presence
- [ ] User A posts comment → User B sees comment bubble appear on canvas
- [ ] Commenter role can post comment → cannot move nodes
- [ ] Viewer role cannot move nodes → drag is blocked
- [ ] Viewer cannot connect nodes
- [ ] Role badge shows in editor toolbar: "Viewing as Commenter"

## Billing & Plan Tests

- [ ] New user has Legend plan and status = trialing
- [ ] Trial shows X days remaining in dashboard banner
- [ ] Simulate trial expiry → plan downgraded to Free → Free limits enforced
- [ ] Attempt to create 4th workflow on Free plan → blocked with upgrade prompt
- [ ] Attempt to add 4th collaborator on Warrior → blocked
- [ ] Stripe checkout page opens → test payment succeeds → plan upgraded
- [ ] Stripe webhook: subscription.deleted → plan downgraded
- [ ] AI credits depleted → AI action blocked → upgrade modal shown
- [ ] Monthly reset (simulate invoice.paid event) → credits reset

## AI Assistant Tests

- [ ] Generate workflow from text → returns valid nodes and edges on canvas
- [ ] Generated nodes are proper types, connected logically
- [ ] Undo removes generated nodes
- [ ] Analyze workflow → detects dead-end node → shows error badge
- [ ] Analyze workflow → detects disconnected node → shows warning
- [ ] Suggest improvements → shows 3–5 items → auto-apply works
- [ ] Generate node description → applied to node description field
- [ ] Credits deducted after each action (verify in DB)
- [ ] 0 credits → AI blocked → shows upgrade prompt
- [ ] AI actions unavailable without session (test API directly)

## Sharing & Permissions Tests

- [ ] Share dialog opens with correct current collaborators
- [ ] Invite existing user by email → they gain access
- [ ] Create share link → link works → opens read-only canvas
- [ ] Viewer share link: add comment button hidden
- [ ] Commenter share link: requires sign in → can comment
- [ ] Expired share link → shows "Link expired" message
- [ ] Revoke share link → link no longer works
- [ ] Share link creation blocked on Free plan

## Mobile & Tablet Tests

- [ ] Mobile (<768px): canvas is view-only (no drag, no connect)
- [ ] Mobile: "Editing available on desktop" message visible
- [ ] Mobile: Tap node → bottom sheet shows node info
- [ ] Mobile: Pinch to zoom works
- [ ] Mobile: Comment tab shows comments list
- [ ] Tablet (768px–1024px): Library opens as drawer
- [ ] Tablet: Properties opens as drawer on node tap
- [ ] Tablet: Node drag works with touch
- [ ] Arabic RTL on mobile: text right-aligned, drawers flipped
- [ ] All touch targets ≥ 44×44px

---

---

# PHASE 15 — DEPLOY & LAUNCH
**Duration: 1–2 Days**

---

## STEP 15.1 — Supabase Production Setup

1. Create a **new** Supabase project for production (never use dev project for prod)
2. Run all SQL migrations in order in production SQL editor
3. Verify RLS is enabled on all 16 tables
4. Configure Auth providers (Google) with production redirect URIs
5. Create Storage buckets:
   - `avatars` (public)
   - `workflow-thumbnails` (public)
6. Enable Realtime for: `workflow_nodes`, `workflow_edges`, `workflow_comments`, `workflow_activity`
7. Customize email templates (welcome, verification, reset, trial expiry)
8. Set SMTP settings for reliable email delivery

---

## STEP 15.2 — Stripe Live Mode

1. Switch Stripe dashboard to **Live mode**
2. Create all 4 products + monthly/annual prices in live mode
3. Set up webhook endpoint:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`
4. Copy live keys to production environment variables
5. Test with a real card (then immediately refund)

---

## STEP 15.3 — Vercel Deployment

1. Push code to GitHub repository
2. Connect GitHub repo to Vercel project
3. Set all environment variables in Vercel dashboard (all values from `.env.local`)
4. Set `NODE_ENV=production`
5. Configure custom domain + SSL certificate
6. Enable Vercel Analytics
7. Set up Vercel Cron Job:
   - Path: `/api/cron/check-trials`
   - Schedule: `0 0 * * *` (daily at midnight UTC)
8. First deployment → verify build succeeds
9. Test all routes on production URL

---

## STEP 15.4 — Pre-Launch Final Checklist

**Security:**
- [ ] No API keys exposed in client bundle (check Network tab in DevTools)
- [ ] RLS tested: log in as a non-member → confirm cannot read other workspace data
- [ ] Stripe webhook signature verification works
- [ ] All server actions validate session before mutating data
- [ ] No SQL injection risks (all queries use Supabase client, no raw string concatenation)

**Functionality:**
- [ ] All 14 previous phases tested on production environment
- [ ] Email delivery working (test verification, reset, trial)
- [ ] Stripe checkout works in live mode
- [ ] Realtime collaboration working on production
- [ ] AI assistant working with production OpenAI key

**Performance:**
- [ ] Editor loads in < 3 seconds on standard broadband
- [ ] Dashboard loads in < 2 seconds
- [ ] Canvas with 50 nodes renders smoothly (no jank)
- [ ] Auto-save does not freeze canvas during save

**UX:**
- [ ] Loading states on all async operations (no blank screens)
- [ ] Empty states designed for: no workflows, no nodes, no collaborators
- [ ] Error states: invalid share link, deleted workflow, plan limit
- [ ] 404 page styled and translated in AR/EN
- [ ] 500 error page styled with user-friendly message

**Accessibility:**
- [ ] Keyboard navigation works throughout
- [ ] All interactive elements have proper labels
- [ ] Color contrast meets WCAG AA standards in both light and dark mode

---

## STEP 15.5 — Post-Launch Monitoring Setup

1. **Error tracking:** Set up Sentry or similar. Wrap app in error boundary.
2. **Uptime monitoring:** Ping `/api/health` every 5 minutes. Alert on failure.
3. **Database monitoring:** Supabase dashboard alerts for query latency spikes.
4. **Stripe monitoring:** Watch for spikes in `payment_failed` events.
5. **Weekly review metrics:**
   - New signups
   - Trial-to-paid conversion rate
   - Most-used node types
   - AI credits usage by plan
   - Top workflow node counts

---

---

# APPENDIX A — COMPLETE ROUTE MAP

| Route | Auth Required | Description |
|---|---|---|
| `/[locale]/auth/sign-in` | No | Email/password + Google sign-in |
| `/[locale]/auth/sign-up` | No | New account registration |
| `/[locale]/auth/forgot-password` | No | Password reset request |
| `/[locale]/auth/verify-email` | No | Email verification message |
| `/[locale]/dashboard` | Yes | Main dashboard |
| `/[locale]/workflows/[workflowId]` | Yes | Workflow editor |
| `/[locale]/billing` | Yes | Subscription management |
| `/[locale]/settings/profile` | Yes | User profile settings |
| `/[locale]/settings/workspace` | Yes | Workspace settings + members |
| `/[locale]/share/[shareId]` | No* | Public read-only workflow view |
| `/auth/callback` | No | OAuth + email verification handler |
| `/api/stripe/webhook` | No (Stripe sig) | Stripe event handler |
| `/api/ai/generate` | Yes | AI workflow generation |
| `/api/ai/analyze` | Yes | AI workflow analysis |
| `/api/ai/suggest` | Yes | AI improvement suggestions |
| `/api/cron/check-trials` | Cron secret | Daily trial expiry check |

---

# APPENDIX B — DATABASE TABLE SUMMARY

| Table | Rows | Purpose |
|---|---|---|
| `profiles` | 1 per user | User identity |
| `user_preferences` | 1 per user | Language, theme, layout |
| `workspaces` | 1+ per user | Workspace container |
| `workspace_members` | N per workspace | Team membership + roles |
| `dashboards` | N per workspace | Workflow folder/grouping |
| `workflows` | N per workspace | Workflow metadata |
| `workflow_nodes` | N per workflow | Individual canvas nodes |
| `workflow_edges` | N per workflow | Connections between nodes |
| `workflow_versions` | N per workflow | Point-in-time snapshots |
| `workflow_comments` | N per workflow | Threaded comments |
| `workflow_activity` | N per workflow | Audit log |
| `workflow_shares` | N per workflow | Share links + permissions |
| `custom_node_templates` | N per workspace | User-defined node types |
| `user_favorite_nodes` | N per user | Starred nodes |
| `subscriptions` | 1 per workspace | Stripe billing state |
| `ai_requests` | N per workspace | AI usage log |

---

# APPENDIX C — NODE LIBRARY FULL CATALOG

| Category | Node Type Key | Display Name | Handles |
|---|---|---|---|
| Basic | `start` | Start | 1 out |
| Basic | `end` | End | 1 in |
| Basic | `process` | Process | 1 in, 1 out |
| Basic | `decision` | Decision | 1 in, 2+ out |
| Basic | `note` | Note | none |
| Basic | `group` | Group | none |
| Basic | `connector` | Connector | 1 in, 1 out |
| Basic | `delay` | Delay | 1 in, 1 out |
| Logic | `if_else` | If / Else | 1 in, true/false out |
| Logic | `switch` | Switch | 1 in, N out |
| Logic | `loop` | Loop | 1 in, loop/exit out |
| Logic | `parallel` | Parallel | 1 in, N out |
| Logic | `merge` | Merge | N in, 1 out |
| Logic | `retry` | Retry | 1 in, success/fail out |
| Logic | `error_handler` | Error Handler | 1 in, handled/unhandled out |
| Data | `input` | Input | 0 in, 1 out |
| Data | `output` | Output | 1 in, 0 out |
| Data | `variable` | Variable | 1 in, 1 out |
| Data | `transform` | Transform | 1 in, 1 out |
| Data | `filter` | Filter | 1 in, match/no-match out |
| Data | `mapper` | Mapper | 1 in, 1 out |
| Data | `table_lookup` | Table Lookup | 1 in, found/not-found out |
| Integration | `api_request` | API Request | 1 in, success/error out |
| Integration | `webhook` | Webhook | 1 in, 1 out |
| Integration | `email` | Email | 1 in, success/fail out |
| Integration | `sms` | SMS | 1 in, 1 out |
| Integration | `database` | Database Query | 1 in, success/error out |
| Integration | `file_upload` | File Upload | 1 in, 1 out |
| Integration | `google_sheets` | Google Sheets | 1 in, 1 out |
| Integration | `slack` | Slack / Discord | 1 in, 1 out |
| Integration | `crm` | CRM Action | 1 in, 1 out |
| Human | `form_step` | Form Step | 1 in, 1 out |
| Human | `approval` | Approval Step | 1 in, approved/rejected out |
| Human | `user_task` | User Task | 1 in, complete/skip out |
| Human | `checklist` | Checklist | 1 in, all-done/partial out |
| Human | `attachment` | Attachment | 1 in, 1 out |
| Human | `signature` | Signature | 1 in, signed/declined out |
| AI | `ai_generate` | Generate Text | 1 in, 1 out |
| AI | `ai_classify` | Classify | 1 in, N category out |
| AI | `ai_extract` | Extract Data | 1 in, 1 out |
| AI | `ai_summarize` | Summarize | 1 in, 1 out |
| AI | `ai_route` | Route Decision | 1 in, N route out |
| AI | `ai_validator` | AI Validator | 1 in, valid/invalid out |
| AI | `ai_assistant` | AI Workflow Assistant | 1 in, 1 out |

---

*End of Visual Workflow SaaS — Complete Agent Execution Plan*

*Total: 15 Phases | 16 Database Tables | 40+ Node Types | 5 Subscription Plans | Full AR/EN i18n | Real-time Collaboration | AI Assistant*
