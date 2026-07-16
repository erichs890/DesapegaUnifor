import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL não definida. Crie server/.env com a connection string do Supabase (veja o README).'
  );
}

/**
 * Parsers: por padrão o driver pg devolve bigint (OID 20) e numeric (OID 1700)
 * como STRING para não perder precisão. Nossos IDs e preços cabem folgados em
 * number — convertemos para manter o mesmo contrato JSON de antes.
 */
pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // bigint (ids, count)
pg.types.setTypeParser(1700, (v) => parseFloat(v)); // numeric (preco)

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase exige TLS; pooler usa cert próprio
  max: 10,
});

/** Query tipada: retorna as linhas. */
export async function q<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/** Primeira linha ou null. */
export async function one<T>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

export const CATEGORIAS = [
  'Livros',
  'Engenharia',
  'Computação',
  'Eletrônicos',
  'Vestuário',
  'Móveis',
  'Outros',
] as const;

export const CAMPI = ['Campus', 'EAD', 'Polo da Medicina', 'Polo da Medicina Veterinária'] as const;

export const ESTADOS_CONSERVACAO = ['novo', 'seminovo', 'usado', 'com_marcas'] as const;

export type Categoria = (typeof CATEGORIAS)[number];
export type EstadoConservacao = (typeof ESTADOS_CONSERVACAO)[number];

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
  curso: string | null;
  campus: string | null;
  avatar_url: string | null;
  google_id: string | null;
  matricula: string | null;
  criado_em: string; // timestamptz — serializado como ISO no JSON
}

/** Campos públicos de um usuário — únicos que podem sair pela API. */
export function publicUser(u: Usuario) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    curso: u.curso,
    campus: u.campus,
    avatar_url: u.avatar_url,
    criado_em: u.criado_em,
  };
}

export interface Anuncio {
  id: number;
  titulo: string;
  descricao: string;
  categoria: Categoria;
  tipo: 'doacao' | 'venda';
  preco: number | null;
  imagem_url: string | null;
  estado_conservacao: EstadoConservacao;
  campus: string | null;
  ponto_encontro: string | null;
  aceita_trocas: number;
  usuario_id: number;
  criado_em: string;
}

export interface AnuncioImagem {
  id: number;
  anuncio_id: number;
  url: string;
  ordem: number;
  capa: number;
}
