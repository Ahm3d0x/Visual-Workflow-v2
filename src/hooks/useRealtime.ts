'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useEditorStore, Collaborator } from '@/stores/editorStore';
import { type Node, type Edge } from '@xyflow/react';

const COLLABORATOR_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#06B6D4', // cyan
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
];

export function getCollaboratorColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
}

// 30fps Type-safe Throttle Helper
function throttle<Args extends unknown[]>(
  func: (...args: Args) => void,
  limit: number
): (...args: Args) => void {
  let inThrottle = false;
  return (...args: Args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

export function useRealtime(
  workflowId: string,
  userId: string,
  userInfo: { fullName: string; avatarUrl: string | null; role: string },
  onCommentReceived?: (comment: Record<string, unknown>) => void
) {
  const supabase = createClient();
  const setCollaborators = useEditorStore((s) => s.setCollaborators);
  const updateCollaboratorCursor = useEditorStore((s) => s.updateCollaboratorCursor);

  // Initialize Supabase realtime channel once on mount to avoid refs in render
  const [channel] = useState(() => supabase.channel(`workflow:${workflowId}`));

  // Throttled cursor broadcaster memoized to satisfy react hooks inline bounds
  const broadcastCursor = useMemo(() => {
    return throttle((x: number, y: number) => {
      if (channel.state === 'joined') {
        channel.send({
          type: 'broadcast',
          event: 'cursor',
          payload: { userId, x, y },
        });
      }
    }, 33);
  }, [channel, userId]);

  // Broadcast node changes
  const broadcastNodeChange = useCallback(
    (eventType: 'INSERT' | 'UPDATE' | 'DELETE', node?: Node, nodeId?: string) => {
      if (channel.state === 'joined') {
        channel.send({
          type: 'broadcast',
          event: 'node_change',
          payload: { eventType, node, nodeId },
        });
      }
    },
    [channel]
  );

  // Broadcast edge changes
  const broadcastEdgeChange = useCallback(
    (eventType: 'INSERT' | 'DELETE', edge?: Edge, edgeId?: string) => {
      if (channel.state === 'joined') {
        channel.send({
          type: 'broadcast',
          event: 'edge_change',
          payload: { eventType, edge, edgeId },
        });
      }
    },
    [channel]
  );

  useEffect(() => {
    // 1. Listen to active collaborators Presence Events
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const activeCollaborators: Record<string, Collaborator> = {};
        
        Object.keys(presenceState).forEach((key) => {
          const presenceList = presenceState[key];
          presenceList.forEach((presence: unknown) => {
            const typedPresence = presence as {
              userId: string;
              fullName: string;
              avatarUrl: string | null;
              color: string;
              role: string;
              x?: number;
              y?: number;
            };
            if (typedPresence.userId !== userId) {
              activeCollaborators[typedPresence.userId] = {
                userId: typedPresence.userId,
                fullName: typedPresence.fullName,
                avatarUrl: typedPresence.avatarUrl,
                color: typedPresence.color,
                role: typedPresence.role,
                x: typedPresence.x,
                y: typedPresence.y,
              };
            }
          });
        });
        
        setCollaborators(activeCollaborators);
      })
      .on('presence', { event: 'join' }, () => {})
      .on('presence', { event: 'leave' }, () => {});

    // 2. Listen to broadcast cursor events
    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      if (payload && payload.userId !== userId) {
        updateCollaboratorCursor(payload.userId, payload.x, payload.y);
      }
    });

    // 3. Listen to node change events from collaborators
    channel.on('broadcast', { event: 'node_change' }, ({ payload }) => {
      const { eventType, node, nodeId } = payload as {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        node?: Node;
        nodeId?: string;
      };

      const store = useEditorStore.getState();
      if (eventType === 'INSERT' && node) {
        // Prevent adding duplicates
        if (!store.nodes.some((n) => n.id === node.id)) {
          store.setNodes([...store.nodes, node]);
        }
      } else if (eventType === 'UPDATE' && node) {
        store.setNodes(store.nodes.map((n) => (n.id === node.id ? node : n)));
      } else if (eventType === 'DELETE' && nodeId) {
        store.setNodes(store.nodes.filter((n) => n.id !== nodeId));
        store.setEdges(store.edges.filter((e) => e.source !== nodeId && e.target !== nodeId));
      }
    });

    // 4. Listen to edge change events from collaborators
    channel.on('broadcast', { event: 'edge_change' }, ({ payload }) => {
      const { eventType, edge, edgeId } = payload as {
        eventType: 'INSERT' | 'DELETE';
        edge?: Edge;
        edgeId?: string;
      };

      const store = useEditorStore.getState();
      if (eventType === 'INSERT' && edge) {
        if (!store.edges.some((e) => e.id === edge.id)) {
          store.setEdges([...store.edges, edge]);
        }
      } else if (eventType === 'DELETE' && edgeId) {
        store.setEdges(store.edges.filter((e) => e.id !== edgeId));
      }
    });

    // 5. Postgres Changes for workflow comments
    channel.on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'workflow_comments', 
        filter: `workflow_id=eq.${workflowId}` 
      },
      (payload) => {
        if (payload.new && onCommentReceived) {
          onCommentReceived(payload.new as Record<string, unknown>);
        }
      }
    );

    // Subscribe to presence tracking session
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId,
          fullName: userInfo.fullName,
          avatarUrl: userInfo.avatarUrl,
          color: getCollaboratorColor(userId),
          role: userInfo.role,
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workflowId, userId, userInfo, setCollaborators, updateCollaboratorCursor, onCommentReceived, channel, supabase]);

  return {
    broadcastCursor,
    broadcastNodeChange,
    broadcastEdgeChange,
  };
}
