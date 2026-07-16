import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import type { UsuarioPublico } from '../lib/types';
import './GoogleButton.css';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleAccounts {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (r: { credential: string }) => void }) => void;
      renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

let gsiLoading: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  if (!gsiLoading) {
    gsiLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gsiLoading = null;
        reject(new Error('gsi load failed'));
      };
      document.head.appendChild(script);
    });
  }
  return gsiLoading;
}

/**
 * Botão "Entrar com o Google" (Google Identity Services).
 * Com VITE_GOOGLE_CLIENT_ID configurado, renderiza o botão oficial do Google;
 * sem configuração, mostra um botão informativo que explica como ativar.
 */
export function GoogleButton() {
  const slotRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGsi()
      .then(() => {
        if (cancelled || !slotRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }) => {
            setSending(true);
            try {
              const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential }),
              });
              const body = (await res.json()) as { token?: string; usuario?: UsuarioPublico; error?: string };
              if (!res.ok || !body.token || !body.usuario) {
                throw new ApiError(body.error ?? 'Não foi possível entrar com o Google.', res.status);
              }
              signIn(body.token, body.usuario);
              toast('success', `Bem-vindo(a), ${body.usuario.nome.split(' ')[0]}!`);
              navigate(params.get('voltar') || '/', { replace: true });
            } catch (err) {
              toast('error', err instanceof ApiError ? err.message : 'Não foi possível entrar com o Google.');
              setSending(false);
            }
          },
        });
        window.google.accounts.id.renderButton(slotRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: slotRef.current.offsetWidth || 320,
          locale: 'pt-BR',
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="auth-divider" role="separator" aria-label="ou">
        <span>ou</span>
      </div>

      {CLIENT_ID && !failed ? (
        <div className="google-slot" aria-busy={sending}>
          <div ref={slotRef} />
          {sending && (
            <p className="field-help google-status" role="status">
              Entrando com o Google…
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-secondary google-fallback"
          onClick={() =>
            toast(
              'error',
              failed
                ? 'Não foi possível carregar o Google agora. Verifique a conexão e recarregue a página.'
                : 'Login com Google ainda não configurado: crie um OAuth Client ID no Google Cloud e defina VITE_GOOGLE_CLIENT_ID (veja o README).'
            )
          }
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.1 3.57-5.17 3.57-8.81z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.29v3.11A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.29a12 12 0 0 0 0 10.78l3.99-3.11z" />
            <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.61l3.99 3.11C6.22 6.88 8.87 4.77 12 4.77z" />
          </svg>
          Entrar com o Google
        </button>
      )}
    </>
  );
}
