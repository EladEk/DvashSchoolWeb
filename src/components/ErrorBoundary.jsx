import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { error: null, errorInfo: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState((prev) => ({ ...prev, errorInfo }))
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    const { error, errorInfo } = this.state
    const { children, fallback } = this.props

    if (error) {
      if (fallback && typeof fallback === 'function') {
        return fallback(error, errorInfo)
      }
      return (
        <div
          className="error-boundary"
          style={{
            padding: '2rem',
            maxWidth: '800px',
            margin: '2rem auto',
            fontFamily: 'system-ui, sans-serif',
            color: 'var(--text-color, #333)',
            backgroundColor: 'var(--bg-color, #fff)',
            border: '2px solid #c00',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <h1 style={{ color: '#c00', marginTop: 0 }}>שגיאה בדף</h1>
          <p style={{ fontWeight: 600 }}>{error?.message || String(error)}</p>
          {errorInfo?.componentStack && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer' }}>פרטי השגיאה</summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  overflow: 'auto',
                  fontSize: '12px',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              backgroundColor: 'var(--primary-color, #2563eb)',
              color: 'var(--text-on-primary, #fff)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
            }}
          >
            רענן את הדף
          </button>
        </div>
      )
    }

    return children
  }
}

export default ErrorBoundary
