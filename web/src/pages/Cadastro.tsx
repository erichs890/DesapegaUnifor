import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { registro, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  AuthBrandPanel,
  PasswordInput,
  passwordScore,
  STRENGTH_COLORS,
  STRENGTH_LABELS,
} from '../components/AuthShared';
import { CAMPI } from '../lib/types';
import './Auth.css';

const EMAIL_UNIFOR_RE = /^[^\s@]+@edu\.unifor\.br$/i;
const MATRICULA_RE = /^\d{2}[12]\d{4}$/; // AA(ano) + S(semestre 1|2) + NNNN

interface Form {
  nome: string;
  email: string;
  matricula: string;
  senha: string;
  confirmar: string;
  curso: string;
  campus: string;
}

type Errors = Partial<Record<keyof Form, string>>;

function validate(f: Form): Errors {
  const errors: Errors = {};
  if (!f.nome.trim()) errors.nome = 'Informe seu nome.';
  else if (f.nome.trim().length < 2) errors.nome = 'O nome precisa de pelo menos 2 caracteres.';

  if (!f.email.trim()) errors.email = 'Informe seu email institucional.';
  else if (!EMAIL_UNIFOR_RE.test(f.email.trim())) errors.email = 'Use o seu email institucional da UNIFOR (nome@edu.unifor.br).';

  if (!f.matricula) errors.matricula = 'Informe sua matrícula.';
  else if (!MATRICULA_RE.test(f.matricula)) errors.matricula = 'Matrícula inválida: são 7 números — ano de ingresso (2 dígitos), semestre (1 ou 2) e mais 4 números. Ex: 2420145.';

  if (!f.senha) errors.senha = 'Crie uma senha.';
  else if (f.senha.length < 8) errors.senha = 'A senha precisa de pelo menos 8 caracteres.';

  if (!f.confirmar) errors.confirmar = 'Repita a senha.';
  else if (f.confirmar !== f.senha) errors.confirmar = 'As senhas não coincidem — confira as duas.';

  return errors;
}

export default function Cadastro() {
  const [form, setForm] = useState<Form>({ nome: '', email: '', matricula: '', senha: '', confirmar: '', curso: '', campus: '' });
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const [sending, setSending] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const errors = validate(form);
  const isValid = Object.keys(errors).length === 0;
  const show = (field: keyof Form) => (touched[field] ? (errors[field] ?? serverErrors[field]) : undefined);

  const set = <K extends keyof Form>(field: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [field]: value }));
    setServerErrors((s) => ({ ...s, [field]: '' }));
  };
  const blur = (field: keyof Form) => setTouched((t) => ({ ...t, [field]: true }));

  const score = passwordScore(form.senha);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ nome: true, email: true, matricula: true, senha: true, confirmar: true });
    if (!isValid || sending) return;

    setSending(true);
    try {
      const r = await registro({
        nome: form.nome.trim(),
        email: form.email.trim(),
        senha: form.senha,
        matricula: form.matricula,
        curso: form.curso.trim() || undefined,
        campus: form.campus || undefined,
      });
      signIn(r.token, r.usuario);
      toast('success', `Conta criada! Bem-vindo(a), ${r.usuario.nome.split(' ')[0]}.`);
      navigate(params.get('voltar') || '/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setServerErrors(err.fields);
        setTouched({ nome: true, email: true, matricula: true, senha: true, confirmar: true });
      } else {
        toast('error', err instanceof ApiError ? err.message : 'Não foi possível criar a conta.');
      }
      setSending(false);
    }
  };

  return (
    <div className="auth">
      <AuthBrandPanel />
      <div className="auth-panel">
        <h1>Criar conta</h1>
        <p>Leva 30 segundos — e seu primeiro desapego pode sair hoje.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="nome">Nome *</label>
            <input
              id="nome"
              name="nome"
              type="text"
              autoComplete="name"
              placeholder="Como você quer ser chamado(a)"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
              onBlur={() => blur('nome')}
              aria-invalid={!!show('nome')}
              aria-describedby={show('nome') ? 'erro-nome' : undefined}
            />
            {show('nome') && (
              <p className="field-error" id="erro-nome" role="alert">
                {show('nome')}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="voce@edu.unifor.br"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              onBlur={() => blur('email')}
              aria-invalid={!!show('email')}
              aria-describedby={show('email') ? 'erro-email' : undefined}
            />
            {show('email') && (
              <p className="field-error" id="erro-email" role="alert">
                {show('email')}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="matricula">Matrícula *</label>
            <input
              id="matricula"
              name="matricula"
              type="text"
              inputMode="numeric"
              maxLength={7}
              placeholder="Ex: 2420145 (ano + semestre + nº)"
              value={form.matricula}
              onChange={(e) => set('matricula', e.target.value.replace(/\D/g, '').slice(0, 7))}
              onBlur={() => blur('matricula')}
              aria-invalid={!!show('matricula')}
              aria-describedby={show('matricula') ? 'erro-matricula' : undefined}
            />
            {show('matricula') && (
              <p className="field-error" id="erro-matricula" role="alert">
                {show('matricula')}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="senha">Senha *</label>
            <PasswordInput
              id="senha"
              autoComplete="new-password"
              value={form.senha}
              onChange={(v) => set('senha', v)}
              onBlur={() => blur('senha')}
              invalid={!!show('senha')}
              describedBy={show('senha') ? 'erro-senha' : 'forca-senha'}
            />
            {form.senha && (
              <div className="strength" id="forca-senha">
                <div className="strength-track">
                  <div
                    className="strength-bar"
                    style={{ width: `${(score / 4) * 100}%`, backgroundColor: STRENGTH_COLORS[score] }}
                  />
                </div>
                <span className="strength-label" aria-live="polite">
                  Força: {STRENGTH_LABELS[score]}
                </span>
              </div>
            )}
            {show('senha') && (
              <p className="field-error" id="erro-senha" role="alert">
                {show('senha')}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="confirmar">Confirmar senha *</label>
            <PasswordInput
              id="confirmar"
              autoComplete="new-password"
              value={form.confirmar}
              onChange={(v) => set('confirmar', v)}
              onBlur={() => blur('confirmar')}
              invalid={!!show('confirmar')}
              describedBy={show('confirmar') ? 'erro-confirmar' : undefined}
            />
            {show('confirmar') && (
              <p className="field-error" id="erro-confirmar" role="alert">
                {show('confirmar')}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="curso">Curso (opcional)</label>
            <input
              id="curso"
              name="curso"
              type="text"
              placeholder="Ex: Ciência da Computação"
              value={form.curso}
              onChange={(e) => set('curso', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="campus">Campus (opcional)</label>
            <select id="campus" name="campus" value={form.campus} onChange={(e) => set('campus', e.target.value)}>
              <option value="">Selecione…</option>
              {CAMPI.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={!isValid || sending}>
            {sending ? (
              <>
                <span className="spinner" aria-hidden="true" /> Criando conta…
              </>
            ) : (
              'Criar conta'
            )}
          </button>
        </form>

        <p className="auth-alt">
          Já tem conta?{' '}
          <Link to={`/entrar${params.get('voltar') ? `?voltar=${encodeURIComponent(params.get('voltar')!)}` : ''}`}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
