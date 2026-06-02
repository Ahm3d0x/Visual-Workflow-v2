'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from '@xyflow/react';
import { PenLine, Maximize2, MessageSquare, Users } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { BoardCanvas } from './BoardCanvas';
import { ErrorBoundary } from '@/components/editor/ErrorBoundary';

export const imageCache = new Map<string, HTMLImageElement>();

export interface BoardStroke {
  id: string;
  tool: 'pen' | 'highlighter' | 'line' | 'rect' | 'circle' | 'triangle' | 'arrow' | 'text' | 'eraser' | 'sticky' |
        'rounded-rect' | 'ellipse' | 'diamond' | 'hexagon' |
        'flow-process' | 'flow-decision' | 'flow-data' | 'flow-terminator' |
        'diag-cloud' | 'diag-database' | 'diag-cylinder' | 'diag-document' | 'table' | 'image';
  points: { x: number; y: number }[];
  color: string;
  width: number;
  text?: string;
  fontSize?: number;
  fill?: boolean;
  fillColor?: string;
  opacity?: number;
  fillOpacity?: number;
  strokeDasharray?: string;
  arrowType?: 'straight' | 'curved' | 'elbow' | 'orthogonal' | 'curved-multi';
  arrowheadStart?: 'none' | 'triangle' | 'circle' | 'diamond';
  arrowheadEnd?: 'none' | 'triangle' | 'circle' | 'diamond';
  groupId?: string;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  tableRows?: number;
  tableCols?: number;
  tableCells?: string[][];
  tableHeaderRow?: boolean;
  tableHeaderCol?: boolean;
  tableHorizontalLines?: boolean;
  tableVerticalLines?: boolean;
  imageUrl?: string;
}

interface BoardNodeProps {
  id: string;
  data: {
    label: string;
    description?: string;
    boardStrokes?: BoardStroke[];
    boardBg?: string;
    boardSheets?: any[];
    isSheetsMode?: boolean;
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
  const drawMiniPreviewRef = useRef<() => void>(() => {});

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
      ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 1;

      if (stroke.strokeDasharray) {
        ctx.setLineDash(stroke.strokeDasharray.split(',').map(Number).map(d => d * scale));
      }

      if (stroke.tool === 'pen' || stroke.tool === 'eraser' || stroke.tool === 'highlighter') {
        ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
        if (stroke.tool === 'highlighter') {
          ctx.globalAlpha = (stroke.opacity !== undefined ? stroke.opacity : 1) * 0.45;
          ctx.lineWidth = Math.max(stroke.width * 2.5 * scale, 1);
        }
        ctx.beginPath();
        stroke.points.forEach((p, i) => {
          const px = p.x * scale + offsetX;
          const py = p.y * scale + offsetY;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      } else if (stroke.tool === 'line' && stroke.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x * scale + offsetX, stroke.points[0].y * scale + offsetY);
        if (stroke.arrowType === 'curved-multi') {
          for (let i = 1; i < stroke.points.length - 1; i++) {
            const pCurrent = stroke.points[i];
            const pNext = stroke.points[i + 1];
            const xc = (pCurrent.x + pNext.x) / 2;
            const yc = (pCurrent.y + pNext.y) / 2;
            ctx.quadraticCurveTo(
              pCurrent.x * scale + offsetX,
              pCurrent.y * scale + offsetY,
              xc * scale + offsetX,
              yc * scale + offsetY
            );
          }
          ctx.lineTo(
            stroke.points[stroke.points.length - 1].x * scale + offsetX,
            stroke.points[stroke.points.length - 1].y * scale + offsetY
          );
        } else {
          ctx.lineTo(
            stroke.points[stroke.points.length - 1].x * scale + offsetX,
            stroke.points[stroke.points.length - 1].y * scale + offsetY
          );
        }
        ctx.stroke();
      } else if (stroke.tool === 'arrow' && stroke.points.length >= 2) {
        const p0 = stroke.points[0];
        const pN = stroke.points[stroke.points.length - 1];
        const p0x = p0.x * scale + offsetX;
        const p0y = p0.y * scale + offsetY;
        const pNx = pN.x * scale + offsetX;
        const pNy = pN.y * scale + offsetY;
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(pNx, pNy);
        ctx.stroke();
        const angle = Math.atan2(pNy - p0y, pNx - p0x);
        const arrowLen = Math.max(12 * scale, 4);
        ctx.beginPath();
        ctx.moveTo(pNx, pNy);
        ctx.lineTo(pNx - arrowLen * Math.cos(angle - Math.PI / 7), pNy - arrowLen * Math.sin(angle - Math.PI / 7));
        ctx.moveTo(pNx, pNy);
        ctx.lineTo(pNx - arrowLen * Math.cos(angle + Math.PI / 7), pNy - arrowLen * Math.sin(angle + Math.PI / 7));
        ctx.stroke();
      } else if (stroke.tool === 'text' && stroke.text && stroke.points.length >= 1) {
        const p = stroke.points[0];
        ctx.fillStyle = stroke.color;
        ctx.font = `${stroke.fontWeight || 'normal'} ${Math.max((stroke.fontSize || 16) * scale, 6)}px ${stroke.fontFamily || 'sans-serif'}`;
        ctx.textAlign = stroke.textAlign || 'left';
        ctx.fillText(stroke.text, p.x * scale + offsetX, p.y * scale + offsetY);
      } else if (stroke.tool === 'image' && stroke.imageUrl) {
        const p1 = stroke.points[0];
        const p2 = stroke.points[1] || { x: p1.x + 300, y: p1.y + 200 };
        const x = p1.x * scale + offsetX;
        const y = p1.y * scale + offsetY;
        const w = (p2.x - p1.x) * scale;
        const h = (p2.y - p1.y) * scale;
        const imgUrl = stroke.imageUrl;
        let img = imageCache.get(imgUrl);
        if (!img) {
          img = new Image();
          img.src = imgUrl;
          img.onload = () => {
            drawMiniPreviewRef.current();
          };
          imageCache.set(imgUrl, img);
        }
        if (img.complete) {
          ctx.drawImage(img, x, y, w, h);
        } else {
          ctx.save();
          ctx.strokeStyle = stroke.color || '#6366f1';
          ctx.strokeRect(x, y, w, h);
          ctx.restore();
        }
      } else if (stroke.tool === 'sticky' && stroke.points.length >= 1) {
        const p1 = stroke.points[0];
        const p2 = stroke.points[1] || { x: p1.x + 160, y: p1.y + 160 };
        const x = p1.x * scale + offsetX;
        const y = p1.y * scale + offsetY;
        const w = (p2.x - p1.x) * scale;
        const h = (p2.y - p1.y) * scale;
        
        ctx.fillStyle = stroke.fillColor || '#fef08a';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, 4 * scale);
        else ctx.rect(x, y, w, h);
        ctx.fill();
        if (stroke.text) {
          ctx.fillStyle = stroke.color || '#18181b';
          ctx.font = `bold ${Math.max((stroke.fontSize || 13) * scale, 5)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(stroke.text.slice(0, 15) + (stroke.text.length > 15 ? '...' : ''), x + w / 2, y + h / 2);
        }
      } else if (stroke.points.length >= 2) {
        const p0 = stroke.points[0];
        const pN = stroke.points[stroke.points.length - 1];
        const px = Math.min(p0.x, pN.x);
        const py = Math.min(p0.y, pN.y);
        const pw = Math.abs(pN.x - p0.x);
        const ph = Math.abs(pN.y - p0.y);
        const x = px * scale + offsetX;
        const y = py * scale + offsetY;
        const w = pw * scale;
        const h = ph * scale;

        ctx.beginPath();
        if (stroke.tool === 'rect' || stroke.tool === 'flow-process') {
          ctx.rect(x, y, w, h);
        } else if (stroke.tool === 'rounded-rect' || stroke.tool === 'flow-terminator') {
          const r = stroke.tool === 'flow-terminator' ? h / 2 : 8 * scale;
          if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
          else ctx.rect(x, y, w, h);
        } else if (stroke.tool === 'circle' || stroke.tool === 'ellipse') {
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        } else if (stroke.tool === 'triangle') {
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x + w, y + h);
          ctx.lineTo(x, y + h);
          ctx.closePath();
        } else if (stroke.tool === 'diamond' || stroke.tool === 'flow-decision') {
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x + w, y + h / 2);
          ctx.lineTo(x + w / 2, y + h);
          ctx.lineTo(x, y + h / 2);
          ctx.closePath();
        } else if (stroke.tool === 'hexagon') {
          ctx.moveTo(x + w * 0.25, y);
          ctx.lineTo(x + w * 0.75, y);
          ctx.lineTo(x + w, y + h * 0.5);
          ctx.lineTo(x + w * 0.75, y + h);
          ctx.lineTo(x + w * 0.25, y + h);
          ctx.lineTo(x, y + h * 0.5);
          ctx.closePath();
        } else if (stroke.tool === 'flow-data') {
          ctx.moveTo(x + w * 0.15, y);
          ctx.lineTo(x + w, y);
          ctx.lineTo(x + w * 0.85, y + h);
          ctx.lineTo(x, y + h);
          ctx.closePath();
        } else if (stroke.tool === 'diag-cloud') {
          ctx.moveTo(x + w * 0.2, y + h * 0.7);
          ctx.bezierCurveTo(x, y + h * 0.7, x, y + h * 0.3, x + w * 0.2, y + h * 0.3);
          ctx.bezierCurveTo(x + w * 0.2, y, x + w * 0.5, y, x + w * 0.5, y + h * 0.25);
          ctx.bezierCurveTo(x + w * 0.8, y, x + w * 0.8, y + h * 0.3, x + w * 0.8, y + h * 0.3);
          ctx.bezierCurveTo(x + w, y + h * 0.3, x + w, y + h * 0.7, x + w * 0.8, y + h * 0.7);
          ctx.bezierCurveTo(x + w * 0.8, y + h, x + w * 0.2, y + h, x + w * 0.2, y + h * 0.7);
          ctx.closePath();
        } else if (stroke.tool === 'diag-database' || stroke.tool === 'diag-cylinder') {
          const ry = h * 0.15;
          ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, 0, Math.PI * 2);
          ctx.moveTo(x, y + ry);
          ctx.lineTo(x, y + h - ry);
          ctx.ellipse(x + w / 2, y + h - ry, w / 2, ry, 0, 0, Math.PI, false);
          ctx.lineTo(x + w, y + ry);
        } else if (stroke.tool === 'diag-document') {
          ctx.moveTo(x, y);
          ctx.lineTo(x + w, y);
          ctx.lineTo(x + w, y + h - 12 * scale);
          ctx.quadraticCurveTo(x + w * 0.75, y + h - 24 * scale, x + w * 0.5, y + h - 12 * scale);
          ctx.quadraticCurveTo(x + w * 0.25, y + h, x, y + h - 12 * scale);
          ctx.closePath();
        } else if (stroke.tool === 'table') {
          const rows = stroke.tableRows || 3;
          const cols = stroke.tableCols || 3;
          const rowHeight = h / rows;
          const colWidth = w / cols;

          if (stroke.fill) {
            ctx.save();
            ctx.fillStyle = stroke.fillColor || stroke.color;
            ctx.globalAlpha = (stroke.opacity !== undefined ? stroke.opacity : 1) * (stroke.fillOpacity !== undefined ? stroke.fillOpacity : 0.5);
            ctx.fillRect(x, y, w, h);
            ctx.restore();
          }

          // Draw header fills
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const isHeaderRow = stroke.tableHeaderRow && r === 0;
              const isHeaderCol = stroke.tableHeaderCol && c === 0;
              const cellX = x + c * colWidth;
              const cellY = y + r * rowHeight;

              if (isHeaderRow) {
                ctx.save();
                ctx.fillStyle = stroke.color || '#ffffff';
                ctx.globalAlpha = 0.15;
                ctx.fillRect(cellX, cellY, colWidth, rowHeight);
                ctx.restore();
              } else if (isHeaderCol) {
                ctx.save();
                ctx.fillStyle = stroke.color || '#ffffff';
                ctx.globalAlpha = 0.08;
                ctx.fillRect(cellX, cellY, colWidth, rowHeight);
                ctx.restore();
              }
            }
          }

          ctx.rect(x, y, w, h);
          ctx.stroke();

          // Internal grid lines
          ctx.beginPath();
          if (stroke.tableHorizontalLines !== false) {
            for (let r = 1; r < rows; r++) {
              ctx.moveTo(x, y + r * rowHeight);
              ctx.lineTo(x + w, y + r * rowHeight);
            }
          }
          if (stroke.tableVerticalLines !== false) {
            for (let c = 1; c < cols; c++) {
              ctx.moveTo(x + c * colWidth, y);
              ctx.lineTo(x + c * colWidth, y + h);
            }
          }
          ctx.stroke();

          ctx.restore();
          return;
        }

        if (stroke.fill) {
          ctx.save();
          ctx.globalAlpha = (stroke.opacity !== undefined ? stroke.opacity : 1) * (stroke.fillOpacity !== undefined ? stroke.fillOpacity : 1);
          ctx.fillStyle = stroke.fillColor || stroke.color;
          ctx.fill();
          ctx.restore();
        }
        ctx.stroke();
      }
      ctx.restore();
    });
  }, [data.boardStrokes, data.boardBg]);

  useEffect(() => {
    drawMiniPreviewRef.current = drawMiniPreview;
  }, [drawMiniPreview]);

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
      {isOpen && createPortal(
        <ErrorBoundary
          fallbackTitle="Board crashed"
          fallbackMessage="The whiteboard encountered an error. Click retry to recover your work."
        >
          <BoardCanvas
            nodeId={id}
            label={data.label || 'Board'}
            initialStrokes={(data.boardStrokes as BoardStroke[]) || []}
            initialBg={data.boardBg as string | undefined}
            initialSheets={data.boardSheets as any[] | undefined}
            initialIsSheetsMode={data.isSheetsMode as boolean | undefined}
            onClose={() => setIsOpen(false)}
          />
        </ErrorBoundary>,
        document.body
      )}
    </>
  );
}
