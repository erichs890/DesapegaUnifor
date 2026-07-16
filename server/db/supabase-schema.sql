-- ============================================================
-- DesapegaUnifor — Schema PostgreSQL (Supabase)
-- Migração do schema v2 (node:sqlite) para Postgres.
-- Aplicar no SQL Editor do Supabase ou via migration.
-- ============================================================

-- ---------- USUÁRIOS ----------
create table if not exists usuarios (
  id          bigint generated always as identity primary key,
  nome        text        not null check (char_length(nome) between 2 and 80),
  email       text        not null,
  senha_hash  text        not null,
  curso       text,
  campus      text        check (campus in ('Campus', 'EAD', 'Polo da Medicina', 'Polo da Medicina Veterinária')),
  avatar_url  text,
  matricula   text        check (matricula ~ '^\d{2}[12]\d{4}$'), -- AA(ano) + S(semestre 1|2) + NNNN
  criado_em   timestamptz not null default now()
);

-- email único case-insensitive (equivale ao COLLATE NOCASE do SQLite)
create unique index if not exists idx_usuarios_email on usuarios (lower(email));
create unique index if not exists idx_usuarios_matricula on usuarios (matricula) where matricula is not null;

-- ---------- ANÚNCIOS ----------
create table if not exists anuncios (
  id                 bigint generated always as identity primary key,
  titulo             text          not null check (char_length(titulo) between 3 and 80),
  descricao          text          not null check (char_length(descricao) between 10 and 500),
  categoria          text          not null check (categoria in
                       ('Livros', 'Engenharia', 'Computação', 'Eletrônicos', 'Vestuário', 'Móveis', 'Outros')),
  tipo               text          not null check (tipo in ('doacao', 'venda')),
  preco              numeric(10,2) check (preco is null or (preco > 0 and preco <= 100000)),
  imagem_url         text,          -- capa (desnormalizada p/ listagem rápida)
  estado_conservacao text          not null default 'usado'
                       check (estado_conservacao in ('novo', 'seminovo', 'usado', 'com_marcas')),
  campus             text          check (campus in ('Campus', 'EAD', 'Polo da Medicina', 'Polo da Medicina Veterinária')),
  ponto_encontro     text          check (ponto_encontro is null or char_length(ponto_encontro) between 3 and 80),
  aceita_trocas      smallint      not null default 0 check (aceita_trocas in (0, 1)),
  usuario_id         bigint        not null references usuarios (id) on delete cascade,
  criado_em          timestamptz   not null default now(),

  -- venda exige preço; doação não tem preço
  constraint preco_por_tipo check (
    (tipo = 'venda' and preco is not null) or (tipo = 'doacao' and preco is null)
  )
);

create index if not exists idx_anuncios_categoria on anuncios (categoria);
create index if not exists idx_anuncios_usuario   on anuncios (usuario_id);
create index if not exists idx_anuncios_criado    on anuncios (criado_em desc, id desc);
create index if not exists idx_anuncios_tipo      on anuncios (tipo);

-- ---------- IMAGENS DO ANÚNCIO ----------
create table if not exists anuncio_imagens (
  id         bigint  generated always as identity primary key,
  anuncio_id bigint  not null references anuncios (id) on delete cascade,
  url        text    not null,
  ordem      integer not null default 0,
  capa       smallint not null default 0 check (capa in (0, 1))
);

create index if not exists idx_imagens_anuncio on anuncio_imagens (anuncio_id, ordem);

-- ---------- RLS ----------
-- A API Express acessa o banco com a connection string (role postgres),
-- que ignora RLS. Habilitar RLS bloqueia acesso acidental via anon key
-- do PostgREST — ninguém lê/escreve direto sem passar pela nossa API.
alter table usuarios        enable row level security;
alter table anuncios        enable row level security;
alter table anuncio_imagens enable row level security;
