const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Read env variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Could not find NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Seed data based on nodeTypes.ts MARKETPLACE_SEED_CATALOG
const SEED_NODES = [
  // Logic Nodes
  { type: 'if_else', label: 'If / Else', description: 'Branch paths evaluating custom conditions', category: 'logic', domain: 'development', tags: ['logic', 'branching', 'conditions'], icon: 'branch', accentBar: 'bg-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600', colorClass: 'border-amber-500/20 bg-background/90 text-amber-600 dark:border-amber-500/40' },
  { type: 'switch', label: 'Switch Case', description: 'Route inputs to multiple channels matching cases', category: 'logic', domain: 'development', tags: ['logic', 'routing', 'switch'], icon: 'branch', accentBar: 'bg-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600', colorClass: 'border-amber-500/20 bg-background/90 text-amber-600 dark:border-amber-500/40' },
  { type: 'loop', label: 'For Loop', description: 'Iterate sequence array steps repeatedly', category: 'logic', domain: 'development', tags: ['logic', 'loop', 'iteration'], icon: 'loop', accentBar: 'bg-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600', colorClass: 'border-amber-500/20 bg-background/90 text-amber-600 dark:border-amber-500/40' },
  { type: 'parallel', label: 'Parallel Split', description: 'Launch parallel steps concurrently', category: 'logic', domain: 'development', tags: ['logic', 'parallel', 'concurrent'], icon: 'branch', accentBar: 'bg-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600', colorClass: 'border-amber-500/20 bg-background/90 text-amber-600 dark:border-amber-500/40' },
  { type: 'merge', label: 'Merge Paths', description: 'Join multiple pathways back into one', category: 'logic', domain: 'development', tags: ['logic', 'merge', 'join'], icon: 'branch', accentBar: 'bg-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600', colorClass: 'border-amber-500/20 bg-background/90 text-amber-600 dark:border-amber-500/40' },
  { type: 'retry', label: 'Retry Block', description: 'Attempt operations again on failure', category: 'logic', domain: 'development', tags: ['logic', 'retry', 'error-handling'], icon: 'loop', accentBar: 'bg-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600', colorClass: 'border-amber-500/20 bg-background/90 text-amber-600 dark:border-amber-500/40' },

  // Data Nodes
  { type: 'input', label: 'JSON Input', description: 'Declare incoming body data properties', category: 'data', domain: 'development', tags: ['data', 'json', 'input'], icon: 'data', accentBar: 'bg-sky-500', badgeColor: 'bg-sky-500/10 text-sky-600', colorClass: 'border-sky-500/20 bg-background/90 text-sky-600 dark:border-sky-500/40' },
  { type: 'output', label: 'JSON Output', description: 'Structure outgoing payload properties', category: 'data', domain: 'development', tags: ['data', 'json', 'output'], icon: 'data', accentBar: 'bg-sky-500', badgeColor: 'bg-sky-500/10 text-sky-600', colorClass: 'border-sky-500/20 bg-background/90 text-sky-600 dark:border-sky-500/40' },
  { type: 'variable', label: 'Set Variable', description: 'Assign variables to session memory', category: 'data', domain: 'development', tags: ['data', 'variable', 'memory'], icon: 'data', accentBar: 'bg-sky-500', badgeColor: 'bg-sky-500/10 text-sky-600', colorClass: 'border-sky-500/20 bg-background/90 text-sky-600 dark:border-sky-500/40' },
  { type: 'transform', label: 'Format Data', description: 'Reformat objects via simple mapping formulas', category: 'data', domain: 'development', tags: ['data', 'transform', 'mapping'], icon: 'data', accentBar: 'bg-sky-500', badgeColor: 'bg-sky-500/10 text-sky-600', colorClass: 'border-sky-500/20 bg-background/90 text-sky-600 dark:border-sky-500/40' },
  { type: 'filter', label: 'Filter List', description: 'Remove items from lists violating conditions', category: 'data', domain: 'development', tags: ['data', 'filter', 'list'], icon: 'data', accentBar: 'bg-sky-500', badgeColor: 'bg-sky-500/10 text-sky-600', colorClass: 'border-sky-500/20 bg-background/90 text-sky-600 dark:border-sky-500/40' },

  // Integration Nodes
  { type: 'api_request', label: 'REST API', description: 'Execute external GET/POST HTTP endpoints', category: 'integration', domain: 'development', tags: ['api', 'http', 'rest', 'integration'], icon: 'send', accentBar: 'bg-violet-500', badgeColor: 'bg-violet-500/10 text-violet-600', colorClass: 'border-violet-500/20 bg-background/90 text-violet-600 dark:border-violet-500/40' },
  { type: 'webhook', label: 'Webhook Trigger', description: 'Await incoming webhook JSON alerts', category: 'integration', domain: 'development', tags: ['webhook', 'trigger', 'integration'], icon: 'send', accentBar: 'bg-violet-500', badgeColor: 'bg-violet-500/10 text-violet-600', colorClass: 'border-violet-500/20 bg-background/90 text-violet-600 dark:border-violet-500/40' },
  { type: 'sms', label: 'Send SMS', description: 'Transmit mobile alerts to administrators', category: 'integration', domain: 'communication', tags: ['sms', 'notification', 'mobile'], icon: 'send', accentBar: 'bg-violet-500', badgeColor: 'bg-violet-500/10 text-violet-600', colorClass: 'border-violet-500/20 bg-background/90 text-violet-600 dark:border-violet-500/40' },
  { type: 'database', label: 'Query DB', description: 'Execute SQL queries inside database records', category: 'integration', domain: 'development', tags: ['database', 'sql', 'query'], icon: 'database', accentBar: 'bg-violet-500', badgeColor: 'bg-violet-500/10 text-violet-600', colorClass: 'border-violet-500/20 bg-background/90 text-violet-600 dark:border-violet-500/40' },
  { type: 'google_sheets', label: 'Google Sheets', description: 'Append rows or fetch tables from Sheets', category: 'integration', domain: 'productivity', tags: ['google', 'sheets', 'spreadsheet'], icon: 'data', accentBar: 'bg-violet-500', badgeColor: 'bg-violet-500/10 text-violet-600', colorClass: 'border-violet-500/20 bg-background/90 text-violet-600 dark:border-violet-500/40' },

  // AI Nodes
  { type: 'ai_generate', label: 'AI Generate', description: 'Generate high-fidelity AI text answers', category: 'ai', domain: 'artificial-intelligence', tags: ['ai', 'generate', 'gpt', 'text'], icon: 'ai', accentBar: 'bg-rose-500', badgeColor: 'bg-rose-500/10 text-rose-600', colorClass: 'border-rose-500/20 bg-background/90 text-rose-600 dark:border-rose-500/40' },
  { type: 'ai_classify', label: 'AI Classify', description: 'Classify content into categories automatically', category: 'ai', domain: 'artificial-intelligence', tags: ['ai', 'classify', 'categorize'], icon: 'ai', accentBar: 'bg-rose-500', badgeColor: 'bg-rose-500/10 text-rose-600', colorClass: 'border-rose-500/20 bg-background/90 text-rose-600 dark:border-rose-500/40' },
  { type: 'ai_extract', label: 'AI Extract', description: 'Extract structured entities from raw text content', category: 'ai', domain: 'artificial-intelligence', tags: ['ai', 'extract', 'nlp', 'entities'], icon: 'ai', accentBar: 'bg-rose-500', badgeColor: 'bg-rose-500/10 text-rose-600', colorClass: 'border-rose-500/20 bg-background/90 text-rose-600 dark:border-rose-500/40' },
  { type: 'ai_summarize', label: 'AI Summarize', description: 'Condense long paragraphs into brief summaries', category: 'ai', domain: 'artificial-intelligence', tags: ['ai', 'summarize', 'condense'], icon: 'ai', accentBar: 'bg-rose-500', badgeColor: 'bg-rose-500/10 text-rose-600', colorClass: 'border-rose-500/20 bg-background/90 text-rose-600 dark:border-rose-500/40' },
  { type: 'ai_route', label: 'AI Smart Route', description: 'Intelligently route paths based on prompt criteria', category: 'ai', domain: 'artificial-intelligence', tags: ['ai', 'routing', 'smart', 'prompt'], icon: 'ai', accentBar: 'bg-rose-500', badgeColor: 'bg-rose-500/10 text-rose-600', colorClass: 'border-rose-500/20 bg-background/90 text-rose-600 dark:border-rose-500/40' }
];

async function seed() {
  console.log('Seeding official marketplace nodes...');

  // 1. Fetch first profile ID as the author
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (profError) {
    console.error('Error fetching profile:', profError);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.error('Error: No profiles found in database. Please register a user first.');
    process.exit(1);
  }

  const authorId = profiles[0].id;
  console.log(`Using author ID: ${authorId} for official nodes.`);

  let insertedCount = 0;

  for (const node of SEED_NODES) {
    // Check if node already exists to avoid duplicates
    const { data: existing } = await supabase
      .from('marketplace_nodes')
      .select('id')
      .eq('base_type', node.type)
      .eq('name', node.label)
      .maybeSingle();

    if (existing) {
      console.log(`Node already exists: ${node.label} (${node.type})`);
      continue;
    }

    const installCount = Math.floor(Math.random() * 45) + 5;
    const avgRating = (Math.random() * 1.0 + 4.0).toFixed(2);
    const ratingCount = Math.floor(Math.random() * 9) + 1;

    const { error: insertError } = await supabase
      .from('marketplace_nodes')
      .insert({
        author_id: authorId,
        name: node.label,
        description: node.description,
        long_description: `# ${node.label}\n\nThis is an official advanced node in the Marketplace.\n\n### Features\n- Direct integration with workflow engines.\n- Configurable payload inputs.\n- Error handling hooks.`,
        category: node.category,
        domain: node.domain,
        tags: node.tags,
        icon: node.icon,
        color: 'bg-background',
        accent_bar: node.accentBar,
        badge_color: node.badgeColor,
        color_class: node.colorClass,
        base_type: node.type,
        default_data: {
          label: node.label,
          description: node.description,
          customNode: true
        },
        default_style: {
          accentBar: node.accentBar,
          badgeColor: node.badgeColor,
          colorClass: node.colorClass,
          iconName: node.icon
        },
        handles: {
          inputsCount: 1,
          outputsCount: 1
        },
        fields_schema: [
          { name: 'name', type: 'text', label: 'Node Label', required: true, defaultValue: node.label }
        ],
        visibility: 'public',
        status: 'published',
        is_free: true,
        price: 0.00,
        install_count: installCount,
        avg_rating: avgRating,
        rating_count: ratingCount,
        version: '1.0.0'
      });

    if (insertError) {
      console.error(`Failed to insert ${node.label}:`, insertError);
    } else {
      console.log(`Seeded node: ${node.label}`);
      insertedCount++;
    }
  }

  console.log(`Seeding complete. Seeded ${insertedCount} new nodes.`);
}

seed();
