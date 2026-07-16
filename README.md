# ♻️ DesapegaUnifor

Marketplace de **economia circular do campus** — estudantes doam e vendem livros, calculadoras, jalecos, eletrônicos e móveis entre si. Desenvolvido para o Desafio Técnico do **Laboratório Vortex (UNIFOR)**, com identidade visual inspirada no próprio [vortex.unifor.br](https://vortex.unifor.br/).

**Funcionalidades:** contas com JWT e login com Google · cadastro com email institucional (@edu.unifor.br) e matrícula · upload real de fotos (até 5 por anúncio, com compressão no cliente) · página de detalhe com galeria · cadastro de item em 3 etapas com rascunho automático · busca/ordenação/paginação sincronizadas com a URL · edição e remoção de anúncios · perfil com avatar · PWA instalável com cache offline.

## Stack

| Camada | Tecnologias |
|---|---|
| Backend | Node.js + Express + TypeScript, PostgreSQL (Supabase) via `pg`, bcryptjs, jsonwebtoken, multer |
| Frontend | React 18 + TypeScript + Vite, React Router |
| Animação | GSAP (ScrollTrigger, timelines) + anime.js (microinterações) |
| PWA | `manifest.webmanifest` + Service Worker artesanal (network-first p/ API, stale-while-revalidate p/ assets e uploads) |

## Como rodar localmente

Pré-requisitos: **Node.js 22+** e um projeto no **Supabase** (banco PostgreSQL gratuito).

**Banco (uma vez):** no SQL Editor do Supabase, rode [`server/db/supabase-schema.sql`](server/db/supabase-schema.sql) e depois [`server/db/supabase-seed.sql`](server/db/supabase-seed.sql). Em seguida crie `server/.env`:

```env
DATABASE_URL=postgresql://postgres.SEU_REF:SUA_SENHA@aws-0-REGIAO.pooler.supabase.com:5432/postgres
JWT_SECRET=um_valor_aleatorio_longo
```

> A connection string fica em **Connect → Session pooler** no dashboard do Supabase.

```bash
# 1. Backend (porta 3001)
cd server
npm install
npm start          # conecta no Supabase (exige server/.env configurado)

# 2. Frontend (porta 5173) — em outro terminal
cd web
npm install
npm run dev        # o Vite faz proxy de /api e /uploads para localhost:3001
```

Abra `http://localhost:5173`.

### Contas de teste (seed)

| Email | Senha | Matrícula |
|---|---|---|
| `ana@edu.unifor.br` | `senha123` | 2311001 |
| `bruno@edu.unifor.br` | `senha123` | 2211002 |
| `carla@edu.unifor.br` | `senha123` | 2111003 |

> O cadastro exige email institucional `nome@edu.unifor.br` e matrícula de 7 dígitos. Campi disponíveis: Campus, EAD, Polo da Medicina e Polo da Medicina Veterinária.

### Login com Google (opcional)

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie um **OAuth Client ID** (tipo "Aplicativo da Web") com `http://localhost:5173` nas *origens JavaScript autorizadas*.
2. Copie `server/.env.example` para `server/.env` e `web/.env.example` para `web/.env`, preenchendo `GOOGLE_CLIENT_ID` e `VITE_GOOGLE_CLIENT_ID` com o mesmo Client ID.
3. Reinicie os dois servidores. Sem configuração, o botão explica como ativar (o restante do app funciona normalmente).

### Para testar o PWA (o Service Worker só registra em produção)

```bash
cd web
npm run build
npm run preview    # instale pelo ícone na barra de endereço
```

## Rotas da API (JSON estrito)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/auth/registro` | — | Cria conta (email @edu.unifor.br + matrícula 7 dígitos) → 201 + JWT |
| POST | `/api/auth/login` | — | Login → JWT 7d (rate-limit: 5/min por email) |
| POST | `/api/auth/google` | — | Login com Google (valida ID token + `aud`) |
| GET | `/api/auth/me` | Bearer | Perfil + estatísticas próprias |
| PATCH | `/api/auth/me` | Bearer | Editar nome/curso/campus/avatar/matrícula |
| POST | `/api/upload` | Bearer | Upload de imagem (magic bytes, máx 5MB) → `{url}` |
| GET | `/api/anuncios?q=&categoria=&tipo=&sort=&page=&per_page=&usuario=me` | opcional | Lista com busca, filtros, ordenação e paginação (`total`, `has_more`) |
| GET | `/api/anuncios/:id` | — | Detalhe + imagens + vendedor + relacionados |
| POST | `/api/anuncios` | Bearer | Cria anúncio (validação por campo → 422) |
| PATCH | `/api/anuncios/:id` | Bearer (dono) | Edita anúncio (403 se não for o dono) |
| DELETE | `/api/anuncios/:id` | Bearer (dono) | Remove anúncio + arquivos de imagem |
| GET | `/api/stats` | — | Estatísticas da landing |
| GET | `/api/categorias` | — | Categorias, campi e estados de conservação |

## Identidade visual

Paleta extraída do CSS de produção de vortex.unifor.br: fundo `#170D29` (dark purple), superfícies `#1D1946`/`#36225D`, ação `#6F4BEF` (light purple), destaque/CTA `#12CEE4` (light blue), erro derivado de `#FF073A`. Tons claros/escuros para hover, disabled e texto foram derivados mantendo contraste WCAG AA e vivem todos em [`web/src/styles/tokens.css`](web/src/styles/tokens.css) — nenhum componente usa cor solta.

## 🤖 Diário de Bordo da IA

**Ferramentas utilizadas:** Claude (Claude Code, modelo Fable 5) como par de desenvolvimento durante todo o projeto — arquitetura, design system, implementação e testes guiados por prompts; skill de design `ui-ux-pro-max` (banco de estilos/paletas/heurísticas) consultada pelo próprio agente; Supabase como banco PostgreSQL gerenciado.

**Estratégia de engenharia de prompts (exemplos reais usados neste projeto):**

1. **Design system com papel + ferramentas + princípios + formato de resposta:** "Você é um Diretor de Produto e Design de nível internacional… INVOQUE a skill ui-ux-pro-max e apresente o SISTEMA DE DESIGN escolhido (estilo + paleta HEX + fontes + tokens), justificando cada escolha… GSAP (ScrollTrigger, timelines) como motor principal; anime.js para microinterações… PRINCÍPIOS INEGOCIÁVEIS: clareza, design system primeiro, movimento com propósito, WCAG AA, mobile-first… Padrão de qualidade: candidato a Awwwards." — Estruturar o pedido em papel/contexto/princípios/formato rendeu um resultado muito mais coeso do que "faça um site bonito".
2. **Evolução guiada por épicos com restrições explícitas:** "Você é um Tech Lead Full-Stack sênior… Você está evoluindo um projeto EXISTENTE — não reescreva do zero… MISSÃO — 6 ÉPICOS, NESTA ORDEM: (1) autenticação JWT com bcrypt e rate-limit, (2) upload real com validação por magic bytes e compressão client-side, (3) página de detalhe com galeria, (4) wizard de 3 etapas com rascunho em localStorage, (5) busca+paginação sincronizadas com a URL, (6) acabamento… RESTRIÇÕES INEGOCIÁVEIS: não trocar de stack, usar os tokens existentes, mensagens de erro com causa + como resolver, build limpo, testar de fato e reportar o que foi verificado."
3. **Rebrand com fonte de verdade externa:** "Mude toda a paleta de cores para replicar a identidade visual do site vortex.unifor.br: analise as cores predominantes, extraia os códigos hexadecimais, aplique nas variáveis CSS mantendo contraste AA e gere paleta secundária para hover/disabled." — A IA baixou o CSS/JS de produção do site, extraiu as variáveis reais (`--dark-purple #170D29`, `--light-purple #6F4BEF`, `--light-blue #12CEE4`…) e derivou os tons intermediários com contraste verificado.

4. **Migração de banco em duas fases:** "Quero o banco de dados no Supabase, vou criar o projeto do Supabase e do GitHub, enquanto isso vai gerando os DDLs." — Separar a geração dos DDLs (schema Postgres com CHECKs, índices e RLS + seed idempotente) da migração do código permitiu trabalhar em paralelo: quando o projeto ficou pronto, a IA validou a conexão, reescreveu a camada de dados de `node:sqlite` para `pg` (rotas assíncronas, transações, parsers de bigint/numeric) e testou o fluxo completo contra o banco real antes de commitar.

**Reflexão crítica (momentos em que a IA errou e como foi corrigida):**
1. A primeira sugestão de paleta da skill de design veio **rose/vermelho com serifas "acadêmicas"** — inadequada para um marketplace de sustentabilidade mobile-first. Foi preciso rejeitar a recomendação automática e refinar a busca com termos melhores até chegar a uma paleta com contraste AA.
2. Os números das estatísticas ficavam **travados em "0"** quando o usuário tinha `prefers-reduced-motion` ativo: a implementação inicial só escrevia o valor no fim da animação de count-up. O correto (identificado num screenshot de verificação) é renderizar o valor final imediatamente e tratar a animação como aprimoramento progressivo.
3. Ao gerar uma função de sanitização, a IA escreveu **bytes de controle literais dentro da regex** — o arquivo passou a ser tratado como binário pelo grep e quebraria em vários editores. Detectado ao rodar o typecheck/busca e corrigido reescrevendo a regex com escapes unicode explícitos.
4. Ao mover variáveis de ambiente que estavam no arquivo errado (`web/.env` em vez de `server/.env`), um script gerado pela IA **falhou no meio da execução e apagou o conteúdo dos dois arquivos** — incluindo a connection string do banco. A recuperação veio do histórico local do VS Code (`%APPDATA%/Code/User/History`). Lição dupla: scripts que movem dados devem escrever o destino **antes** de limpar a origem, e segredos de servidor nunca ficam na pasta do frontend (no Vite, variáveis `VITE_*` vão parar no bundle do navegador).

**Compartilhamento de histórico:** _[opcional — cole aqui o link público da conversa]_

## Estrutura

```
server/                    API RESTful (Express + PostgreSQL/Supabase)
  src/index.ts             bootstrap + headers de segurança + estáticos /uploads
  src/env.ts               carrega server/.env antes dos demais módulos
  src/db.ts                pool pg + helpers de query
  db/                      DDL do schema e seed (SQL do Supabase)
  src/auth.ts              JWT, requireAuth/optionalAuth, rate-limit de login
  src/routes-auth.ts       /api/auth (registro, login, google, me)
  src/routes.ts            /api/anuncios (CRUD + busca + paginação) e /api/stats
  src/upload.ts            /api/upload (multer + magic bytes) + limpeza de arquivos
  src/validate.ts          validação espelhada no frontend
web/                       Frontend PWA (React + TS + Vite)
  src/styles/tokens.css    design tokens (paleta Vortex, tipografia, motion)
  src/context/AuthContext  sessão JWT (hidratação via /me)
  src/components/          Hero, Vitrine, ImageUploader, Modal, UserMenu, GoogleButton…
  src/pages/               Landing, Item, Anunciar (wizard), Entrar, Cadastro, Perfil…
  public/sw.js             Service Worker v2 (cache offline)
```
