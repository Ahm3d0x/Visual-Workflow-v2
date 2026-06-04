'use client';

import { create } from 'zustand';
import { 
  type Node, 
  type Edge, 
  type OnNodesChange, 
  type OnEdgesChange, 
  type OnConnect,
  applyNodeChanges, 
  applyEdgeChanges, 
  addEdge 
} from '@xyflow/react';

export interface EditorPanels {
  library: boolean;
  properties: boolean;
  comments: boolean;
  history: boolean;
  aiAssistant: boolean;
}

export interface Collaborator {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  color: string;
  role: string;
  x?: number;
  y?: number;
}

export interface EditorComment {
  id: string;
  workflow_id: string;
  node_id: string | null;
  parent_id: string | null;
  body: string;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

export interface PolarHandle {
  id: string;
  label: string;
  type: 'target' | 'source';
  angle: number;
  color: string;
}

export interface EditorState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  panels: EditorPanels;
  isSaving: boolean;
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;
  undoStack: { nodes: Node[]; edges: Edge[] }[];
  redoStack: { nodes: Node[]; edges: Edge[] }[];
  
  // Real-time Collaborators
  collaborators: Record<string, Collaborator>;
  
  // Real-time Comments Thread
  comments: EditorComment[];

  // Simulation state
  activeSimNodeId: string | null;

  // Preferences settings
  preferences: {
    soundSfx: boolean;
    quickWheel: boolean;
    gridSnapping: boolean;
    animatedEdges: boolean;
    orthogonalRouting: boolean;
  };

  // Click-to-Connect Mode
  pendingConnection: { nodeId: string; handleId: string; handleType: 'source' | 'target' } | null;
  setPendingConnection: (conn: { nodeId: string; handleId: string; handleType: 'source' | 'target' } | null) => void;

  // React Flow Handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, nodeData: Record<string, unknown>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: Edge) => void;
  deleteEdge: (id: string) => void;
  updateEdge: (id: string, edgeData: Partial<Edge>) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  togglePanel: (panel: keyof EditorPanels) => void;
  pushToUndo: () => void;
  undo: () => void;
  redo: () => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: Date | null) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  clearHistory: () => void;
  setActiveSimNodeId: (id: string | null) => void;

  // Preferences Actions
  setPreference: (key: 'soundSfx' | 'quickWheel' | 'gridSnapping' | 'animatedEdges' | 'orthogonalRouting', value: boolean) => void;

  // Collaboration Actions
  setCollaborators: (collaborators: Record<string, Collaborator>) => void;
  updateCollaboratorCursor: (userId: string, x: number, y: number) => void;

  // Comments Actions
  setComments: (comments: EditorComment[]) => void;
  addComment: (comment: EditorComment) => void;
  updateComment: (id: string, updates: Partial<EditorComment>) => void;

  // User Role
  userRole: string | null;
  setUserRole: (role: string | null) => void;

  // Workflow sharing metadata
  workspaceId: string | null;
  setWorkspaceId: (id: string | null) => void;
  workflowId: string | null;
  setWorkflowId: (id: string | null) => void;
  workflowName: string | null;
  setWorkflowName: (name: string | null) => void;
  canShareLinks: boolean;
  setCanShareLinks: (canShare: boolean) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  panels: {
    library: true,
    properties: false,
    comments: false,
    history: false,
    aiAssistant: false,
  },
  isSaving: false,
  lastSavedAt: null,
  hasUnsavedChanges: false,
  undoStack: [],
  redoStack: [],
  collaborators: {},
  comments: [],
  activeSimNodeId: null,
  preferences: {
    soundSfx: true,
    quickWheel: true,
    gridSnapping: false,
    animatedEdges: true,
    orthogonalRouting: false,
  },
  pendingConnection: null,
  setPendingConnection: (pendingConnection) => set({ pendingConnection }),
  userRole: null,
  setUserRole: (userRole) => set({ userRole }),
  workspaceId: null,
  setWorkspaceId: (workspaceId) => set({ workspaceId }),
  workflowId: null,
  setWorkflowId: (workflowId) => set({ workflowId }),
  workflowName: null,
  setWorkflowName: (workflowName) => set({ workflowName }),
  canShareLinks: false,
  setCanShareLinks: (canShareLinks) => set({ canShareLinks }),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setActiveSimNodeId: (activeSimNodeId) => set({ activeSimNodeId }),
  setPreference: (key, value) => set((state) => ({
    preferences: {
      ...state.preferences,
      [key]: value,
    },
  })),

  onNodesChange: (changes) => {
    // Only push to undo on specific structural changes, not every micro-movement to prevent bloating the stack
    const structuralChange = changes.some(c => c.type === 'remove' || c.type === 'add');
    if (structuralChange) {
      get().pushToUndo();
    }

    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      hasUnsavedChanges: true,
    }));
  },

  onEdgesChange: (changes) => {
    const structuralChange = changes.some(c => c.type === 'remove');
    if (structuralChange) {
      get().pushToUndo();
    }

    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      hasUnsavedChanges: true,
    }));
  },

  onConnect: (connection) => {
    get().pushToUndo();
    set((state) => ({
      edges: addEdge({ ...connection, id: crypto.randomUUID() }, state.edges),
      hasUnsavedChanges: true,
    }));
  },

  pushToUndo: () => {
    const snapshot = {
      nodes: structuredClone(get().nodes),
      edges: structuredClone(get().edges),
    };
    const undoStack = [snapshot, ...get().undoStack].slice(0, 50);
    set({ undoStack, redoStack: [] });
  },

  addNode: (node) => {
    get().pushToUndo();
    set((state) => ({
      nodes: [...state.nodes, node],
      hasUnsavedChanges: true,
    }));
  },

  updateNode: (id, nodeData) => {
    get().pushToUndo();
    set((state) => {
      // 1. Update the node details
      const nextNodes = state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...nodeData } } : n
      );

      // 2. Automatically migrate or clean up edges when polar handles are configured or updated
      let nextEdges = state.edges;
      if ('polarHandles' in nodeData) {
        const polarHandles = nodeData.polarHandles as PolarHandle[] | undefined;
        const oldNode = state.nodes.find((n) => n.id === id);
        const oldPolarHandles = oldNode?.data?.polarHandles as PolarHandle[] | undefined;

        if (polarHandles && polarHandles.length > 0) {
          // Polar mode active
          if (!oldPolarHandles || oldPolarHandles.length === 0) {
            // TRANSITION A: Polar mode just enabled!
            // Migrate standard 'in'/'out' handles to the first polar handles.
            const firstTarget = polarHandles.find((h) => h.type === 'target');
            const firstSource = polarHandles.find((h) => h.type === 'source');

            nextEdges = state.edges.map((e) => {
              let updated = false;
              const newEdge = { ...e };

              if (e.target === id && e.targetHandle === 'in' && firstTarget) {
                newEdge.targetHandle = firstTarget.id;
                updated = true;
              }

              if (e.source === id && e.sourceHandle === 'out' && firstSource) {
                newEdge.sourceHandle = firstSource.id;
                updated = true;
              }

              return updated ? newEdge : e;
            });
          } else {
            // TRANSITION B: Polar handles list edited (modified/deleted/added)!
            // DO NOT automatically re-route edges. Instead, if a handle is deleted or its type changed,
            // simply DELETE (disconnect) the connected edge!
            nextEdges = state.edges.filter((e) => {
              // If the edge connects to this node as target, the targetHandle MUST exist and be a 'target'
              if (e.target === id) {
                const handle = polarHandles.find((h) => h.id === e.targetHandle);
                if (!handle || handle.type !== 'target') {
                  // Deleted or role changed -> disconnect edge!
                  return false;
                }
              }

              // If the edge connects to this node as source, the sourceHandle MUST exist and be a 'source'
              if (e.source === id) {
                const handle = polarHandles.find((h) => h.id === e.sourceHandle);
                if (!handle || handle.type !== 'source') {
                  // Deleted or role changed -> disconnect edge!
                  return false;
                }
              }

              return true;
            });
          }
        } else {
          // TRANSITION C: Polar mode disabled (Reset to Standard)!
          // Restore standard 'in' and 'out' handles.
          nextEdges = state.edges.map((e) => {
            let updated = false;
            const newEdge = { ...e };

            if (e.target === id && e.targetHandle && e.targetHandle.startsWith('in_')) {
              newEdge.targetHandle = 'in';
              updated = true;
            }

            if (e.source === id && e.sourceHandle && e.sourceHandle.startsWith('out_')) {
              newEdge.sourceHandle = 'out';
              updated = true;
            }

            return updated ? newEdge : e;
          });
        }
      }

      return {
        nodes: nextNodes,
        edges: nextEdges,
        hasUnsavedChanges: true,
      };
    });
  },

  deleteNode: (id) => {
    get().pushToUndo();
    set((state) => {
      const targetNode = state.nodes.find((n) => n.id === id);
      const isGroup = targetNode?.type === 'group';
      
      let nextNodes = state.nodes.filter((n) => n.id !== id);
      
      if (isGroup && targetNode) {
        nextNodes = nextNodes.map((n) => {
          if (n.parentId === id) {
            return {
              ...n,
              parentId: undefined,
              extent: undefined,
              position: {
                x: targetNode.position.x + n.position.x,
                y: targetNode.position.y + n.position.y,
              },
            };
          }
          return n;
        });
      }

      return {
        nodes: nextNodes,
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        hasUnsavedChanges: true,
      };
    });
  },

  updateEdge: (id, edgeData) => {
    get().pushToUndo();
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === id ? { ...e, ...edgeData } : e
      ),
      hasUnsavedChanges: true,
    }));
  },

  addEdge: (edge) => {
    get().pushToUndo();
    set((state) => ({
      edges: [...state.edges, edge],
      hasUnsavedChanges: true,
    }));
  },

  deleteEdge: (id) => {
    get().pushToUndo();
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
      hasUnsavedChanges: true,
    }));
  },

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  togglePanel: (panel) =>
    set((state) => ({
      panels: {
        ...state.panels,
        [panel]: !state.panels[panel],
      },
    })),

  undo: () => {
    const { undoStack, redoStack, nodes, edges } = get();
    if (undoStack.length === 0) return;

    const [prev, ...rest] = undoStack;
    const currentSnapshot = {
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    };

    set({
      nodes: prev.nodes,
      edges: prev.edges,
      undoStack: rest,
      redoStack: [currentSnapshot, ...redoStack],
      hasUnsavedChanges: true,
    });
  },

  redo: () => {
    const { redoStack, undoStack, nodes, edges } = get();
    if (redoStack.length === 0) return;

    const [next, ...rest] = redoStack;
    const currentSnapshot = {
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    };

    set({
      nodes: next.nodes,
      edges: next.edges,
      redoStack: rest,
      undoStack: [currentSnapshot, ...undoStack],
      hasUnsavedChanges: true,
    });
  },

  setSaving: (saving) => set({ isSaving: saving }),
  setLastSaved: (date) => set({ lastSavedAt: date, hasUnsavedChanges: false }),
  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),
  clearHistory: () => set({ undoStack: [], redoStack: [] }),

  setCollaborators: (collaborators) => set({ collaborators }),
  updateCollaboratorCursor: (userId, x, y) => set((state) => {
    const col = state.collaborators[userId];
    if (!col) return {};
    return {
      collaborators: {
        ...state.collaborators,
        [userId]: { ...col, x, y },
      },
    };
  }),

  setComments: (comments) => set({ comments }),
  addComment: (comment) => set((state) => {
    // Avoid duplicate insertions
    if (state.comments.some((c) => c.id === comment.id)) return {};
    return { comments: [...state.comments, comment] };
  }),
  updateComment: (id, updates) => set((state) => ({
    comments: state.comments.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  })),
}));
