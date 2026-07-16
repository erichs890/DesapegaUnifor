import { CATEGORIAS, CAMPI, ESTADOS_CONSERVACAO, type EstadoConservacao } from './db.js';

export interface AnuncioInput {
  titulo: string;
  descricao: string;
  categoria: string;
  tipo: 'doacao' | 'venda';
  preco: number | null;
  estado_conservacao: EstadoConservacao;
  campus: string | null;
  ponto_encontro: string | null;
  aceita_trocas: 0 | 1;
  imagens: string[];
}

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
  data?: AnuncioInput;
}

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isImageUrl = (value: string): boolean => value.startsWith('/uploads/') || isHttpUrl(value);

/** Sanitiza: remove caracteres de controle, apara e limita tamanho. */
const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max) : '';

export function validateAnuncio(body: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  const raw = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;

  const titulo = clean(raw.titulo, 100);
  if (!titulo) errors.titulo = 'O título é obrigatório.';
  else if (titulo.length < 3) errors.titulo = 'O título precisa de pelo menos 3 caracteres.';
  else if (titulo.length > 80) errors.titulo = 'O título pode ter no máximo 80 caracteres.';

  const descricao = clean(raw.descricao, 600);
  if (!descricao) errors.descricao = 'A descrição é obrigatória.';
  else if (descricao.length < 10) errors.descricao = 'Descreva o item com pelo menos 10 caracteres.';
  else if (descricao.length > 500) errors.descricao = 'A descrição pode ter no máximo 500 caracteres.';

  const categoria = clean(raw.categoria, 40);
  if (!CATEGORIAS.includes(categoria as (typeof CATEGORIAS)[number])) {
    errors.categoria = `Categoria inválida. Use uma de: ${CATEGORIAS.join(', ')}.`;
  }

  const tipo = raw.tipo;
  if (tipo !== 'doacao' && tipo !== 'venda') {
    errors.tipo = "O tipo deve ser 'doacao' ou 'venda'.";
  }

  let preco: number | null = null;
  if (tipo === 'venda') {
    const num = typeof raw.preco === 'string' ? Number(raw.preco) : raw.preco;
    if (typeof num !== 'number' || Number.isNaN(num)) {
      errors.preco = 'Informe um preço numérico para itens à venda.';
    } else if (num <= 0) {
      errors.preco = 'O preço deve ser maior que zero.';
    } else if (num > 100_000) {
      errors.preco = 'O preço máximo permitido é R$ 100.000.';
    } else {
      preco = Math.round(num * 100) / 100;
    }
  }

  const estadoRaw = clean(raw.estado_conservacao, 20) || 'usado';
  if (!ESTADOS_CONSERVACAO.includes(estadoRaw as EstadoConservacao)) {
    errors.estado_conservacao = `Estado inválido. Use: ${ESTADOS_CONSERVACAO.join(', ')}.`;
  }

  let campus: string | null = null;
  if (raw.campus !== undefined && raw.campus !== null && raw.campus !== '') {
    const c = clean(raw.campus, 60);
    if (!CAMPI.includes(c as (typeof CAMPI)[number])) {
      errors.campus = `Campus inválido. Use um de: ${CAMPI.join(', ')}.`;
    } else campus = c;
  }

  const ponto_encontro = clean(raw.ponto_encontro, 80) || null;
  if (ponto_encontro && ponto_encontro.length < 3) {
    errors.ponto_encontro = 'O ponto de encontro precisa de pelo menos 3 caracteres.';
  }

  // doação nunca aceita trocas — a flag só vale para venda
  const aceita_trocas: 0 | 1 =
    tipo === 'venda' && (raw.aceita_trocas === true || raw.aceita_trocas === 1) ? 1 : 0;

  let imagens: string[] = [];
  if (raw.imagens !== undefined) {
    if (!Array.isArray(raw.imagens)) {
      errors.imagens = 'O campo imagens deve ser uma lista de URLs.';
    } else if (raw.imagens.length > 5) {
      errors.imagens = 'No máximo 5 imagens por anúncio.';
    } else {
      imagens = raw.imagens.filter((u): u is string => typeof u === 'string').map((u) => u.trim()).filter(Boolean);
      if (imagens.some((u) => !isImageUrl(u))) {
        errors.imagens = 'Cada imagem deve ser um upload da plataforma ou uma URL http(s).';
      }
    }
  }
  // retrocompatibilidade com o campo antigo imagem_url
  if (imagens.length === 0 && typeof raw.imagem_url === 'string' && raw.imagem_url.trim() !== '') {
    const url = raw.imagem_url.trim();
    if (!isImageUrl(url)) errors.imagem_url = 'A URL da imagem deve começar com http:// ou https://.';
    else imagens = [url];
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: {},
    data: {
      titulo,
      descricao,
      categoria,
      tipo: tipo as 'doacao' | 'venda',
      preco,
      estado_conservacao: estadoRaw as EstadoConservacao,
      campus,
      ponto_encontro,
      aceita_trocas,
      imagens,
    },
  };
}
