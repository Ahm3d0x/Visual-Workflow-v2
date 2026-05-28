'use client';

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
              {nodes.length} nodes
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
          href="/sign-up"
          className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl text-xs font-bold transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Sign up to edit
        </Link>
      </header>

      {/* ── Read-only Canvas ── */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
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
            <Link href="/sign-up" className="text-xs text-accent font-semibold hover:text-accent/80 pointer-events-auto transition-colors">
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
