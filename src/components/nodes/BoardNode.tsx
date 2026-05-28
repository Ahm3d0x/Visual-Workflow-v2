'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { PenLine, Maximize2, MessageSquare, Users } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { BoardCanvas } from './BoardCanvas';

export interface BoardStroke {
  id: string;
  tool: 'pen' | 'line' | 'rect' | 'circle' | 'triangle' | 'arrow' | 'text' | 'eraser';
  points: { x: number; y: number }[];
  color: string;
  width: number;
  text?: string;
  fontSize?: number;
  fill?: boolean;
  fillColor?: string;
}

interface BoardNodeProps {
  id: string;
  data: {
    label: string;
    description?: string;
    boardStrokes?: BoardStroke[];
    boardBg?: string;
    [key: string]: unknown;
  };
  selected?: boolean;
}

export function BoardNode({ id, data, selected }: BoardNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const comments = useEditorStore((s) => s.comments);
  const setSelectedNode = useEditorStore((s) => s.setSelectedNode);
  const togglePanel = useEditorStore((s) => s.togglePanel);

  const unresolvedComments = comments.filter((c) => c.node_id === id && !c.resolved_at);
  const commentCount = unresolvedComments.length;
  const strokeCount = (data.boardStrokes || []).length;

  // Draw mini preview of strokes on the thumbnail canvas
  const drawMiniPreview = useCallback(() => {
    const canvas = miniCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Background
    ctx.fillStyle = data.boardBg || '#18181b';
    ctx.fillRect(0, 0, W, H);

    const strokes = data.boardStrokes || [];
    if (strokes.length === 0) return;

    // Find bounding box to scale content
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    strokes.forEach((s) => {
      s.points.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    });

    const contentW = Math.max(maxX - minX, 1);
    const contentH = Math.max(maxY - minY, 1);
    const scaleX = (W - 8) / contentW;
    const scaleY = (H - 8) / contentH;
    const scale = Math.min(scaleX, scaleY, 1);

    const offsetX = 4 + (W - 8 - contentW * scale) / 2 - minX * scale;
    const offsetY = 4 + (H - 8 - contentH * scale) / 2 - minY * scale;

    strokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;
      ctx.save();
      ctx.strokeStyle = stroke.color || '#ffffff';
      ctx.lineWidth = Math.max(stroke.width * scale, 0.5);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.beginPath();
        stroke.points.forEach((p, i) => {
          const px = p.x * scale + offsetX;
          const py = p.y * scale + offsetY;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      } else if (stroke.tool === 'line' && stroke.points.length >= 2) {
        const p0 = stroke.points[0];
        const pN = stroke.points[stroke.points.length - 1];
        ctx.beginPath();
        ctx.moveTo(p0.x * scale + offsetX, p0.y * scale + offsetY);
        ctx.lineTo(pN.x * scale + offsetX, pN.y * scale + offsetY);
        ctx.stroke();
      } else if (stroke.tool === 'rect' && stroke.points.length >= 2) {
        const p0 = stroke.points[0];
        const pN = stroke.points[stroke.points.length - 1];
        const x = p0.x * scale + offsetX;
        const y = p0.y * scale + offsetY;
        const w = (pN.x - p0.x) * scale;
        const h = (pN.y - p0.y) * scale;
        if (stroke.fill) {
          ctx.fillStyle = stroke.fillColor || stroke.color;
          ctx.fillRect(x, y, w, h);
        }
        ctx.strokeRect(x, y, w, h);
      } else if (stroke.tool === 'circle' && stroke.points.length >= 2) {
        const p0 = stroke.points[0];
        const pN = stroke.points[stroke.points.length - 1];
        const cx = (p0.x + pN.x) / 2 * scale + offsetX;
        const cy = (p0.y + pN.y) / 2 * scale + offsetY;
        const rx = Math.abs(pN.x - p0.x) / 2 * scale;
        const ry = Math.abs(pN.y - p0.y) / 2 * scale;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (stroke.fill) {
          ctx.fillStyle = stroke.fillColor || stroke.color;
          ctx.fill();
        }
        ctx.stroke();
      } else if (stroke.tool === 'text' && stroke.text && stroke.points.length >= 1) {
        const p = stroke.points[0];
        ctx.fillStyle = stroke.color;
        ctx.font = `${Math.max((stroke.fontSize || 16) * scale, 6)}px sans-serif`;
        ctx.fillText(stroke.text, p.x * scale + offsetX, p.y * scale + offsetY);
      }
      ctx.restore();
    });
  }, [data.boardStrokes, data.boardBg]);

  useEffect(() => {
    drawMiniPreview();
  }, [drawMiniPreview]);

  return (
    <>
      {/* ReactFlow Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="w-3 h-3 bg-background border-2 border-fuchsia-500/60 hover:bg-fuchsia-500 hover:border-fuchsia-500 hover:scale-125 transition-all cursor-crosshair rounded-full top-[-6px]! shadow-sm"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="w-3 h-3 bg-background border-2 border-fuchsia-500/60 hover:bg-fuchsia-500 hover:border-fuchsia-500 hover:scale-125 transition-all cursor-crosshair rounded-full bottom-[-6px]! shadow-sm"
      />

      {/* Node Container */}
      <div
        className={`w-[220px] rounded-2xl border backdrop-blur-md transition-all shadow-xl select-none group relative overflow-hidden
          border-fuchsia-500/30 bg-zinc-950/90
          ${selected ? 'ring-2 ring-fuchsia-500 ring-offset-1 scale-[1.02]' : 'hover:scale-[1.01] hover:border-fuchsia-500/50'}
        `}
        style={{ boxShadow: selected ? '0 0 24px rgba(217,70,239,0.3)' : '0 4px 24px rgba(0,0,0,0.5)' }}
      >
        {/* Accent left bar */}
        <div className="absolute left-0 top-3.5 bottom-3.5 w-1.5 rounded-r-md bg-fuchsia-500" />

        {/* Header */}
        <div className="p-3 pl-5 pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-fuchsia-500/15 flex items-center justify-center border border-fuchsia-500/30 shrink-0">
              <PenLine className="w-3.5 h-3.5 text-fuchsia-400" />
            </div>
            <h4 className="font-bold text-sm text-foreground truncate leading-tight">
              {data.label || 'Board'}
            </h4>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {commentCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode(id);
                  if (!useEditorStore.getState().panels.comments) togglePanel('comments');
                }}
                className="h-5 px-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold flex items-center gap-1"
              >
                <MessageSquare className="w-3 h-3" />
                {commentCount}
              </button>
            )}
            <button
              id={`board-open-${id}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
              className="h-6 w-6 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/25 text-fuchsia-400 flex items-center justify-center cursor-pointer hover:bg-fuchsia-500 hover:text-white transition-all hover:scale-110"
              title="Open Board"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Mini Canvas Preview */}
        <div
          className="mx-3 mb-3 rounded-xl overflow-hidden border border-fuchsia-500/15 cursor-pointer hover:border-fuchsia-500/40 transition-all"
          onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
          title="Double-click to open board"
          onDoubleClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
        >
          <canvas
            ref={miniCanvasRef}
            width={196}
            height={110}
            className="w-full h-[110px] object-cover"
            style={{ imageRendering: 'crisp-edges' }}
          />

          {strokeCount === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
              <PenLine className="w-6 h-6 text-fuchsia-500/30" />
              <p className="text-[10px] text-fuchsia-500/40 font-light">Click to open board</p>
            </div>
          )}
        </div>

        {/* Footer badge */}
        <div className="px-5 pb-3 flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400">
            board
          </span>
          <div className="flex items-center gap-1">
            {strokeCount > 0 && (
              <span className="text-[9px] font-mono text-muted-foreground/50">
                {strokeCount} obj{strokeCount !== 1 ? 's' : ''}
              </span>
            )}
            <Users className="w-3 h-3 text-muted-foreground/30" />
          </div>
        </div>
      </div>

      {/* Full Board Modal */}
      {isOpen && (
        <BoardCanvas
          nodeId={id}
          label={data.label || 'Board'}
          initialStrokes={(data.boardStrokes as BoardStroke[]) || []}
          initialBg={data.boardBg as string | undefined}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
