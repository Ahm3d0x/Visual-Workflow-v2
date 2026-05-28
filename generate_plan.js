const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, UnderlineType, NumberFormat, convertInchesToTwip,
  TableLayoutType, VerticalAlign, PageOrientation
} = require('docx');
const fs = require('fs');

const COLORS = {
  primary: '1E3A5F',
  accent: '2563EB',
  accentLight: 'DBEAFE',
  success: '16A34A',
  successLight: 'DCFCE7',
  warning: 'D97706',
  warningLight: 'FEF3C7',
  danger: 'DC2626',
  dangerLight: 'FEE2E2',
  purple: '7C3AED',
  purpleLight: 'EDE9FE',
  gray: '374151',
  lightGray: 'F3F4F6',
  midGray: '9CA3AF',
  white: 'FFFFFF',
  darkBg: '0F172A',
};

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    run: { color: COLORS.primary, bold: true, size: 36 },
    thematicBreak: false,
  });
}

function heading2(text, color = COLORS.primary) {
  return new Paragraph({
    spacing: { before: 320, after: 160 },
    children: [
      new TextRun({ text, bold: true, size: 28, color }),
    ],
  });
}

function heading3(text, color = COLORS.accent) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({ text, bold: true, size: 24, color }),
    ],
  });
}

function heading4(text) {
  return new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [
      new TextRun({ text, bold: true, size: 22, color: COLORS.gray }),
    ],
  });
}

function body(text, options = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text,
        size: 20,
        color: options.color || COLORS.gray,
        bold: options.bold || false,
        italics: options.italic || false,
      }),
    ],
    alignment: options.align || AlignmentType.LEFT,
  });
}

function bullet(text, level = 0, color = COLORS.gray) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: convertInchesToTwip(0.25 + level * 0.25) },
    children: [
      new TextRun({ text: `${level === 0 ? '▸' : '◦'}  ${text}`, size: 20, color }),
    ],
  });
}

function numberedItem(text, num, color = COLORS.accent) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.3) },
    children: [
      new TextRun({ text: `${num}. `, bold: true, size: 20, color }),
      new TextRun({ text, size: 20, color: COLORS.gray }),
    ],
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { color: COLORS.accent, size: 4, style: BorderStyle.SINGLE } },
    children: [],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function emptyLine(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')] }));
}

function colorBlock(text, bgColor = COLORS.accentLight, textColor = COLORS.accent) {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    shading: { type: ShadingType.SOLID, color: bgColor },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text, size: 20, color: textColor, bold: true }),
    ],
  });
}

function sectionLabel(text, bgColor = COLORS.accent) {
  return new Paragraph({
    spacing: { before: 160, after: 120 },
    shading: { type: ShadingType.SOLID, color: bgColor },
    indent: { left: convertInchesToTwip(0.15) },
    children: [
      new TextRun({ text: `  ${text}  `, size: 22, color: COLORS.white, bold: true }),
    ],
  });
}

function makeTable(headers, rows, colWidths) {
  const headerCells = headers.map((h, i) => new TableCell({
    width: { size: colWidths[i], type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.SOLID, color: COLORS.primary },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: h, bold: true, color: COLORS.white, size: 18 })],
    })],
  }));

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      width: { size: colWidths[ci], type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? COLORS.lightGray : COLORS.white },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        alignment: ci === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
        children: [new TextRun({ text: cell, size: 18, color: COLORS.gray })],
      })],
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: headerCells }), ...dataRows],
  });
}

function phaseHeader(num, title, duration, color = COLORS.accent) {
  return [
    new Paragraph({
      spacing: { before: 300, after: 0 },
      shading: { type: ShadingType.SOLID, color },
      children: [
        new TextRun({ text: `  PHASE ${num}: ${title}`, bold: true, size: 28, color: COLORS.white }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 160 },
      shading: { type: ShadingType.SOLID, color: COLORS.lightGray },
      children: [
        new TextRun({ text: `  ⏱ Estimated Duration: ${duration}`, size: 18, color: COLORS.gray }),
      ],
    }),
  ];
}

function stepBox(stepNum, title, details = []) {
  const children = [
    new TextRun({ text: `  STEP ${stepNum}: ${title}`, bold: true, size: 22, color: COLORS.accent }),
  ];
  return [
    new Paragraph({
      spacing: { before: 160, after: 0 },
      shading: { type: ShadingType.SOLID, color: COLORS.accentLight },
      border: { left: { color: COLORS.accent, size: 12, style: BorderStyle.SINGLE } },
      children,
    }),
    ...details.map(d => new Paragraph({
      spacing: { before: 0, after: 0 },
      shading: { type: ShadingType.SOLID, color: COLORS.lightGray },
      indent: { left: convertInchesToTwip(0.2) },
      children: [new TextRun({ text: `    ${d}`, size: 18, color: COLORS.gray })],
    })),
    new Paragraph({ spacing: { before: 0, after: 120 }, children: [new TextRun('')] }),
  ];
}

// ─── DOCUMENT ASSEMBLY ────────────────────────────────────────────────────────

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 20, color: COLORS.gray },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(0.9),
          bottom: convertInchesToTwip(0.9),
          left: convertInchesToTwip(1.0),
          right: convertInchesToTwip(1.0),
        },
      },
    },
    children: [

      // ══════════════════════════════════════════════════════
      // COVER PAGE
      // ══════════════════════════════════════════════════════
      new Paragraph({
        spacing: { before: 800, after: 60 },
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.SOLID, color: COLORS.primary },
        children: [
          new TextRun({ text: '  VISUAL WORKFLOW SAAS  ', bold: true, size: 52, color: COLORS.white }),
        ],
      }),
      new Paragraph({
        spacing: { before: 0, after: 60 },
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.SOLID, color: COLORS.accent },
        children: [
          new TextRun({ text: '  COMPLETE AGENT EXECUTION PLAN  ', bold: true, size: 28, color: COLORS.white }),
        ],
      }),
      new Paragraph({
        spacing: { before: 0, after: 400 },
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.SOLID, color: COLORS.accentLight },
        children: [
          new TextRun({ text: '  From Local HTML → Full-Scale SaaS Platform  ', size: 22, color: COLORS.accent }),
        ],
      }),
      ...emptyLine(2),

      // VISION BOX
      colorBlock('🎯  PRODUCT VISION', COLORS.purpleLight, COLORS.purple),
      body('Transform a local HTML + IndexedDB workflow builder into a professional SaaS platform featuring real-time collaboration, AI assistance, subscription billing, multi-language support, a powerful node library, and a best-in-class visual editor experience.', { color: COLORS.gray }),
      ...emptyLine(1),

      // TECH STACK BOX
      colorBlock('⚡  TECHNOLOGY STACK', COLORS.successLight, COLORS.success),
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: 'Frontend: ', bold: true, size: 20, color: COLORS.success }),
          new TextRun({ text: 'Next.js App Router + TypeScript + React Flow (XYFlow) + Tailwind CSS + shadcn/ui + lucide-react', size: 20, color: COLORS.gray }),
        ],
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: 'State: ', bold: true, size: 20, color: COLORS.success }),
          new TextRun({ text: 'Zustand + React Hook Form + Zod', size: 20, color: COLORS.gray }),
        ],
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: 'Backend/DB: ', bold: true, size: 20, color: COLORS.success }),
          new TextRun({ text: 'Supabase (Auth + PostgreSQL + Realtime + RLS)', size: 20, color: COLORS.gray }),
        ],
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: 'Payments: ', bold: true, size: 20, color: COLORS.success }),
          new TextRun({ text: 'Stripe (Subscriptions + Webhooks)', size: 20, color: COLORS.gray }),
        ],
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: 'AI: ', bold: true, size: 20, color: COLORS.success }),
          new TextRun({ text: 'OpenAI API (GPT-4o) + credit-based usage metering', size: 20, color: COLORS.gray }),
        ],
      }),
      new Paragraph({
        spacing: { before: 40, after: 120 },
        children: [
          new TextRun({ text: 'i18n/Theme: ', bold: true, size: 20, color: COLORS.success }),
          new TextRun({ text: 'next-intl (AR/EN, RTL/LTR) + next-themes (Light/Dark/System)', size: 20, color: COLORS.gray }),
        ],
      }),

      ...emptyLine(1),
      // CORE ASSUMPTIONS
      colorBlock('📌  LOCKED ASSUMPTIONS', COLORS.warningLight, COLORS.warning),
      bullet('This is a full SaaS release — NOT a limited MVP.', 0, COLORS.gray),
      bullet('Mobile = View + Comments ONLY. No canvas editing on mobile.', 0, COLORS.gray),
      bullet('Real-time collaboration is live for nodes, edges, comments, and presence from day one.', 0, COLORS.gray),
      bullet('Custom elements are user-private by default; sharing is plan-gated.', 0, COLORS.gray),
      bullet('AI Assistant is included from the first release.', 0, COLORS.gray),
      bullet('Supabase is the single source of truth. No hybrid local/cloud storage.', 0, COLORS.gray),
      bullet('Conflict resolution = last-write-wins + version history snapshots.', 0, COLORS.gray),
      bullet('No workflow automation execution engine in v1 — visual design, collaboration, and AI analysis only.', 0, COLORS.gray),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // TABLE OF CONTENTS EQUIVALENT
      // ══════════════════════════════════════════════════════
      heading1('MASTER EXECUTION OVERVIEW'),
      divider(),

      makeTable(
        ['Phase', 'Area', 'Key Deliverables', 'Duration'],
        [
          ['1', 'Project Foundation', 'Next.js setup, folder structure, env config, tooling', '1–2 days'],
          ['2', 'Database & Schema', 'All 16 Supabase tables, RLS policies, indexes', '2–3 days'],
          ['3', 'Authentication', 'Email/password, Google OAuth, email verification, middleware', '2 days'],
          ['4', 'i18n & Theming', 'AR/EN translations, RTL/LTR, Light/Dark/System themes', '1–2 days'],
          ['5', 'Dashboard', 'Workflows list, stats cards, quick actions, filters, search', '2–3 days'],
          ['6', 'Workflow Editor Core', 'React Flow canvas, panels, sidebar, minimap, grid', '3–4 days'],
          ['7', 'Node Library', '40+ nodes across 6 categories, properties panel, validation', '3–4 days'],
          ['8', 'Favorites & Custom Elements', 'Custom node designer, favorites system, plan limits', '2–3 days'],
          ['9', 'Real-time Collaboration', 'Presence, cursors, live sync, comments, activity log', '3–4 days'],
          ['10', 'Billing & Plans', 'Stripe checkout, 5 tiers, trial logic, usage guards', '2–3 days'],
          ['11', 'AI Assistant', 'Workflow gen, analysis, suggestions, credit metering', '2–3 days'],
          ['12', 'Sharing & Permissions', 'Share links, role enforcement, public view, collaboration invites', '2 days'],
          ['13', 'Mobile & Tablet UX', 'Responsive editor, view-only mobile, bottom sheets, gestures', '2 days'],
          ['14', 'QA & Testing', 'Functional, realtime, billing, AI, UI/UX test suites', '2–3 days'],
          ['15', 'Deploy & Launch', 'Vercel deploy, env secrets, Supabase prod, Stripe live mode', '1–2 days'],
        ],
        [8, 18, 45, 15]
      ),

      ...emptyLine(1),
      body('Total Estimated Timeline: 30–45 working days (1 full-stack developer). Can be parallelized with a team.', { bold: true, color: COLORS.accent }),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 1
      // ══════════════════════════════════════════════════════
      ...phaseHeader(1, 'PROJECT FOUNDATION & ARCHITECTURE', '1–2 Days', COLORS.primary),

      heading3('Goal'),
      body('Bootstrap a production-ready Next.js monorepo with every tool, linter, and configuration locked in before writing any feature code.'),

      ...stepBox(1, 'Initialize Next.js App Router Project', [
        'npx create-next-app@latest visual-workflow --typescript --tailwind --app --eslint --src-dir',
        'Select: App Router = YES, src/ directory = YES, import alias = @/*',
        'Set Node.js ≥ 20.x as runtime requirement in package.json engines field',
      ]),

      ...stepBox(2, 'Install All Dependencies Upfront', [
        'npm install @xyflow/react zustand @supabase/supabase-js @supabase/ssr',
        'npm install stripe @stripe/stripe-js next-intl next-themes',
        'npm install react-hook-form zod @hookform/resolvers',
        'npm install lucide-react class-variance-authority clsx tailwind-merge',
        'npx shadcn@latest init  (select: New York style, CSS variables: YES)',
        'npx shadcn@latest add button input dialog sheet tabs badge select dropdown-menu',
        'npx shadcn@latest add card separator skeleton tooltip popover command',
      ]),

      ...stepBox(3, 'Define Complete Folder Structure', [
        'src/app/[locale]/(auth)/sign-in, sign-up, forgot-password, verify-email',
        'src/app/[locale]/(main)/dashboard, workflows/[id], billing, settings/profile, settings/workspace',
        'src/app/[locale]/share/[shareId]  — public read-only view',
        'src/app/api/stripe/webhook, ai/generate, ai/analyze, ai/suggest',
        'src/components/editor/ — Canvas, NodeLibrary, PropertiesPanel, Toolbar, Minimap, Panels',
        'src/components/dashboard/ — WorkflowCard, StatsBar, QuickActions, FilterBar',
        'src/components/ui/ — shadcn components + custom design tokens',
        'src/lib/ — supabase.ts, stripe.ts, openai.ts, planLimits.ts, cn.ts',
        'src/stores/ — workflowStore.ts, editorStore.ts, collaborationStore.ts, uiStore.ts',
        'src/hooks/ — useWorkflow.ts, useNodes.ts, useRealtime.ts, usePlanLimits.ts, useAI.ts',
        'src/types/ — database.types.ts (generated), workflow.types.ts, node.types.ts, plan.types.ts',
        'messages/ar.json + messages/en.json',
      ]),

      ...stepBox(4, 'Configure Environment Variables', [
        'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY (server-only)',
        'STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'OPENAI_API_KEY',
        'NEXT_PUBLIC_APP_URL (for redirect URIs and share links)',
        'Store in .env.local; commit .env.example with placeholder values',
      ]),

      ...stepBox(5, 'Configure Tailwind & Design Tokens', [
        'Extend tailwind.config.ts with custom color palette: primary, accent, canvas, sidebar, node-*',
        'Add CSS variables in globals.css for light/dark mode switching',
        'Define spacing scale for editor panels (sidebar: 280px, properties: 320px)',
        'Configure font: Inter for LTR, Tajawal for RTL (add to next/font)',
      ]),

      ...stepBox(6, 'Configure Middleware', [
        'src/middleware.ts: handle locale detection (ar/en) + auth session validation',
        'Protect all /(main) routes — redirect to /sign-in if no session',
        'Allow /(auth) routes + /share/[shareId] without auth',
        'Set locale cookie on first visit; read from user_preferences on subsequent visits',
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 2 — DATABASE
      // ══════════════════════════════════════════════════════
      ...phaseHeader(2, 'DATABASE SCHEMA & SECURITY', '2–3 Days', COLORS.success),

      heading3('Goal'),
      body('Create all 16 Supabase tables with correct columns, foreign keys, indexes, and row-level security (RLS) policies so no feature requires schema changes later.'),

      heading3('Complete Table Definitions'),

      heading4('1. profiles'),
      bullet('id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE'),
      bullet('email TEXT NOT NULL'),
      bullet('full_name TEXT'),
      bullet('avatar_url TEXT'),
      bullet('created_at TIMESTAMPTZ DEFAULT now()'),
      bullet('RLS: user can only read/update their own row'),

      heading4('2. user_preferences'),
      bullet('user_id UUID PRIMARY KEY REFERENCES profiles'),
      bullet('language TEXT DEFAULT \'en\'  — values: \'ar\' | \'en\''),
      bullet('theme TEXT DEFAULT \'system\'  — values: \'light\' | \'dark\' | \'system\''),
      bullet('editor_layout JSONB DEFAULT \'{}\'  — collapsed panels, panel sizes'),
      bullet('collapsed_panels TEXT[] DEFAULT \'{}\''),
      bullet('RLS: user reads/writes only their own preferences'),

      heading4('3. workspaces'),
      bullet('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
      bullet('name TEXT NOT NULL'),
      bullet('owner_id UUID REFERENCES profiles NOT NULL'),
      bullet('plan TEXT DEFAULT \'free\'  — free | warrior | elite | champion | legend'),
      bullet('trial_ends_at TIMESTAMPTZ  — null when no active trial'),
      bullet('stripe_customer_id TEXT'),
      bullet('created_at TIMESTAMPTZ DEFAULT now()'),

      heading4('4. workspace_members'),
      bullet('workspace_id UUID REFERENCES workspaces'),
      bullet('user_id UUID REFERENCES profiles'),
      bullet('role TEXT  — owner | admin | editor | commenter | viewer'),
      bullet('invited_by UUID REFERENCES profiles'),
      bullet('joined_at TIMESTAMPTZ DEFAULT now()'),
      bullet('PRIMARY KEY (workspace_id, user_id)'),

      heading4('5. dashboards'),
      bullet('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
      bullet('workspace_id UUID REFERENCES workspaces NOT NULL'),
      bullet('name TEXT NOT NULL'),
      bullet('description TEXT'),
      bullet('created_by UUID REFERENCES profiles'),
      bullet('created_at, updated_at TIMESTAMPTZ'),

      heading4('6. workflows'),
      bullet('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
      bullet('dashboard_id UUID REFERENCES dashboards'),
      bullet('workspace_id UUID REFERENCES workspaces NOT NULL'),
      bullet('name TEXT NOT NULL'),
      bullet('description TEXT'),
      bullet('status TEXT DEFAULT \'draft\'  — draft | active | archived | published'),
      bullet('thumbnail_url TEXT  — auto-generated PNG preview'),
      bullet('node_count INT DEFAULT 0'),
      bullet('created_by UUID REFERENCES profiles'),
      bullet('updated_at TIMESTAMPTZ DEFAULT now()'),

      heading4('7. workflow_nodes'),
      bullet('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
      bullet('workflow_id UUID REFERENCES workflows ON DELETE CASCADE'),
      bullet('type TEXT NOT NULL  — e.g. "process", "decision", "api-request"'),
      bullet('position JSONB NOT NULL  — {x: number, y: number}'),
      bullet('data JSONB NOT NULL  — all node properties (label, config, etc.)'),
      bullet('style JSONB DEFAULT \'{}\'  — visual overrides'),
      bullet('parent_id UUID REFERENCES workflow_nodes  — for grouped nodes'),
      bullet('created_at TIMESTAMPTZ DEFAULT now()'),

      heading4('8. workflow_edges'),
      bullet('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
      bullet('workflow_id UUID REFERENCES workflows ON DELETE CASCADE'),
      bullet('source_node_id UUID REFERENCES workflow_nodes'),
      bullet('target_node_id UUID REFERENCES workflow_nodes'),
      bullet('source_handle TEXT'),
      bullet('target_handle TEXT'),
      bullet('data JSONB DEFAULT \'{}\'  — label, animated, style'),
      bullet('created_at TIMESTAMPTZ DEFAULT now()'),

      heading4('9. workflow_versions'),
      bullet('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
      bullet('workflow_id UUID REFERENCES workflows ON DELETE CASCADE'),
      bullet('snapshot JSONB NOT NULL  — full {nodes, edges} state'),
      bullet('label TEXT  — user-defined or auto "Auto-save v3"'),
      bullet('created_by UUID REFERENCES profiles'),
      bullet('created_at TIMESTAMPTZ DEFAULT now()'),
      bullet('INDEX on (workflow_id, created_at DESC) for fast history load'),

      heading4('10. workflow_comments'),
      bullet('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
      bullet('workflow_id UUID REFERENCES workflows ON DELETE CASCADE'),
      bullet('node_id UUID REFERENCES workflow_nodes  — null = canvas-level comment'),
      bullet('parent_id UUID REFERENCES workflow_comments  — for threaded replies'),
      bullet('body TEXT NOT NULL'),
      bullet('created_by UUID REFERENCES profiles'),
      bullet('created_at TIMESTAMPTZ DEFAULT now()'),
      bullet('resolved_at TIMESTAMPTZ'),

      heading4('11. workflow_activity'),
      bullet('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
      bullet('workflow_id UUID REFERENCES workflows'),
      bullet('actor_id UUID REFERENCES profiles'),
      bullet('action TEXT  — node_created | edge_deleted | member_invited | status_changed...'),
      bullet('meta JSONB  — contextual details for the action'),
      bullet('created_at TIMESTAMPTZ DEFAULT now()'),

      heading4('12. workflow_shares'),
      bullet('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
      bullet('workflow_id UUID REFERENCES workflows'),
      bullet('user_id UUID REFERENCES profiles  — null if public link'),
      bullet('role TEXT  — editor | commenter | viewer'),
      bullet('share_token TEXT UNIQUE  — used for public share links'),
      bullet('expires_at TIMESTAMPTZ'),
      bullet('created_by UUID REFERENCES profiles'),

      heading4('13. custom_node_templates'),
      bullet('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
      bullet('workspace_id UUID REFERENCES workspaces'),
      bullet('created_by UUID REFERENCES profiles'),
      bullet('name TEXT NOT NULL'),
      bullet('description TEXT'),
      bullet('base_type TEXT  — the system node type this is built upon'),
      bullet('icon TEXT  — lucide icon name'),
      bullet('color TEXT  — hex color'),
      bullet('default_data JSONB  — preset property values'),
      bullet('default_style JSONB  — visual defaults'),
      bullet('handles JSONB  — {inputs: [...], outputs: [...]}'),
      bullet('validation_schema JSONB'),
      bullet('tags TEXT[]'),
      bullet('visibility TEXT DEFAULT \'private\'  — private | workspace'),
      bullet('created_at TIMESTAMPTZ DEFAULT now()'),

      heading4('14. user_favorite_nodes'),
      bullet('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
      bullet('user_id UUID REFERENCES profiles'),
      bullet('node_type TEXT  — system node type OR null'),
      bullet('custom_node_template_id UUID REFERENCES custom_node_templates  — OR null'),
      bullet('created_at TIMESTAMPTZ DEFAULT now()'),
      bullet('CHECK: exactly one of node_type or custom_node_template_id must be non-null'),

      heading4('15. subscriptions'),
      bullet('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
      bullet('workspace_id UUID REFERENCES workspaces UNIQUE'),
      bullet('plan TEXT NOT NULL'),
      bullet('stripe_customer_id TEXT'),
      bullet('stripe_subscription_id TEXT'),
      bullet('stripe_price_id TEXT'),
      bullet('status TEXT  — active | trialing | canceled | past_due'),
      bullet('current_period_start, current_period_end TIMESTAMPTZ'),
      bullet('cancel_at_period_end BOOLEAN DEFAULT false'),

      heading4('16. ai_requests'),
      bullet('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
      bullet('workspace_id UUID REFERENCES workspaces'),
      bullet('user_id UUID REFERENCES profiles'),
      bullet('workflow_id UUID REFERENCES workflows'),
      bullet('action TEXT  — generate | analyze | suggest | summarize | layout'),
      bullet('prompt_tokens INT'),
      bullet('completion_tokens INT'),
      bullet('credits_used INT'),
      bullet('status TEXT  — success | error'),
      bullet('created_at TIMESTAMPTZ DEFAULT now()'),

      ...emptyLine(1),
      ...stepBox('DB-A', 'RLS Policies (Apply to ALL tables)', [
        'profiles: SELECT/UPDATE WHERE id = auth.uid()',
        'workspaces: SELECT if member of workspace OR owner. INSERT for authenticated users.',
        'workflows: SELECT/UPDATE/DELETE based on workspace membership role.',
        'workflow_nodes/edges: Inherit from parent workflow permissions.',
        'custom_node_templates: SELECT if visibility=workspace and member, or created_by=user.',
        'subscriptions: SELECT/UPDATE for workspace owner only.',
        'Enable RLS: ALTER TABLE <name> ENABLE ROW LEVEL SECURITY; on every table.',
      ]),

      ...stepBox('DB-B', 'Indexes for Performance', [
        'workflows: INDEX(workspace_id), INDEX(dashboard_id), INDEX(updated_at DESC)',
        'workflow_nodes: INDEX(workflow_id)',
        'workflow_edges: INDEX(workflow_id), INDEX(source_node_id), INDEX(target_node_id)',
        'workflow_versions: INDEX(workflow_id, created_at DESC)',
        'workflow_comments: INDEX(workflow_id), INDEX(node_id)',
        'ai_requests: INDEX(workspace_id, created_at DESC)',
        'user_favorite_nodes: INDEX(user_id)',
      ]),

      ...stepBox('DB-C', 'Database Functions & Triggers', [
        'Trigger: on new auth.user → INSERT into profiles + user_preferences + create default workspace',
        'Function: get_workspace_plan(workspace_id) → returns current plan string',
        'Function: check_plan_limit(workspace_id, resource, count) → returns BOOLEAN',
        'Trigger: on workflow_nodes INSERT/DELETE → UPDATE workflows.node_count',
        'Function: create_workspace_for_user() → auto-create on profile creation',
      ]),

      ...stepBox('DB-D', 'Generate TypeScript Types', [
        'Run: npx supabase gen types typescript --project-id <id> > src/types/database.types.ts',
        'Re-run this command after every schema migration',
        'Extend generated types with custom union types in src/types/workflow.types.ts',
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 3 — AUTH
      // ══════════════════════════════════════════════════════
      ...phaseHeader(3, 'AUTHENTICATION SYSTEM', '2 Days', COLORS.purple),

      heading3('Goal'),
      body('Full auth system: email/password, Google OAuth, email verification, password reset, session management, and automatic workspace provisioning on signup.'),

      ...stepBox(1, 'Configure Supabase Auth', [
        'Enable Email provider: set "Confirm email" to YES',
        'Enable Google provider: add Google OAuth Client ID + Secret',
        'Set Site URL: NEXT_PUBLIC_APP_URL',
        'Set Redirect URLs: .../auth/callback, .../auth/verify-email',
        'Customize email templates: Confirmation, Magic Link, Password Reset',
      ]),

      ...stepBox(2, 'Build Auth Pages (UI)', [
        '/sign-in: Email+password form + "Continue with Google" button',
        '/sign-up: Full name + email + password + confirm password form',
        '/forgot-password: Email input → sends reset link',
        '/verify-email: Shows "check your inbox" message with resend option',
        'All forms use React Hook Form + Zod validation',
        'All forms show inline field errors and loading states',
        'Language switcher visible on auth pages (no login required)',
      ]),

      ...stepBox(3, 'Server Actions for Auth', [
        'signIn(email, password) → supabase.auth.signInWithPassword',
        'signUp(fullName, email, password) → supabase.auth.signUp',
        'signInWithGoogle() → supabase.auth.signInWithOAuth({ provider: "google" })',
        'signOut() → supabase.auth.signOut + redirect to /sign-in',
        'resetPassword(email) → supabase.auth.resetPasswordForEmail',
        'updatePassword(newPassword) → supabase.auth.updateUser',
      ]),

      ...stepBox(4, 'Auth Callback Route', [
        'app/auth/callback/route.ts: handles OAuth + email verification redirects',
        'Exchange code for session: supabase.auth.exchangeCodeForSession(code)',
        'On first login: check if profile exists → if not, trigger workspace creation',
        'Redirect to /dashboard after successful auth',
      ]),

      ...stepBox(5, 'Automatic Profile & Workspace Creation', [
        'Database trigger fires on auth.users INSERT',
        'Creates profile row with id, email, full_name, avatar_url',
        'Creates default workspace: "<Name>\'s Workspace"',
        'Inserts workspace_member row with role = "owner"',
        'Creates subscriptions row with plan = "legend", status = "trialing", trial_ends_at = now() + 14 days',
        'Creates user_preferences row with language = "en", theme = "system"',
      ]),

      ...stepBox(6, 'Session & Middleware Protection', [
        'src/middleware.ts: use @supabase/ssr createMiddlewareClient',
        'On every request: refresh session if expired',
        'Redirect unauthenticated users from protected routes to /sign-in',
        'Pass locale from cookie/header to next-intl middleware',
        'Matcher: apply middleware to all routes except /api, /_next, /static, /share/*',
      ]),

      ...stepBox(7, 'Profile Settings Page', [
        'Display and edit: full name, avatar (upload to Supabase Storage)',
        'Change email (requires re-verification)',
        'Change password (requires current password)',
        'Delete account with confirmation dialog',
        'Show active sessions and connected OAuth providers',
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 4 — i18n & THEMING
      // ══════════════════════════════════════════════════════
      ...phaseHeader(4, 'INTERNATIONALIZATION & THEMING', '1–2 Days', COLORS.warning),

      heading3('Goal'),
      body('Full Arabic (RTL) + English (LTR) support with proper direction switching, and Light / Dark / System theme system using CSS design tokens.'),

      ...stepBox(1, 'Configure next-intl', [
        'Install: npm install next-intl',
        'Create i18n.ts: locales = ["en", "ar"], defaultLocale = "en"',
        'Create middleware config: intlMiddleware({ locales, defaultLocale })',
        'Wrap app in NextIntlClientProvider in app/[locale]/layout.tsx',
        'Create navigation helpers: useRouter, usePathname from next-intl/navigation',
      ]),

      ...stepBox(2, 'Create Translation Files', [
        'messages/en.json — structured by feature area',
        'messages/ar.json — Arabic translations of every key',
        'Top-level keys: auth, dashboard, editor, nodes, billing, settings, errors, common',
        'Sub-keys: all button labels, headings, placeholders, tooltips, error messages, plan names',
        'Node category names and all 40+ node type labels in both languages',
        'Stripe billing copy: plan names, features, CTA buttons, trial messaging',
        'AI Assistant messages in both languages',
      ]),

      ...stepBox(3, 'RTL/LTR Layout Handling', [
        'Add dir attribute to html element based on locale: ar → dir="rtl", en → dir="ltr"',
        'Use logical CSS properties throughout: margin-inline-start instead of margin-left',
        'Tailwind: enable rtl: variant prefix for directional overrides',
        'React Flow canvas: does not need RTL override (coordinate system stays LTR)',
        'Sidebar positions flip: element library on right in RTL mode',
        'Properties panel appears on left in RTL mode',
        'Icons mirror where appropriate (arrows, chevrons) using CSS scale(-1)',
      ]),

      ...stepBox(4, 'Configure next-themes', [
        'Wrap app in ThemeProvider from next-themes in root layout',
        'Themes: "light" | "dark" | "system", defaultTheme = "system"',
        'All colors defined as CSS variables in globals.css under :root and .dark',
        'Canvas background, node colors, edge colors, panel backgrounds: all use var() tokens',
        'shadcn/ui components inherit theme automatically through CSS variables',
      ]),

      ...stepBox(5, 'Language & Theme Persistence', [
        'On language change: update user_preferences.language in Supabase + set cookie',
        'On theme change: update user_preferences.theme in Supabase + update next-themes',
        'On app load: read from user_preferences → set locale + theme before first render',
        'Language switcher: visible in dashboard navbar, settings page, and auth pages',
        'Theme toggle: sun/moon/system icon in navbar — always accessible',
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 5 — DASHBOARD
      // ══════════════════════════════════════════════════════
      ...phaseHeader(5, 'DASHBOARD', '2–3 Days', COLORS.success),

      heading3('Goal'),
      body('A professional main dashboard showing workflows, workspaces, stats, quick actions, and plan usage — the home base of the product.'),

      ...stepBox(1, 'Dashboard Layout', [
        'Top navbar: Logo | Workspace selector | Search | Theme toggle | Language switcher | Avatar menu',
        'Left sidebar (collapsible): Dashboard | Workflows | Workspaces | Billing | Settings',
        'Main content area: dynamic based on selected section',
        'Save sidebar collapsed state to user_preferences.editor_layout',
      ]),

      ...stepBox(2, 'Plan Usage Stats Bar', [
        'Card: Workflows used / limit (e.g. 7 / 20)',
        'Card: Custom elements used / limit',
        'Card: Collaborators in workspace / limit',
        'Card: Favorites / limit',
        'Card: AI Credits used / monthly limit',
        'Card: Version history snapshots count',
        'Show plan name badge + "Upgrade" CTA if not on Legend',
        'Trial banner: "X days left in your Legend trial" with countdown + upgrade button',
      ]),

      ...stepBox(3, 'Workflows List', [
        'Grid view (default) + List view toggle',
        'Each card: thumbnail preview, name, status badge, node count, last updated, owner avatar, collaborator avatars',
        'Status colors: Draft=gray, Active=green, Archived=orange, Published=blue',
        'Click card → opens workflow editor',
        'Hover card → shows action overlay: Edit, Duplicate, Archive, Delete, Share',
        'Sort options: Last modified, Name A-Z, Node count, Status',
        'Filter options: Status, Owner (me / all), Shared (with me / by me), Dashboard',
        'Search: real-time client-side search by name and description',
      ]),

      ...stepBox(4, 'Quick Actions Panel', [
        '"+ New Workflow" button → opens create dialog (name, description, dashboard, template)',
        '"+ New Dashboard" button → creates dashboard folder',
        '"Import JSON" button → file picker → parse JSON → create workflow',
        '"Open Template" button → browse template gallery',
        '"Invite Member" button → email invite to workspace',
      ]),

      ...stepBox(5, 'Workspace Management', [
        'Workspace switcher in navbar: list all workspaces user belongs to',
        '"Create Workspace" option in switcher',
        'Workspace Settings page: name, avatar, member management, roles',
        'Member table: name, email, role, joined date, remove/change-role actions',
        'Only Owner and Admin can invite/remove members',
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 6 — WORKFLOW EDITOR CORE
      // ══════════════════════════════════════════════════════
      ...phaseHeader(6, 'WORKFLOW EDITOR CORE', '3–4 Days', COLORS.accent),

      heading3('Goal'),
      body('Build the core editor: React Flow canvas, all panels, toolbar, keyboard shortcuts, undo/redo, auto-save, and export.'),

      ...stepBox(1, 'Editor Page Structure', [
        'Route: /[locale]/workflows/[workflowId]',
        'Full-screen layout: 100vh, no scrollbars',
        'Columns: [Library Sidebar] | [Canvas] | [Properties Panel]',
        'Top: Editor Toolbar (actions, status, share button)',
        'Bottom: Status bar (auto-save status, zoom level, selected count)',
        'All panels collapsible; state persisted in user_preferences',
      ]),

      ...stepBox(2, 'React Flow Canvas Configuration', [
        'Import: ReactFlow, Background, Controls, MiniMap from @xyflow/react',
        'Background: dot grid pattern, dark/light mode aware',
        'Controls: zoom in/out, fit view, lock/unlock',
        'MiniMap: thumbnail of full canvas, toggleable',
        'Enable: nodesDraggable, nodesConnectable, elementsSelectable',
        'Configure: snapToGrid=true, snapGrid=[15,15]',
        'Enable: multi-select via Shift+click and drag-select box',
        'Set defaultViewport: {x:0, y:0, zoom:1}',
        'Register all custom node types in nodeTypes object',
        'Register all custom edge types in edgeTypes object',
      ]),

      ...stepBox(3, 'Zustand Editor Store', [
        'nodes: Node[] — React Flow node array',
        'edges: Edge[] — React Flow edge array',
        'selectedNodeId: string | null',
        'selectedEdgeId: string | null',
        'panelState: {library: bool, properties: bool, layers: bool, comments: bool, history: bool}',
        'undoStack: snapshot[] — max 50 entries',
        'redoStack: snapshot[]',
        'isSaving: boolean',
        'lastSavedAt: Date | null',
        'Actions: setNodes, setEdges, addNode, updateNode, deleteNode, addEdge, deleteEdge',
        'Actions: undo, redo, pushToUndoStack, saveSnapshot',
      ]),

      ...stepBox(4, 'Undo / Redo System', [
        'Before any mutating action: push current {nodes, edges} snapshot to undoStack',
        'Undo: pop from undoStack → apply snapshot → push current to redoStack',
        'Redo: pop from redoStack → apply snapshot → push to undoStack',
        'Max stack depth: 50 snapshots per stack',
        'Keyboard: Ctrl+Z = undo, Ctrl+Shift+Z or Ctrl+Y = redo',
        'Toolbar buttons: Undo / Redo with disabled states',
      ]),

      ...stepBox(5, 'Auto-Save', [
        'Debounced save: 1500ms after last change triggers save',
        'Save function: upsert all workflow_nodes + workflow_edges to Supabase',
        'Also update workflows.updated_at and workflows.node_count',
        'Show save status in bottom status bar: "Saving..." → "Saved ✓" → timestamp',
        'On unmount: force final save before leaving editor',
        'Manual save button: Ctrl+S → immediate save',
        'Version snapshot: every 5 minutes of active editing → create workflow_versions entry',
      ]),

      ...stepBox(6, 'Copy / Paste Nodes', [
        'Ctrl+C: copy selected nodes and connected edges to clipboard state',
        'Ctrl+V: paste with 20px offset from original positions',
        'Generate new IDs for pasted nodes and edges',
        'Paste into current workflow only (no cross-workflow paste in v1)',
      ]),

      ...stepBox(7, 'Keyboard Shortcuts', [
        'Delete / Backspace: delete selected node or edge',
        'Ctrl+A: select all nodes',
        'Ctrl+Z / Ctrl+Y: undo/redo',
        'Ctrl+S: save',
        'Ctrl+C / Ctrl+V: copy/paste',
        'Ctrl+D: duplicate selected node',
        'Escape: deselect all / close dialogs',
        'Ctrl+Shift+F: fit view',
        'Ctrl+B: toggle Library sidebar',
        'Ctrl+P: toggle Properties panel',
        'Ctrl+M: toggle Minimap',
        'Show keyboard shortcut reference with "?" key',
      ]),

      ...stepBox(8, 'Export Functions', [
        'Export PNG: use html-to-image or @xyflow/react getViewportForBounds + canvas API',
        'Export SVG: serialize React Flow viewport to SVG string',
        'Export PDF: render to canvas → jsPDF → embed',
        'Export JSON: serialize {id, name, nodes, edges, metadata} to downloadable file',
        'Import JSON: file input → parse → validate schema → load nodes and edges',
        'Export options available in toolbar dropdown menu',
      ]),

      ...stepBox(9, 'Auto-Layout', [
        'Use dagre or elkjs for automatic node positioning',
        'Layout directions: Top-to-Bottom (default), Left-to-Right, Bottom-to-Top',
        'Apply auto-layout button in toolbar',
        'Preview layout before applying (show/hide toggle)',
        'Push undo snapshot before applying layout',
      ]),

      ...stepBox(10, 'History & Version Control Panel', [
        'History tab in collapsible side panel',
        'List workflow_versions ordered by created_at DESC',
        'Each entry: label, creator avatar, relative timestamp',
        'Click entry: preview that version in read-only overlay',
        'Restore version: push current state to undo stack, replace nodes/edges with snapshot',
        'Auto-generated version labels: "Auto-save" with increment counter',
        'User can name a version manually: "Before refactor", "Approved v2"',
        'Plan-gated depth: Free=3, Warrior=10, Elite=30, Champion=100, Legend=unlimited',
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 7 — NODE LIBRARY
      // ══════════════════════════════════════════════════════
      ...phaseHeader(7, 'NODE LIBRARY — 40+ NODES', '3–4 Days', COLORS.purple),

      heading3('Goal'),
      body('Build 6 node categories with 40+ node types, each with a dedicated React Flow custom node component, its own properties schema, and visual rendering.'),

      heading3('Complete Node Catalog'),

      makeTable(
        ['Category', 'Node Types', 'Count'],
        [
          ['Basic', 'Start, End, Process, Decision, Note, Group, Connector, Delay', '8'],
          ['Logic', 'If/Else, Switch, Loop, Parallel, Merge, Retry, Error Handler', '7'],
          ['Data', 'Input, Output, Variable, Table Lookup, Transform, Filter, Mapper', '7'],
          ['Integration', 'API Request, Webhook, Email, SMS, Slack/Discord, Database Query, File Upload, Google Sheets, CRM Action', '9'],
          ['Human', 'Form Step, Approval Step, User Task, Checklist, Attachment, Signature', '6'],
          ['AI', 'Generate Text, Classify, Extract Data, Summarize, Route Decision, AI Validator, AI Workflow Assistant', '7'],
        ],
        [15, 65, 10]
      ),

      ...emptyLine(1),

      ...stepBox(1, 'Node Component Architecture', [
        'Each node type = a React component extending React Flow NodeProps',
        'Common base: NodeWrapper component handles selection ring, drag handle, color band',
        'Each node renders: color-coded top band, icon, label, badge (type), handle ports',
        'Source handles: bottom or right; Target handles: top or left',
        'Decision node: has True/False handles on left and right outputs',
        'Error Handler node: has Main and Error output handles',
        'All nodes resize automatically if label is long',
        'Group node: renders as a transparent container — children nodes drag inside it',
      ]),

      ...stepBox(2, 'Properties Panel Schema per Node Type', [
        'Each node type exports a PropertiesSchema: array of field definitions',
        'Field definition: {key, label, type, required, default, options, validation, helpText}',
        'Field types: text, textarea, number, select, multi-select, boolean, code-editor, key-value, json, url',
        'Properties panel renders the schema dynamically using React Hook Form',
        'On field change: update node data in Zustand store → triggers debounced save',
      ]),

      heading4('Key Node Properties Examples'),
      bullet('API Request: method (GET/POST/PUT/DELETE/PATCH), url, headers (key-value), body (JSON editor), auth type (none/bearer/basic/API key), timeout, retry count, error branch label'),
      bullet('Decision: conditions array (field + operator + value), logical operator (AND/OR), fallback branch label, max branches'),
      bullet('Email: to (with variable support), subject, body (rich text or template), CC, BCC, attachments'),
      bullet('AI — Generate Text: model selector, system prompt, user prompt, max tokens, temperature, output variable name'),
      bullet('Form Step: field builder (add/remove fields), field types, required rules, assigned user or team, submit button label'),
      bullet('Loop: loop type (for-each/while/count), iteration variable, max iterations, break condition'),
      bullet('Database Query: connection string reference, query type (SELECT/INSERT/UPDATE/DELETE), query, parameters, result mapping'),

      ...stepBox(3, 'Library Sidebar Component', [
        'Collapsible left panel (280px width), toggle with Ctrl+B',
        'Top section: "Favorites" — starred nodes first',
        'Sections per category: collapsed by default, expand on click',
        'Each node item: color dot, icon, name',
        'Drag node item onto canvas: creates new node at drop position',
        'Click node item: creates node at center of visible viewport',
        'Search bar at top: filters all nodes across all categories in real time',
        'Custom Elements section: appears below system categories',
        'Each item has a ★ star icon for add/remove favorite',
      ]),

      ...stepBox(4, 'Node Visual Design System', [
        'Basic: gray (#6B7280) — simple shapes, rounded rect',
        'Logic: yellow (#D97706) — diamond decision shape',
        'Data: blue (#2563EB) — rectangular with data icon',
        'Integration: green (#16A34A) — cloud/connector icon',
        'Human: orange (#EA580C) — person silhouette icon',
        'AI: purple (#7C3AED) — sparkle/brain icon',
        'All nodes: white background in light mode, dark card in dark mode',
        'Selected state: 2px solid accent ring + shadow',
        'Hovered state: subtle elevation shadow',
        'Error state: red ring + error icon indicator',
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 8 — FAVORITES & CUSTOM ELEMENTS
      // ══════════════════════════════════════════════════════
      ...phaseHeader(8, 'FAVORITES & CUSTOM ELEMENTS', '2–3 Days', COLORS.warning),

      heading3('Goal'),
      body('Allow users to star frequently-used nodes and design completely custom node types with their own properties, icons, colors, and handles.'),

      ...stepBox(1, 'Favorites System', [
        'Any system node OR custom node can be favorited',
        'Star icon on each node in library sidebar — click to toggle',
        'Favorited nodes appear in "Favorites" section at top of library',
        'Favorites order: drag-to-reorder within the section',
        'Read favorites from user_favorite_nodes on editor load',
        'Write changes immediately to Supabase (not debounced)',
        'Enforce plan limit before adding: check count vs plan max',
        'Show toast error if limit reached: "Upgrade to add more favorites"',
      ]),

      makeTable(
        ['Plan', 'Max Favorites', 'Max Custom Elements', 'Workspace Sharing'],
        [
          ['Free', '5', '2', 'No'],
          ['Warrior', '20', '10', 'No'],
          ['Elite', '50', '50', 'Yes (read)'],
          ['Champion', '150', '200', 'Yes (full)'],
          ['Legend', 'Unlimited*', 'Unlimited*', 'Yes + private library'],
        ],
        [20, 20, 20, 30]
      ),

      ...emptyLine(1),

      ...stepBox(2, 'Custom Element Designer (UI)', [
        'Access: "Create Custom Element" button at bottom of library sidebar',
        'Multi-step modal / drawer with preview on right:',
        '  Step 1 — Basic Info: name, description, tags',
        '  Step 2 — Appearance: icon picker (lucide icons), color picker, size',
        '  Step 3 — Base Type: select which system node type to base it on',
        '  Step 4 — Default Properties: inherit from base type; override any field defaults',
        '  Step 5 — Handles: configure input handle count, output handle count, handle labels',
        '  Step 6 — Visibility: private or workspace (plan-gated)',
        'Live preview updates as user configures each step',
        'Save creates entry in custom_node_templates',
      ]),

      ...stepBox(3, 'Custom Element: Create from Existing Node', [
        'Right-click any node on canvas → "Save as Custom Element"',
        'Pre-fills the designer with: base_type, current properties, current style',
        'User only needs to name it and confirm',
        'Instantly available in library sidebar under Custom Elements section',
      ]),

      ...stepBox(4, 'Custom Elements Library Section', [
        'Appears below system categories in library sidebar',
        'Title: "My Elements" (personal) + "Workspace Elements" (shared, Elite+)',
        'Each item: colored dot, custom icon, name, edit icon (pencil), delete icon (trash)',
        'Edit → opens designer with existing values pre-filled',
        'Delete → confirm dialog → removes from custom_node_templates',
        'Drag onto canvas → creates node instance with all default properties applied',
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 9 — REAL-TIME COLLABORATION
      // ══════════════════════════════════════════════════════
      ...phaseHeader(9, 'REAL-TIME COLLABORATION', '3–4 Days', COLORS.danger),

      heading3('Goal'),
      body('Multiple users edit the same workflow simultaneously with live presence indicators, cursor tracking, instant node sync, and comments.'),

      ...stepBox(1, 'Supabase Realtime Channels Setup', [
        'One Realtime channel per workflow: workflow:{workflowId}',
        'Channel types used: Presence (who is online) + Broadcast (cursor/activity events) + Postgres Changes (node/edge mutations)',
        'Subscribe on editor mount; unsubscribe on editor unmount',
        'Handle reconnection: re-subscribe and re-fetch full workflow state on reconnect',
      ]),

      ...stepBox(2, 'Presence System', [
        'On editor open: track user in Presence with: {userId, fullName, avatarUrl, color}',
        'Assign each collaborator a unique color from predefined palette (8 colors)',
        'Show avatar stack in editor toolbar: "3 people are editing"',
        'Hover avatar → show name tooltip',
        'On editor close: presence auto-removes (Supabase handles cleanup)',
        'If user is Viewer: still show in presence but with "👁 Viewing" label',
      ]),

      ...stepBox(3, 'Live Cursor Tracking', [
        'Broadcast cursor position on mousemove (throttled to 30fps)',
        'Payload: {userId, x, y, color, name}',
        'Render other users\' cursors as SVG cursor icons with name label',
        'Cursors move smoothly using CSS transitions',
        'Only visible within the canvas viewport',
        'Do not broadcast when user is typing in Properties panel',
      ]),

      ...stepBox(4, 'Node & Edge Sync', [
        'Listen to Postgres Changes on workflow_nodes and workflow_edges tables',
        'On INSERT: add new node/edge to local React Flow state',
        'On UPDATE: update node/edge data/position in local state',
        'On DELETE: remove node/edge from local state',
        'Conflict resolution: last-write-wins (Supabase timestamp wins)',
        'Optimistic update: apply locally first, then sync to DB',
        'On optimistic update conflict: rollback to server state with visual feedback',
      ]),

      ...stepBox(5, 'Comments System', [
        'Floating comment threads: anchored to specific nodes or canvas coordinates',
        'Comment bubble visible on canvas as colored dot with count badge',
        'Click bubble → opens comment thread popover',
        'Thread supports: reply, resolve, mention (@username)',
        'New comments broadcast via Realtime to all users in channel',
        'Resolved comments collapse (can be re-opened)',
        'Unresolved comments count shown in Comments panel',
        'Comments panel: filterable list — all, mine, resolved, unresolved, by node',
        'Only Editor+ can post comments; Viewer can only read',
        'Commenter role can post comments but not edit nodes',
      ]),

      ...stepBox(6, 'Activity Log', [
        'Every significant action writes to workflow_activity table',
        'Actions logged: node_created, node_deleted, node_moved, edge_created, edge_deleted, workflow_shared, member_role_changed, status_changed, version_saved, comment_added',
        'Activity panel: chronological feed, avatar + action description + relative time',
        'Filter by: actor, action type, date range',
        'Realtime updates: new activities appear at top of feed without refresh',
      ]),

      ...stepBox(7, 'Permission Enforcement in Editor', [
        'Fetch user\'s role for this workflow on editor load',
        'Owner/Editor: full canvas interaction, all toolbar actions enabled',
        'Commenter: canvas read-only, comment buttons enabled, no node/edge changes',
        'Viewer: canvas read-only, all edit UI hidden, comment panel visible but read-only',
        'All server actions re-check permissions server-side (never trust client)',
        'Show role badge in editor toolbar: "You are editing as Commenter"',
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 10 — BILLING & PLANS
      // ══════════════════════════════════════════════════════
      ...phaseHeader(10, 'BILLING & SUBSCRIPTION PLANS', '2–3 Days', COLORS.success),

      heading3('Goal'),
      body('Full Stripe integration with 5 tiered plans, 14-day free trial on Legend, graceful downgrade on trial expiry, and plan-gated feature enforcement.'),

      heading3('Plan Feature Matrix'),

      makeTable(
        ['Feature', 'Free', 'Warrior', 'Elite', 'Champion', 'Legend'],
        [
          ['Workflows', '3', '20', '75', '250', 'Unlimited*'],
          ['Nodes / Workflow', '50', '250', '1,000', '5,000', 'Very Large'],
          ['Dashboards', '1', '5', '20', '100', 'Unlimited*'],
          ['Collaborators', 'View only', '3', '10', '30', 'Large teams'],
          ['Custom Elements', '2', '10', '50', '200', 'Unlimited*'],
          ['Favorites', '5', '20', '50', '150', 'Unlimited*'],
          ['Version History', '3 versions', '10', '30', '100', 'Unlimited'],
          ['AI Credits / mo', '10', '50', '200', '500', '2,000'],
          ['Export formats', 'JSON only', '+ PNG', '+ SVG', '+ PDF', 'All formats'],
          ['Realtime collab', 'No', 'No', 'Yes', 'Yes', 'Yes'],
          ['Share links', 'No', 'Yes', 'Yes', 'Yes', 'Yes'],
          ['Priority support', 'No', 'No', 'No', 'Yes', 'Yes'],
        ],
        [30, 12, 12, 12, 12, 12]
      ),

      ...emptyLine(1),

      ...stepBox(1, 'Stripe Product & Price Setup', [
        'Create 4 Products in Stripe: Warrior, Elite, Champion, Legend',
        'Each product: Monthly recurring price + Annual recurring price (with discount)',
        'Store Price IDs in environment variables',
        'Create Stripe Customer on workspace creation (or on first checkout)',
        'Store stripe_customer_id in workspaces table',
      ]),

      ...stepBox(2, '14-Day Legend Trial Logic', [
        'On new user signup: subscriptions row created with plan=legend, status=trialing, trial_ends_at = now()+14 days',
        'No credit card required for trial',
        'Daily cron job (Supabase scheduled function): check trial_ends_at',
        'If trial expired and no active Stripe subscription: downgrade to plan=free, status=active',
        'On trial expiry: send email "Your trial has ended — upgrade to keep access"',
        'Trial banner in dashboard: "X days remaining in your Legend trial" + Upgrade CTA',
        '3-day warning email: "Only 3 days left!"',
      ]),

      ...stepBox(3, 'Stripe Checkout Flow', [
        'User clicks "Upgrade" or selects plan on /billing page',
        'Server action creates Stripe Checkout Session with: customer_id, price_id, success_url, cancel_url',
        'Redirect user to Stripe-hosted checkout page',
        'On success: Stripe sends checkout.session.completed webhook',
        'Webhook handler: update subscriptions row with new plan, stripe_subscription_id, status=active',
        'Redirect user back to /billing with success banner',
      ]),

      ...stepBox(4, 'Stripe Webhook Handler', [
        'Route: /api/stripe/webhook (POST)',
        'Verify Stripe-Signature header with STRIPE_WEBHOOK_SECRET',
        'Handle events:',
        '  checkout.session.completed → activate subscription',
        '  customer.subscription.updated → update plan and period dates',
        '  customer.subscription.deleted → downgrade to free',
        '  invoice.payment_failed → mark status=past_due, send email',
        '  invoice.paid → renew AI credits for the month',
      ]),

      ...stepBox(5, 'Plan Limit Enforcement', [
        'Create planLimits.ts: export PLAN_LIMITS object with all limits per plan',
        'Create checkPlanLimit(workspaceId, resource) server function',
        'Enforce limits BEFORE creating: workflows, nodes, dashboards, collaborators, custom elements, favorites, version snapshots',
        'If limit reached: return 403 with specific error code + user-friendly message',
        'Client shows: "You\'ve reached the Warrior plan limit. Upgrade to Elite for 75 workflows."',
        'Show upgrade modal instead of generic error',
      ]),

      ...stepBox(6, 'Billing Page (/billing)', [
        'Current plan: name, status, renewal date',
        'Usage summary: visual progress bars for each metered resource',
        'Plan comparison table: all plans side-by-side',
        'Upgrade / Downgrade / Cancel buttons',
        'Invoice history: list of past invoices with download PDF links (from Stripe)',
        'Payment method management: link to Stripe Customer Portal',
        '"Manage Subscription" button → Stripe Customer Portal',
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 11 — AI ASSISTANT
      // ══════════════════════════════════════════════════════
      ...phaseHeader(11, 'AI ASSISTANT', '2–3 Days', COLORS.purple),

      heading3('Goal'),
      body('An integrated AI assistant using OpenAI GPT-4o that can generate workflows from descriptions, analyze existing workflows, and suggest improvements — with credit-based usage metering.'),

      ...stepBox(1, 'AI Chat Panel in Editor', [
        'Collapsible right-side panel: "AI Assistant"',
        'Chat interface: scrollable history, input box at bottom, send button',
        'Shows remaining AI credits in panel header',
        'Typing indicator (animated dots) while waiting for response',
        'Each response shows: credits used for this message',
        'Link to upgrade if credits depleted',
      ]),

      ...stepBox(2, 'AI Action: Generate Workflow from Text', [
        'User types: "Create a customer onboarding workflow with email verification and approval step"',
        'Server action: send description + available node types to GPT-4o',
        'System prompt: include full node type catalog, schema format instructions',
        'GPT-4o returns: JSON {nodes: [...], edges: [...]} following React Flow schema',
        'Validate returned JSON against schema',
        'Apply to canvas: clear current canvas OR create in new workflow (user chooses)',
        'Push undo snapshot before applying',
        'Cost: 10 credits per generate request',
      ]),

      ...stepBox(3, 'AI Action: Analyze Workflow (Error Detection)', [
        'Triggered by: "Analyze my workflow" or clicking Analyze button in toolbar',
        'Send current {nodes, edges} JSON to GPT-4o with analysis prompt',
        'GPT-4o identifies:',
        '  - Nodes with no outgoing connections (dead ends)',
        '  - Incomplete Decision branches (missing fallback)',
        '  - Potential infinite loops',
        '  - Disconnected subgraphs (unreachable nodes)',
        '  - Overly complex paths (depth > threshold)',
        'Returns: array of issues with severity (error/warning/info) and node_id reference',
        'Display: overlay error badges on affected nodes + list in AI panel',
        'Cost: 5 credits per analysis',
      ]),

      ...stepBox(4, 'AI Action: Suggest Improvements', [
        'Context: current workflow purpose + nodes/edges',
        'GPT-4o returns: 3-5 specific suggestions',
        'Each suggestion: description + optional auto-apply button',
        'Auto-apply: adds suggested nodes/edges with confirmation',
        'Examples: "Add an Error Handler after your API Request node", "The Loop node may need a max-iterations limit"',
        'Cost: 5 credits per suggestion request',
      ]),

      ...stepBox(5, 'AI Action: Generate Node Descriptions', [
        'Right-click any node → "Generate Description with AI"',
        'Sends node type + properties to GPT-4o',
        'Returns: 1-2 sentence plain English description of what this node does in context',
        'Applied to node\'s description field',
        'Cost: 1 credit per node',
      ]),

      ...stepBox(6, 'AI Action: Auto-Layout Suggestion', [
        'AI analyzes node relationships and flow direction',
        'Suggests optimal layout: "This workflow reads best top-to-bottom"',
        'One-click apply suggested layout direction',
        'Cost: 2 credits',
      ]),

      ...stepBox(7, 'Credit Metering System', [
        'Each AI action deducts credits from workspace monthly allowance',
        'Check credits BEFORE calling OpenAI API',
        'If insufficient credits: block action + show upgrade prompt',
        'After successful OpenAI call: INSERT into ai_requests table with credits_used',
        'Subtract from plan_usage.ai_credits_used',
        'Monthly reset: on invoice.paid webhook → reset ai_credits_used to 0',
        'AI Credits per plan: Free=10, Warrior=50, Elite=200, Champion=500, Legend=2000',
      ]),

      ...stepBox(8, 'AI API Route', [
        'Route: /api/ai/[action] (POST)',
        'Auth check: verify session + workspace membership',
        'Plan check: verify credits available',
        'Call OpenAI: stream response for long generations',
        'Parse response: validate JSON structure',
        'Log to ai_requests table',
        'Deduct credits',
        'Return result to client',
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 12 — SHARING & PERMISSIONS
      // ══════════════════════════════════════════════════════
      ...phaseHeader(12, 'SHARING & PERMISSIONS', '2 Days', COLORS.accent),

      ...stepBox(1, 'Invite by Email', [
        'Share dialog in editor toolbar: "Share" button',
        'Input: email address + role selector (Editor / Commenter / Viewer)',
        'Server: check if email is existing user → if yes, create workflow_shares row',
        'If new user: send invite email with sign-up link that pre-fills the share',
        'List current collaborators with role badges and remove option',
        'Only Owner can change roles or remove members',
      ]),

      ...stepBox(2, 'Public Share Link', [
        'Generate unique share_token (UUID) → store in workflow_shares',
        'Share link: APP_URL/share/[shareId]',
        'Link role options: Viewer (default) or Commenter',
        'Optional: set expiry date',
        'Plan-gated: Warrior+ can create share links',
        'Revoke link: delete the workflow_shares row (link immediately breaks)',
        'Copy link button with clipboard API',
      ]),

      ...stepBox(3, 'Public View Route (/share/[shareId])', [
        'No auth required for Viewer links',
        'Auth required for Commenter links (prompt to sign in)',
        'Fetch workflow via share_token — verify not expired',
        'Load read-only React Flow canvas',
        'Show: workflow name, creator, last updated',
        'Comments visible; add comment button if Commenter role',
        'No Library sidebar, no Properties panel, no Toolbar actions',
        'Show "Sign up to edit" CTA for unauthenticated viewers',
        'Show workflow node count, description',
      ]),

      ...stepBox(4, 'Role Enforcement Summary', []),
      makeTable(
        ['Action', 'Owner', 'Admin', 'Editor', 'Commenter', 'Viewer'],
        [
          ['View workflow', '✓', '✓', '✓', '✓', '✓'],
          ['Create/edit nodes', '✓', '✓', '✓', '✗', '✗'],
          ['Create/edit edges', '✓', '✓', '✓', '✗', '✗'],
          ['Post comments', '✓', '✓', '✓', '✓', '✗'],
          ['Resolve comments', '✓', '✓', '✓', '✗', '✗'],
          ['Export workflow', '✓', '✓', '✓', '✗', '✗'],
          ['Share workflow', '✓', '✓', '✗', '✗', '✗'],
          ['Change member roles', '✓', '✓', '✗', '✗', '✗'],
          ['Delete workflow', '✓', '✗', '✗', '✗', '✗'],
          ['Restore version', '✓', '✓', '✓', '✗', '✗'],
        ],
        [30, 14, 14, 14, 14, 14]
      ),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 13 — MOBILE & TABLET
      // ══════════════════════════════════════════════════════
      ...phaseHeader(13, 'MOBILE & TABLET UX', '2 Days', COLORS.warning),

      ...stepBox(1, 'Responsive Breakpoints', [
        'Mobile: < 768px  — View + Comments only, no canvas editing',
        'Tablet: 768px – 1024px — Limited editing, panels as drawers',
        'Desktop: > 1024px — Full editor experience',
        'Use Tailwind responsive prefixes: sm:, md:, lg:, xl:',
        'Detect screen size with useWindowSize hook',
      ]),

      ...stepBox(2, 'Mobile View Mode (< 768px)', [
        'Show: workflow name, status badge, collaborators',
        'Canvas: pan and pinch-zoom with touch gestures ONLY (no editing)',
        'Tap a node: show bottom sheet with node label and description (read-only)',
        'Tap comment bubble: open comment thread in bottom sheet',
        'Bottom navigation bar: Overview | Comments | Info',
        'Show friendly banner at top: "Full editing available on desktop or tablet"',
        'Theme toggle and language switcher accessible from top bar',
        'Dashboard accessible on mobile: view list of workflows, no create/edit',
      ]),

      ...stepBox(3, 'Tablet Editing (768px – 1024px)', [
        'Library sidebar: hidden by default, opens as left drawer on button tap',
        'Properties panel: hidden by default, opens as right drawer on node tap',
        'Toolbar: condensed, show only icon buttons (no text labels)',
        'Minimap: hidden by default, toggle button in toolbar',
        'Touch: support two-finger pan, pinch-to-zoom on canvas',
        'Node drag: works with touch events via React Flow built-in support',
        'Keyboard: show keyboard shortcut sheet on "?" tap (not primary interaction)',
      ]),

      ...stepBox(4, 'RTL Mobile Adaptations', [
        'In Arabic (RTL): bottom navigation labels read right-to-left',
        'Bottom sheet slides up from bottom (direction-agnostic)',
        'Drawers: library from right side, properties from left side (mirrored from desktop)',
        'All text alignment: right-aligned in Arabic',
        'Icon mirrors: directional icons (arrows, chevrons) flipped with CSS',
      ]),

      ...stepBox(5, 'Touch Accessibility', [
        'Minimum touch target: 44x44px for all interactive elements',
        'Node tap area: slightly larger than visual node size (padding for touch)',
        'Scrollable panels: momentum scrolling on iOS (webkit-overflow-scrolling: touch)',
        'Prevent accidental zoom on double-tap in editor: touch-action: manipulation',
        'Haptic feedback: not native (PWA limitation) but clear visual confirmation',
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 14 — QA & TESTING
      // ══════════════════════════════════════════════════════
      ...phaseHeader(14, 'QA & TESTING CHECKLIST', '2–3 Days', COLORS.danger),

      heading3('Functional Test Suite'),
      body('The agent must verify every item below before marking a feature complete.'),

      heading4('Authentication Tests'),
      bullet('Sign up with email/password → email verification sent → verify → redirect to dashboard'),
      bullet('Sign in with Google → profile created → workspace created → redirect to dashboard'),
      bullet('Forgot password → reset email → reset → new password works'),
      bullet('Protected routes redirect to /sign-in when unauthenticated'),
      bullet('Session persists across browser refresh and tabs'),

      heading4('Workspace & Profile Tests'),
      bullet('Default workspace created on first signup automatically'),
      bullet('Profile name and avatar can be updated'),
      bullet('Workspace name can be changed by owner'),
      bullet('Member invite by email works — invited user sees workflow after sign-in'),
      bullet('Role change reflected immediately for active collaborators'),

      heading4('Editor Functional Tests'),
      bullet('Drag node from library → drops at cursor position'),
      bullet('Connect two nodes → edge appears with arrow'),
      bullet('Click node → Properties panel shows correct fields for that node type'),
      bullet('Edit property → node data updates on canvas'),
      bullet('Delete node → all connected edges also removed'),
      bullet('Undo → previous state restored → redo → action re-applied'),
      bullet('Auto-save triggers within 2 seconds of last change'),
      bullet('Ctrl+S → immediate save → "Saved" status appears'),
      bullet('Export PNG → downloads file → image contains all visible nodes'),
      bullet('Export JSON → import same JSON → workflow identical'),
      bullet('Auto-layout → nodes rearranged → undo restores original layout'),
      bullet('Version history → save snapshot → restore → workflow reverts correctly'),

      heading4('Realtime Collaboration Tests'),
      bullet('Open workflow in two browsers → both users visible in presence avatars'),
      bullet('User A moves a node → User B sees it move within 1 second'),
      bullet('User A deletes an edge → User B sees edge disappear'),
      bullet('User A posts a comment → User B sees comment bubble appear'),
      bullet('Viewer cannot move nodes → drag is blocked'),
      bullet('Commenter can post comment → cannot move nodes'),
      bullet('Close browser → presence avatar disappears for other users'),

      heading4('Plan & Billing Tests'),
      bullet('New user has 14-day Legend trial — all Legend features accessible'),
      bullet('Trial ends → plan downgraded to Free → Free limits enforced'),
      bullet('Attempt to create 4th workflow on Free plan → blocked with upgrade prompt'),
      bullet('Stripe checkout → payment succeeds → plan upgraded immediately'),
      bullet('Stripe webhook: subscription.deleted → plan downgraded'),
      bullet('AI credits depleted → AI actions blocked → upgrade prompt shown'),
      bullet('Monthly invoice paid → AI credits reset to plan maximum'),

      heading4('i18n & Theme Tests'),
      bullet('Switch to Arabic → all UI text in Arabic → layout flips to RTL'),
      bullet('Switch to English → all UI text in English → layout flips to LTR'),
      bullet('Language preference persisted after sign-out and sign-in'),
      bullet('Dark mode → all surfaces dark → canvas grid dark → node text readable'),
      bullet('Light mode → all surfaces light → editor panels light'),
      bullet('System mode → follows OS preference → changes dynamically'),

      heading4('Mobile & Tablet Tests'),
      bullet('Mobile (<768px): library sidebar not shown → canvas is view-only → tap node shows bottom sheet'),
      bullet('Mobile: "Editing available on desktop" message shown'),
      bullet('Tablet (768px-1024px): panels open as drawers → node drag works with touch'),
      bullet('Arabic RTL on mobile: text right-aligned → drawers flipped'),
      bullet('Pinch-to-zoom works on canvas on touch devices'),

      heading4('AI Tests'),
      bullet('Generate workflow from text → valid nodes and edges created on canvas'),
      bullet('Analyze workflow → identifies dead-end node → shows error badge'),
      bullet('Suggest improvements → shows actionable list → auto-apply adds node'),
      bullet('Generate node description → description applied to node'),
      bullet('Credits deducted after each AI action'),
      bullet('0 credits remaining → AI action blocked'),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // PHASE 15 — DEPLOY & LAUNCH
      // ══════════════════════════════════════════════════════
      ...phaseHeader(15, 'DEPLOY & LAUNCH', '1–2 Days', COLORS.primary),

      ...stepBox(1, 'Supabase Production Setup', [
        'Create new Supabase project (not the dev project)',
        'Run all migrations in order on production database',
        'Enable RLS on all tables',
        'Configure Auth providers (Google) with production redirect URIs',
        'Set up Supabase Storage bucket: avatars (public), workflow-exports (private)',
        'Enable Supabase Realtime for: workflow_nodes, workflow_edges, workflow_comments, workflow_activity',
        'Configure email templates for: welcome, reset password, invite, trial expiry',
      ]),

      ...stepBox(2, 'Stripe Live Mode Setup', [
        'Switch Stripe to live mode',
        'Create products and prices in live mode',
        'Set up live webhook endpoint pointing to production URL',
        'Update STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET with live keys',
        'Test checkout with real card (then refund)',
      ]),

      ...stepBox(3, 'Vercel Deployment', [
        'Connect GitHub repo to Vercel project',
        'Set all environment variables in Vercel dashboard (all .env.local values)',
        'Set NEXTAUTH_URL = production domain',
        'Enable Vercel Analytics',
        'Set up custom domain with SSL',
        'Configure Vercel Cron Job for trial expiry checker (daily at midnight)',
      ]),

      ...stepBox(4, 'Pre-Launch Checklist', [
        '[ ] All 15 phases completed and tested',
        '[ ] Supabase RLS verified — test with restricted user account',
        '[ ] Stripe webhooks firing correctly in live mode',
        '[ ] Trial logic verified: signup → 14 days → downgrade',
        '[ ] Email deliverability tested (welcome email, reset email)',
        '[ ] Mobile view tested on real iPhone and Android devices',
        '[ ] Arabic RTL layout tested end-to-end in production',
        '[ ] AI credits metering verified in production',
        '[ ] Error boundaries in place — no unhandled crashes',
        '[ ] Loading states on all async operations',
        '[ ] Empty states designed for: no workflows, no nodes, no collaborators',
        '[ ] 404 and 500 error pages designed and translated',
        '[ ] Performance: editor loads in < 3 seconds on standard connection',
        '[ ] Security: no API keys exposed to client bundle',
      ]),

      ...stepBox(5, 'Post-Launch Monitoring', [
        'Set up Vercel logs monitoring for API errors',
        'Set up Supabase dashboard alerts for database errors',
        'Monitor Stripe dashboard for failed payments',
        'Set up error tracking (Sentry or similar)',
        'Weekly review: AI credits usage, top workflows, trial conversion rate',
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════
      // APPENDIX: ROUTES & API
      // ══════════════════════════════════════════════════════
      heading1('APPENDIX A: COMPLETE ROUTE MAP'),
      divider(),

      makeTable(
        ['Route', 'Auth Required', 'Description'],
        [
          ['/[locale]/auth/sign-in', 'No', 'Email/password + Google sign-in'],
          ['/[locale]/auth/sign-up', 'No', 'New account registration'],
          ['/[locale]/auth/forgot-password', 'No', 'Password reset request'],
          ['/[locale]/auth/verify-email', 'No', 'Email verification confirmation'],
          ['/[locale]/dashboard', 'Yes', 'Main dashboard — workflows, stats'],
          ['/[locale]/workflows/[id]', 'Yes', 'Full workflow editor'],
          ['/[locale]/billing', 'Yes', 'Subscription management'],
          ['/[locale]/settings/profile', 'Yes', 'User profile settings'],
          ['/[locale]/settings/workspace', 'Yes', 'Workspace settings + members'],
          ['/[locale]/share/[shareId]', 'No*', 'Public read-only workflow view'],
          ['/api/stripe/webhook', 'No (Stripe sig)', 'Stripe event handler'],
          ['/api/ai/generate', 'Yes', 'AI workflow generation endpoint'],
          ['/api/ai/analyze', 'Yes', 'AI workflow analysis endpoint'],
          ['/api/ai/suggest', 'Yes', 'AI suggestion endpoint'],
          ['/auth/callback', 'No', 'OAuth + email verification handler'],
        ],
        [42, 16, 42]
      ),

      ...emptyLine(2),

      heading1('APPENDIX B: PLAN LIMITS REFERENCE'),
      divider(),

      makeTable(
        ['Limit Key', 'Free', 'Warrior', 'Elite', 'Champion', 'Legend'],
        [
          ['max_workflows', '3', '20', '75', '250', '9999'],
          ['max_nodes_per_workflow', '50', '250', '1000', '5000', '99999'],
          ['max_dashboards', '1', '5', '20', '100', '9999'],
          ['max_collaborators', '0', '3', '10', '30', '9999'],
          ['max_custom_elements', '2', '10', '50', '200', '9999'],
          ['max_favorites', '5', '20', '50', '150', '9999'],
          ['max_version_history', '3', '10', '30', '100', '9999'],
          ['ai_credits_monthly', '10', '50', '200', '500', '2000'],
          ['can_share_links', 'false', 'true', 'true', 'true', 'true'],
          ['can_realtime_collab', 'false', 'false', 'true', 'true', 'true'],
          ['can_export_pdf', 'false', 'false', 'true', 'true', 'true'],
          ['can_workspace_elements', 'false', 'false', 'true', 'true', 'true'],
        ],
        [30, 12, 12, 12, 12, 12]
      ),

      ...emptyLine(2),

      heading1('APPENDIX C: AI CREDIT COSTS'),
      divider(),

      makeTable(
        ['AI Action', 'Credits Used', 'Notes'],
        [
          ['Generate workflow from description', '10', 'Creates full node/edge graph'],
          ['Analyze workflow (error detection)', '5', 'Checks all nodes and edges'],
          ['Suggest improvements', '5', 'Returns 3-5 actionable suggestions'],
          ['Generate node description', '1', 'Per single node'],
          ['Summarize workflow', '3', 'Plain English summary'],
          ['Auto-layout suggestion', '2', 'Recommends optimal direction'],
          ['AI chat message', '2', 'Per message sent to assistant'],
        ],
        [40, 20, 40]
      ),

      ...emptyLine(2),

      // FINAL NOTE
      new Paragraph({
        spacing: { before: 300, after: 100 },
        shading: { type: ShadingType.SOLID, color: COLORS.primary },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: '  END OF AGENT EXECUTION PLAN  ', bold: true, size: 24, color: COLORS.white }),
        ],
      }),
      new Paragraph({
        spacing: { before: 0, after: 0 },
        shading: { type: ShadingType.SOLID, color: COLORS.accentLight },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: '  Follow phases sequentially. Every step must be completed before moving to the next phase.  ', size: 18, color: COLORS.accent }),
        ],
      }),

    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/mnt/user-data/outputs/Visual_Workflow_SaaS_Agent_Plan.docx', buf);
  console.log('Done!');
}).catch(console.error);
