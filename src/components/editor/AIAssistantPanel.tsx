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
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Node, Edge } from '@xyflow/react';

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'system';
type ActionType = 'generate' | 'analyze' | 'suggest';

interface AnalysisIssue {
  severity: 'error' | 'warning' | 'info';
  node_id: string | null;
  title: string;
  description: string;
}

interface Suggestion {
  type: 'optimization' | 'security' | 'reliability' | 'ux' | 'performance';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affected_node_type?: string;
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

const QUICK_ACTIONS = [
  {
    id: 'analyze',
    icon: ScanSearch,
    label: 'Analyze',
    description: 'Detect issues',
    cost: 5,
    color: 'hover:border-amber-400/50 hover:bg-amber-400/5',
    iconColor: 'text-amber-400',
  },
  {
    id: 'suggest',
    icon: Lightbulb,
    label: 'Improve',
    description: 'Get suggestions',
    cost: 5,
    color: 'hover:border-purple-400/50 hover:bg-purple-400/5',
    iconColor: 'text-purple-400',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnalysisResults({ issues, isRtl }: { issues: AnalysisIssue[]; isRtl: boolean }) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center font-sans">
        <CheckCircle className="w-8 h-8 text-emerald-400" />
        <p className="text-sm font-semibold text-emerald-400">
          {isRtl ? 'لم يتم العثور على أخطاء!' : 'No issues found!'}
        </p>
        <p className="text-xs text-zinc-500">
          {isRtl ? 'يبدو مخطط سير عملك ممتازاً ومكتملاً.' : 'Your workflow looks great.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-2 font-sans">
      {issues.map((issue, idx) => {
        const cfg = SEVERITY_CONFIG[issue.severity];
        const Icon = cfg.icon;
        return (
          <div key={idx} className={cn('rounded-xl border p-3 flex gap-3', cfg.bg)}>
            <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', cfg.color)} />
            <div className="min-w-0">
              <p className={cn('text-xs font-bold', cfg.color)}>{issue.title}</p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{issue.description}</p>
              {issue.node_id && (
                <code className="text-[10px] text-zinc-500 mt-1 block">
                  {isRtl ? 'العقدة: ' : 'node: '}{issue.node_id}
                </code>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SuggestionResults({ suggestions, isRtl }: { suggestions: Suggestion[]; isRtl: boolean }) {
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
  onApply,
  onInsert,
  isRtl,
}: {
  nodes: Node[];
  edges: Edge[];
  onApply: () => void;
  onInsert: () => void;
  isRtl: boolean;
}) {
  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 mt-2 font-sans">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-4 h-4 text-emerald-400" />
        <p className="text-xs font-bold text-emerald-400">
          {isRtl ? 'تم توليد مسار العمل' : 'Workflow Generated'}
        </p>
        <span className="text-xs text-zinc-500 ml-auto">
          {isRtl 
            ? `${nodes.length} عقد · ${edges.length} روابط` 
            : `${nodes.length} nodes · ${edges.length} edges`}
        </span>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIAssistantPanel({ workflowId, workspaceId, locale }: AIAssistantPanelProps) {
  const isRtl = locale === 'ar';
  const { panels, nodes, edges, setNodes, setEdges } = useEditorStore();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: isRtl
        ? 'أهلاً بك! أنا مساعد الذكاء الاصطناعي لمسار العمل الخاص بك. يمكنني إنشاء مسارات عمل من الوصف، وتحليل مسار عملك الحالي بحثاً عن مشكلات، أو تقديم اقتراحات للتحسين. ماذا تريد أن تفعل؟'
        : 'Hi! I\'m your AI workflow assistant. I can generate workflows from descriptions, analyze your current workflow for issues, or suggest improvements. What would you like to do?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(50);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  // ─── Generate Action ─────────────────────────────────────────────────────

  const handleGenerate = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    addMessage({ role: 'user', content: prompt, action: 'generate' });
    setInput('');

    const loadingId = addMessage({
      role: 'assistant',
      content: '',
      loading: true,
      action: 'generate',
    });

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, workflowId, workspaceId }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        updateMessage(loadingId, {
          loading: false,
          content: data.message || (isRtl ? 'فشل توليد مسار العمل. يرجى المحاولة مرة أخرى.' : 'Failed to generate workflow. Please try again.'),
        });
        return;
      }

      if (data.creditsRemaining !== undefined) {
        setCreditsUsed((prev) => prev + (data.creditsUsed ?? 0));
        setCreditsLimit(data.creditsRemaining + data.creditsUsed + creditsUsed);
      }

      updateMessage(loadingId, {
        loading: false,
        content: isRtl
          ? `لقد قمت بتصميم مخطط سير عمل يحتوي على **${data.nodes.length} عقد** و **${data.edges.length} روابط** بناءً على وصفك. اختر كيفية تطبيقه:`
          : `I've designed a workflow with **${data.nodes.length} nodes** and **${data.edges.length} connections** based on your description. Choose how to apply it:`,
        data: { nodes: data.nodes, edges: data.edges, creditsUsed: data.creditsUsed, creditsRemaining: data.creditsRemaining },
      });
    } catch (err) {
      updateMessage(loadingId, {
        loading: false,
        content: isRtl
          ? `فشل الاتصال بخدمة الذكاء الاصطناعي. يرجى التحقق من اتصالك بالإنترنت. (${(err as Error).message})`
          : `Failed to connect to AI service. Please check your internet connection. (${(err as Error).message})`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, workflowId, workspaceId, addMessage, updateMessage, creditsUsed, isRtl]);

  // ─── Analyze Action ──────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (isLoading) return;

    addMessage({ role: 'user', content: isRtl ? 'تحليل مسار عملي بحثاً عن مشكلات' : 'Analyze my workflow for issues', action: 'analyze' });

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
        body: JSON.stringify({ nodes, edges, workflowId, workspaceId }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        updateMessage(loadingId, {
          loading: false,
          content: data.message || (isRtl ? 'فشل التحليل. يرجى المحاولة مرة أخرى.' : 'Analysis failed. Please try again.'),
        });
        return;
      }

      const issues: AnalysisIssue[] = data.issues || [];
      const errorCount = issues.filter((i) => i.severity === 'error').length;
      const warnCount = issues.filter((i) => i.severity === 'warning').length;

      const summary = issues.length === 0
        ? (isRtl ? 'لا يحتوي مسار عملك على أي مشاكل هيكلية — عمل رائع! 🎉' : 'Your workflow has no structural issues — great work! 🎉')
        : (isRtl
            ? `تم العثور على **${issues.length} مشكلة**: ${errorCount} أخطاء، و ${warnCount} تحذيرات.`
            : `Found **${issues.length} issue${issues.length > 1 ? 's' : ''}**: ${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warnCount} warning${warnCount !== 1 ? 's' : ''}.`);

      if (data.creditsUsed) setCreditsUsed((prev) => prev + data.creditsUsed);

      updateMessage(loadingId, {
        loading: false,
        content: summary,
        data: { issues, creditsUsed: data.creditsUsed, creditsRemaining: data.creditsRemaining },
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

    addMessage({ role: 'user', content: isRtl ? 'اقتراح تحسينات لمسار عملي' : 'Suggest improvements for my workflow', action: 'suggest' });

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
        body: JSON.stringify({ nodes, edges, workflowId, workspaceId }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        updateMessage(loadingId, {
          loading: false,
          content: data.message || (isRtl ? 'تعذر توليد الاقتراحات. يرجى المحاولة مرة أخرى.' : 'Could not generate suggestions. Please try again.'),
        });
        return;
      }

      const suggestions: Suggestion[] = data.suggestions || [];
      if (data.creditsUsed) setCreditsUsed((prev) => prev + data.creditsUsed);

      updateMessage(loadingId, {
        loading: false,
        content: suggestions.length > 0
          ? (isRtl
              ? `إليك **${suggestions.length} اقتراحات تحسين** لمخطط سير العمل الخاص بك:`
              : `Here are **${suggestions.length} improvement suggestion${suggestions.length > 1 ? 's' : ''}** for your workflow:`)
          : (isRtl ? 'يبدو مسار العمل الخاص بك محسناً بشكل جيد — لا توجد تحسينات رئيسية مطلوبة حالياً.' : 'Your workflow looks well-optimized — no major improvements needed right now.'),
        data: { suggestions, creditsUsed: data.creditsUsed, creditsRemaining: data.creditsRemaining },
      });
    } catch (err) {
      updateMessage(loadingId, {
        loading: false,
        content: isRtl ? `خطأ في الاقتراح: ${(err as Error).message}` : `Suggestion error: ${(err as Error).message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, nodes, edges, workflowId, workspaceId, addMessage, updateMessage, isRtl]);

  // ─── Apply Generated Workflow ────────────────────────────────────────────

  const handleApplyWorkflow = useCallback((genNodes: Node[], genEdges: Edge[], replace: boolean) => {
    if (replace) {
      const confirmed = window.confirm(
        isRtl
          ? 'سيؤدي هذا إلى استبدال اللوحة الحالية بمسار العمل المولد. هل أنت متأكد؟'
          : 'This will replace your current canvas with the generated workflow. Are you sure?'
      );
      if (!confirmed) return;
      setNodes(genNodes);
      setEdges(genEdges);
    } else {
      // Insert alongside: offset new nodes
      const offsetX = nodes.length > 0 ? 600 : 0;
      const offsetNodes = genNodes.map((n) => ({
        ...n,
        id: `ai_${n.id}`,
        position: { x: n.position.x + offsetX, y: n.position.y },
      }));
      const offsetEdges = genEdges.map((e) => ({
        ...e,
        id: `ai_${e.id}`,
        source: `ai_${e.source}`,
        target: `ai_${e.target}`,
      }));
      setNodes([...nodes, ...offsetNodes]);
      setEdges([...edges, ...offsetEdges]);
    }
  }, [nodes, edges, setNodes, setEdges, isRtl]);

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

  if (!panels.aiAssistant) return null;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'absolute top-0 bottom-0 w-[360px] z-20 flex flex-col font-sans',
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
            {isRtl ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
          </h2>
          <p className="text-[10px] text-zinc-500">{isRtl ? 'مدعوم بواسطة Gemini 2.5 Flash' : 'Powered by Gemini 2.5 Flash'}</p>
        </div>
        <CreditsChip used={creditsUsed} limit={creditsLimit} isRtl={isRtl} />
      </div>

      {/* ── Quick Action Buttons ── */}
      <div className="flex gap-2 px-3 pt-3 pb-2 shrink-0">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.id === 'analyze' ? handleAnalyze : handleSuggest}
              disabled={isLoading}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2.5 px-2',
                'rounded-xl border border-white/6 bg-white/3',
                'transition-all duration-200 cursor-pointer',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                action.color
              )}
            >
              <Icon className={cn('w-4 h-4', action.iconColor)} />
              <span className="text-[11px] font-bold text-zinc-300">
                {action.id === 'analyze' 
                  ? (isRtl ? 'تحليل اللوحة' : 'Analyze')
                  : (isRtl ? 'تحسين اللوحة' : 'Improve')}
              </span>
              <span className="text-[9px] text-zinc-500">
                {isRtl ? `${action.cost} رصيد` : `${action.cost} credits`}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Message History ── */}
      <ScrollArea className="flex-1 px-3" ref={scrollRef as React.RefObject<HTMLDivElement>}>
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
                        {isRtl ? 'جاري التفكير...' : 'Thinking...'}
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
                    {msg.data.issues && (
                      <AnalysisResults issues={msg.data.issues} isRtl={isRtl} />
                    )}
                    {msg.data.suggestions && (
                      <SuggestionResults suggestions={msg.data.suggestions} isRtl={isRtl} />
                    )}
                    {msg.data.nodes && msg.data.edges && (
                      <GeneratedWorkflowPreview
                        nodes={msg.data.nodes}
                        edges={msg.data.edges}
                        isRtl={isRtl}
                        onApply={() => handleApplyWorkflow(msg.data!.nodes!, msg.data!.edges!, true)}
                        onInsert={() => handleApplyWorkflow(msg.data!.nodes!, msg.data!.edges!, false)}
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
      </ScrollArea>

      {/* ── Divider ── */}
      <div className="shrink-0 px-3">
        <div className="border-t border-white/6" />
      </div>

      {/* ── Generate prompt hint ── */}
      <div className="px-3 pt-2 pb-1 shrink-0">
        <p className="text-[10px] text-zinc-600 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-400" />
          {isRtl 
            ? 'صف مسار العمل الذي تريد إنشاءه بالذكاء الاصطناعي (10 رصيد)'
            : 'Describe a workflow to generate it with AI (10 credits)'}
        </p>
      </div>

      {/* ── Input Area ── */}
      <div className="px-3 pb-4 pt-1 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRtl 
              ? 'مثال: إنشاء مسار عمل لتهيئة الموظفين الجدد مع خطوات موافقة...'
              : 'e.g. Create an employee onboarding workflow with approval steps...'}
            disabled={isLoading}
            rows={3}
            className={cn(
              'flex-1 resize-none text-xs leading-relaxed rounded-xl',
              'bg-white/4 border-white/8 text-zinc-300 placeholder:text-zinc-600 text-left rtl:text-right',
              'focus:ring-1 focus:ring-purple-500/40 focus:border-purple-500/30',
              'transition-all duration-200'
            )}
          />
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
