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
  // Logic
  if_else: CustomNode,
  switch: CustomNode,
  loop: CustomNode,
  parallel: CustomNode,
  merge: CustomNode,
  retry: CustomNode,
  error_handler: CustomNode,
  // Data
  input: CustomNode,
  output: CustomNode,
  variable: CustomNode,
  transform: CustomNode,
  filter: CustomNode,
  mapper: CustomNode,
  // Integration
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
  // AI
  ai_generate: CustomNode,
  ai_classify: CustomNode,
  ai_extract: CustomNode,
  ai_summarize: CustomNode,
  ai_route: CustomNode,
  ai_validator: CustomNode,
};

export interface LibraryItem {
  type: keyof typeof nodeTypes;
  label: string;
  description: string;
  category: 'basic' | 'logic' | 'data' | 'integration' | 'human' | 'ai' | 'board';
}

export const nodeCatalog: LibraryItem[] = [
  // 0. Board
  { type: 'board', label: 'Whiteboard', description: 'Full-featured collaborative drawing board with shapes, text, freehand and real-time sync', category: 'board' },
  // 1. Basic Nodes
  { type: 'start', label: 'Start Trigger', description: 'Starting entrypoint trigger for visual flow', category: 'basic' },
  { type: 'process', label: 'Process Step', description: 'Apply a generic computational operation', category: 'basic' },
  { type: 'decision', label: 'Decision Node', description: 'Split flow based on true/false choices', category: 'basic' },
  { type: 'delay', label: 'Delay Timer', description: 'Pause processing for a scheduled timeout', category: 'basic' },
  { type: 'note', label: 'Canvas Note', description: 'Add floating markdown/text cards to canvas', category: 'basic' },
  { type: 'end', label: 'End Step', description: 'Terminate the active execution flow safely', category: 'basic' },

  // 2. Logic Nodes
  { type: 'if_else', label: 'If / Else', description: 'Branch paths evaluating custom conditions', category: 'logic' },
  { type: 'switch', label: 'Switch Case', description: 'Route inputs to multiple channels matching cases', category: 'logic' },
  { type: 'loop', label: 'For Loop', description: 'Iterate sequence array steps repeatedly', category: 'logic' },
  { type: 'parallel', label: 'Parallel Split', description: 'Launch parallel steps concurrently', category: 'logic' },
  { type: 'merge', label: 'Merge Paths', description: 'Join multiple pathways back into one', category: 'logic' },
  { type: 'retry', label: 'Retry Block', description: 'Attempt operations again on failure', category: 'logic' },

  // 3. Data Nodes
  { type: 'input', label: 'JSON Input', description: 'Declare incoming body data properties', category: 'data' },
  { type: 'output', label: 'JSON Output', description: 'Structure outgoing payload properties', category: 'data' },
  { type: 'variable', label: 'Set Variable', description: 'Assign variables to session memory', category: 'data' },
  { type: 'transform', label: 'Format Data', description: 'Reformat objects via simple mapping formulas', category: 'data' },
  { type: 'filter', label: 'Filter List', description: 'Remove items from lists violating conditions', category: 'data' },

  // 4. Integration Nodes
  { type: 'api_request', label: 'REST API', description: 'Execute external GET/POST HTTP endpoints', category: 'integration' },
  { type: 'webhook', label: 'Webhook Trigger', description: 'Await incoming webhook JSON alerts', category: 'integration' },
  { type: 'email', label: 'Send Email', description: 'Mail updates to workspace editors', category: 'integration' },
  { type: 'sms', label: 'Send SMS', description: 'Transmit mobile alerts to administrators', category: 'integration' },
  { type: 'database', label: 'Query DB', description: 'Execute SQL queries inside database records', category: 'integration' },
  { type: 'google_sheets', label: 'Google Sheets', description: 'Append rows or fetch tables from Sheets', category: 'integration' },

  // 5. Human Steps
  { type: 'form_step', label: 'Wait for Form', description: 'Collect custom inputs from user forms', category: 'human' },
  { type: 'approval', label: 'Wait for Approval', description: 'Block steps until Admin clicks Approve', category: 'human' },
  { type: 'checklist', label: 'Checklist Step', description: 'Verify operational tasks checklist lists', category: 'human' },
  { type: 'signature', label: 'Sign Document', description: 'Enforce digital document approvals', category: 'human' },

  // 6. AI Features
  { type: 'ai_generate', label: 'AI Generate', description: 'Generate high-fidelity GPT text answers', category: 'ai' },
  { type: 'ai_classify', label: 'AI Classify', description: 'Classify content into categories automatically', category: 'ai' },
  { type: 'ai_extract', label: 'AI Extract', description: 'Extract JSON entities from raw text content', category: 'ai' },
  { type: 'ai_summarize', label: 'AI Summarize', description: 'Condense long paragraphs into brief summaries', category: 'ai' },
  { type: 'ai_route', label: 'AI Smart Route', description: 'Intelligently route paths based on prompt criteria', category: 'ai' },
];
