import './env.js'; // PRIMEIRO import: carrega .env antes dos outros módulos
import express from 'express';
import cors from 'cors';
import { router } from './routes.js';
import { authRouter } from './routes-auth.js';
import { uploadRouter } from './upload.js';
import { uploadsDir, pool } from './db.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.disable('x-powered-by');

// Headers de segurança básicos (helmet-like, sem dependência)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Uploads: estático com cache imutável (nomes são UUIDs — nunca mudam de conteúdo)
app.use(
  '/uploads',
  express.static(uploadsDir, {
    immutable: true,
    maxAge: '30d',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  })
);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api', router);

// 404 e erros sempre em JSON — a API nunca responde HTML
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// Valida a conexão com o Supabase antes de aceitar requisições
pool
  .query('select 1')
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ API DesapegaUnifor rodando em http://localhost:${PORT}/api (banco: Supabase)`);
    });
  })
  .catch((err: Error) => {
    console.error('❌ Não foi possível conectar ao Supabase. Confira DATABASE_URL no server/.env.');
    console.error(err.message);
    process.exit(1);
  });
