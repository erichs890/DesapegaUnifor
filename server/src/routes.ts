import { Router, type Response } from 'express';
import {
  q,
  one,
  pool,
  CATEGORIAS,
  CAMPI,
  ESTADOS_CONSERVACAO,
  publicUser,
  type Anuncio,
  type AnuncioImagem,
  type Usuario,
} from './db.js';
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
  select a.*, u.nome as vendedor_nome, u.avatar_url as vendedor_avatar
  from anuncios a
  join usuarios u on u.id = a.usuario_id
`;

function imagensDe(anuncioId: number): Promise<AnuncioImagem[]> {
  return q<AnuncioImagem>(
    'select * from anuncio_imagens where anuncio_id = $1 order by ordem asc, id asc',
    [anuncioId]
  );
}

/** Cria ou atualiza o anúncio + imagens numa transação. */
async function persistir(data: AnuncioInput, id: number | null, userId: number): Promise<Anuncio> {
  const client = await pool.connect();
  try {
    await client.query('begin');

    if (id === null) {
      const created = await client.query(
        `insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao,
                               campus, ponto_encontro, aceita_trocas, usuario_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
        [
          data.titulo, data.descricao, data.categoria, data.tipo, data.preco,
          data.estado_conservacao, data.campus, data.ponto_encontro, data.aceita_trocas, userId,
        ]
      );
      id = created.rows[0].id as number;
    } else {
      // edição: apaga do disco as imagens locais que saíram da lista
      const antigas = await client.query('select url from anuncio_imagens where anuncio_id = $1', [id]);
      const removidas = (antigas.rows as { url: string }[])
        .map((r) => r.url)
        .filter((u) => !data.imagens.includes(u));
      deleteLocalImages(removidas);
      await client.query('delete from anuncio_imagens where anuncio_id = $1', [id]);
      await client.query(
        `update anuncios set titulo = $1, descricao = $2, categoria = $3, tipo = $4, preco = $5,
          estado_conservacao = $6, campus = $7, ponto_encontro = $8, aceita_trocas = $9 where id = $10`,
        [
          data.titulo, data.descricao, data.categoria, data.tipo, data.preco,
          data.estado_conservacao, data.campus, data.ponto_encontro, data.aceita_trocas, id,
        ]
      );
    }

    for (let i = 0; i < data.imagens.length; i++) {
      await client.query(
        'insert into anuncio_imagens (anuncio_id, url, ordem, capa) values ($1, $2, $3, $4)',
        [id, data.imagens[i], i, i === 0 ? 1 : 0]
      );
    }
    await client.query('update anuncios set imagem_url = $1 where id = $2', [data.imagens[0] ?? null, id]);

    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }

  return (await one<Anuncio>('select * from anuncios where id = $1', [id]))!;
}

/* ---------------- rotas ---------------- */

// GET /api/categorias — listas fixas usadas pelo frontend
router.get('/categorias', (_req, res: Response) => {
  res.json({ categorias: CATEGORIAS, campi: CAMPI, estados_conservacao: ESTADOS_CONSERVACAO });
});

// GET /api/anuncios?categoria=&tipo=&q=&usuario=me&sort=&page=&per_page=
router.get('/anuncios', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { categoria, tipo, q: busca, usuario, sort } = req.query;
  const where: string[] = [];
  const params: (string | number)[] = [];
  const arg = (v: string | number) => {
    params.push(v);
    return `$${params.length}`;
  };

  if (typeof categoria === 'string' && categoria !== '') {
    where.push(`a.categoria = ${arg(categoria)}`);
  }
  if (tipo === 'doacao' || tipo === 'venda') {
    where.push(`a.tipo = ${arg(tipo)}`);
  }
  if (typeof busca === 'string' && busca.trim() !== '') {
    const like = `%${busca.trim().slice(0, 80)}%`;
    where.push(`(a.titulo ilike ${arg(like)} or a.descricao ilike ${arg(like)})`);
  }
  if (typeof usuario === 'string' && usuario !== '') {
    if (usuario === 'me') {
      if (!req.user) {
        return res.status(401).json({ error: 'Entre na sua conta para ver os seus anúncios.' });
      }
      where.push(`a.usuario_id = ${arg(req.user.id)}`);
    } else {
      where.push(`a.usuario_id = ${arg(Number(usuario) || 0)}`);
    }
  }

  const orderBy =
    sort === 'preco_asc'
      ? 'a.tipo asc, a.preco asc' // doações (preço nulo) primeiro, depois mais barato
      : sort === 'preco_desc'
        ? 'a.preco desc nulls last'
        : 'a.criado_em desc, a.id desc';

  const perPage = Math.min(Math.max(Number(req.query.per_page) || 12, 1), 48);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const whereSql = where.length ? `where ${where.join(' and ')}` : '';

  const totalRow = await one<{ n: number }>(
    `select count(*)::bigint as n from anuncios a ${whereSql}`,
    params
  );
  const total = totalRow?.n ?? 0;

  const anuncios = await q<AnuncioComVendedor>(
    `${LIST_SELECT} ${whereSql} order by ${orderBy} limit ${arg(perPage)} offset ${arg((page - 1) * perPage)}`,
    params
  );

  res.json({ anuncios, total, page, per_page: perPage, has_more: page * perPage < total });
});

// GET /api/anuncios/:id — detalhe: imagens + vendedor + relacionados
router.get('/anuncios/:id', async (req, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Anúncio não encontrado.' });

  const anuncio = await one<Anuncio>('select * from anuncios where id = $1', [id]);
  if (!anuncio) return res.status(404).json({ error: 'Anúncio não encontrado.' });

  const dono = (await one<Usuario>('select * from usuarios where id = $1', [anuncio.usuario_id]))!;
  const totalRow = await one<{ n: number }>(
    'select count(*)::bigint as n from anuncios where usuario_id = $1',
    [dono.id]
  );

  const relacionados = await q<AnuncioComVendedor>(
    `${LIST_SELECT} where a.categoria = $1 and a.id != $2 order by a.criado_em desc limit 4`,
    [anuncio.categoria, id]
  );

  res.json({
    anuncio: { ...anuncio, imagens: await imagensDe(id) },
    vendedor: { ...publicUser(dono), total_anuncios: totalRow?.n ?? 0 },
    relacionados,
  });
});

// POST /api/anuncios — autenticado; dono = quem publica
router.post('/anuncios', requireAuth, async (req: AuthRequest, res: Response) => {
  const result = validateAnuncio(req.body);
  if (!result.ok || !result.data) {
    return res.status(422).json({ error: 'Confira os campos destacados.', fields: result.errors });
  }
  const anuncio = await persistir(result.data, null, req.user!.id);
  res.status(201).json({ anuncio: { ...anuncio, imagens: await imagensDe(anuncio.id) } });
});

// PATCH /api/anuncios/:id — apenas o dono edita
router.patch('/anuncios/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const existente = await one<Anuncio>('select * from anuncios where id = $1', [id]);
  if (!existente) return res.status(404).json({ error: 'Anúncio não encontrado.' });
  if (existente.usuario_id !== req.user!.id) {
    return res.status(403).json({ error: 'Você só pode editar os seus próprios anúncios.' });
  }

  const result = validateAnuncio(req.body);
  if (!result.ok || !result.data) {
    return res.status(422).json({ error: 'Confira os campos destacados.', fields: result.errors });
  }
  const anuncio = await persistir(result.data, id, req.user!.id);
  res.json({ anuncio: { ...anuncio, imagens: await imagensDe(id) } });
});

// DELETE /api/anuncios/:id — apenas o dono; remove imagens do disco
router.delete('/anuncios/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const anuncio = await one<Anuncio>('select * from anuncios where id = $1', [id]);
  if (!anuncio) return res.status(404).json({ error: 'Anúncio não encontrado.' });
  if (anuncio.usuario_id !== req.user!.id) {
    return res.status(403).json({ error: 'Você só pode remover os seus próprios anúncios.' });
  }

  deleteLocalImages((await imagensDe(id)).map((i) => i.url));
  await q('delete from anuncios where id = $1', [id]); // CASCADE apaga as imagens
  res.json({ deleted: true, id });
});

// GET /api/stats — estatísticas para a landing
router.get('/stats', async (_req, res: Response) => {
  const row = await one<{ total: number; doacoes: number; usuarios: number }>(
    `select
       (select count(*)::bigint from anuncios) as total,
       (select count(*)::bigint from anuncios where tipo = 'doacao') as doacoes,
       (select count(*)::bigint from usuarios) as usuarios`
  );
  const total = row?.total ?? 0;

  res.json({
    stats: {
      itens_anunciados: total,
      doacoes: row?.doacoes ?? 0,
      estudantes_ativos: row?.usuarios ?? 0,
      co2_evitado_kg: Math.round(total * 2.3), // estimativa: ~2,3kg de CO2 por item que circula
    },
  });
});
