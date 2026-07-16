import { Link } from 'react-router-dom';
import type { Anuncio } from '../lib/types';
import { formatData, formatPreco } from '../lib/format';
import './AnuncioCard.css';

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><rect width="640" height="480" fill="#1D1946"/><path d="M270 200h100l20 30h40a10 10 0 0 1 10 10v90a10 10 0 0 1-10 10H210a10 10 0 0 1-10-10v-90a10 10 0 0 1 10-10h40z" fill="none" stroke="#4A3D85" stroke-width="10"/><circle cx="320" cy="290" r="32" fill="none" stroke="#4A3D85" stroke-width="10"/></svg>`
  );

export function AnuncioCard({ anuncio }: { anuncio: Anuncio }) {
  return (
    <Link to={`/item/${anuncio.id}`} className="card" aria-label={`Ver anúncio: ${anuncio.titulo}`}>
      <div className="card-media">
        <img
          src={anuncio.imagem_url ?? FALLBACK}
          alt={anuncio.titulo}
          loading="lazy"
          width={640}
          height={480}
          onError={(e) => {
            e.currentTarget.src = FALLBACK;
          }}
        />
        <span className={`card-price ${anuncio.tipo}`}>
          {anuncio.tipo === 'doacao' ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 20.5s-7.5-4.7-9.3-9.6C1.4 7.3 4 4.5 7 4.5c2 0 3.9 1.2 5 3 1.1-1.8 3-3 5-3 3 0 5.6 2.8 4.3 6.4-1.8 4.9-9.3 9.6-9.3 9.6z"
                  fill="currentColor"
                />
              </svg>
              Doação
            </>
          ) : (
            formatPreco(anuncio.preco ?? 0)
          )}
        </span>
      </div>
      <div className="card-body">
        <span className="card-category">{anuncio.categoria}</span>
        <h3 className="card-title">{anuncio.titulo}</h3>
        <p className="card-desc">{anuncio.descricao}</p>
        <footer className="card-meta">
          <span>{anuncio.vendedor_nome ?? 'Estudante'}</span>
          <time dateTime={anuncio.criado_em}>{formatData(anuncio.criado_em)}</time>
        </footer>
      </div>
    </Link>
  );
}

export function SkeletonCard() {
  return (
    <div className="card" aria-hidden="true">
      <div className="skeleton" style={{ aspectRatio: '4 / 3', borderRadius: 0 }} />
      <div className="card-body">
        <div className="skeleton" style={{ width: '35%', height: 14 }} />
        <div className="skeleton" style={{ width: '80%', height: 20 }} />
        <div className="skeleton" style={{ width: '100%', height: 14 }} />
        <div className="skeleton" style={{ width: '55%', height: 14 }} />
      </div>
    </div>
  );
}
