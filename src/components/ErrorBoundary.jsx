import React from 'react';

/**
 * Error Boundary — catches render errors and shows them instead of a black screen.
 * Wrap any subtree to isolate crashes.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      const { error, info } = this.state;
      const name = this.props.name || 'Component';

      return (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: '#0f0f11', color: '#f0f0f5',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 32, fontFamily: 'monospace', zIndex: 9999,
          }}
        >
          <div style={{ maxWidth: 700, width: '100%' }}>
            {/* Header */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f04060' }}>
                  Render Error — {name}
                </div>
                <div style={{ fontSize: 12, color: '#9090a8', marginTop: 2 }}>
                  A component crashed. Details below.
                </div>
              </div>
            </div>

            {/* Error message */}
            <div style={{
              background: '#1a1a22', border: '1px solid #3a3a50', borderRadius: 8,
              padding: '12px 16px', marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, color: '#f0a030', marginBottom: 6 }}>ERROR MESSAGE</div>
              <div style={{ fontSize: 13, color: '#f04060', wordBreak: 'break-word' }}>
                {error?.message || String(error)}
              </div>
            </div>

            {/* Stack trace */}
            <div style={{
              background: '#1a1a22', border: '1px solid #3a3a50', borderRadius: 8,
              padding: '12px 16px', marginBottom: 12, maxHeight: 200, overflow: 'auto',
            }}>
              <div style={{ fontSize: 11, color: '#9090a8', marginBottom: 6 }}>STACK TRACE</div>
              <pre style={{ fontSize: 11, color: '#7b7b9a', margin: 0, whiteSpace: 'pre-wrap' }}>
                {error?.stack?.split('\n').slice(0, 15).join('\n')}
              </pre>
            </div>

            {/* Component stack */}
            {info?.componentStack && (
              <div style={{
                background: '#1a1a22', border: '1px solid #3a3a50', borderRadius: 8,
                padding: '12px 16px', marginBottom: 16, maxHeight: 150, overflow: 'auto',
              }}>
                <div style={{ fontSize: 11, color: '#9090a8', marginBottom: 6 }}>COMPONENT TREE</div>
                <pre style={{ fontSize: 11, color: '#7b7b9a', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {info.componentStack.trim().slice(0, 800)}
                </pre>
              </div>
            )}

            <button
              style={{
                background: '#7b68ee', color: 'white', border: 'none',
                borderRadius: 6, padding: '8px 20px', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
              }}
              onClick={() => this.setState({ hasError: false, error: null, info: null })}
            >
              Try to recover
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Convenience wrapper for functional components
 */
export function withErrorBoundary(Component, name) {
  return function BoundaryWrapper(props) {
    return (
      <ErrorBoundary name={name || Component.displayName || Component.name}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
