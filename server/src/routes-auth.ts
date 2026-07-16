import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, publicUser, type Usuario } from './db.js';
import {
  signToken,
  requireAuth,
  loginRateLimited,
  registerLoginAttempt,
  clearLoginAttempts,
  type AuthRequest,
} from './auth.js';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_UNIFOR_RE = /^[^\s@]+@edu\.unifor\.br$/i;
const MATRICULA_RE = /^\d{7}$/;

const clean = (v: unknown, max = 120): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max) : '';

/** Dados do próprio usuário: público + matrícula (nunca exposta a terceiros). */
function ownUser(u: Usuario) {
  return { ...publicUser(u), matricula: u.matricula, stats: userStats(u.id) };
}

function userStats(userId: number) {
  const anuncios = (
    db.prepare('SELECT COUNT(*) AS n FROM anuncios WHERE usuario_id = ?').get(userId) as { n: number }
  ).n;
  const doacoes = (
    db.prepare("SELECT COUNT(*) AS n FROM anuncios WHERE usuario_id = ? AND tipo = 'doacao'").get(userId) as {
      n: number;
    }
  ).n;
  return { anuncios, doacoes };
}

// POST /api/auth/registro
authRouter.post('/registro', (req, res: Response) => {
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
    errors.matricula = 'A matrícula tem exatamente 7 números (só dígitos).';
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

  const exists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (exists) {
    return res.status(409).json({
      error: 'Já existe uma conta com esse email.',
      fields: { email: 'Já existe uma conta com esse email — tente entrar.' },
    });
  }
  const matriculaExists = db.prepare('SELECT id FROM usuarios WHERE matricula = ?').get(matricula);
  if (matriculaExists) {
    return res.status(409).json({
      error: 'Essa matrícula já está cadastrada.',
      fields: { matricula: 'Essa matrícula já está cadastrada — tente entrar.' },
    });
  }

  const senha_hash = bcrypt.hashSync(senha, 12);
  const info = db
    .prepare('INSERT INTO usuarios (nome, email, senha_hash, curso, campus, matricula) VALUES (?, ?, ?, ?, ?, ?)')
    .run(nome, email, senha_hash, curso, campus, matricula);

  const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(info.lastInsertRowid as number) as unknown as Usuario;
  res.status(201).json({ token: signToken(user.id), usuario: ownUser(user) });
});

// POST /api/auth/login
authRouter.post('/login', (req, res: Response) => {
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

  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email) as unknown as
    | Usuario
    | undefined;
  // mesma mensagem para email inexistente e senha errada (não vazar contas)
  if (!user || !bcrypt.compareSync(senha, user.senha_hash)) {
    return res.status(401).json({ error: 'Email ou senha incorretos. Confira e tente de novo.' });
  }

  clearLoginAttempts(email);
  res.json({ token: signToken(user.id), usuario: ownUser(user) });
});

/**
 * POST /api/auth/google — login/cadastro com Google Identity Services.
 * O front envia o ID token (credential) do GIS; validamos contra o endpoint
 * tokeninfo do Google (assinatura + expiração verificadas pelo Google) e
 * conferimos o `aud` com o nosso Client ID. Volume baixo → tokeninfo é
 * suficiente; em escala usaríamos verificação local via JWKS.
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

  let user = db.prepare('SELECT * FROM usuarios WHERE google_id = ?').get(googleId) as unknown as
    | Usuario
    | undefined;

  if (!user) {
    // vincula a uma conta existente com o mesmo email (verificado pelo Google)
    const byEmail = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email) as unknown as
      | Usuario
      | undefined;
    if (byEmail) {
      db.prepare('UPDATE usuarios SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?').run(
        googleId,
        avatar,
        byEmail.id
      );
      user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(byEmail.id) as unknown as Usuario;
    } else {
      // conta nova: sem senha utilizável (hash de bytes aleatórios)
      const senha_hash = bcrypt.hashSync(crypto.randomUUID() + crypto.randomUUID(), 12);
      const created = db
        .prepare('INSERT INTO usuarios (nome, email, senha_hash, avatar_url, google_id) VALUES (?, ?, ?, ?, ?)')
        .run(nome, email, senha_hash, avatar, googleId);
      user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(created.lastInsertRowid as number) as unknown as Usuario;
    }
  }

  res.json({ token: signToken(user.id), usuario: ownUser(user) });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  res.json({ usuario: ownUser(user) });
});

// PATCH /api/auth/me — editar nome/curso/campus/avatar
authRouter.patch('/me', requireAuth, (req: AuthRequest, res: Response) => {
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
    else if (!MATRICULA_RE.test(m)) errors.matricula = 'A matrícula tem exatamente 7 números (só dígitos).';
    else {
      const taken = db.prepare('SELECT id FROM usuarios WHERE matricula = ? AND id != ?').get(m, user.id);
      if (taken) errors.matricula = 'Essa matrícula já está cadastrada em outra conta.';
      else matricula = m;
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ error: 'Confira os campos destacados.', fields: errors });
  }

  db.prepare('UPDATE usuarios SET nome = ?, curso = ?, campus = ?, avatar_url = ?, matricula = ? WHERE id = ?').run(
    nome,
    curso,
    campus,
    avatar_url,
    matricula,
    user.id
  );
  const updated = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(user.id) as unknown as Usuario;
  res.json({ usuario: ownUser(updated) });
});
