import { CustomNode } from './CustomNode';
import { BoardNode } from './BoardNode';

export const nodeTypes = {
  // Board Node
  board: BoardNode,
  // Custom Reusable Templates
  custom_template: CustomNode,
  // Basic
  start: CustomNode,
  end: CustomNode,
  process: CustomNode,
  decision: CustomNode,
  note: CustomNode,
  group: CustomNode,
  delay: CustomNode,
  // Logic (kept in registry for existing workflows)
  if_else: CustomNode,
  switch: CustomNode,
  loop: CustomNode,
  parallel: CustomNode,
  merge: CustomNode,
  retry: CustomNode,
  error_handler: CustomNode,
  // Data (kept in registry for existing workflows)
  input: CustomNode,
  output: CustomNode,
  variable: CustomNode,
  transform: CustomNode,
  filter: CustomNode,
  mapper: CustomNode,
  // Integration (kept in registry for existing workflows)
  api_request: CustomNode,
  webhook: CustomNode,
  email: CustomNode,
  sms: CustomNode,
  slack: CustomNode,
  database: CustomNode,
  file_upload: CustomNode,
  google_sheets: CustomNode,
  // Human
  form_step: CustomNode,
  approval: CustomNode,
  user_task: CustomNode,
  checklist: CustomNode,
  signature: CustomNode,
  // AI (kept in registry for existing workflows)
  ai_generate: CustomNode,
  ai_classify: CustomNode,
  ai_extract: CustomNode,
  ai_summarize: CustomNode,
  ai_route: CustomNode,
  ai_validator: CustomNode,
  // Marketplace installed nodes use 'custom_template' type
};

export interface LibraryItem {
  type: keyof typeof nodeTypes;
  label: string;
  description: string;
  category: 'basic' | 'human' | 'board';
}

// General-purpose nodes catalog — shown in the editor Library Sidebar
export const nodeCatalog: LibraryItem[] = [
  // 0. Board
  { type: 'board', label: 'Whiteboard', description: 'Full-featured collaborative drawing board with shapes, text, freehand and real-time sync', category: 'board' },
  // 1. Basic Nodes
  { type: 'start', label: 'Start Trigger', description: 'Starting entrypoint trigger for visual flow', category: 'basic' },
  { type: 'process', label: 'Process Step', description: 'Apply a generic operational step', category: 'basic' },
  { type: 'decision', label: 'Decision Node', description: 'Split flow based on true/false choices', category: 'basic' },
  { type: 'delay', label: 'Delay Timer', description: 'Pause processing for a scheduled timeout', category: 'basic' },
  { type: 'note', label: 'Canvas Note', description: 'Add floating text cards and notes to canvas', category: 'basic' },
  { type: 'end', label: 'End Step', description: 'Terminate the active execution flow safely', category: 'basic' },

  // 2. Human Steps
  { type: 'email', label: 'Send Email', description: 'Send email notifications to team members', category: 'human' },
  { type: 'form_step', label: 'Wait for Form', description: 'Collect custom inputs from user forms', category: 'human' },
  { type: 'approval', label: 'Wait for Approval', description: 'Block steps until admin clicks approve', category: 'human' },
  { type: 'checklist', label: 'Checklist Step', description: 'Verify operational tasks checklist', category: 'human' },
  { type: 'signature', label: 'Sign Document', description: 'Enforce digital document approvals', category: 'human' },
];

// Marketplace seed catalog — advanced/specialized nodes moved to marketplace
export interface MarketplaceSeedItem {
  type: string;
  label: string;
  description: string;
  category: string;
  domain: string;
  tags: string[];
  icon: string;
  accentBar: string;
  badgeColor: string;
  colorClass: string;
}

export const MARKETPLACE_SEED_CATALOG: MarketplaceSeedItem[] = [
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
  { type: 'ai_route', label: 'AI Smart Route', description: 'Intelligently route paths based on prompt criteria', category: 'ai', domain: 'artificial-intelligence', tags: ['ai', 'routing', 'smart', 'prompt'], icon: 'ai', accentBar: 'bg-rose-500', badgeColor: 'bg-rose-500/10 text-rose-600', colorClass: 'border-rose-500/20 bg-background/90 text-rose-600 dark:border-rose-500/40' },
];

