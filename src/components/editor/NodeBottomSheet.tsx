'use client';

import { useEffect, useRef } from 'react';
import { type Node } from '@xyflow/react';
import { X, MessageSquare, ShieldAlert, Cpu, Database, Network, HelpCircle, Activity } from 'lucide-react';

interface NodeBottomSheetProps {
  node: Node | null;
  onClose: () => void;
  onAddCommentClick: () => void;
  canComment: boolean;
  locale: string;
}

export function NodeBottomSheet({
  node,
  onClose,
  onAddCommentClick,
  canComment,
  locale,
}: NodeBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const isRtl = locale === 'ar';

  useEffect(() => {
    // Escape key listener to close bottom sheet
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!node) return null;

  const nodeType = node.type || 'default';
  const label = node.data?.label;
  const desc = node.data?.description;
  const nodeLabel = (typeof label === 'string' ? label : 'Unnamed Node') as string;
  const nodeDescription = (typeof desc === 'string' ? desc : 'No configuration description provided for this canvas node.') as string;

  // Map icon based on node types
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'trigger': return <Activity className="w-5 h-5 text-node-logic" />;
      case 'action': return <Cpu className="w-5 h-5 text-node-ai" />;
      case 'data': return <Database className="w-5 h-5 text-node-data" />;
      case 'integration': return <Network className="w-5 h-5 text-node-integration" />;
      default: return <HelpCircle className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-998 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Bottom Sheet wrapper */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-xl rounded-t-3xl z-999 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-bottom-full duration-300 select-none text-zinc-100"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header Drag Indicator Indicator */}
        <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-4 shrink-0" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} p-2 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all cursor-pointer focus:outline-hidden`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Node Information */}
        <div className="flex-1 space-y-5 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              {getNodeIcon(nodeType)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] tracking-wider uppercase font-bold text-accent font-sans px-2 py-0.5 rounded-md bg-accent/10 border border-accent/15 inline-block mb-1">
                {nodeType.replace('_', ' ')}
              </span>
              <h3 className="text-lg font-extrabold font-sans tracking-tight truncate">
                {nodeLabel}
              </h3>
            </div>
          </div>

          {/* Description Block */}
          <div className="bg-zinc-900/50 border border-zinc-900 p-4 rounded-2xl">
            <h4 className="text-xs font-semibold text-zinc-400 font-sans mb-1.5">Description</h4>
            <p className="text-xs text-zinc-300 font-light leading-relaxed font-sans">
              {nodeDescription}
            </p>
          </div>

          {/* Custom style attributes if present */}
          {node.data?.customNode === true && (
            <div className="bg-zinc-900/50 border border-zinc-900 p-4 rounded-2xl space-y-3">
              <h4 className="text-xs font-semibold text-zinc-400 font-sans">Custom Attributes</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-xs">
                  <span className="text-zinc-500 block text-[10px] font-sans">Background Accent</span>
                  <span className="font-semibold text-zinc-200 font-sans truncate block mt-0.5">
                    {((node.data?.customStyle as Record<string, string>)?.background) || 'Default Theme'}
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-zinc-500 block text-[10px] font-sans">Border Style</span>
                  <span className="font-semibold text-zinc-200 font-sans truncate block mt-0.5">
                    {((node.data?.customStyle as Record<string, string>)?.borderStyle) || 'Solid line'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Panel Footer */}
        <div className="mt-8 border-t border-zinc-900 pt-5 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Interactive editing disabled</span>
          </div>

          {canComment && (
            <button
              onClick={() => {
                onAddCommentClick();
                onClose();
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90 transition-all font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Add Comment</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
