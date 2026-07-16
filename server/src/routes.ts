import { Router, type Response } from 'express';
import { db, CATEGORIAS, CAMPI, ESTADOS_CONSERVACAO, publicUser, type Anuncio, type AnuncioImagem, type Usuario } from './db.js';
import { validateAnuncio, type AnuncioInput } from './validate.js';
import { requireAuth, optionalAuth, type AuthRequest } from './auth.js';
import { deleteLocalImages } from './upload.js';

export const router = Router();

/* ---------------- helpers ---------------- */

interface AnuncioComVendedor extends Anuncio {
  vendedor_nome: string;
  vendedor_avatar: string | null;
}

const LIST_SELECT = `
  SELECT a.*, u.nome AS vendedor_nome, u.avatar_url AS vendedor_avatar
  FROM anuncios a
  JOIN usuarios u ON u.id = a.usuario_id
`;

function imagensDe(anuncioId: number): AnuncioImagem[] {
  return db
    .prepare('SELECT * FROM anuncio_imagens WHERE anuncio_id = ? ORDER BY ordem ASC, id ASC')
    .all(anuncioId) as unknown as AnuncioImagem[];
}

function salvarImagens(anuncioId: number, urls: string[]): void {
  const insert = db.prepare(
    'INSERT INTO anuncio_imagens (anuncio_id, url, ordem, capa) VALUES (?, ?, ?, ?)'
  );
  urls.forEach((url, i) => insert.run(anuncioId, url, i, i === 0 ? 1 : 0));
  db.prepare('UPDATE anuncios SET imagem_url = ? WHERE id = ?').run(urls[0] ?? null, anuncioId);
}

function persistir(data: AnuncioInput, id: number | null, userId: number): Anuncio {
  if (id === null) {
    const info = db
      .prepare(
        `INSERT INTO anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao,
                               campus, ponto_encontro, aceita_trocas, usuario_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.titulo, data.descricao, data.categoria, data.tipo, data.preco,
        data.estado_conservacao, data.campus, data.ponto_encontro, data.aceita_trocas, userId
      );
    id = Number(info.lastInsertRowid);
  } else {
    // edição: apaga do disco as imagens locais que saíram da lista
    const antigas = imagensDe(id).map((i) => i.url);
    const removidas = antigas.filter((u) => !data.imagens.includes(u));
    deleteLocalImages(removidas);
    db.prepare('DELETE FROM anuncio_imagens WHERE anuncio_id = ?').run(id);
    db.prepare(
      `UPDATE anuncios SET titulo = ?, descricao = ?, categoria = ?, tipo = ?, preco = ?,
        estado_conservacao = ?, campus = ?, ponto_encontro = ?, aceita_trocas = ? WHERE id = ?`
    ).run(
      data.titulo, data.descricao, data.categoria, data.tipo, data.preco,
      data.estado_conservacao, data.campus, data.ponto_encontro, data.aceita_trocas, id
    );
  }
  salvarImagens(id, data.imagens);
  return db.prepare('SELECT * FROM anuncios WHERE id = ?').get(id) as unknown as Anuncio;
}

/* ---------------- rotas ---------------- */

// GET /api/categorias — listas fixas usadas pelo frontend
router.get('/categorias', (_req, res: Response) => {
  res.json({ categorias: CATEGORIAS, campi: CAMPI, estados_conservacao: ESTADOS_CONSERVACAO });
});

// GET /api/anuncios?categoria=&tipo=&q=&usuario=me&sort=&page=&per_page=
router.get('/anuncios', optionalAuth, (req: AuthRequest, res: Response) => {
  const { categoria, tipo, q, usuario, sort } = req.query;
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (typeof categoria === 'string' && categoria !== '') {
    where.push('a.categoria = ?');
    params.push(categoria);
  }
  if (tipo === 'doacao' || tipo === 'venda') {
    where.push('a.tipo = ?');
    params.push(tipo);
  }
  if (typeof q === 'string' && q.trim() !== '') {
    where.push('(a.titulo LIKE ? OR a.descricao LIKE ?)');
    const like = `%${q.trim().slice(0, 80)}%`;
    params.push(like, like);
  }
  if (typeof usuario === 'string' && usuario !== '') {
    if (usuario === 'me') {
      if (!req.user) {
        return res.status(401).json({ error: 'Entre na sua conta para ver os seus anúncios.' });
      }
      where.push('a.usuario_id = ?');
      params.push(req.user.id);
    } else {
      where.push('a.usuario_id = ?');
      params.push(Number(usuario) || 0);
    }
  }

  const orderBy =
    sort === 'preco_asc'
      ? 'a.tipo ASC, a.preco ASC' // doações (preço nulo) primeiro, depois mais barato
      : sort === 'preco_desc'
        ? 'a.preco DESC NULLS LAST'
        : 'a.criado_em DESC, a.id DESC';

  const perPage = Math.min(Math.max(Number(req.query.per_page) || 12, 1), 48);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) AS n FROM anuncios a ${whereSql}`).all(...params)[0] as { n: number }
  ).n;

  const anuncios = db
    .prepare(`${LIST_SELECT} ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, perPage, (page - 1) * perPage) as unknown as AnuncioComVendedor[];

  res.json({ anuncios, total, page, per_page: perPage, has_more: page * perPage < total });
});

// GET /api/anuncios/:id — detalhe: imagens + vendedor + relacionados
router.get('/anuncios/:id', (req, res: Response) => {
  const id = Number(req.params.id);
  const anuncio = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(id) as unknown as
    | Anuncio
    | undefined;
  if (!anuncio) return res.status(404).json({ error: 'Anúncio não encontrado.' });

  const dono = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(anuncio.usuario_id) as unknown as Usuario;
  const totalDoVendedor = (
    db.prepare('SELECT COUNT(*) AS n FROM anuncios WHERE usuario_id = ?').get(dono.id) as { n: number }
  ).n;

  const relacionados = db
    .prepare(`${LIST_SELECT} WHERE a.categoria = ? AND a.id != ? ORDER BY a.criado_em DESC LIMIT 4`)
    .all(anuncio.categoria, id) as unknown as AnuncioComVendedor[];

  res.json({
    anuncio: { ...anuncio, imagens: imagensDe(id) },
    vendedor: { ...publicUser(dono), total_anuncios: totalDoVendedor },
    relacionados,
  });
});

// POST /api/anuncios — autenticado; dono = quem publica
router.post('/anuncios', requireAuth, (req: AuthRequest, res: Response) => {
  const result = validateAnuncio(req.body);
  if (!result.ok || !result.data) {
    return res.status(422).json({ error: 'Confira os campos destacados.', fields: result.errors });
  }
  const anuncio = persistir(result.data, null, req.user!.id);
  res.status(201).json({ anuncio: { ...anuncio, imagens: imagensDe(anuncio.id) } });
});

// PATCH /api/anuncios/:id — apenas o dono edita
router.patch('/anuncios/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const existente = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(id) as unknown as
    | Anuncio
    | undefined;
  if (!existente) return res.status(404).json({ error: 'Anúncio não encontrado.' });
  if (existente.usuario_id !== req.user!.id) {
    return res.status(403).json({ error: 'Você só pode editar os seus próprios anúncios.' });
  }

  const result = validateAnuncio(req.body);
  if (!result.ok || !result.data) {
    return res.status(422).json({ error: 'Confira os campos destacados.', fields: result.errors });
  }
  const anuncio = persistir(result.data, id, req.user!.id);
  res.json({ anuncio: { ...anuncio, imagens: imagensDe(id) } });
});

// DELETE /api/anuncios/:id — apenas o dono; remove imagens do disco
router.delete('/anuncios/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const anuncio = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(id) as unknown as
    | Anuncio
    | undefined;
  if (!anuncio) return res.status(404).json({ error: 'Anúncio não encontrado.' });
  if (anuncio.usuario_id !== req.user!.id) {
    return res.status(403).json({ error: 'Você só pode remover os seus próprios anúncios.' });
  }

  deleteLocalImages(imagensDe(id).map((i) => i.url));
  db.prepare('DELETE FROM anuncios WHERE id = ?').run(id); // CASCADE apaga as imagens
  res.json({ deleted: true, id });
});

// GET /api/stats — estatísticas para a landing
router.get('/stats', (_req, res: Response) => {
  const total = (db.prepare('SELECT COUNT(*) AS n FROM anuncios').get() as { n: number }).n;
  const doacoes = (db.prepare("SELECT COUNT(*) AS n FROM anuncios WHERE tipo = 'doacao'").get() as { n: number }).n;
  const usuarios = (db.prepare('SELECT COUNT(*) AS n FROM usuarios').get() as { n: number }).n;
  const co2kg = Math.round(total * 2.3); // estimativa: ~2,3kg de CO2 por item que circula

  res.json({
    stats: {
      itens_anunciados: total,
      doacoes,
      estudantes_ativos: usuarios,
      co2_evitado_kg: co2kg,
    },
  });
});
