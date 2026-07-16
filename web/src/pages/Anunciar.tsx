import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { animate } from 'animejs';
import { createAnuncio, updateAnuncio, getAnuncio, ApiError } from '../lib/api';
import { CATEGORIAS, CAMPI, ESTADO_LABEL, type EstadoConservacao, type Tipo } from '../lib/types';
import { ImageUploader, type UploaderImage } from '../components/ImageUploader';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { prefersReducedMotion } from '../hooks/useReducedMotion';
import { formatPreco } from '../lib/format';
import './Anunciar.css';

/* ================= estado do formulário ================= */

interface Form {
  tipo: Tipo;
  titulo: string;
  categoria: string;
  precoCentavos: string; // dígitos: "4590" = R$ 45,90 (máscara BRL)
  descricao: string;
  estado: EstadoConservacao;
  campus: string;
  ponto: string;
  trocas: boolean;
  imagens: UploaderImage[];
}

const EMPTY: Form = {
  tipo: 'doacao',
  titulo: '',
  categoria: '',
  precoCentavos: '',
  descricao: '',
  estado: 'usado',
  campus: '',
  ponto: '',
  trocas: false,
  imagens: [],
};

const DRAFT_KEY = 'desapego:rascunho';

const precoBRL = (centavos: string): string =>
  centavos ? (Number(centavos) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';

function validarEtapa(step: number, f: Form): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 1) {
    if (!f.titulo.trim()) e.titulo = 'Dê um título ao seu item.';
    else if (f.titulo.trim().length < 3) e.titulo = 'Muito curto — use pelo menos 3 caracteres.';
    else if (f.titulo.trim().length > 80) e.titulo = 'Máximo de 80 caracteres.';
    if (!f.categoria) e.categoria = 'Escolha uma categoria.';
    if (f.tipo === 'venda') {
      const valor = Number(f.precoCentavos) / 100;
      if (!f.precoCentavos || valor <= 0) e.preco = 'Informe o preço de venda.';
      else if (valor > 100_000) e.preco = 'O preço máximo é R$ 100.000.';
    }
  }
  if (step === 2) {
    if (!f.descricao.trim()) e.descricao = 'Conte um pouco sobre o item.';
    else if (f.descricao.trim().length < 10) e.descricao = 'Descreva melhor — pelo menos 10 caracteres.';
    else if (f.descricao.trim().length > 500) e.descricao = 'Máximo de 500 caracteres.';
    if (f.ponto.trim() !== '' && f.ponto.trim().length < 3) e.ponto = 'O ponto de encontro precisa de pelo menos 3 caracteres.';
  }
  return e;
}

const ESTADO_ICONS: Record<EstadoConservacao, string> = {
  novo: 'M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 8.7l5.4-.8L12 3z',
  seminovo: 'M12 3a9 9 0 1 1-9 9M12 7v5l3.5 2',
  usado: 'M12 3a9 9 0 1 0 9 9M12 7v5l3.5 2',
  com_marcas: 'M12 4a8 8 0 1 0 8 8M15 4l5 5M20 4l-5 5',
};

const STEP_TITLES = ['O essencial', 'Detalhes', 'Fotos e revisão'];

/* ================= componente ================= */

export default function Anunciar() {
  const [params] = useSearchParams();
  const editId = params.get('editar') ? Number(params.get('editar')) : null;

  const [form, setForm] = useState<Form>(EMPTY);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const [uploadsPendentes, setUploadsPendentes] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [draftBanner, setDraftBanner] = useState(false);
  const [success, setSuccess] = useState(false);
  const dirty = useRef(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refresh } = useAuth();

  const errors = validarEtapa(step, form);
  const stepValid = Object.keys(errors).length === 0;
  const show = (field: string) => (touched[field] ? errors[field] : undefined);

  const set = <K extends keyof Form>(field: K, value: Form[K]) => {
    dirty.current = true;
    setForm((f) => ({ ...f, [field]: value }));
  };

  /* ---- edição: carrega o anúncio ---- */
  useEffect(() => {
    if (!editId) return;
    getAnuncio(editId)
      .then((r) => {
        const a = r.anuncio;
        if (user && a.usuario_id !== user.id) {
          toast('error', 'Você só pode editar os seus próprios anúncios.');
          navigate('/meus', { replace: true });
          return;
        }
        setForm({
          tipo: a.tipo,
          titulo: a.titulo,
          categoria: a.categoria,
          precoCentavos: a.preco ? String(Math.round(a.preco * 100)) : '',
          descricao: a.descricao,
          estado: a.estado_conservacao,
          campus: a.campus ?? '',
          ponto: a.ponto_encontro ?? '',
          trocas: a.aceita_trocas === 1,
          imagens: (a.imagens ?? []).map((i) => ({ url: i.url })),
        });
        setLoadingEdit(false);
      })
      .catch(() => {
        toast('error', 'Não foi possível carregar o anúncio para edição.');
        navigate('/meus', { replace: true });
      });
  }, [editId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- rascunho automático (só para anúncio novo) ---- */
  useEffect(() => {
    if (editId) return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) setDraftBanner(true);
  }, [editId]);

  useEffect(() => {
    if (editId || !dirty.current) return;
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step }));
    }, 400);
    return () => clearTimeout(timer);
  }, [form, step, editId]);

  // confirmação antes de fechar a aba com alterações não salvas
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current && !success) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [success]);

  const restaurarRascunho = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}');
      if (saved.form) {
        setForm({ ...EMPTY, ...saved.form });
        setStep(saved.step ?? 1);
        toast('success', 'Rascunho restaurado — continue de onde parou.');
      }
    } catch {
      toast('error', 'O rascunho salvo estava corrompido e foi descartado.');
    }
    setDraftBanner(false);
  };

  const descartarRascunho = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftBanner(false);
  };

  /* ---- animações: barra de progresso + slide entre etapas ---- */
  useLayoutEffect(() => {
    if (barRef.current) {
      gsap.to(barRef.current, {
        width: `${(step / 3) * 100}%`,
        duration: prefersReducedMotion() ? 0 : 0.45,
        ease: 'power3.out',
      });
    }
    const panel = panelRef.current;
    if (panel && !prefersReducedMotion()) {
      gsap.fromTo(
        panel,
        { autoAlpha: 0, x: 32 * direction },
        { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [step, direction]);

  const scrollTopo = () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

  const avancar = () => {
    setTouched((t) => ({ ...t, titulo: true, categoria: true, preco: true, descricao: true, ponto: true }));
    if (!stepValid) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
    setTouched({});
    scrollTopo();
  };

  const voltar = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
    scrollTopo();
  };

  /* ---- envio ---- */
  // O submit implícito do form (Enter em qualquer campo) NUNCA publica:
  // avança de etapa nas duas primeiras e é ignorado na terceira. Publicar
  // só acontece pelo clique explícito no botão "Publicar".
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step < 3) avancar();
  };

  const publicar = async () => {
    if (sending || uploadsPendentes) return;
    const e1 = validarEtapa(1, form);
    const e2 = validarEtapa(2, form);
    if (Object.keys(e1).length) {
      setDirection(-1);
      setStep(1);
      setTouched({ titulo: true, categoria: true, preco: true });
      return;
    }
    if (Object.keys(e2).length) {
      setDirection(-1);
      setStep(2);
      setTouched({ descricao: true, ponto: true });
      return;
    }

    setSending(true);
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      tipo: form.tipo,
      preco: form.tipo === 'venda' ? Number(form.precoCentavos) / 100 : null,
      estado_conservacao: form.estado,
      campus: form.campus || null,
      ponto_encontro: form.ponto.trim() || null,
      aceita_trocas: form.tipo === 'venda' && form.trocas, // doação nunca aceita trocas
      imagens: form.imagens.map((i) => i.url),
    };

    try {
      const r = editId ? await updateAnuncio(editId, payload) : await createAnuncio(payload);
      dirty.current = false;
      localStorage.removeItem(DRAFT_KEY);
      refresh(); // atualiza stats do perfil

      setSuccess(true);
      // checkmark desenhado com stroke-dashoffset (anime.js)
      requestAnimationFrame(() => {
        const circle = successRef.current?.querySelector('.success-circle');
        const check = successRef.current?.querySelector('.success-check');
        const duration = prefersReducedMotion() ? 1 : 500;
        if (circle) animate(circle, { strokeDashoffset: [230, 0], duration, ease: 'outCubic' });
        if (check) animate(check, { strokeDashoffset: [48, 0], duration: duration * 0.7, delay: duration * 0.5, ease: 'outCubic' });
      });
      setTimeout(() => navigate(`/item/${r.anuncio.id}`), prefersReducedMotion() ? 400 : 1400);
    } catch (err) {
      setSending(false);
      if (err instanceof ApiError && err.fields) {
        toast('error', Object.values(err.fields)[0] ?? err.message);
      } else {
        toast('error', err instanceof ApiError ? err.message : 'Não foi possível publicar. Tente novamente.');
      }
    }
  };

  if (loadingEdit) {
    return (
      <div className="anunciar container" aria-busy="true">
        <div className="skeleton" style={{ height: 36, width: 240 }} />
        <div className="skeleton" style={{ height: 320, marginTop: 24, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  return (
    <div className="anunciar container">
      <header className="anunciar-header">
        <h1>{editId ? 'Editar anúncio' : 'Anunciar item'}</h1>
        <p>
          Etapa {step} de 3 — {STEP_TITLES[step - 1]}
        </p>
      </header>

      {/* Indicador de progresso */}
      <div className="wizard-progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3} aria-label={`Etapa ${step} de 3`}>
        <div className="wizard-progress-bar" ref={barRef} style={{ width: `${(step / 3) * 100}%` }} />
      </div>
      <ol className="wizard-steps" aria-hidden="true">
        {STEP_TITLES.map((title, i) => (
          <li key={title} className={i + 1 === step ? 'current' : i + 1 < step ? 'done' : ''}>
            <span className="wizard-step-dot">{i + 1 < step ? '✓' : i + 1}</span>
            <span className="wizard-step-label">{title}</span>
          </li>
        ))}
      </ol>

      {draftBanner && (
        <div className="draft-banner" role="status">
          <p>Você tem um anúncio não finalizado. Continuar de onde parou?</p>
          <div>
            <button className="btn btn-secondary" onClick={restaurarRascunho}>
              Continuar
            </button>
            <button className="btn btn-ghost" onClick={descartarRascunho}>
              Começar do zero
            </button>
          </div>
        </div>
      )}

      <form className="form wizard" onSubmit={handleSubmit} noValidate>
        <div ref={panelRef}>
          {/* ============ ETAPA 1 ============ */}
          {step === 1 && (
            <div className="wizard-panel">
              <fieldset className="field">
                <legend>O que você quer fazer? *</legend>
                <div className="tipo-toggle" role="radiogroup" aria-label="Tipo do anúncio">
                  <button type="button" role="radio" aria-checked={form.tipo === 'doacao'} className={`tipo-option${form.tipo === 'doacao' ? ' active' : ''}`} onClick={() => set('tipo', 'doacao')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 20.5s-7.5-4.7-9.3-9.6C1.4 7.3 4 4.5 7 4.5c2 0 3.9 1.2 5 3 1.1-1.8 3-3 5-3 3 0 5.6 2.8 4.3 6.4-1.8 4.9-9.3 9.6-9.3 9.6z" fill="currentColor" />
                    </svg>
                    Doar
                  </button>
                  <button type="button" role="radio" aria-checked={form.tipo === 'venda'} className={`tipo-option${form.tipo === 'venda' ? ' active' : ''}`} onClick={() => set('tipo', 'venda')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 3v18M8 7.5c0-1.4 1.8-2.5 4-2.5s4 1.1 4 2.5-1.8 2.5-4 2.5-4 1.1-4 2.5 1.8 2.5 4 2.5 4-1.1 4-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Vender
                  </button>
                </div>
              </fieldset>

              {form.tipo === 'venda' && (
                <div className="field">
                  <label htmlFor="preco">Preço *</label>
                  <input
                    id="preco"
                    name="preco"
                    type="text"
                    enterKeyHint="next"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={precoBRL(form.precoCentavos)}
                    onChange={(e) => set('precoCentavos', e.target.value.replace(/\D/g, '').slice(0, 9))}
                    onBlur={() => setTouched((t) => ({ ...t, preco: true }))}
                    aria-invalid={!!show('preco')}
                    aria-describedby={show('preco') ? 'erro-preco' : 'ajuda-preco'}
                  />
                  <p className="field-help" id="ajuda-preco">
                    Digite só números — a máscara formata sozinha.
                  </p>
                  {show('preco') && (
                    <p className="field-error" id="erro-preco" role="alert">
                      {show('preco')}
                    </p>
                  )}
                </div>
              )}

              <div className="field">
                <label htmlFor="titulo">Título *</label>
                <input
                  id="titulo"
                  name="titulo"
                  type="text"
                  enterKeyHint="next"
                  maxLength={80}
                  placeholder="Ex: Cálculo Vol. 1 — James Stewart"
                  value={form.titulo}
                  onChange={(e) => set('titulo', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, titulo: true }))}
                  aria-invalid={!!show('titulo')}
                  aria-describedby={show('titulo') ? 'erro-titulo' : 'ajuda-titulo'}
                />
                <p className="field-help" id="ajuda-titulo">
                  {form.titulo.length}/80 caracteres
                </p>
                {show('titulo') && (
                  <p className="field-error" id="erro-titulo" role="alert">
                    {show('titulo')}
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="categoria">Categoria *</label>
                <select
                  id="categoria"
                  name="categoria"
                  value={form.categoria}
                  onChange={(e) => {
                    set('categoria', e.target.value);
                    setTouched((t) => ({ ...t, categoria: true }));
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, categoria: true }))}
                  aria-invalid={!!show('categoria')}
                  aria-describedby={show('categoria') ? 'erro-categoria' : undefined}
                >
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {show('categoria') && (
                  <p className="field-error" id="erro-categoria" role="alert">
                    {show('categoria')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ============ ETAPA 2 ============ */}
          {step === 2 && (
            <div className="wizard-panel">
              <div className="field">
                <label htmlFor="descricao">Descrição *</label>
                <textarea
                  id="descricao"
                  name="descricao"
                  rows={4}
                  maxLength={500}
                  placeholder="Estado de conservação, tempo de uso, o que acompanha…"
                  value={form.descricao}
                  onChange={(e) => set('descricao', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, descricao: true }))}
                  aria-invalid={!!show('descricao')}
                  aria-describedby={show('descricao') ? 'erro-descricao' : 'ajuda-descricao'}
                />
                <p className="field-help" id="ajuda-descricao">
                  {form.descricao.length}/500 caracteres
                </p>
                {show('descricao') && (
                  <p className="field-error" id="erro-descricao" role="alert">
                    {show('descricao')}
                  </p>
                )}
              </div>

              <fieldset className="field">
                <legend>Estado de conservação *</legend>
                <div className="estado-grid" role="radiogroup" aria-label="Estado de conservação">
                  {(Object.keys(ESTADO_LABEL) as EstadoConservacao[]).map((estado) => (
                    <button
                      key={estado}
                      type="button"
                      role="radio"
                      aria-checked={form.estado === estado}
                      className={`estado-card${form.estado === estado ? ' active' : ''}`}
                      onClick={() => set('estado', estado)}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d={ESTADO_ICONS[estado]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {ESTADO_LABEL[estado]}
                    </button>
                  ))}
                </div>
              </fieldset>

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

              <div className="field">
                <label htmlFor="ponto">Ponto de encontro sugerido (opcional)</label>
                <input
                  id="ponto"
                  name="ponto"
                  type="text"
                  enterKeyHint="done"
                  maxLength={80}
                  placeholder="Ex: Biblioteca central"
                  value={form.ponto}
                  onChange={(e) => set('ponto', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, ponto: true }))}
                  aria-invalid={!!show('ponto')}
                />
                {show('ponto') && (
                  <p className="field-error" role="alert">
                    {show('ponto')}
                  </p>
                )}
              </div>

              {/* Doação não pede nada em troca — o switch só existe para venda */}
              {form.tipo === 'venda' && (
                <div className="field switch-field">
                  <label htmlFor="trocas" id="label-trocas">
                    Aceita trocas?
                  </label>
                  <button
                    type="button"
                    id="trocas"
                    role="switch"
                    aria-checked={form.trocas}
                    aria-labelledby="label-trocas"
                    className={`switch${form.trocas ? ' on' : ''}`}
                    onClick={() => set('trocas', !form.trocas)}
                  >
                    <span className="switch-thumb" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============ ETAPA 3 ============ */}
          {step === 3 && (
            <div className="wizard-panel">
              <div className="field">
                <span className="field-label-static">Fotos do item (até 5 — a primeira é a capa)</span>
                <ImageUploader
                  value={form.imagens}
                  onChange={(imgs) => set('imagens', imgs)}
                  onBusyChange={setUploadsPendentes}
                />
              </div>

              <div className="field">
                <span className="field-label-static">É assim que os outros vão ver:</span>
                <div className="wizard-preview">
                  <article className="card">
                    <div className="card-media">
                      {form.imagens[0] ? (
                        <img src={form.imagens[0].url} alt="" />
                      ) : (
                        <div className="galeria-vazia" style={{ height: '100%' }}>
                          <span className="field-help">Sem foto — que tal adicionar uma?</span>
                        </div>
                      )}
                      <span className={`card-price ${form.tipo}`}>
                        {form.tipo === 'doacao' ? 'Doação' : precoBRL(form.precoCentavos) || formatPreco(0)}
                      </span>
                    </div>
                    <div className="card-body">
                      <span className="card-category">{form.categoria || 'Categoria'}</span>
                      <h3 className="card-title">{form.titulo || 'Título do anúncio'}</h3>
                      <p className="card-desc">{form.descricao || 'A descrição aparece aqui.'}</p>
                      <footer className="card-meta">
                        <span>{user?.nome ?? 'Você'}</span>
                        <span>agora</span>
                      </footer>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---- Navegação do wizard ---- */}
        <div className="wizard-nav">
          {step > 1 ? (
            <button type="button" className="btn btn-secondary" onClick={voltar}>
              Voltar
            </button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <button type="button" className="btn btn-primary" onClick={avancar} disabled={!stepValid}>
              Continuar
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={publicar}
              disabled={sending || uploadsPendentes}
            >
              {sending ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Publicando…
                </>
              ) : uploadsPendentes ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Enviando fotos…
                </>
              ) : editId ? (
                'Salvar alterações'
              ) : form.tipo === 'doacao' ? (
                'Publicar doação'
              ) : (
                'Publicar venda'
              )}
            </button>
          )}
        </div>
      </form>

      {/* ---- Overlay de sucesso ---- */}
      {success && (
        <div className="success-overlay" ref={successRef} role="status" aria-live="assertive">
          <svg width="110" height="110" viewBox="0 0 80 80" fill="none" aria-hidden="true">
            <circle className="success-circle" cx="40" cy="40" r="36" stroke="#12CEE4" strokeWidth="5" strokeLinecap="round" strokeDasharray="230" strokeDashoffset="230" />
            <path className="success-check" d="M26 41l9 9 19-19" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="48" strokeDashoffset="48" />
          </svg>
          <p>{editId ? 'Anúncio atualizado!' : 'Anúncio publicado!'}</p>
        </div>
      )}
    </div>
  );
}
