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
    polarHandles?: {
      id: string;
      label: string;
      type: 'target' | 'source';
      angle: number;
      color: string;
    }[];
    [key: string]: unknown;
  };
  selected?: boolean;
  color: string;
  accentBar: string;
  icon: React.ReactNode;
  badgeColor: string;
  inputs?: { id: string; label?: string; position?: Position; color?: string }[];
  outputs?: { id: string; label?: string; position?: Position; color?: string }[];
}

const getPolarStyle = (angle: number, color: string) => {
  const alpha = (angle * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(alpha));
  const absSin = Math.abs(Math.sin(alpha));
  
  let x = 0;
  let y = 0;
  
  if (absCos >= absSin) {
    x = Math.cos(alpha) > 0 ? 0.5 : -0.5;
    y = (Math.sin(alpha) / (absCos || 1)) * 0.5;
  } else {
    x = (Math.cos(alpha) / (absSin || 1)) * 0.5;
    y = Math.sin(alpha) > 0 ? 0.5 : -0.5;
  }
  
  const left = (x + 0.5) * 100;
  const top = (y + 0.5) * 100;
  
  return {
    left: `${left}%`,
    top: `${top}%`,
    transform: 'translate(-50%, -50%)',
    backgroundColor: color,
    borderColor: 'var(--border)',
    position: 'absolute' as const,
  };
};

const getPolarPosition = (angle: number): Position => {
  const normAngle = ((angle % 360) + 360) % 360;
  if (normAngle >= 45 && normAngle < 135) return Position.Bottom;
  if (normAngle >= 135 && normAngle < 225) return Position.Left;
  if (normAngle >= 225 && normAngle < 315) return Position.Top;
  return Position.Right;
};

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

  // Render parent Group Container Card cleanly
  if (type === 'group') {
    return (
      <div
        style={{
          ...inlineStyles,
          width: customStyle.width || '300px',
          height: customStyle.height || '200px',
        }}
        className={`rounded-2xl border-2 border-dashed border-zinc-400 dark:border-zinc-700 bg-zinc-400/5 dark:bg-zinc-800/5 select-none transition-all ${
          selected ? 'border-primary shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-2 ring-primary' : ''
        }`}
      >
        <div className="absolute top-2 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/95 border border-border text-[10px] font-bold text-muted-foreground select-none">
          <span>{data.label || 'Group / مجموعة'}</span>
        </div>
      </div>
    );
  }

  // Group handles by their positions to distribute them correctly
  const handlesBySide = {
    [Position.Top]: [] as { id: string; type: 'target' | 'source'; color?: string; label?: string }[],
    [Position.Bottom]: [] as { id: string; type: 'target' | 'source'; color?: string; label?: string }[],
    [Position.Left]: [] as { id: string; type: 'target' | 'source'; color?: string; label?: string }[],
    [Position.Right]: [] as { id: string; type: 'target' | 'source'; color?: string; label?: string }[],
  };

  inputs.forEach((h) => {
    const pos = h.position || Position.Top;
    handlesBySide[pos].push({ ...h, type: 'target' });
  });

  outputs.forEach((h) => {
    const pos = h.position || Position.Bottom;
    handlesBySide[pos].push({ ...h, type: 'source' });
  });

  const polarHandles = data.polarHandles || [];

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
      {/* 360-degree Polar Handles rendering or standard handles */}
      {polarHandles.length > 0 ? (
        polarHandles.map((h) => {
          const style = getPolarStyle(h.angle, h.color);
          const pos = getPolarPosition(h.angle);
          
          return (
            <Handle
              key={h.id}
              type={h.type}
              position={pos}
              id={h.id}
              style={style}
              className="w-3.5 h-3.5 border-2 hover:scale-130 transition-all cursor-crosshair rounded-full shadow-md z-30"
              title={`${h.label} (${h.angle}°)`}
            />
          );
        })
      ) : (
        /* Handles rendering for all 4 sides */
        (Object.keys(handlesBySide) as Position[]).map((pos) => {
          const sideHandles = handlesBySide[pos];
          const isHorizontal = pos === Position.Top || pos === Position.Bottom;
          
          return sideHandles.map((h, index) => {
            const style: React.CSSProperties = {
              backgroundColor: h.color || (h.type === 'target' ? '#10b981' : '#ef4444'),
              borderColor: 'var(--border)',
              position: 'absolute',
            };

            if (isHorizontal) {
              style.left = sideHandles.length === 1 ? '50%' : `${((index + 1) * 100) / (sideHandles.length + 1)}%`;
              style.transform = 'translateX(-50%)';
              if (pos === Position.Top) {
                style.top = '-6px';
              } else {
                style.bottom = '-6px';
              }
            } else {
              style.top = sideHandles.length === 1 ? '50%' : `${((index + 1) * 100) / (sideHandles.length + 1)}%`;
              style.transform = 'translateY(-50%)';
              if (pos === Position.Left) {
                style.left = '-6px';
              } else {
                style.right = '-6px';
              }
            }

            return (
              <Handle
                key={h.id}
                type={h.type}
                position={pos}
                id={h.id}
                style={style}
                className="w-3 h-3 border-2 hover:scale-125 transition-all cursor-crosshair rounded-full shadow-sm z-30"
                title={h.label}
              />
            );
          });
        })
      )}

      {/* Node Accent Left Bar */}
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
    </div>
  );
}
