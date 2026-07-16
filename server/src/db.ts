import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'desapego.db'));

/**
 * Schema v2 (auth + galeria + ficha técnica).
 * Migração: o schema v1 usava usuario_id TEXT anônimo — sem como mapear
 * para contas reais, então v1→v2 recria o banco e re-semeia (documentado
 * no README). PRAGMA user_version controla a versão.
 */
const CURRENT_SCHEMA = 2;
const version = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;

if (version < CURRENT_SCHEMA) {
  db.exec(`
    DROP TABLE IF EXISTS anuncio_imagens;
    DROP TABLE IF EXISTS anuncios;
    DROP TABLE IF EXISTS usuarios;
  `);
  db.exec(`PRAGMA user_version = ${CURRENT_SCHEMA}`);
}

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS usuarios (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    senha_hash  TEXT    NOT NULL,
    curso       TEXT,
    campus      TEXT,
    avatar_url  TEXT,
    criado_em   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS anuncios (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo             TEXT    NOT NULL,
    descricao          TEXT    NOT NULL,
    categoria          TEXT    NOT NULL,
    tipo               TEXT    NOT NULL CHECK (tipo IN ('doacao', 'venda')),
    preco              REAL,
    imagem_url         TEXT,
    estado_conservacao TEXT    NOT NULL DEFAULT 'usado'
                       CHECK (estado_conservacao IN ('novo', 'seminovo', 'usado', 'com_marcas')),
    campus             TEXT,
    ponto_encontro     TEXT,
    aceita_trocas      INTEGER NOT NULL DEFAULT 0,
    usuario_id         INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    criado_em          TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_anuncios_categoria ON anuncios (categoria);
  CREATE INDEX IF NOT EXISTS idx_anuncios_usuario   ON anuncios (usuario_id);

  CREATE TABLE IF NOT EXISTS anuncio_imagens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    anuncio_id INTEGER NOT NULL REFERENCES anuncios(id) ON DELETE CASCADE,
    url        TEXT    NOT NULL,
    ordem      INTEGER NOT NULL DEFAULT 0,
    capa       INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_imagens_anuncio ON anuncio_imagens (anuncio_id);
`);

// Migração aditiva (não destrutiva): coluna google_id para contas via Google
const cols = db.prepare('PRAGMA table_info(usuarios)').all() as { name: string }[];
if (!cols.some((c) => c.name === 'google_id')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN google_id TEXT');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_google ON usuarios (google_id)');
}
if (!cols.some((c) => c.name === 'matricula')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN matricula TEXT');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_matricula ON usuarios (matricula)');
}

// Migração de dados: nomes antigos de campus → lista atual
db.exec(`
  UPDATE anuncios SET campus = 'Campus' WHERE campus IN ('Campus Central', 'Campus Norte', 'Campus Sul');
  UPDATE anuncios SET campus = 'EAD'    WHERE campus = 'Polo EAD';
  UPDATE usuarios SET campus = 'Campus' WHERE campus IN ('Campus Central', 'Campus Norte', 'Campus Sul');
  UPDATE usuarios SET campus = 'EAD'    WHERE campus = 'Polo EAD';
`);

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
  criado_em: string;
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
