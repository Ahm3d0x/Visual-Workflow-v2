'use client';

import { useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type Node,
  type Edge,
} from '@xyflow/react';
import { useRouter } from '@/i18n/routing';
import { useEditorStore } from '@/stores/editorStore';
import { useEditorPermissions } from '@/hooks/useEditorPermissions';
import { nodeTypes } from '../nodes/nodeTypes';
import { ArrowLeft, MessageSquare, Info, Layers, Play, Calendar, Award } from 'lucide-react';
import { MobileBanner } from './MobileBanner';
import { NodeBottomSheet } from './NodeBottomSheet';
import { CommentsPanel } from './CommentsPanel';
import { getCollaboratorColor } from '@/hooks/useRealtime';
import { useDialogStore } from '@/stores/dialogStore';

interface MobileEditorViewProps {
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
}

export function MobileEditorView({
  workflow,
  initialNodes,
  initialEdges,
  userRole,
  locale,
}: Omit<MobileEditorViewProps, 'userId'>) {
  const router = useRouter();
  const isRtl = locale === 'ar';

  const handleBackConfirm = async () => {
    const title = isRtl ? 'مغادرة سير العمل؟' : 'Exit Workflow?';
    const message = isRtl
      ? 'هل أنت متأكد من رغبتك في مغادرة سير العمل والعودة إلى لوحة التحكم؟ قد تفقد أي تغييرات غير محفوظة.'
      : 'Are you sure you want to leave the workflow and return to the dashboard? Any unsaved changes may be lost.';
    const confirmText = isRtl ? 'نعم، مغادرة' : 'Yes, Leave';
    const cancelText = isRtl ? 'إلغاء' : 'Cancel';

    const confirmed = await useDialogStore.getState().showConfirm(title, message, {
      confirmText,
      cancelText
    });
    if (confirmed) {
      router.push('/dashboard');
    }
  };
  
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    selectedNodeId,
    setSelectedNode,
    collaborators,
  } = useEditorStore();

  const permissions = useEditorPermissions(userRole);
  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'info'>('overview');

  // Initialize nodes and edges on mount
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Find currently tapped node
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  // Collaborators array
  const collaboratorsList = Object.values(collaborators);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'archived': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'published': return 'bg-accent/10 text-accent border-accent/20';
      default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none">
      
      {/* 1. Mobile Premium Header Toolbar */}
      <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleBackConfirm}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors cursor-pointer focus:outline-hidden"
          >
            <ArrowLeft className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate tracking-tight">{workflow.name}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md uppercase tracking-wider border ${getStatusBadgeColor(workflow.status)}`}>
                {workflow.status}
              </span>
            </div>
          </div>
        </div>

        {/* Realtime multiplayer active avatars list */}
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5 items-center mr-1">
            {collaboratorsList.slice(0, 3).map((col) => {
              const initials = col.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '👤';
              return (
                <div
                  key={col.userId}
                  className="w-7 h-7 rounded-full text-[9px] font-bold text-white flex items-center justify-center border-2 border-zinc-950 shrink-0 select-none shadow-md"
                  style={{ backgroundColor: getCollaboratorColor(col.userId) }}
                  title={`${col.fullName} (${col.role})`}
                >
                  {initials}
                </div>
              );
            })}
            {collaboratorsList.length > 3 && (
              <div className="w-7 h-7 rounded-full text-[9px] font-bold text-zinc-400 bg-zinc-900 flex items-center justify-center border-2 border-zinc-950 shrink-0 shadow-md">
                +{collaboratorsList.length - 3}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Visual Canvas Area */}
      <div className="flex-1 min-h-[40vh] relative bg-zinc-950 overflow-hidden">
        {/* Editing optimization warning banner */}
        <MobileBanner />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_, node) => setSelectedNode(node.id)}
          onPaneClick={() => setSelectedNode(null)}
          nodeTypes={nodeTypes}
          minZoom={0.2}
          maxZoom={2.0}
          fitView={true}
          className="w-full h-full"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Background variant={BackgroundVariant.Dots} gap={15} size={1} className="text-zinc-800" />
          <Controls showInteractive={false} className="bg-zinc-900 border border-zinc-800 shadow-md rounded-xl p-1" />
        </ReactFlow>

        {/* Animated Node Sheet overlay */}
        {selectedNode && (
          <NodeBottomSheet
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onAddCommentClick={() => setActiveTab('comments')}
            canComment={permissions.canComment}
            locale={locale}
          />
        )}
      </div>

      {/* 3. Bottom Sliding Details tab menu */}
      <div className="h-64 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-xl flex flex-col z-10 shrink-0">
        
        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-zinc-900 h-12">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold font-sans transition-colors cursor-pointer focus:outline-hidden ${
              activeTab === 'overview' ? 'text-accent border-b-2 border-accent' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold font-sans transition-colors cursor-pointer focus:outline-hidden ${
              activeTab === 'comments' ? 'text-accent border-b-2 border-accent' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Comments</span>
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold font-sans transition-colors cursor-pointer focus:outline-hidden ${
              activeTab === 'info' ? 'text-accent border-b-2 border-accent' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Info</span>
          </button>
        </div>

        {/* Tab View Container */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar text-left">
          
          {/* A. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold font-sans tracking-tight">{workflow.name}</h3>
                  <p className="text-xs text-zinc-400 font-light mt-0.5 leading-relaxed">
                    {workflow.description || 'No description configured for this canvas workflow layout.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-900 flex items-center gap-2.5">
                  <Play className="w-4 h-4 text-accent" />
                  <div className="min-w-0">
                    <span className="text-[9px] text-zinc-500 block leading-none font-sans">Elements</span>
                    <span className="text-xs font-bold text-zinc-200 block mt-0.5 font-sans">{nodes.length} nodes</span>
                  </div>
                </div>
                <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-900 flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <div className="min-w-0">
                    <span className="text-[9px] text-zinc-500 block leading-none font-sans">Updated</span>
                    <span className="text-xs font-bold text-zinc-200 block mt-0.5 font-sans">
                      {new Date().toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. COMMENTS TAB (Realtime Commenting Feed) */}
          {activeTab === 'comments' && (
            <div className="h-full w-full flex flex-col overflow-hidden animate-in fade-in duration-200">
              <CommentsPanel
                locale={locale}
                userRole={userRole}
                workspaceId={workflow.workspace_id}
                workflowId={workflow.id}
                isInline={true}
              />
            </div>
          )}

          {/* C. INFO & BILLING LIMITS TAB */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-900 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                  <Award className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-100 font-sans">Active Collaborator Plan</h4>
                  <p className="text-[10px] text-zinc-400 font-light font-sans mt-0.5 leading-relaxed">
                    Accessing active Legend workspace resources. Full editing requires tablet or desktop configurations.
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 font-sans leading-relaxed text-center px-4 pt-1">
                Touch gestures allowed: Drag screen with single finger to pan. Two fingers pinch to zoom. Tap elements to review details.
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
