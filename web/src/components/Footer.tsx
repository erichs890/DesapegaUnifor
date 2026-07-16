import './Footer.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>
          <strong>DesapegoUni</strong> — Desafio Técnico Vortex · UNIFOR ·{' '}
          {new Date().getFullYear()}
        </p>
        <p className="footer-note">Feito por estudantes, para estudantes. ♻ Economia circular no campus.</p>
      </div>
    </footer>
  );
}
