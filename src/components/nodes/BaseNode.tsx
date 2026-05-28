'use client';

import { Handle, Position } from '@xyflow/react';
import { useEditorStore } from '@/stores/editorStore';
import { MessageSquare } from 'lucide-react';

interface BaseNodeProps {
  id: string;
  type: string;
  data: {
    label: string;
    description?: string;
    customStyle?: {
      colorClass?: string;
      accentBar?: string;
      badgeColor?: string;
      iconName?: string;
      imageUrl?: string;
      hexBg?: string;
      hexBorder?: string;
      hexText?: string;
      borderRadius?: number;
      borderWidth?: number;
      width?: number;
      height?: number;
    };
    [key: string]: unknown;
  };
  selected?: boolean;
  color: string;
  accentBar: string;
  icon: React.ReactNode;
  badgeColor: string;
  inputs?: { id: string; label?: string }[];
  outputs?: { id: string; label?: string }[];
}

export function BaseNode({
  id,
  type,
  data,
  selected,
  color,
  accentBar,
  icon,
  badgeColor,
  inputs = [{ id: 'in', label: 'In' }],
  outputs = [{ id: 'out', label: 'Out' }],
}: BaseNodeProps) {
  const comments = useEditorStore((s) => s.comments);
  const togglePanel = useEditorStore((s) => s.togglePanel);
  const setSelectedNode = useEditorStore((s) => s.setSelectedNode);
  const activeSimNodeId = useEditorStore((s) => s.activeSimNodeId);
  const isSimActive = activeSimNodeId === id;

  const unresolvedComments = comments.filter((c) => c.node_id === id && !c.resolved_at);
  const commentCount = unresolvedComments.length;

  // Retrieve custom styles overrides if any
  const customStyle = data.customStyle || {};
  const inlineStyles: React.CSSProperties = {};
  
  if (customStyle.hexBg) inlineStyles.backgroundColor = customStyle.hexBg;
  if (customStyle.hexBorder) inlineStyles.borderColor = customStyle.hexBorder;
  if (customStyle.hexText) inlineStyles.color = customStyle.hexText;
  
  if (customStyle.borderRadius !== undefined) {
    inlineStyles.borderRadius = `${customStyle.borderRadius}px`;
  }
  if (customStyle.borderWidth !== undefined) {
    inlineStyles.borderWidth = `${customStyle.borderWidth}px`;
  }
  if (customStyle.width !== undefined) {
    inlineStyles.width = `${customStyle.width}px`;
    inlineStyles.minWidth = 'unset';
    inlineStyles.maxWidth = 'unset';
  }
  if (customStyle.height !== undefined) {
    inlineStyles.height = `${customStyle.height}px`;
  }

  return (
    <div
      style={inlineStyles}
      className={`min-w-[200px] max-w-[280px] rounded-2xl border backdrop-blur-md transition-all shadow-md select-none group relative ${color} ${
        selected ? 'ring-2 ring-offset-2 ring-accent scale-[1.02]' : 'hover:scale-[1.01]'
      } ${
        isSimActive 
          ? 'ring-4 ring-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.7)] scale-[1.03] border-emerald-400/80 animate-pulse z-50' 
          : ''
      }`}
    >
      {/* Dynamic Incoming Input Handles along Top border */}
      <div className="absolute left-0 right-0 top-0 h-0 flex items-center justify-center">
        {inputs.map((handle, i) => (
          <Handle
            key={handle.id}
            type="target"
            position={Position.Top}
            id={handle.id}
            style={{
              left: inputs.length === 1 ? '50%' : `${((i + 1) * 100) / (inputs.length + 1)}%`,
            }}
            className="w-3 h-3 bg-background border-2 border-border hover:bg-accent hover:border-accent hover:scale-125 transition-all cursor-crosshair rounded-full !top-[-6px] shadow-sm"
            title={handle.label}
          />
        ))}
      </div>

      {/* Node Accent Accent Left Bar */}
      <div className={`absolute left-0 top-3.5 bottom-3.5 w-1.5 rounded-r-md ${accentBar}`} />

      {/* Inner Node Contents */}
      <div className="p-4 pl-5">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6.5 h-6.5 rounded-lg bg-muted flex items-center justify-center border border-border/40 shrink-0">
              {icon}
            </div>
            <h4 
              style={customStyle.hexText ? { color: customStyle.hexText } : undefined} 
              className={`font-bold text-sm font-sans tracking-tight line-clamp-1 leading-tight truncate ${customStyle.hexText ? '' : 'text-foreground'}`}
            >
              {data.label || type}
            </h4>
          </div>

          {/* Unresolved Comments Bubble Badge */}
          {commentCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setSelectedNode(id);
                const activePanels = useEditorStore.getState().panels;
                if (!activePanels.comments) {
                  togglePanel('comments');
                }
              }}
              className="h-5 px-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 shrink-0"
              title={`${commentCount} unresolved comments`}
            >
              <MessageSquare className="w-3 h-3 fill-amber-500/20" />
              <span>{commentCount}</span>
            </button>
          )}
        </div>

        {data.description && (
          <p 
            style={customStyle.hexText ? { color: customStyle.hexText, opacity: 0.8 } : undefined} 
            className={`text-[11px] font-light line-clamp-2 leading-tight ${customStyle.hexText ? '' : 'text-muted-foreground'}`}
          >
            {data.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {type.replace('_', ' ')}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/60">{id.slice(0, 5)}</span>
        </div>
      </div>

      {/* Dynamic Outgoing Output Handles along Bottom border */}
      <div className="absolute left-0 right-0 bottom-0 h-0 flex items-center justify-center">
        {outputs.map((handle, i) => (
          <Handle
            key={handle.id}
            type="source"
            position={Position.Bottom}
            id={handle.id}
            style={{
              left: outputs.length === 1 ? '50%' : `${((i + 1) * 100) / (outputs.length + 1)}%`,
            }}
            className="w-3 h-3 bg-background border-2 border-border hover:bg-accent hover:border-accent hover:scale-125 transition-all cursor-crosshair rounded-full !bottom-[-6px] shadow-sm"
            title={handle.label}
          />
        ))}
      </div>
    </div>
  );
}
