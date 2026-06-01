'use client';

import {
  useRef, useState, useEffect, useCallback, useLayoutEffect
} from 'react';
import {
  X, Pen, Minus, Square, Circle, Triangle, ArrowRight, Type, Eraser,
  MousePointer2, Undo2, Redo2, Trash2, Download, ZoomIn, ZoomOut,
  RotateCcw, PaintBucket, ChevronUp, Save, Users, Copy, Clipboard,
  Settings, Layers, StickyNote, Highlighter, Grid, AlignLeft, AlignCenter,
  AlignRight, Move, Check, FileDown, Plus
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { playClickSound, playPopSound, playSweepSound } from '@/lib/audioSfx';
import { createClient } from '@/lib/supabase/client';
import { type BoardStroke } from './BoardNode';
import { useDialogStore } from '@/stores/dialogStore';
import { jsPDF } from 'jspdf';

/* ─────────────────────── Types ─────────────────────── */
type Tool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rect' | 'circle' | 'triangle' | 'text' | 'sticky' |
             'rounded-rect' | 'ellipse' | 'diamond' | 'hexagon' |
             'flow-process' | 'flow-decision' | 'flow-data' | 'flow-terminator' |
             'diag-cloud' | 'diag-database' | 'diag-cylinder' | 'diag-document';

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
  clientX: number;
  clientY: number;
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
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#121212' },
  { label: 'Gray', value: '#868e96' },
  { label: 'Light Gray', value: '#f8f9fa' },
  { label: 'Blue', value: '#e7f5ff' },
  { label: 'Green', value: '#ebfbee' },
  { label: 'Yellow', value: '#fff9db' },
  { label: 'Pink', value: '#fff0f6' },
];

/* ─────────────────────── Component ─────────────────────── */
interface BoardCanvasProps {
  nodeId: string;
  label: string;
  initialStrokes: BoardStroke[];
  initialBg?: string;
  initialSheets?: any[];
  initialIsSheetsMode?: boolean;
  onClose: () => void;
}

export function BoardCanvas({
  nodeId,
  label,
  initialStrokes,
  initialBg,
  initialSheets,
  initialIsSheetsMode,
  onClose
}: BoardCanvasProps) {
  /* ── Refs ── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* ── State ── */
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ffffff');
  const [recentColors, setRecentColors] = useState<string[]>(['#ffffff', '#ec4899', '#3b82f6']);
  const [fillColor, setFillColor] = useState('#6366f1');
  const [useFill, setUseFill] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [opacity, setOpacity] = useState(1);
  const [bgColor, setBgColor] = useState(initialBg || '#121212');
  
  // Connectors State
  const [arrowType, setArrowType] = useState<'straight' | 'curved' | 'elbow' | 'orthogonal' | 'curved-multi'>('straight');
  const [arrowheadStart, setArrowheadStart] = useState<'none' | 'triangle' | 'circle' | 'diamond'>('none');
  const [arrowheadEnd, setArrowheadEnd] = useState<'none' | 'triangle' | 'circle' | 'diamond'>('triangle');

  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [fontWeight, setFontWeight] = useState('normal');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  
  const [strokes, setStrokes] = useState<BoardStroke[]>(initialStrokes);
  const [undoStack, setUndoStack] = useState<BoardStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<BoardStroke[][]>([]);
  const [pointer, setPointer] = useState<PointerState>({ down: false, x: 0, y: 0, startX: 0, startY: 0 });
  const [currentPen, setCurrentPen] = useState<{ x: number; y: number }[]>([]);
  const [textInput, setTextInput] = useState<TextInput>({ active: false, x: 0, y: 0, clientX: 0, clientY: 0, value: '' });
  const [editingStrokeId, setEditingStrokeId] = useState<string | null>(null);
  
  const [view, setView] = useState<ViewTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [gridType, setGridType] = useState<'dots' | 'lines' | 'none'>('dots');
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const isSpacePressedRef = useRef(false);

  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [regionSelectStart, setRegionSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [regionSelectCurrent, setRegionSelectCurrent] = useState<{ x: number; y: number } | null>(null);

  const [showPalette, setShowPalette] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showLineMenu, setShowLineMenu] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [copiedStrokes, setCopiedStrokes] = useState<BoardStroke[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; canvasX: number; canvasY: number; strokeId?: string; strokeTool?: string } | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  
  const [collaborators, setCollaborators] = useState<Record<string, { x: number; y: number; color: string; name: string }>>({});
  const [remoteDrawings, setRemoteDrawings] = useState<Record<string, BoardStroke>>({});
  const [currentUserId, setCurrentUserId] = useState<string>('collaborator');
  const [userName, setUserName] = useState<string>('Collaborator');
  const [userColor] = useState<string>(() => PALETTES[Math.floor(Math.random() * PALETTES.length)] || '#ec4899');

  // Sheets Mode & Sizing State
  const [isSheetsMode, setIsSheetsMode] = useState<boolean>(initialIsSheetsMode || false);
  const [sheets, setSheets] = useState<any[]>(initialSheets || []);
  const [selectedPreset, setSelectedPreset] = useState('A4 Portrait');

  const isSheetsModeRef = useRef(isSheetsMode);
  const sheetsRef = useRef(sheets);

  useEffect(() => {
    isSheetsModeRef.current = isSheetsMode;
  }, [isSheetsMode]);

  useEffect(() => {
    sheetsRef.current = sheets;
  }, [sheets]);

  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 800 });
  const [size, setSize] = useState({ width: 1200, height: 800 });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const resizeRef = useRef<{ startWidth: number; startHeight: number; startX: number; startY: number } | null>(null);
  const lastBroadcastTimeRef = useRef<number>(0);
  const lastPastePosRef = useRef<{ x: number; y: number } | null>(null);
  const consecutivePasteCountRef = useRef<number>(0);

  const dragStartRef = useRef<{
    mode: 'none' | 'drag-objects' | 'resize' | 'rotate' | 'pan' | 'region-select' | 'drag-node';
    startX: number;
    startY: number;
    resizeHandle?: string;
    nodeIndex?: number;
    originalStrokes: Record<string, BoardStroke>;
    panStart?: { offsetX: number; offsetY: number };
    selectionStart?: { x: number; y: number };
  }>({ mode: 'none', startX: 0, startY: 0, originalStrokes: {} });

  const updateNode = useEditorStore((s) => s.updateNode);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  const closeAllFloatingMenus = useCallback(() => {
    setShowLineMenu(false);
    setShowShapesMenu(false);
    setContextMenu(null);
    setShowPalette(false);
    setShowBgPicker(false);
    setShowExportMenu(false);
    setShowZoomMenu(false);
  }, []);

  const handleCloseConfirm = useCallback(async () => {
    const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
    const title = isRtl ? 'إغلاق لوحة الرسم؟' : 'Close Board?';
    const message = isRtl
      ? 'هل أنت متأكد من رغبتك في إغلاق لوحة الرسم؟ قد تفقد التغييرات غير المحفوظة.'
      : 'Are you sure you want to close the whiteboard? Unsaved changes may be lost.';
    const confirmText = isRtl ? 'نعم، إغلاق' : 'Yes, Close';
    const cancelText = isRtl ? 'إلغاء' : 'Cancel';

    const confirmed = await useDialogStore.getState().showConfirm(title, message, {
      confirmText,
      cancelText
    });
    if (confirmed) {
      onClose();
    }
  }, [onClose]);

  // Resize modal window initially
  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: Math.floor(window.innerWidth * 0.95),
        height: Math.floor(window.innerHeight * 0.92),
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update mouse position Ref
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    wrap.addEventListener('mousemove', handleMouseMove);
    return () => wrap.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Close context menu on document click
  useEffect(() => {
    if (!contextMenu) return;
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, [contextMenu]);

  // Close line menu on document click
  useEffect(() => {
    if (!showLineMenu) return;
    const handleCloseMenu = () => setShowLineMenu(false);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, [showLineMenu]);

  // Close shapes menu on document click
  useEffect(() => {
    if (!showShapesMenu) return;
    const handleCloseMenu = () => setShowShapesMenu(false);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, [showShapesMenu]);

  // Load active user session metadata
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data?.session?.user?.id;
      if (uid) {
        setCurrentUserId(uid);
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', uid)
          .single()
          .then(({ data: profile }) => {
            const p = profile as any;
            if (p?.full_name) {
              setUserName(p.full_name);
            }
          });
      }
    });
  }, [supabase]);

  /* ─── Realtime collaboration sub-channel ─── */
  useEffect(() => {
    const ch = supabase.channel(`board:${nodeId}`, {
      config: { broadcast: { self: false } }
    });

    ch.on('broadcast', { event: 'pointer_sync' }, ({ payload }) => {
      if (!payload?.userId) return;
      setCollaborators((prev) => ({
        ...prev,
        [payload.userId]: {
          x: payload.x,
          y: payload.y,
          color: payload.color || '#ec4899',
          name: payload.name || 'User',
        },
      }));
      if (payload.drawing) {
        setRemoteDrawings((prev) => ({
          ...prev,
          [payload.userId]: payload.drawing,
        }));
      } else {
        setRemoteDrawings((prev) => {
          if (!prev[payload.userId]) return prev;
          const next = { ...prev };
          delete next[payload.userId];
          return next;
        });
      }
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
      if (payload.userId) {
        setRemoteDrawings((prev) => {
          const next = { ...prev };
          delete next[payload.userId];
          return next;
        });
      }
      setStrokes((prev) => {
        if (prev.some((s) => s.id === payload.stroke.id)) return prev;
        return [...prev, payload.stroke];
      });
    });

    ch.on('broadcast', { event: 'strokes_clear' }, () => {
      setStrokes([]);
      setRemoteDrawings({});
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
  }, [nodeId, supabase]);

  /* ─── Persist strokes to node data (debounced) ─── */
  const persistStrokesRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistStrokes = useCallback((newStrokes: BoardStroke[], newBg?: string) => {
    if (persistStrokesRef.current) clearTimeout(persistStrokesRef.current);
    persistStrokesRef.current = setTimeout(() => {
      setIsSyncing(true);
      updateNode(nodeId, {
        boardStrokes: newStrokes,
        boardBg: newBg || bgColor,
        boardSheets: sheetsRef.current,
        isSheetsMode: isSheetsModeRef.current,
      });
      setTimeout(() => setIsSyncing(false), 600);
    }, 800);
  }, [nodeId, updateNode, bgColor]);



  // Drag modal window
  const onDragStart = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('textarea')) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
    const onDragMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      setPosition({
        x: dragRef.current.startPosX + (me.clientX - dragRef.current.startX),
        y: dragRef.current.startPosY + (me.clientY - dragRef.current.startY),
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
    resizeRef.current = {
      startWidth: size.width,
      startHeight: size.height,
      startX: e.clientX,
      startY: e.clientY,
    };
    const onResizeMove = (me: MouseEvent) => {
      if (!resizeRef.current) return;
      setSize({
        width: Math.max(800, resizeRef.current.startWidth + (me.clientX - resizeRef.current.startX)),
        height: Math.max(500, resizeRef.current.startHeight + (me.clientY - resizeRef.current.startY)),
      });
    };
    const onResizeStop = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', onResizeMove);
      document.removeEventListener('mouseup', onResizeStop);
    };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeStop);
  };

  // Convert Client coordinates to Canvas coordinates
  const toCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - view.offsetX) / view.scale;
    const y = (clientY - rect.top - view.offsetY) / view.scale;
    return { x, y };
  }, [view]);

  // Bounding box calculations
  const getStrokeBoundingBox = useCallback((stroke: BoardStroke) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    if (!stroke.points || stroke.points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    if (stroke.tool === 'sticky') {
      const p1 = stroke.points[0];
      const p2 = stroke.points[1] || { x: p1.x + 160, y: p1.y + 160 };
      return {
        minX: Math.min(p1.x, p2.x),
        minY: Math.min(p1.y, p2.y),
        maxX: Math.max(p1.x, p2.x),
        maxY: Math.max(p1.y, p2.y)
      };
    }
    stroke.points.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    const pad = (stroke.width || 2) + 5;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }, []);

  const getCombinedBoundingBox = useCallback((ids: string[]) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ids.forEach((id) => {
      const stroke = strokes.find((s) => s.id === id);
      if (!stroke) return;
      const box = getStrokeBoundingBox(stroke);
      minX = Math.min(minX, box.minX);
      minY = Math.min(minY, box.minY);
      maxX = Math.max(maxX, box.maxX);
      maxY = Math.max(maxY, box.maxY);
    });
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  }, [strokes, getStrokeBoundingBox]);

  const isStrokeInViewport = useCallback((stroke: BoardStroke, visibleRect: { minX: number; minY: number; maxX: number; maxY: number }) => {
    const box = getStrokeBoundingBox(stroke);
    return !(
      box.maxX < visibleRect.minX ||
      box.minX > visibleRect.maxX ||
      box.maxY < visibleRect.minY ||
      box.minY > visibleRect.maxY
    );
  }, [getStrokeBoundingBox]);

  const broadcastSheets = useCallback((newSheets: any[], sheetsMode: boolean) => {
    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({
        type: 'broadcast',
        event: 'sheets_change',
        payload: { sheets: newSheets, isSheetsMode: sheetsMode }
      });
    }
  }, []);

  const isStrokeInSheet = useCallback((stroke: BoardStroke, sheet: any) => {
    const box = getStrokeBoundingBox(stroke);
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    return cx >= sheet.x && cx <= sheet.x + sheet.width && cy >= sheet.y && cy <= sheet.y + sheet.height;
  }, [getStrokeBoundingBox]);

  const handleSheetsModeToggle = useCallback((active: boolean) => {
    setIsSheetsMode(active);
    isSheetsModeRef.current = active;
    let nextSheets = [...sheetsRef.current];
    if (active && nextSheets.length === 0) {
      nextSheets = [
        {
          id: Math.random().toString(36).slice(2),
          name: 'Page 1',
          x: 0,
          y: 0,
          width: 794,
          height: 1123,
          preset: 'A4 Portrait'
        }
      ];
      setSheets(nextSheets);
      sheetsRef.current = nextSheets;
    }
    broadcastSheets(nextSheets, active);
    persistStrokes(strokes);
  }, [broadcastSheets, persistStrokes, strokes]);

  const handleAddSheet = useCallback((preset: string) => {
    const getPresetDims = (presetName: string) => {
      switch (presetName) {
        case 'A4 Landscape': return { width: 1123, height: 794 };
        case 'Letter Portrait': return { width: 816, height: 1056 };
        case 'Letter Landscape': return { width: 1056, height: 816 };
        case 'Square': return { width: 800, height: 800 };
        case 'A4 Portrait':
        default:
          return { width: 794, height: 1123 };
      }
    };

    const dims = getPresetDims(preset);
    let newX = 0;
    let newY = 0;
    const currentSheets = sheetsRef.current;
    if (currentSheets.length > 0) {
      const rightmost = currentSheets.reduce((max: any, s: any) => s.x + s.width > max.x + max.width ? s : max, currentSheets[0]);
      newX = rightmost.x + rightmost.width + 100;
      newY = rightmost.y;
    }
    const newSheet = {
      id: Math.random().toString(36).slice(2),
      name: `Page ${currentSheets.length + 1}`,
      x: newX,
      y: newY,
      width: dims.width,
      height: dims.height,
      preset
    };
    const next = [...currentSheets, newSheet];
    setSheets(next);
    sheetsRef.current = next;
    broadcastSheets(next, isSheetsModeRef.current);
    persistStrokes(strokes);
  }, [broadcastSheets, persistStrokes, strokes]);

  const handleDeleteSheet = useCallback(async (sheetId: string) => {
    const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
    const title = isRtl ? 'حذف الصفحة؟' : 'Delete Page?';
    const message = isRtl
      ? 'هل أنت متأكد من رغبتك في حذف هذه الصفحة؟ سيتم نقل العناصر الموجودة في الصفحات التالية تلقائياً.'
      : 'Are you sure you want to delete this page? Elements in subsequent pages will shift automatically.';
    const confirmText = isRtl ? 'نعم، احذف' : 'Yes, Delete';
    const cancelText = isRtl ? 'إلغاء' : 'Cancel';

    const confirmed = await useDialogStore.getState().showConfirm(title, message, {
      confirmText,
      cancelText
    });
    if (!confirmed) return;

    const currentSheets = sheetsRef.current;
    const index = currentSheets.findIndex((s: any) => s.id === sheetId);
    if (index === -1) return;

    const targetSheet = currentSheets[index];
    const nextSheets = currentSheets.filter((s: any) => s.id !== sheetId);
    const shiftOffset = targetSheet.width + 100;

    const updatedStrokes = strokes.map((stroke) => {
      const rightSheets = currentSheets.slice(index + 1);
      const inRightSheet = rightSheets.find((s: any) => isStrokeInSheet(stroke, s));
      if (inRightSheet) {
        return {
          ...stroke,
          points: stroke.points.map(p => ({ x: p.x - shiftOffset, y: p.y }))
        };
      }
      return stroke;
    });

    const finalSheets = nextSheets.map((s: any, idx: number) => {
      if (idx >= index) {
        return { ...s, x: s.x - shiftOffset };
      }
      return s;
    });

    setSheets(finalSheets);
    sheetsRef.current = finalSheets;
    setStrokes(updatedStrokes);

    broadcastSheets(finalSheets, isSheetsModeRef.current);
    if (channelRef.current?.state === 'joined') {
      updatedStrokes.forEach((st) => {
        channelRef.current.send({
          type: 'broadcast',
          event: 'stroke_add',
          payload: { stroke: st, userId: currentUserId }
        });
      });
    }
    persistStrokes(updatedStrokes);
  }, [strokes, isStrokeInSheet, broadcastSheets, persistStrokes, currentUserId]);

  const handleMoveSheet = useCallback((index: number, direction: 'up' | 'down') => {
    const currentSheets = sheetsRef.current;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentSheets.length) return;

    const nextSheets = [...currentSheets];
    const sheetA = { ...nextSheets[index] };
    const sheetB = { ...nextSheets[targetIdx] };

    // Find shapes in A and B using pre-swap coords
    const strokesInA = strokes.filter(s => isStrokeInSheet(s, sheetA));
    const strokesInB = strokes.filter(s => isStrokeInSheet(s, sheetB));

    // Swap coordinates
    const tempX = nextSheets[index].x;
    const tempY = nextSheets[index].y;
    nextSheets[index].x = nextSheets[targetIdx].x;
    nextSheets[index].y = nextSheets[targetIdx].y;
    nextSheets[targetIdx].x = tempX;
    nextSheets[targetIdx].y = tempY;

    // Swap order in array
    const temp = nextSheets[index];
    nextSheets[index] = nextSheets[targetIdx];
    nextSheets[targetIdx] = temp;

    // Offsets
    const offsetAX = sheetB.x - sheetA.x;
    const offsetAY = sheetB.y - sheetA.y;
    const offsetBX = sheetA.x - sheetB.x;
    const offsetBY = sheetA.y - sheetB.y;

    const updatedStrokes = strokes.map((stroke) => {
      if (strokesInA.some(s => s.id === stroke.id)) {
        return {
          ...stroke,
          points: stroke.points.map((p) => ({ x: p.x + offsetAX, y: p.y + offsetAY }))
        };
      }
      if (strokesInB.some(s => s.id === stroke.id)) {
        return {
          ...stroke,
          points: stroke.points.map((p) => ({ x: p.x + offsetBX, y: p.y + offsetBY }))
        };
      }
      return stroke;
    });

    setSheets(nextSheets);
    sheetsRef.current = nextSheets;
    setStrokes(updatedStrokes);

    broadcastSheets(nextSheets, isSheetsModeRef.current);
    if (channelRef.current?.state === 'joined') {
      updatedStrokes.forEach((st) => {
        channelRef.current.send({
          type: 'broadcast',
          event: 'stroke_add',
          payload: { stroke: st, userId: currentUserId }
        });
      });
    }
    persistStrokes(updatedStrokes);
  }, [strokes, isStrokeInSheet, broadcastSheets, persistStrokes, currentUserId]);

  const handleFocusSheet = useCallback((sheet: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const padding = 60;
    const scaleX = (canvas.width - padding * 2) / sheet.width;
    const scaleY = (canvas.height - padding * 2) / sheet.height;
    const newScale = Math.max(0.1, Math.min(2.0, Math.min(scaleX, scaleY)));

    const offsetX = (canvas.width - sheet.width * newScale) / 2 - sheet.x * newScale;
    const offsetY = (canvas.height - sheet.height * newScale) / 2 - sheet.y * newScale;

    setView({ scale: newScale, offsetX, offsetY });
  }, []);

  // Complete math-based hit-testing for shapes
  const hitTestStroke = useCallback((stroke: BoardStroke, x: number, y: number, tolerance: number): boolean => {
    if (!stroke.points || stroke.points.length === 0) return false;

    if (stroke.tool === 'text') {
      const p = stroke.points[0];
      const fs = stroke.fontSize || 18;
      const textLen = stroke.text ? stroke.text.length : 0;
      const estWidth = textLen * fs * 0.6;
      const estHeight = fs;
      const align = stroke.textAlign || 'left';
      let minX = p.x;
      if (align === 'center') minX = p.x - estWidth / 2;
      else if (align === 'right') minX = p.x - estWidth;
      return x >= minX - tolerance && x <= minX + estWidth + tolerance && y >= p.y - estHeight - tolerance && y <= p.y + tolerance;
    }

    if (stroke.tool === 'sticky') {
      const p1 = stroke.points[0];
      const p2 = stroke.points[1] || { x: p1.x + 160, y: p1.y + 160 };
      return x >= Math.min(p1.x, p2.x) && x <= Math.max(p1.x, p2.x) && y >= Math.min(p1.y, p2.y) && y <= Math.max(p1.y, p2.y);
    }

    const isBoxShape = [
      'rect', 'rounded-rect', 'flow-process', 'flow-terminator', 
      'diag-cloud', 'diag-database', 'diag-cylinder', 'diag-document'
    ].includes(stroke.tool);

    if (isBoxShape && stroke.points.length >= 2) {
      const p0 = stroke.points[0];
      const pN = stroke.points[stroke.points.length - 1];
      const minX = Math.min(p0.x, pN.x);
      const minY = Math.min(p0.y, pN.y);
      const maxX = Math.max(p0.x, pN.x);
      const maxY = Math.max(p0.y, pN.y);
      
      if (stroke.fill) {
        return x >= minX - tolerance && x <= maxX + tolerance && y >= minY - tolerance && y <= maxY + tolerance;
      } else {
        const nearLeft = Math.abs(x - minX) <= tolerance && y >= minY - tolerance && y <= maxY + tolerance;
        const nearRight = Math.abs(x - maxX) <= tolerance && y >= minY - tolerance && y <= maxY + tolerance;
        const nearTop = Math.abs(y - minY) <= tolerance && x >= minX - tolerance && x <= maxX + tolerance;
        const nearBottom = Math.abs(y - maxY) <= tolerance && x >= minX - tolerance && x <= maxX + tolerance;
        return nearLeft || nearRight || nearTop || nearBottom;
      }
    }

    if ((stroke.tool === 'circle' || stroke.tool === 'ellipse') && stroke.points.length >= 2) {
      const p0 = stroke.points[0];
      const pN = stroke.points[stroke.points.length - 1];
      const cx = (p0.x + pN.x) / 2;
      const cy = (p0.y + pN.y) / 2;
      const rx = Math.abs(pN.x - p0.x) / 2;
      const ry = Math.abs(pN.y - p0.y) / 2;
      if (rx === 0 || ry === 0) return false;
      const normDist = ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2);
      if (stroke.fill) {
        return normDist <= 1.05;
      } else {
        return Math.abs(Math.sqrt(normDist) - 1) * Math.max(rx, ry) <= tolerance;
      }
    }

    if (stroke.tool === 'triangle' && stroke.points.length >= 2) {
      const p0 = stroke.points[0];
      const pN = stroke.points[stroke.points.length - 1];
      const minX = Math.min(p0.x, pN.x);
      const minY = Math.min(p0.y, pN.y);
      const w = Math.abs(pN.x - p0.x);
      const h = Math.abs(pN.y - p0.y);
      
      const v0 = { x: minX + w / 2, y: minY };
      const v1 = { x: minX + w, y: minY + h };
      const v2 = { x: minX, y: minY + h };
      
      const ptInTriangle = (p: {x: number; y: number}, a: {x: number; y: number}, b: {x: number; y: number}, c: {x: number; y: number}) => {
        const det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
        if (det === 0) return false;
        const fa = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / det;
        const fb = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / det;
        const fc = 1 - fa - fb;
        return fa >= 0 && fb >= 0 && fc >= 0;
      };
      
      if (stroke.fill) {
        return ptInTriangle({ x, y }, v0, v1, v2);
      } else {
        const nearEdge = (p: {x: number; y: number}, a: {x: number; y: number}, b: {x: number; y: number}) => {
          const dx = b.x - a.x, dy = b.y - a.y;
          const len = Math.sqrt(dx*dx + dy*dy);
          if (len === 0) return false;
          const t = Math.max(0, Math.min(1, ((p.x - a.x)*dx + (p.y - a.y)*dy) / (len*len)));
          const px = a.x + t*dx, py = a.y + t*dy;
          return Math.sqrt((p.x - px)**2 + (p.y - py)**2) <= tolerance;
        };
        return nearEdge({ x, y }, v0, v1) || nearEdge({ x, y }, v1, v2) || nearEdge({ x, y }, v2, v0);
      }
    }

    if (['diamond', 'hexagon', 'flow-decision', 'flow-data'].includes(stroke.tool) && stroke.points.length >= 2) {
      const p0 = stroke.points[0];
      const pN = stroke.points[stroke.points.length - 1];
      const minX = Math.min(p0.x, pN.x);
      const minY = Math.min(p0.y, pN.y);
      const w = Math.abs(pN.x - p0.x);
      const h = Math.abs(pN.y - p0.y);
      
      const v0 = { x: minX + w / 2, y: minY };
      const v1 = { x: minX + w, y: minY + h / 2 };
      const v2 = { x: minX + w / 2, y: minY + h };
      const v3 = { x: minX, y: minY + h / 2 };

      const nearEdge = (p: {x: number; y: number}, a: {x: number; y: number}, b: {x: number; y: number}) => {
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        if (len === 0) return false;
        const t = Math.max(0, Math.min(1, ((p.x - a.x)*dx + (p.y - a.y)*dy) / (len*len)));
        return Math.sqrt((p.x - (a.x + t*dx))**2 + (p.y - (a.y + t*dy))**2) <= tolerance;
      };

      if (stroke.fill) {
        return x >= minX && x <= minX + w && y >= minY && y <= minY + h;
      }
      return nearEdge({x,y}, v0, v1) || nearEdge({x,y}, v1, v2) || nearEdge({x,y}, v2, v3) || nearEdge({x,y}, v3, v0);
    }

    for (let i = 0; i < stroke.points.length - 1; i++) {
      const px = stroke.points[i], nx = stroke.points[i + 1];
      const dx = nx.x - px.x, dy = nx.y - px.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;
      const t = Math.max(0, Math.min(1, ((x - px.x) * dx + (y - px.y) * dy) / (len * len)));
      const projX = px.x + t * dx, projY = px.y + t * dy;
      if (Math.sqrt((x - projX) ** 2 + (y - projY) ** 2) <= tolerance) return true;
    }
    return false;
  }, []);

  const hitTestSelectionHandle = useCallback((x: number, y: number): { type: string; nodeIndex?: number } | null => {
    if (selectedStrokeIds.length === 0) return null;

    // Check individual line/arrow node handles first
    if (selectedStrokeIds.length === 1) {
      const s = strokes.find((st) => st.id === selectedStrokeIds[0]);
      if (s && (s.tool === 'line' || s.tool === 'arrow')) {
        const handleSize = 10 / view.scale;
        const tolerance = 6 / view.scale;
        for (let i = 0; i < s.points.length; i++) {
          const p = s.points[i];
          if (Math.hypot(x - p.x, y - p.y) <= (handleSize / 2 + tolerance)) {
            return { type: 'node', nodeIndex: i };
          }
        }
      }
    }

    const box = getCombinedBoundingBox(selectedStrokeIds);
    if (box.minX === Infinity) return null;

    const handleSize = 8 / view.scale;
    const tolerance = 6 / view.scale;
    const rotateLineLen = 20 / view.scale;

    const handles = [
      { x: box.minX, y: box.minY, name: 'tl' },
      { x: box.maxX, y: box.minY, name: 'tr' },
      { x: box.minX, y: box.maxY, name: 'bl' },
      { x: box.maxX, y: box.maxY, name: 'br' },
      { x: box.minX + box.w / 2, y: box.minY, name: 't' },
      { x: box.minX + box.w / 2, y: box.maxY, name: 'b' },
      { x: box.minX, y: box.minY + box.h / 2, name: 'l' },
      { x: box.maxX, y: box.minY + box.h / 2, name: 'r' },
      { x: box.minX + box.w / 2, y: box.minY - rotateLineLen, name: 'rotate' },
    ];

    for (const h of handles) {
      if (Math.abs(x - h.x) <= (handleSize / 2 + tolerance) && Math.abs(y - h.y) <= (handleSize / 2 + tolerance)) {
        return { type: h.name };
      }
    }
    return null;
  }, [selectedStrokeIds, strokes, getCombinedBoundingBox, view.scale]);

  // Properties modification applying to selection
  const updateSelectedStrokesProperty = useCallback((updater: (s: BoardStroke) => BoardStroke) => {
    if (selectedStrokeIds.length === 0) return;
    setStrokes((prev) => {
      const next = prev.map((s) => {
        if (!selectedStrokeIds.includes(s.id)) return s;
        const updated = updater(s);
        if (channelRef.current?.state === 'joined') {
          channelRef.current.send({
            type: 'broadcast',
            event: 'stroke_add',
            payload: { stroke: updated, userId: currentUserId }
          });
        }
        return updated;
      });
      persistStrokes(next);
      return next;
    });
  }, [selectedStrokeIds, currentUserId, persistStrokes]);

  // Styling properties handlers
  const handleBrushColorChange = useCallback((newColor: string) => {
    setColor(newColor);
    updateSelectedStrokesProperty((s) => ({ ...s, color: newColor }));
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== newColor.toLowerCase());
      return [newColor, ...filtered].slice(0, 3);
    });
  }, [updateSelectedStrokesProperty]);

  const handleStrokeWidthChange = useCallback((newWidth: number) => {
    setStrokeWidth(newWidth);
    updateSelectedStrokesProperty((s) => ({ ...s, width: newWidth }));
  }, [updateSelectedStrokesProperty]);

  const handleOpacityChange = useCallback((newOpacity: number) => {
    setOpacity(newOpacity);
    updateSelectedStrokesProperty((s) => ({ ...s, opacity: newOpacity }));
  }, [updateSelectedStrokesProperty]);

  const handleUseFillChange = useCallback((newUseFill: boolean) => {
    setUseFill(newUseFill);
    updateSelectedStrokesProperty((s) => ({ ...s, fill: newUseFill, fillColor: newUseFill ? fillColor : undefined }));
  }, [fillColor, updateSelectedStrokesProperty]);

  const handleFillColorChange = useCallback((newFillColor: string) => {
    setFillColor(newFillColor);
    updateSelectedStrokesProperty((s) => ({ ...s, fill: true, fillColor: newFillColor }));
  }, [updateSelectedStrokesProperty]);

  const handleFontSizeChange = useCallback((newSize: number) => {
    setFontSize(newSize);
    updateSelectedStrokesProperty((s) => ({ ...s, fontSize: newSize }));
  }, [updateSelectedStrokesProperty]);

  const handleFontWeightChange = useCallback((newWeight: string) => {
    setFontWeight(newWeight);
    updateSelectedStrokesProperty((s) => ({ ...s, fontWeight: newWeight }));
  }, [updateSelectedStrokesProperty]);

  const handleFontFamilyChange = useCallback((newFamily: string) => {
    setFontFamily(newFamily);
    updateSelectedStrokesProperty((s) => ({ ...s, fontFamily: newFamily }));
  }, [updateSelectedStrokesProperty]);

  const handleTextAlignChange = useCallback((newAlign: 'left' | 'center' | 'right') => {
    setTextAlign(newAlign);
    updateSelectedStrokesProperty((s) => ({ ...s, textAlign: newAlign }));
  }, [updateSelectedStrokesProperty]);

  const handleArrowTypeChange = useCallback((newType: 'straight' | 'curved' | 'elbow' | 'orthogonal') => {
    setArrowType(newType);
    updateSelectedStrokesProperty((s) => ({ ...s, arrowType: newType }));
  }, [updateSelectedStrokesProperty]);

  const handleArrowheadStartChange = useCallback((newHead: 'none' | 'triangle' | 'circle' | 'diamond') => {
    setArrowheadStart(newHead);
    updateSelectedStrokesProperty((s) => ({ ...s, arrowheadStart: newHead }));
  }, [updateSelectedStrokesProperty]);

  const handleArrowheadEndChange = useCallback((newHead: 'none' | 'triangle' | 'circle' | 'diamond') => {
    setArrowheadEnd(newHead);
    updateSelectedStrokesProperty((s) => ({ ...s, arrowheadEnd: newHead }));
  }, [updateSelectedStrokesProperty]);

  /* ─── Draw stroke helper ─── */
  const drawStroke = useCallback(function drawStrokeImpl(ctx: CanvasRenderingContext2D, stroke: BoardStroke, isSelected = false) {
    if (!stroke.points || stroke.points.length === 0) return;
    ctx.save();
    
    ctx.strokeStyle = stroke.color || '#ffffff';
    ctx.lineWidth = stroke.width || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 1;
    
    if (stroke.strokeDasharray) {
      ctx.setLineDash(stroke.strokeDasharray.split(',').map(Number));
    } else {
      ctx.setLineDash([]);
    }

    if (isSelected) {
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 8;
    }

    if (stroke.tool === 'pen' || stroke.tool === 'highlighter') {
      if (stroke.points.length < 2) { ctx.restore(); return; }
      ctx.save();
      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = (stroke.opacity !== undefined ? stroke.opacity : 1) * 0.45;
        ctx.strokeStyle = stroke.color || '#eab308';
        ctx.lineWidth = stroke.width * 2.5;
        ctx.lineCap = 'square';
      }
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
      ctx.restore();

    } else if (stroke.tool === 'eraser') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.lineWidth = stroke.width * 3;
      ctx.stroke();
      ctx.restore();

    } else if (stroke.tool === 'text') {
      const p = stroke.points[0];
      ctx.fillStyle = stroke.color || '#ffffff';
      const fs = stroke.fontSize || 18;
      const fw = stroke.fontWeight || 'normal';
      const ff = stroke.fontFamily || 'Inter, sans-serif';
      ctx.font = `${fw} ${fs}px ${ff}`;
      ctx.textAlign = stroke.textAlign || 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(stroke.text || '', p.x, p.y);

    } else if (stroke.tool === 'sticky') {
      const p1 = stroke.points[0];
      const p2 = stroke.points[1] || { x: p1.x + 160, y: p1.y + 160 };
      const w = Math.max(120, p2.x - p1.x);
      const h = Math.max(120, p2.y - p1.y);

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = stroke.fillColor || '#fef08a';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(p1.x, p1.y, w, h, 8);
      } else {
        ctx.rect(p1.x, p1.y, w, h);
      }
      ctx.fill();

      // Folded corner
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.beginPath();
      ctx.moveTo(p1.x + w - 16, p1.y + h);
      ctx.lineTo(p1.x + w, p1.y + h - 16);
      ctx.lineTo(p1.x + w, p1.y + h);
      ctx.closePath();
      ctx.fill();

      if (stroke.text) {
        ctx.fillStyle = stroke.color || '#18181b';
        ctx.font = `bold ${stroke.fontSize || 13}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const padding = 15;
        const maxWidth = w - padding * 2;
        const words = stroke.text.split(' ');
        const lines = [];
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const width = ctx.measureText(currentLine + ' ' + word).width;
          if (width < maxWidth) {
            currentLine += ' ' + word;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }
        lines.push(currentLine);

        const lineHeight = (stroke.fontSize || 13) + 4;
        const totalHeight = lines.length * lineHeight;
        const startY = p1.y + h / 2 - totalHeight / 2 + lineHeight / 2;

        lines.forEach((line, index) => {
          ctx.fillText(line, p1.x + w / 2, startY + index * lineHeight);
        });
      }
      ctx.restore();

    } else if (stroke.points.length >= 2) {
      const p0 = stroke.points[0];
      const pN = stroke.points[stroke.points.length - 1];
      const px = Math.min(p0.x, pN.x);
      const py = Math.min(p0.y, pN.y);
      const pw = Math.abs(pN.x - p0.x);
      const ph = Math.abs(pN.y - p0.y);

      ctx.beginPath();

      if (stroke.tool === 'rect' || stroke.tool === 'flow-process') {
        ctx.rect(px, py, pw, ph);
      } else if (stroke.tool === 'rounded-rect' || stroke.tool === 'flow-terminator') {
        const r = stroke.tool === 'flow-terminator' ? ph / 2 : 8;
        if (ctx.roundRect) {
          ctx.roundRect(px, py, pw, ph, r);
        } else {
          ctx.rect(px, py, pw, ph);
        }
      } else if (stroke.tool === 'circle' || stroke.tool === 'ellipse') {
        ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2);
      } else if (stroke.tool === 'triangle') {
        ctx.moveTo(px + pw / 2, py);
        ctx.lineTo(px + pw, py + ph);
        ctx.lineTo(px, py + ph);
        ctx.closePath();
      } else if (stroke.tool === 'diamond' || stroke.tool === 'flow-decision') {
        ctx.moveTo(px + pw / 2, py);
        ctx.lineTo(px + pw, py + ph / 2);
        ctx.lineTo(px + pw / 2, py + ph);
        ctx.lineTo(px, py + ph / 2);
        ctx.closePath();
      } else if (stroke.tool === 'hexagon') {
        ctx.moveTo(px + pw * 0.25, py);
        ctx.lineTo(px + pw * 0.75, py);
        ctx.lineTo(px + pw, py + ph * 0.5);
        ctx.lineTo(px + pw * 0.75, py + ph);
        ctx.lineTo(px + pw * 0.25, py + ph);
        ctx.lineTo(px, py + ph * 0.5);
        ctx.closePath();
      } else if (stroke.tool === 'flow-data') {
        ctx.moveTo(px + pw * 0.15, py);
        ctx.lineTo(px + pw, py);
        ctx.lineTo(px + pw * 0.85, py + ph);
        ctx.lineTo(px, py + ph);
        ctx.closePath();
      } else if (stroke.tool === 'diag-cloud') {
        ctx.moveTo(px + pw * 0.2, py + ph * 0.7);
        ctx.bezierCurveTo(px, py + ph * 0.7, px, py + ph * 0.3, px + pw * 0.2, py + ph * 0.3);
        ctx.bezierCurveTo(px + pw * 0.2, py, px + pw * 0.5, py, px + pw * 0.5, py + ph * 0.25);
        ctx.bezierCurveTo(px + pw * 0.8, py, px + pw * 0.8, py + ph * 0.3, px + pw * 0.8, py + ph * 0.3);
        ctx.bezierCurveTo(px + pw, py + ph * 0.3, px + pw, py + ph * 0.7, px + pw * 0.8, py + ph * 0.7);
        ctx.bezierCurveTo(px + pw * 0.8, py + ph, px + pw * 0.2, py + ph, px + pw * 0.2, py + ph * 0.7);
        ctx.closePath();
      } else if (stroke.tool === 'diag-database' || stroke.tool === 'diag-cylinder') {
        const ry = Math.max(8, ph * 0.15);
        // Top ellipse
        ctx.beginPath();
        ctx.ellipse(px + pw / 2, py + ry, pw / 2, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (stroke.fill) {
          ctx.save();
          ctx.fillStyle = stroke.fillColor || stroke.color;
          ctx.globalAlpha = (stroke.opacity !== undefined ? stroke.opacity : 1) * (stroke.fillOpacity !== undefined ? stroke.fillOpacity : 0.5);
          ctx.fill();
          ctx.restore();
        }
        // Side walls + bottom half-ellipse as one path
        ctx.beginPath();
        ctx.moveTo(px, py + ry);
        ctx.lineTo(px, py + ph - ry);
        ctx.ellipse(px + pw / 2, py + ph - ry, pw / 2, ry, 0, Math.PI, 0, false);
        ctx.lineTo(px + pw, py + ry);
        ctx.stroke();
        if (stroke.fill) {
          ctx.save();
          ctx.fillStyle = stroke.fillColor || stroke.color;
          ctx.globalAlpha = (stroke.opacity !== undefined ? stroke.opacity : 1) * (stroke.fillOpacity !== undefined ? stroke.fillOpacity : 0.5);
          ctx.fill();
          ctx.restore();
        }
        // Skip default stroke/fill below
        ctx.restore();
        return;
      } else if (stroke.tool === 'diag-document') {
        ctx.moveTo(px, py);
        ctx.lineTo(px + pw, py);
        ctx.lineTo(px + pw, py + ph - 12);
        ctx.quadraticCurveTo(px + pw * 0.75, py + ph - 24, px + pw * 0.5, py + ph - 12);
        ctx.quadraticCurveTo(px + pw * 0.25, py + ph, px, py + ph - 12);
        ctx.closePath();
      }

      if (stroke.fill) {
        ctx.save();
        ctx.fillStyle = stroke.fillColor || stroke.color;
        ctx.globalAlpha = (stroke.opacity !== undefined ? stroke.opacity : 1) * (stroke.fillOpacity !== undefined ? stroke.fillOpacity : 0.5);
        ctx.fill();
        ctx.restore();
      }
      ctx.stroke();
    }

    ctx.restore();
  }, []);

  /* ─── Draw Connector ─── */
  const drawConnector = useCallback((
    ctx: CanvasRenderingContext2D,
    p0: { x: number; y: number },
    pN: { x: number; y: number },
    type: 'straight' | 'curved' | 'elbow' | 'orthogonal' | 'curved-multi',
    headStart: 'none' | 'triangle' | 'circle' | 'diamond',
    headEnd: 'none' | 'triangle' | 'circle' | 'diamond',
    strokeColor: string,
    strokeW: number,
    allPoints?: { x: number; y: number }[]
  ) => {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = strokeW;

    let points: { x: number; y: number }[] = [];
    let startTangent = 0;
    let endTangent = 0;

    const sizeStart = Math.max(12, strokeW * 4) * 0.85;
    const sizeEnd = Math.max(12, strokeW * 4) * 0.85;

    if (type === 'straight') {
      const angle = Math.atan2(pN.y - p0.y, pN.x - p0.x);
      startTangent = angle + Math.PI;
      endTangent = angle;

      const p0_line = headStart !== 'none' ? { x: p0.x + Math.cos(angle) * sizeStart, y: p0.y + Math.sin(angle) * sizeStart } : p0;
      const pN_line = headEnd !== 'none' ? { x: pN.x - Math.cos(angle) * sizeEnd, y: pN.y - Math.sin(angle) * sizeEnd } : pN;
      points = [p0_line, pN_line];
    } else if (type === 'curved') {
      const midX = (p0.x + pN.x) / 2;
      const midY = (p0.y + pN.y) / 2;
      const dx = pN.x - p0.x;
      const dy = pN.y - p0.y;
      const cp = { x: midX - dy * 0.15, y: midY + dx * 0.15 };
      
      startTangent = Math.atan2(cp.y - p0.y, cp.x - p0.x) + Math.PI;
      endTangent = Math.atan2(pN.y - cp.y, pN.x - cp.x);

      const angleStart = Math.atan2(cp.y - p0.y, cp.x - p0.x);
      const angleEnd = Math.atan2(pN.y - cp.y, pN.x - cp.x);

      const p0_line = headStart !== 'none' ? { x: p0.x + Math.cos(angleStart) * sizeStart, y: p0.y + Math.sin(angleStart) * sizeStart } : p0;
      const pN_line = headEnd !== 'none' ? { x: pN.x - Math.cos(angleEnd) * sizeEnd, y: pN.y - Math.sin(angleEnd) * sizeEnd } : pN;

      ctx.beginPath();
      ctx.moveTo(p0_line.x, p0_line.y);
      ctx.quadraticCurveTo(cp.x, cp.y, pN_line.x, pN_line.y);
      ctx.stroke();
    } else if (type === 'curved-multi') {
      const pts = allPoints && allPoints.length >= 2 ? allPoints : [p0, pN];
      const angleStart = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      const angleEnd = Math.atan2(pts[pts.length - 1].y - pts[pts.length - 2].y, pts[pts.length - 1].x - pts[pts.length - 2].x);

      startTangent = angleStart + Math.PI;
      endTangent = angleEnd;

      const p0_line = headStart !== 'none' ? { x: pts[0].x + Math.cos(angleStart) * sizeStart, y: pts[0].y + Math.sin(angleStart) * sizeStart } : pts[0];
      const pN_line = headEnd !== 'none' ? { x: pts[pts.length - 1].x - Math.cos(angleEnd) * sizeEnd, y: pts[pts.length - 1].y - Math.sin(angleEnd) * sizeEnd } : pts[pts.length - 1];

      const drawPts = [p0_line, ...pts.slice(1, -1), pN_line];
      ctx.beginPath();
      if (drawPts.length < 3) {
        ctx.moveTo(drawPts[0].x, drawPts[0].y);
        ctx.lineTo(drawPts[1].x, drawPts[1].y);
      } else {
        ctx.moveTo(drawPts[0].x, drawPts[0].y);
        for (let i = 1; i < drawPts.length - 2; i++) {
          const xc = (drawPts[i].x + drawPts[i + 1].x) / 2;
          const yc = (drawPts[i].y + drawPts[i + 1].y) / 2;
          ctx.quadraticCurveTo(drawPts[i].x, drawPts[i].y, xc, yc);
        }
        const penultimate = drawPts[drawPts.length - 2];
        const ultimate = drawPts[drawPts.length - 1];
        ctx.quadraticCurveTo(penultimate.x, penultimate.y, ultimate.x, ultimate.y);
      }
      ctx.stroke();
    } else {
      const midX = (p0.x + pN.x) / 2;
      const p1 = { x: midX, y: p0.y };
      const p2 = { x: midX, y: pN.y };

      const angleStart = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const angleEnd = Math.atan2(pN.y - p2.y, pN.x - p2.x);

      startTangent = angleStart + Math.PI;
      endTangent = angleEnd;

      const p0_line = headStart !== 'none' ? { x: p0.x + Math.cos(angleStart) * sizeStart, y: p0.y + Math.sin(angleStart) * sizeStart } : p0;
      const pN_line = headEnd !== 'none' ? { x: pN.x - Math.cos(angleEnd) * sizeEnd, y: pN.y - Math.sin(angleEnd) * sizeEnd } : pN;

      points = [p0_line, p1, p2, pN_line];
    }

    if (type !== 'curved' && type !== 'curved-multi') {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }

    const drawHead = (p: {x: number; y: number}, angle: number, kind: string) => {
      if (kind === 'none') return;
      const size = Math.max(12, strokeW * 4);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      ctx.beginPath();
      if (kind === 'triangle') {
        ctx.moveTo(0, 0);
        ctx.lineTo(-size, -size / 2);
        ctx.lineTo(-size, size / 2);
        ctx.closePath();
        ctx.fill();
      } else if (kind === 'circle') {
        ctx.arc(-size / 2, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'diamond') {
        ctx.moveTo(0, 0);
        ctx.lineTo(-size / 2, -size / 3);
        ctx.lineTo(-size, 0);
        ctx.lineTo(-size / 2, size / 3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };

    drawHead(p0, startTangent, headStart);
    drawHead(pN, endTangent, headEnd);

    ctx.restore();
  }, []);

  const drawStrokeWithConnector = useCallback((ctx: CanvasRenderingContext2D, stroke: BoardStroke, isSelected = false) => {
    if ((stroke.tool === 'line' || stroke.tool === 'arrow') && stroke.points.length >= 2) {
      const type = stroke.arrowType || 'straight';
      const headStart = stroke.arrowheadStart || 'none';
      const headEnd = stroke.arrowheadEnd || (stroke.tool === 'arrow' ? 'triangle' : 'none');
      drawConnector(ctx, stroke.points[0], stroke.points[stroke.points.length - 1], type, headStart, headEnd, stroke.color, stroke.width, stroke.points);
    } else {
      drawStroke(ctx, stroke, isSelected);
    }
  }, [drawConnector, drawStroke]);

  /* ─── Overlay canvas (preview during drawing) ─── */
  const renderOverlay = useCallback((pts: { x: number; y: number }[]) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (pts.length < 1) return;

    ctx.save();
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.scale, view.scale);

    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = opacity * 0.8;

    const toolInUse = tool;

    if (toolInUse === 'pen') {
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    } else if (toolInUse === 'highlighter') {
      ctx.strokeStyle = color || '#eab308';
      ctx.lineWidth = strokeWidth * 2.5;
      ctx.globalAlpha = opacity * 0.45;
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    } else if (toolInUse === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = strokeWidth * 3;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    } else if (pts.length >= 2) {
      const p0 = pts[0];
      const pN = pts[pts.length - 1];
      
      if (toolInUse === 'line' || toolInUse === 'arrow') {
        const type = arrowType;
        const headStart = arrowheadStart;
        const headEnd = arrowheadEnd;
        drawConnector(ctx, p0, pN, type, headStart, headEnd, color, strokeWidth, pts);
      } else {
        const px = Math.min(p0.x, pN.x);
        const py = Math.min(p0.y, pN.y);
        const pw = Math.abs(pN.x - p0.x);
        const ph = Math.abs(pN.y - p0.y);

        ctx.beginPath();

        if (toolInUse === 'rect' || toolInUse === 'flow-process') {
          ctx.rect(px, py, pw, ph);
        } else if (toolInUse === 'rounded-rect' || toolInUse === 'flow-terminator') {
          const r = toolInUse === 'flow-terminator' ? ph / 2 : 8;
          if (ctx.roundRect) {
            ctx.roundRect(px, py, pw, ph, r);
          } else {
            ctx.rect(px, py, pw, ph);
          }
        } else if (toolInUse === 'circle' || toolInUse === 'ellipse') {
          ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2);
        } else if (toolInUse === 'triangle') {
          ctx.moveTo(px + pw / 2, py);
          ctx.lineTo(px + pw, py + ph);
          ctx.lineTo(px, py + ph);
          ctx.closePath();
        } else if (toolInUse === 'diamond' || toolInUse === 'flow-decision') {
          ctx.moveTo(px + pw / 2, py);
          ctx.lineTo(px + pw, py + ph / 2);
          ctx.lineTo(px + pw / 2, py + ph);
          ctx.lineTo(px, py + ph / 2);
          ctx.closePath();
        } else if (toolInUse === 'hexagon') {
          ctx.moveTo(px + pw * 0.25, py);
          ctx.lineTo(px + pw * 0.75, py);
          ctx.lineTo(px + pw, py + ph * 0.5);
          ctx.lineTo(px + pw * 0.75, py + ph);
          ctx.lineTo(px + pw * 0.25, py + ph);
          ctx.lineTo(px, py + ph * 0.5);
          ctx.closePath();
        } else if (toolInUse === 'flow-data') {
          ctx.moveTo(px + pw * 0.15, py);
          ctx.lineTo(px + pw, py);
          ctx.lineTo(px + pw * 0.85, py + ph);
          ctx.lineTo(px, py + ph);
          ctx.closePath();
        } else if (toolInUse === 'diag-cloud') {
          ctx.moveTo(px + pw * 0.2, py + ph * 0.7);
          ctx.bezierCurveTo(px, py + ph * 0.7, px, py + ph * 0.3, px + pw * 0.2, py + ph * 0.3);
          ctx.bezierCurveTo(px + pw * 0.2, py, px + pw * 0.5, py, px + pw * 0.5, py + ph * 0.25);
          ctx.bezierCurveTo(px + pw * 0.8, py, px + pw * 0.8, py + ph * 0.3, px + pw * 0.8, py + ph * 0.3);
          ctx.bezierCurveTo(px + pw, py + ph * 0.3, px + pw, py + ph * 0.7, px + pw * 0.8, py + ph * 0.7);
          ctx.bezierCurveTo(px + pw * 0.8, py + ph, px + pw * 0.2, py + ph, px + pw * 0.2, py + ph * 0.7);
          ctx.closePath();
        } else if (toolInUse === 'diag-database' || toolInUse === 'diag-cylinder') {
          const ry = ph * 0.15;
          ctx.ellipse(px + pw / 2, py + ry, pw / 2, ry, 0, 0, Math.PI * 2);
          ctx.moveTo(px, py + ry);
          ctx.lineTo(px, py + ph - ry);
          ctx.ellipse(px + pw / 2, py + ph - ry, pw / 2, ry, 0, 0, Math.PI, false);
          ctx.lineTo(px + pw, py + ry);
        } else if (toolInUse === 'diag-document') {
          ctx.moveTo(px, py);
          ctx.lineTo(px + pw, py);
          ctx.lineTo(px + pw, py + ph - 12);
          ctx.quadraticCurveTo(px + pw * 0.75, py + ph - 24, px + pw * 0.5, py + ph - 12);
          ctx.quadraticCurveTo(px + pw * 0.25, py + ph, px, py + ph - 12);
          ctx.closePath();
        }

        if (useFill) {
          ctx.save();
          ctx.fillStyle = fillColor || color;
          ctx.globalAlpha = opacity * 0.5;
          ctx.fill();
          ctx.restore();
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [color, fillColor, strokeWidth, tool, useFill, opacity, view, arrowType, arrowheadStart, arrowheadEnd]);

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

  /* ─── Main canvas renderer ─── */
  const renderCanvasMain = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Grid
    if (gridType !== 'none') {
      ctx.save();
      const sizeVal = gridSize * view.scale;
      const startX = view.offsetX % sizeVal;
      const startY = view.offsetY % sizeVal;
      const isLightBg = bgColor === '#ffffff' || bgColor === '#f8f9fa' || bgColor === '#e7f5ff' || bgColor === '#fff9db' || bgColor === '#fff0f6' || bgColor === '#ebfbee';
      ctx.strokeStyle = isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)';
      ctx.fillStyle = isLightBg ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;

      if (gridType === 'dots') {
        for (let x = startX; x < canvas.width; x += sizeVal) {
          for (let y = startY; y < canvas.height; y += sizeVal) {
            ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
          }
        }
      } else if (gridType === 'lines') {
        ctx.beginPath();
        for (let x = startX; x < canvas.width; x += sizeVal) {
          ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        }
        for (let y = startY; y < canvas.height; y += sizeVal) {
          ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 1.5. Sheets Layer
    if (isSheetsMode && sheets.length > 0) {
      ctx.save();
      ctx.translate(view.offsetX, view.offsetY);
      ctx.scale(view.scale, view.scale);

      sheets.forEach((sheet, idx) => {
        // Page Shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(sheet.x, sheet.y, sheet.width, sheet.height, 4);
        } else {
          ctx.rect(sheet.x, sheet.y, sheet.width, sheet.height);
        }
        ctx.fill();
        ctx.restore();

        // Page border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sheet.x, sheet.y, sheet.width, sheet.height);

        // Page label
        ctx.fillStyle = bgColor === '#ffffff' ? '#27272a' : '#a1a1aa';
        const pageFontSize = Math.max(12, 13 / view.scale);
        ctx.font = `600 ${pageFontSize}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
        const pageLabel = isRtl
          ? `صفحة ${idx + 1} - ${sheet.preset}`
          : `Page ${idx + 1} - ${sheet.preset}`;
        ctx.fillText(pageLabel, sheet.x, sheet.y - 6);
      });
      ctx.restore();
    }

    // 2. Shapes
    ctx.save();
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.scale, view.scale);

    const visibleRect = {
      minX: -view.offsetX / view.scale,
      minY: -view.offsetY / view.scale,
      maxX: (canvas.width - view.offsetX) / view.scale,
      maxY: (canvas.height - view.offsetY) / view.scale,
    };

    strokes.forEach((stroke) => {
      if (isStrokeInViewport(stroke, visibleRect)) {
        drawStrokeWithConnector(ctx, stroke, selectedStrokeIds.includes(stroke.id));
      }
    });

    Object.values(remoteDrawings).forEach((stroke) => {
      if (isStrokeInViewport(stroke, visibleRect)) {
        drawStrokeWithConnector(ctx, stroke, false);
      }
    });

    // Selected bounding box
    if (selectedStrokeIds.length > 0 && tool === 'select') {
      const box = getCombinedBoundingBox(selectedStrokeIds);
      if (box.minX !== Infinity) {
        ctx.save();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5 / view.scale;
        ctx.setLineDash([4 / view.scale, 4 / view.scale]);
        ctx.strokeRect(box.minX, box.minY, box.w, box.h);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5 / view.scale;
        ctx.setLineDash([]);
        const handleSize = 8 / view.scale;
        const positions = [
          { x: box.minX, y: box.minY },
          { x: box.maxX, y: box.minY },
          { x: box.minX, y: box.maxY },
          { x: box.maxX, y: box.maxY },
          { x: box.minX + box.w / 2, y: box.minY },
          { x: box.minX + box.w / 2, y: box.maxY },
          { x: box.minX, y: box.minY + box.h / 2 },
          { x: box.maxX, y: box.minY + box.h / 2 },
        ];
        positions.forEach((pos) => {
          ctx.beginPath();
          ctx.rect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
          ctx.fill(); ctx.stroke();
        });

        // Rotation Handle
        const rotateLineLen = 20 / view.scale;
        ctx.beginPath();
        ctx.moveTo(box.minX + box.w / 2, box.minY);
        ctx.lineTo(box.minX + box.w / 2, box.minY - rotateLineLen);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(box.minX + box.w / 2, box.minY - rotateLineLen, handleSize / 2, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Draw individual connector nodes if editing a single line/arrow
        if (selectedStrokeIds.length === 1) {
          const singleStroke = strokes.find((s) => s.id === selectedStrokeIds[0]);
          if (singleStroke && (singleStroke.tool === 'line' || singleStroke.tool === 'arrow')) {
            ctx.fillStyle = '#10b981'; // Green for node handles
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5 / view.scale;
            const nodeSize = 8 / view.scale;
            singleStroke.points.forEach((p) => {
              ctx.beginPath();
              ctx.arc(p.x, p.y, nodeSize / 2, 0, Math.PI * 2);
              ctx.fill(); ctx.stroke();
            });
          }
        }

        ctx.restore();
      }
    }

    // Selection dashed region
    if (regionSelectStart && regionSelectCurrent) {
      ctx.save();
      ctx.strokeStyle = '#0284c7';
      ctx.fillStyle = 'rgba(2, 132, 199, 0.08)';
      ctx.lineWidth = 1.5 / view.scale;
      ctx.setLineDash([4 / view.scale, 4 / view.scale]);
      const rx = Math.min(regionSelectStart.x, regionSelectCurrent.x);
      const ry = Math.min(regionSelectStart.y, regionSelectCurrent.y);
      const rw = Math.abs(regionSelectStart.x - regionSelectCurrent.x);
      const rh = Math.abs(regionSelectStart.y - regionSelectCurrent.y);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    }
    ctx.restore();
  }, [bgColor, strokes, selectedStrokeIds, drawStrokeWithConnector, remoteDrawings, gridType, gridSize, view, regionSelectStart, regionSelectCurrent, getCombinedBoundingBox, isStrokeInViewport, tool, getStrokeBoundingBox]);

  useLayoutEffect(() => {
    renderCanvasMain();
  }, [renderCanvasMain]);

  /* ─── Pointer Input Observers ─── */
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    // Close any floating windows/menus when clicking on the board canvas
    closeAllFloatingMenus();

    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const isMiddleClick = e.button === 1;
    const isSpacePan = e.button === 0 && isSpacePressedRef.current;
    
    const hit = [...strokes].reverse().find((s) => hitTestStroke(s, x, y, s.tool === 'highlighter' ? 14 : 8));
    const isSelectBgPan = tool === 'select' && e.button === 0 && !hit;

    if (isMiddleClick || isSpacePan || isSelectBgPan) {
      setIsPanning(true);
      dragStartRef.current = {
        mode: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        originalStrokes: {},
        panStart: {
          offsetX: view.offsetX,
          offsetY: view.offsetY,
        }
      };
      return;
    }

    if (tool === 'text' || tool === 'sticky') {
      setTextInput({
        active: true,
        x: x, // canvas x
        y: y, // canvas y
        clientX: e.clientX,
        clientY: e.clientY,
        value: '',
      });
      setEditingStrokeId(null);
      return;
    }

    if (tool === 'select') {
      const handle = hitTestSelectionHandle(x, y);
      if (handle) {
        const originalStrokes: Record<string, BoardStroke> = {};
        selectedStrokeIds.forEach((id) => {
          const s = strokes.find((st) => st.id === id);
          if (s) originalStrokes[id] = JSON.parse(JSON.stringify(s));
        });

        dragStartRef.current = {
          mode: handle.type === 'rotate' ? 'rotate' : (handle.type === 'node' ? 'drag-node' : 'resize'),
          startX: x,
          startY: y,
          resizeHandle: handle.type,
          nodeIndex: handle.nodeIndex,
          originalStrokes,
        };
        setIsDraggingObject(true);
        return;
      }

      if (hit) {
        let nextSelected = [...selectedStrokeIds];
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          // Ctrl/Shift/Cmd: toggle item in selection
          if (selectedStrokeIds.includes(hit.id)) {
            nextSelected = selectedStrokeIds.filter(id => id !== hit.id);
          } else {
            nextSelected.push(hit.id);
          }
        } else {
          if (!selectedStrokeIds.includes(hit.id)) {
            nextSelected = [hit.id];
          }
        }
        setSelectedStrokeIds(nextSelected);

        const originalStrokes: Record<string, BoardStroke> = {};
        nextSelected.forEach((id) => {
          const s = strokes.find((st) => st.id === id);
          if (s) originalStrokes[id] = JSON.parse(JSON.stringify(s));
        });

        dragStartRef.current = {
          mode: 'drag-objects',
          startX: x,
          startY: y,
          originalStrokes,
        };
        setIsDraggingObject(true);
        
        // Sync styling states to match selected object
        if (hit.color) setColor(hit.color);
        if (hit.width) setStrokeWidth(hit.width);
        if (hit.fill !== undefined) setUseFill(hit.fill);
        if (hit.fillColor) setFillColor(hit.fillColor);
        if (hit.opacity !== undefined) setOpacity(hit.opacity);
        if (hit.fontSize) setFontSize(hit.fontSize);
        if (hit.fontFamily) setFontFamily(hit.fontFamily);
        if (hit.fontWeight) setFontWeight(hit.fontWeight);
        if (hit.textAlign) setTextAlign(hit.textAlign);
        if (hit.arrowType) setArrowType(hit.arrowType);
        if (hit.arrowheadStart) setArrowheadStart(hit.arrowheadStart);
        if (hit.arrowheadEnd) setArrowheadEnd(hit.arrowheadEnd);
      } else {
        if (!e.shiftKey) {
          setSelectedStrokeIds([]);
        }
        setRegionSelectStart({ x, y });
        setRegionSelectCurrent({ x, y });
        dragStartRef.current = {
          mode: 'region-select',
          startX: x,
          startY: y,
          originalStrokes: {},
        };
      }
      return;
    }

    // Normal drawing mode
    let startX = x;
    let startY = y;
    if (snapToGrid) {
      startX = Math.round(startX / gridSize) * gridSize;
      startY = Math.round(startY / gridSize) * gridSize;
    }

    setPointer({ down: true, x: startX, y: startY, startX, startY });
    setCurrentPen([{ x: startX, y: startY }]);
    renderOverlay([{ x: startX, y: startY }]);
  }, [tool, toCanvasCoords, strokes, selectedStrokeIds, hitTestStroke, hitTestSelectionHandle, getCombinedBoundingBox, snapToGrid, gridSize, view, color, fillColor, opacity, fontSize, fontFamily, fontWeight, textAlign, arrowType, arrowheadStart, arrowheadEnd, renderOverlay, closeAllFloatingMenus]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    const drag = dragStartRef.current;

    if (drag.mode === 'drag-node' && selectedStrokeIds.length === 1) {
      const idx = drag.nodeIndex!;
      let dx = x - drag.startX;
      let dy = y - drag.startY;
      if (snapToGrid) {
        dx = Math.round(dx / gridSize) * gridSize;
        dy = Math.round(dy / gridSize) * gridSize;
      }

      setStrokes((prev) => prev.map((s) => {
        if (s.id !== selectedStrokeIds[0]) return s;
        const orig = drag.originalStrokes[s.id];
        if (!orig) return s;
        const newPts = [...orig.points];
        newPts[idx] = { x: orig.points[idx].x + dx, y: orig.points[idx].y + dy };
        return { ...s, points: newPts };
      }));

      // Throttle broadcast
      const now = Date.now();
      if (now - lastBroadcastTimeRef.current > 40) {
        lastBroadcastTimeRef.current = now;
        if (channelRef.current?.state === 'joined') {
          const updated = strokes.find((s) => s.id === selectedStrokeIds[0]);
          if (updated) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'stroke_add',
              payload: { stroke: updated, userId: currentUserId }
            });
          }
        }
      }
      return;
    }

    if (drag.mode === 'pan' && drag.panStart) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setView((v) => ({
        ...v,
        offsetX: drag.panStart!.offsetX + dx,
        offsetY: drag.panStart!.offsetY + dy,
      }));
      return;
    }

    if (drag.mode === 'region-select') {
      setRegionSelectCurrent({ x, y });
      return;
    }

    if (drag.mode === 'drag-objects' && selectedStrokeIds.length > 0) {
      let dx = x - drag.startX;
      let dy = y - drag.startY;
      if (snapToGrid) {
        dx = Math.round(dx / gridSize) * gridSize;
        dy = Math.round(dy / gridSize) * gridSize;
      }

      setStrokes((prev) => prev.map((s) => {
        if (!selectedStrokeIds.includes(s.id)) return s;
        const orig = drag.originalStrokes[s.id];
        if (!orig) return s;
        const newPts = orig.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        return { ...s, points: newPts };
      }));

      const now = Date.now();
      if (now - lastBroadcastTimeRef.current > 40) {
        lastBroadcastTimeRef.current = now;
        if (channelRef.current?.state === 'joined') {
          selectedStrokeIds.forEach((id) => {
            const orig = drag.originalStrokes[id];
            if (!orig) return;
            const updatedPts = orig.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
            channelRef.current.send({
              type: 'broadcast',
              event: 'stroke_draw',
              payload: { userId: currentUserId, stroke: { ...orig, points: updatedPts } }
            });
          });
        }
      }
      return;
    }

    if (drag.mode === 'resize' && selectedStrokeIds.length > 0) {
      const origBox = getCombinedBoundingBox(Object.keys(drag.originalStrokes));
      if (origBox.w === 0 || origBox.h === 0) return;

      let dx = x - drag.startX;
      let dy = y - drag.startY;
      if (snapToGrid) {
        dx = Math.round(dx / gridSize) * gridSize;
        dy = Math.round(dy / gridSize) * gridSize;
      }

      const handle = drag.resizeHandle!;
      let scaleX = 1, scaleY = 1;
      let targetW = origBox.w, targetH = origBox.h;
      let offsetX = 0, offsetY = 0;

      if (handle.includes('r')) {
        targetW = Math.max(10, origBox.w + dx);
        scaleX = targetW / origBox.w;
      } else if (handle.includes('l')) {
        targetW = Math.max(10, origBox.w - dx);
        scaleX = targetW / origBox.w;
        offsetX = origBox.w - targetW;
      }

      if (handle.includes('b')) {
        targetH = Math.max(10, origBox.h + dy);
        scaleY = targetH / origBox.h;
      } else if (handle.includes('t')) {
        targetH = Math.max(10, origBox.h - dy);
        scaleY = targetH / origBox.h;
        offsetY = origBox.h - targetH;
      }

      if (e.shiftKey) {
        const ratio = origBox.w / origBox.h;
        if (handle.includes('r') || handle.includes('l')) {
          targetH = targetW / ratio;
          scaleY = targetH / origBox.h;
          if (handle.includes('t')) offsetY = origBox.h - targetH;
        } else {
          targetW = targetH * ratio;
          scaleX = targetW / origBox.w;
          if (handle.includes('l')) offsetX = origBox.w - targetW;
        }
      }

      setStrokes((prev) => prev.map((s) => {
        if (!selectedStrokeIds.includes(s.id)) return s;
        const orig = drag.originalStrokes[s.id];
        if (!orig) return s;
        const newPts = orig.points.map((p) => {
          const relX = p.x - origBox.minX;
          const relY = p.y - origBox.minY;
          return {
            x: origBox.minX + offsetX + relX * scaleX,
            y: origBox.minY + offsetY + relY * scaleY,
          };
        });
        return { ...s, points: newPts };
      }));
      return;
    }

    if (drag.mode === 'rotate' && selectedStrokeIds.length > 0) {
      const box = getCombinedBoundingBox(Object.keys(drag.originalStrokes));
      const cx = box.minX + box.w / 2;
      const cy = box.minY + box.h / 2;

      const angleStart = Math.atan2(drag.startY - cy, drag.startX - cx);
      const angleCurrent = Math.atan2(y - cy, x - cx);
      let angle = angleCurrent - angleStart;

      if (snapToGrid) {
        const angleDeg = (angle * 180) / Math.PI;
        angle = ((Math.round(angleDeg / 15) * 15) * Math.PI) / 180;
      }

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      setStrokes((prev) => prev.map((s) => {
        if (!selectedStrokeIds.includes(s.id)) return s;
        const orig = drag.originalStrokes[s.id];
        if (!orig) return s;
        const newPts = orig.points.map((p) => {
          const dx = p.x - cx;
          const dy = p.y - cy;
          return {
            x: cx + dx * cos - dy * sin,
            y: cy + dx * sin + dy * cos,
          };
        });
        return { ...s, points: newPts };
      }));
      return;
    }

    if (pointer.down) {
      let newPts = [];
      if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
        newPts = [...currentPen, { x, y }];
      } else if (tool === 'line' && arrowType === 'curved-multi') {
        const last = currentPen[currentPen.length - 1];
        if (last) {
          const dist = Math.hypot(x - last.x, y - last.y);
          if (dist > 40) {
            newPts = [...currentPen, { x, y }];
          } else {
            newPts = [...currentPen.slice(0, -1), { x, y }];
          }
        } else {
          newPts = [{ x, y }];
        }
      } else {
        newPts = [{ x: pointer.startX, y: pointer.startY }, { x, y }];
      }

      if (snapToGrid && !['pen', 'highlighter', 'eraser', 'line'].includes(tool)) {
        const last = newPts[newPts.length - 1];
        if (last) {
          last.x = Math.round(last.x / gridSize) * gridSize;
          last.y = Math.round(last.y / gridSize) * gridSize;
        }
      }

      setCurrentPen(newPts);
      renderOverlay(newPts);
      setPointer((p) => ({ ...p, x, y }));

      // Throttle broadcast
      const now = Date.now();
      if (now - lastBroadcastTimeRef.current > 40) {
        lastBroadcastTimeRef.current = now;
        if (channelRef.current?.state === 'joined') {
          channelRef.current.send({
            type: 'broadcast',
            event: 'pointer_sync',
            payload: {
              userId: currentUserId,
              name: userName,
              color: userColor,
              x,
              y,
              drawing: {
                id: 'temp_draw',
                tool: tool,
                points: newPts,
                color,
                width: strokeWidth,
                fill: useFill,
                fillColor: useFill ? fillColor : undefined,
                opacity,
                arrowType: (tool === 'line' || tool === 'arrow') ? arrowType : undefined,
                arrowheadStart: (tool === 'line' || tool === 'arrow') ? arrowheadStart : undefined,
                arrowheadEnd: (tool === 'line' || tool === 'arrow') ? arrowheadEnd : undefined,
              }
            }
          });
        }
      }
    } else {
      // Broadcast simple cursor move
      const now = Date.now();
      if (now - lastBroadcastTimeRef.current > 45) {
        lastBroadcastTimeRef.current = now;
        if (channelRef.current?.state === 'joined') {
          channelRef.current.send({
            type: 'broadcast',
            event: 'pointer_sync',
            payload: { userId: currentUserId, name: userName, color: userColor, x, y, drawing: null }
          });
        }
      }
    }
  }, [tool, selectedStrokeIds, pointer.down, currentPen, snapToGrid, gridSize, toCanvasCoords, renderOverlay, getCombinedBoundingBox, currentUserId, userName, userColor, color, strokeWidth, useFill, fillColor, opacity, arrowType, arrowheadStart, arrowheadEnd]);

  const onPointerUp = useCallback(() => {
    const drag = dragStartRef.current;
    
    if (drag.mode === 'region-select' && regionSelectStart && regionSelectCurrent) {
      const minX = Math.min(regionSelectStart.x, regionSelectCurrent.x);
      const minY = Math.min(regionSelectStart.y, regionSelectCurrent.y);
      const maxX = Math.max(regionSelectStart.x, regionSelectCurrent.x);
      const maxY = Math.max(regionSelectStart.y, regionSelectCurrent.y);

      const newlySelected: string[] = [];
      strokes.forEach((s) => {
        const box = getStrokeBoundingBox(s);
        const overlap = !(
          box.maxX < minX ||
          box.minX > maxX ||
          box.maxY < minY ||
          box.minY > maxY
        );
        if (overlap) newlySelected.push(s.id);
      });
      setSelectedStrokeIds(newlySelected);
      setRegionSelectStart(null);
      setRegionSelectCurrent(null);
      dragStartRef.current = { mode: 'none', startX: 0, startY: 0, originalStrokes: {} };
      return;
    }

    if (drag.mode === 'pan') {
      setIsPanning(false);
      dragStartRef.current = { mode: 'none', startX: 0, startY: 0, originalStrokes: {} };
      return;
    }

    if (drag.mode === 'drag-objects' || drag.mode === 'resize' || drag.mode === 'rotate' || drag.mode === 'drag-node') {
      setIsDraggingObject(false);
      setUndoStack((prev) => [...prev, strokes]);
      setRedoStack([]);
      persistStrokes(strokes);
      
      if (channelRef.current?.state === 'joined') {
        selectedStrokeIds.forEach((id) => {
          const finished = strokes.find((s) => s.id === id);
          if (finished) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'stroke_add',
              payload: { stroke: finished, userId: currentUserId }
            });
          }
        });
        channelRef.current.send({ type: 'broadcast', event: 'stroke_draw_end', payload: { userId: currentUserId } });
      }
      dragStartRef.current = { mode: 'none', startX: 0, startY: 0, originalStrokes: {} };
      return;
    }

    if (!pointer.down || currentPen.length < 1) {
      setPointer((p) => ({ ...p, down: false }));
      return;
    }

    // Discard single-point lines/arrows
    if ((tool === 'line' || tool === 'arrow') && currentPen.length < 2) {
      setPointer((p) => ({ ...p, down: false }));
      const overlay = overlayRef.current;
      if (overlay) {
        const ctx = overlay.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
      }
      setCurrentPen([]);
      return;
    }

    const newStroke: BoardStroke = {
      id: crypto.randomUUID(),
      tool: tool as BoardStroke['tool'],
      points: currentPen,
      color,
      width: strokeWidth,
      fill: useFill,
      fillColor: useFill ? fillColor : undefined,
      opacity,
      arrowType: (tool === 'line' || tool === 'arrow') ? arrowType : undefined,
      arrowheadStart: (tool === 'line' || tool === 'arrow') ? arrowheadStart : undefined,
      arrowheadEnd: (tool === 'line' || tool === 'arrow') ? arrowheadEnd : undefined,
    };

    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);

    const newStrokes = [...strokes, newStroke];
    setStrokes(newStrokes);
    persistStrokes(newStrokes);
    playClickSound();

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
  }, [pointer.down, currentPen, tool, color, strokeWidth, useFill, fillColor, opacity, arrowType, arrowheadStart, arrowheadEnd, strokes, selectedStrokeIds, regionSelectStart, regionSelectCurrent, getStrokeBoundingBox, persistStrokes, currentUserId]);

  /* ─── Text commit ─── */
  const commitText = useCallback(() => {
    if (!textInput.value.trim()) {
      if (editingStrokeId) {
        setStrokes((prev) => {
          const next = prev.filter((s) => s.id !== editingStrokeId);
          persistStrokes(next);
          return next;
        });
        if (channelRef.current?.state === 'joined') {
          channelRef.current.send({ type: 'broadcast', event: 'stroke_delete', payload: { id: editingStrokeId } });
        }
      }
      setTextInput({ active: false, x: 0, y: 0, clientX: 0, clientY: 0, value: '' });
      setEditingStrokeId(null);
      return;
    }

    if (editingStrokeId) {
      setUndoStack((prev) => [...prev, strokes]);
      setRedoStack([]);
      setStrokes((prev) => {
        const next = prev.map((s) => {
          if (s.id !== editingStrokeId) return s;
          const updated = {
            ...s,
            text: textInput.value,
          };
          if (channelRef.current?.state === 'joined') {
            channelRef.current.send({
              type: 'broadcast',
              event: 'stroke_add',
              payload: { stroke: updated, userId: currentUserId }
            });
          }
          return updated;
        });
        persistStrokes(next);
        return next;
      });
      playClickSound();
    } else {
      const newStroke: BoardStroke = {
        id: crypto.randomUUID(),
        tool: (tool === 'sticky' ? 'sticky' : 'text') as BoardStroke['tool'],
        points: tool === 'sticky' ? [{ x: textInput.x, y: textInput.y }, { x: textInput.x + 160, y: textInput.y + 160 }] : [{ x: textInput.x, y: textInput.y }],
        color: tool === 'sticky' ? '#18181b' : color,
        fillColor: tool === 'sticky' ? fillColor || '#fef08a' : undefined,
        width: strokeWidth,
        text: textInput.value,
        fontSize: tool === 'sticky' ? 13 : fontSize,
        fill: tool === 'sticky' ? true : false,
        opacity,
        fontFamily: tool === 'sticky' ? 'sans-serif' : fontFamily,
        fontWeight: tool === 'sticky' ? 'bold' : fontWeight,
        textAlign: tool === 'sticky' ? 'center' : textAlign,
      };
      setUndoStack((prev) => [...prev, strokes]);
      setRedoStack([]);
      const newStrokes = [...strokes, newStroke];
      setStrokes(newStrokes);
      persistStrokes(newStrokes);
      if (channelRef.current?.state === 'joined') {
        channelRef.current.send({ type: 'broadcast', event: 'stroke_add', payload: { stroke: newStroke, userId: currentUserId } });
      }
      playClickSound();
    }

    setTextInput({ active: false, x: 0, y: 0, clientX: 0, clientY: 0, value: '' });
    setEditingStrokeId(null);
  }, [textInput, editingStrokeId, color, strokeWidth, fontSize, strokes, persistStrokes, tool, fillColor, opacity, fontFamily, fontWeight, textAlign, currentUserId]);

  /* ─── Undo / Redo ─── */
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, strokes]);
    setStrokes(prev);
    setUndoStack((u) => u.slice(0, -1));
    persistStrokes(prev);
    playClickSound();
  }, [undoStack, strokes, persistStrokes]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, strokes]);
    setStrokes(next);
    setRedoStack((r) => r.slice(0, -1));
    persistStrokes(next);
    playClickSound();
  }, [redoStack, strokes, persistStrokes]);

  /* ─── Clear all ─── */
  const handleClearAll = useCallback(async () => {
    const confirmed = await useDialogStore.getState().showConfirm(
      'Clear Board',
      'Are you sure you want to clear all drawings on this board?',
      { confirmText: 'Clear', cancelText: 'Cancel' }
    );
    if (!confirmed) return;
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes([]);
    persistStrokes([]);
    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({ type: 'broadcast', event: 'strokes_clear', payload: {} });
    }
    playSweepSound();
  }, [strokes, persistStrokes]);

  /* ─── Delete selected strokes ─── */
  const handleDeleteSelected = useCallback(() => {
    if (selectedStrokeIds.length === 0) return;
    const newStrokes = strokes.filter((s) => !selectedStrokeIds.includes(s.id));
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes(newStrokes);
    persistStrokes(newStrokes);
    if (channelRef.current?.state === 'joined') {
      selectedStrokeIds.forEach((id) => {
        channelRef.current.send({ type: 'broadcast', event: 'stroke_delete', payload: { id } });
      });
    }
    setSelectedStrokeIds([]);
    playPopSound();
  }, [selectedStrokeIds, strokes, persistStrokes]);

  // Clipboard operations
  const handleCopyStrokes = useCallback(() => {
    if (selectedStrokeIds.length === 0) return;
    const selected = strokes.filter(s => selectedStrokeIds.includes(s.id));
    setCopiedStrokes(JSON.parse(JSON.stringify(selected)));
    useDialogStore.getState().showNotification(`${selected.length} shape(s) copied to clipboard`, 'success', 2000);
  }, [selectedStrokeIds, strokes]);

  const handleCutStrokes = useCallback(() => {
    if (selectedStrokeIds.length === 0) return;
    const selected = strokes.filter(s => selectedStrokeIds.includes(s.id));
    setCopiedStrokes(JSON.parse(JSON.stringify(selected)));
    
    const newStrokes = strokes.filter(s => !selectedStrokeIds.includes(s.id));
    setUndoStack((prev) => [...prev, strokes]);
    setStrokes(newStrokes);
    persistStrokes(newStrokes);
    
    if (channelRef.current?.state === 'joined') {
      selectedStrokeIds.forEach((id) => {
        channelRef.current!.send({ type: 'broadcast', event: 'stroke_delete', payload: { id } });
      });
    }
    setSelectedStrokeIds([]);
    useDialogStore.getState().showNotification(`${selected.length} shape(s) cut`, 'success', 2000);
  }, [selectedStrokeIds, strokes, persistStrokes]);

  const handlePasteStrokes = useCallback((clientX: number, clientY: number) => {
    if (copiedStrokes.length === 0) return;
    const { x: flowX, y: flowY } = toCanvasCoords(clientX, clientY);

    const isSamePosition = lastPastePosRef.current &&
      lastPastePosRef.current.x === clientX &&
      lastPastePosRef.current.y === clientY;

    if (isSamePosition) {
      consecutivePasteCountRef.current += 1;
    } else {
      consecutivePasteCountRef.current = 0;
      lastPastePosRef.current = { x: clientX, y: clientY };
    }

    const cascadeOffset = consecutivePasteCountRef.current * 20;

    let minX = Infinity, minY = Infinity;
    copiedStrokes.forEach((s) => {
      s.points.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
      });
    });

    if (minX === Infinity || minY === Infinity) {
      minX = 0;
      minY = 0;
    }

    const newStrokesToAdd = copiedStrokes.map((orig) => {
      const newPoints = orig.points.map((p) => ({
        x: flowX + (p.x - minX) + cascadeOffset,
        y: flowY + (p.y - minY) + cascadeOffset,
      }));
      return {
        ...orig,
        id: crypto.randomUUID(),
        points: newPoints,
      };
    });

    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    const nextStrokes = [...strokes, ...newStrokesToAdd];
    setStrokes(nextStrokes);
    persistStrokes(nextStrokes);
    playClickSound();

    if (channelRef.current?.state === 'joined') {
      newStrokesToAdd.forEach((ns) => {
        channelRef.current!.send({
          type: 'broadcast',
          event: 'stroke_add',
          payload: { stroke: ns, userId: currentUserId }
        });
      });
    }

    setSelectedStrokeIds(newStrokesToAdd.map(s => s.id));
    useDialogStore.getState().showNotification(`${newStrokesToAdd.length} shape(s) pasted`, 'success', 1000);
  }, [copiedStrokes, toCanvasCoords, strokes, persistStrokes, currentUserId]);

  const handleDuplicateStrokesDirect = useCallback(() => {
    if (selectedStrokeIds.length === 0) return;
    const selected = strokes.filter(s => selectedStrokeIds.includes(s.id));
    
    const newStrokesToAdd = selected.map((orig) => {
      const newPoints = orig.points.map((p) => ({ x: p.x + 40, y: p.y + 40 }));
      return {
        ...orig,
        id: crypto.randomUUID(),
        points: newPoints,
      };
    });

    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    const nextStrokes = [...strokes, ...newStrokesToAdd];
    setStrokes(nextStrokes);
    persistStrokes(nextStrokes);
    playClickSound();

    if (channelRef.current?.state === 'joined') {
      newStrokesToAdd.forEach((ns) => {
        channelRef.current!.send({
          type: 'broadcast',
          event: 'stroke_add',
          payload: { stroke: ns, userId: currentUserId }
        });
      });
    }
    setSelectedStrokeIds(newStrokesToAdd.map(s => s.id));
  }, [selectedStrokeIds, strokes, persistStrokes, currentUserId]);

  // Layers ordering
  const handleBringToFront = useCallback(() => {
    if (selectedStrokeIds.length === 0) return;
    setUndoStack((prev) => [...prev, strokes]);
    setStrokes((prev) => {
      const selected = prev.filter(s => selectedStrokeIds.includes(s.id));
      const unselected = prev.filter(s => !selectedStrokeIds.includes(s.id));
      const next = [...unselected, ...selected];
      persistStrokes(next);
      return next;
    });
  }, [selectedStrokeIds, strokes, persistStrokes]);

  const handleSendToBack = useCallback(() => {
    if (selectedStrokeIds.length === 0) return;
    setUndoStack((prev) => [...prev, strokes]);
    setStrokes((prev) => {
      const selected = prev.filter(s => selectedStrokeIds.includes(s.id));
      const unselected = prev.filter(s => !selectedStrokeIds.includes(s.id));
      const next = [...selected, ...unselected];
      persistStrokes(next);
      return next;
    });
  }, [selectedStrokeIds, strokes, persistStrokes]);

  const handleBringForward = useCallback(() => {
    if (selectedStrokeIds.length === 0) return;
    setUndoStack((prev) => [...prev, strokes]);
    setStrokes((prev) => {
      const next = [...prev];
      for (let i = next.length - 2; i >= 0; i--) {
        if (selectedStrokeIds.includes(next[i].id) && !selectedStrokeIds.includes(next[i + 1].id)) {
          const temp = next[i];
          next[i] = next[i + 1];
          next[i + 1] = temp;
        }
      }
      persistStrokes(next);
      return next;
    });
  }, [selectedStrokeIds, strokes, persistStrokes]);

  const handleSendBackward = useCallback(() => {
    if (selectedStrokeIds.length === 0) return;
    setUndoStack((prev) => [...prev, strokes]);
    setStrokes((prev) => {
      const next = [...prev];
      for (let i = 1; i < next.length; i++) {
        if (selectedStrokeIds.includes(next[i].id) && !selectedStrokeIds.includes(next[i - 1].id)) {
          const temp = next[i];
          next[i] = next[i - 1];
          next[i - 1] = temp;
        }
      }
      persistStrokes(next);
      return next;
    });
  }, [selectedStrokeIds, strokes, persistStrokes]);

  // Group / Ungroup
  const handleGroupStrokes = useCallback(() => {
    if (selectedStrokeIds.length < 2) return;
    const newGroupId = crypto.randomUUID();
    setUndoStack((prev) => [...prev, strokes]);
    setStrokes((prev) => {
      const next = prev.map((s) => {
        if (selectedStrokeIds.includes(s.id)) {
          return { ...s, groupId: newGroupId };
        }
        return s;
      });
      persistStrokes(next);
      return next;
    });
  }, [selectedStrokeIds, strokes, persistStrokes]);

  const handleUngroupStrokes = useCallback(() => {
    if (selectedStrokeIds.length === 0) return;
    setUndoStack((prev) => [...prev, strokes]);
    setStrokes((prev) => {
      const next = prev.map((s) => {
        if (selectedStrokeIds.includes(s.id)) {
          return { ...s, groupId: undefined };
        }
        return s;
      });
      persistStrokes(next);
      return next;
    });
  }, [selectedStrokeIds, strokes, persistStrokes]);

  // Alignments
  const handleAlignStrokes = useCallback((alignment: 'left' | 'right' | 'center-h' | 'top' | 'bottom' | 'center-v' | 'distribute-h' | 'distribute-v') => {
    if (selectedStrokeIds.length < 2) return;
    const box = getCombinedBoundingBox(selectedStrokeIds);
    if (box.minX === Infinity) return;

    setUndoStack((prev) => [...prev, strokes]);
    setStrokes((prev) => {
      const next = [...prev];
      const selected = next.filter(s => selectedStrokeIds.includes(s.id));

      if (alignment === 'left') {
        selected.forEach((s) => {
          const sBox = getStrokeBoundingBox(s);
          const dx = box.minX - sBox.minX;
          s.points = s.points.map(p => ({ x: p.x + dx, y: p.y }));
        });
      } else if (alignment === 'right') {
        selected.forEach((s) => {
          const sBox = getStrokeBoundingBox(s);
          const dx = box.maxX - sBox.maxX;
          s.points = s.points.map(p => ({ x: p.x + dx, y: p.y }));
        });
      } else if (alignment === 'center-h') {
        const cx = box.minX + box.w / 2;
        selected.forEach((s) => {
          const sBox = getStrokeBoundingBox(s);
          const sCx = sBox.minX + (sBox.maxX - sBox.minX) / 2;
          const dx = cx - sCx;
          s.points = s.points.map(p => ({ x: p.x + dx, y: p.y }));
        });
      } else if (alignment === 'top') {
        selected.forEach((s) => {
          const sBox = getStrokeBoundingBox(s);
          const dy = box.minY - sBox.minY;
          s.points = s.points.map(p => ({ x: p.x, y: p.y + dy }));
        });
      } else if (alignment === 'bottom') {
        selected.forEach((s) => {
          const sBox = getStrokeBoundingBox(s);
          const dy = box.maxY - sBox.maxY;
          s.points = s.points.map(p => ({ x: p.x, y: p.y + dy }));
        });
      } else if (alignment === 'center-v') {
        const cy = box.minY + box.h / 2;
        selected.forEach((s) => {
          const sBox = getStrokeBoundingBox(s);
          const sCy = sBox.minY + (sBox.maxY - sBox.minY) / 2;
          const dy = cy - sCy;
          s.points = s.points.map(p => ({ x: p.x, y: p.y + dy }));
        });
      } else if (alignment === 'distribute-h') {
        const sorted = [...selected].sort((a, b) => getStrokeBoundingBox(a).minX - getStrokeBoundingBox(b).minX);
        const totalW = sorted.reduce((sum, s) => sum + (getStrokeBoundingBox(s).maxX - getStrokeBoundingBox(s).minX), 0);
        const gap = (box.w - totalW) / (sorted.length - 1);
        let currentLeft = box.minX;
        sorted.forEach((s) => {
          const sBox = getStrokeBoundingBox(s);
          const sW = sBox.maxX - sBox.minX;
          const dx = currentLeft - sBox.minX;
          s.points = s.points.map(p => ({ x: p.x + dx, y: p.y }));
          currentLeft += sW + gap;
        });
      } else if (alignment === 'distribute-v') {
        const sorted = [...selected].sort((a, b) => getStrokeBoundingBox(a).minY - getStrokeBoundingBox(b).minY);
        const totalH = sorted.reduce((sum, s) => sum + (getStrokeBoundingBox(s).maxY - getStrokeBoundingBox(s).minY), 0);
        const gap = (box.h - totalH) / (sorted.length - 1);
        let currentTop = box.minY;
        sorted.forEach((s) => {
          const sBox = getStrokeBoundingBox(s);
          const sH = sBox.maxY - sBox.minY;
          const dy = currentTop - sBox.minY;
          s.points = s.points.map(p => ({ x: p.x, y: p.y + dy }));
          currentTop += sH + gap;
        });
      }

      if (channelRef.current?.state === 'joined') {
        selected.forEach((s) => {
          channelRef.current!.send({ type: 'broadcast', event: 'stroke_add', payload: { stroke: s } });
        });
      }
      persistStrokes(next);
      return next;
    });
  }, [selectedStrokeIds, strokes, persistStrokes, getCombinedBoundingBox, getStrokeBoundingBox]);

  // Background change
  const handleBgChange = useCallback((newBg: string) => {
    setBgColor(newBg);
    updateNode(nodeId, { boardBg: newBg });
    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({ type: 'broadcast', event: 'bg_change', payload: { bg: newBg } });
    }
    setShowBgPicker(false);
  }, [nodeId, updateNode]);

  // Exporters
  const handleExportJSON = () => {
    const dataStr = JSON.stringify({
      strokes,
      bgColor,
      zoom: view.scale,
      pan: { x: view.offsetX, y: view.offsetY }
    }, null, 2);
    const link = document.createElement('a');
    link.download = `board-${nodeId.slice(0, 6)}.json`;
    link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    link.click();
    setShowExportMenu(false);
  };

  const handleExportSVG = () => {
    const box = getCombinedBoundingBox(strokes.map(s => s.id));
    const padding = 20;
    const svgW = box.minX === Infinity ? canvasSize.w : box.w + padding * 2;
    const svgH = box.minY === Infinity ? canvasSize.h : box.h + padding * 2;
    const minX = box.minX === Infinity ? 0 : box.minX - padding;
    const minY = box.minY === Infinity ? 0 : box.minY - padding;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${svgW} ${svgH}" width="${svgW}" height="${svgH}" style="background-color: ${bgColor};">`;
    
    strokes.forEach((s) => {
      if (!s.points || s.points.length === 0) return;
      const opacityStr = s.opacity !== undefined ? `opacity="${s.opacity}"` : '';
      const dashStr = s.strokeDasharray ? `stroke-dasharray="${s.strokeDasharray}"` : '';
      const fillStr = s.fill ? (s.fillColor || s.color) : 'none';
      
      if (s.tool === 'pen' || s.tool === 'highlighter' || s.tool === 'eraser') {
        let pathStr = `M ${s.points[0].x} ${s.points[0].y}`;
        for (let i = 1; i < s.points.length; i++) {
          pathStr += ` L ${s.points[i].x} ${s.points[i].y}`;
        }
        const strokeWidthVal = s.tool === 'highlighter' ? s.width * 2.5 : s.width;
        const strokeOpacity = s.tool === 'highlighter' ? 0.45 : 1;
        const strokeColor = s.tool === 'eraser' ? bgColor : (s.color || '#ffffff');
        svgContent += `<path d="${pathStr}" stroke="${strokeColor}" stroke-width="${strokeWidthVal}" stroke-linecap="round" stroke-linejoin="round" fill="none" ${opacityStr} stroke-opacity="${strokeOpacity}" />`;
      } else if (s.tool === 'text') {
        const p = s.points[0];
        const align = s.textAlign || 'left';
        const anchor = align === 'center' ? 'middle' : (align === 'right' ? 'end' : 'start');
        svgContent += `<text x="${p.x}" y="${p.y}" fill="${s.color || '#ffffff'}" font-size="${s.fontSize || 18}" font-family="${s.fontFamily || 'sans-serif'}" font-weight="${s.fontWeight || 'normal'}" text-anchor="${anchor}">${s.text || ''}</text>`;
      } else if (s.tool === 'sticky') {
        const p1 = s.points[0];
        const p2 = s.points[1] || { x: p1.x + 160, y: p1.y + 160 };
        const w = p2.x - p1.x;
        const h = p2.y - p1.y;
        svgContent += `<g>`;
        svgContent += `<rect x="${p1.x}" y="${p1.y}" width="${w}" height="${h}" rx="8" fill="${s.fillColor || '#fef08a'}" />`;
        if (s.text) {
          svgContent += `<text x="${p1.x + w/2}" y="${p1.y + h/2}" fill="${s.color || '#18181b'}" font-size="${s.fontSize || 13}" font-family="sans-serif" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${s.text}</text>`;
        }
        svgContent += `</g>`;
      } else if (s.points.length >= 2) {
        const p0 = s.points[0];
        const pN = s.points[s.points.length - 1];
        const px = Math.min(p0.x, pN.x);
        const py = Math.min(p0.y, pN.y);
        const pw = Math.abs(pN.x - p0.x);
        const ph = Math.abs(pN.y - p0.y);
        
        if (s.tool === 'rect') {
          svgContent += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" stroke="${s.color}" stroke-width="${s.width}" fill="${fillStr}" ${dashStr} ${opacityStr} />`;
        } else if (s.tool === 'circle') {
          svgContent += `<ellipse cx="${px + pw/2}" cy="${py + ph/2}" rx="${pw/2}" ry="${ph/2}" stroke="${s.color}" stroke-width="${s.width}" fill="${fillStr}" ${dashStr} ${opacityStr} />`;
        } else if (s.tool === 'triangle') {
          svgContent += `<polygon points="${px + pw/2},${py} ${px + pw},${py + ph} ${px},${py + ph}" stroke="${s.color}" stroke-width="${s.width}" fill="${fillStr}" ${dashStr} ${opacityStr} />`;
        } else if (s.tool === 'line') {
          svgContent += `<line x1="${p0.x}" y1="${p0.y}" x2="${pN.x}" y2="${pN.y}" stroke="${s.color}" stroke-width="${s.width}" ${dashStr} ${opacityStr} />`;
        } else {
          const ptsStr = s.points.map(p => `${p.x},${p.y}`).join(' ');
          svgContent += `<polygon points="${ptsStr}" stroke="${s.color}" stroke-width="${s.width}" fill="${fillStr}" ${dashStr} ${opacityStr} />`;
        }
      }
    });
    svgContent += `</svg>`;
    
    const svgBlob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = svgUrl;
    downloadAnchor.download = `board-${nodeId.slice(0, 6)}.svg`;
    downloadAnchor.click();
    setShowExportMenu(false);
  };

  const handleExportPDF = async () => {
    setShowExportMenu(false);
    
    if (isSheetsMode && sheets.length > 0) {
      const first = sheets[0];
      const doc = new jsPDF({
        orientation: first.width > first.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [first.width, first.height]
      });

      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        if (i > 0) {
          doc.addPage([sheet.width, sheet.height], sheet.width > sheet.height ? 'l' : 'p');
        }

        const offscreen = document.createElement('canvas');
        offscreen.width = sheet.width;
        offscreen.height = sheet.height;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sheet.width, sheet.height);

          ctx.save();
          ctx.translate(-sheet.x, -sheet.y);
          strokes.forEach((stroke) => {
            if (isStrokeInSheet(stroke, sheet)) {
              drawStrokeWithConnector(ctx, stroke, false);
            }
          });
          ctx.restore();

          const imgData = offscreen.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 0, 0, sheet.width, sheet.height);
        }
      }
      doc.save(`board-sheets-${nodeId.slice(0, 6)}.pdf`);
    } else {
      const box = getCombinedBoundingBox(strokes.map(s => s.id));
      const padding = 20;
      const cropX = box.minX === Infinity ? 0 : box.minX - padding;
      const cropY = box.minY === Infinity ? 0 : box.minY - padding;
      const cropW = box.minX === Infinity ? canvasSize.w : box.w + padding * 2;
      const cropH = box.minY === Infinity ? canvasSize.h : box.h + padding * 2;

      const offscreen = document.createElement('canvas');
      offscreen.width = cropW;
      offscreen.height = cropH;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, cropW, cropH);

        ctx.save();
        ctx.translate(-cropX, -cropY);
        strokes.forEach((stroke) => {
          drawStrokeWithConnector(ctx, stroke, false);
        });
        ctx.restore();

        const imgData = offscreen.toDataURL('image/png');
        const doc = new jsPDF({
          orientation: cropW > cropH ? 'landscape' : 'portrait',
          unit: 'px',
          format: [cropW, cropH]
        });
        doc.addImage(imgData, 'PNG', 0, 0, cropW, cropH);
        doc.save(`board-${nodeId.slice(0, 6)}.pdf`);
      }
    }
  };

  const handleExportPNG = useCallback(() => {
    const box = getCombinedBoundingBox(strokes.map(s => s.id));
    if (box.minX === Infinity) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `board-${nodeId.slice(0, 6)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      return;
    }

    const padding = 20;
    const cropX = box.minX - padding;
    const cropY = box.minY - padding;
    const cropW = box.w + padding * 2;
    const cropH = box.h + padding * 2;

    const offscreen = document.createElement('canvas');
    offscreen.width = cropW;
    offscreen.height = cropH;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cropW, cropH);

    ctx.save();
    ctx.translate(-cropX, -cropY);
    strokes.forEach((stroke) => {
      drawStroke(ctx, stroke, false);
    });
    ctx.restore();

    const link = document.createElement('a');
    link.download = `board-${nodeId.slice(0, 6)}.png`;
    link.href = offscreen.toDataURL('image/png');
    link.click();
    setShowExportMenu(false);
  }, [strokes, bgColor, nodeId, getCombinedBoundingBox, drawStroke]);

  /* ─── Zoom, Touch Gesture & Keyboard Pan ─── */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      if (e.ctrlKey) {
        // Pinch-to-zoom
        const factor = 1 - e.deltaY * 0.015;
        setView((v) => {
          const nextScale = Math.min(Math.max(v.scale * factor, 0.1), 8);
          if (nextScale === v.scale) return v;

          const mouseX = (e.clientX - rect.left - v.offsetX) / v.scale;
          const mouseY = (e.clientY - rect.top - v.offsetY) / v.scale;

          return {
            scale: nextScale,
            offsetX: e.clientX - rect.left - mouseX * nextScale,
            offsetY: e.clientY - rect.top - mouseY * nextScale,
          };
        });
      } else if (e.shiftKey) {
        // Horizontal scroll
        setView((v) => ({
          ...v,
          offsetX: v.offsetX - e.deltaY,
        }));
      } else {
        // Vertical and horizontal scroll
        setView((v) => ({
          ...v,
          offsetX: v.offsetX - e.deltaX,
          offsetY: v.offsetY - e.deltaY,
        }));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsSpacePressed(true);
        isSpacePressedRef.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        isSpacePressedRef.current = false;
      }
    };

    wrap.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      wrap.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleZoomIn = () => setView((v) => ({ ...v, scale: Math.min(v.scale * 1.25, 8) }));
  const handleZoomOut = () => setView((v) => ({ ...v, scale: Math.max(v.scale * 0.8, 0.1) }));
  const handleZoomReset = () => setView({ scale: 1, offsetX: 0, offsetY: 0 });

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (textInput.active) return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.hasAttribute('contenteditable')) {
        return;
      }

      if (e.key === 'Escape') {
        if (selectedStrokeIds.length > 0) { setSelectedStrokeIds([]); return; }
        handleCloseConfirm();
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          handleUndo();
        }
        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
        if (e.key === 'c' || e.key === 'C') {
          if (selectedStrokeIds.length > 0) { e.preventDefault(); handleCopyStrokes(); }
        }
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          handlePasteStrokes(mousePosRef.current.x, mousePosRef.current.y);
        }
        if (e.key === 'd' || e.key === 'D') {
          if (selectedStrokeIds.length > 0) { e.preventDefault(); handleDuplicateStrokesDirect(); }
        }
        if (e.key === 'x' || e.key === 'X') {
          if (selectedStrokeIds.length > 0) { e.preventDefault(); handleCutStrokes(); }
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedStrokeIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }

      // Arrow keys nudge selected elements
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedStrokeIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;

        setUndoStack((prev) => [...prev, strokes]);
        setStrokes((prev) => prev.map((s) => {
          if (!selectedStrokeIds.includes(s.id)) return s;
          const newPts = s.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          return { ...s, points: newPts };
        }));
        persistStrokes(strokes);
      }

      // Tool shortcuts
      const toolMap: Record<string, Tool> = {
        'p': 'pen', 'h': 'highlighter', 'e': 'eraser', 'l': 'line', 'r': 'rect', 'c': 'circle',
        'y': 'triangle', 'a': 'arrow', 't': 'text', 's': 'select', 'v': 'select',
      };
      if (!e.ctrlKey && !e.metaKey && toolMap[e.key.toLowerCase()]) {
        setTool(toolMap[e.key.toLowerCase()]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [textInput.active, selectedStrokeIds, strokes, handleUndo, handleRedo, handleDeleteSelected, handleCopyStrokes, handlePasteStrokes, handleDuplicateStrokesDirect, handleCutStrokes, persistStrokes, handleCloseConfirm]);

  /* ─── Double click to edit shape ─── */
  const onDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'select') return;
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    
    const hit = [...strokes].reverse().find(
      (s) => (s.tool === 'text' || s.tool === 'sticky') && hitTestStroke(s, x, y, 15)
    );
    
    if (hit) {
      setEditingStrokeId(hit.id);
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = hit.points[0].x * view.scale + rect.left + view.offsetX;
      const clientY = hit.points[0].y * view.scale + rect.top + view.offsetY;
      
      setTextInput({
        active: true,
        x: hit.points[0].x, // canvas coord
        y: hit.points[0].y,
        clientX,
        clientY,
        value: hit.text || '',
      });
    }
  }, [tool, strokes, hitTestStroke, toCanvasCoords, view]);

  // Context Menu
  const onContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    const hit = [...strokes].reverse().find((s) => hitTestStroke(s, x, y, 8));
    if (hit) {
      if (!selectedStrokeIds.includes(hit.id)) {
        setSelectedStrokeIds([hit.id]);
      }
      setContextMenu({ x: e.clientX, y: e.clientY, canvasX: x, canvasY: y, strokeId: hit.id, strokeTool: hit.tool });
    } else {
      setSelectedStrokeIds([]);
      setContextMenu({ x: e.clientX, y: e.clientY, canvasX: x, canvasY: y });
    }
  }, [strokes, hitTestStroke, toCanvasCoords, selectedStrokeIds]);

  const doubleClickToEditText = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    onDoubleClick(e);
  }, [onDoubleClick]);

  const contextMenuOpen = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    onContextMenu(e);
  }, [onContextMenu]);

  // Insert shape at canvas position via context menu
  const insertShapeAt = useCallback((shapeTool: BoardStroke['tool'], cx: number, cy: number) => {
    const W = 120, H = 80;
    const newStroke: BoardStroke = {
      id: Math.random().toString(36).slice(2),
      tool: shapeTool,
      points: [{ x: cx - W / 2, y: cy - H / 2 }, { x: cx + W / 2, y: cy + H / 2 }],
      color,
      width: strokeWidth,
      opacity,
      fill: useFill,
      fillColor,
      fillOpacity: 0.5,
    };
    setUndoStack((p) => [...p, strokes]);
    setRedoStack([]);
    const next = [...strokes, newStroke];
    setStrokes(next);
    setSelectedStrokeIds([newStroke.id]);
    setTool('select');
    setContextMenu(null);
    persistStrokes(next);
  }, [color, strokeWidth, opacity, useFill, fillColor, strokes, persistStrokes]);

  const collaboratorList = Object.entries(collaborators);
  
  const cursorStyle: Record<Tool, string> = {
    select: 'default',
    pen: 'crosshair',
    highlighter: 'crosshair',
    eraser: 'cell',
    line: 'crosshair',
    arrow: 'crosshair',
    rect: 'crosshair',
    circle: 'crosshair',
    triangle: 'crosshair',
    text: 'text',
    sticky: 'cell',
    'rounded-rect': 'crosshair',
    ellipse: 'crosshair',
    diamond: 'crosshair',
    hexagon: 'crosshair',
    'flow-process': 'crosshair',
    'flow-decision': 'crosshair',
    'flow-data': 'crosshair',
    'flow-terminator': 'crosshair',
    'diag-cloud': 'crosshair',
    'diag-database': 'crosshair',
    'diag-cylinder': 'crosshair',
    'diag-document': 'crosshair',
  };

  const currentCursor = isPanning ? 'grabbing' : isSpacePressed ? 'grab' : cursorStyle[tool];

  const toolsList: { id: Tool; icon: React.ReactNode; label: string; key: string }[] = [
    { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: 'Select', key: 'V' },
    { id: 'pen', icon: <Pen className="w-4 h-4" />, label: 'Pen', key: 'P' },
    { id: 'highlighter', icon: <Highlighter className="w-4 h-4" />, label: 'Highlighter', key: 'H' },
    { id: 'eraser', icon: <Eraser className="w-4 h-4" />, label: 'Eraser', key: 'E' },
    { id: 'line', icon: <Minus className="w-4 h-4" />, label: 'Line / Connector', key: 'L' },
    { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Text', key: 'T' },
    { id: 'sticky', icon: <StickyNote className="w-4 h-4" />, label: 'Sticky Note', key: 'N' },
  ];

  const shapesList: { id: Tool; label: string; group: string }[] = [
    { id: 'rect', label: 'Rectangle', group: 'Basic' },
    { id: 'rounded-rect', label: 'Rounded Rect', group: 'Basic' },
    { id: 'circle', label: 'Circle', group: 'Basic' },
    { id: 'ellipse', label: 'Ellipse', group: 'Basic' },
    { id: 'triangle', label: 'Triangle', group: 'Basic' },
    { id: 'diamond', label: 'Diamond', group: 'Basic' },
    { id: 'hexagon', label: 'Hexagon', group: 'Basic' },
    { id: 'flow-process', label: 'Process Box', group: 'Flowchart' },
    { id: 'flow-decision', label: 'Decision Diamond', group: 'Flowchart' },
    { id: 'flow-data', label: 'Data Input', group: 'Flowchart' },
    { id: 'flow-terminator', label: 'Terminator', group: 'Flowchart' },
    { id: 'diag-cloud', label: 'Cloud Node', group: 'Diagram' },
    { id: 'diag-database', label: 'Database Cyl', group: 'Diagram' },
    { id: 'diag-cylinder', label: 'Cylinder', group: 'Diagram' },
    { id: 'diag-document', label: 'Document', group: 'Diagram' },
  ];

  return (
    <div
      dir="ltr"
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={handleCloseConfirm}
    >
      <div
        className="flex flex-col bg-zinc-950 border border-zinc-800/80 shadow-2xl rounded-2xl overflow-hidden relative select-none"
        style={{
          fontFamily: 'Inter, sans-serif',
          width: `${size.width}px`,
          height: `${size.height}px`,
          position: 'relative',
          left: 0,
          top: 0,
          transform: `translate(${position.x}px, ${position.y}px)`,
          direction: 'ltr',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ TOP TOOLBAR ═══ */}
        <div
          onMouseDown={onDragStart}
          className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur-md z-20 cursor-move"
        >
          {/* Left: Title + Sync */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center">
              <Pen className="w-3.5 h-3.5 text-fuchsia-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground leading-tight">{label}</h2>
              <p className="text-[10px] text-muted-foreground/60 font-light leading-none mt-0.5">
                Infinite Canvas · {strokes.length} object{strokes.length !== 1 ? 's' : ''}
              </p>
            </div>
            {isSyncing && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20">
                <Save className="w-3 h-3 text-fuchsia-400 animate-pulse" />
                <span className="text-[10px] text-fuchsia-400 font-semibold">Saving...</span>
              </div>
            )}
          </div>

          {/* Center: Quick Undo/Redo & Zoom */}
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
            {selectedStrokeIds.length > 0 && (
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
                  {[10, 25, 50, 75, 100, 150, 200, 400, 800].map((pct) => (
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
            
            {/* Export System */}
            <div className="relative">
              <button onClick={() => setShowExportMenu(!showExportMenu)}
                className="h-8 px-3 rounded-lg flex items-center gap-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer text-xs font-semibold"
                title="Export Panel"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-10 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[150px] p-1 flex flex-col gap-0.5">
                  <button onClick={handleExportPNG} className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2">
                    <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export PNG</span>
                  </button>
                  <button onClick={handleExportSVG} className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2">
                    <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export SVG</span>
                  </button>
                  <button onClick={handleExportPDF} className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2">
                    <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export PDF</span>
                  </button>
                  <button onClick={handleExportJSON} className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2">
                    <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export JSON</span>
                  </button>
                </div>
              )}
            </div>
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
              onClick={handleCloseConfirm}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Close Board (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ═══ MAIN AREA ═══ */}
        <div className="flex-1 flex overflow-visible relative">
          {/* ── LEFT TOOLS PALETTE ── */}
          <div 
            className="w-14 h-full shrink-0 bg-zinc-900/90 backdrop-blur-md border-r border-zinc-800/80 flex flex-col items-center py-3 gap-1.5 z-20 overflow-y-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {toolsList.map((t) => (
              <div key={t.id} className="relative">
                <button
                  onClick={() => { 
                    setTool(t.id); 
                    setShowShapesMenu(false); 
                    setShowLineMenu(false);
                  }}
                  onContextMenu={(e) => {
                    if (t.id === 'line') {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowLineMenu((prev) => !prev);
                      setShowShapesMenu(false);
                    }
                  }}
                  title={`${t.label} (${t.key})${t.id === 'line' ? ' · Right-click for options' : ''}`}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative
                    ${(tool === t.id || (t.id === 'line' && ['line', 'arrow'].includes(tool))) && !showShapesMenu && !showLineMenu
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
              </div>
            ))}

            {/* Custom Shapes library button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowShapesMenu(!showShapesMenu);
                  setShowLineMenu(false);
                }}
                title="More Shapes..."
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer
                  ${showShapesMenu || !['select', 'pen', 'highlighter', 'eraser', 'line', 'arrow', 'text', 'sticky'].includes(tool)
                    ? 'bg-fuchsia-500 text-white border-fuchsia-400 shadow-lg shadow-fuchsia-500/30'
                    : 'text-zinc-500 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="w-8 h-px bg-zinc-800 my-1" />

            {/* Quick Color Toggles */}
            {recentColors.map((c, idx) => (
              <button
                key={c + '-' + idx}
                onClick={() => handleBrushColorChange(c)}
                className={`w-10 h-10 rounded-xl border border-zinc-800 transition-all cursor-pointer flex items-center justify-center hover:scale-105 bg-zinc-900/50
                  ${color.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-fuchsia-500 ring-offset-1 scale-105' : 'hover:bg-zinc-800/85'}`}
                title={`Recent Color ${idx + 1}`}
              >
                <div 
                  className="w-4.5 h-4.5 rounded-full shadow-xs" 
                  style={{ 
                    backgroundColor: c, 
                    border: (c.toLowerCase() === '#ffffff' || c.toLowerCase() === '#f8f9fa' || c.toLowerCase() === '#f4f4f5') 
                      ? '1px solid rgba(255,255,255,0.15)' 
                      : 'none' 
                  }} 
                />
              </button>
            ))}
          </div>

          {/* Floating Line Options Menu */}
          {showLineMenu && (
            <div 
              className="fixed left-[68px] top-[170px] bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl z-[9999] p-4 w-[300px] text-left select-none animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <h3 className="text-xs font-bold text-zinc-200 mb-3 border-b border-zinc-800 pb-1.5 flex items-center justify-between">
                <span>Connector & Line Options</span>
                <span className="text-[9px] uppercase tracking-wider text-fuchsia-400 font-semibold font-mono">Options</span>
              </h3>
              
              {/* Line Type */}
              <div className="mb-4">
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-2">Connector Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'straight', label: 'Straight' },
                    { id: 'curved', label: 'Curved' },
                    { id: 'curved-multi', label: 'Curved Multi-Node' },
                    { id: 'elbow', label: 'Elbow' },
                    { id: 'orthogonal', label: 'Orthogonal' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setArrowType(item.id as any);
                        setTool('line');
                      }}
                      className={`px-2 py-1.5 text-xs rounded-lg border text-left font-medium transition-all cursor-pointer flex justify-between items-center
                        ${arrowType === item.id && tool === 'line'
                          ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40 shadow-xs'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800/80 hover:bg-zinc-800/80 hover:text-zinc-300'
                        }`}
                    >
                      <span>{item.label}</span>
                      {arrowType === item.id && tool === 'line' && <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Arrowhead */}
              <div className="mb-4">
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-2">Start Arrowhead</label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'triangle', label: 'Triangle' },
                    { id: 'circle', label: 'Circle' },
                    { id: 'diamond', label: 'Diamond' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setArrowheadStart(item.id as any);
                        setTool('line');
                      }}
                      className={`py-1 text-[10px] rounded-md border text-center font-medium transition-all cursor-pointer truncate
                        ${arrowheadStart === item.id
                          ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:bg-zinc-800'
                        }`}
                      title={item.label}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* End Arrowhead */}
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-2">End Arrowhead</label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'triangle', label: 'Triangle' },
                    { id: 'circle', label: 'Circle' },
                    { id: 'diamond', label: 'Diamond' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setArrowheadEnd(item.id as any);
                        setTool('line');
                      }}
                      className={`py-1 text-[10px] rounded-md border text-center font-medium transition-all cursor-pointer truncate
                        ${arrowheadEnd === item.id
                          ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:bg-zinc-800'
                        }`}
                      title={item.label}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Floating Shapes Menu */}
          {showShapesMenu && (
            <div 
              className="fixed left-[68px] top-[280px] bg-zinc-900/98 border border-zinc-700 rounded-2xl shadow-2xl z-[9999] p-3 w-[260px] max-h-[420px] overflow-y-auto select-none animate-fadeIn backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Whiteboard Shapes</p>
              
              {['Basic', 'Flowchart', 'Diagram'].map((group) => (
                <div key={group} className="mb-3">
                  <h4 className="text-[9px] text-zinc-600 font-bold uppercase mb-1.5">{group} Shapes</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {shapesList.filter(s => s.group === group).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setTool(s.id); setShowShapesMenu(false); }}
                        className={`px-2.5 py-1.5 text-left text-xs rounded-lg transition-all border flex items-center justify-between cursor-pointer
                          ${tool === s.id
                            ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800/80 hover:text-zinc-300'
                          }`}
                      >
                        <span>{s.label}</span>
                        <span className="text-[8px] text-zinc-600 font-mono shrink-0">shape</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── CANVAS AREA ── */}
          <div
            ref={wrapRef}
            className="flex-1 overflow-hidden relative"
            style={{ backgroundColor: bgColor }}
          >
            {/* Main committed-strokes canvas */}
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              className="absolute inset-0 block"
              style={{ cursor: currentCursor, touchAction: 'none' }}
            />
            {/* Overlay preview canvas (handles input events) */}
            <canvas
              ref={overlayRef}
              width={canvasSize.w}
              height={canvasSize.h}
              className="absolute inset-0 block bg-transparent"
              style={{ cursor: currentCursor, touchAction: 'none' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onDoubleClick={doubleClickToEditText}
              onContextMenu={contextMenuOpen}
            />

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

            {/* Text/Sticky input area - scales with scale and pan */}
            {textInput.active && (() => {
              const editingStroke = editingStrokeId ? strokes.find(s => s.id === editingStrokeId) : null;
              const isSticky = editingStroke?.tool === 'sticky' || (!editingStrokeId && tool === 'sticky');
              // For sticky notes: compute pixel size from the stored points
              let stickyW = 160, stickyH = 160;
              if (editingStroke?.tool === 'sticky' && editingStroke.points.length >= 2) {
                stickyW = Math.abs(editingStroke.points[1].x - editingStroke.points[0].x);
                stickyH = Math.abs(editingStroke.points[1].y - editingStroke.points[0].y);
              }
              return (
                <div
                  className="absolute z-50"
                  style={{
                    left: `${textInput.x * view.scale + view.offsetX}px`,
                    top: `${textInput.y * view.scale + view.offsetY}px`,
                    transform: `scale(${view.scale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <textarea
                    autoFocus
                    dir="auto"
                    value={textInput.value}
                    onChange={(e) => {
                      setTextInput((t) => ({ ...t, value: e.target.value }));
                      // Auto-grow height for non-sticky text
                      if (!isSticky) {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        commitText();
                      }
                      if (e.key === 'Escape') {
                        setTextInput({ active: false, x: 0, y: 0, clientX: 0, clientY: 0, value: '' });
                        setEditingStrokeId(null);
                      }
                    }}
                    onBlur={commitText}
                    className="outline-none p-2 border transition-all duration-150"
                    style={{
                      resize: isSticky ? 'none' : 'horizontal',
                      overflow: isSticky ? 'hidden' : 'hidden',
                      width: isSticky ? `${stickyW}px` : '220px',
                      height: isSticky ? `${stickyH}px` : 'auto',
                      minHeight: isSticky ? `${stickyH}px` : '38px',
                      maxWidth: isSticky ? `${stickyW}px` : '480px',
                      fontSize: editingStroke ? `${editingStroke.fontSize || 18}px` : `${tool === 'sticky' ? 13 : fontSize}px`,
                      fontFamily: editingStroke ? editingStroke.fontFamily || 'Inter, sans-serif' : (tool === 'sticky' ? 'sans-serif' : fontFamily),
                      fontWeight: editingStroke ? editingStroke.fontWeight || 'normal' : (tool === 'sticky' ? 'bold' : fontWeight),
                      textAlign: editingStroke ? editingStroke.textAlign || 'left' : (tool === 'sticky' ? 'center' : textAlign),
                      color: editingStroke ? editingStroke.color || '#ffffff' : (tool === 'sticky' ? '#18181b' : color),
                      backgroundColor: isSticky
                        ? (editingStroke?.fillColor || fillColor || '#fef08a')
                        : 'transparent',
                      borderColor: isSticky ? 'transparent' : 'rgba(99,102,241,0.6)',
                      boxShadow: isSticky ? '0 10px 15px -3px rgba(0,0,0,0.3)' : 'none',
                      borderRadius: '8px',
                      lineHeight: '1.4',
                      caretColor: isSticky ? '#18181b' : color,
                      wordBreak: 'break-word',
                      whiteSpace: isSticky ? 'pre-wrap' : 'pre',
                    }}
                    placeholder={tool === 'sticky' ? 'Note...' : 'Type text...'}
                  />
                </div>
              );
            })()}

          </div>

          {/* ── RIGHT PROPERTIES PANEL ── */}
          <div className="w-[200px] shrink-0 bg-zinc-900/90 backdrop-blur-md border-l border-zinc-800/80 flex flex-col py-4 px-3 gap-4 z-20 overflow-y-auto">
            {/* Multi-Selection alignment/grouping panel */}
            {selectedStrokeIds.length > 0 && (
              <div className="space-y-3 pb-3 border-b border-zinc-800/80">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Actions ({selectedStrokeIds.length} selected)</p>
                
                {selectedStrokeIds.length >= 2 && (
                  <>
                    {/* Alignments */}
                    <div className="grid grid-cols-4 gap-1">
                      <button onClick={() => handleAlignStrokes('left')} className="h-7 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer" title="Align Left">
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleAlignStrokes('center-h')} className="h-7 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer" title="Align Center X">
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleAlignStrokes('right')} className="h-7 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer" title="Align Right">
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleAlignStrokes('top')} className="h-7 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer" title="Align Top">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <button onClick={() => handleAlignStrokes('bottom')} className="h-7 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer" title="Align Bottom">
                        <ChevronUp className="w-3.5 h-3.5 rotate-180" />
                      </button>
                      <button onClick={() => handleAlignStrokes('center-v')} className="h-7 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer" title="Align Center Y">
                        <Move className="w-3.5 h-3.5 rotate-90" />
                      </button>
                      <button onClick={() => handleAlignStrokes('distribute-h')} className="h-7 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer text-[10px] font-bold" title="Distribute Horizontally">
                        D-H
                      </button>
                      <button onClick={() => handleAlignStrokes('distribute-v')} className="h-7 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer text-[10px] font-bold" title="Distribute Vertically">
                        D-V
                      </button>
                    </div>

                    {/* Grouping */}
                    <div className="flex gap-1.5">
                      <button onClick={handleGroupStrokes} className="flex-1 py-1 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[10px] font-bold text-zinc-300 hover:text-white cursor-pointer">
                        Group
                      </button>
                      <button onClick={handleUngroupStrokes} className="flex-1 py-1 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[10px] font-bold text-zinc-300 hover:text-white cursor-pointer">
                        Ungroup
                      </button>
                    </div>
                  </>
                )}

                {/* Layering */}
                <div className="grid grid-cols-4 gap-1">
                  <button onClick={handleBringToFront} className="h-7 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[9px] font-bold text-zinc-400 hover:text-white cursor-pointer" title="Bring to Front">
                    Front
                  </button>
                  <button onClick={handleBringForward} className="h-7 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[9px] font-bold text-zinc-400 hover:text-white cursor-pointer" title="Bring Forward">
                    Fwd
                  </button>
                  <button onClick={handleSendBackward} className="h-7 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[9px] font-bold text-zinc-400 hover:text-white cursor-pointer" title="Send Backward">
                    Back
                  </button>
                  <button onClick={handleSendToBack} className="h-7 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[9px] font-bold text-zinc-400 hover:text-white cursor-pointer" title="Send to Back">
                    Base
                  </button>
                </div>

                {/* Direct clipboard helpers */}
                <div className="flex gap-1.5">
                  <button onClick={handleCopyStrokes} className="flex-1 py-1 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[9px] font-bold text-zinc-300 hover:text-white cursor-pointer flex items-center justify-center gap-1">
                    <Copy className="w-2.5 h-2.5" /> Copy
                  </button>
                  <button onClick={handleDuplicateStrokesDirect} className="flex-1 py-1 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[9px] font-bold text-zinc-300 hover:text-white cursor-pointer flex items-center justify-center gap-1">
                    <Layers className="w-2.5 h-2.5" /> Dupl
                  </button>
                </div>
              </div>
            )}

            {/* Opacity Control */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Opacity</p>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={opacity}
                onChange={(e) => handleOpacityChange(Number(e.target.value))}
                className="w-full h-1.5 rounded-full accent-fuchsia-500 cursor-pointer"
              />
              <p className="text-[9px] text-zinc-400 text-center mt-1">{Math.round(opacity * 100)}%</p>
            </div>

            {/* Stroke Width */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Stroke Width</p>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {STROKE_WIDTHS.slice(0, 3).map((w) => (
                  <button key={w} onClick={() => handleStrokeWidthChange(w)}
                    className={`h-7 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center
                      ${strokeWidth === w ? 'bg-fuchsia-500 text-white shadow-md' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750'}`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {STROKE_WIDTHS.slice(3, 6).map((w) => (
                  <button key={w} onClick={() => handleStrokeWidthChange(w)}
                    className={`h-7 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center
                      ${strokeWidth === w ? 'bg-fuchsia-500 text-white shadow-md' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750'}`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={1}
                max={48}
                value={strokeWidth}
                onChange={(e) => handleStrokeWidthChange(Number(e.target.value))}
                className="w-full h-1.5 rounded-full accent-fuchsia-500 cursor-pointer"
              />
            </div>

            {/* Shape Border & Fill settings */}
            {['rect', 'circle', 'triangle', 'rounded-rect', 'ellipse', 'diamond', 'hexagon', 'flow-process', 'flow-decision', 'flow-data', 'flow-terminator', 'diag-cloud', 'diag-database', 'diag-cylinder', 'diag-document'].includes(tool) && (
              <div className="space-y-3 pt-1 border-t border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Fill Shape</span>
                  <button
                    onClick={() => handleUseFillChange(!useFill)}
                    className={`h-6 px-2.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer border
                      ${useFill ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}
                  >
                    {useFill ? 'Solid' : 'None'}
                  </button>
                </div>

                {useFill && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Fill Color</p>
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {PALETTES.slice(0, 8).map((c) => (
                        <button key={c} onClick={() => handleFillColorChange(c)}
                          className="w-7 h-7 rounded-md border transition-all cursor-pointer shrink-0"
                          style={{ backgroundColor: c, borderColor: fillColor === c ? '#d946ef' : 'transparent' }}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {PALETTES.slice(8, 16).map((c) => (
                        <button key={c} onClick={() => handleFillColorChange(c)}
                          className="w-7 h-7 rounded-md border transition-all cursor-pointer shrink-0"
                          style={{ backgroundColor: c, borderColor: fillColor === c ? '#d946ef' : 'transparent' }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[8px] text-zinc-500">Custom</span>
                      <input type="color" value={fillColor} onChange={(e) => handleFillColorChange(e.target.value)}
                        className="flex-1 h-6 rounded-md border border-zinc-700 bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Colors Swatches (Border) */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Border Color</p>
              <div className="grid grid-cols-4 gap-1 mb-2">
                {PALETTES.slice(0, 8).map((c) => (
                  <button key={c} onClick={() => handleBrushColorChange(c)}
                    className="w-7 h-7 rounded-md border transition-all cursor-pointer shrink-0"
                    style={{ backgroundColor: c, borderColor: color === c ? '#d946ef' : 'transparent' }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1 mb-2">
                {PALETTES.slice(8, 16).map((c) => (
                  <button key={c} onClick={() => handleBrushColorChange(c)}
                    className="w-7 h-7 rounded-md border transition-all cursor-pointer shrink-0"
                    style={{ backgroundColor: c, borderColor: color === c ? '#d946ef' : 'transparent' }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[8px] text-zinc-500">Custom</span>
                <input type="color" value={color} onChange={(e) => handleBrushColorChange(e.target.value)}
                  className="flex-1 h-6 rounded-md border border-zinc-700 bg-transparent cursor-pointer"
                />
              </div>
            </div>

            {/* Text parameters (Text tool) */}
            {(tool === 'text' || tool === 'sticky') && (
              <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Typography</p>
                <div>
                  <label className="text-[8px] text-zinc-500 font-bold block mb-1">Font Size</label>
                  <input
                    type="range"
                    min={8}
                    max={72}
                    value={fontSize}
                    onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full accent-fuchsia-500 cursor-pointer"
                  />
                  <p className="text-[9px] text-zinc-400 text-center mt-1">{fontSize}px</p>
                </div>
                <div>
                  <label className="text-[8px] text-zinc-500 font-bold block mb-1">Font Family</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => handleFontFamilyChange(e.target.value)}
                    className="w-full py-1 px-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-zinc-300 outline-none"
                  >
                    <option value="Inter, sans-serif">Inter (Sans)</option>
                    <option value="Georgia, serif">Georgia (Serif)</option>
                    <option value="monospace">Monospace</option>
                    <option value="'Comic Sans MS', cursive">Comic Sans</option>
                  </select>
                </div>
                <div>
                  <label className="text-[8px] text-zinc-500 font-bold block mb-1">Weight & Alignment</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleFontWeightChange(fontWeight === 'bold' ? 'normal' : 'bold')}
                      className={`flex-1 h-7 rounded-lg text-xs font-bold transition-all border cursor-pointer
                        ${fontWeight === 'bold' ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40' : 'bg-zinc-950 border-zinc-850 text-zinc-400'}`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => handleTextAlignChange('left')}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border cursor-pointer
                        ${textAlign === 'left' ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40' : 'bg-zinc-950 border-zinc-850 text-zinc-400'}`}
                    >
                      L
                    </button>
                    <button
                      onClick={() => handleTextAlignChange('center')}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border cursor-pointer
                        ${textAlign === 'center' ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40' : 'bg-zinc-950 border-zinc-850 text-zinc-400'}`}
                    >
                      C
                    </button>
                    <button
                      onClick={() => handleTextAlignChange('right')}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border cursor-pointer
                        ${textAlign === 'right' ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40' : 'bg-zinc-950 border-zinc-850 text-zinc-400'}`}
                    >
                      R
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Connectors settings (Line/Arrow tools) */}
            {['line', 'arrow'].includes(tool) && (
              <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Connector Settings</p>
                <div>
                  <label className="text-[8px] text-zinc-500 font-bold block mb-1">Connector Route</label>
                  <select
                    value={arrowType}
                    onChange={(e) => handleArrowTypeChange(e.target.value as any)}
                    className="w-full py-1 px-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-zinc-300 outline-none"
                  >
                    <option value="straight">Straight</option>
                    <option value="curved">Curved Curve</option>
                    <option value="elbow">Elbow Joint</option>
                    <option value="orthogonal">Orthogonal</option>
                  </select>
                </div>
                <div>
                  <label className="text-[8px] text-zinc-500 font-bold block mb-1">Start Head</label>
                  <select
                    value={arrowheadStart}
                    onChange={(e) => handleArrowheadStartChange(e.target.value as any)}
                    className="w-full py-1 px-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-zinc-300 outline-none"
                  >
                    <option value="none">None</option>
                    <option value="triangle">Triangle</option>
                    <option value="circle">Circle</option>
                    <option value="diamond">Diamond</option>
                  </select>
                </div>
                <div>
                  <label className="text-[8px] text-zinc-500 font-bold block mb-1">End Head</label>
                  <select
                    value={arrowheadEnd}
                    onChange={(e) => handleArrowheadEndChange(e.target.value as any)}
                    className="w-full py-1 px-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-zinc-300 outline-none"
                  >
                    <option value="none">None</option>
                    <option value="triangle">Triangle</option>
                    <option value="circle">Circle</option>
                    <option value="diamond">Diamond</option>
                  </select>
                </div>
              </div>
            )}

            {/* Canvas Global settings (visible only when no elements selected) */}
            {selectedStrokeIds.length === 0 && (
              <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                {/* Whiteboard Sheets Layout Controls */}
                <div className="space-y-3 pb-3 border-b border-zinc-850">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Page Setup</p>
                    <button
                      onClick={() => handleSheetsModeToggle(!isSheetsMode)}
                      className={`px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition-all border ${
                        isSheetsMode
                          ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40 shadow-xs'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-850'
                      }`}
                    >
                      {isSheetsMode ? 'Sheets Active' : 'Infinite Canvas'}
                    </button>
                  </div>

                  {isSheetsMode && (
                    <>
                      {/* Add Page Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[8px] text-zinc-500 font-bold block">Add Page</label>
                        <div className="flex gap-1.5">
                          <select
                            value={selectedPreset}
                            onChange={(e) => setSelectedPreset(e.target.value)}
                            className="flex-1 py-1 px-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-[10px] text-zinc-300 outline-none cursor-pointer"
                          >
                            <option value="A4 Portrait">A4 Portrait</option>
                            <option value="A4 Landscape">A4 Landscape</option>
                            <option value="Letter Portrait">Letter Portrait</option>
                            <option value="Letter Landscape">Letter Landscape</option>
                            <option value="Square">Square</option>
                          </select>
                          <button
                            onClick={() => handleAddSheet(selectedPreset)}
                            className="w-7 h-7 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg cursor-pointer transition-all flex items-center justify-center shrink-0"
                            title="Add Page"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Pages List */}
                      <div className="space-y-1 pt-1">
                        <label className="text-[8px] text-zinc-500 font-bold block">Pages List</label>
                        <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                          {sheets.length === 0 ? (
                            <p className="text-[9px] text-zinc-600 italic">No pages created.</p>
                          ) : (
                            sheets.map((sheet, idx) => (
                              <div
                                key={sheet.id}
                                className="flex items-center justify-between p-1.5 bg-zinc-950/40 border border-zinc-850 rounded-lg hover:border-zinc-800 transition-all gap-1"
                              >
                                <button
                                  onClick={() => handleFocusSheet(sheet)}
                                  className="flex-1 text-left text-[10px] font-semibold text-zinc-300 hover:text-fuchsia-400 transition-all truncate cursor-pointer"
                                  title="Jump to Page"
                                >
                                  {idx + 1}. {sheet.name || sheet.preset}
                                </button>
                                <div className="flex items-center">
                                  <button
                                    disabled={idx === 0}
                                    onClick={() => handleMoveSheet(idx, 'up')}
                                    className="p-0.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-20 cursor-pointer"
                                    title="Move Up"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    disabled={idx === sheets.length - 1}
                                    onClick={() => handleMoveSheet(idx, 'down')}
                                    className="p-0.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-20 cursor-pointer"
                                    title="Move Down"
                                  >
                                    <ChevronUp className="w-3 h-3 rotate-180" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSheet(sheet.id)}
                                    className="p-0.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                                    title="Delete Page"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Grid Settings</p>
                <div>
                  <label className="text-[8px] text-zinc-500 font-bold block mb-1">Grid Styling</label>
                  <div className="flex gap-1">
                    {['dots', 'lines', 'none'].map((g) => (
                      <button key={g}
                        onClick={() => setGridType(g as any)}
                        className={`flex-1 py-1 rounded-lg text-[9px] font-bold transition-all border capitalize cursor-pointer
                          ${gridType === g ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40' : 'bg-zinc-950 border-zinc-850 text-zinc-400'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                
                {gridType !== 'none' && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-[8px] text-zinc-500 font-bold block">Snap To Grid</label>
                      <input
                        type="checkbox"
                        checked={snapToGrid}
                        onChange={(e) => setSnapToGrid(e.target.checked)}
                        className="w-3.5 h-3.5 accent-fuchsia-500 rounded bg-zinc-950 border border-zinc-800 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] text-zinc-500 font-bold block mb-1">Grid Size</label>
                      <input
                        type="range"
                        min={10}
                        max={60}
                        step={5}
                        value={gridSize}
                        onChange={(e) => setGridSize(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full accent-fuchsia-500 cursor-pointer"
                      />
                      <p className="text-[9px] text-zinc-400 text-center mt-1">{gridSize}px</p>
                    </div>
                  </>
                )}

                {/* Background color settings */}
                <div className="pt-2 border-t border-zinc-850">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Background</p>
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {BG_PRESETS.slice(0, 4).map((preset) => (
                      <button key={preset.value}
                        onClick={() => handleBgChange(preset.value)}
                        className="flex flex-col items-center p-1 rounded-lg hover:bg-zinc-800/80 cursor-pointer transition-all border border-transparent hover:border-zinc-850"
                        title={preset.label}
                      >
                        <div className="w-6 h-5 rounded border border-zinc-800" style={{ backgroundColor: preset.value }} />
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {BG_PRESETS.slice(4, 8).map((preset) => (
                      <button key={preset.value}
                        onClick={() => handleBgChange(preset.value)}
                        className="flex flex-col items-center p-1 rounded-lg hover:bg-zinc-800/80 cursor-pointer transition-all border border-transparent hover:border-zinc-850"
                        title={preset.label}
                      >
                        <div className="w-6 h-5 rounded border border-zinc-800" style={{ backgroundColor: preset.value }} />
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[8px] text-zinc-500">Custom</span>
                    <input type="color" value={bgColor} onChange={(e) => handleBgChange(e.target.value)}
                      className="flex-1 h-6 rounded-md border border-zinc-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ BOTTOM STATUS ═══ */}
        <div className="h-8 shrink-0 flex items-center justify-between px-4 border-t border-zinc-800/80 bg-zinc-900/90 text-[10px] text-zinc-500">
          <div className="flex items-center gap-4">
            <span>Tool: <span className="text-zinc-300 font-semibold capitalize">{tool}</span></span>
            <span>Shortcuts: P=Pen H=Highlighter E=Eraser L=Line A=Arrow T=Text V=Select Space+Drag=Pan</span>
          </div>
          <div className="flex items-center gap-3">
            {selectedStrokeIds.length > 0 && (
              <span className="text-fuchsia-400 font-semibold">{selectedStrokeIds.length} object(s) selected</span>
            )}
            <span>Viewport Zoom: {Math.round(view.scale * 100)}%</span>
            {isSyncing && <span className="text-fuchsia-400 animate-pulse">● Syncing</span>}
          </div>
        </div>

        {/* Floating Context Menu */}
        {contextMenu && (
          <div
            style={{
              position: 'fixed',
              left: Math.min(contextMenu.x + 4, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 280),
              top: Math.min(contextMenu.y + 4, (typeof window !== 'undefined' ? window.innerHeight : 800) - 520),
              zIndex: 99999,
              minWidth: 260,
              maxHeight: 'min(520px, calc(100vh - 40px))',
              scrollbarWidth: 'thin' as const,
              scrollbarColor: '#3f3f46 transparent',
            }}
            className="bg-zinc-950/98 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 font-sans flex flex-col gap-0.5 animate-fadeIn backdrop-blur-md overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* ── On a stroke (select object) ── */}
            {contextMenu.strokeId && (
              <>
                {/* Connector type picker if stroke is line/arrow */}
                {(contextMenu.strokeTool === 'line' || contextMenu.strokeTool === 'arrow') && (
                  <>
                    <p className="px-2.5 pt-1.5 pb-0.5 text-[9px] uppercase tracking-widest text-fuchsia-400 font-bold">Connector Type</p>
                    <div className="grid grid-cols-3 gap-1 px-1.5 pb-2">
                      {[
                        { id: 'straight', label: 'Straight', icon: '╌' },
                        { id: 'curved', label: 'Curved', icon: '⌒' },
                        { id: 'elbow', label: 'Elbow', icon: '⌐' },
                        { id: 'orthogonal', label: 'Ortho', icon: '┐' },
                        { id: 'curved-multi', label: 'Multi-pt', icon: '∿' },
                      ].map((ct) => {
                        const sel = strokes.find(s => s.id === contextMenu.strokeId);
                        const active = sel?.arrowType === ct.id || (!sel?.arrowType && ct.id === 'straight');
                        return (
                          <button
                            key={ct.id}
                            onClick={() => {
                              setStrokes(prev => prev.map(s => s.id === contextMenu.strokeId ? { ...s, arrowType: ct.id as any } : s));
                            }}
                            title={ct.label}
                            className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[9px] font-semibold border transition-all cursor-pointer
                              ${active ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'}`}
                          >
                            <span className="text-base leading-none">{ct.icon}</span>
                            {ct.label}
                          </button>
                        );
                      })}
                    </div>
                    {/* Arrowhead pickers */}
                    <p className="px-2.5 pt-0.5 pb-0.5 text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Start → End Head</p>
                    <div className="flex items-center gap-1 px-1.5 pb-2">
                      {['none', 'triangle', 'circle', 'diamond'].map((h) => {
                        const sel = strokes.find(s => s.id === contextMenu.strokeId);
                        const activeS = (sel?.arrowheadStart || 'none') === h;
                        return (
                          <button key={'s-'+h}
                            onClick={() => setStrokes(prev => prev.map(s => s.id === contextMenu.strokeId ? { ...s, arrowheadStart: h as any } : s))}
                            title={`Start: ${h}`}
                            className={`flex-1 py-1 rounded-md text-[9px] border text-center cursor-pointer transition-all
                              ${activeS ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800'}`}
                          >
                            {h === 'none' ? '—' : h === 'triangle' ? '◀' : h === 'circle' ? '●' : '◆'}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-1 px-1.5 pb-2">
                      {['none', 'triangle', 'circle', 'diamond'].map((h) => {
                        const sel = strokes.find(s => s.id === contextMenu.strokeId);
                        const activeE = (sel?.arrowheadEnd || (sel?.tool === 'arrow' ? 'triangle' : 'none')) === h;
                        return (
                          <button key={'e-'+h}
                            onClick={() => setStrokes(prev => prev.map(s => s.id === contextMenu.strokeId ? { ...s, arrowheadEnd: h as any } : s))}
                            title={`End: ${h}`}
                            className={`flex-1 py-1 rounded-md text-[9px] border text-center cursor-pointer transition-all
                              ${activeE ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800'}`}
                          >
                            {h === 'none' ? '—' : h === 'triangle' ? '▶' : h === 'circle' ? '●' : '◆'}
                          </button>
                        );
                      })}
                    </div>
                    <div className="h-px bg-zinc-800 my-0.5" />
                  </>
                )}

                <button
                  onClick={() => { handleCopyStrokes(); setContextMenu(null); }}
                  className="w-full text-start px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-zinc-300 transition-all cursor-pointer flex items-center justify-between text-xs font-medium"
                >
                  <div className="flex items-center gap-2"><Copy className="w-3.5 h-3.5 text-zinc-400" /><span>Copy</span></div>
                  <span className="text-[9px] text-zinc-600 font-mono">Ctrl+C</span>
                </button>
                <button
                  onClick={() => { handleCutStrokes(); setContextMenu(null); }}
                  className="w-full text-start px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-zinc-300 transition-all cursor-pointer flex items-center justify-between text-xs font-medium"
                >
                  <div className="flex items-center gap-2"><Clipboard className="w-3.5 h-3.5 text-zinc-400" /><span>Cut</span></div>
                  <span className="text-[9px] text-zinc-600 font-mono">Ctrl+X</span>
                </button>
                <button
                  onClick={() => { handleDuplicateStrokesDirect(); setContextMenu(null); }}
                  className="w-full text-start px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-zinc-300 transition-all cursor-pointer flex items-center justify-between text-xs font-medium"
                >
                  <div className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-zinc-400" /><span>Duplicate</span></div>
                  <span className="text-[9px] text-zinc-600 font-mono">Ctrl+D</span>
                </button>
                <div className="h-px bg-zinc-800 my-1" />
                <button
                  onClick={() => { handleDeleteSelected(); setContextMenu(null); }}
                  className="w-full text-start px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-all cursor-pointer flex items-center justify-between text-xs font-medium"
                >
                  <div className="flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /><span>Delete</span></div>
                  <span className="text-[9px] text-red-600 font-mono">Del</span>
                </button>
              </>
            )}

            {/* ── On empty canvas: insert shapes + utilities ── */}
            {!contextMenu.strokeId && (
              <>
                {/* Insert Shapes */}
                <p className="px-2.5 pt-1.5 pb-1 text-[9px] uppercase tracking-widest text-fuchsia-400 font-bold">Insert Shape</p>

                {/* Basic Shapes */}
                <p className="px-2.5 pb-0.5 text-[9px] text-zinc-600 font-semibold uppercase tracking-wider">Basic</p>
                <div className="grid grid-cols-4 gap-1 px-1.5 pb-2">
                  {[
                    { id: 'rect' as BoardStroke['tool'], label: 'Rect', svg: <rect x="3" y="4" width="18" height="16" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
                    { id: 'rounded-rect' as BoardStroke['tool'], label: 'Rounded', svg: <rect x="3" y="4" width="18" height="16" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
                    { id: 'circle' as BoardStroke['tool'], label: 'Circle', svg: <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
                    { id: 'ellipse' as BoardStroke['tool'], label: 'Ellipse', svg: <ellipse cx="12" cy="12" rx="9" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
                    { id: 'triangle' as BoardStroke['tool'], label: 'Triangle', svg: <polygon points="12,3 22,21 2,21" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
                    { id: 'diamond' as BoardStroke['tool'], label: 'Diamond', svg: <polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
                    { id: 'hexagon' as BoardStroke['tool'], label: 'Hexagon', svg: <polygon points="17.5,3.5 22,12 17.5,20.5 6.5,20.5 2,12 6.5,3.5" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
                    { id: 'sticky' as BoardStroke['tool'], label: 'Sticky', svg: <><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><line x1="3" y1="8" x2="21" y2="8" stroke="currentColor" strokeWidth="1"/></> },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => insertShapeAt(s.id, contextMenu.canvasX, contextMenu.canvasY)}
                      title={s.label}
                      className="flex flex-col items-center gap-1 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-700 hover:border-fuchsia-500/40 text-zinc-400 hover:text-fuchsia-300 transition-all cursor-pointer text-[9px] font-semibold"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5">{s.svg}</svg>
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Flowchart */}
                <p className="px-2.5 pb-0.5 text-[9px] text-zinc-600 font-semibold uppercase tracking-wider">Flowchart</p>
                <div className="grid grid-cols-4 gap-1 px-1.5 pb-2">
                  {[
                    { id: 'flow-process' as BoardStroke['tool'], label: 'Process', svg: <rect x="3" y="6" width="18" height="12" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
                    { id: 'flow-decision' as BoardStroke['tool'], label: 'Decision', svg: <polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
                    { id: 'flow-data' as BoardStroke['tool'], label: 'Data', svg: <polygon points="5,4 21,4 19,20 3,20" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
                    { id: 'flow-terminator' as BoardStroke['tool'], label: 'Terminal', svg: <rect x="3" y="7" width="18" height="10" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5"/> },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => insertShapeAt(s.id, contextMenu.canvasX, contextMenu.canvasY)}
                      title={s.label}
                      className="flex flex-col items-center gap-1 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-700 hover:border-fuchsia-500/40 text-zinc-400 hover:text-fuchsia-300 transition-all cursor-pointer text-[9px] font-semibold"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5">{s.svg}</svg>
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Diagram */}
                <p className="px-2.5 pb-0.5 text-[9px] text-zinc-600 font-semibold uppercase tracking-wider">Diagram</p>
                <div className="grid grid-cols-4 gap-1 px-1.5 pb-2">
                  {[
                    { id: 'diag-cloud' as BoardStroke['tool'], label: 'Cloud', svg: <><path d="M6.5 19a4.5 4.5 0 0 1 0-9 5 5 0 0 1 9.8-1 4.5 4.5 0 0 1-.3 9z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></> },
                    { id: 'diag-database' as BoardStroke['tool'], label: 'Database', svg: <><ellipse cx="12" cy="6" rx="8" ry="3" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M4 6v6c0 1.657 3.582 3 8 3s8-1.343 8-3V6" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M4 12v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6" fill="none" stroke="currentColor" strokeWidth="1.5"/></> },
                    { id: 'diag-cylinder' as BoardStroke['tool'], label: 'Cylinder', svg: <><ellipse cx="12" cy="5" rx="7" ry="2.5" fill="none" stroke="currentColor" strokeWidth="1.5"/><line x1="5" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="1.5"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="1.5"/><ellipse cx="12" cy="19" rx="7" ry="2.5" fill="none" stroke="currentColor" strokeWidth="1.5"/></> },
                    { id: 'diag-document' as BoardStroke['tool'], label: 'Document', svg: <><path d="M4,3 L20,3 L20,18 Q16,22 12,18 Q8,22 4,18 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></> },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => insertShapeAt(s.id, contextMenu.canvasX, contextMenu.canvasY)}
                      title={s.label}
                      className="flex flex-col items-center gap-1 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-700 hover:border-fuchsia-500/40 text-zinc-400 hover:text-fuchsia-300 transition-all cursor-pointer text-[9px] font-semibold"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5">{s.svg}</svg>
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Connectors */}
                <p className="px-2.5 pb-0.5 text-[9px] text-zinc-600 font-semibold uppercase tracking-wider">Lines & Connectors</p>
                <div className="grid grid-cols-3 gap-1 px-1.5 pb-2">
                  {[
                    { label: 'Line', tool: 'line' as BoardStroke['tool'], aType: 'straight' as any, hEnd: 'none' as any },
                    { label: 'Arrow', tool: 'line' as BoardStroke['tool'], aType: 'straight' as any, hEnd: 'triangle' as any },
                    { label: 'Curved', tool: 'line' as BoardStroke['tool'], aType: 'curved' as any, hEnd: 'triangle' as any },
                    { label: 'Elbow', tool: 'line' as BoardStroke['tool'], aType: 'elbow' as any, hEnd: 'triangle' as any },
                    { label: 'Ortho', tool: 'line' as BoardStroke['tool'], aType: 'orthogonal' as any, hEnd: 'triangle' as any },
                    { label: 'Multi-pt', tool: 'line' as BoardStroke['tool'], aType: 'curved-multi' as any, hEnd: 'triangle' as any },
                  ].map((c) => (
                    <button
                      key={c.label}
                      onClick={() => {
                        const cx = contextMenu.canvasX;
                        const cy = contextMenu.canvasY;
                        const newStroke: BoardStroke = {
                          id: Math.random().toString(36).slice(2),
                          tool: c.tool,
                          points: [{ x: cx - 60, y: cy }, { x: cx + 60, y: cy }],
                          color,
                          width: strokeWidth,
                          opacity,
                          arrowType: c.aType,
                          arrowheadStart: 'none',
                          arrowheadEnd: c.hEnd,
                        };
                        setUndoStack((p) => [...p, strokes]);
                        setRedoStack([]);
                        const next = [...strokes, newStroke];
                        setStrokes(next);
                        setSelectedStrokeIds([newStroke.id]);
                        setTool('select');
                        setContextMenu(null);
                        persistStrokes(next);
                      }}
                      className="flex items-center justify-center gap-1 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-700 hover:border-fuchsia-500/40 text-zinc-400 hover:text-fuchsia-300 transition-all cursor-pointer text-[9px] font-semibold"
                    >
                      <Minus className="w-3 h-3" /> {c.label}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-zinc-800 my-1" />

                <button
                  onClick={() => { handlePasteStrokes(contextMenu.x, contextMenu.y); setContextMenu(null); }}
                  disabled={copiedStrokes.length === 0}
                  className="w-full text-start px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-zinc-300 disabled:opacity-30 transition-all cursor-pointer flex items-center justify-between text-xs font-medium"
                >
                  <div className="flex items-center gap-2"><Clipboard className="w-3.5 h-3.5 text-zinc-400" /><span>Paste Here</span></div>
                  <span className="text-[9px] text-zinc-600 font-mono">Ctrl+V</span>
                </button>

                <button
                  onClick={() => { handleZoomReset(); setContextMenu(null); }}
                  className="w-full text-start px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white text-zinc-300 transition-all cursor-pointer flex items-center gap-2 text-xs font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-400" /><span>Reset Zoom</span>
                </button>

                <button
                  onClick={() => { handleClearAll(); setContextMenu(null); }}
                  className="w-full text-start px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-all cursor-pointer flex items-center gap-2 text-xs font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /><span>Clear Board</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
