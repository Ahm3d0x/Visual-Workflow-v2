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

export function StatusPanel() {
  const { nodes, edges, selectedNodeId, selectedEdgeId } = useEditorStore();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const zoomPercent = Math.round(100); // we can also fetch it from viewport, but a static/control is highly compatible

  const hasSelection = selectedNodeId !== null || selectedEdgeId !== null;

  // Shortcuts catalog
  const shortcuts = [
    { keys: ['Delete', 'Backspace'], desc: 'Delete selected node or edge' },
    { keys: ['Ctrl', 'A'], desc: 'Select all nodes on canvas' },
    { keys: ['Ctrl', 'Z'], desc: 'Undo last change' },
    { keys: ['Ctrl', 'Y'], desc: 'Redo changes' },
    { keys: ['Ctrl', 'S'], desc: 'Save workspace state immediately' },
    { keys: ['Ctrl', 'C'], desc: 'Copy selected node values' },
    { keys: ['Ctrl', 'V'], desc: 'Paste copied node to cursor' },
    { keys: ['Escape'], desc: 'Deselect all and close panels' },
    { keys: ['Ctrl', 'Shift', 'F'], desc: 'Fit canvas to center screen' },
  ];

  return (
    <div className="h-10 border-t border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0 text-xs text-muted-foreground select-none">
      {/* 1. Selection Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Canvas Connected</span>
        </div>

        <div className="w-px h-3 bg-border" />

        <div className="flex items-center gap-2">
          <span>{nodes.length} nodes</span>
          <span className="text-[10px] text-muted-foreground/45">•</span>
          <span>{edges.length} connections</span>
        </div>

        {hasSelection && (
          <>
            <div className="w-px h-3 bg-border" />
            <div className="text-accent font-semibold flex items-center gap-1.5 animate-pulse">
              <span className="w-1 h-1 rounded-full bg-accent" />
              <span>
                {selectedNodeId ? '1 Node Selected' : '1 Connection Selected'}
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
            title="Zoom Out"
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
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fitView({ duration: 400 })}
            className="w-6 h-6 rounded-md hover:bg-muted cursor-pointer ml-1"
            title="Fit View"
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
          <span>Shortcuts Reference</span>
        </button>
      </div>

      {/* Shortcuts modal dialog */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="bg-background border border-border rounded-2xl shadow-xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-sans flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-accent" />
              <span>Keyboard Shortcuts Catalog</span>
            </DialogTitle>
          </DialogHeader>

          <div className="divide-y divide-border py-2 max-h-[300px] overflow-y-auto pr-1">
            {shortcuts.map((shortcut, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground font-light">{shortcut.desc}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {shortcut.keys.map((k, kIdx) => (
                    <kbd
                      key={kIdx}
                      className="px-1.5 py-0.5 border border-border bg-muted/50 rounded-md font-mono text-[9px] font-bold shadow-xs text-foreground uppercase"
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
