'use client';

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { 
  Lock, Unlock, RotateCcw, Maximize, Trash2, MousePointerSquareDashed, FolderPlus,
  Play, GitBranch, Database, Mail, Sparkles, StopCircle, X,
  Copy, Clipboard, Settings, Layers
} from 'lucide-react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  SelectionMode,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

import { useEditorStore, EditorComment, PolarHandle } from '@/stores/editorStore';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { useDialogStore } from '@/stores/dialogStore';
import { createClient } from '@/lib/supabase/client';
import { EditorToolbar } from './EditorToolbar';
import { LibrarySidebar } from './LibrarySidebar';
import { PropertiesPanel } from './PropertiesPanel';
import { StatusPanel } from './StatusPanel';
import { nodeTypes } from '../nodes/nodeTypes';
import { playClickSound, playSnapSound, playPopSound, playSweepSound } from '@/lib/audioSfx';

// Phase 9 Collaborations and Permissions imports
import { useRealtime } from '@/hooks/useRealtime';
import { useEditorPermissions } from '@/hooks/useEditorPermissions';
import { CursorOverlay } from './CursorOverlay';
import { CommentsPanel } from './CommentsPanel';
// Phase 11 AI Assistant
import { AIAssistantPanel } from './AIAssistantPanel';
// Phase 12 Sharing
import { ShareDialog } from './ShareDialog';
import { useWindowSize } from '@/hooks/useWindowSize';
import { MobileEditorView } from './MobileEditorView';
import { ErrorBoundary } from './ErrorBoundary';

interface EditorClientProps {
  workflow: {
    id: string;
    workspace_id: string;
    name: string;
    description: string | null;
    status: 'draft' | 'active' | 'archived' | 'published';
  };
  initialNodes: Node[];
  initialEdges: Edge[];
  userRole: string;
  userId: string;
  locale: string;
  canShareLinks?: boolean;
}

function EditorInner({
  workflow,
  initialNodes,
  initialEdges,
  userRole,
  userId,
  locale,
  canShareLinks = false,
}: EditorClientProps) {
  const supabase = createClient();
  const { isMobile } = useWindowSize();
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    addNode,
    setSelectedNode,
    setSelectedEdge,
    pushToUndo,
    undo,
    redo,
    hasUnsavedChanges,
    setSaving,
    setLastSaved,
    setHasUnsavedChanges,
    deleteNode,
    deleteEdge,
    selectedNodeId,
    selectedEdgeId,
    setComments,
    addComment,
    pendingConnection,
    setPendingConnection,
    togglePanel,
    preferences,
    setUserRole,
    setWorkspaceId,
    setWorkflowId,
    setWorkflowName,
    setCanShareLinks,
  } = useEditorStore();

  // Dynamically map edge types and animations based on user settings
  const renderedEdges = useMemo(() => {
    return edges.map((e) => {
      // If the edge already has a custom type override, respect it unless it is default/unset
      const typeOverride = e.type && e.type !== 'default' ? e.type : (preferences?.orthogonalRouting ? 'smoothstep' : 'straight');
      return {
        ...e,
        type: typeOverride,
        animated: preferences?.animatedEdges ?? true,
        className: preferences?.animatedEdges ? 'premium-flow-edge' : '',
      };
    });
  }, [edges, preferences?.orthogonalRouting, preferences?.animatedEdges]);

  // Box Selection Mode and Grouping States
  const [selectionModeActive, setSelectionModeActive] = useState(false);

  // 1. Establish permission guards based on collaborator roles
  const permissions = useEditorPermissions(userRole);

  // Phase 12: Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Context Menu & Clipboard state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
    edgeId?: string;
  } | null>(null);
  const [nodeWheel, setNodeWheel] = useState<{
    x: number;
    y: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const [copiedElements, setCopiedElements] = useState<{
    nodes: Node[];
    edges: Edge[];
  } | null>(null);

  // Mouse tracker for keyboard paste shortcuts
  const mousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Prevent accidental tab close/refresh if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && permissions.canEdit) {
        e.preventDefault();
        e.returnValue = ''; // Standard browsers show their own confirmation dialog
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, permissions.canEdit]);

  const lastPastePosRef = useRef<{ x: number; y: number } | null>(null);
  const consecutivePasteCountRef = useRef<number>(0);

  // Quick Connect / Drag-to-Create States
  const [connectStartParams, setConnectStartParams] = useState<{
    nodeId: string;
    handleId: string;
    handleType: 'source' | 'target';
  } | null>(null);
  const [quickConnectOpen, setQuickConnectOpen] = useState(false);
  const [quickConnectPos, setQuickConnectPos] = useState<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  
  // Auto-save serialization queue locks
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);

  // Premium Canvas and Custom Styling controls
  const [canvasBg, setCanvasBg] = useState<'zinc' | 'blue' | 'forest' | 'midnight'>('zinc');
  const [canvasBgHex, setCanvasBgHex] = useState<string | null>(null);
  const [gridVariant, setGridVariant] = useState<'dots' | 'lines' | 'none'>('dots');

  const [userInfo, setUserInfo] = useState<{ fullName: string; avatarUrl: string | null; role: string } | null>(null);

  // Load user profile details for presence tracking
  useEffect(() => {
    let active = true;
    async function fetchProfile() {
      try {
        const { data: profile } = await (supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', userId)
          .single() as unknown as Promise<{ data: { full_name: string | null; avatar_url: string | null } | null }>);
        
        if (profile && active) {
          setUserInfo({
            fullName: profile.full_name || 'Collaborator',
            avatarUrl: profile.avatar_url,
            role: userRole,
          });
        }
      } catch (e) {
        console.error('Failed to fetch profile:', e);
      }
    }
    fetchProfile();
    return () => {
      active = false;
    };
  }, [userId, userRole, supabase]);

  // Sync workspace role & workflow metadata to global editor store
  useEffect(() => {
    setUserRole(userRole);
    setWorkspaceId(workflow.workspace_id);
    setWorkflowId(workflow.id);
    setWorkflowName(workflow.name);
    setCanShareLinks(canShareLinks);
  }, [userRole, workflow.workspace_id, workflow.id, workflow.name, canShareLinks, setUserRole, setWorkspaceId, setWorkflowId, setWorkflowName, setCanShareLinks]);

  // Sync and fetch all comments from Supabase on workflow mount
  useEffect(() => {
    let active = true;
    async function loadComments() {
      try {
        const { data: commentsData } = await (supabase
          .from('workflow_comments')
          .select('*, profiles:created_by (full_name, avatar_url, email)')
          .eq('workflow_id', workflow.id)
          .order('created_at', { ascending: true }) as unknown as Promise<{ data: EditorComment[] | null }>);
        if (commentsData && active) {
          setComments(commentsData);
        }
      } catch (e) {
        console.error('Failed to load comments:', e);
      }
    }
    loadComments();
    return () => {
      active = false;
    };
  }, [workflow.id, setComments, supabase]);

  // 2. Activate Supabase Realtime channel integrations
  const realtime = useRealtime(
    workflow.id,
    userId,
    userInfo || { fullName: 'Collaborator', avatarUrl: null, role: userRole },
    useCallback((newComment: Record<string, unknown>) => {
      addComment(newComment as unknown as EditorComment);
    }, [addComment])
  );

  // Canvas lock state
  const [canvasLocked, setCanvasLocked] = useState(false);
  const { fitView, zoomTo } = useReactFlow();

  const isEditable = permissions.canEdit && !canvasLocked;

  // Selection grouping handler
  const handleGroupSelectedNodes = useCallback(() => {
    if (!permissions.canEdit) return;
    const selectedNodes = getNodes().filter((n) => n.selected);
    if (selectedNodes.length < 2) {
      useDialogStore.getState().showNotification(
        locale === 'ar'
          ? 'يرجى تحديد عقدتين على الأقل للتجميع (اضغط Shift مع التحديد)'
          : 'Please select at least 2 nodes to group (hold Shift to select)',
        'info',
        3000
      );
      return;
    }

    // Determine the bounding box of selected child nodes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    selectedNodes.forEach((node) => {
      const pos = node.position;
      const w = node.measured?.width || 220; // safe default fallback
      const h = node.measured?.height || 85;  // safe default fallback
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + w);
      maxY = Math.max(maxY, pos.y + h);
    });

    if (minX === Infinity || minY === Infinity) return;

    // Fuchsia group dimensions with beautiful padding offset
    const padding = 45;
    const groupX = minX - padding;
    const groupY = minY - padding - 30; // Extra top room for fuchsia group name label header
    const groupW = (maxX - minX) + (padding * 2);
    const groupH = (maxY - minY) + (padding * 2) + 30;

    pushToUndo();

    const groupId = crypto.randomUUID();
    const groupNode: Node = {
      id: groupId,
      type: 'group',
      position: { x: groupX, y: groupY },
      data: {
        label: locale === 'ar' ? 'مجموعة جديدة' : 'New Group Selection',
        customStyle: {
          width: groupW,
          height: groupH,
        },
      },
    };

    // Transform child nodes positions relative to parent group coordinates
    const updatedNodes = nodes.map((node) => {
      if (node.selected && node.id !== groupId) {
        return {
          ...node,
          parentId: groupId,
          extent: 'parent' as const,
          position: {
            x: node.position.x - groupX,
            y: node.position.y - groupY,
          },
          selected: false,
        };
      }
      return node;
    });

    setNodes([groupNode, ...updatedNodes]);
    setHasUnsavedChanges(true);

    // Sync state over Supabase realtime socket
    realtime.broadcastNodeChange('INSERT', groupNode);
    updatedNodes.forEach((n) => {
      if (n.parentId === groupId) {
        realtime.broadcastNodeChange('UPDATE', n);
      }
    });

    useDialogStore.getState().showNotification(
      locale === 'ar' ? 'تم إنشاء المجموعة بنجاح' : 'Nodes successfully grouped',
      'success',
      2000
    );
    playClickSound();
  }, [getNodes, nodes, setNodes, pushToUndo, setHasUnsavedChanges, permissions.canEdit, realtime, locale]);

  const handleUngroupNode = useCallback((groupId: string) => {
    if (!permissions.canEdit) return;
    const groupNode = nodes.find((n) => n.id === groupId);
    if (!groupNode) return;

    pushToUndo();

    const groupX = groupNode.position.x;
    const groupY = groupNode.position.y;

    // Gather children and map their coordinates from relative parent coordinates back to absolute coordinates
    const updatedNodes = nodes
      .filter((n) => n.id !== groupId) // Remove parent group envelope
      .map((n) => {
        if (n.parentId === groupId) {
          const absoluteNode = {
            ...n,
            parentId: undefined,
            extent: undefined,
            position: {
              x: groupX + n.position.x,
              y: groupY + n.position.y,
            },
          };
          return absoluteNode;
        }
        return n;
      });

    setNodes(updatedNodes);
    setHasUnsavedChanges(true);

    // Broadcast deletions and updates
    realtime.broadcastNodeChange('DELETE', undefined, groupId);
    updatedNodes.forEach((n) => {
      if (n.parentId === undefined && nodes.find((orig) => orig.id === n.id)?.parentId === groupId) {
        realtime.broadcastNodeChange('UPDATE', n);
      }
    });

    useDialogStore.getState().showNotification(
      locale === 'ar' ? 'تم تفكيك المجموعة بنجاح' : 'Group successfully dissolved',
      'success',
      2000
    );
    playPopSound();
    setContextMenu(null);
  }, [nodes, setNodes, pushToUndo, setHasUnsavedChanges, permissions.canEdit, realtime, locale]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 500 });
  }, [fitView]);

  const handleResetZoom = useCallback(() => {
    zoomTo(1, { duration: 500 });
  }, [zoomTo]);

  const handleClearCanvas = useCallback(async () => {
    if (!permissions.canEdit) return;
    const title = locale === 'ar' ? 'مسح لوحة العمل' : 'Clear Canvas';
    const confirmClear = locale === 'ar' 
      ? 'هل أنت متأكد أنك تريد مسح جميع العقد والروابط من لوحة العمل بالكامل؟'
      : 'Are you sure you want to clear all nodes and edges from the canvas? This action cannot be undone.';
    const confirmed = await useDialogStore.getState().showConfirm(title, confirmClear, {
      confirmText: locale === 'ar' ? 'مسح الكل' : 'Clear All',
      cancelText: locale === 'ar' ? 'إلغاء' : 'Cancel'
    });
    if (!confirmed) return;
    
    setNodes([]);
    setEdges([]);
    setHasUnsavedChanges(true);
    realtime.broadcastNodeChange('UPDATE');
    playSweepSound();
  }, [setNodes, setEdges, setHasUnsavedChanges, permissions.canEdit, realtime, locale]);



  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setHasUnsavedChanges(false);
  }, [initialNodes, initialEdges, setNodes, setEdges, setHasUnsavedChanges]);

  // 4. Debounced save synchronization to Supabase
  const handleSaveToSupabase = useDebouncedCallback(async (nextName?: string) => {
    if (saveInFlightRef.current) {
      saveQueuedRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    setSaving(true);
    const workflowName = nextName || workflow.name;

    try {
      // Step A: Sync Nodes inside workflow
      const currentNodeIds = nodes.map((n) => n.id);
      if (currentNodeIds.length > 0) {
        await supabase
          .from('workflow_nodes')
          .delete()
          .eq('workflow_id', workflow.id)
          .not('id', 'in', `(${currentNodeIds.join(',')})`);
      } else {
        await supabase
          .from('workflow_nodes')
          .delete()
          .eq('workflow_id', workflow.id);
      }

      if (nodes.length > 0) {
        const nodesToUpsert = nodes.map((n) => ({
          id: n.id,
          workflow_id: workflow.id,
          type: n.type || 'default',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          position: n.position as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: (n.data || {}) as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style: (n.style || {}) as any,
          parent_id: n.parentId || null,
        }));
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('workflow_nodes') as any)
          .upsert(nodesToUpsert, { onConflict: 'id' });
      }

      // Step B: Sync Edges inside workflow
      const currentEdgeIds = edges.map((e) => e.id);
      if (currentEdgeIds.length > 0) {
        await supabase
          .from('workflow_edges')
          .delete()
          .eq('workflow_id', workflow.id)
          .not('id', 'in', `(${currentEdgeIds.join(',')})`);
      } else {
        await supabase
          .from('workflow_edges')
          .delete()
          .eq('workflow_id', workflow.id);
      }

      if (edges.length > 0) {
        const edgesToUpsert = edges.map((e) => ({
          id: e.id,
          workflow_id: workflow.id,
          source_node_id: e.source,
          target_node_id: e.target,
          source_handle: e.sourceHandle || null,
          target_handle: e.targetHandle || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: (e.data || {}) as any,
        }));
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('workflow_edges') as any)
          .upsert(edgesToUpsert, { onConflict: 'id' });
      }

      // Step C: Update workflow updated_at and name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('workflows') as any)
        .update({
          name: workflowName,
          node_count: nodes.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflow.id);

      setLastSaved(new Date());

      // Broadcast update event to all collaborators to pull new layout
      realtime.broadcastNodeChange('UPDATE');
      realtime.broadcastEdgeChange('INSERT');
    } catch (err: unknown) {
      console.error('Failed to auto-save workflow:', (err as Error).message);
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
      
      if (saveQueuedRef.current) {
        saveQueuedRef.current = false;
        // Trigger save immediately to process queued edits
        handleSaveToSupabase();
      }
    }
  }, 1500);

  // Trigger debounced save when changes occur (only for users with edit permissions)
  useEffect(() => {
    if (hasUnsavedChanges && permissions.canEdit) {
      handleSaveToSupabase();
    }
  }, [nodes, edges, hasUnsavedChanges, handleSaveToSupabase, permissions.canEdit]);

  // Immediate manual save action
  const handleManualSave = useCallback(async (nextName?: string) => {
    if (permissions.canEdit) {
      await handleSaveToSupabase(nextName);
    }
  }, [handleSaveToSupabase, permissions.canEdit]);

  // 5. Apply Dagre Auto-Layout positioning
  const handleApplyLayout = useCallback(
    (direction: 'TB' | 'LR') => {
      if (!permissions.canEdit) return;

      const g = new dagre.graphlib.Graph();
      g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 });
      g.setDefaultEdgeLabel(() => ({}));

      nodes.forEach((node) => {
        g.setNode(node.id, { width: 220, height: 90 });
      });

      edges.forEach((edge) => {
        g.setEdge(edge.source, edge.target);
      });

      dagre.layout(g);

      const layoutedNodes = nodes.map((node) => {
        const { x, y } = g.node(node.id);
        return {
          ...node,
          position: { x: x - 110, y: y - 45 },
        };
      });

      pushToUndo();
      setNodes(layoutedNodes);
      setHasUnsavedChanges(true);

      // Broadcast layout update immediately
      realtime.broadcastNodeChange('UPDATE');
    },
    [nodes, edges, setNodes, pushToUndo, setHasUnsavedChanges, permissions.canEdit, realtime]
  );

  // 6. HTML5 Drag and Drop Handlers
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!permissions.canEdit) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const customTemplateDataStr = event.dataTransfer.getData('application/custom-template-data');

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let newNode: Node | null = null;

      if (customTemplateDataStr) {
        try {
          const templateData = JSON.parse(customTemplateDataStr) as {
            name: string;
            description?: string;
            default_style?: Record<string, unknown>;
            handles?: Record<string, unknown>;
          };
          newNode = {
            id: crypto.randomUUID(),
            type: 'custom_template',
            position,
            data: {
              label: templateData.name,
              description: templateData.description || 'Custom element template.',
              customNode: true,
              customStyle: templateData.default_style || {},
              customHandles: templateData.handles || {},
            },
          };
        } catch (e) {
          console.error('Failed to parse custom template data', e);
        }
      } else {
        newNode = {
          id: crypto.randomUUID(),
          type,
          position,
          data: { 
            label: `${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}`,
            description: `Custom configured ${type} parameters.`,
          },
        };
      }

      if (newNode) {
        addNode(newNode);
        realtime.broadcastNodeChange('INSERT', newNode);
      }
    },
    [screenToFlowPosition, addNode, permissions.canEdit, realtime]
  );

  // Click-to-add accessibility fallback
  const handleAddNodeFromClick = useCallback(
    (type: string, templateData?: unknown) => {
      if (!permissions.canEdit) return;

      // Append to the center of the canvas viewport
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      let newNode: Node;

      if (templateData) {
        const tpl = templateData as {
          name: string;
          description?: string;
          default_style?: Record<string, unknown>;
          handles?: Record<string, unknown>;
        };
        newNode = {
          id: crypto.randomUUID(),
          type: 'custom_template',
          position,
          data: {
            label: tpl.name,
            description: tpl.description || 'Custom element template.',
            customNode: true,
            customStyle: tpl.default_style || {},
            customHandles: tpl.handles || {},
          },
        };
      } else {
        newNode = {
          id: crypto.randomUUID(),
          type,
          position,
          data: { 
            label: `${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}`,
            description: `Custom configured ${type} parameters.`,
          },
        };
      }

      addNode(newNode);
      realtime.broadcastNodeChange('INSERT', newNode);
    },
    [screenToFlowPosition, addNode, permissions.canEdit, realtime]
  );

  const onConnectStart = useCallback((_: unknown, params: { nodeId: string | null; handleId: string | null; handleType: 'source' | 'target' | null }) => {
    if (params.nodeId && params.handleId && params.handleType) {
      setConnectStartParams({
        nodeId: params.nodeId,
        handleId: params.handleId,
        handleType: params.handleType,
      });
    }
  }, []);

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    if (!connectStartParams || !permissions.canEdit) return;

    const target = event.target as Element;
    if (!target) return;

    // A. Drop on target node -> auto-connect
    const nodeElement = target.closest('.react-flow__node');
    const targetNodeId = nodeElement?.getAttribute('data-id');

    if (targetNodeId && targetNodeId !== connectStartParams.nodeId) {
      const targetNode = nodes.find((n) => n.id === targetNodeId);
      if (targetNode) {
        let connectionCreated = false;
        
        if (connectStartParams.handleType === 'source') {
          let targetHandleId = 'in';
          const polarHandles = targetNode.data?.polarHandles as PolarHandle[] | undefined;
          if (polarHandles && polarHandles.length > 0) {
            const firstTarget = polarHandles.find((h) => h.type === 'target');
            if (firstTarget) targetHandleId = firstTarget.id;
          }
          
          onConnect({
            source: connectStartParams.nodeId,
            sourceHandle: connectStartParams.handleId,
            target: targetNodeId,
            targetHandle: targetHandleId,
          });
          
          const newEdge = {
            id: crypto.randomUUID(),
            source: connectStartParams.nodeId,
            sourceHandle: connectStartParams.handleId,
            target: targetNodeId,
            targetHandle: targetHandleId,
          };
          realtime.broadcastEdgeChange('INSERT', newEdge as Edge);
          connectionCreated = true;
        } else {
          let sourceHandleId = 'out';
          const polarHandles = targetNode.data?.polarHandles as PolarHandle[] | undefined;
          if (polarHandles && polarHandles.length > 0) {
            const firstSource = polarHandles.find((h) => h.type === 'source');
            if (firstSource) sourceHandleId = firstSource.id;
          }
          
          onConnect({
            source: targetNodeId,
            sourceHandle: sourceHandleId,
            target: connectStartParams.nodeId,
            targetHandle: connectStartParams.handleId,
          });
          
          const newEdge = {
            id: crypto.randomUUID(),
            source: targetNodeId,
            sourceHandle: sourceHandleId,
            target: connectStartParams.nodeId,
            targetHandle: connectStartParams.handleId,
          };
          realtime.broadcastEdgeChange('INSERT', newEdge as Edge);
          connectionCreated = true;
        }

        if (connectionCreated) {
          setConnectStartParams(null);
          return;
        }
      }
    }

    // B. Drop on empty canvas pane -> quick connect picker
    const isPane = target.classList.contains('react-flow__pane') || target.closest('.react-flow__pane');

    if (isPane) {
      const clientX = 'clientX' in event ? event.clientX : event.changedTouches[0].clientX;
      const clientY = 'clientY' in event ? event.clientY : event.changedTouches[0].clientY;

      const position = screenToFlowPosition({
        x: clientX,
        y: clientY,
      });

      setQuickConnectPos({
        x: position.x,
        y: position.y,
        clientX,
        clientY,
      });
      setQuickConnectOpen(true);
    }
  }, [connectStartParams, nodes, onConnect, realtime, screenToFlowPosition, permissions.canEdit]);

  const handleCreateAndConnectNode = useCallback((type: string) => {
    if (!connectStartParams || !quickConnectPos || !permissions.canEdit) return;

    const newNodeId = crypto.randomUUID();
    const isAr = locale === 'ar';
    
    const CATALOG: Record<string, { label: string; desc: string }> = {
      start: { label: isAr ? 'مُشغّل البداية' : 'Start Trigger', desc: isAr ? 'نقطة البداية للمخطط' : 'Entry point of the workflow.' },
      decision: { label: isAr ? 'عقدة القرار' : 'Decision Split', desc: isAr ? 'تقسيم التدفق بناءً على شرط' : 'True/False condition split.' },
      api_request: { label: isAr ? 'طلب REST API' : 'REST API Request', desc: isAr ? 'تنفيذ استدعاءات HTTP خارجية' : 'Execute external GET/POST requests.' },
      email: { label: isAr ? 'إرسال بريد إلكتروني' : 'Send Email', desc: isAr ? 'إرسال إشعارات بريدية' : 'Send email notifications.' },
      ai_generate: { label: isAr ? 'توليد بالذكاء الاصطناعي' : 'AI Generate', desc: isAr ? 'توليد استجابات ذكية بالذكاء الاصطناعي' : 'Generate content via GPT models.' },
      end: { label: isAr ? 'خطوة النهاية' : 'End Step', desc: isAr ? 'إنهاء تدفق التنفيذ بأمان' : 'Safely terminate workflow execution.' },
    };

    const nodeInfo = CATALOG[type] || { label: type, desc: `Custom configured ${type} parameters.` };

    const newNode = {
      id: newNodeId,
      type,
      position: {
        x: quickConnectPos.x,
        y: quickConnectPos.y,
      },
      data: {
        label: nodeInfo.label,
        description: nodeInfo.desc,
      },
    };

    addNode(newNode);
    realtime.broadcastNodeChange('INSERT', newNode);

    if (connectStartParams.handleType === 'source') {
      const connection = {
        source: connectStartParams.nodeId,
        sourceHandle: connectStartParams.handleId,
        target: newNodeId,
        targetHandle: 'in',
      };
      onConnect(connection);
      
      const newEdge = {
        id: crypto.randomUUID(),
        ...connection,
      };
      realtime.broadcastEdgeChange('INSERT', newEdge as Edge);
      playSnapSound();
    } else {
      const connection = {
        source: newNodeId,
        sourceHandle: 'out',
        target: connectStartParams.nodeId,
        targetHandle: connectStartParams.handleId,
      };
      onConnect(connection);
      
      const newEdge = {
        id: crypto.randomUUID(),
        ...connection,
      };
      realtime.broadcastEdgeChange('INSERT', newEdge as Edge);
      playSnapSound();
    }

    setQuickConnectOpen(false);
    setConnectStartParams(null);
    setQuickConnectPos(null);
  }, [connectStartParams, quickConnectPos, locale, addNode, onConnect, realtime, permissions.canEdit]);

  // Cancel Quick Connect / Drag Connect picker on click outside
  useEffect(() => {
    if (!quickConnectOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target && !target.closest('.quick-connect-picker')) {
        setQuickConnectOpen(false);
        setConnectStartParams(null);
        setQuickConnectPos(null);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [quickConnectOpen]);

  // 7. Select canvas element listeners
  const onNodeClick = useCallback(
    (_: unknown, node: unknown) => {
      setSelectedNode((node as Node).id);
    },
    [setSelectedNode]
  );

  const onEdgeClick = useCallback(
    (_: unknown, edge: unknown) => {
      setSelectedEdge((edge as Edge).id);
    },
    [setSelectedEdge]
  );

  const onPaneClick = useCallback((e: React.MouseEvent) => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setContextMenu(null);
    setNodeWheel(null);

    // Double-click detection via event detail pointer
    if (e && e.detail === 2) {
      if (!preferences?.quickWheel) return;
      if (!permissions.canEdit) return;

      e.preventDefault();
      
      setNodeWheel({
        x: e.clientX,
        y: e.clientY,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }
  }, [setSelectedNode, setSelectedEdge, permissions.canEdit, preferences]);

  const handleQuickSpawnNode = useCallback(
    (type: string) => {
      if (!nodeWheel) return;
      
      pushToUndo();
      
      const position = screenToFlowPosition({
        x: nodeWheel.clientX,
        y: nodeWheel.clientY,
      });
      
      const nodeId = crypto.randomUUID();
      const nodeLabel = 
        type === 'process' ? (locale === 'ar' ? 'خطوة عملية' : 'Process Step') :
        type === 'decision' ? (locale === 'ar' ? 'تفرع قرار' : 'Decision Branch') :
        type === 'integration' ? (locale === 'ar' ? 'طلب API' : 'API Request') :
        (locale === 'ar' ? 'ملاحظة' : 'Note');

      const newNode: Node = {
        id: nodeId,
        type: type,
        position,
        data: {
          label: nodeLabel,
          description: '',
        },
      };

      addNode(newNode);
      realtime.broadcastNodeChange('INSERT', newNode);

      // Play Cherry MX click sound!
      playClickSound();

      setNodeWheel(null);
    },
    [nodeWheel, screenToFlowPosition, locale, addNode, realtime, pushToUndo]
  );

  const handleConnect = useCallback(
    (conn: any) => {
      onConnect(conn);
      setConnectStartParams(null);
      
      const newEdge = {
        id: crypto.randomUUID(),
        source: conn.source,
        target: conn.target,
        sourceHandle: conn.sourceHandle,
        targetHandle: conn.targetHandle,
      };
      realtime.broadcastEdgeChange('INSERT', newEdge as Edge);
      
      playSnapSound();
    },
    [onConnect, realtime]
  );

  // Context Menu Handlers
  const onNodeContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent, node: Node) => {
      e.preventDefault();
      if (!node.selected) {
        // If the right-clicked node is not part of the active selection, make it the sole selection
        setNodes(
          getNodes().map((n) => ({
            ...n,
            selected: n.id === node.id,
          }))
        );
        setSelectedNode(node.id);
        setSelectedEdge(null);
      }
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        nodeId: node.id,
      });
    },
    [setSelectedNode, setSelectedEdge, setNodes, getNodes]
  );

  const onEdgeContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent, edge: Edge) => {
      e.preventDefault();
      setSelectedEdge(edge.id);
      setSelectedNode(null);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        edgeId: edge.id,
      });
    },
    [setSelectedNode, setSelectedEdge]
  );

  const onPaneContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
      });
    },
    []
  );

  // Close context menu on left click anywhere on document
  useEffect(() => {
    if (!contextMenu) return;
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, [contextMenu]);

  // Fast Clipboard Actions
  const handleCopySelection = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    if (selectedNodes.length === 0) {
      if (contextMenu?.nodeId) {
        const targetNode = nodes.find((n) => n.id === contextMenu.nodeId);
        if (targetNode) {
          setCopiedElements({
            nodes: [JSON.parse(JSON.stringify(targetNode))],
            edges: [],
          });
          useDialogStore.getState().showNotification(
            locale === 'ar' ? 'تم نسخ العقدة إلى الحافظة' : 'Node copied to clipboard',
            'success',
            2000
          );
        }
      }
      setContextMenu(null);
      return;
    }

    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const connectingEdges = getEdges().filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
    );

    setCopiedElements({
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(connectingEdges)),
    });

    setContextMenu(null);
    useDialogStore.getState().showNotification(
      locale === 'ar' 
        ? `تم نسخ التحديد (${selectedNodes.length} عقدة و ${connectingEdges.length} رابط)` 
        : `Selection copied (${selectedNodes.length} nodes, ${connectingEdges.length} edges)`,
      'success',
      2000
    );
  }, [getNodes, getEdges, contextMenu, nodes, locale]);

  const performPasteSelection = useCallback((clientX: number, clientY: number) => {
    if (!copiedElements || copiedElements.nodes.length === 0 || !permissions.canEdit) return;
    pushToUndo();

    const flowPos = screenToFlowPosition({
      x: clientX,
      y: clientY,
    });

    // Smart Cascading Paste Offset: shift consecutive pastes by +30px to prevent direct overlaps
    const isSamePosition = lastPastePosRef.current &&
      lastPastePosRef.current.x === clientX &&
      lastPastePosRef.current.y === clientY;

    if (isSamePosition) {
      consecutivePasteCountRef.current += 1;
    } else {
      consecutivePasteCountRef.current = 0;
      lastPastePosRef.current = { x: clientX, y: clientY };
    }

    const cascadeOffset = consecutivePasteCountRef.current * 30;

    let minX = Infinity;
    let minY = Infinity;
    copiedElements.nodes.forEach((n) => {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
    });

    if (minX === Infinity || minY === Infinity) {
      minX = 0;
      minY = 0;
    }

    const oldToNewIdMap: Record<string, string> = {};
    const newNodes = copiedElements.nodes.map((n) => {
      const newId = crypto.randomUUID();
      oldToNewIdMap[n.id] = newId;

      const relX = n.position.x - minX;
      const relY = n.position.y - minY;

      return {
        ...n,
        id: newId,
        position: {
          x: flowPos.x + relX + cascadeOffset,
          y: flowPos.y + relY + cascadeOffset,
        },
        data: {
          ...n.data,
          label: n.data.label + (locale === 'ar' ? ' (نسخة)' : ' (Copy)'),
        },
        selected: true,
      };
    });

    const newEdges = copiedElements.edges
      .filter((e) => oldToNewIdMap[e.source] && oldToNewIdMap[e.target])
      .map((e) => ({
        ...e,
        id: crypto.randomUUID(),
        source: oldToNewIdMap[e.source],
        target: oldToNewIdMap[e.target],
        selected: true,
      }));

    const deselectedNodes = nodes.map((n) => ({ ...n, selected: false }));
    const deselectedEdges = edges.map((e) => ({ ...e, selected: false }));

    setNodes([...deselectedNodes, ...newNodes]);
    setEdges([...deselectedEdges, ...newEdges]);
    setHasUnsavedChanges(true);

    newNodes.forEach((node) => realtime.broadcastNodeChange('INSERT', node));
    newEdges.forEach((edge) => realtime.broadcastEdgeChange('INSERT', edge));

    useDialogStore.getState().showNotification(
      locale === 'ar' ? 'تم لصق التحديد' : 'Selection pasted',
      'success',
      1500
    );
    playClickSound();
  }, [copiedElements, nodes, edges, setNodes, setEdges, pushToUndo, setHasUnsavedChanges, screenToFlowPosition, permissions.canEdit, realtime, locale]);

  const handlePasteSelection = useCallback(() => {
    if (!contextMenu) return;
    performPasteSelection(contextMenu.x, contextMenu.y);
    setContextMenu(null);
  }, [contextMenu, performPasteSelection]);

  const handleDuplicateNodeDirect = useCallback((nodeId: string) => {
    if (!permissions.canEdit) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    pushToUndo();
    
    const clonedNode: Node = {
      ...node,
      id: crypto.randomUUID(),
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      selected: false,
    };

    setNodes([...nodes, clonedNode]);
    setHasUnsavedChanges(true);
    realtime.broadcastNodeChange('INSERT', clonedNode);
    setContextMenu(null);
  }, [nodes, setNodes, pushToUndo, setHasUnsavedChanges, permissions.canEdit, realtime]);

  const handleDeleteSelection = useCallback(() => {
    if (!permissions.canEdit) return;

    const selectedNodes = getNodes().filter((n) => n.selected);
    const selectedEdges = getEdges().filter((e) => e.selected);

    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      if (contextMenu?.nodeId) {
        pushToUndo();
        deleteNode(contextMenu.nodeId);
        realtime.broadcastNodeChange('DELETE', undefined, contextMenu.nodeId);
        setSelectedNode(null);
        playPopSound();
      } else if (contextMenu?.edgeId) {
        pushToUndo();
        deleteEdge(contextMenu.edgeId);
        realtime.broadcastEdgeChange('DELETE', undefined, contextMenu.edgeId);
        setSelectedEdge(null);
        playPopSound();
      }
      setContextMenu(null);
      return;
    }

    pushToUndo();
    
    selectedNodes.forEach((node) => {
      deleteNode(node.id);
      realtime.broadcastNodeChange('DELETE', undefined, node.id);
    });

    selectedEdges.forEach((edge) => {
      deleteEdge(edge.id);
      realtime.broadcastEdgeChange('DELETE', undefined, edge.id);
    });

    setSelectedNode(null);
    setSelectedEdge(null);
    setContextMenu(null);
    playPopSound();
    
    useDialogStore.getState().showNotification(
      locale === 'ar' ? 'تم حذف التحديد' : 'Selection deleted',
      'success',
      2000
    );
  }, [getNodes, getEdges, contextMenu, deleteNode, deleteEdge, permissions.canEdit, realtime, setSelectedNode, setSelectedEdge, locale, pushToUndo]);

  const handleDeleteEdgeDirect = useCallback((edgeId: string) => {
    if (!permissions.canEdit) return;
    pushToUndo();
    deleteEdge(edgeId);
    realtime.broadcastEdgeChange('DELETE', undefined, edgeId);
    setSelectedEdge(null);
    setContextMenu(null);
    playPopSound();
  }, [deleteEdge, realtime, permissions.canEdit, pushToUndo, setSelectedEdge]);

  // 8. Keyboard Shortcuts Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        document.activeElement?.tagName || ''
      ) || document.activeElement?.hasAttribute('contenteditable');
      if (isInputFocused) return;

      // Bypass shortcut interception if the whiteboard modal is open
      if (document.querySelector('.board-canvas-modal')) return;

      // Delete Selection (Delete or Backspace)
      if ((e.key === 'Delete' || e.key === 'Backspace') && isEditable) {
        const selectedNodes = getNodes().filter((n) => n.selected);
        const selectedEdges = getEdges().filter((e) => e.selected);

        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          pushToUndo();
          selectedNodes.forEach((node) => {
            deleteNode(node.id);
            realtime.broadcastNodeChange('DELETE', undefined, node.id);
          });
          selectedEdges.forEach((edge) => {
            deleteEdge(edge.id);
            realtime.broadcastEdgeChange('DELETE', undefined, edge.id);
          });
          setSelectedNode(null);
          setSelectedEdge(null);
        } else {
          // Fallback to active state
          if (selectedNodeId) {
            pushToUndo();
            deleteNode(selectedNodeId);
            realtime.broadcastNodeChange('DELETE', undefined, selectedNodeId);
            setSelectedNode(null);
          } else if (selectedEdgeId) {
            pushToUndo();
            deleteEdge(selectedEdgeId);
            realtime.broadcastEdgeChange('DELETE', undefined, selectedEdgeId);
            setSelectedEdge(null);
          }
        }
      }

      // Copy Selection (Ctrl + C)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        const selectedNodes = getNodes().filter((n) => n.selected);
        if (selectedNodes.length > 0) {
          const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
          const connectingEdges = getEdges().filter(
            (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
          );

          setCopiedElements({
            nodes: JSON.parse(JSON.stringify(selectedNodes)),
            edges: JSON.parse(JSON.stringify(connectingEdges)),
          });

          useDialogStore.getState().showNotification(
            locale === 'ar' 
              ? `تم نسخ التحديد (${selectedNodes.length} عقدة و ${connectingEdges.length} رابط)` 
              : `Selection copied (${selectedNodes.length} nodes, ${connectingEdges.length} edges)`,
            'success',
            2000
          );
        }
      }

      // Smart Grouping (Ctrl + G)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g' && isEditable) {
        e.preventDefault();
        handleGroupSelectedNodes();
      }

      // Paste Selection (Ctrl + V)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v' && isEditable) {
        e.preventDefault();
        performPasteSelection(mousePosRef.current.x, mousePosRef.current.y);
      }

      // Duplicate Selection (Ctrl + D)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && isEditable) {
        e.preventDefault();
        const selectedNodes = getNodes().filter((n) => n.selected);
        if (selectedNodes.length > 0) {
          pushToUndo();
          const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
          const connectingEdges = getEdges().filter(
            (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
          );

          const oldToNewIdMap: Record<string, string> = {};
          const duplicatedNodes = selectedNodes.map((n) => {
            const newId = crypto.randomUUID();
            oldToNewIdMap[n.id] = newId;
            return {
              ...n,
              id: newId,
              position: {
                x: n.position.x + 50,
                y: n.position.y + 50,
              },
              data: {
                ...n.data,
                label: n.data.label + (locale === 'ar' ? ' (نسخة)' : ' (Copy)'),
              },
              selected: true,
            };
          });

          const duplicatedEdges = connectingEdges
            .filter((e) => oldToNewIdMap[e.source] && oldToNewIdMap[e.target])
            .map((e) => ({
              ...e,
              id: crypto.randomUUID(),
              source: oldToNewIdMap[e.source],
              target: oldToNewIdMap[e.target],
              selected: true,
            }));

          const deselectedNodes = nodes.map((n) => ({ ...n, selected: false }));
          const deselectedEdges = edges.map((e) => ({ ...e, selected: false }));

          setNodes([...deselectedNodes, ...duplicatedNodes]);
          setEdges([...deselectedEdges, ...duplicatedEdges]);
          setHasUnsavedChanges(true);

          duplicatedNodes.forEach((node) => realtime.broadcastNodeChange('INSERT', node));
          duplicatedEdges.forEach((edge) => realtime.broadcastEdgeChange('INSERT', edge));
          
          useDialogStore.getState().showNotification(
            locale === 'ar' ? 'تم تكرار التحديد' : 'Selection duplicated',
            'success',
            1500
          );
        }
      }

      // Undo (Ctrl + Z)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && isEditable) {
        e.preventDefault();
        undo();
        realtime.broadcastNodeChange('UPDATE');
      }

      // Redo (Ctrl + Y or Ctrl + Shift + Z)
      if (
        (e.metaKey || e.ctrlKey) && 
        (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) && 
        isEditable
      ) {
        e.preventDefault();
        redo();
        realtime.broadcastNodeChange('UPDATE');
      }

      // Manual Save (Ctrl + S)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }

      // Deselect all (Escape)
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, selectedEdgeId, undo, redo, deleteNode, deleteEdge, setSelectedNode, setSelectedEdge, permissions.canEdit, handleManualSave, realtime, isEditable, getNodes, getEdges, pushToUndo, performPasteSelection, locale, nodes, edges, setNodes, setEdges, setHasUnsavedChanges, handleGroupSelectedNodes]);

  if (isMobile) {
    return (
      <MobileEditorView
        workflow={workflow}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        userRole={userRole}
        locale={locale}
      />
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden font-sans select-none animate-fadeIn">
      {/* Dynamic Header Toolbar */}
      <EditorToolbar
        workflowId={workflow.id}
        initialName={workflow.name}
        locale={locale}
        onApplyLayout={handleApplyLayout}
        onManualSave={handleManualSave}
        userRole={userRole}
        onShareClick={() => setShowShareDialog(true)}
      />

      {/* Main workspace layout */}
      <div 
        style={canvasBgHex ? { background: `radial-gradient(circle at center, ${canvasBgHex}22 0%, var(--background) 100%)` } : undefined}
        className={`flex-1 flex relative overflow-hidden transition-all duration-500 ${
          canvasBgHex ? '' : (
            canvasBg === 'zinc' ? 'bg-zinc-50 dark:bg-zinc-950' :
            canvasBg === 'blue' ? 'bg-zinc-50 dark:bg-zinc-950 bg-radial-[at_center_center] from-blue-200/20 dark:from-blue-950/20 via-zinc-50 dark:via-zinc-950 to-zinc-50 dark:to-zinc-950' :
            canvasBg === 'forest' ? 'bg-zinc-50 dark:bg-zinc-950 bg-radial-[at_center_center] from-emerald-200/20 dark:from-emerald-950/20 via-zinc-50 dark:via-zinc-950 to-zinc-50 dark:to-zinc-950' :
            'bg-zinc-50 dark:bg-zinc-950 bg-radial-[at_center_center] from-violet-200/20 dark:from-violet-950/20 via-zinc-50 dark:via-zinc-950 to-zinc-50 dark:to-zinc-950'
          )
        }`}
      >
        {/* Collapsible sidebar selectors */}
        <LibrarySidebar
          locale={locale}
          onAddNode={handleAddNodeFromClick}
          userRole={userRole}
          workspaceId={workflow.workspace_id}
        />

        {/* Canvas Visual Area */}
        <div 
          className="flex-1 h-full relative overflow-hidden"
          onDragOver={onDragOver}
          onDrop={onDrop}
          onMouseMove={(e) => {
            // Throttled cursor broadcast relative to canvas flow coordinates
            if (permissions.canEdit) {
              const flowPos = screenToFlowPosition({
                x: e.clientX,
                y: e.clientY,
              });
              realtime.broadcastCursor(flowPos.x, flowPos.y);
            }
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={renderedEdges}
            onNodesChange={permissions.canEdit ? onNodesChange : undefined}
            onEdgesChange={permissions.canEdit ? onEdgesChange : undefined}
            onNodeDrag={
              permissions.canEdit
                ? (event, node) => {
                    realtime.broadcastNodeChange('UPDATE', node);
                  }
                : undefined
            }
            onConnect={permissions.canEdit ? handleConnect : undefined}
            onConnectStart={permissions.canEdit ? onConnectStart : undefined}
            onConnectEnd={permissions.canEdit ? onConnectEnd : undefined}
            panOnDrag={!selectionModeActive}
            selectionOnDrag={selectionModeActive}
            panOnScroll={true}
            selectionMode={SelectionMode.Partial}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            nodeTypes={nodeTypes}
            snapToGrid={preferences?.gridSnapping}
            snapGrid={[15, 15]}
            minZoom={0.1}
            maxZoom={2.5}
            fitView={true}
            zoomOnDoubleClick={false}
            deleteKeyCode={null} // Handled via key listener above to avoid focus collision
            multiSelectionKeyCode="Shift"
            className="w-full h-full"
            nodesDraggable={isEditable}
            nodesConnectable={isEditable}
            elementsSelectable={isEditable}
          >
            {gridVariant !== 'none' && (
              <Background 
                variant={gridVariant === 'dots' ? BackgroundVariant.Dots : BackgroundVariant.Lines} 
                gap={15} 
                size={1} 
                className="text-zinc-300 dark:text-zinc-800 transition-colors duration-500" 
              />
            )}
            <Controls showInteractive={false} className="bg-background border border-border shadow-md rounded-xl p-1 [&_button]:cursor-pointer" />
            <MiniMap 
              nodeStrokeWidth={2} 
              zoomable 
              pannable 
              className="bg-background/95 border border-border shadow-md rounded-xl overflow-hidden [&_.react-flow__minimap-node]:fill-zinc-800" 
            />
          </ReactFlow>

          {/* Locked Canvas Warning Indicator Badge */}
          {canvasLocked && (
            <div className="absolute top-4 right-4 z-25 bg-rose-500/25 backdrop-blur-md text-rose-400 border border-rose-500/35 px-3 py-1.5 rounded-xl font-bold text-xs tracking-tight animate-bounce flex items-center gap-1.5 shadow-md">
              <Lock className="w-3.5 h-3.5" />
              <span>{locale === 'ar' ? 'وضع القراءة فقط (مغلق)' : 'Read-Only Mode (Locked)'}</span>
            </div>
          )}



          {/* Floating premium Canvas Actions Deck */}
          <div className="absolute bottom-6 left-6 z-25 flex items-center gap-2 bg-background/90 backdrop-blur-md border border-border shadow-lg rounded-2xl p-1.5 animate-fadeIn">
            {/* Lock/Unlock Canvas button */}
            <button
              onClick={() => setCanvasLocked(!canvasLocked)}
              className={`h-9 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all hover:scale-105 cursor-pointer border ${
                canvasLocked 
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                  : 'border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
              title={canvasLocked ? "Unlock Canvas" : "Lock Canvas"}
            >
              {canvasLocked ? <Lock className="w-4 h-4 text-rose-400" /> : <Unlock className="w-4 h-4" />}
              <span>{canvasLocked ? (locale === 'ar' ? 'مغلق' : 'Locked') : (locale === 'ar' ? 'قفل اللوحة' : 'Lock')}</span>
            </button>

            {/* Selection Mode toggle button */}
            <button
              onClick={() => setSelectionModeActive(!selectionModeActive)}
              className={`h-9 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all hover:scale-105 cursor-pointer border ${
                selectionModeActive 
                  ? 'bg-accent/20 text-accent border-accent/30' 
                  : 'border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
              title={selectionModeActive ? "Deselect / Normal Mode" : "Activate Box Selection Mode"}
            >
              <MousePointerSquareDashed className="w-4 h-4" />
              <span>{selectionModeActive ? (locale === 'ar' ? 'وضع التحديد نشط' : 'Selection Active') : (locale === 'ar' ? 'تحديد النطاق' : 'Box Selection')}</span>
            </button>

            {/* Group Selected Nodes button */}
            {permissions.canEdit && (
              <button
                onClick={handleGroupSelectedNodes}
                className="h-9 px-3 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-all hover:scale-105 border border-transparent"
                title="Group Selected Nodes"
              >
                <FolderPlus className="w-4 h-4" />
                <span>{locale === 'ar' ? 'تجميع المحدد' : 'Group Selected'}</span>
              </button>
            )}

            <div className="w-px h-5 bg-border" />



            {/* Fit View button */}
            <button
              onClick={handleFitView}
              className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-all hover:scale-105"
              title="Fit View"
            >
              <Maximize className="w-4 h-4" />
            </button>

            {/* Reset Zoom button */}
            <button
              onClick={handleResetZoom}
              className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-all hover:scale-105"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Clear Canvas button */}
            {permissions.canEdit && (
              <>
                <div className="w-px h-5 bg-border" />
                <button
                  onClick={handleClearCanvas}
                  className="h-9 w-9 rounded-xl bg-destructive/10 hover:bg-destructive hover:text-white text-destructive border border-destructive/20 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                  title="Clear Canvas"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* A. Click-to-Connect instructions banner */}
          {pendingConnection && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-background/85 backdrop-blur-md border border-primary/30 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 animate-bounce-subtle select-none font-sans max-w-sm md:max-w-md">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping shrink-0" />
              <p className="text-xs md:text-sm font-medium text-foreground flex-1 leading-normal">
                {locale === 'ar' 
                  ? 'وضع التوصيل السريع نشط. انقر على نقطة اتصال أخرى لتوصيلهما.' 
                  : 'Quick-connect mode active. Click another connection point to connect.'}
              </p>
              <button
                className="h-7 px-3 rounded-lg text-xs font-semibold cursor-pointer border border-border hover:bg-muted text-muted-foreground transition-all shrink-0 bg-background"
                onClick={() => setPendingConnection(null)}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          )}

          {/* B. Floating Quick Connect Picker context-menu dropdown */}
          {quickConnectOpen && quickConnectPos && (
            <div 
              style={{ 
                top: quickConnectPos.clientY, 
                left: quickConnectPos.clientX,
                transform: locale === 'ar' ? 'translateX(10%)' : 'translateX(-10%)'
              }}
              className="fixed z-50 w-64 bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-2 font-sans flex flex-col gap-0.5 animate-fadeIn quick-connect-picker"
            >
              <div className="px-2.5 py-1.5 border-b border-border/60 flex items-center justify-between select-none">
                <span className="text-xs font-bold text-muted-foreground tracking-tight">
                  {locale === 'ar' ? 'إنشاء وتوصيل' : 'Create & Connect'}
                </span>
                <button 
                  onClick={() => {
                    setQuickConnectOpen(false);
                    setConnectStartParams(null);
                    setQuickConnectPos(null);
                  }}
                  className="w-5 h-5 rounded-md hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="py-1 flex flex-col max-h-[280px] overflow-y-auto pr-0.5">
                {[
                  { type: 'start', labelEn: 'Start Trigger', labelAr: 'مُشغّل البداية', icon: Play, color: 'text-emerald-500 bg-emerald-500/10' },
                  { type: 'decision', labelEn: 'Decision / Split', labelAr: 'عقدة القرار (شرط)', icon: GitBranch, color: 'text-blue-500 bg-blue-500/10' },
                  { type: 'api_request', labelEn: 'REST API Request', labelAr: 'طلب REST API', icon: Database, color: 'text-purple-500 bg-purple-500/10' },
                  { type: 'email', labelEn: 'Send Email', labelAr: 'إرسال بريد إلكتروني', icon: Mail, color: 'text-amber-500 bg-amber-500/10' },
                  { type: 'ai_generate', labelEn: 'AI Content', labelAr: 'توليد بالذكاء الاصطناعي', icon: Sparkles, color: 'text-violet-500 bg-violet-500/10' },
                  { type: 'end', labelEn: 'End Step', labelAr: 'خطوة النهاية', icon: StopCircle, color: 'text-rose-500 bg-rose-500/10' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => handleCreateAndConnectNode(item.type)}
                      className="w-full text-start px-2.5 py-2 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer flex items-center gap-3 select-none text-xs font-semibold"
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-border/10 ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="truncate">{locale === 'ar' ? item.labelAr : item.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Real-time collaborators overlay mouse cursors layer */}
          <CursorOverlay />
        </div>

        {/* Collapsible right properties inspection drawer */}
        <PropertiesPanel
          locale={locale}
          userRole={userRole}
          workspaceId={workflow.workspace_id}
          workflowId={workflow.id}
          canvasBg={canvasBg}
          setCanvasBg={setCanvasBg}
          gridVariant={gridVariant}
          setGridVariant={setGridVariant}
          canvasBgHex={canvasBgHex}
          setCanvasBgHex={setCanvasBgHex}
        />

        {/* Collapsible slide-in Comments Panel thread drawer */}
        <CommentsPanel
          locale={locale}
          userRole={userRole}
          workspaceId={workflow.workspace_id}
          workflowId={workflow.id}
        />

        {/* Phase 11: AI Assistant sliding panel */}
        <AIAssistantPanel
          workflowId={workflow.id}
          workspaceId={workflow.workspace_id}
          locale={locale}
        />
      </div>

      {/* Footer statistics */}
      <StatusPanel locale={locale} />

      {/* Phase 12: Share Dialog */}
      {showShareDialog && (
        <ShareDialog
          locale={locale}
          workflowId={workflow.id}
          workspaceId={workflow.workspace_id}
          workflowName={workflow.name}
          userRole={userRole}
          canShareLinks={canShareLinks}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      {/* Floating Glassmorphic Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(contextMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 230),
            top: Math.min(contextMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 250),
            zIndex: 999,
          }}
          className="w-56 bg-zinc-950/90 border border-zinc-800/80 rounded-2xl shadow-2xl p-1.5 font-sans flex flex-col gap-0.5 animate-fadeIn backdrop-blur-md"
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {contextMenu.nodeId && (
            <>
              <button
                onClick={() => {
                  setSelectedNode(contextMenu.nodeId!);
                  if (!useEditorStore.getState().panels.properties) {
                    togglePanel('properties');
                  }
                  setContextMenu(null);
                }}
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-fuchsia-500/10 hover:text-fuchsia-400 text-zinc-300 transition-all cursor-pointer flex items-center justify-between text-xs font-semibold select-none group"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <span>{locale === 'ar' ? 'الخصائص' : 'Properties'}</span>
                </div>
              </button>

              {(() => {
                const node = nodes.find(n => n.id === contextMenu.nodeId);
                const isGroup = node?.type === 'group';
                const selectedCount = getNodes().filter(n => n.selected).length;

                return (
                  <>
                    {isGroup && (
                      <button
                        onClick={() => handleUngroupNode(contextMenu.nodeId!)}
                        className="w-full text-start px-3 py-2 rounded-xl hover:bg-fuchsia-500/10 hover:text-fuchsia-400 text-zinc-300 transition-all cursor-pointer flex items-center gap-2.5 text-xs font-semibold select-none"
                      >
                        <Unlock className="w-4 h-4 text-zinc-400" />
                        <span>{locale === 'ar' ? 'تفكيك المجموعة' : 'Ungroup Nodes'}</span>
                      </button>
                    )}
                    {selectedCount >= 2 && (
                      <button
                        onClick={() => {
                          handleGroupSelectedNodes();
                          setContextMenu(null);
                        }}
                        className="w-full text-start px-3 py-2 rounded-xl hover:bg-fuchsia-500/10 hover:text-fuchsia-400 text-zinc-300 transition-all cursor-pointer flex items-center justify-between text-xs font-semibold select-none group"
                      >
                        <div className="flex items-center gap-2.5">
                          <FolderPlus className="w-4 h-4 text-zinc-400" />
                          <span>{locale === 'ar' ? 'تجميع التحديد' : 'Group Selection'}</span>
                        </div>
                        <span className="text-[9px] text-zinc-500 font-mono bg-zinc-900/80 px-1.5 py-0.5 rounded-md border border-zinc-800 ml-auto shrink-0 font-medium tracking-tight group-hover:text-zinc-300 transition-colors">
                          Ctrl+G
                        </span>
                      </button>
                    )}
                  </>
                );
              })()}

              <button
                onClick={handleCopySelection}
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-fuchsia-500/10 hover:text-fuchsia-400 text-zinc-300 transition-all cursor-pointer flex items-center justify-between text-xs font-semibold select-none group"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-4 h-4 text-zinc-400" />
                  <span>
                    {getNodes().filter(n => n.selected).length > 1
                      ? (locale === 'ar' ? 'نسخ التحديد' : 'Copy Selection')
                      : (locale === 'ar' ? 'نسخ العقدة' : 'Copy Node')}
                  </span>
                </div>
                <span className="text-[9px] text-zinc-500 font-mono bg-zinc-900/80 px-1.5 py-0.5 rounded-md border border-zinc-800 ml-auto shrink-0 font-medium tracking-tight group-hover:text-zinc-300 transition-colors">
                  Ctrl+C
                </span>
              </button>

              <button
                onClick={() => {
                  const selectedNodes = getNodes().filter((n) => n.selected);
                  if (selectedNodes.length <= 1) {
                    handleDuplicateNodeDirect(contextMenu.nodeId!);
                    return;
                  }
                  
                  pushToUndo();
                  const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
                  const connectingEdges = getEdges().filter(
                    (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
                  );

                  const oldToNewIdMap: Record<string, string> = {};
                  const duplicatedNodes = selectedNodes.map((n) => {
                    const newId = crypto.randomUUID();
                    oldToNewIdMap[n.id] = newId;
                    return {
                      ...n,
                      id: newId,
                      position: {
                        x: n.position.x + 50,
                        y: n.position.y + 50,
                      },
                      data: {
                        ...n.data,
                        label: n.data.label + (locale === 'ar' ? ' (نسخة)' : ' (Copy)'),
                      },
                      selected: true,
                    };
                  });

                  const duplicatedEdges = connectingEdges
                    .filter((e) => oldToNewIdMap[e.source] && oldToNewIdMap[e.target])
                    .map((e) => ({
                      ...e,
                      id: crypto.randomUUID(),
                      source: oldToNewIdMap[e.source],
                      target: oldToNewIdMap[e.target],
                      selected: true,
                    }));

                  const deselectedNodes = nodes.map((n) => ({ ...n, selected: false }));
                  const deselectedEdges = edges.map((e) => ({ ...e, selected: false }));

                  setNodes([...deselectedNodes, ...duplicatedNodes]);
                  setEdges([...deselectedEdges, ...duplicatedEdges]);
                  setHasUnsavedChanges(true);

                  duplicatedNodes.forEach((node) => realtime.broadcastNodeChange('INSERT', node));
                  duplicatedEdges.forEach((edge) => realtime.broadcastEdgeChange('INSERT', edge));
                  setContextMenu(null);
                }}
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-fuchsia-500/10 hover:text-fuchsia-400 text-zinc-300 transition-all cursor-pointer flex items-center justify-between text-xs font-semibold select-none group"
                disabled={!permissions.canEdit}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-zinc-400" />
                  <span>
                    {getNodes().filter(n => n.selected).length > 1
                      ? (locale === 'ar' ? 'تكرار التحديد' : 'Duplicate Selection')
                      : (locale === 'ar' ? 'تكرار العقدة' : 'Duplicate Node')}
                  </span>
                </div>
                <span className="text-[9px] text-zinc-500 font-mono bg-zinc-900/80 px-1.5 py-0.5 rounded-md border border-zinc-800 ml-auto shrink-0 font-medium tracking-tight group-hover:text-zinc-300 transition-colors">
                  Ctrl+D
                </span>
              </button>

              <div className="h-px bg-zinc-800/80 my-1" />

              <button
                onClick={handleDeleteSelection}
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-400 transition-all cursor-pointer flex items-center justify-between text-xs font-semibold select-none group"
                disabled={!permissions.canEdit}
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 font-normal" />
                  <span>
                    {getNodes().filter(n => n.selected).length > 1
                      ? (locale === 'ar' ? 'حذف التحديد' : 'Delete Selection')
                      : (locale === 'ar' ? 'حذف العقدة' : 'Delete Node')}
                  </span>
                </div>
                <span className="text-[9px] text-red-500/50 font-mono bg-zinc-900/80 px-1.5 py-0.5 rounded-md border border-zinc-800 ml-auto shrink-0 font-medium tracking-tight group-hover:text-red-400 transition-colors">
                  Del
                </span>
              </button>
            </>
          )}

          {contextMenu.edgeId && (
            <button
              onClick={() => handleDeleteEdgeDirect(contextMenu.edgeId!)}
              className="w-full text-start px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-400 transition-all cursor-pointer flex items-center justify-between text-xs font-semibold select-none group"
              disabled={!permissions.canEdit}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 font-normal" />
                <span>{locale === 'ar' ? 'حذف الرابط' : 'Delete Edge'}</span>
              </div>
              <span className="text-[9px] text-red-500/50 font-mono bg-zinc-900/80 px-1.5 py-0.5 rounded-md border border-zinc-800 ml-auto shrink-0 font-medium tracking-tight group-hover:text-red-400 transition-colors">
                Del
              </span>
            </button>
          )}

          {!contextMenu.nodeId && !contextMenu.edgeId && (
            <>
              <button
                onClick={handlePasteSelection}
                disabled={!copiedElements || copiedElements.nodes.length === 0 || !permissions.canEdit}
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-fuchsia-500/10 hover:text-fuchsia-400 text-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-300 transition-all cursor-pointer flex items-center justify-between text-xs font-semibold select-none group"
              >
                <div className="flex items-center gap-2.5">
                  <Clipboard className="w-4 h-4 text-zinc-400" />
                  <span>{locale === 'ar' ? 'لصق هنا' : 'Paste Selection Here'}</span>
                </div>
                <span className="text-[9px] text-zinc-500 font-mono bg-zinc-900/80 px-1.5 py-0.5 rounded-md border border-zinc-800 ml-auto shrink-0 font-medium tracking-tight group-hover:text-zinc-300 transition-colors">
                  Ctrl+V
                </span>
              </button>

              <div className="h-px bg-zinc-800/80 my-1" />

              <button
                onClick={() => {
                  handleApplyLayout('TB');
                  setContextMenu(null);
                  playClickSound();
                }}
                disabled={!permissions.canEdit || nodes.length === 0}
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-fuchsia-500/10 hover:text-fuchsia-400 text-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-300 transition-all cursor-pointer flex items-center gap-2.5 text-xs font-semibold select-none"
              >
                <Sparkles className="w-4 h-4 text-zinc-400" />
                <span>{locale === 'ar' ? 'ترتيب وتنسيق اللوحة' : 'Beautify Layout'}</span>
              </button>

              <button
                onClick={() => {
                  fitView({ duration: 500 });
                  setContextMenu(null);
                }}
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-fuchsia-500/10 hover:text-fuchsia-400 text-zinc-300 transition-all cursor-pointer flex items-center gap-2.5 text-xs font-semibold select-none"
              >
                <Maximize className="w-4 h-4 text-zinc-400" />
                <span>{locale === 'ar' ? 'ملائمة الشاشة' : 'Fit View'}</span>
              </button>

              <button
                onClick={() => {
                  zoomTo(1, { duration: 500 });
                  setContextMenu(null);
                }}
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-fuchsia-500/10 hover:text-fuchsia-400 text-zinc-300 transition-all cursor-pointer flex items-center gap-2.5 text-xs font-semibold select-none"
              >
                <RotateCcw className="w-4 h-4 text-zinc-400" />
                <span>{locale === 'ar' ? 'إعادة تعيين التقريب' : 'Reset Zoom'}</span>
              </button>

              <button
                onClick={() => {
                  handleClearCanvas();
                  setContextMenu(null);
                }}
                disabled={!permissions.canEdit}
                className="w-full text-start px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-400 transition-all cursor-pointer flex items-center gap-2.5 text-xs font-semibold select-none"
              >
                <Trash2 className="w-4 h-4" />
                <span>{locale === 'ar' ? 'مسح لوحة العمل' : 'Clear Canvas'}</span>
              </button>
            </>
          )}
        </div>
      )}
      {nodeWheel && (
        <div
          style={{
            position: 'fixed',
            left: nodeWheel.x - 96,
            top: nodeWheel.y - 96,
            zIndex: 999,
          }}
          className="w-48 h-48 rounded-full border border-fuchsia-500/35 bg-zinc-950/95 shadow-[0_0_30px_rgba(217,70,239,0.15)] flex items-center justify-center relative select-none animate-scaleIn backdrop-blur-md"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Top quadrant: Process */}
          <button
            onClick={() => handleQuickSpawnNode('process')}
            title={locale === 'ar' ? 'خطوة عملية' : 'Spawn Process Step'}
            className="absolute top-1.5 left-1/2 -translate-x-1/2 w-11 h-11 rounded-xl flex flex-col items-center justify-center hover:bg-sky-500/20 text-sky-400 border border-sky-500/10 cursor-pointer transition-all hover:scale-105 active:scale-95 group"
          >
            <Play className="w-4.5 h-4.5 group-hover:animate-pulse animate-none" />
            <span className="text-[7px] font-bold text-zinc-400 mt-0.5">{locale === 'ar' ? 'عملية' : 'Process'}</span>
          </button>

          {/* Right quadrant: Decision */}
          <button
            onClick={() => handleQuickSpawnNode('decision')}
            title={locale === 'ar' ? 'تفرع قرار' : 'Spawn Decision Branch'}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex flex-col items-center justify-center hover:bg-amber-500/20 text-amber-400 border border-amber-500/10 cursor-pointer transition-all hover:scale-105 active:scale-95 group"
          >
            <GitBranch className="w-4.5 h-4.5 group-hover:rotate-12 transition-transform" />
            <span className="text-[7px] font-bold text-zinc-400 mt-0.5">{locale === 'ar' ? 'قرار' : 'Decision'}</span>
          </button>

          {/* Bottom quadrant: Integration */}
          <button
            onClick={() => handleQuickSpawnNode('integration')}
            title={locale === 'ar' ? 'طلب API' : 'Spawn API Request'}
            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-11 h-11 rounded-xl flex flex-col items-center justify-center hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 cursor-pointer transition-all hover:scale-105 active:scale-95 group"
          >
            <Database className="w-4.5 h-4.5 group-hover:animate-bounce" />
            <span className="text-[7px] font-bold text-zinc-400 mt-0.5">{locale === 'ar' ? 'ربط' : 'API'}</span>
          </button>

          {/* Left quadrant: Note */}
          <button
            onClick={() => handleQuickSpawnNode('note')}
            title={locale === 'ar' ? 'ملاحظة' : 'Spawn Note'}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex flex-col items-center justify-center hover:bg-purple-500/20 text-purple-400 border border-purple-500/10 cursor-pointer transition-all hover:scale-105 active:scale-95 group"
          >
            <Layers className="w-4.5 h-4.5 group-hover:skew-x-3 transition-transform" />
            <span className="text-[7px] font-bold text-zinc-400 mt-0.5">{locale === 'ar' ? 'ملاحظة' : 'Note'}</span>
          </button>

          {/* Center: Close */}
          <button
            onClick={() => setNodeWheel(null)}
            className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-red-500/25 hover:border-red-500/35 hover:text-red-400 text-zinc-500 cursor-pointer transition-all shadow-lg shadow-black/50"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function EditorClient(props: EditorClientProps) {
  return (
    <ReactFlowProvider>
      <ErrorBoundary
        fallbackTitle="Editor crashed"
        fallbackMessage="The workflow editor encountered an error. Click retry to recover."
      >
        <EditorInner {...props} />
      </ErrorBoundary>
    </ReactFlowProvider>
  );
}
