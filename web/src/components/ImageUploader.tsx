import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { uploadImagem, ApiError } from '../lib/api';
import './ImageUploader.css';

export interface UploaderImage {
  /** URL final (após upload) — é o que vai no payload do anúncio. */
  url: string;
}

interface PendingFile {
  id: string;
  name: string;
  preview: string;
  progress: number;
  error: string | null;
  file: Blob;
}

interface Props {
  value: UploaderImage[];
  onChange: (imgs: UploaderImage[]) => void;
  /** Notifica quando há uploads em andamento (para o pai travar o "Publicar"). */
  onBusyChange?: (busy: boolean) => void;
  max?: number;
}

const MAX_DIM = 1600;
const QUALITY = 0.85;
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Compressão client-side (canvas): redimensiona para máx 1600px e re-encoda
 * JPEG q=0.85. Uma foto de celular de 4-8MB vira ~300-600KB — menos banda
 * no upload, menos storage no servidor e carregamento mais rápido na vitrine.
 */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // formato que o browser não decodifica — envia original
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 800 * 1024) return file; // já é pequena

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', QUALITY);
  });
}

let uid = 0;

export function ImageUploader({ value, onChange, onBusyChange, max = 5 }: Props) {
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const total = value.length + pending.length;
  const slotsLeft = max - total;

  // "ocupado" = existe upload realmente em andamento (erros não travam o Publicar)
  const busy = pending.some((p) => p.error === null);
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false); // unmount não pode deixar o pai travado
  }, [busy, onBusyChange]);

  // ref para evitar closures com value desatualizado durante uploads paralelos
  const valueRef = useRef(value);
  valueRef.current = value;

  const startUpload = useCallback(
    (item: PendingFile) => {
      uploadImagem(item.file, (pct) =>
        setPending((prev) => prev.map((p) => (p.id === item.id ? { ...p, progress: pct } : p)))
      )
        .then((url) => {
          setPending((prev) => prev.filter((p) => p.id !== item.id));
          URL.revokeObjectURL(item.preview);
          onChange([...valueRef.current, { url }]);
        })
        .catch((err) => {
          setPending((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? { ...p, error: err instanceof ApiError ? err.message : 'Falha no upload.', progress: 0 }
                : p
            )
          );
        });
    },
    [onChange]
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).slice(0, Math.max(slotsLeft, 0));
      for (const file of list) {
        if (!ACCEPT.includes(file.type)) {
          const bad: PendingFile = {
            id: `p${uid++}`,
            name: file.name,
            preview: '',
            progress: 0,
            error: 'Formato não suportado — use JPG, PNG ou WebP.',
            file,
          };
          setPending((prev) => [...prev, bad]);
          continue;
        }
        const blob = await compress(file);
        if (blob.size > 5 * 1024 * 1024) {
          setPending((prev) => [
            ...prev,
            { id: `p${uid++}`, name: file.name, preview: '', progress: 0, error: 'Mesmo comprimida, passa de 5MB. Escolha outra foto.', file: blob },
          ]);
          continue;
        }
        const item: PendingFile = {
          id: `p${uid++}`,
          name: file.name,
          preview: URL.createObjectURL(blob),
          progress: 0,
          error: null,
          file: blob,
        };
        setPending((prev) => [...prev, item]);
        startUpload(item);
      }
    },
    [slotsLeft, startUpload]
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + dir, 0, item);
    onChange(next);
  };

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const addUrl = () => {
    const url = urlInput.trim();
    if (!/^https?:\/\/\S+/.test(url)) {
      setUrlError('Cole uma URL completa, começando com http:// ou https://.');
      return;
    }
    if (slotsLeft <= 0) {
      setUrlError(`Máximo de ${max} imagens por anúncio.`);
      return;
    }
    setUrlError(null);
    setUrlInput('');
    onChange([...value, { url }]);
  };

  return (
    <div className="uploader">
      <div className="uploader-tabs" role="tablist" aria-label="Como adicionar fotos">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'upload'}
          className={tab === 'upload' ? 'active' : ''}
          onClick={() => setTab('upload')}
        >
          Enviar fotos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'url'}
          className={tab === 'url' ? 'active' : ''}
          onClick={() => setTab('url')}
        >
          Usar URL
        </button>
      </div>

      {tab === 'upload' && (
        <div
          className={`dropzone${dragOver ? ' over' : ''}${slotsLeft <= 0 ? ' full' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT.join(',')}
            multiple
            onChange={onPick}
            disabled={slotsLeft <= 0}
            className="visually-hidden"
          />
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p>
            <label htmlFor={inputId} className="dropzone-cta">
              Escolher fotos
            </label>{' '}
            ou arraste aqui
          </p>
          <span className="field-help">
            {slotsLeft > 0
              ? `Até ${slotsLeft} foto${slotsLeft > 1 ? 's' : ''} · JPG, PNG ou WebP · máx 5MB cada`
              : `Limite de ${max} fotos atingido — remova uma para adicionar outra.`}
          </span>
        </div>
      )}

      {tab === 'url' && (
        <div className="field">
          <label htmlFor="url-imagem">URL da imagem</label>
          <div className="uploader-url-row">
            <input
              id="url-imagem"
              type="url"
              inputMode="url"
              placeholder="https://exemplo.com/foto.jpg"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setUrlError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addUrl();
                }
              }}
              aria-invalid={!!urlError}
            />
            <button type="button" className="btn btn-secondary" onClick={addUrl}>
              Adicionar
            </button>
          </div>
          {urlError && (
            <p className="field-error" role="alert">
              {urlError}
            </p>
          )}
        </div>
      )}

      {(value.length > 0 || pending.length > 0) && (
        <ul className="uploader-grid" aria-label="Fotos do anúncio">
          {value.map((img, i) => (
            <li key={img.url} className="uploader-thumb">
              <img src={img.url} alt={`Foto ${i + 1} do anúncio`} loading="lazy" />
              {i === 0 && <span className="thumb-capa">Capa</span>}
              <div className="thumb-actions">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Mover foto ${i + 1} para a esquerda`}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remover foto ${i + 1}`}
                  className="thumb-remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label={`Mover foto ${i + 1} para a direita`}
                >
                  ›
                </button>
              </div>
            </li>
          ))}

          {pending.map((p) => (
            <li key={p.id} className={`uploader-thumb pending${p.error ? ' has-error' : ''}`}>
              {p.preview ? <img src={p.preview} alt="" /> : <div className="thumb-placeholder" />}
              {p.error ? (
                <div className="thumb-error">
                  <span>{p.error}</span>
                  <div className="thumb-error-actions">
                    {p.preview && (
                      <button type="button" onClick={() => { setPending((prev) => prev.map((x) => (x.id === p.id ? { ...x, error: null } : x))); startUpload(p); }}>
                        Tentar de novo
                      </button>
                    )}
                    <button type="button" onClick={() => setPending((prev) => prev.filter((x) => x.id !== p.id))}>
                      Descartar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="thumb-progress" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Enviando ${p.name}`}>
                  <div className="thumb-progress-bar" style={{ width: `${p.progress}%` }} />
                  <span>{p.progress}%</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
