'use client';

import { useEffect, useCallback, useState } from 'react';
import { 
  Lock, Unlock, RotateCcw, Maximize, Trash2 
} from 'lucide-react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

import { useEditorStore, EditorComment } from '@/stores/editorStore';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { createClient } from '@/lib/supabase/client';
import { EditorToolbar } from './EditorToolbar';
import { LibrarySidebar } from './LibrarySidebar';
import { PropertiesPanel } from './PropertiesPanel';
import { StatusPanel } from './StatusPanel';
import { nodeTypes } from '../nodes/nodeTypes';

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
  const { screenToFlowPosition } = useReactFlow();

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
  } = useEditorStore();

  // 1. Establish permission guards based on collaborator roles
  const permissions = useEditorPermissions(userRole);

  // Phase 12: Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);

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

  const handleFitView = useCallback(() => {
    fitView({ duration: 500 });
  }, [fitView]);

  const handleResetZoom = useCallback(() => {
    zoomTo(1, { duration: 500 });
  }, [zoomTo]);

  const handleClearCanvas = useCallback(() => {
    if (!permissions.canEdit) return;
    const confirmClear = locale === 'ar' 
      ? 'هل أنت متأكد أنك تريد مسح جميع العقد والروابط من لوحة العمل بالكامل؟'
      : 'Are you sure you want to clear all nodes and edges from the canvas? This action cannot be undone.';
    if (!confirm(confirmClear)) return;
    
    setNodes([]);
    setEdges([]);
    setHasUnsavedChanges(true);
    realtime.broadcastNodeChange('UPDATE');
  }, [setNodes, setEdges, setHasUnsavedChanges, permissions.canEdit, realtime, locale]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setHasUnsavedChanges(false);
  }, [initialNodes, initialEdges, setNodes, setEdges, setHasUnsavedChanges]);

  // 4. Debounced save synchronization to Supabase
  const handleSaveToSupabase = useDebouncedCallback(async (nextName?: string) => {
    setSaving(true);
    const workflowName = nextName || workflow.name;

    try {
      // Step A: Sync Nodes inside workflow
      await (supabase.from('workflow_nodes') as unknown as {
        delete: () => { eq: (col: string, val: string) => Promise<unknown> };
      }).delete().eq('workflow_id', workflow.id);
      
      if (nodes.length > 0) {
        const nodesToInsert = nodes.map((n) => ({
          id: n.id,
          workflow_id: workflow.id,
          type: n.type,
          position: n.position,
          data: n.data || {},
          style: n.style || {},
        }));
        await (supabase.from('workflow_nodes') as unknown as {
          insert: (arg: unknown[]) => Promise<unknown>;
        }).insert(nodesToInsert);
      }

      // Step B: Sync Edges inside workflow
      await (supabase.from('workflow_edges') as unknown as {
        delete: () => { eq: (col: string, val: string) => Promise<unknown> };
      }).delete().eq('workflow_id', workflow.id);
      
      if (edges.length > 0) {
        const edgesToInsert = edges.map((e) => ({
          id: e.id,
          workflow_id: workflow.id,
          source_node_id: e.source,
          target_node_id: e.target,
          source_handle: e.sourceHandle || null,
          target_handle: e.targetHandle || null,
          data: e.data || {},
        }));
        await (supabase.from('workflow_edges') as unknown as {
          insert: (arg: unknown[]) => Promise<unknown>;
        }).insert(edgesToInsert);
      }

      // Step C: Update workflow updated_at and name
      await (supabase.from('workflows') as unknown as {
        update: (arg: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
      })
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
      setSaving(false);
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

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  // 8. Keyboard Shortcuts Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        document.activeElement?.tagName || ''
      );
      if (isInputFocused) return;

      // Delete Node / Edge
      if ((e.key === 'Delete' || e.key === 'Backspace') && isEditable) {
        if (selectedNodeId) {
          deleteNode(selectedNodeId);
          realtime.broadcastNodeChange('DELETE', undefined, selectedNodeId);
        } else if (selectedEdgeId) {
          deleteEdge(selectedEdgeId);
          realtime.broadcastEdgeChange('DELETE', undefined, selectedEdgeId);
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
  }, [selectedNodeId, selectedEdgeId, undo, redo, deleteNode, deleteEdge, setSelectedNode, setSelectedEdge, permissions.canEdit, handleManualSave, realtime, isEditable]);

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
        style={canvasBgHex ? { background: `radial-gradient(circle at center, ${canvasBgHex}22 0%, #09090b 100%)` } : undefined}
        className={`flex-1 flex relative overflow-hidden transition-all duration-500 ${
          canvasBgHex ? '' : (
            canvasBg === 'zinc' ? 'bg-zinc-950' :
            canvasBg === 'blue' ? 'bg-zinc-950 bg-radial-[at_center_center] from-blue-950/20 via-zinc-950 to-zinc-950' :
            canvasBg === 'forest' ? 'bg-zinc-950 bg-radial-[at_center_center] from-emerald-950/20 via-zinc-950 to-zinc-950' :
            'bg-zinc-950 bg-radial-[at_center_center] from-violet-950/20 via-zinc-950 to-zinc-950'
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
            edges={edges}
            onNodesChange={permissions.canEdit ? onNodesChange : undefined}
            onEdgesChange={permissions.canEdit ? onEdgesChange : undefined}
            onNodeDrag={
              permissions.canEdit
                ? (event, node) => {
                    realtime.broadcastNodeChange('UPDATE', node);
                  }
                : undefined
            }
            onConnect={
              permissions.canEdit 
                ? (conn) => {
                    onConnect(conn);
                    // Broadcast new edge creation immediately
                    const newEdge = {
                      id: crypto.randomUUID(),
                      source: conn.source,
                      target: conn.target,
                      sourceHandle: conn.sourceHandle,
                      targetHandle: conn.targetHandle,
                    };
                    realtime.broadcastEdgeChange('INSERT', newEdge as Edge);
                  }
                : undefined
            }
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            snapToGrid={true}
            snapGrid={[15, 15]}
            minZoom={0.1}
            maxZoom={2.5}
            fitView={true}
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
                className="text-zinc-800" 
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
    </div>
  );
}

export function EditorClient(props: EditorClientProps) {
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  );
}
