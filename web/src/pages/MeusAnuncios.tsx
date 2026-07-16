import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { animate, stagger } from 'animejs';
import { deleteAnuncio, listAnuncios, ApiError } from '../lib/api';
import type { Anuncio } from '../lib/types';
import { formatData, formatPreco } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { prefersReducedMotion } from '../hooks/useReducedMotion';
import './MeusAnuncios.css';

type LoadState = 'loading' | 'ready' | 'error';

export default function MeusAnuncios() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [confirming, setConfirming] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const revealed = useRef(false);
  const { toast } = useToast();
  const { user, refresh } = useAuth();

  const load = () => {
    setState('loading');
    listAnuncios({ usuario: 'me', per_page: 48 })
      .then((r) => {
        setAnuncios(r.anuncios);
        setState('ready');
      })
      .catch(() => setState('error'));
  };

  useEffect(load, []);

  // Entrada da lista em stagger (anime.js) — uma única vez
  useEffect(() => {
    if (state !== 'ready' || anuncios.length === 0 || revealed.current) return;
    revealed.current = true;
    const items = listRef.current?.querySelectorAll('.meu-item');
    if (items && !prefersReducedMotion()) {
      animate(items, {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 400,
        delay: stagger(60),
        ease: 'outCubic',
      });
    }
  }, [state, anuncios]);

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await deleteAnuncio(id);
      const el = document.querySelector<HTMLElement>(`[data-anuncio="${id}"]`);
      const finish = () => {
        setAnuncios((prev) => prev.filter((a) => a.id !== id));
        setConfirming(null);
        setDeleting(null);
        toast('success', 'Anúncio removido.');
        refresh(); // atualiza stats do perfil
      };
      if (el && !prefersReducedMotion()) {
        // Colapso animado: o item encolhe e a lista se reacomoda com continuidade
        animate(el, {
          opacity: [1, 0],
          translateX: [0, 32],
          height: [el.offsetHeight, 0],
          marginBottom: [12, 0],
          duration: 320,
          ease: 'inOutQuad',
          onComplete: finish,
        });
      } else {
        finish();
      }
    } catch (err) {
      setDeleting(null);
      setConfirming(null);
      toast('error', err instanceof ApiError ? err.message : 'Não foi possível remover.');
    }
  };

  return (
    <div className="meus container">
      <header className="meus-header">
        <h1>Meus anúncios</h1>
        <p>
          {state === 'ready'
            ? `${anuncios.length} ${anuncios.length === 1 ? 'anúncio publicado' : 'anúncios publicados'} por ${user?.nome ?? 'você'}`
            : `Publicados por ${user?.nome ?? 'você'}`}
        </p>
      </header>

      {state === 'loading' && (
        <div className="meus-skeletons" aria-busy="true" aria-label="Carregando seus anúncios">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 96, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      )}

      {state === 'error' && (
        <div className="meus-empty" role="alert">
          <h2>Não conseguimos carregar seus anúncios</h2>
          <p>Verifique sua conexão e tente novamente.</p>
          <button className="btn btn-secondary" onClick={load}>
            Tentar novamente
          </button>
        </div>
      )}

      {state === 'ready' && anuncios.length === 0 && (
        <div className="meus-empty">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3.5" y="3.5" width="17" height="17" rx="5.5" stroke="var(--color-border-strong)" strokeWidth="1.6" />
            <path d="M12 8.5v7M8.5 12h7" stroke="var(--color-border-strong)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <h2>Você ainda não desapegou de nada</h2>
          <p>Aquele livro parado na estante pode ser exatamente o que alguém procura.</p>
          <Link to="/anunciar" className="btn btn-primary">
            Criar meu primeiro anúncio
          </Link>
        </div>
      )}

      {state === 'ready' && anuncios.length > 0 && (
        <ul className="meus-lista" ref={listRef}>
          {anuncios.map((a) => (
            <li key={a.id} className="meu-item" data-anuncio={a.id}>
              <div className="meu-info">
                <span className="meu-categoria">{a.categoria}</span>
                <h2>
                  <Link to={`/item/${a.id}`} className="meu-link">
                    {a.titulo}
                  </Link>
                </h2>
                <p>
                  {a.tipo === 'doacao' ? (
                    <span className="meu-badge doacao">Doação</span>
                  ) : (
                    <span className="meu-badge venda">{formatPreco(a.preco ?? 0)}</span>
                  )}
                  <time dateTime={a.criado_em}>· {formatData(a.criado_em)}</time>
                </p>
              </div>

              {confirming === a.id ? (
                <div className="meu-confirm" role="alertdialog" aria-label={`Confirmar remoção de ${a.titulo}`}>
                  <span>Remover?</span>
                  <button
                    className="btn-confirm sim"
                    onClick={() => handleDelete(a.id)}
                    disabled={deleting === a.id}
                  >
                    {deleting === a.id ? <span className="spinner" aria-hidden="true" /> : 'Sim'}
                  </button>
                  <button className="btn-confirm nao" onClick={() => setConfirming(null)} disabled={deleting === a.id}>
                    Não
                  </button>
                </div>
              ) : (
                <div className="meu-acoes">
                  <Link
                    to={`/anunciar?editar=${a.id}`}
                    className="meu-delete meu-editar"
                    aria-label={`Editar anúncio ${a.titulo}`}
                  >
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3zM14 7l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                  <button
                    className="meu-delete"
                    onClick={() => setConfirming(a.id)}
                    aria-label={`Remover anúncio ${a.titulo}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
