import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserMenu } from './UserMenu';
import './Navbar.css';

export function Navbar() {
  const { pathname } = useLocation();
  const { status } = useAuth();

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo" aria-label="Desapego Universitário — início">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="9" fill="var(--color-primary)" />
            <path
              d="M10 18.5a6 6 0 0 1 10.4-4.1M22 13.5a6 6 0 0 1-10.4 4.1"
              stroke="#12CEE4"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path d="M20.5 9.5l1.8 3.8-4 .9M11.5 22.5l-1.8-3.8 4-.9" stroke="#12CEE4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>
            Desapego<em>Uni</em>
          </span>
        </Link>

        <nav className="navbar-links" aria-label="Navegação principal">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Início
          </NavLink>
          {status === 'authed' && (
            <NavLink to="/meus" className={({ isActive }) => (isActive ? 'active' : '')}>
              Meus anúncios
            </NavLink>
          )}
        </nav>

        <div className="navbar-actions">
          {pathname !== '/anunciar' && (
            <Link to="/anunciar" className="btn btn-primary navbar-cta">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Anunciar item
            </Link>
          )}
          {status === 'authed' ? (
            <UserMenu />
          ) : (
            status === 'anon' &&
            pathname !== '/entrar' && (
              <Link to="/entrar" className="btn btn-ghost navbar-entrar">
                Entrar
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
