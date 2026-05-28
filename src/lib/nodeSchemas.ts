'use client';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'boolean'
  | 'key-value'
  | 'json'
  | 'url';

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  default?: string | number | boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
  helpText?: string;
}

export interface NodeSchema {
  type: string;
  category: 'basic' | 'logic' | 'data' | 'integration' | 'human' | 'ai';
  label: string;
  description: string;
  fields: FieldSchema[];
  inputs: { id: string; label?: string }[];
  outputs: { id: string; label?: string }[];
}

// 1. Basic Nodes
export const startSchema: NodeSchema = {
  type: 'start',
  category: 'basic',
  label: 'Start Trigger',
  description: 'Starting entrypoint trigger for visual flow',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'Start Trigger' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Explain the trigger condition...' },
  ],
  inputs: [],
  outputs: [{ id: 'out', label: 'Flow out' }],
};

export const endSchema: NodeSchema = {
  type: 'end',
  category: 'basic',
  label: 'End Step',
  description: 'Terminate the active execution flow safely',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'End Step' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Explain final actions...' },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [],
};

export const processSchema: NodeSchema = {
  type: 'process',
  category: 'basic',
  label: 'Process Step',
  description: 'Apply a generic computational operation',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'Process Step' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Explain operations...' },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [{ id: 'out', label: 'Flow out' }],
};

export const decisionSchema: NodeSchema = {
  type: 'decision',
  category: 'basic',
  label: 'Decision Node',
  description: 'Split flow based on true/false choices',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'Decision Node' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Explain decision context...' },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [
    { id: 'true', label: 'True Branch' },
    { id: 'false', label: 'False Branch' },
  ],
};

export const delaySchema: NodeSchema = {
  type: 'delay',
  category: 'basic',
  label: 'Delay Timer',
  description: 'Pause processing for a scheduled timeout',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'Delay Timer' },
    { key: 'delaySeconds', label: 'Wait Timeout (Seconds)', type: 'number', required: true, default: 5 },
    { key: 'description', label: 'Description', type: 'textarea' },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [{ id: 'out', label: 'Flow out' }],
};

export const noteSchema: NodeSchema = {
  type: 'note',
  category: 'basic',
  label: 'Canvas Note',
  description: 'Add floating markdown/text cards to canvas',
  fields: [
    { key: 'label', label: 'Note Title', type: 'text', required: true, default: 'Canvas Note' },
    { key: 'description', label: 'Note Text', type: 'textarea', placeholder: 'Type your markdown text here...' },
  ],
  inputs: [],
  outputs: [],
};

// 2. Logic Nodes
export const ifElseSchema: NodeSchema = {
  type: 'if_else',
  category: 'logic',
  label: 'If / Else',
  description: 'Branch paths evaluating custom conditions',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'If / Else' },
    { key: 'conditionKey', label: 'Variable Key', type: 'text', required: true, placeholder: 'e.g. user.age' },
    {
      key: 'operator',
      label: 'Comparison Operator',
      type: 'select',
      required: true,
      default: 'equals',
      options: [
        { label: 'Equals', value: 'equals' },
        { label: 'Greater Than', value: 'gt' },
        { label: 'Less Than', value: 'lt' },
        { label: 'Contains', value: 'contains' },
      ],
    },
    { key: 'comparisonValue', label: 'Value to Compare', type: 'text', required: true },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [
    { id: 'true', label: 'True Branch' },
    { id: 'false', label: 'False Branch' },
  ],
};

export const loopSchema: NodeSchema = {
  type: 'loop',
  category: 'logic',
  label: 'For Loop',
  description: 'Iterate sequence array steps repeatedly',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'For Loop' },
    { key: 'loopArrayKey', label: 'Array Variable Key', type: 'text', required: true, placeholder: 'e.g. itemsList' },
    { key: 'loopItemName', label: 'Loop Variable Item Name', type: 'text', default: 'item' },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [
    { id: 'loop', label: 'Loop Step' },
    { id: 'exit', label: 'Exit Loop' },
  ],
};

// 3. Data Nodes
export const inputSchema: NodeSchema = {
  type: 'input',
  category: 'data',
  label: 'JSON Input',
  description: 'Declare incoming body data properties',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'JSON Input' },
    { key: 'inputFormat', label: 'Validation Schema (JSON)', type: 'json' },
  ],
  inputs: [],
  outputs: [{ id: 'out', label: 'Flow out' }],
};

export const outputSchema: NodeSchema = {
  type: 'output',
  category: 'data',
  label: 'JSON Output',
  description: 'Structure outgoing payload properties',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'JSON Output' },
    { key: 'outputFormat', label: 'Output Schema (JSON)', type: 'json' },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [],
};

// 4. Integration Nodes
export const apiRequestSchema: NodeSchema = {
  type: 'api_request',
  category: 'integration',
  label: 'REST API Request',
  description: 'Execute external GET/POST HTTP endpoints',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'REST API Request' },
    {
      key: 'httpMethod',
      label: 'HTTP Method',
      type: 'select',
      required: true,
      default: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
      ],
    },
    { key: 'apiUrl', label: 'Endpoint URL', type: 'url', required: true, placeholder: 'https://api.example.com/endpoint' },
    { key: 'apiHeaders', label: 'Request Headers (Key-Value)', type: 'key-value' },
    { key: 'apiBody', label: 'JSON Body', type: 'json' },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [
    { id: 'success', label: 'Success Branch' },
    { id: 'error', label: 'Error Branch' },
  ],
};

export const databaseSchema: NodeSchema = {
  type: 'database',
  category: 'integration',
  label: 'Query DB',
  description: 'Execute SQL queries inside database records',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'Query DB' },
    { key: 'sqlQuery', label: 'SQL SELECT Query', type: 'textarea', required: true, default: "SELECT * FROM users WHERE status = 'active';" },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [{ id: 'out', label: 'Flow out' }],
};

export const emailSchema: NodeSchema = {
  type: 'email',
  category: 'integration',
  label: 'Send Email',
  description: 'Mail updates to workspace editors',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'Send Email' },
    { key: 'emailTo', label: 'Recipient Email Address', type: 'text', required: true, placeholder: 'user@example.com' },
    { key: 'emailSubject', label: 'Subject Line', type: 'text', required: true },
    { key: 'emailBody', label: 'Body message (Rich text)', type: 'textarea' },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [{ id: 'out', label: 'Flow out' }],
};

// 5. Human Nodes
export const formStepSchema: NodeSchema = {
  type: 'form_step',
  category: 'human',
  label: 'Wait for Form',
  description: 'Collect custom inputs from user forms',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'Wait for Form' },
    { key: 'formName', label: 'Form Display Name', type: 'text', required: true },
    { key: 'formInstructions', label: 'Instructions for user', type: 'textarea' },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [{ id: 'out', label: 'Flow out' }],
};

export const approvalSchema: NodeSchema = {
  type: 'approval',
  category: 'human',
  label: 'Wait for Approval',
  description: 'Block steps until Admin clicks Approve',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'Wait for Approval' },
    { key: 'approverEmail', label: 'Assignee Email (Admin)', type: 'text', required: true },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [
    { id: 'approve', label: 'Approved Branch' },
    { id: 'reject', label: 'Rejected Branch' },
  ],
};

// 6. AI Nodes
export const aiGenerateSchema: NodeSchema = {
  type: 'ai_generate',
  category: 'ai',
  label: 'AI Generate',
  description: 'Generate high-fidelity GPT text answers',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'AI Generate' },
    {
      key: 'aiModel',
      label: 'Model Engine',
      type: 'select',
      required: true,
      default: 'gpt-4o',
      options: [
        { label: 'GPT-4o (Standard)', value: 'gpt-4o' },
        { label: 'GPT-4o Mini (Fast)', value: 'gpt-4o-mini' },
        { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
        { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
      ],
    },
    { key: 'aiPrompt', label: 'System Instructions / Prompt', type: 'textarea', required: true },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [{ id: 'out', label: 'Flow out' }],
};

export const aiClassifySchema: NodeSchema = {
  type: 'ai_classify',
  category: 'ai',
  label: 'AI Classify',
  description: 'Classify content into categories automatically',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'AI Classify' },
    { key: 'classifyPrompt', label: 'Content to Classify', type: 'textarea', required: true },
    { key: 'categories', label: 'Target Categories (Comma-separated)', type: 'text', required: true, placeholder: 'e.g. Spam, Question, Urgent' },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [{ id: 'out', label: 'Flow out' }],
};

export const aiExtractSchema: NodeSchema = {
  type: 'ai_extract',
  category: 'ai',
  label: 'AI Extract',
  description: 'Extract JSON entities from raw text content',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'AI Extract' },
    { key: 'extractSource', label: 'Raw Source Text', type: 'textarea', required: true },
    { key: 'entitiesList', label: 'Entities to Extract (Comma-separated)', type: 'text', required: true, placeholder: 'e.g. Phone, Address, OrderID' },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [{ id: 'out', label: 'Flow out' }],
};

export const aiSummarizeSchema: NodeSchema = {
  type: 'ai_summarize',
  category: 'ai',
  label: 'AI Summarize',
  description: 'Condense long paragraphs into brief summaries',
  fields: [
    { key: 'label', label: 'Step Title', type: 'text', required: true, default: 'AI Summarize' },
    { key: 'summarizeSource', label: 'Source Text to summarize', type: 'textarea', required: true },
    { key: 'maxLength', label: 'Target Summary Length (Words)', type: 'number', default: 50 },
  ],
  inputs: [{ id: 'in', label: 'Flow in' }],
  outputs: [{ id: 'out', label: 'Flow out' }],
};

// Master Mapping Catalog (supports all 40+ standard/advanced types elegantly)
export const NODE_SCHEMAS: Record<string, NodeSchema> = {
  // Basic
  start: startSchema,
  end: endSchema,
  process: processSchema,
  decision: decisionSchema,
  delay: delaySchema,
  note: noteSchema,
  group: processSchema, // reuse process schemas as clean presets
  connector: processSchema,
  
  // Logic
  if_else: ifElseSchema,
  switch: ifElseSchema,
  loop: loopSchema,
  parallel: loopSchema,
  merge: processSchema,
  retry: processSchema,
  error_handler: ifElseSchema,

  // Data
  input: inputSchema,
  output: outputSchema,
  variable: processSchema,
  transform: processSchema,
  filter: ifElseSchema,
  mapper: processSchema,
  table_lookup: ifElseSchema,

  // Integration
  api_request: apiRequestSchema,
  webhook: apiRequestSchema,
  email: emailSchema,
  sms: emailSchema,
  database: databaseSchema,
  file_upload: processSchema,
  google_sheets: processSchema,
  slack: emailSchema,
  crm: processSchema,

  // Human
  form_step: formStepSchema,
  approval: approvalSchema,
  user_task: formStepSchema,
  checklist: formStepSchema,
  attachment: processSchema,
  signature: formStepSchema,

  // AI
  ai_generate: aiGenerateSchema,
  ai_classify: aiClassifySchema,
  ai_extract: aiExtractSchema,
  ai_summarize: aiSummarizeSchema,
  ai_route: ifElseSchema,
  ai_validator: ifElseSchema,
  ai_assistant: aiGenerateSchema,
};
