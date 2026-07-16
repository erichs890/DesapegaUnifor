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
        <Link to="/" className="navbar-logo" aria-label="DesapegaUnifor — início">
          <img src="/icons/logo.svg" alt="" width={30} height={30} aria-hidden="true" />
          <span>
            Desapega<em>Unifor</em>
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
            <Link to="/anunciar" className="btn btn-primary navbar-cta" aria-label="Anunciar item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <span className="navbar-cta-label">Anunciar item</span>
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
