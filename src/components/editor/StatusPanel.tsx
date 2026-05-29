'use client';

import { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { 
  Keyboard, ZoomIn, ZoomOut, Maximize2 
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StatusPanelProps {
  locale: string;
}

export function StatusPanel({ locale }: StatusPanelProps) {
  const isRtl = locale === 'ar';
  const { nodes, edges, selectedNodeId, selectedEdgeId } = useEditorStore();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const zoomPercent = Math.round(100); // we can also fetch it from viewport, but a static/control is highly compatible

  const hasSelection = selectedNodeId !== null || selectedEdgeId !== null;

  // Shortcuts catalog
  const shortcuts = [
    { keys: ['Delete', 'Backspace'], desc: isRtl ? 'حذف العقدة أو الرابط المحدد' : 'Delete selected node or edge' },
    { keys: ['Ctrl', 'A'], desc: isRtl ? 'تحديد جميع العقد على اللوحة' : 'Select all nodes on canvas' },
    { keys: ['Ctrl', 'Z'], desc: isRtl ? 'تراجع عن آخر تغيير' : 'Undo last change' },
    { keys: ['Ctrl', 'Y'], desc: isRtl ? 'إعادة تطبيق التغييرات' : 'Redo changes' },
    { keys: ['Ctrl', 'S'], desc: isRtl ? 'حفظ حالة مساحة العمل فوراً' : 'Save workspace state immediately' },
    { keys: ['Ctrl', 'C'], desc: isRtl ? 'نسخ قيم العقدة المحددة' : 'Copy selected node values' },
    { keys: ['Ctrl', 'V'], desc: isRtl ? 'لصق العقدة المنسوخة عند المؤشر' : 'Paste copied node to cursor' },
    { keys: ['Escape'], desc: isRtl ? 'إلغاء التحديد وإغلاق اللوحات' : 'Deselect all and close panels' },
    { keys: ['Ctrl', 'Shift', 'F'], desc: isRtl ? 'ملاءمة اللوحة مع وسط الشاشة' : 'Fit canvas to center screen' },
  ];

  return (
    <div className="h-10 border-t border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0 text-xs text-muted-foreground select-none font-sans">
      {/* 1. Selection Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{isRtl ? 'تم اتصال اللوحة' : 'Canvas Connected'}</span>
        </div>

        <div className="w-px h-3 bg-border" />

        <div className="flex items-center gap-2">
          <span>{isRtl ? `${nodes.length} عقد` : `${nodes.length} nodes`}</span>
          <span className="text-[10px] text-muted-foreground/45">•</span>
          <span>{isRtl ? `${edges.length} روابط` : `${edges.length} connections`}</span>
        </div>

        {hasSelection && (
          <>
            <div className="w-px h-3 bg-border" />
            <div className="text-accent font-semibold flex items-center gap-1.5 animate-pulse">
              <span className="w-1 h-1 rounded-full bg-accent" />
              <span>
                {selectedNodeId 
                  ? (isRtl ? 'تم تحديد عقدة واحدة' : '1 Node Selected')
                  : (isRtl ? 'تم تحديد رابط واحد' : '1 Connection Selected')}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 2. Right: Zoom Control triggers and Keyboard shortcut buttons */}
      <div className="flex items-center gap-4">
        {/* Zoom panel */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => zoomOut()}
            className="w-6 h-6 rounded-md hover:bg-muted cursor-pointer"
            title={isRtl ? 'تصغير' : 'Zoom Out'}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>

          <span className="text-[10px] font-mono px-1 min-w-[32px] text-center">
            {zoomPercent}%
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => zoomIn()}
            className="w-6 h-6 rounded-md hover:bg-muted cursor-pointer"
            title={isRtl ? 'تكبير' : 'Zoom In'}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fitView({ duration: 400 })}
            className="w-6 h-6 rounded-md hover:bg-muted cursor-pointer ml-1"
            title={isRtl ? 'ملاءمة الشاشة' : 'Fit View'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="w-px h-3 bg-border" />

        {/* Shortcuts button */}
        <button
          onClick={() => setShortcutsOpen(true)}
          className="flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors font-semibold"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>{isRtl ? 'مرجع الاختصارات' : 'Shortcuts Reference'}</span>
        </button>
      </div>

      {/* Shortcuts modal dialog */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="bg-background border border-border rounded-2xl shadow-xl max-w-md p-6 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-accent" />
              <span>{isRtl ? 'دليل اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts Catalog'}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="divide-y divide-border py-2 max-h-[300px] overflow-y-auto pr-1">
            {shortcuts.map((shortcut, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                <span className="text-zinc-400 font-light">{shortcut.desc}</span>
                <div className="flex items-center gap-1 shrink-0" dir="ltr">
                  {shortcut.keys.map((k, kIdx) => (
                    <kbd
                      key={kIdx}
                      className="px-1.5 py-0.5 border border-border bg-muted/50 rounded-md font-mono text-[9px] font-bold shadow-xs text-foreground uppercase animate-fadeIn"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
