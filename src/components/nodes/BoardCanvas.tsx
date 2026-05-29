'use client';

import {
  useRef, useState, useEffect, useCallback, useLayoutEffect,
} from 'react';
import {
  X, Pen, Minus, Square, Circle, Triangle, ArrowRight, Type, Eraser,
  MousePointer2, Undo2, Redo2, Trash2, Download, ZoomIn, ZoomOut,
  RotateCcw, PaintBucket, ChevronUp,
  Save, Users
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { createClient } from '@/lib/supabase/client';
import { type BoardStroke } from './BoardNode';

/* ─────────────────────── Types ─────────────────────── */
type Tool = 'select' | 'pen' | 'line' | 'rect' | 'circle' | 'triangle' | 'arrow' | 'text' | 'eraser';

interface PointerState {
  down: boolean;
  x: number;
  y: number;
  startX: number;
  startY: number;
}

interface TextInput {
  active: boolean;
  x: number;
  y: number;
  value: string;
}

interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/* ─────────────────────── Constants ─────────────────────── */
const PALETTES = [
  '#ffffff', '#f4f4f5', '#a1a1aa', '#71717a',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#ec4899', '#14b8a6', '#d946ef', '#f59e0b',
];

const STROKE_WIDTHS = [1, 2, 4, 6, 10, 16];

const BG_PRESETS = [
  { label: 'Dark', value: '#09090b' },
  { label: 'Darker', value: '#000000' },
  { label: 'Midnight', value: '#0f0f23' },
  { label: 'Slate', value: '#1e293b' },
  { label: 'White', value: '#fafafa' },
  { label: 'Paper', value: '#f5f0e8' },
];



/* ─────────────────────── Component ─────────────────────── */
interface BoardCanvasProps {
  nodeId: string;
  label: string;
  initialStrokes: BoardStroke[];
  initialBg?: string;
  onClose: () => void;
}

export function BoardCanvas({ nodeId, label, initialStrokes, initialBg, onClose }: BoardCanvasProps) {
  /* ── Refs ── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null); // preview layer while drawing
  const wrapRef = useRef<HTMLDivElement>(null);

  /* ── State ── */
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ffffff');
  const [fillColor, setFillColor] = useState('#6366f1');
  const [useFill, setUseFill] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [bgColor, setBgColor] = useState(initialBg || '#09090b');
  const [fontSize, setFontSize] = useState(18);
  const [strokes, setStrokes] = useState<BoardStroke[]>(initialStrokes);
  const [undoStack, setUndoStack] = useState<BoardStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<BoardStroke[][]>([]);
  const [pointer, setPointer] = useState<PointerState>({ down: false, x: 0, y: 0, startX: 0, startY: 0 });
  const [currentPen, setCurrentPen] = useState<{ x: number; y: number }[]>([]);
  const [textInput, setTextInput] = useState<TextInput>({ active: false, x: 0, y: 0, value: '' });
  const [view, setView] = useState<ViewTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [showPalette, setShowPalette] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [collaborators, setCollaborators] = useState<Record<string, { x: number; y: number; color: string; name: string }>>({});
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  
  // Real-time collaborative whiteboard drawings preview state
  const [remoteDrawings, setRemoteDrawings] = useState<Record<string, BoardStroke>>({});
  const [currentUserId, setCurrentUserId] = useState<string>('collaborator');

  /* ── Drag & Resize States/Handlers ── */
  const [size, setSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        width: Math.floor(window.innerWidth * 0.9),
        height: Math.floor(window.innerHeight * 0.85),
      };
    }
    return { width: 1200, height: 800 };
  });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const resizeRef = useRef<{ startWidth: number; startHeight: number; startX: number; startY: number } | null>(null);

  const onDragStart = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('textarea')) return;

    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };

    const onDragMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaX = moveEvent.clientX - dragRef.current.startX;
      const deltaY = moveEvent.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.startPosX + deltaX,
        y: dragRef.current.startPosY + deltaY,
      });
    };

    const onDragStop = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragStop);
    };

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragStop);
  };

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      startWidth: size.width,
      startHeight: size.height,
      startX: e.clientX,
      startY: e.clientY,
    };

    const onResizeMove = (moveEvent: MouseEvent) => {
      if (!resizeRef.current) return;
      const deltaX = moveEvent.clientX - resizeRef.current.startX;
      const deltaY = moveEvent.clientY - resizeRef.current.startY;

      const newWidth = Math.max(800, Math.min(resizeRef.current.startWidth + deltaX, window.innerWidth - 40));
      const newHeight = Math.max(500, Math.min(resizeRef.current.startHeight + deltaY, window.innerHeight - 40));

      setSize({ width: newWidth, height: newHeight });
    };

    const onResizeStop = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', onResizeMove);
      document.removeEventListener('mouseup', onResizeStop);
    };

    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeStop);
  };

  const updateNode = useEditorStore((s) => s.updateNode);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isRemoteRef = useRef(false);

  /* ─── Canvas dimensions ─── */
  const [canvasSize, setCanvasSize] = useState({ w: 1600, h: 900 });

  /* ─── Coordinate helpers ─── */
  const toCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - view.offsetX) / view.scale;
    const y = (clientY - rect.top - view.offsetY) / view.scale;
    return { x, y };
  }, [view]);

  // Load active user session metadata
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user?.id) {
        setCurrentUserId(data.session.user.id);
      }
    });
  }, [supabase]);

  /* ─── Realtime collaboration sub-channel ─── */
  useEffect(() => {
    const ch = supabase.channel(`board:${nodeId}`, {
      config: { broadcast: { self: false } }
    });

    ch.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      if (payload?.userId) {
        setCollaborators((prev) => ({
          ...prev,
          [payload.userId]: { x: payload.x, y: payload.y, color: payload.color || '#6366f1', name: payload.name || 'User' }
        }));
      }
    });

    ch.on('broadcast', { event: 'stroke_draw' }, ({ payload }) => {
      if (!payload?.userId || !payload?.stroke) return;
      setRemoteDrawings((prev) => ({
        ...prev,
        [payload.userId]: payload.stroke,
      }));
    });

    ch.on('broadcast', { event: 'stroke_draw_end' }, ({ payload }) => {
      if (!payload?.userId) return;
      setRemoteDrawings((prev) => {
        const next = { ...prev };
        delete next[payload.userId];
        return next;
      });
    });

    ch.on('broadcast', { event: 'stroke_add' }, ({ payload }) => {
      if (!payload?.stroke) return;
      
      // Cleanup remote drawings buffer for this user
      if (payload.userId) {
        setRemoteDrawings((prev) => {
          const next = { ...prev };
          delete next[payload.userId];
          return next;
        });
      }

      isRemoteRef.current = true;
      setStrokes((prev) => {
        if (prev.some((s) => s.id === payload.stroke.id)) return prev;
        return [...prev, payload.stroke];
      });
      isRemoteRef.current = false;
    });

    ch.on('broadcast', { event: 'strokes_clear' }, () => {
      isRemoteRef.current = true;
      setStrokes([]);
      setRemoteDrawings({});
      isRemoteRef.current = false;
    });

    ch.on('broadcast', { event: 'stroke_delete' }, ({ payload }) => {
      if (!payload?.id) return;
      setStrokes((prev) => prev.filter((s) => s.id !== payload.id));
    });

    ch.on('broadcast', { event: 'bg_change' }, ({ payload }) => {
      if (payload?.bg) setBgColor(payload.bg);
    });

    ch.subscribe();
    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  /* ─── Persist strokes to node data (debounced) ─── */
  const persistStrokesRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistStrokes = useCallback((newStrokes: BoardStroke[], newBg?: string) => {
    if (persistStrokesRef.current) clearTimeout(persistStrokesRef.current);
    persistStrokesRef.current = setTimeout(() => {
      setIsSyncing(true);
      updateNode(nodeId, {
        boardStrokes: newStrokes,
        boardBg: newBg || bgColor,
      });
      setTimeout(() => setIsSyncing(false), 600);
    }, 800);
  }, [nodeId, updateNode, bgColor]);

  /* ─── Draw stroke helper (defined before renderCanvas so it can be called) ─── */
  const drawStroke = useCallback(function drawStrokeImpl(ctx: CanvasRenderingContext2D, stroke: BoardStroke, isSelected = false) {
    if (!stroke.points || stroke.points.length === 0) return;
    ctx.save();
    ctx.strokeStyle = stroke.color || '#ffffff';
    ctx.lineWidth = stroke.width || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isSelected) {
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 8;
    }

    if (stroke.tool === 'pen') {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const mx = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
        const my = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, mx, my);
      }
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();

    } else if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.lineWidth = stroke.width * 3;
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';

    } else if (stroke.tool === 'line' && stroke.points.length >= 2) {
      const p0 = stroke.points[0];
      const pN = stroke.points[stroke.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(pN.x, pN.y);
      ctx.stroke();

    } else if (stroke.tool === 'arrow' && stroke.points.length >= 2) {
      const p0 = stroke.points[0];
      const pN = stroke.points[stroke.points.length - 1];
      const angle = Math.atan2(pN.y - p0.y, pN.x - p0.x);
      const arrowLen = Math.max(12, stroke.width * 4);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(pN.x, pN.y);
      ctx.stroke();
      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(pN.x, pN.y);
      ctx.lineTo(pN.x - arrowLen * Math.cos(angle - Math.PI / 7), pN.y - arrowLen * Math.sin(angle - Math.PI / 7));
      ctx.moveTo(pN.x, pN.y);
      ctx.lineTo(pN.x - arrowLen * Math.cos(angle + Math.PI / 7), pN.y - arrowLen * Math.sin(angle + Math.PI / 7));
      ctx.stroke();

    } else if (stroke.tool === 'rect' && stroke.points.length >= 2) {
      const p0 = stroke.points[0];
      const pN = stroke.points[stroke.points.length - 1];
      const x = Math.min(p0.x, pN.x);
      const y = Math.min(p0.y, pN.y);
      const w = Math.abs(pN.x - p0.x);
      const h = Math.abs(pN.y - p0.y);
      if (stroke.fill) {
        ctx.fillStyle = stroke.fillColor || stroke.color;
        ctx.fillRect(x, y, w, h);
      }
      ctx.strokeRect(x, y, w, h);

    } else if (stroke.tool === 'circle' && stroke.points.length >= 2) {
      const p0 = stroke.points[0];
      const pN = stroke.points[stroke.points.length - 1];
      const cx = (p0.x + pN.x) / 2;
      const cy = (p0.y + pN.y) / 2;
      const rx = Math.abs(pN.x - p0.x) / 2;
      const ry = Math.abs(pN.y - p0.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (stroke.fill) {
        ctx.fillStyle = stroke.fillColor || stroke.color;
        ctx.fill();
      }
      ctx.stroke();

    } else if (stroke.tool === 'triangle' && stroke.points.length >= 2) {
      const p0 = stroke.points[0];
      const pN = stroke.points[stroke.points.length - 1];
      const x = Math.min(p0.x, pN.x);
      const y = Math.min(p0.y, pN.y);
      const w = Math.abs(pN.x - p0.x);
      const h = Math.abs(pN.y - p0.y);
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      if (stroke.fill) {
        ctx.fillStyle = stroke.fillColor || stroke.color;
        ctx.fill();
      }
      ctx.stroke();

    } else if (stroke.tool === 'text' && stroke.text && stroke.points.length >= 1) {
      ctx.fillStyle = stroke.color;
      ctx.font = `${stroke.fontSize || 18}px Inter, sans-serif`;
      ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
    }

    ctx.restore();
  }, []);

  /* ─── Main canvas renderer ─── */
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid dots (subtle - adjust color for light/dark background contrast)
    const isLightBg = bgColor === '#fafafa' || bgColor === '#f5f0e8' || bgColor.toLowerCase() === '#ffffff';
    ctx.fillStyle = isLightBg ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.04)';
    for (let x = 0; x < canvas.width; x += 30) {
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw all committed strokes
    strokes.forEach((stroke) => {
      drawStroke(ctx, stroke, stroke.id === selectedStrokeId);
    });

    // Draw active remote in-progress drawings
    Object.values(remoteDrawings).forEach((stroke) => {
      drawStroke(ctx, stroke, false);
    });
  }, [bgColor, strokes, selectedStrokeId, drawStroke, remoteDrawings]);

  useLayoutEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  /* ─── Overlay canvas (preview during drawing) ─── */
  const renderOverlay = useCallback((pts: { x: number; y: number }[]) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (pts.length < 1) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.8;

    const toolInUse = tool;

    if (toolInUse === 'pen') {
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    } else if (toolInUse === 'eraser') {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = strokeWidth * 3;
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    } else if (pts.length >= 2) {
      const p0 = pts[0];
      const pN = pts[pts.length - 1];

      if (toolInUse === 'line') {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(pN.x, pN.y);
        ctx.stroke();
      } else if (toolInUse === 'arrow') {
        const angle = Math.atan2(pN.y - p0.y, pN.x - p0.x);
        const arrowLen = Math.max(12, strokeWidth * 4);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(pN.x, pN.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pN.x, pN.y);
        ctx.lineTo(pN.x - arrowLen * Math.cos(angle - Math.PI / 7), pN.y - arrowLen * Math.sin(angle - Math.PI / 7));
        ctx.moveTo(pN.x, pN.y);
        ctx.lineTo(pN.x - arrowLen * Math.cos(angle + Math.PI / 7), pN.y - arrowLen * Math.sin(angle + Math.PI / 7));
        ctx.stroke();
      } else if (toolInUse === 'rect') {
        const x = Math.min(p0.x, pN.x), y = Math.min(p0.y, pN.y);
        const w = Math.abs(pN.x - p0.x), h = Math.abs(pN.y - p0.y);
        if (useFill) { ctx.fillStyle = fillColor + 'aa'; ctx.fillRect(x, y, w, h); }
        ctx.strokeRect(x, y, w, h);
      } else if (toolInUse === 'circle') {
        const cx = (p0.x + pN.x) / 2, cy = (p0.y + pN.y) / 2;
        const rx = Math.abs(pN.x - p0.x) / 2, ry = Math.abs(pN.y - p0.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (useFill) { ctx.fillStyle = fillColor + 'aa'; ctx.fill(); }
        ctx.stroke();
      } else if (toolInUse === 'triangle') {
        const x = Math.min(p0.x, pN.x), y = Math.min(p0.y, pN.y);
        const w = Math.abs(pN.x - p0.x), h = Math.abs(pN.y - p0.y);
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
        ctx.closePath();
        if (useFill) { ctx.fillStyle = fillColor + 'aa'; ctx.fill(); }
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [color, fillColor, strokeWidth, tool, useFill]);

  /* ─── Canvas size on mount ─── */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const updateSize = () => {
      setCanvasSize({
        w: Math.max(wrap.clientWidth, 1200),
        h: Math.max(wrap.clientHeight, 700),
      });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  /* ─── Hit test helper for select tool ─── */
  const hitTestStroke = useCallback((stroke: BoardStroke, x: number, y: number, tolerance: number): boolean => {
    if (!stroke.points || stroke.points.length === 0) return false;
    if (stroke.tool === 'text') {
      const p = stroke.points[0];
      return Math.abs(p.x - x) < 60 && Math.abs(p.y - y) < 20;
    }
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const px = stroke.points[i], nx = stroke.points[i + 1];
      const dx = nx.x - px.x, dy = nx.y - px.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;
      const t = Math.max(0, Math.min(1, ((x - px.x) * dx + (y - px.y) * dy) / (len * len)));
      const projX = px.x + t * dx, projY = px.y + t * dy;
      const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
      if (dist <= tolerance) return true;
    }
    return false;
  }, []);

  /* ─── Mouse / Touch pointer events on the OVERLAY canvas ─── */
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);

    if (tool === 'text') {
      setTextInput({ active: true, x: e.clientX, y: e.clientY, value: '' });
      return;
    }

    if (tool === 'select') {
      // Hit-test strokes (reverse order)
      const hit = [...strokes].reverse().find((s) => hitTestStroke(s, x, y, 8));
      if (hit) {
        setSelectedStrokeId(hit.id);
        setIsDraggingObject(true);
      } else {
        setSelectedStrokeId(null);
      }
      return;
    }

    setPointer({ down: true, x, y, startX: x, startY: y });
    setCurrentPen([{ x, y }]);
    renderOverlay([{ x, y }]);
  }, [tool, toCanvasCoords, strokes, renderOverlay, hitTestStroke]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);

    // Broadcast cursor
    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({
        type: 'broadcast', event: 'cursor', payload: { x, y }
      });
    }

    if (tool === 'select' && isDraggingObject && selectedStrokeId) {
      setStrokes((prev) => prev.map((s) => {
        if (s.id !== selectedStrokeId) return s;
        const newPts = s.points.map((p) => ({
          x: p.x + (x - pointer.x),
          y: p.y + (y - pointer.y),
        }));
        return { ...s, points: newPts };
      }));
      setPointer((p) => ({ ...p, x, y }));
      return;
    }

    if (!pointer.down) return;

    const newPts = tool === 'pen' || tool === 'eraser'
      ? [...currentPen, { x, y }]
      : [{ x: pointer.startX, y: pointer.startY }, { x, y }];

    setCurrentPen(newPts);
    renderOverlay(newPts);
    setPointer((p) => ({ ...p, x, y }));

    // Broadcast current in-progress drawings preview to other collaborators
    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({
        type: 'broadcast',
        event: 'stroke_draw',
        payload: {
          userId: currentUserId,
          stroke: {
            id: 'temp_draw',
            tool: tool,
            points: newPts,
            color,
            width: strokeWidth,
            fill: useFill,
            fillColor: useFill ? fillColor : undefined,
          }
        }
      });
    }
  }, [tool, isDraggingObject, selectedStrokeId, pointer, currentPen, toCanvasCoords, renderOverlay, currentUserId, color, strokeWidth, useFill, fillColor]);

  const onPointerUp = useCallback(() => {
    if (isDraggingObject) {
      setIsDraggingObject(false);
      persistStrokes(strokes);
      return;
    }

    if (!pointer.down || currentPen.length < 1) {
      setPointer((p) => ({ ...p, down: false }));
      return;
    }

    // Commit stroke
    const newStroke: BoardStroke = {
      id: crypto.randomUUID(),
      tool: tool as BoardStroke['tool'],
      points: currentPen,
      color,
      width: strokeWidth,
      fill: useFill,
      fillColor: useFill ? fillColor : undefined,
    };

    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);

    const newStrokes = [...strokes, newStroke];
    setStrokes(newStrokes);
    persistStrokes(newStrokes);

    // Broadcast completed stroke and draw end event
    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({
        type: 'broadcast', event: 'stroke_add', payload: { stroke: newStroke, userId: currentUserId }
      });
      channelRef.current.send({
        type: 'broadcast', event: 'stroke_draw_end', payload: { userId: currentUserId }
      });
    }

    // Clear overlay
    const overlay = overlayRef.current;
    if (overlay) {
      const ctx = overlay.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
    }

    setCurrentPen([]);
    setPointer((p) => ({ ...p, down: false }));
  }, [isDraggingObject, pointer.down, currentPen, tool, color, strokeWidth, useFill, fillColor, strokes, persistStrokes, currentUserId]);

  /* ─── Text commit ─── */
  const commitText = useCallback(() => {
    if (!textInput.value.trim()) {
      setTextInput({ active: false, x: 0, y: 0, value: '' });
      return;
    }
    const { x, y } = toCanvasCoords(textInput.x, textInput.y);
    const newStroke: BoardStroke = {
      id: crypto.randomUUID(),
      tool: 'text',
      points: [{ x, y }],
      color,
      width: strokeWidth,
      text: textInput.value,
      fontSize,
    };
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    const newStrokes = [...strokes, newStroke];
    setStrokes(newStrokes);
    persistStrokes(newStrokes);
    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({ type: 'broadcast', event: 'stroke_add', payload: { stroke: newStroke } });
    }
    setTextInput({ active: false, x: 0, y: 0, value: '' });
  }, [textInput, toCanvasCoords, color, strokeWidth, fontSize, strokes, persistStrokes]);

  /* ─── Undo / Redo ─── */
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, strokes]);
    setStrokes(prev);
    setUndoStack((u) => u.slice(0, -1));
    persistStrokes(prev);
  }, [undoStack, strokes, persistStrokes]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, strokes]);
    setStrokes(next);
    setRedoStack((r) => r.slice(0, -1));
    persistStrokes(next);
  }, [redoStack, strokes, persistStrokes]);

  /* ─── Clear all ─── */
  const handleClearAll = useCallback(() => {
    if (!confirm('Clear all drawings on this board?')) return;
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes([]);
    persistStrokes([]);
    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({ type: 'broadcast', event: 'strokes_clear', payload: {} });
    }
  }, [strokes, persistStrokes]);

  /* ─── Delete selected stroke ─── */
  const handleDeleteSelected = useCallback(() => {
    if (!selectedStrokeId) return;
    const newStrokes = strokes.filter((s) => s.id !== selectedStrokeId);
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes(newStrokes);
    persistStrokes(newStrokes);
    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({ type: 'broadcast', event: 'stroke_delete', payload: { id: selectedStrokeId } });
    }
    setSelectedStrokeId(null);
  }, [selectedStrokeId, strokes, persistStrokes]);

  /* ─── Background change ─── */
  const handleBgChange = useCallback((newBg: string) => {
    setBgColor(newBg);
    updateNode(nodeId, { boardBg: newBg });
    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({ type: 'broadcast', event: 'bg_change', payload: { bg: newBg } });
    }
    setShowBgPicker(false);
  }, [nodeId, updateNode]);

  /* ─── Zoom & Touch Gesture Event Listeners (Non-Passive) ─── */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setView((v) => ({ ...v, scale: Math.min(Math.max(v.scale * delta, 0.15), 4) }));
    };

    wrap.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      wrap.removeEventListener('wheel', onWheel);
    };
  }, []);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const preventTouchDefault = (e: TouchEvent) => {
      e.preventDefault();
    };

    overlay.addEventListener('touchstart', preventTouchDefault, { passive: false });
    overlay.addEventListener('touchmove', preventTouchDefault, { passive: false });

    return () => {
      overlay.removeEventListener('touchstart', preventTouchDefault);
      overlay.removeEventListener('touchmove', preventTouchDefault);
    };
  }, []);

  const handleZoomIn = () => setView((v) => ({ ...v, scale: Math.min(v.scale * 1.2, 4) }));
  const handleZoomOut = () => setView((v) => ({ ...v, scale: Math.max(v.scale * 0.8, 0.15) }));
  const handleZoomReset = () => setView({ scale: 1, offsetX: 0, offsetY: 0 });

  /* ─── Export as PNG ─── */
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create an offscreen canvas to merge the chosen background color with drawing layers
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const oCtx = offscreen.getContext('2d');
    if (oCtx) {
      oCtx.fillStyle = bgColor;
      oCtx.fillRect(0, 0, offscreen.width, offscreen.height);
      oCtx.drawImage(canvas, 0, 0);
    }

    const link = document.createElement('a');
    link.download = `board-${nodeId.slice(0, 6)}.png`;
    link.href = (oCtx ? offscreen : canvas).toDataURL('image/png');
    link.click();
  }, [nodeId, bgColor]);

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (textInput.active) return;
      if (e.key === 'Escape') {
        if (selectedStrokeId) { setSelectedStrokeId(null); return; }
        onClose();
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); handleUndo(); }
        if (e.key === 'y') { e.preventDefault(); handleRedo(); }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedStrokeId && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
      // Tool shortcuts
      const toolMap: Record<string, Tool> = {
        'p': 'pen', 'e': 'eraser', 'l': 'line', 'r': 'rect', 'c': 'circle',
        'a': 'arrow', 't': 'text', 's': 'select', 'v': 'select',
      };
      if (!e.ctrlKey && !e.metaKey && toolMap[e.key.toLowerCase()]) {
        setTool(toolMap[e.key.toLowerCase()]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [textInput.active, selectedStrokeId, handleUndo, handleRedo, handleDeleteSelected, onClose]);

  /* ─── Tool config ─── */
  const tools: { id: Tool; icon: React.ReactNode; label: string; key: string }[] = [
    { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: 'Select', key: 'V' },
    { id: 'pen', icon: <Pen className="w-4 h-4" />, label: 'Pen', key: 'P' },
    { id: 'eraser', icon: <Eraser className="w-4 h-4" />, label: 'Eraser', key: 'E' },
    { id: 'line', icon: <Minus className="w-4 h-4" />, label: 'Line', key: 'L' },
    { id: 'arrow', icon: <ArrowRight className="w-4 h-4" />, label: 'Arrow', key: 'A' },
    { id: 'rect', icon: <Square className="w-4 h-4" />, label: 'Rectangle', key: 'R' },
    { id: 'circle', icon: <Circle className="w-4 h-4" />, label: 'Ellipse', key: 'C' },
    { id: 'triangle', icon: <Triangle className="w-4 h-4" />, label: 'Triangle', key: 'T' },
    { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Text', key: 'T' },
  ];

  const cursorStyle: Record<Tool, string> = {
    select: 'default',
    pen: 'crosshair',
    eraser: 'cell',
    line: 'crosshair',
    arrow: 'crosshair',
    rect: 'crosshair',
    circle: 'crosshair',
    triangle: 'crosshair',
    text: 'text',
  };

  const collaboratorList = Object.entries(collaborators);

  /* ─── Render ─── */
  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="flex flex-col bg-zinc-950 border border-zinc-800/80 shadow-2xl rounded-2xl overflow-hidden relative"
        style={{
          fontFamily: 'Inter, sans-serif',
          width: `${size.width}px`,
          height: `${size.height}px`,
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ TOP TOOLBAR ═══ */}
        <div
          onMouseDown={onDragStart}
          className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur-md z-20 cursor-move select-none"
        >
        {/* Left: Title + Sync */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center">
            <Pen className="w-3.5 h-3.5 text-fuchsia-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground leading-tight">{label}</h2>
            <p className="text-[10px] text-muted-foreground/60 font-light leading-none mt-0.5">
              Board · {strokes.length} object{strokes.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isSyncing && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20">
              <Save className="w-3 h-3 text-fuchsia-400 animate-pulse" />
              <span className="text-[10px] text-fuchsia-400 font-semibold">Saving...</span>
            </div>
          )}
        </div>

        {/* Center: Quick actions */}
        <div className="flex items-center gap-1">
          <button onClick={handleUndo} disabled={undoStack.length === 0}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={handleRedo} disabled={redoStack.length === 0}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-zinc-800 mx-1" />
          <button onClick={handleClearAll}
            className="h-8 px-3 rounded-lg flex items-center gap-1.5 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all cursor-pointer text-xs font-semibold"
            title="Clear Board"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
          {selectedStrokeId && (
            <button onClick={handleDeleteSelected}
              className="h-8 px-3 rounded-lg flex items-center gap-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer text-xs font-semibold border border-red-500/30"
              title="Delete selected (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
          <div className="w-px h-5 bg-zinc-800 mx-1" />
          {/* Zoom controls */}
          <div className="relative">
            <button
              onClick={() => setShowZoomMenu(!showZoomMenu)}
              className="h-8 px-2.5 rounded-lg flex items-center gap-1 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer text-[11px] font-mono font-semibold"
            >
              {Math.round(view.scale * 100)}%
              <ChevronUp className={`w-3 h-3 transition-transform ${showZoomMenu ? 'rotate-180' : ''}`} />
            </button>
            {showZoomMenu && (
              <div className="absolute top-10 left-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[120px]">
                {[25, 50, 75, 100, 125, 150, 200].map((pct) => (
                  <button key={pct}
                    onClick={() => { setView((v) => ({ ...v, scale: pct / 100 })); setShowZoomMenu(false); }}
                    className="w-full px-4 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleZoomIn} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleZoomOut} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleZoomReset} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer" title="Reset View">
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-zinc-800 mx-1" />
          <button onClick={handleExport}
            className="h-8 px-3 rounded-lg flex items-center gap-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer text-xs font-semibold"
            title="Export PNG"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>

        {/* Right: Collaborators + Close */}
        <div className="flex items-center gap-2">
          {collaboratorList.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
              <Users className="w-3 h-3 text-zinc-400" />
              <span className="text-[10px] text-zinc-400 font-semibold">{collaboratorList.length} live</span>
              <div className="flex -space-x-1.5">
                {collaboratorList.slice(0, 4).map(([uid, col]) => (
                  <div key={uid} className="w-4 h-4 rounded-full border border-zinc-900 shrink-0"
                    style={{ backgroundColor: col.color }} title={col.name}
                  />
                ))}
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Close Board (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ═══ MAIN AREA ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT TOOLS PALETTE ── */}
        <div className="w-14 shrink-0 bg-zinc-900/90 backdrop-blur-md border-r border-zinc-800/80 flex flex-col items-center py-3 gap-1 z-20">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.key})`}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative
                ${tool === t.id
                  ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30 scale-105'
                  : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
            >
              {t.icon}
              <span className="absolute left-[52px] bg-zinc-800 text-white text-[10px] font-semibold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none transition-opacity border border-zinc-700 shadow-lg">
                {t.label}
                <span className="ml-1.5 text-zinc-500 font-mono">{t.key}</span>
              </span>
            </button>
          ))}

          <div className="w-8 h-px bg-zinc-800 my-1" />

          {/* Color Swatch */}
          <div className="relative">
            <button
              onClick={() => { setShowPalette(!showPalette); setShowBgPicker(false); }}
              className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-zinc-700 hover:border-zinc-500 transition-all cursor-pointer overflow-hidden"
              title="Stroke Color"
              style={{ backgroundColor: color }}
            >
              <div className="w-4 h-4 rounded-md" style={{ backgroundColor: color, boxShadow: '0 0 0 2px rgba(0,0,0,0.5)' }} />
            </button>
            {showPalette && (
              <div className="absolute left-[52px] top-0 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50 p-3 w-[176px]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Stroke Color</p>
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {PALETTES.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); setShowPalette(false); }}
                      className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: c, borderColor: color === c ? '#6366f1' : 'transparent' }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500">Custom:</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-zinc-700 cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Fill toggle & fill color */}
          {['rect', 'circle', 'triangle'].includes(tool) && (
            <>
              <button
                onClick={() => setUseFill(!useFill)}
                title="Toggle Fill"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer
                  ${useFill ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}
              >
                <PaintBucket className="w-4 h-4" />
              </button>
              {useFill && (
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-zinc-700 cursor-pointer bg-transparent mx-1"
                  title="Fill Color"
                />
              )}
            </>
          )}

          <div className="w-8 h-px bg-zinc-800 my-1" />

          {/* Background picker */}
          <div className="relative">
            <button
              onClick={() => { setShowBgPicker(!showBgPicker); setShowPalette(false); }}
              className="w-10 h-10 rounded-xl border-2 border-zinc-700 flex items-center justify-center hover:border-zinc-500 transition-all cursor-pointer overflow-hidden"
              title="Canvas Background"
            >
              <div className="w-4 h-4 rounded-md border border-zinc-600" style={{ backgroundColor: bgColor }} />
            </button>
            {showBgPicker && (
              <div className="absolute left-[52px] top-0 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50 p-3 w-[176px]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Canvas Background</p>
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {BG_PRESETS.map((preset) => (
                    <button key={preset.value}
                      onClick={() => handleBgChange(preset.value)}
                      className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer transition-all"
                    >
                      <div className="w-10 h-8 rounded-md border border-zinc-700" style={{ backgroundColor: preset.value }} />
                      <span className="text-[8px] text-zinc-400">{preset.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500">Custom:</span>
                  <input type="color" value={bgColor}
                    onChange={(e) => handleBgChange(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-zinc-700 cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CANVAS AREA ── */}
        <div
          ref={wrapRef}
          className="flex-1 overflow-hidden relative"
          style={{ background: `radial-gradient(ellipse at center, ${bgColor}22 0%, #09090b 100%)` }}
        >
          {/* Canvas stack */}
          <div
            className="absolute"
            style={{
              transform: `scale(${view.scale}) translate(${view.offsetX}px, ${view.offsetY}px)`,
              transformOrigin: 'top left',
              top: 0,
              left: 0,
            }}
          >
            {/* Main committed-strokes canvas */}
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              className="block transition-colors duration-300"
              style={{ cursor: cursorStyle[tool], touchAction: 'none', backgroundColor: bgColor }}
            />
            {/* Overlay preview canvas (same size, absolutely stacked) */}
            <canvas
              ref={overlayRef}
              width={canvasSize.w}
              height={canvasSize.h}
              className="absolute inset-0 block"
              style={{ cursor: cursorStyle[tool], touchAction: 'none' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
          </div>

          {/* Collaborator cursors */}
          {collaboratorList.map(([uid, col]) => (
            <div
              key={uid}
              className="absolute pointer-events-none z-30 transition-all duration-75"
              style={{ left: col.x * view.scale + view.offsetX, top: col.y * view.scale + view.offsetY }}
            >
              <div className="w-4 h-4 relative">
                <MousePointer2 className="w-4 h-4 absolute" style={{ color: col.color, filter: 'drop-shadow(0 0 4px currentColor)' }} />
              </div>
              <div
                className="mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold whitespace-nowrap shadow-lg"
                style={{ backgroundColor: col.color, color: '#000' }}
              >
                {col.name}
              </div>
            </div>
          ))}

          {/* Text input overlay */}
          {textInput.active && (
            <div
              className="fixed z-50"
              style={{ left: textInput.x, top: textInput.y }}
            >
              <input
                autoFocus
                type="text"
                value={textInput.value}
                onChange={(e) => setTextInput((t) => ({ ...t, value: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitText();
                  if (e.key === 'Escape') setTextInput({ active: false, x: 0, y: 0, value: '' });
                }}
                onBlur={commitText}
                style={{
                  fontSize: `${fontSize}px`,
                  color,
                  fontFamily: 'Inter, sans-serif',
                  background: 'transparent',
                  border: '1px dashed rgba(99,102,241,0.6)',
                  outline: 'none',
                  borderRadius: 4,
                  padding: '2px 6px',
                  minWidth: 80,
                  caretColor: color,
                }}
                placeholder="Type text..."
              />
            </div>
          )}
        </div>

        {/* ── RIGHT PROPERTIES PANEL ── */}
        <div className="w-[180px] shrink-0 bg-zinc-900/90 backdrop-blur-md border-l border-zinc-800/80 flex flex-col py-4 px-3 gap-4 z-20 overflow-y-auto">
          {/* Stroke Width */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Stroke Width</p>
            <div className="flex flex-wrap gap-1.5">
              {STROKE_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className={`h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center
                    ${strokeWidth === w ? 'bg-fuchsia-500 text-white shadow-md' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                >
                  {w}px
                </button>
              ))}
            </div>
            <input
              type="range"
              min={1}
              max={32}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-full mt-2 h-1.5 rounded-full accent-fuchsia-500 cursor-pointer"
            />
            {/* Preview line */}
            <div className="mt-2 flex items-center justify-center h-8 bg-zinc-800/60 rounded-lg">
              <div className="rounded-full" style={{ width: '60%', height: strokeWidth, backgroundColor: color, maxHeight: 24 }} />
            </div>
          </div>

          {/* Font size (text tool only) */}
          {tool === 'text' && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Font Size</p>
              <input
                type="range"
                min={8}
                max={72}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full h-1.5 rounded-full accent-fuchsia-500 cursor-pointer"
              />
              <p className="text-[10px] text-zinc-400 text-center mt-1">{fontSize}px</p>
            </div>
          )}

          {/* Color Palette */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Colors</p>
            <div className="grid grid-cols-4 gap-1">
              {PALETTES.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 cursor-pointer"
                  style={{ backgroundColor: c, borderColor: color === c ? '#d946ef' : 'transparent' }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] text-zinc-500">Custom</span>
              <input type="color" value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 h-7 rounded-lg border border-zinc-700 cursor-pointer bg-transparent"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-auto pt-3 border-t border-zinc-800">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-600">Objects</span>
                <span className="text-zinc-400 font-mono">{strokes.length}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-600">Undo stack</span>
                <span className="text-zinc-400 font-mono">{undoStack.length}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-600">Zoom</span>
                <span className="text-zinc-400 font-mono">{Math.round(view.scale * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM STATUS ═══ */}
      <div className="h-8 shrink-0 flex items-center justify-between px-4 border-t border-zinc-800/80 bg-zinc-900/90 text-[10px] text-zinc-500">
        <div className="flex items-center gap-4">
          <span>Tool: <span className="text-zinc-300 font-semibold capitalize">{tool}</span></span>
          <span>Shortcuts: P=Pen E=Eraser L=Line A=Arrow R=Rect C=Circle T=Text V=Select</span>
        </div>
        <div className="flex items-center gap-3">
          {selectedStrokeId && (
            <span className="text-fuchsia-400 font-semibold">1 object selected · Del to delete</span>
          )}
          <span>Canvas: {canvasSize.w}×{canvasSize.h}</span>
          {isSyncing && <span className="text-fuchsia-400 animate-pulse">● Syncing</span>}
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50 flex items-end justify-end p-1 select-none"
        title="Drag to resize"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-zinc-500 hover:text-fuchsia-500 active:text-fuchsia-500 transition-colors">
          <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
          <line x1="10" y1="4" x2="4" y2="10" stroke="currentColor" strokeWidth="1.5" />
          <line x1="10" y1="8" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  </div>
);
}
