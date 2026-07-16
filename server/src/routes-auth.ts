import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { q, one, publicUser, type Usuario } from './db.js';
import {
  signToken,
  requireAuth,
  loginRateLimited,
  registerLoginAttempt,
  clearLoginAttempts,
  type AuthRequest,
} from './auth.js';

export const authRouter = Router();

const EMAIL_UNIFOR_RE = /^[^\s@]+@edu\.unifor\.br$/i;
const MATRICULA_RE = /^\d{2}[12]\d{4}$/; // AA(ano) + S(semestre 1|2) + NNNN

/** Sanitiza: remove caracteres de controle, apara e limita tamanho. */
const clean = (v: unknown, max = 120): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max) : '';

async function userStats(userId: number) {
  const row = await one<{ anuncios: number; doacoes: number }>(
    `select count(*)::bigint as anuncios,
            count(*) filter (where tipo = 'doacao')::bigint as doacoes
     from anuncios where usuario_id = $1`,
    [userId]
  );
  return { anuncios: row?.anuncios ?? 0, doacoes: row?.doacoes ?? 0 };
}

/** Dados do próprio usuário: público + matrícula (nunca exposta a terceiros). */
async function ownUser(u: Usuario) {
  return { ...publicUser(u), matricula: u.matricula, stats: await userStats(u.id) };
}

// POST /api/auth/registro
authRouter.post('/registro', async (req, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const nome = clean(body.nome, 80);
  if (!nome) errors.nome = 'Informe seu nome.';
  else if (nome.length < 2) errors.nome = 'O nome precisa de pelo menos 2 caracteres.';

  const email = clean(body.email, 160).toLowerCase();
  if (!email) errors.email = 'Informe seu email institucional.';
  else if (!EMAIL_UNIFOR_RE.test(email)) {
    errors.email = 'Use o seu email institucional da UNIFOR (nome@edu.unifor.br).';
  }

  const matricula = clean(body.matricula, 16);
  if (!matricula) errors.matricula = 'Informe sua matrícula.';
  else if (!MATRICULA_RE.test(matricula)) {
    errors.matricula = 'Matrícula inválida: são 7 números — ano de ingresso (2 dígitos), semestre (1 ou 2) e mais 4 números. Ex: 2420145.';
  }

  const senha = typeof body.senha === 'string' ? body.senha : '';
  if (!senha) errors.senha = 'Crie uma senha.';
  else if (senha.length < 8) errors.senha = 'A senha precisa de pelo menos 8 caracteres.';
  else if (senha.length > 128) errors.senha = 'A senha pode ter no máximo 128 caracteres.';

  const curso = clean(body.curso, 80) || null;
  const campus = clean(body.campus, 80) || null;

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ error: 'Confira os campos destacados.', fields: errors });
  }

  const exists = await one('select id from usuarios where lower(email) = $1', [email]);
  if (exists) {
    return res.status(409).json({
      error: 'Já existe uma conta com esse email.',
      fields: { email: 'Já existe uma conta com esse email — tente entrar.' },
    });
  }
  const matriculaExists = await one('select id from usuarios where matricula = $1', [matricula]);
  if (matriculaExists) {
    return res.status(409).json({
      error: 'Essa matrícula já está cadastrada.',
      fields: { matricula: 'Essa matrícula já está cadastrada — tente entrar.' },
    });
  }

  const senha_hash = bcrypt.hashSync(senha, 12);
  const rows = await q<Usuario>(
    `insert into usuarios (nome, email, senha_hash, curso, campus, matricula)
     values ($1, $2, $3, $4, $5, $6) returning *`,
    [nome, email, senha_hash, curso, campus, matricula]
  );
  const user = rows[0];
  res.status(201).json({ token: signToken(user.id), usuario: await ownUser(user) });
});

// POST /api/auth/login
authRouter.post('/login', async (req, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const email = clean(body.email, 160).toLowerCase();
  const senha = typeof body.senha === 'string' ? body.senha : '';

  if (!email || !senha) {
    return res.status(422).json({ error: 'Informe email e senha para entrar.' });
  }

  if (loginRateLimited(email)) {
    return res.status(429).json({
      error: 'Muitas tentativas seguidas. Aguarde 1 minuto e tente novamente.',
    });
  }
  registerLoginAttempt(email);

  const user = await one<Usuario>('select * from usuarios where lower(email) = $1', [email]);
  // mesma mensagem para email inexistente e senha errada (não vazar contas)
  if (!user || !bcrypt.compareSync(senha, user.senha_hash)) {
    return res.status(401).json({ error: 'Email ou senha incorretos. Confira e tente de novo.' });
  }

  clearLoginAttempts(email);
  res.json({ token: signToken(user.id), usuario: await ownUser(user) });
});

/**
 * POST /api/auth/google — login/cadastro com Google Identity Services.
 * Validamos o ID token no endpoint tokeninfo do Google (assinatura +
 * expiração) e conferimos o `aud` com o nosso Client ID.
 */
authRouter.post('/google', async (req, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(501).json({
      error: 'Login com Google não está configurado neste servidor. Defina GOOGLE_CLIENT_ID no server/.env (veja o README).',
    });
  }

  const credential = typeof (req.body as Record<string, unknown>)?.credential === 'string'
    ? ((req.body as Record<string, unknown>).credential as string)
    : '';
  if (!credential) {
    return res.status(422).json({ error: 'Credencial do Google ausente. Tente entrar novamente.' });
  }

  let info: Record<string, string>;
  try {
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!resp.ok) {
      return res.status(401).json({ error: 'O Google não reconheceu essa credencial. Tente de novo.' });
    }
    info = (await resp.json()) as Record<string, string>;
  } catch {
    return res.status(502).json({ error: 'Não foi possível falar com o Google agora. Tente novamente em instantes.' });
  }

  if (info.aud !== clientId) {
    return res.status(401).json({ error: 'Credencial emitida para outro aplicativo. Recarregue a página e tente de novo.' });
  }
  if (info.email_verified !== 'true' || !info.email || !info.sub) {
    return res.status(401).json({ error: 'Sua conta Google não tem email verificado — use email e senha.' });
  }

  const email = info.email.toLowerCase();
  const googleId = info.sub;
  const nome = clean(info.name, 80) || email.split('@')[0];
  const avatar = typeof info.picture === 'string' && /^https:\/\//.test(info.picture) ? info.picture : null;

  let user = await one<Usuario>('select * from usuarios where google_id = $1', [googleId]);

  if (!user) {
    // vincula a uma conta existente com o mesmo email (verificado pelo Google)
    const byEmail = await one<Usuario>('select * from usuarios where lower(email) = $1', [email]);
    if (byEmail) {
      const rows = await q<Usuario>(
        'update usuarios set google_id = $1, avatar_url = coalesce(avatar_url, $2) where id = $3 returning *',
        [googleId, avatar, byEmail.id]
      );
      user = rows[0];
    } else {
      // conta nova: sem senha utilizável (hash de bytes aleatórios)
      const senha_hash = bcrypt.hashSync(crypto.randomUUID() + crypto.randomUUID(), 12);
      const rows = await q<Usuario>(
        `insert into usuarios (nome, email, senha_hash, avatar_url, google_id)
         values ($1, $2, $3, $4, $5) returning *`,
        [nome, email, senha_hash, avatar, googleId]
      );
      user = rows[0];
    }
  }

  res.json({ token: signToken(user.id), usuario: await ownUser(user) });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json({ usuario: await ownUser(req.user!) });
});

// PATCH /api/auth/me — editar nome/curso/campus/avatar/matrícula
authRouter.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const nome = body.nome !== undefined ? clean(body.nome, 80) : user.nome;
  if (body.nome !== undefined && nome.length < 2) errors.nome = 'O nome precisa de pelo menos 2 caracteres.';

  const curso = body.curso !== undefined ? clean(body.curso, 80) || null : user.curso;
  const campus = body.campus !== undefined ? clean(body.campus, 80) || null : user.campus;

  let avatar_url = user.avatar_url;
  if (body.avatar_url !== undefined) {
    const url = clean(body.avatar_url, 400);
    if (url === '') avatar_url = null;
    else if (url.startsWith('/uploads/') || /^https?:\/\//.test(url)) avatar_url = url;
    else errors.avatar_url = 'Avatar inválido — envie uma imagem ou informe uma URL http(s).';
  }

  let matricula = user.matricula;
  if (body.matricula !== undefined) {
    const m = clean(body.matricula, 16);
    if (m === '') matricula = null;
    else if (!MATRICULA_RE.test(m)) errors.matricula = 'Matrícula inválida: são 7 números — ano de ingresso (2 dígitos), semestre (1 ou 2) e mais 4 números. Ex: 2420145.';
    else {
      const taken = await one('select id from usuarios where matricula = $1 and id != $2', [m, user.id]);
      if (taken) errors.matricula = 'Essa matrícula já está cadastrada em outra conta.';
      else matricula = m;
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ error: 'Confira os campos destacados.', fields: errors });
  }

  const rows = await q<Usuario>(
    `update usuarios set nome = $1, curso = $2, campus = $3, avatar_url = $4, matricula = $5
     where id = $6 returning *`,
    [nome, curso, campus, avatar_url, matricula, user.id]
  );
  res.json({ usuario: await ownUser(rows[0]) });
});
