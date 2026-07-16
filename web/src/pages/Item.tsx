import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { getAnuncio, ApiError } from '../lib/api';
import type { Anuncio, Vendedor } from '../lib/types';
import { ESTADO_LABEL } from '../lib/types';
import { formatData, formatPreco } from '../lib/format';
import { AnuncioCard } from '../components/AnuncioCard';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/UserMenu';
import { useToast } from '../components/Toast';
import { Footer } from '../components/Footer';
import { prefersReducedMotion } from '../hooks/useReducedMotion';
import './Item.css';

type LoadState = 'loading' | 'ready' | 'notfound' | 'error';

export default function Item() {
  const { id } = useParams();
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [vendedor, setVendedor] = useState<Vendedor | null>(null);
  const [relacionados, setRelacionados] = useState<Anuncio[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [imgIndex, setImgIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [contato, setContato] = useState(false);
  const mainImgRef = useRef<HTMLImageElement>(null);
  const touchX = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setState('loading');
    setImgIndex(0);
    setZoom(false);
    getAnuncio(Number(id))
      .then((r) => {
        setAnuncio(r.anuncio);
        setVendedor(r.vendedor);
        setRelacionados(r.relacionados);
        setState('ready');
        document.title = `${r.anuncio.titulo} — DesapegoUni`;
      })
      .catch((err) => {
        setState(err instanceof ApiError && err.status === 404 ? 'notfound' : 'error');
      });
    return () => {
      document.title = 'Desapego Universitário — Economia Circular no Campus';
    };
  }, [id]);

  const imagens = anuncio?.imagens?.length
    ? anuncio.imagens.map((i) => i.url)
    : anuncio?.imagem_url
      ? [anuncio.imagem_url]
      : [];

  const trocarImagem = (next: number) => {
    if (next === imgIndex || !imagens.length) return;
    const el = mainImgRef.current;
    setZoom(false);
    if (el && !prefersReducedMotion()) {
      // crossfade: some rápido, troca o src, reaparece
      gsap.to(el, {
        opacity: 0,
        duration: 0.12,
        ease: 'power2.in',
        onComplete: () => {
          setImgIndex(next);
          gsap.to(el, { opacity: 1, duration: 0.2, ease: 'power2.out' });
        },
      });
    } else {
      setImgIndex(next);
    }
  };

  // Navegação por teclado ←/→ na galeria
  useEffect(() => {
    if (state !== 'ready' || imagens.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === 'ArrowLeft') trocarImagem((imgIndex - 1 + imagens.length) % imagens.length);
      if (e.key === 'ArrowRight') trocarImagem((imgIndex + 1) % imagens.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onTouchStart = (e: TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current === null || imagens.length < 2) return;
    const delta = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(delta) > 48) {
      trocarImagem(delta < 0 ? (imgIndex + 1) % imagens.length : (imgIndex - 1 + imagens.length) % imagens.length);
    }
    touchX.current = null;
  };

  const compartilhar = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: anuncio?.titulo, url });
      } catch {
        // usuário cancelou — sem erro
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast('success', 'Link copiado! Cole onde quiser compartilhar.');
    }
  };

  if (state === 'loading') {
    return (
      <div className="item container" aria-busy="true" aria-label="Carregando anúncio">
        <div className="skeleton" style={{ height: 20, width: 260, marginBottom: 'var(--space-6)' }} />
        <div className="item-grid">
          <div>
            <div className="skeleton" style={{ aspectRatio: '4 / 3', borderRadius: 'var(--radius-lg)' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton" style={{ width: 72, height: 56, borderRadius: 8 }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <div className="skeleton" style={{ height: 16, width: 90 }} />
            <div className="skeleton" style={{ height: 36, width: '85%' }} />
            <div className="skeleton" style={{ height: 40, width: 160 }} />
            <div className="skeleton" style={{ height: 120 }} />
            <div className="skeleton" style={{ height: 90 }} />
          </div>
        </div>
      </div>
    );
  }

  if (state === 'notfound' || state === 'error' || !anuncio || !vendedor) {
    return (
      <div className="item container item-vazio">
        <h1>{state === 'notfound' ? 'Esse anúncio não existe mais' : 'Não conseguimos carregar o anúncio'}</h1>
        <p>
          {state === 'notfound'
            ? 'Pode ter sido removido pelo dono — mas a vitrine está cheia de outros desapegos.'
            : 'Verifique sua conexão e tente novamente.'}
        </p>
        <Link to="/" className="btn btn-primary">
          Voltar à vitrine
        </Link>
      </div>
    );
  }

  const membroDesde = new Date(`${vendedor.criado_em.replace(' ', 'T')}Z`).toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <>
      <div className="item container">
        <nav className="breadcrumb" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/?categoria=${encodeURIComponent(anuncio.categoria)}#vitrine`}>{anuncio.categoria}</Link>
          <span aria-hidden="true">/</span>
          <span className="breadcrumb-atual">{anuncio.titulo}</span>
        </nav>

        <div className="item-grid">
          {/* ---- Galeria ---- */}
          <section className="galeria" aria-label="Fotos do item">
            <div
              className={`galeria-main${zoom ? ' zoom' : ''}`}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {imagens.length > 0 ? (
                <img
                  ref={mainImgRef}
                  src={imagens[imgIndex]}
                  alt={`${anuncio.titulo} — foto ${imgIndex + 1} de ${imagens.length}`}
                  onClick={() => setZoom((z) => !z)}
                  title={zoom ? 'Clique para reduzir' : 'Clique para ampliar'}
                />
              ) : (
                <div className="galeria-vazia" aria-label="Anúncio sem fotos">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M8 7l1.2-2h5.6L16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3z" stroke="var(--color-border-strong)" strokeWidth="1.6" strokeLinejoin="round" />
                    <circle cx="12" cy="13.5" r="3.5" stroke="var(--color-border-strong)" strokeWidth="1.6" />
                  </svg>
                  <span>Sem fotos</span>
                </div>
              )}
              {imagens.length > 1 && (
                <span className="galeria-contador" aria-live="polite">
                  {imgIndex + 1}/{imagens.length}
                </span>
              )}
            </div>

            {imagens.length > 1 && (
              <div className="galeria-thumbs" role="tablist" aria-label="Miniaturas">
                {imagens.map((url, i) => (
                  <button
                    key={url + i}
                    role="tab"
                    aria-selected={i === imgIndex}
                    aria-label={`Ver foto ${i + 1}`}
                    className={i === imgIndex ? 'active' : ''}
                    onClick={() => trocarImagem(i)}
                  >
                    <img src={url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ---- Infos ---- */}
          <section className="item-info">
            <Link to={`/?categoria=${encodeURIComponent(anuncio.categoria)}#vitrine`} className="item-categoria">
              {anuncio.categoria}
            </Link>
            <h1>{anuncio.titulo}</h1>

            {anuncio.tipo === 'doacao' ? (
              <p className="item-preco doacao">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 20.5s-7.5-4.7-9.3-9.6C1.4 7.3 4 4.5 7 4.5c2 0 3.9 1.2 5 3 1.1-1.8 3-3 5-3 3 0 5.6 2.8 4.3 6.4-1.8 4.9-9.3 9.6-9.3 9.6z" fill="currentColor" />
                </svg>
                Doação
              </p>
            ) : (
              <p className="item-preco">{formatPreco(anuncio.preco ?? 0)}</p>
            )}

            {anuncio.aceita_trocas === 1 && <p className="item-trocas">Aceita trocas</p>}

            <div className="item-descricao">
              <h2>Descrição</h2>
              <p>{anuncio.descricao}</p>
            </div>

            <dl className="item-ficha">
              <div>
                <dt>Estado</dt>
                <dd>{ESTADO_LABEL[anuncio.estado_conservacao]}</dd>
              </div>
              {anuncio.campus && (
                <div>
                  <dt>Campus</dt>
                  <dd>{anuncio.campus}</dd>
                </div>
              )}
              {anuncio.ponto_encontro && (
                <div>
                  <dt>Ponto de encontro</dt>
                  <dd>{anuncio.ponto_encontro}</dd>
                </div>
              )}
              <div>
                <dt>Publicado em</dt>
                <dd>
                  <time dateTime={anuncio.criado_em}>{formatData(anuncio.criado_em)}</time>
                </dd>
              </div>
            </dl>

            <div className="item-vendedor">
              <Avatar nome={vendedor.nome} url={vendedor.avatar_url} size={48} />
              <div>
                <strong>{vendedor.nome}</strong>
                <span>
                  {vendedor.curso ? `${vendedor.curso} · ` : ''}
                  {vendedor.total_anuncios} {vendedor.total_anuncios === 1 ? 'anúncio' : 'anúncios'} · desde{' '}
                  {membroDesde}
                </span>
              </div>
            </div>

            <div className="item-acoes">
              <button className="btn btn-primary" onClick={() => setContato(true)}>
                Tenho interesse
              </button>
              <button className="btn btn-secondary" onClick={compartilhar}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
                  <circle cx="17.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="2" />
                  <circle cx="17.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="2" />
                  <path d="M8.3 10.8l7-4M8.3 13.2l7 4" stroke="currentColor" strokeWidth="2" />
                </svg>
                Compartilhar
              </button>
            </div>
          </section>
        </div>

        {relacionados.length > 0 && (
          <section className="item-relacionados" aria-labelledby="relacionados-title">
            <h2 id="relacionados-title">Mais em {anuncio.categoria}</h2>
            <div className="item-relacionados-grid">
              {relacionados.map((rel) => (
                <AnuncioCard key={rel.id} anuncio={rel} />
              ))}
            </div>
          </section>
        )}
      </div>

      <Modal open={contato} onClose={() => setContato(false)} title="Combinar com o vendedor">
        <div className="contato-modal">
          <Avatar nome={vendedor.nome} url={vendedor.avatar_url} size={56} />
          <p>
            Fale com <strong>{vendedor.nome}</strong> pelo email e combinem
            {anuncio.ponto_encontro ? ` no ponto sugerido: ${anuncio.ponto_encontro}.` : ' um ponto no campus.'}
          </p>
          <a className="btn btn-primary" href={`mailto:${vendedor.email}?subject=${encodeURIComponent(`Interesse: ${anuncio.titulo} (DesapegoUni)`)}`}>
            Enviar email
          </a>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(vendedor.email);
              toast('success', 'Email copiado!');
            }}
          >
            Copiar email: {vendedor.email}
          </button>
        </div>
      </Modal>

      <Footer />
    </>
  );
}
