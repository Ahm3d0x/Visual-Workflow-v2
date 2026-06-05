'use client';

import { useEffect } from 'react';
import { recoverFromChunkLoadError } from '@/lib/chunkLoadRecovery';

/**
 * Global error boundary — last resort for any unhandled error
 * that escapes route-level error.tsx files.
 * Must include its own <html> and <body> tags.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError] Unhandled error:', error);
    recoverFromChunkLoadError(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100vw',
          height: '100vh',
          background: '#09090b',
          color: '#f4f4f5',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center',
          gap: 16,
          padding: 32,
        }}
      >
        <div
          style={{
            fontSize: 48,
            marginBottom: 8,
          }}
        >
          ⚠️
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          Something went wrong
        </h1>
        <p
          style={{
            fontSize: 14,
            color: '#a1a1aa',
            maxWidth: 400,
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          An unexpected error occurred. Click below to try again.
        </p>
        <button
          onClick={() => unstable_retry()}
          style={{
            marginTop: 12,
            padding: '10px 28px',
            borderRadius: 10,
            border: 'none',
            background: '#6366f1',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
