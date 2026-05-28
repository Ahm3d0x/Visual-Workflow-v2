'use client';

import { useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from '@/components/nodes/nodeTypes';
import { ExternalLink, Eye, MessageSquare, User } from 'lucide-react';
import Link from 'next/link';

import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface NodeRecord {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  style?: Record<string, unknown>;
}

interface EdgeRecord {
  id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: string | null;
  target_handle: string | null;
  data: Record<string, unknown>;
}

interface SharedWorkflowViewerProps {
  workflow: {
    id: string;
    name: string;
    description: string | null;
    created_at?: string;
    updated_at?: string;
  };
  nodes: Node[];
  edges: Edge[];
  role: string;
  creatorName?: string | null;
}

function ViewerInner({
  workflow,
  nodes,
  edges,
  role,
  creatorName,
}: SharedWorkflowViewerProps) {
  const params = useParams();
  const locale = params?.locale || 'en';
  const supabase = createClient();

  const [localNodes, setLocalNodes] = useState<Node[]>(() => nodes);
  const [localEdges, setLocalEdges] = useState<Edge[]>(() => edges);

  // Sync props asynchronously if they change, avoiding synchronous React cascade warning
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setLocalNodes(nodes);
    });
    return () => cancelAnimationFrame(handle);
  }, [nodes]);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setLocalEdges(edges);
    });
    return () => cancelAnimationFrame(handle);
  }, [edges]);

  useEffect(() => {
    const activeChannel = supabase.channel(`workflow:${workflow.id}`);

    // Fetch latest data from database
    async function fetchLatestData() {
      try {
        const { data: nodeRecords } = await supabase
          .from('workflow_nodes')
          .select('id, type, position, data, style')
          .eq('workflow_id', workflow.id);
        if (nodeRecords) {
          const records = nodeRecords as unknown as NodeRecord[];
          setLocalNodes(records.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position || { x: 100, y: 100 },
            data: n.data || {},
            style: n.style || {},
          })));
        }

        const { data: edgeRecords } = await supabase
          .from('workflow_edges')
          .select('id, source_node_id, target_node_id, source_handle, target_handle, data')
          .eq('workflow_id', workflow.id);
        if (edgeRecords) {
          const records = edgeRecords as unknown as EdgeRecord[];
          setLocalEdges(records.map((e) => ({
            id: e.id,
            source: e.source_node_id,
            target: e.target_node_id,
            sourceHandle: e.source_handle,
            targetHandle: e.target_handle,
            data: e.data || {},
          })));
        }
      } catch (err) {
        console.error('Failed to pull latest shared data:', err);
      }
    }

    // 1. Listen to broadcast element changes
    activeChannel.on('broadcast', { event: 'node_change' }, ({ payload }) => {
      const { eventType, node, nodeId } = payload as {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        node?: Node;
        nodeId?: string;
      };

      if (eventType === 'INSERT' && node) {
        setLocalNodes((prev) => {
          if (prev.some((n) => n.id === node.id)) return prev;
          return [...prev, node];
        });
      } else if (eventType === 'UPDATE' && node) {
        setLocalNodes((prev) => prev.map((n) => (n.id === node.id ? node : n)));
      } else if (eventType === 'DELETE' && nodeId) {
        setLocalNodes((prev) => prev.filter((n) => n.id !== nodeId));
        setLocalEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
      } else if (eventType === 'UPDATE' && !node) {
        // Generic update
        fetchLatestData();
      }
    });

    activeChannel.on('broadcast', { event: 'edge_change' }, ({ payload }) => {
      const { eventType, edge, edgeId } = payload as {
        eventType: 'INSERT' | 'DELETE';
        edge?: Edge;
        edgeId?: string;
      };

      if (eventType === 'INSERT' && edge) {
        setLocalEdges((prev) => {
          if (prev.some((e) => e.id === edge.id)) return prev;
          return [...prev, edge];
        });
      } else if (eventType === 'DELETE' && edgeId) {
        setLocalEdges((prev) => prev.filter((e) => e.id !== edgeId));
      } else if (eventType === 'INSERT' && !edge) {
        // Generic update
        fetchLatestData();
      }
    });

    // 2. Listen to PostgreSQL changes on nodes and edges
    activeChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'workflow_nodes', filter: `workflow_id=eq.${workflow.id}` },
      () => {
        fetchLatestData();
      }
    );

    activeChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'workflow_edges', filter: `workflow_id=eq.${workflow.id}` },
      () => {
        fetchLatestData();
      }
    );

    activeChannel.subscribe();

    return () => {
      supabase.removeChannel(activeChannel);
    };
  }, [workflow.id, supabase]);


  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* ── Shared Header Banner ── */}
      <header className="h-14 border-b border-white/6 bg-zinc-950/80 backdrop-blur-md flex items-center gap-4 px-6 shrink-0 z-10">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-accent-foreground" />
          </div>
          <span className="text-sm font-bold text-zinc-300 hidden sm:block">Visual Workflow</span>
        </div>

        <div className="w-px h-5 bg-white/8 hidden sm:block" />

        {/* Workflow info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-zinc-100 truncate">{workflow.name}</h1>
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            {creatorName && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {creatorName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {localNodes.length} nodes
            </span>
            {role === 'commenter' && (
              <span className="flex items-center gap-1 text-sky-400">
                <MessageSquare className="w-3 h-3" />
                Commenter access
              </span>
            )}
          </div>
        </div>

        {/* Role badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
          role === 'commenter'
            ? 'bg-sky-400/10 border-sky-400/20 text-sky-400'
            : 'bg-zinc-800 border-white/8 text-zinc-400'
        }`}>
          {role === 'commenter' ? <MessageSquare className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {role === 'commenter' ? 'Commenter' : 'View Only'}
        </div>

        {/* CTA */}
        <Link
          href={`/${locale}/auth/sign-up`}
          className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl text-xs font-bold transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Sign up to edit
        </Link>
      </header>

      {/* ── Read-only Canvas ── */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={localNodes}
          edges={localEdges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
          minZoom={0.1}
          maxZoom={2}
          fitView={true}
          className="w-full h-full"
          deleteKeyCode={null}
        >
          <Background variant={BackgroundVariant.Dots} gap={15} size={1} className="text-zinc-800" />
          <Controls showInteractive={false} className="bg-zinc-900 border border-white/8 shadow-md rounded-xl p-1 [&_button]:cursor-pointer" />
          <MiniMap
            nodeStrokeWidth={2}
            zoomable
            pannable
            className="bg-zinc-900/90 border border-white/8 shadow-md rounded-xl overflow-hidden [&_.react-flow__minimap-node]:fill-zinc-700"
          />
        </ReactFlow>

        {/* View-only overlay watermark */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950/80 backdrop-blur-sm border border-white/6 rounded-full shadow-xl">
            <Eye className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-500 font-medium">Read-only view</span>
            <span className="text-zinc-700">·</span>
            <Link href={`/${locale}/auth/sign-up`} className="text-xs text-accent font-semibold hover:text-accent/80 pointer-events-auto transition-colors">
              Sign up to collaborate →
            </Link>
          </div>
        </div>
      </div>

      {/* Description footer (if exists) */}
      {workflow.description && (
        <div className="border-t border-white/6 bg-zinc-950/80 px-6 py-2.5 shrink-0">
          <p className="text-xs text-zinc-500 line-clamp-1">{workflow.description}</p>
        </div>
      )}
    </div>
  );
}

export function SharedWorkflowViewer(props: SharedWorkflowViewerProps) {
  return (
    <ReactFlowProvider>
      <ViewerInner {...props} />
    </ReactFlowProvider>
  );
}
