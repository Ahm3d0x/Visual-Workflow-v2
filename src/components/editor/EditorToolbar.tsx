'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { 
  ArrowLeft, ArrowRight, Loader2, Check, AlertCircle, 
  Undo, Redo, Layout, Download, FileJson, Image as ImageIcon, FileText, ChevronDown, BrainCircuit, Share2, Pencil
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useTheme } from 'next-themes';
import { getNodesBounds } from '@xyflow/react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useDialogStore } from '@/stores/dialogStore';

interface EditorToolbarProps {
  workflowId: string;
  initialName: string;
  locale: string;
  onApplyLayout: (direction: 'TB' | 'LR') => void;
  onManualSave: (nextName?: string) => Promise<void>;
  userRole: string;
  onShareClick: () => void;
}

export function EditorToolbar({
  workflowId,
  initialName,
  locale,
  onApplyLayout,
  onManualSave,
  userRole,
  onShareClick,
}: EditorToolbarProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isRtl = locale === 'ar';

  const {
    nodes,
    edges,
    undoStack,
    redoStack,
    undo,
    redo,
    isSaving,
    hasUnsavedChanges,
    lastSavedAt,
    panels,
    togglePanel,
  } = useEditorStore();

  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canEdit = ['owner', 'admin', 'editor'].includes(userRole);

  const handleTitleSubmit = async () => {
    setEditing(false);
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) {
      setName(initialName);
      return;
    }
    await onManualSave(trimmed);
  };

  // Export functions
  const handleExportJson = () => {
    const data = {
      id: workflowId,
      name,
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, data: e.data })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${name.replace(/\s+/g, '_')}_template.json`;
    link.href = url;
    link.click();
  };

  const handleExportPng = async () => {
    if (nodes.length === 0) {
      useDialogStore.getState().showNotification(isRtl ? 'لا يمكن تصدير لوحة فارغة.' : 'Cannot export an empty canvas.', 'error');
      return;
    }
    setExporting(true);
    try {
      const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportElement) throw new Error('Viewport not found');

      // Calculate exact bounding box offset + padding to center the workflow
      const bounds = getNodesBounds(nodes);
      const computedStyle = getComputedStyle(document.documentElement);
      const canvasBg = computedStyle.getPropertyValue('--canvas-bg').trim() || (resolvedTheme === 'dark' ? '#0f172a' : '#f8fafc');

      const dataUrl = await toPng(viewportElement, {
        backgroundColor: canvasBg,
        width: bounds.width + 200,
        height: bounds.height + 200,
        style: {
          transform: `translate(${-bounds.x + 100}px, ${-bounds.y + 100}px) scale(1)`,
        },
      });

      const link = document.createElement('a');
      link.download = `${name.replace(/\s+/g, '_')}_canvas.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      useDialogStore.getState().showNotification((isRtl ? 'فشل تصدير الصورة: ' : 'Failed to export image: ') + (err as Error).message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (nodes.length === 0) {
      useDialogStore.getState().showNotification(isRtl ? 'لا يمكن تصدير لوحة فارغة.' : 'Cannot export empty canvas.', 'error');
      return;
    }
    setExporting(true);
    try {
      const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportElement) throw new Error('Viewport not found');

      // Calculate exact bounding box offset + padding to center the workflow
      const bounds = getNodesBounds(nodes);
      const computedStyle = getComputedStyle(document.documentElement);
      const canvasBg = computedStyle.getPropertyValue('--canvas-bg').trim() || (resolvedTheme === 'dark' ? '#0f172a' : '#f8fafc');

      const dataUrl = await toPng(viewportElement, {
        backgroundColor: canvasBg,
        width: bounds.width + 200,
        height: bounds.height + 200,
        style: {
          transform: `translate(${-bounds.x + 100}px, ${-bounds.y + 100}px) scale(1)`,
        },
      });

      const pdf = new jsPDF({
        orientation: bounds.width > bounds.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [bounds.width + 200, bounds.height + 200],
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, bounds.width + 200, bounds.height + 200);
      pdf.save(`${name.replace(/\s+/g, '_')}_report.pdf`);
    } catch (err) {
      useDialogStore.getState().showNotification((isRtl ? 'فشل تصدير ملف PDF: ' : 'Failed to export PDF: ') + (err as Error).message, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-background/60 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0 select-none shadow-xs font-sans">
      {/* 1. Left controls (Back & Title) */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard')}
          className="rounded-xl border border-border w-9 h-9 cursor-pointer flex items-center justify-center"
        >
          {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        </Button>

        <div className="flex flex-col">
          {editing && canEdit ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="h-8 py-0.5 rounded-lg border-border font-bold text-sm focus:ring-accent max-w-[200px]"
            />
          ) : (
            <div className="flex items-center gap-1.5 group/title">
              <h1
                onClick={() => canEdit && setEditing(true)}
                className={`text-base font-bold tracking-tight leading-tight ${
                  canEdit ? 'cursor-pointer hover:bg-muted/40 rounded-lg px-2 py-0.5 transition-colors' : ''
                }`}
              >
                {name}
              </h1>
              {canEdit && (
                <Pencil
                  onClick={() => setEditing(true)}
                  className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer opacity-50 group-hover/title:opacity-100 transition-opacity shrink-0"
                />
              )}
            </div>
          )}

          {/* Auto-Save status badge */}
          <div className="flex items-center gap-1.5 mt-0.5">
            {isSaving ? (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-accent" />
                <span>{isRtl ? 'جاري الحفظ...' : 'Saving...'}</span>
              </span>
            ) : hasUnsavedChanges ? (
              <span className="text-[10px] text-amber-500/80 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500" />
                <span>{isRtl ? 'تغييرات غير محفوظة' : 'Unsaved changes'}</span>
              </span>
            ) : (
              <span className="text-[10px] text-emerald-500/80 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>
                  {lastSavedAt
                    ? (isRtl 
                        ? `تم الحفظ في ${lastSavedAt.toLocaleTimeString()}`
                        : `Saved at ${lastSavedAt.toLocaleTimeString()}`)
                    : (isRtl ? 'تم حفظ جميع التغييرات' : 'All changes saved')}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Middle Grid Manipulation (Auto-Layout, Undo, Redo) */}
      <div className="hidden md:flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={undoStack.length === 0 || !canEdit}
          onClick={undo}
          className="rounded-xl border border-border cursor-pointer h-10 w-10 lg:w-auto lg:h-9 px-3 gap-1 hover:bg-muted justify-center flex items-center shrink-0"
        >
          <Undo className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          <span className="text-xs font-semibold hidden lg:inline">{isRtl ? 'تراجع' : 'Undo'}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={redoStack.length === 0 || !canEdit}
          onClick={redo}
          className="rounded-xl border border-border cursor-pointer h-10 w-10 lg:w-auto lg:h-9 px-3 gap-1 hover:bg-muted justify-center flex items-center shrink-0"
        >
          <Redo className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          <span className="text-xs font-semibold hidden lg:inline">{isRtl ? 'إعادة' : 'Redo'}</span>
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Auto Layout Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted w-10 h-10 lg:w-auto lg:h-9 px-3 gap-1.5 cursor-pointer font-semibold text-xs transition-colors focus:outline-hidden">
            <Layout className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-accent" />
            <span className="hidden lg:inline">{isRtl ? 'تنسيق تلقائي' : 'Auto Layout'}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground hidden lg:inline" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="bg-background border border-border rounded-xl shadow-md w-44 font-sans">
            <DropdownMenuItem
              onClick={() => onApplyLayout('TB')}
              className="cursor-pointer rounded-lg m-1 font-medium text-xs"
            >
              {isRtl ? 'من الأعلى إلى الأسفل (عمودي)' : 'Top to Bottom (Vertical)'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onApplyLayout('LR')}
              className="cursor-pointer rounded-lg m-1 font-medium text-xs"
            >
              {isRtl ? 'من اليسار إلى اليمين (أفقي)' : 'Left to Right (Horizontal)'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 3. Right side Actions (Export, AI, Invite etc) */}
      <div className="flex items-center gap-3">
        {/* Share button — visible for owner/admin */}
        {['owner', 'admin'].includes(userRole) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShareClick}
            className="rounded-xl border border-border cursor-pointer h-10 w-10 lg:w-auto lg:h-9 px-3 gap-1.5 font-semibold text-xs hover:bg-muted hover:border-sky-500/30 hover:text-sky-300 transition-all duration-200 justify-center flex items-center shrink-0"
          >
            <Share2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            <span className="hidden lg:inline">{isRtl ? 'مشاركة' : 'Share'}</span>
          </Button>
        )}

        {/* AI Assistant toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => togglePanel('aiAssistant')}
          className={`rounded-xl border cursor-pointer h-10 w-10 lg:w-auto lg:h-9 px-3 gap-1.5 font-semibold text-xs transition-all duration-200 justify-center flex items-center shrink-0 ${
            panels.aiAssistant
              ? 'border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/15'
              : 'border-border hover:bg-muted'
          }`}
        >
          <BrainCircuit className={`w-4 h-4 lg:w-3.5 lg:h-3.5 ${panels.aiAssistant ? 'text-purple-400' : ''}`} />
          <span className="hidden lg:inline">{isRtl ? 'مساعد الذكاء' : 'AI Assistant'}</span>
        </Button>

        <div className="w-px h-5 bg-border" />

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={exporting}
            className="inline-flex items-center justify-center rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground w-10 h-10 lg:w-auto lg:h-9 px-3 lg:px-4 gap-1.5 cursor-pointer font-semibold text-xs transition-all focus:outline-hidden"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 animate-spin" />
            ) : (
              <Download className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            )}
            <span className="hidden lg:inline">{isRtl ? 'تصدير' : 'Export'}</span>
            <ChevronDown className="w-3 h-3 hidden lg:inline" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-md w-44 font-sans">
            <DropdownMenuItem
              onClick={handleExportPng}
              className="cursor-pointer rounded-lg m-1 font-medium flex items-center gap-2 text-xs"
            >
              <ImageIcon className="w-4 h-4 text-emerald-500" />
              <span>{isRtl ? 'تصدير كصورة PNG' : 'Export as PNG'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportJson}
              className="cursor-pointer rounded-lg m-1 font-medium flex items-center gap-2 text-xs"
            >
              <FileJson className="w-4 h-4 text-sky-500" />
              <span>{isRtl ? 'تصدير المخطط (JSON)' : 'Export Schema (JSON)'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportPdf}
              className="cursor-pointer rounded-lg m-1 font-medium flex items-center gap-2 text-xs"
            >
              <FileText className="w-4 h-4 text-rose-500" />
              <span>{isRtl ? 'تصدير التقرير (PDF)' : 'Export Report (PDF)'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-border" />

        {/* Theme Switcher Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
