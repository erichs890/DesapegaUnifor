import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { animate } from 'animejs';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { prefersReducedMotion } from '../hooks/useReducedMotion';
import './UserMenu.css';

export function Avatar({ nome, url, size = 36 }: { nome: string; url: string | null; size?: number }) {
  const initials = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return url ? (
    <img className="avatar" src={url} alt="" width={size} height={size} style={{ width: size, height: size }} />
  ) : (
    <span className="avatar avatar-initials" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials}
    </span>
  );
}

/** Menu do usuário logado: abre com escala+fade da origem, fecha com Esc/clique fora. */
export function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    if (menu && !prefersReducedMotion()) {
      animate(menu, {
        opacity: [0, 1],
        scale: [0.92, 1],
        translateY: [-6, 0],
        duration: 200,
        ease: 'outCubic',
      });
    }
    // primeiro item recebe foco (navegação por teclado)
    menu?.querySelector<HTMLElement>('a, button')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab') {
        // trap leve: se o foco sair do menu, fecha
        requestAnimationFrame(() => {
          if (!rootRef.current?.contains(document.activeElement)) setOpen(false);
        });
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  if (!user) return null;

  const sair = () => {
    setOpen(false);
    signOut();
    toast('success', 'Você saiu da sua conta. Até logo!');
    navigate('/');
  };

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Menu de ${user.nome}`}
      >
        <Avatar nome={user.nome} url={user.avatar_url} />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={open ? 'flip' : ''}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="user-menu-panel" ref={menuRef} role="menu" aria-label="Conta">
          <div className="user-menu-header">
            <strong>{user.nome}</strong>
            <span>{user.email}</span>
          </div>
          <Link to="/perfil" role="menuitem" onClick={() => setOpen(false)}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="2" />
              <path d="M5 19.5c1.2-3 4-4.5 7-4.5s5.8 1.5 7 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Meu perfil
          </Link>
          <Link to="/meus" role="menuitem" onClick={() => setOpen(false)}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7.5L12 4l8 3.5v9L12 20l-8-3.5v-9z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M4 7.5L12 11l8-3.5M12 11v9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            Meus anúncios
          </Link>
          <button role="menuitem" className="user-menu-sair" onClick={sair}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M15 8l4 4-4 4M19 12H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
