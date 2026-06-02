'use client';

import React, { Component, type ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * A reusable Error Boundary that catches runtime errors in child components
 * and shows a recovery UI instead of crashing the entire page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'Something went wrong';
      const message =
        this.props.fallbackMessage ||
        'An unexpected error occurred. Click retry to recover.';

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            minHeight: 300,
            background: 'rgba(0,0,0,0.85)',
            borderRadius: 16,
            padding: 32,
            gap: 16,
            color: '#f4f4f5',
            textAlign: 'center',
          }}
        >
          <AlertTriangle size={48} color="#f97316" />
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{title}</h2>
          <p
            style={{
              fontSize: 14,
              color: '#a1a1aa',
              maxWidth: 400,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {message}
          </p>
          {this.state.error && (
            <pre
              style={{
                fontSize: 11,
                color: '#71717a',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                padding: '8px 16px',
                maxWidth: 500,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 100,
                margin: 0,
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleRetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 24px',
              borderRadius: 10,
              border: 'none',
              background: '#6366f1',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
              marginTop: 8,
            }}
            onMouseOver={(e) =>
              ((e.target as HTMLButtonElement).style.background = '#4f46e5')
            }
            onMouseOut={(e) =>
              ((e.target as HTMLButtonElement).style.background = '#6366f1')
            }
          >
            <RotateCcw size={16} />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
