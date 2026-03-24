import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      
      try {
        // Check if it's a Firestore JSON error
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.operationType) {
          errorMessage = `Erro de permissão no banco de dados (${parsed.operationType} em ${parsed.path}). Por favor, contate o suporte.`;
        }
      } catch {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
          <div className="bg-stone-900 p-8 rounded-3xl border border-red-500/30 max-w-md text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Ops! Algo deu errado.</h2>
            <p className="text-stone-400 mb-6">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
