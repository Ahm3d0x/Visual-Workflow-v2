'use client';

import { useCallback, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';
import { BoardCanvas } from '@/components/nodes/BoardCanvas';
import { ErrorBoundary } from '@/components/editor/ErrorBoundary';
import type { BoardStroke } from '@/components/nodes/BoardNode';

interface WhiteboardClientProps {
  whiteboardId: string;
  name: string;
  initialBoardData: {
    boardStrokes?: BoardStroke[];
    boardBg?: string;
    boardSheets?: unknown[];
    isSheetsMode?: boolean;
  };
  workspaceId: string;
}

export function WhiteboardClient({
  whiteboardId,
  name,
  initialBoardData,
  workspaceId,
}: WhiteboardClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const boardDataRef = useRef({
    boardStrokes: initialBoardData?.boardStrokes || [],
    boardBg: initialBoardData?.boardBg || '#ffffff',
    boardSheets: initialBoardData?.boardSheets || [],
    isSheetsMode: !!initialBoardData?.isSheetsMode,
  });

  const isSavingRef = useRef(false);
  const pendingSaveDataRef = useRef<typeof initialBoardData | null>(null);

  const handleSave = useCallback(
    async (updates: {
      boardStrokes?: BoardStroke[];
      boardBg?: string;
      boardSheets?: unknown[];
      isSheetsMode?: boolean;
    }) => {
      const merged = {
        ...boardDataRef.current,
        ...updates,
      };
      boardDataRef.current = merged;
      pendingSaveDataRef.current = merged;

      if (isSavingRef.current) {
        return;
      }

      isSavingRef.current = true;
      try {
        while (pendingSaveDataRef.current !== null) {
          const dataToSave = pendingSaveDataRef.current;
          pendingSaveDataRef.current = null;

          const { error } = await (supabase
            .from('workflows') as unknown as {
              update: (values: Record<string, unknown>) => {
                eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
              };
            })
            .update({
              board_data: dataToSave,
              updated_at: new Date().toISOString(),
            })
            .eq('id', whiteboardId);

          if (error) {
            console.error('Failed to save whiteboard data:', error.message);
          }
        }
      } finally {
        isSavingRef.current = false;
      }
    },
    [supabase, whiteboardId]
  );

  const handleClose = useCallback(() => {
    router.push(`/dashboard?w=${workspaceId}`);
  }, [router, workspaceId]);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden w-screen h-screen">
      <ErrorBoundary
        fallbackTitle="Whiteboard crashed"
        fallbackMessage="The whiteboard editor encountered an error. Please try reloading to recover your work."
      >
        <BoardCanvas
          nodeId={whiteboardId}
          label={name || 'Whiteboard'}
          initialStrokes={initialBoardData?.boardStrokes || []}
          initialBg={initialBoardData?.boardBg}
          initialSheets={initialBoardData?.boardSheets}
          initialIsSheetsMode={initialBoardData?.isSheetsMode}
          onClose={handleClose}
          onSave={handleSave}
          isStandalone={true}
        />
      </ErrorBoundary>
    </div>
  );
}
