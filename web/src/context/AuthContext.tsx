import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { clearToken, getMe, getToken, setToken } from '../lib/api';
import type { UsuarioPublico } from '../lib/types';

type AuthStatus = 'loading' | 'authed' | 'anon';

interface AuthContextValue {
  user: UsuarioPublico | null;
  status: AuthStatus;
  /** Guarda o token e popula o usuário (chamado após login/registro). */
  signIn: (token: string, user: UsuarioPublico) => void;
  signOut: () => void;
  /** Re-busca /me (após editar perfil ou criar anúncio, p/ stats). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioPublico | null>(null);
  const [status, setStatus] = useState<AuthStatus>(getToken() ? 'loading' : 'anon');

  // Hidratação: valida o token guardado contra /me na primeira carga
  useEffect(() => {
    if (!getToken()) return;
    getMe()
      .then((r) => {
        setUser(r.usuario);
        setStatus('authed');
      })
      .catch(() => {
        clearToken(); // token expirado/inválido
        setStatus('anon');
      });
  }, []);

  const signIn = useCallback((token: string, usuario: UsuarioPublico) => {
    setToken(token);
    setUser(usuario);
    setStatus('authed');
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus('anon');
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const r = await getMe();
      setUser(r.usuario);
    } catch {
      // silencioso: mantém o estado atual se a rede falhar
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, signIn, signOut, refresh }),
    [user, status, signIn, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
