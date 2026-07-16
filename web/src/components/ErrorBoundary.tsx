import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  hasError: boolean;
}

/** Última linha de defesa: erro de runtime não pode virar tela branca. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary capturou:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-4)',
            padding: 'var(--space-8)',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 'var(--text-xl)', color: 'var(--color-primary-strong)' }}>
            Algo quebrou por aqui
          </h1>
          <p style={{ color: 'var(--color-muted-foreground)', maxWidth: '34rem' }}>
            Um erro inesperado interrompeu a página. Recarregue para continuar — seu rascunho de
            anúncio fica salvo.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Recarregar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
