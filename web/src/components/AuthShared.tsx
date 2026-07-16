import { useState } from 'react';

/** Painel da marca reutilizado por /entrar e /cadastro (desktop). */
export function AuthBrandPanel() {
  return (
    <aside className="auth-brand" aria-hidden="true">
      <h2>Economia circular começa com um desapego.</h2>
      <ul>
        <li>
          <CheckIcon />
          <span>Doe ou venda materiais direto para outros estudantes, sem atravessador.</span>
        </li>
        <li>
          <CheckIcon />
          <span>Encontre livros, calculadoras e móveis por uma fração do preço.</span>
        </li>
        <li>
          <CheckIcon />
          <span>Cada item que circula é menos desperdício no campus.</span>
        </li>
      </ul>
    </aside>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete: 'current-password' | 'new-password';
  invalid?: boolean;
  describedBy?: string;
}

/** Input de senha com mostrar/ocultar acessível. */
export function PasswordInput({ id, value, onChange, onBlur, autoComplete, invalid, describedBy }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-affix">
      <input
        id={id}
        name={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        className="affix-btn"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
      >
        {visible ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 3l18 18M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5M7.4 7.5C5.2 8.8 3.6 10.8 3 12c1.5 3 5 6 9 6 1.6 0 3.1-.5 4.4-1.3M10 6.2A8.9 8.9 0 0 1 12 6c4 0 7.5 3 9 6-.4.8-1.1 1.9-2.1 2.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 12c1.5-3 5-6 9-6s7.5 3 9 6c-1.5 3-5 6-9 6s-7.5-3-9-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        )}
      </button>
    </div>
  );
}

/** Pontuação de força: 0-4 (comprimento, minúscula+maiúscula, número, símbolo). */
export function passwordScore(senha: string): number {
  if (!senha) return 0;
  let score = 0;
  if (senha.length >= 8) score++;
  if (senha.length >= 12) score++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) score++;
  if (/\d/.test(senha)) score++;
  if (/[^a-zA-Z0-9]/.test(senha)) score++;
  return Math.min(score, 4);
}

export const STRENGTH_LABELS = ['Muito fraca', 'Fraca', 'Razoável', 'Forte', 'Excelente'];
export const STRENGTH_COLORS = ['#FF5C77', '#FFB454', '#FFB454', '#12CEE4', '#6F4BEF'];
