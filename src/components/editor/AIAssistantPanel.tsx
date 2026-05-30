'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Shield,
  TrendingUp,
  RefreshCw,
  CreditCard,
  ArrowRight,
  Wand2,
  ScanSearch,
  BrainCircuit,
  Link2,
  Maximize2,
  LayoutTemplate,
  Wrench,
  ChevronDown,
  ChevronUp,
  Plus,
  Activity,
  GitBranch,
  Layers,
  BarChart3,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useReactFlow, type Node, type Edge } from '@xyflow/react';
import { useDialogStore } from '@/stores/dialogStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'system';
type ActionType = 'generate' | 'analyze' | 'suggest' | 'expand' | 'autoconnect';

interface AnalysisIssue {
  severity: 'error' | 'warning' | 'info';
  node_id: string | null;
  title: string;
  description: string;
  fix_suggestion?: string;
  fix_nodes?: Array<{ id: string; type: string; position: { x: number; y: number }; data: { label: string; description: string } }>;
  fix_edges?: Array<{ id: string; source: string; target: string; sourceHandle: string; targetHandle: string }>;
}

interface Suggestion {
  type: 'optimization' | 'security' | 'reliability' | 'ux' | 'performance';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affected_node_id?: string;
  affected_node_type?: string;
  nodes_to_add?: Array<{ id: string; type: string; position: { x: number; y: number }; data: { label: string; description: string } }>;
  edges_to_add?: Array<{ id: string; source: string; target: string; sourceHandle: string; targetHandle: string }>;
}

interface WorkflowStats {
  nodeCount: number;
  edgeCount: number;
  branchCount: number;
  parallelCount: number;
  nodeTypes: Record<string, number>;
  complexity: string;
}

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  action?: ActionType;
  data?: {
    nodes?: Node[];
    edges?: Edge[];
    issues?: AnalysisIssue[];
    suggestions?: Suggestion[];
    healthScore?: number;
    complexityRating?: string;
    stats?: WorkflowStats;
    expandedNodes?: Node[];
    expandedEdges?: Edge[];
    originalNodeId?: string;
    newEdges?: Edge[];
    nodesToAdd?: Node[];
    reasoning?: string;
    creditsUsed?: number;
    creditsRemaining?: number;
  };
  timestamp: Date;
  loading?: boolean;
}

interface AIAssistantPanelProps {
  workflowId: string;
  workspaceId: string;
  locale: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

const SEVERITY_CONFIG = {
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  info: { icon: Info, color: 'text-sky-400', bg: 'bg-sky-400/10 border-sky-400/20' },
};

const SUGGESTION_TYPE_CONFIG: Record<string, { icon: typeof Zap; color: string }> = {
  optimization: { icon: Zap, color: 'text-amber-400' },
  security: { icon: Shield, color: 'text-emerald-400' },
  reliability: { icon: RefreshCw, color: 'text-sky-400' },
  ux: { icon: Sparkles, color: 'text-purple-400' },
  performance: { icon: TrendingUp, color: 'text-rose-400' },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-400/15 text-red-400 border-red-400/30',
  medium: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
  low: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30',
};

const COMPLEXITY_OPTIONS = [
  { value: 'simple', label: 'Simple', labelAr: 'بسيط', description: '5-10 nodes', icon: '🟢' },
  { value: 'standard', label: 'Standard', labelAr: 'قياسي', description: '10-20 nodes', icon: '🟡' },
  { value: 'complex', label: 'Complex', labelAr: 'معقد', description: '18-35 nodes', icon: '🟠' },
  { value: 'enterprise', label: 'Enterprise', labelAr: 'مؤسسي', description: '25-50 nodes', icon: '🔴' },
];

const QUICK_ACTIONS = [
  {
    id: 'analyze',
    icon: ScanSearch,
    label: 'Analyze',
    labelAr: 'تحليل',
    description: 'Health check',
    descriptionAr: 'فحص الصحة',
    cost: 5,
    color: 'hover:border-amber-400/50 hover:bg-amber-400/5',
    iconColor: 'text-amber-400',
  },
  {
    id: 'suggest',
    icon: Lightbulb,
    label: 'Improve',
    labelAr: 'تحسين',
    description: 'Smart tips',
    descriptionAr: 'نصائح ذكية',
    cost: 5,
    color: 'hover:border-purple-400/50 hover:bg-purple-400/5',
    iconColor: 'text-purple-400',
  },
  {
    id: 'expand',
    icon: Maximize2,
    label: 'Expand',
    labelAr: 'توسيع',
    description: 'Zoom into node',
    descriptionAr: 'تكبير العقدة',
    cost: 10,
    color: 'hover:border-sky-400/50 hover:bg-sky-400/5',
    iconColor: 'text-sky-400',
  },
  {
    id: 'autoconnect',
    icon: Link2,
    label: 'Connect',
    labelAr: 'ربط',
    description: 'Smart links',
    descriptionAr: 'روابط ذكية',
    cost: 5,
    color: 'hover:border-emerald-400/50 hover:bg-emerald-400/5',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'enhance',
    icon: Wrench,
    label: 'Harden',
    labelAr: 'تقوية',
    description: 'Error handling',
    descriptionAr: 'معالجة الأخطاء',
    cost: 10,
    color: 'hover:border-rose-400/50 hover:bg-rose-400/5',
    iconColor: 'text-rose-400',
  },
  {
    id: 'templates',
    icon: LayoutTemplate,
    label: 'Templates',
    labelAr: 'قوالب',
    description: 'Pre-built',
    descriptionAr: 'جاهزة',
    cost: 10,
    color: 'hover:border-indigo-400/50 hover:bg-indigo-400/5',
    iconColor: 'text-indigo-400',
  },
];

const PROMPT_TEMPLATES = [
  { label: 'Employee Onboarding', labelAr: 'تهيئة الموظفين', prompt: 'Create a comprehensive employee onboarding workflow with HR approval, document signing, equipment provisioning, IT account creation, welcome email, orientation scheduling, and manager assignment. Include parallel processing for independent tasks and approval gates for compliance.' },
  { label: 'CI/CD Pipeline', labelAr: 'خط أنابيب CI/CD', prompt: 'Design a CI/CD deployment pipeline triggered by a webhook on git push. Include code linting, unit tests, integration tests, security scanning, Docker build, staging deployment, smoke tests, approval gate for production, blue-green production deployment, health monitoring, and rollback on failure.' },
  { label: 'Customer Support', labelAr: 'دعم العملاء', prompt: 'Build a customer support ticket workflow with AI-powered ticket classification (priority: urgent/high/normal/low), smart routing to specialized teams, SLA monitoring with escalation timers, auto-reply for common questions using AI, manager approval for refunds, satisfaction survey after resolution, and analytics reporting.' },
  { label: 'E-Commerce Order', labelAr: 'طلب تجارة إلكترونية', prompt: 'Create an e-commerce order fulfillment workflow: validate order → check inventory (parallel: check warehouse A and warehouse B) → process payment via API → handle payment failures with retry → send confirmation email + SMS in parallel → assign to shipping → track shipment → delivery confirmation → request review. Include error handling at every API step.' },
  { label: 'Content Approval', labelAr: 'موافقة المحتوى', prompt: 'Design a content publishing approval workflow: draft submission → AI content review (classify: safe/review/reject) → editor review with checklist → senior editor approval → legal compliance check → SEO optimization → parallel: schedule social media + publish to website + send newsletter → analytics tracking → performance report.' },
  { label: 'Invoice Processing', labelAr: 'معالجة الفواتير', prompt: 'Build an invoice processing workflow: receive invoice via webhook → AI extract (vendor, amount, date, line items) → validate against PO → if amount > $10,000: require VP approval → if amount > $50,000: require CFO approval → process payment via API → update accounting database → send payment confirmation → reconciliation check → archive document.' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function HealthScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth="3" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function CanvasStats({ nodes, edges, isRtl }: { nodes: Node[]; edges: Edge[]; isRtl: boolean }) {
  const types = nodes.map(n => n.type || 'unknown');
  const branchCount = types.filter(t => ['if_else', 'decision', 'switch', 'approval', 'error_handler'].includes(t)).length;
  const parallelCount = types.filter(t => t === 'parallel').length;

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white/3 rounded-xl border border-white/5 text-[10px] text-zinc-500 font-sans">
      <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{nodes.length} {isRtl ? 'عقد' : 'nodes'}</span>
      <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{edges.length} {isRtl ? 'روابط' : 'edges'}</span>
      <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{branchCount} {isRtl ? 'فروع' : 'branches'}</span>
      {parallelCount > 0 && <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{parallelCount}</span>}
    </div>
  );
}

function AnalysisResults({
  issues,
  healthScore,
  complexityRating,
  isRtl,
  onApplyFix,
}: {
  issues: AnalysisIssue[];
  healthScore?: number;
  complexityRating?: string;
  isRtl: boolean;
  onApplyFix: (fixNodes: Node[], fixEdges: Edge[]) => void;
}) {
  return (
    <div className="space-y-3 mt-2 font-sans">
      {/* Health Score Header */}
      {healthScore !== undefined && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/3">
          <HealthScoreRing score={healthScore} />
          <div>
            <p className="text-xs font-bold text-zinc-200">
              {isRtl ? 'نقاط الصحة' : 'Health Score'}
            </p>
            <p className="text-[10px] text-zinc-500">
              {complexityRating && (isRtl ? `التعقيد: ${complexityRating}` : `Complexity: ${complexityRating}`)}
            </p>
          </div>
        </div>
      )}

      {issues.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-400">
            {isRtl ? 'لم يتم العثور على أخطاء!' : 'No issues found!'}
          </p>
          <p className="text-xs text-zinc-500">
            {isRtl ? 'يبدو مخطط سير عملك ممتازاً ومكتملاً.' : 'Your workflow looks great.'}
          </p>
        </div>
      ) : (
        issues.map((issue, idx) => {
          const cfg = SEVERITY_CONFIG[issue.severity];
          const Icon = cfg.icon;
          const hasFix = (issue.fix_nodes && issue.fix_nodes.length > 0) || (issue.fix_edges && issue.fix_edges.length > 0);
          return (
            <div key={idx} className={cn('rounded-xl border p-3 flex gap-3', cfg.bg)}>
              <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', cfg.color)} />
              <div className="min-w-0 flex-1">
                <p className={cn('text-xs font-bold', cfg.color)}>{issue.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{issue.description}</p>
                {issue.fix_suggestion && (
                  <p className="text-[10px] text-zinc-500 mt-1 italic">💡 {issue.fix_suggestion}</p>
                )}
                {issue.node_id && (
                  <code className="text-[10px] text-zinc-500 mt-1 block">
                    {isRtl ? 'العقدة: ' : 'node: '}{issue.node_id}
                  </code>
                )}
                {hasFix && (
                  <Button
                    size="sm"
                    onClick={() => onApplyFix(
                      (issue.fix_nodes || []).map(n => ({ ...n, id: n.id, data: n.data, position: n.position })) as Node[],
                      (issue.fix_edges || []).map(e => ({ ...e, id: e.id })) as Edge[]
                    )}
                    className="mt-2 h-6 text-[10px] bg-white/10 hover:bg-white/15 text-zinc-300 rounded-lg gap-1 cursor-pointer border border-white/10"
                  >
                    <Wrench className="w-3 h-3" />
                    {isRtl ? 'تطبيق الإصلاح' : 'Apply Fix'}
                  </Button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function SuggestionResults({
  suggestions,
  isRtl,
  onApplySuggestion,
}: {
  suggestions: Suggestion[];
  isRtl: boolean;
  onApplySuggestion: (nodesToAdd: Node[], edgesToAdd: Edge[]) => void;
}) {
  if (suggestions.length === 0) {
    return (
      <p className="text-xs text-zinc-500 py-2 font-sans">
        {isRtl ? 'لا توجد اقتراحات تحسين حالياً.' : 'No suggestions at this time.'}
      </p>
    );
  }

  return (
    <div className="space-y-2 mt-2 font-sans">
      {suggestions.map((s, idx) => {
        const cfg = SUGGESTION_TYPE_CONFIG[s.type] || SUGGESTION_TYPE_CONFIG.optimization;
        const Icon = cfg.icon;
        const hasAction = (s.nodes_to_add && s.nodes_to_add.length > 0) || (s.edges_to_add && s.edges_to_add.length > 0);
        return (
          <div key={idx} className="rounded-xl border border-white/5 bg-white/3 p-3 flex gap-3">
            <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', cfg.color)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-bold text-zinc-200">{s.title}</p>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-semibold capitalize', PRIORITY_COLORS[s.priority])}>
                  {isRtl
                    ? (s.priority === 'high' ? 'عالية' : s.priority === 'medium' ? 'متوسطة' : 'منخفضة')
                    : s.priority}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{s.description}</p>
              {hasAction && (
                <Button
                  size="sm"
                  onClick={() => onApplySuggestion(
                    (s.nodes_to_add || []).map(n => ({ ...n, id: n.id, data: n.data, position: n.position })) as Node[],
                    (s.edges_to_add || []).map(e => ({ ...e, id: e.id })) as Edge[]
                  )}
                  className="mt-2 h-6 text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg gap-1 cursor-pointer border border-emerald-500/30"
                >
                  <Plus className="w-3 h-3" />
                  {isRtl ? 'تطبيق' : 'Apply'}
                  {s.nodes_to_add && <span className="text-emerald-500/60">+{s.nodes_to_add.length} {isRtl ? 'عقد' : 'nodes'}</span>}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GeneratedWorkflowPreview({
  nodes,
  edges,
  stats,
  onApply,
  onInsert,
  isRtl,
}: {
  nodes: Node[];
  edges: Edge[];
  stats?: WorkflowStats;
  onApply: () => void;
  onInsert: () => void;
  isRtl: boolean;
}) {
  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 mt-2 font-sans">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="w-4 h-4 text-emerald-400" />
        <p className="text-xs font-bold text-emerald-400">
          {isRtl ? 'تم توليد مسار العمل' : 'Workflow Generated'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-1.5 mb-3 text-[10px]">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg">
          <Layers className="w-3 h-3 text-emerald-400" />
          <span className="text-zinc-300 font-semibold">{nodes.length}</span>
          <span className="text-zinc-500">{isRtl ? 'عقد' : 'nodes'}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg">
          <Activity className="w-3 h-3 text-sky-400" />
          <span className="text-zinc-300 font-semibold">{edges.length}</span>
          <span className="text-zinc-500">{isRtl ? 'روابط' : 'edges'}</span>
        </div>
        {stats && (
          <>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg">
              <GitBranch className="w-3 h-3 text-amber-400" />
              <span className="text-zinc-300 font-semibold">{stats.branchCount}</span>
              <span className="text-zinc-500">{isRtl ? 'فروع' : 'branches'}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg">
              <BarChart3 className="w-3 h-3 text-purple-400" />
              <span className="text-zinc-300 font-semibold">{stats.parallelCount}</span>
              <span className="text-zinc-500">{isRtl ? 'متوازي' : 'parallel'}</span>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onApply}
          className="flex-1 h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg gap-1 cursor-pointer"
        >
          <Wand2 className="w-3.5 h-3.5" />
          {isRtl ? 'تطبيق على اللوحة' : 'Apply to Canvas'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onInsert}
          className="flex-1 h-8 text-xs border-white/10 hover:bg-white/5 rounded-lg gap-1 cursor-pointer text-zinc-300"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          {isRtl ? 'إدراج بجانب الحالي' : 'Insert Alongside'}
        </Button>
      </div>
    </div>
  );
}

function ExpandPreview({
  expandedNodes,
  expandedEdges,
  originalNodeId,
  onApply,
  isRtl,
}: {
  expandedNodes: Node[];
  expandedEdges: Edge[];
  originalNodeId: string;
  onApply: () => void;
  isRtl: boolean;
}) {
  return (
    <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-3 mt-2 font-sans">
      <div className="flex items-center gap-2 mb-2">
        <Maximize2 className="w-4 h-4 text-sky-400" />
        <p className="text-xs font-bold text-sky-400">
          {isRtl ? 'تم توسيع العقدة' : 'Node Expanded'}
        </p>
        <span className="text-[10px] text-zinc-500 ml-auto">
          {expandedNodes.length} {isRtl ? 'عقد' : 'nodes'} · {expandedEdges.length} {isRtl ? 'روابط' : 'edges'}
        </span>
      </div>
      <p className="text-[10px] text-zinc-500 mb-2">
        {isRtl
          ? `سيتم استبدال العقدة "${originalNodeId}" بتدفق فرعي مفصل`
          : `Will replace node "${originalNodeId}" with a detailed sub-flow`}
      </p>
      <Button
        size="sm"
        onClick={onApply}
        className="w-full h-8 text-xs bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg gap-1 cursor-pointer"
      >
        <Maximize2 className="w-3.5 h-3.5" />
        {isRtl ? 'تطبيق التوسيع' : 'Apply Expansion'}
      </Button>
    </div>
  );
}

function AutoConnectPreview({
  newEdges,
  nodesToAdd,
  reasoning,
  onApply,
  isRtl,
}: {
  newEdges: Edge[];
  nodesToAdd: Node[];
  reasoning: string;
  onApply: () => void;
  isRtl: boolean;
}) {
  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 mt-2 font-sans">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="w-4 h-4 text-emerald-400" />
        <p className="text-xs font-bold text-emerald-400">
          {isRtl ? 'تم تحديد الروابط الذكية' : 'Smart Connections Found'}
        </p>
      </div>
      <div className="text-[10px] text-zinc-500 mb-2 space-y-1">
        <p>+{newEdges.length} {isRtl ? 'روابط جديدة' : 'new connections'}</p>
        {nodesToAdd.length > 0 && <p>+{nodesToAdd.length} {isRtl ? 'عقد مساعدة' : 'helper nodes'}</p>}
        {reasoning && <p className="italic">💡 {reasoning}</p>}
      </div>
      <Button
        size="sm"
        onClick={onApply}
        className="w-full h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg gap-1 cursor-pointer"
      >
        <Link2 className="w-3.5 h-3.5" />
        {isRtl ? 'تطبيق الروابط' : 'Apply Connections'}
      </Button>
    </div>
  );
}

function CreditsChip({ used, limit, isRtl }: { used: number; limit: number; isRtl: boolean }) {
  const pct = Math.min((used / limit) * 100, 100);
  const color = pct > 80 ? 'text-red-400' : pct > 50 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="flex items-center gap-1.5 font-sans">
      <CreditCard className={cn('w-3.5 h-3.5', color)} />
      <span className={cn('text-xs font-semibold tabular-nums', color)}>
        {limit - used} <span className="text-zinc-500 font-normal">{isRtl ? 'رصيد متبقٍ' : 'credits left'}</span>
      </span>
    </div>
  );
}

function getOptimizedWorkflowContext(
  nodes: Node[],
  edges: Edge[],
  selectedNodeId: string | null,
  maxNodes = 40
) {
  // If we have fewer than maxNodes, just map and return all of them
  if (nodes.length <= maxNodes) {
    return {
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        data: { label: n.data?.label, description: n.data?.description },
        position: n.position,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    };
  }

  // Otherwise, extract a subgraph
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adjacencyList = new Map<string, string[]>();
  
  // Build bidirectional adjacency list for BFS
  for (const edge of edges) {
    if (!adjacencyList.has(edge.source)) adjacencyList.set(edge.source, []);
    if (!adjacencyList.has(edge.target)) adjacencyList.set(edge.target, []);
    adjacencyList.get(edge.source)!.push(edge.target);
    adjacencyList.get(edge.target)!.push(edge.source);
  }

  const visited = new Set<string>();
  const queue: string[] = [];

  // 1. Prioritize selected node
  if (selectedNodeId && nodeMap.has(selectedNodeId)) {
    queue.push(selectedNodeId);
    visited.add(selectedNodeId);
  }

  // 2. Also prioritize start nodes (triggers)
  const startNodes = nodes.filter(n => ['start', 'input', 'webhook'].includes(n.type || ''));
  for (const sn of startNodes) {
    if (visited.size >= maxNodes) break;
    if (!visited.has(sn.id)) {
      queue.push(sn.id);
      visited.add(sn.id);
    }
  }

  // 3. BFS Traversal
  let head = 0;
  while (head < queue.length && visited.size < maxNodes) {
    const currentId = queue[head++];
    const neighbors = adjacencyList.get(currentId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
        if (visited.size >= maxNodes) break;
      }
    }
  }

  // 4. Fill remaining space if BFS didn't reach maxNodes
  if (visited.size < maxNodes) {
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        visited.add(node.id);
        if (visited.size >= maxNodes) break;
      }
    }
  }

  // Get the selected node list
  const selectedNodes = nodes
    .filter(n => visited.has(n.id))
    .map(n => ({
      id: n.id,
      type: n.type,
      data: { label: n.data?.label, description: n.data?.description },
      position: n.position,
    }));

  // Filter edges to only include those between selected nodes
  const selectedEdges = edges
    .filter(e => visited.has(e.source) && visited.has(e.target))
    .map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }));

  return { nodes: selectedNodes, edges: selectedEdges };
}

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

function sanitizeGraphIds(newNodes: Node[], newEdges: Edge[]) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const idMap = new Map<string, string>();

  // 1. Map node IDs
  const sanitizedNodes = newNodes.map((n) => {
    let newId = n.id;
    if (!uuidRegex.test(n.id)) {
      newId = generateUUID();
      idMap.set(n.id, newId);
    }
    return {
      ...n,
      id: newId,
    };
  });

  // 2. Map edge IDs and connection references
  const sanitizedEdges = newEdges.map((e) => {
    let newId = e.id;
    if (!uuidRegex.test(e.id)) {
      newId = generateUUID();
    }
    const source = idMap.get(e.source) || e.source;
    const target = idMap.get(e.target) || e.target;
    return {
      ...e,
      id: newId,
      source,
      target,
    };
  });

  return { nodes: sanitizedNodes, edges: sanitizedEdges };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIAssistantPanel({ workflowId, workspaceId, locale }: AIAssistantPanelProps) {
  const isRtl = locale === 'ar';
  const { panels, nodes, edges, setNodes, setEdges, selectedNodeId, deleteNode, setHasUnsavedChanges } = useEditorStore();
  const { fitView } = useReactFlow();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: isRtl
        ? 'أهلاً! أنا مساعد الذكاء الاصطناعي المتقدم لمسار عملك. يمكنني إنشاء مسارات عمل معقدة مع تفرعات عميقة ومعالجة أخطاء، تحليل مسار عملك الحالي مع نقاط صحة، توسيع أي عقدة إلى تدفق فرعي مفصل، ربط العقد المنفصلة بذكاء، أو تطبيق اقتراحات التحسين بنقرة واحدة. ماذا تريد أن تفعل؟'
        : 'Hi! I\'m your advanced AI workflow architect. I can **generate** complex workflows with deep branching and error handling, **analyze** your canvas with health scores, **expand** any node into a detailed sub-flow, **auto-connect** disconnected nodes, or **apply** improvement suggestions with one click. What would you like to do?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(50);
  const [complexity, setComplexity] = useState('standard');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showComplexity, setShowComplexity] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages or loading state change
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    };
    scrollToBottom();
    const timer = setTimeout(scrollToBottom, 80);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  // Auto-resize textarea as the user types
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = { ...msg, id: generateId(), timestamp: new Date() };
    setMessages((prev) => [...prev, newMsg]);
    return newMsg.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  // ─── Helper: Apply nodes and edges to canvas ──────────────────────────────

  const applyNodesToCanvas = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    const { nodes: sanitizedNodes, edges: sanitizedEdges } = sanitizeGraphIds(newNodes, newEdges);
    if (sanitizedNodes.length > 0) {
      setNodes([...nodes, ...sanitizedNodes]);
    }
    if (sanitizedEdges.length > 0) {
      setEdges([...edges, ...sanitizedEdges]);
    }
    setHasUnsavedChanges(true);
    setTimeout(() => {
      try {
        fitView({ duration: 800 });
      } catch (err) {
        console.warn('fitView failed:', err);
      }
    }, 100);
  }, [nodes, edges, setNodes, setEdges, setHasUnsavedChanges, fitView]);

  // ─── Generate Action ─────────────────────────────────────────────────────

  const handleGenerate = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    addMessage({ role: 'user', content: prompt, action: 'generate' });
    setInput('');
    setShowTemplates(false);

    const loadingId = addMessage({
      role: 'assistant',
      content: '',
      loading: true,
      action: 'generate',
    });

    setIsLoading(true);
    try {
      const optimizedContext = getOptimizedWorkflowContext(nodes, edges, selectedNodeId, 40);
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          workflowId,
          workspaceId,
          complexity,
          existingNodes: optimizedContext.nodes,
          existingEdges: optimizedContext.edges,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        updateMessage(loadingId, {
          loading: false,
          content: data.details || data.message || (isRtl ? 'فشل توليد مسار العمل. يرجى المحاولة مرة أخرى.' : 'Failed to generate workflow. Please try again.'),
        });
        return;
      }

      if (data.creditsRemaining !== undefined) {
        setCreditsUsed((prev) => prev + (data.creditsUsed ?? 0));
        setCreditsLimit(data.creditsRemaining + data.creditsUsed + creditsUsed);
      }

      const stats = data.stats as WorkflowStats | undefined;
      const statsLine = stats
        ? (isRtl
            ? `**${stats.nodeCount} عقد** · **${stats.edgeCount} رابط** · **${stats.branchCount} فروع** · **${stats.parallelCount} متوازي**`
            : `**${stats.nodeCount} nodes** · **${stats.edgeCount} edges** · **${stats.branchCount} branches** · **${stats.parallelCount} parallel sections**`)
        : (isRtl
            ? `**${data.nodes.length} عقد** · **${data.edges.length} روابط**`
            : `**${data.nodes.length} nodes** · **${data.edges.length} connections**`);

      updateMessage(loadingId, {
        loading: false,
        content: isRtl
          ? `لقد صممت مسار عمل متقدم يحتوي على ${statsLine} بناءً على وصفك. اختر كيفية تطبيقه:`
          : `I've designed an advanced workflow with ${statsLine} based on your description. Choose how to apply it:`,
        data: {
          nodes: data.nodes,
          edges: data.edges,
          stats,
          creditsUsed: data.creditsUsed,
          creditsRemaining: data.creditsRemaining,
        },
      });
    } catch (err) {
      updateMessage(loadingId, {
        loading: false,
        content: isRtl
          ? `فشل الاتصال بخدمة الذكاء الاصطناعي. (${(err as Error).message})`
          : `Failed to connect to AI service. (${(err as Error).message})`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, workflowId, workspaceId, complexity, nodes, edges, selectedNodeId, addMessage, updateMessage, creditsUsed, isRtl]);

  // ─── Analyze Action ──────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (isLoading) return;

    addMessage({ role: 'user', content: isRtl ? 'تحليل مسار عملي مع نقاط صحة' : 'Analyze my workflow with health score', action: 'analyze' });

    const loadingId = addMessage({
      role: 'assistant',
      content: '',
      loading: true,
      action: 'analyze',
    });

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: nodes.map(n => ({
            id: n.id,
            type: n.type,
            data: { label: n.data?.label, description: n.data?.description },
            position: n.position,
          })),
          edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
          workflowId,
          workspaceId,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        updateMessage(loadingId, {
          loading: false,
          content: data.details || data.message || (isRtl ? 'فشل التحليل. يرجى المحاولة مرة أخرى.' : 'Analysis failed. Please try again.'),
        });
        return;
      }

      const issues: AnalysisIssue[] = data.issues || [];
      const healthScore = data.healthScore ?? 100;
      const complexityRating = data.complexityRating || 'unknown';
      const errorCount = issues.filter((i) => i.severity === 'error').length;
      const warnCount = issues.filter((i) => i.severity === 'warning').length;
      const infoCount = issues.filter((i) => i.severity === 'info').length;

      const summary = issues.length === 0
        ? (isRtl ? `نقاط الصحة: **${healthScore}/100** — مسار عملك لا يحتوي على أي مشاكل! 🎉` : `Health Score: **${healthScore}/100** — Your workflow has no issues! 🎉`)
        : (isRtl
            ? `نقاط الصحة: **${healthScore}/100** | ${errorCount} أخطاء · ${warnCount} تحذيرات · ${infoCount} ملاحظات`
            : `Health Score: **${healthScore}/100** | ${errorCount} errors · ${warnCount} warnings · ${infoCount} info`);

      if (data.creditsUsed) setCreditsUsed((prev) => prev + data.creditsUsed);

      updateMessage(loadingId, {
        loading: false,
        content: summary,
        data: {
          issues,
          healthScore,
          complexityRating,
          creditsUsed: data.creditsUsed,
          creditsRemaining: data.creditsRemaining,
        },
      });
    } catch (err) {
      updateMessage(loadingId, {
        loading: false,
        content: isRtl ? `خطأ في التحليل: ${(err as Error).message}` : `Analysis error: ${(err as Error).message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, nodes, edges, workflowId, workspaceId, addMessage, updateMessage, isRtl]);

  // ─── Suggest Action ──────────────────────────────────────────────────────

  const handleSuggest = useCallback(async () => {
    if (isLoading) return;

    addMessage({ role: 'user', content: isRtl ? 'اقتراح تحسينات قابلة للتطبيق' : 'Suggest actionable improvements', action: 'suggest' });

    const loadingId = addMessage({
      role: 'assistant',
      content: '',
      loading: true,
      action: 'suggest',
    });

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: nodes.map(n => ({
            id: n.id,
            type: n.type,
            data: { label: n.data?.label, description: n.data?.description },
            position: n.position,
          })),
          edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
          workflowId,
          workspaceId,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        updateMessage(loadingId, {
          loading: false,
          content: data.details || data.message || (isRtl ? 'تعذر توليد الاقتراحات.' : 'Could not generate suggestions.'),
        });
        return;
      }

      const suggestions: Suggestion[] = data.suggestions || [];
      if (data.creditsUsed) setCreditsUsed((prev) => prev + data.creditsUsed);

      const actionable = suggestions.filter(s => s.nodes_to_add && s.nodes_to_add.length > 0).length;

      updateMessage(loadingId, {
        loading: false,
        content: suggestions.length > 0
          ? (isRtl
              ? `إليك **${suggestions.length} اقتراحات تحسين** (${actionable} قابلة للتطبيق بنقرة واحدة):`
              : `Here are **${suggestions.length} improvement suggestions** (${actionable} one-click applicable):`)
          : (isRtl ? 'مسار عملك محسن بشكل ممتاز!' : 'Your workflow is well-optimized!'),
        data: { suggestions, creditsUsed: data.creditsUsed, creditsRemaining: data.creditsRemaining },
      });
    } catch (err) {
      updateMessage(loadingId, {
        loading: false,
        content: isRtl ? `خطأ: ${(err as Error).message}` : `Error: ${(err as Error).message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, nodes, edges, workflowId, workspaceId, addMessage, updateMessage, isRtl]);

  // ─── Expand Node Action ─────────────────────────────────────────────────

  const handleExpand = useCallback(async () => {
    if (isLoading) return;

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) {
      addMessage({
        role: 'assistant',
        content: isRtl
          ? '⚠️ يرجى تحديد عقدة على اللوحة أولاً لتوسيعها إلى تدفق فرعي مفصل.'
          : '⚠️ Please select a node on the canvas first to expand it into a detailed sub-flow.',
      });
      return;
    }

    if (['start', 'end', 'note', 'group'].includes(selectedNode.type || '')) {
      addMessage({
        role: 'assistant',
        content: isRtl
          ? '⚠️ لا يمكن توسيع عقد البداية/النهاية/الملاحظة/المجموعة. اختر عقدة عملية.'
          : '⚠️ Cannot expand start/end/note/group nodes. Select a process node.',
      });
      return;
    }

    addMessage({
      role: 'user',
      content: isRtl
        ? `توسيع العقدة "${selectedNode.data?.label || selectedNode.type}" إلى تدفق فرعي مفصل`
        : `Expand node "${selectedNode.data?.label || selectedNode.type}" into a detailed sub-flow`,
      action: 'expand',
    });

    const loadingId = addMessage({
      role: 'assistant',
      content: '',
      loading: true,
      action: 'expand',
    });

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node: { id: selectedNode.id, type: selectedNode.type, data: selectedNode.data, position: selectedNode.position },
          allNodes: nodes
            .filter(n => n.id === selectedNodeId || edges.some(e => (e.source === selectedNodeId && e.target === n.id) || (e.target === selectedNodeId && e.source === n.id)))
            .map(n => ({ id: n.id, type: n.type, data: { label: n.data?.label, description: n.data?.description } })),
          allEdges: edges
            .filter(e => e.source === selectedNodeId || e.target === selectedNodeId)
            .map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
          workflowId,
          workspaceId,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        updateMessage(loadingId, {
          loading: false,
          content: data.details || data.message || (isRtl ? 'فشل التوسيع.' : 'Expansion failed.'),
        });
        return;
      }

      if (data.creditsUsed) setCreditsUsed((prev) => prev + data.creditsUsed);

      updateMessage(loadingId, {
        loading: false,
        content: isRtl
          ? `تم توسيع "${selectedNode.data?.label}" إلى **${data.expanded_nodes?.length || 0} عقد** و **${data.expanded_edges?.length || 0} روابط**. سيتم استبدال العقدة الأصلية بالتدفق الفرعي المفصل.`
          : `Expanded "${selectedNode.data?.label}" into **${data.expanded_nodes?.length || 0} nodes** and **${data.expanded_edges?.length || 0} edges**. The original node will be replaced with the detailed sub-flow.`,
        data: {
          expandedNodes: data.expanded_nodes,
          expandedEdges: data.expanded_edges,
          originalNodeId: data.originalNodeId,
          creditsUsed: data.creditsUsed,
          creditsRemaining: data.creditsRemaining,
        },
      });
    } catch (err) {
      updateMessage(loadingId, {
        loading: false,
        content: isRtl ? `خطأ: ${(err as Error).message}` : `Error: ${(err as Error).message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, selectedNodeId, nodes, edges, workflowId, workspaceId, addMessage, updateMessage, isRtl]);

  // ─── Auto-Connect Action ────────────────────────────────────────────────

  const handleAutoConnect = useCallback(async () => {
    if (isLoading) return;

    if (nodes.length < 2) {
      addMessage({
        role: 'assistant',
        content: isRtl
          ? '⚠️ تحتاج إلى عقدتين على الأقل على اللوحة لاستخدام الربط الذكي.'
          : '⚠️ You need at least 2 nodes on the canvas to use smart connect.',
      });
      return;
    }

    addMessage({ role: 'user', content: isRtl ? 'ربط العقد المنفصلة بذكاء' : 'Smart-connect disconnected nodes', action: 'autoconnect' });

    const loadingId = addMessage({
      role: 'assistant',
      content: '',
      loading: true,
      action: 'autoconnect',
    });

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/autoconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: nodes.map(n => ({ id: n.id, type: n.type, data: { label: n.data?.label, description: n.data?.description }, position: n.position })),
          edges: edges.map(e => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
          workflowId,
          workspaceId,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        updateMessage(loadingId, {
          loading: false,
          content: data.details || data.message || (isRtl ? 'فشل الربط التلقائي.' : 'Auto-connect failed.'),
        });
        return;
      }

      if (data.creditsUsed) setCreditsUsed((prev) => prev + data.creditsUsed);

      const newEdgeCount = data.new_edges?.length || 0;
      const newNodeCount = data.nodes_to_add?.length || 0;

      updateMessage(loadingId, {
        loading: false,
        content: newEdgeCount > 0
          ? (isRtl
              ? `تم إيجاد **${newEdgeCount} روابط ذكية**${newNodeCount > 0 ? ` و **${newNodeCount} عقد مساعدة**` : ''}. راجع وطبق:`
              : `Found **${newEdgeCount} smart connections**${newNodeCount > 0 ? ` and **${newNodeCount} helper nodes**` : ''}. Review and apply:`)
          : (isRtl ? 'جميع العقد مترابطة بشكل جيد!' : 'All nodes are well-connected already!'),
        data: {
          newEdges: data.new_edges,
          nodesToAdd: data.nodes_to_add,
          reasoning: data.reasoning,
          creditsUsed: data.creditsUsed,
          creditsRemaining: data.creditsRemaining,
        },
      });
    } catch (err) {
      updateMessage(loadingId, {
        loading: false,
        content: isRtl ? `خطأ: ${(err as Error).message}` : `Error: ${(err as Error).message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, nodes, edges, workflowId, workspaceId, addMessage, updateMessage, isRtl]);

  // ─── Enhance (Auto-harden) Action ───────────────────────────────────────

  const handleEnhance = useCallback(async () => {
    if (isLoading) return;

    const prompt = isRtl
      ? 'أضف معالجة الأخطاء والمعالجة المتوازية والمراقبة إلى مسار العمل الحالي'
      : 'Add error handling, parallel processing, and monitoring to the current workflow';

    addMessage({ role: 'user', content: prompt, action: 'generate' });

    const loadingId = addMessage({
      role: 'assistant',
      content: '',
      loading: true,
      action: 'generate',
    });

    setIsLoading(true);
    try {
      const optimizedContext = getOptimizedWorkflowContext(nodes, edges, selectedNodeId, 45);
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Enhance the existing workflow by adding: 1) retry + error_handler nodes after every api_request and webhook node, 2) parallel + merge patterns for independent sequential tasks, 3) approval gates before sensitive operations. Keep existing nodes and extend them. Context: The existing workflow has ${nodes.length} nodes.`,
          workflowId,
          workspaceId,
          complexity: 'complex',
          existingNodes: optimizedContext.nodes,
          existingEdges: optimizedContext.edges,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        updateMessage(loadingId, {
          loading: false,
          content: data.details || data.message || (isRtl ? 'فشل التعزيز.' : 'Enhancement failed.'),
        });
        return;
      }

      if (data.creditsRemaining !== undefined) {
        setCreditsUsed((prev) => prev + (data.creditsUsed ?? 0));
      }

      updateMessage(loadingId, {
        loading: false,
        content: isRtl
          ? `تم تعزيز مسار العمل مع **${data.nodes?.length || 0} عقد** و **${data.edges?.length || 0} روابط** (معالجة أخطاء + متوازي + مراقبة).`
          : `Enhanced workflow with **${data.nodes?.length || 0} nodes** and **${data.edges?.length || 0} edges** (error handling + parallel + monitoring).`,
        data: {
          nodes: data.nodes,
          edges: data.edges,
          stats: data.stats,
          creditsUsed: data.creditsUsed,
          creditsRemaining: data.creditsRemaining,
        },
      });
    } catch (err) {
      updateMessage(loadingId, {
        loading: false,
        content: isRtl ? `خطأ: ${(err as Error).message}` : `Error: ${(err as Error).message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, nodes, edges, selectedNodeId, workflowId, workspaceId, addMessage, updateMessage, isRtl]);

  // ─── Apply Generated Workflow ────────────────────────────────────────────

  const handleApplyWorkflow = useCallback(async (genNodes: Node[], genEdges: Edge[], replace: boolean) => {
    const { nodes: sanitizedNodes, edges: sanitizedEdges } = sanitizeGraphIds(genNodes, genEdges);
    if (replace) {
      const title = isRtl ? 'تطبيق مسار العمل' : 'Apply Workflow';
      const message = isRtl
        ? 'سيؤدي هذا إلى استبدال اللوحة الحالية بمسار العمل المولد. هل أنت متأكد؟'
        : 'This will replace your current canvas with the generated workflow. Are you sure?';
      const confirmed = await useDialogStore.getState().showConfirm(title, message, {
        confirmText: isRtl ? 'تطبيق واستبدال' : 'Apply & Replace',
        cancelText: isRtl ? 'إلغاء' : 'Cancel'
      });
      if (!confirmed) return;
      setNodes(sanitizedNodes);
      setEdges(sanitizedEdges);
    } else {
      // Insert alongside: offset new nodes
      const offsetX = nodes.length > 0 ? 600 : 0;
      const offsetNodes = sanitizedNodes.map((n) => ({
        ...n,
        position: { x: n.position.x + offsetX, y: n.position.y },
      }));
      setNodes([...nodes, ...offsetNodes]);
      setEdges([...edges, ...sanitizedEdges]);
    }
    setHasUnsavedChanges(true);
    setTimeout(() => {
      try {
        fitView({ duration: 800 });
      } catch (err) {
        console.warn('fitView failed:', err);
      }
    }, 250);
  }, [nodes, edges, setNodes, setEdges, setHasUnsavedChanges, fitView, isRtl]);

  // ─── Apply Expansion ────────────────────────────────────────────────────

  const handleApplyExpansion = useCallback((expandedNodes: Node[], expandedEdges: Edge[], originalNodeId: string) => {
    const { nodes: sanitizedNodes, edges: sanitizedEdges } = sanitizeGraphIds(expandedNodes, expandedEdges);
    
    // Remove the original node
    deleteNode(originalNodeId);

    // Reconnect: find edges that were connected to the original node
    const incomingEdges = edges.filter(e => e.target === originalNodeId);
    const outgoingEdges = edges.filter(e => e.source === originalNodeId);

    // Add the expanded sub-flow nodes
    const currentNodes = nodes.filter(n => n.id !== originalNodeId);
    setNodes([...currentNodes, ...sanitizedNodes]);

    // Build new edges: expanded internal edges + reconnections
    const currentEdges = edges.filter(e => e.source !== originalNodeId && e.target !== originalNodeId);
    const reconnectEdges: Edge[] = [];

    // Connect incoming edges to the first expanded node
    if (sanitizedNodes.length > 0) {
      const firstNode = sanitizedNodes[0];
      for (const ie of incomingEdges) {
        reconnectEdges.push({
          ...ie,
          id: generateUUID(),
          target: firstNode.id,
          targetHandle: 'in',
        });
      }

      // Connect last expanded node(s) to outgoing edges
      const lastNode = sanitizedNodes[sanitizedNodes.length - 1];
      for (const oe of outgoingEdges) {
        reconnectEdges.push({
          ...oe,
          id: generateUUID(),
          source: lastNode.id,
          sourceHandle: 'out',
        });
      }
    }

    setEdges([...currentEdges, ...sanitizedEdges, ...reconnectEdges]);
    setHasUnsavedChanges(true);
    setTimeout(() => {
      try {
        fitView({ duration: 800 });
      } catch (err) {
        console.warn('fitView failed:', err);
      }
    }, 100);
  }, [nodes, edges, setNodes, setEdges, deleteNode, setHasUnsavedChanges, fitView]);

  // ─── Apply Auto-Connect ─────────────────────────────────────────────────

  const handleApplyAutoConnect = useCallback((newEdges: Edge[], nodesToAdd: Node[]) => {
    const { nodes: sanitizedNodes, edges: sanitizedEdges } = sanitizeGraphIds(nodesToAdd || [], newEdges || []);
    if (sanitizedNodes.length > 0) {
      setNodes([...nodes, ...sanitizedNodes]);
    }
    if (sanitizedEdges.length > 0) {
      setEdges([...edges, ...sanitizedEdges]);
    }
    setHasUnsavedChanges(true);
    setTimeout(() => {
      try {
        fitView({ duration: 800 });
      } catch (err) {
        console.warn('fitView failed:', err);
      }
    }, 100);
  }, [nodes, edges, setNodes, setEdges, setHasUnsavedChanges, fitView]);

  // ─── Submit handler ──────────────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;
    handleGenerate(input);
  }, [input, isLoading, handleGenerate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // ─── Quick Action Router ────────────────────────────────────────────────

  const handleQuickAction = useCallback((actionId: string) => {
    switch (actionId) {
      case 'analyze': handleAnalyze(); break;
      case 'suggest': handleSuggest(); break;
      case 'expand': handleExpand(); break;
      case 'autoconnect': handleAutoConnect(); break;
      case 'enhance': handleEnhance(); break;
      case 'templates': setShowTemplates(prev => !prev); break;
    }
  }, [handleAnalyze, handleSuggest, handleExpand, handleAutoConnect, handleEnhance]);

  if (!panels.aiAssistant) return null;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'absolute top-0 bottom-0 w-[380px] z-20 flex flex-col font-sans',
        'bg-zinc-950/95 backdrop-blur-xl border-l border-white/6',
        'shadow-2xl shadow-black/50',
        isRtl ? 'left-0 border-r border-l-0' : 'right-0'
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/6 bg-linear-to-r from-purple-500/10 to-sky-500/5 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-linear-to-br from-purple-500 to-sky-500 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
          <BrainCircuit className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left rtl:text-right">
          <h2 className="text-sm font-bold text-zinc-100 leading-tight">
            {isRtl ? 'المهندس الذكي' : 'AI Architect'}
          </h2>
          <p className="text-[10px] text-zinc-500">{isRtl ? 'مدعوم بواسطة Gemini 2.5 Flash' : 'Powered by Gemini 2.5 Flash'}</p>
        </div>
        <CreditsChip used={creditsUsed} limit={creditsLimit} isRtl={isRtl} />
      </div>

      {/* ── Canvas Stats ── */}
      <div className="px-3 pt-3 pb-1 shrink-0">
        <CanvasStats nodes={nodes} edges={edges} isRtl={isRtl} />
      </div>

      {/* ── Quick Action Buttons (3x2 grid) ── */}
      <div className="grid grid-cols-3 gap-1.5 px-3 pt-2 pb-2 shrink-0">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.id)}
              disabled={isLoading}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 px-1.5',
                'rounded-xl border border-white/6 bg-white/3',
                'transition-all duration-200 cursor-pointer',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                action.color,
                action.id === 'templates' && showTemplates && 'border-indigo-400/50 bg-indigo-400/10'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', action.iconColor)} />
              <span className="text-[10px] font-bold text-zinc-300 leading-tight">
                {isRtl ? action.labelAr : action.label}
              </span>
              <span className="text-[8px] text-zinc-600 leading-tight">
                {isRtl ? `${action.cost} رصيد` : `${action.cost} cr`}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Template Picker (collapsible) ── */}
      {showTemplates && (
        <div className="px-3 pb-2 shrink-0 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
          <p className="text-[10px] text-zinc-500 font-semibold px-1">
            {isRtl ? '📋 اختر قالب مسار عمل جاهز:' : '📋 Choose a pre-built workflow template:'}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {PROMPT_TEMPLATES.map((tpl, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(tpl.prompt);
                  setShowTemplates(false);
                  textareaRef.current?.focus();
                }}
                className="text-left rtl:text-right px-2.5 py-2 rounded-lg border border-white/5 bg-white/3 hover:bg-white/6 hover:border-indigo-400/30 transition-all duration-150 cursor-pointer"
              >
                <span className="text-[10px] font-semibold text-zinc-300 block leading-tight">
                  {isRtl ? tpl.labelAr : tpl.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Complexity Selector ── */}
      <div className="px-3 pb-2 shrink-0">
        <button
          onClick={() => setShowComplexity(prev => !prev)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/5 transition-all duration-150 cursor-pointer"
        >
          <span className="text-[10px] text-zinc-400">
            {isRtl ? 'مستوى التعقيد:' : 'Complexity:'}{' '}
            <span className="font-semibold text-zinc-200">
              {COMPLEXITY_OPTIONS.find(c => c.value === complexity)?.icon}{' '}
              {isRtl
                ? COMPLEXITY_OPTIONS.find(c => c.value === complexity)?.labelAr
                : COMPLEXITY_OPTIONS.find(c => c.value === complexity)?.label}
            </span>
          </span>
          {showComplexity ? <ChevronUp className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
        </button>
        {showComplexity && (
          <div className="mt-1 grid grid-cols-4 gap-1 animate-in slide-in-from-top-1 duration-150">
            {COMPLEXITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setComplexity(opt.value); setShowComplexity(false); }}
                className={cn(
                  'flex flex-col items-center py-1.5 px-1 rounded-lg border transition-all duration-150 cursor-pointer',
                  complexity === opt.value
                    ? 'border-purple-400/50 bg-purple-400/10 text-purple-400'
                    : 'border-white/5 bg-white/3 text-zinc-400 hover:bg-white/5'
                )}
              >
                <span className="text-sm">{opt.icon}</span>
                <span className="text-[9px] font-semibold">{isRtl ? opt.labelAr : opt.label}</span>
                <span className="text-[8px] text-zinc-600">{opt.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Message History ── */}
      <div ref={scrollRef} className="flex-1 px-3 overflow-y-auto custom-scrollbar">
        <div className="space-y-4 pb-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-2.5',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-linear-to-br from-purple-500 to-sky-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}

              <div className={cn('flex-1 min-w-0', msg.role === 'user' ? 'flex flex-col items-end' : '')}>
                {/* Bubble */}
                <div
                  className={cn(
                    'rounded-2xl px-3.5 py-2.5 max-w-[90%]',
                    msg.role === 'user'
                      ? 'bg-linear-to-br from-purple-600 to-sky-600 text-white rounded-tr-sm text-right rtl:text-right'
                      : 'bg-white/5 border border-white/6 text-zinc-300 rounded-tl-sm text-left rtl:text-right'
                  )}
                >
                  {msg.loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      <span className="text-xs text-zinc-400 animate-pulse">
                        {msg.action === 'expand' ? (isRtl ? 'جاري التوسيع...' : 'Expanding...') :
                         msg.action === 'autoconnect' ? (isRtl ? 'جاري الربط...' : 'Connecting...') :
                         msg.action === 'analyze' ? (isRtl ? 'جاري التحليل...' : 'Analyzing...') :
                         msg.action === 'suggest' ? (isRtl ? 'جاري التفكير...' : 'Thinking...') :
                         (isRtl ? 'جاري التصميم...' : 'Designing...')}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">
                      {msg.content.split('**').map((part, i) =>
                        i % 2 === 1 ? <strong key={i} className="font-bold text-white">{part}</strong> : part
                      )}
                    </p>
                  )}
                </div>

                {/* Rich data attachments */}
                {!msg.loading && msg.data && msg.role === 'assistant' && (
                  <div className="mt-1.5 w-full">
                    {/* Analysis Results with Health Score */}
                    {msg.data.issues && (
                      <AnalysisResults
                        issues={msg.data.issues}
                        healthScore={msg.data.healthScore}
                        complexityRating={msg.data.complexityRating}
                        isRtl={isRtl}
                        onApplyFix={applyNodesToCanvas}
                      />
                    )}

                    {/* Suggestions with One-Click Apply */}
                    {msg.data.suggestions && (
                      <SuggestionResults
                        suggestions={msg.data.suggestions}
                        isRtl={isRtl}
                        onApplySuggestion={applyNodesToCanvas}
                      />
                    )}

                    {/* Generated Workflow Preview */}
                    {msg.data.nodes && msg.data.edges && !msg.data.expandedNodes && (
                      <GeneratedWorkflowPreview
                        nodes={msg.data.nodes}
                        edges={msg.data.edges}
                        stats={msg.data.stats}
                        isRtl={isRtl}
                        onApply={() => handleApplyWorkflow(msg.data!.nodes!, msg.data!.edges!, true)}
                        onInsert={() => handleApplyWorkflow(msg.data!.nodes!, msg.data!.edges!, false)}
                      />
                    )}

                    {/* Expand Preview */}
                    {msg.data.expandedNodes && msg.data.expandedEdges && msg.data.originalNodeId && (
                      <ExpandPreview
                        expandedNodes={msg.data.expandedNodes}
                        expandedEdges={msg.data.expandedEdges}
                        originalNodeId={msg.data.originalNodeId}
                        isRtl={isRtl}
                        onApply={() => handleApplyExpansion(
                          msg.data!.expandedNodes!,
                          msg.data!.expandedEdges!,
                          msg.data!.originalNodeId!
                        )}
                      />
                    )}

                    {/* Auto-Connect Preview */}
                    {msg.data.newEdges && (
                      <AutoConnectPreview
                        newEdges={msg.data.newEdges}
                        nodesToAdd={msg.data.nodesToAdd || []}
                        reasoning={msg.data.reasoning || ''}
                        isRtl={isRtl}
                        onApply={() => handleApplyAutoConnect(
                          msg.data!.newEdges!,
                          msg.data!.nodesToAdd || []
                        )}
                      />
                    )}

                    {msg.data.creditsUsed !== undefined && (
                      <p className="text-[10px] text-zinc-600 mt-1.5 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        {isRtl ? `تم استخدام ${msg.data.creditsUsed} رصيد` : `Used ${msg.data.creditsUsed} credits`}
                      </p>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <span className="text-[9px] text-zinc-600 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* User avatar placeholder */}
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-zinc-300">
                    {isRtl ? 'أنت' : 'You'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="shrink-0 px-3">
        <div className="border-t border-white/6" />
      </div>

      {/* ── Generate prompt hint ── */}
      <div className="px-3 pt-2 pb-1 shrink-0">
        <p className="text-[10px] text-zinc-600 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-400" />
          {isRtl
            ? 'صف مسار العمل لتوليده بالذكاء الاصطناعي (10 رصيد)'
            : 'Describe a workflow to generate with AI (10 credits)'}
        </p>
      </div>

      {/* ── Input Area ── */}
      <div className="px-3 pb-4 pt-1 shrink-0">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRtl
                ? 'مثال: إنشاء مسار عمل لمعالجة الطلبات مع موافقة ومعالجة أخطاء ومعالجة متوازية...'
                : 'e.g. Create an order processing workflow with approvals, error handling, and parallel processing...'}
              disabled={isLoading}
              rows={2}
              maxLength={4000}
              style={{ overflow: 'auto', maxHeight: 200 }}
              className={cn(
                'w-full resize-none text-xs leading-relaxed rounded-xl',
                'bg-white/4 border-white/8 text-zinc-300 placeholder:text-zinc-600 text-left rtl:text-right',
                'focus:ring-1 focus:ring-purple-500/40 focus:border-purple-500/30',
                'transition-colors duration-200'
              )}
            />
            {input.length > 0 && (
              <span className={cn(
                'absolute bottom-1.5 text-[9px] tabular-nums font-mono',
                isRtl ? 'left-2' : 'right-2',
                input.length > 3500 ? 'text-red-400' : input.length > 2000 ? 'text-amber-400' : 'text-zinc-600'
              )}>
                {input.length}/4000
              </span>
            )}
          </div>
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={cn(
              'w-9 h-9 rounded-xl shrink-0 cursor-pointer',
              'bg-linear-to-br from-purple-600 to-sky-600',
              'hover:from-purple-500 hover:to-sky-500',
              'disabled:opacity-30 disabled:cursor-not-allowed',
              'shadow-lg shadow-purple-500/20 transition-all duration-200'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
