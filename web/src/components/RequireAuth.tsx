import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Protege rotas: anônimo é levado a /entrar com ?voltar= para retornar
 * exatamente aonde tentou ir após autenticar.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="container" style={{ paddingBlock: 'var(--space-16)', display: 'grid', gap: 'var(--space-3)' }} aria-busy="true" aria-label="Verificando sua sessão">
        <div className="skeleton" style={{ height: 40, width: '40%' }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (status === 'anon') {
    const voltar = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/entrar?voltar=${voltar}`} replace />;
  }

  return <>{children}</>;
}
