import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { login, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { AuthBrandPanel, PasswordInput } from '../components/AuthShared';
import { GoogleButton } from '../components/GoogleButton';
import './Auth.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [touched, setTouched] = useState<{ email?: boolean; senha?: boolean }>({});
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const emailError = !email.trim()
    ? 'Informe seu email.'
    : !EMAIL_RE.test(email.trim())
      ? 'Esse email não parece válido.'
      : undefined;
  const senhaError = !senha ? 'Informe sua senha.' : undefined;
  const isValid = !emailError && !senhaError;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, senha: true });
    if (!isValid || sending) return;

    setSending(true);
    setFormError(null);
    try {
      const r = await login(email.trim(), senha);
      signIn(r.token, r.usuario);
      toast('success', `Bem-vindo(a) de volta, ${r.usuario.nome.split(' ')[0]}!`);
      navigate(params.get('voltar') || '/', { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.');
      setSending(false);
    }
  };

  return (
    <div className="auth">
      <AuthBrandPanel />
      <div className="auth-panel">
        <h1>Entrar</h1>
        <p>Bom te ver de novo. O campus sente falta dos seus desapegos.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {formError && (
            <p className="field-error" role="alert">
              {formError}
            </p>
          )}

          <div className="field">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="voce@edu.unifor.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              aria-invalid={touched.email && !!emailError}
              aria-describedby={touched.email && emailError ? 'erro-email' : undefined}
            />
            {touched.email && emailError && (
              <p className="field-error" id="erro-email" role="alert">
                {emailError}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="senha">Senha *</label>
            <PasswordInput
              id="senha"
              autoComplete="current-password"
              value={senha}
              onChange={setSenha}
              onBlur={() => setTouched((t) => ({ ...t, senha: true }))}
              invalid={touched.senha && !!senhaError}
              describedBy={touched.senha && senhaError ? 'erro-senha' : undefined}
            />
            {touched.senha && senhaError && (
              <p className="field-error" id="erro-senha" role="alert">
                {senhaError}
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={!isValid || sending}>
            {sending ? (
              <>
                <span className="spinner" aria-hidden="true" /> Entrando…
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <GoogleButton />

        <p className="auth-alt">
          Ainda não tem conta?{' '}
          <Link to={`/cadastro${params.get('voltar') ? `?voltar=${encodeURIComponent(params.get('voltar')!)}` : ''}`}>
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  );
}
