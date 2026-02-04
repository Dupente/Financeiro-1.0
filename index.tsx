import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#333', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#e11d48' }}>Ops! Algo deu errado.</h1>
          <p>A aplicação encontrou um erro inesperado.</p>
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f1f5f9', borderRadius: '0.5rem', textAlign: 'left', overflow: 'auto' }}>
            <p style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Erro Técnico:</p>
            <pre style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              {this.state.error?.toString()}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);