'use client';

import { useEffect } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { recoverFromChunkLoadError } from '@/lib/chunkLoadRecovery';

/**
 * Next.js route-level error boundary for the workflow editor.
 * Catches unhandled errors in the editor and shows a recovery UI
 * instead of redirecting to the dashboard.
 */
export default function WorkflowEditorError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[WorkflowEditor] Unhandled error:', error);
    recoverFromChunkLoadError(error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        background: '#09090b',
        padding: 32,
        gap: 20,
        color: '#f4f4f5',
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'rgba(249, 115, 22, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AlertTriangle size={40} color="#f97316" />
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
        Editor Crashed
      </h1>

      <p
        style={{
          fontSize: 15,
          color: '#a1a1aa',
          maxWidth: 480,
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        The workflow editor encountered an unexpected error. Your work has been
        auto-saved. Click the button below to reload the editor.
      </p>

      {error?.message && (
        <pre
          style={{
            fontSize: 11,
            color: '#71717a',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10,
            padding: '10px 20px',
            maxWidth: 560,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 80,
            margin: 0,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {error.message}
        </pre>
      )}

      <button
        onClick={() => unstable_retry()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 32px',
          borderRadius: 12,
          border: 'none',
          background: '#6366f1',
          color: '#ffffff',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.2s, transform 0.15s',
          marginTop: 8,
        }}
        onMouseOver={(e) => {
          (e.target as HTMLButtonElement).style.background = '#4f46e5';
          (e.target as HTMLButtonElement).style.transform = 'scale(1.03)';
        }}
        onMouseOut={(e) => {
          (e.target as HTMLButtonElement).style.background = '#6366f1';
          (e.target as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        <RotateCcw size={18} />
        Reload Editor
      </button>
    </div>
  );
}
