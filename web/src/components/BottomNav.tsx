import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const items = [
  {
    to: '/',
    label: 'Explorar',
    end: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/anunciar',
    label: 'Anunciar',
    end: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5.5" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8.5v7M8.5 12h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/meus',
    label: 'Meus itens',
    end: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7.5L12 4l8 3.5v9L12 20l-8-3.5v-9z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M4 7.5L12 11l8-3.5M12 11v9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    ),
  },
];

/** Navegação inferior — só aparece em telas < 768px (experiência de app). */
export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegação do aplicativo">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
