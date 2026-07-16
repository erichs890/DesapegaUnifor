import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animate, stagger } from 'animejs';
import { listAnuncios } from '../lib/api';
import { CATEGORIAS, type Anuncio } from '../lib/types';
import { AnuncioCard, SkeletonCard } from './AnuncioCard';
import { prefersReducedMotion } from '../hooks/useReducedMotion';
import './Vitrine.css';

gsap.registerPlugin(ScrollTrigger);

type LoadState = 'loading' | 'ready' | 'error' | 'more';

const PER_PAGE = 12;

/**
 * Vitrine pública: busca (debounce 300ms), filtro por categoria, ordenação e
 * "só doações" — tudo sincronizado com a URL (deep linking + voltar/avançar
 * do navegador preservam o estado). Paginação explícita com "Carregar mais".
 */
export function Vitrine() {
  const [params, setParams] = useSearchParams();
  const categoria = params.get('categoria') ?? '';
  const q = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'recentes';
  const soDoacoes = params.get('tipo') === 'doacao';

  const [busca, setBusca] = useState(q);
  const [buscando, setBuscando] = useState(false);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>('loading');

  const gridRef = useRef<HTMLDivElement>(null);
  const firstReveal = useRef(true);

  const updateParam = (key: string, value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );
  };

  // busca com debounce de 300ms → URL
  useEffect(() => {
    if (busca === q) return;
    setBuscando(true);
    const timer = setTimeout(() => {
      updateParam('q', busca.trim());
      setBuscando(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [busca]); // eslint-disable-line react-hooks/exhaustive-deps

  // sincroniza input quando a URL muda por navegação (voltar/avançar)
  useEffect(() => {
    setBusca(q);
  }, [q]);

  // carrega página 1 sempre que os filtros mudarem
  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setPage(1);
    listAnuncios({
      categoria: categoria || undefined,
      q: q || undefined,
      tipo: soDoacoes ? 'doacao' : undefined,
      sort,
      page: 1,
      per_page: PER_PAGE,
    })
      .then((r) => {
        if (cancelled) return;
        setAnuncios(r.anuncios);
        setTotal(r.total);
        setHasMore(r.has_more);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [categoria, q, sort, soDoacoes]);

  const carregarMais = () => {
    const next = page + 1;
    setState('more');
    listAnuncios({
      categoria: categoria || undefined,
      q: q || undefined,
      tipo: soDoacoes ? 'doacao' : undefined,
      sort,
      page: next,
      per_page: PER_PAGE,
    })
      .then((r) => {
        setAnuncios((prev) => [...prev, ...r.anuncios]);
        setHasMore(r.has_more);
        setPage(next);
        setState('ready');
      })
      .catch(() => setState('ready'));
  };

  // Reveal dos cards
  useLayoutEffect(() => {
    if (state !== 'ready' || anuncios.length === 0) return;
    const grid = gridRef.current;
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.vitrine-item:not([data-shown])'));
    cards.forEach((c) => c.setAttribute('data-shown', '1'));
    if (prefersReducedMotion() || cards.length === 0) {
      cards.forEach((c) => (c.style.opacity = '1'));
      return;
    }

    if (firstReveal.current) {
      firstReveal.current = false;
      gsap.set(cards, { autoAlpha: 0, y: 40 });
      const batch = ScrollTrigger.batch(cards, {
        start: 'top 88%',
        once: true,
        onEnter: (els) =>
          gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.08, ease: 'power3.out', overwrite: true }),
      });
      return () => batch.forEach((st) => st.kill());
    }

    cards.forEach((c) => (c.style.opacity = '0'));
    animate(cards, { opacity: [0, 1], translateY: [16, 0], duration: 320, delay: stagger(40), ease: 'outCubic' });
  }, [state, anuncios]);

  const limparFiltros = () => {
    setParams({}, { replace: true });
    setBusca('');
  };

  return (
    <section className="vitrine" id="vitrine" aria-labelledby="vitrine-title">
      <div className="container">
        <header className="vitrine-header">
          <h2 id="vitrine-title">Últimos desapegos</h2>
          <p>Tudo anunciado por estudantes, para estudantes.</p>
        </header>

        {/* ---- Busca + ordenação + só doações ---- */}
        <div className="vitrine-toolbar">
          <div className="busca-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Buscar por título ou descrição…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar anúncios"
            />
            {buscando && <span className="spinner busca-spinner" aria-hidden="true" />}
          </div>

          <label className="sort-wrap">
            <span className="visually-hidden">Ordenar por</span>
            <select value={sort} onChange={(e) => updateParam('sort', e.target.value === 'recentes' ? '' : e.target.value)} aria-label="Ordenar anúncios">
              <option value="recentes">Mais recentes</option>
              <option value="preco_asc">Menor preço</option>
              <option value="preco_desc">Maior preço</option>
            </select>
          </label>

          <button
            className={`chip chip-doacoes${soDoacoes ? ' active' : ''}`}
            onClick={() => updateParam('tipo', soDoacoes ? '' : 'doacao')}
            aria-pressed={soDoacoes}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 20.5s-7.5-4.7-9.3-9.6C1.4 7.3 4 4.5 7 4.5c2 0 3.9 1.2 5 3 1.1-1.8 3-3 5-3 3 0 5.6 2.8 4.3 6.4-1.8 4.9-9.3 9.6-9.3 9.6z" fill="currentColor" />
            </svg>
            Só doações
          </button>
        </div>

        <div className="chips" role="group" aria-label="Filtrar por categoria">
          <button className={`chip${categoria === '' ? ' active' : ''}`} onClick={() => updateParam('categoria', '')} aria-pressed={categoria === ''}>
            Todos
          </button>
          {CATEGORIAS.map((cat) => (
            <button key={cat} className={`chip${categoria === cat ? ' active' : ''}`} onClick={() => updateParam('categoria', cat)} aria-pressed={categoria === cat}>
              {cat}
            </button>
          ))}
        </div>

        {state === 'error' && (
          <div className="vitrine-empty" role="alert">
            <h3>Não conseguimos carregar os anúncios</h3>
            <p>Verifique sua conexão e tente de novo.</p>
            <button className="btn btn-secondary" onClick={() => updateParam('_r', String(Date.now()))}>
              Tentar novamente
            </button>
          </div>
        )}

        {state === 'loading' && (
          <div className="vitrine-grid" aria-busy="true" aria-label="Carregando anúncios">
            {Array.from({ length: 8 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {state !== 'loading' && state !== 'error' && anuncios.length === 0 && (
          <div className="vitrine-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7.5L12 4l8 3.5v9L12 20l-8-3.5v-9z" stroke="var(--color-border-strong)" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M4 7.5L12 11l8-3.5M12 11v9" stroke="var(--color-border-strong)" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            <h3>{q ? `Nada encontrado para "${q}"` : 'Nada por aqui ainda'}</h3>
            <p>{q ? 'Tente outra palavra ou limpe os filtros.' : `Seja a primeira pessoa a desapegar em ${categoria || 'todas as categorias'}.`}</p>
            {q || categoria || soDoacoes ? (
              <button className="btn btn-secondary" onClick={limparFiltros}>
                Limpar filtros
              </button>
            ) : (
              <Link to="/anunciar" className="btn btn-primary">
                Anunciar um item
              </Link>
            )}
          </div>
        )}

        {anuncios.length > 0 && state !== 'loading' && (
          <>
            <div className="vitrine-grid" ref={gridRef}>
              {anuncios.map((a) => (
                <div className="vitrine-item" key={a.id}>
                  <AnuncioCard anuncio={a} />
                </div>
              ))}
            </div>

            <div className="vitrine-footer">
              <p aria-live="polite">
                Mostrando {anuncios.length} de {total} {total === 1 ? 'anúncio' : 'anúncios'}
              </p>
              {hasMore && (
                <button className="btn btn-secondary" onClick={carregarMais} disabled={state === 'more'}>
                  {state === 'more' ? (
                    <>
                      <span className="spinner" aria-hidden="true" /> Carregando…
                    </>
                  ) : (
                    'Carregar mais'
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
