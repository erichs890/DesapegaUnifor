import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { updateMe, uploadImagem, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/UserMenu';
import { parseDbDate } from '../lib/format';
import { CAMPI } from '../lib/types';
import './Perfil.css';

export default function Perfil() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [nome, setNome] = useState(user?.nome ?? '');
  const [curso, setCurso] = useState(user?.curso ?? '');
  const [campus, setCampus] = useState(user?.campus ?? '');
  const [matricula, setMatricula] = useState(user?.matricula ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const nomeError = nome.trim().length < 2 ? 'O nome precisa de pelo menos 2 caracteres.' : undefined;
  const matriculaError =
    matricula !== '' && !/^\d{2}[12]\d{4}$/.test(matricula) ? 'Matrícula inválida: são 7 números — ano de ingresso (2 dígitos), semestre (1 ou 2) e mais 4 números. Ex: 2420145.' : undefined;
  const membroDesde = parseDbDate(user.criado_em).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const handleAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadImagem(file);
      await updateMe({ avatar_url: url });
      await refresh();
      toast('success', 'Foto de perfil atualizada!');
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Não foi possível trocar a foto.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (nomeError || matriculaError || saving) return;
    setSaving(true);
    try {
      await updateMe({ nome: nome.trim(), curso: curso.trim(), campus, matricula });
      await refresh();
      toast('success', 'Perfil atualizado!');
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="perfil container">
      <header className="perfil-header">
        <div className="perfil-avatar-wrap">
          <Avatar nome={user.nome} url={user.avatar_url} size={88} />
          <button
            className="perfil-avatar-btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label="Trocar foto de perfil"
          >
            {uploadingAvatar ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8 7l1.2-2h5.6L16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="12" cy="13.5" r="3" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="visually-hidden"
            onChange={handleAvatar}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
        <div>
          <h1>{user.nome}</h1>
          <p className="perfil-meta">
            {user.email} · membro desde {membroDesde}
          </p>
        </div>
      </header>

      <div className="perfil-stats" aria-label="Suas estatísticas">
        <div className="perfil-stat">
          <strong>{user.stats?.anuncios ?? 0}</strong>
          <span>anúncios publicados</span>
        </div>
        <div className="perfil-stat">
          <strong>{user.stats?.doacoes ?? 0}</strong>
          <span>doações feitas</span>
        </div>
      </div>

      <form className="perfil-form" onSubmit={handleSubmit} noValidate>
        <h2>Editar perfil</h2>

        <div className="field">
          <label htmlFor="nome">Nome *</label>
          <input
            id="nome"
            type="text"
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            aria-invalid={!!nomeError}
            aria-describedby={nomeError ? 'erro-nome' : undefined}
          />
          {nomeError && (
            <p className="field-error" id="erro-nome" role="alert">
              {nomeError}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="matricula">Matrícula</label>
          <input
            id="matricula"
            type="text"
            inputMode="numeric"
            maxLength={7}
            placeholder="Ex: 2420145 (ano + semestre + nº)"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value.replace(/\D/g, '').slice(0, 7))}
            aria-invalid={!!matriculaError}
            aria-describedby={matriculaError ? 'erro-matricula' : undefined}
          />
          {matriculaError && (
            <p className="field-error" id="erro-matricula" role="alert">
              {matriculaError}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="curso">Curso</label>
          <input id="curso" type="text" placeholder="Ex: Engenharia Civil" value={curso} onChange={(e) => setCurso(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="campus">Campus</label>
          <select id="campus" value={campus} onChange={(e) => setCampus(e.target.value)}>
            <option value="">Selecione…</option>
            {CAMPI.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn-primary" disabled={!!nomeError || !!matriculaError || saving}>
          {saving ? (
            <>
              <span className="spinner" aria-hidden="true" /> Salvando…
            </>
          ) : (
            'Salvar alterações'
          )}
        </button>
      </form>
    </div>
  );
}
