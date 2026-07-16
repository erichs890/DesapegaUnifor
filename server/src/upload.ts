import { Router, type Response } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { uploadsDir } from './db.js';
import { requireAuth, type AuthRequest } from './auth.js';

export const uploadRouter = Router();

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validação por magic bytes (assinatura real do arquivo), não só pelo
 * mimetype declarado — um .exe renomeado para .jpg passa no mimetype,
 * mas não passa aqui.
 */
function sniffImage(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP')
    return 'webp';
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
});

// POST /api/upload — uma imagem por request (o front envia em paralelo,
// com barra de progresso e retry individuais por arquivo)
uploadRouter.post('/', requireAuth, (req: AuthRequest, res: Response) => {
  upload.single('imagem')(req, res, (err: unknown) => {
    if (err) {
      const isTooBig = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE';
      return res.status(isTooBig ? 413 : 400).json({
        error: isTooBig
          ? 'Imagem maior que 5MB. Reduza o tamanho ou escolha outra foto.'
          : 'Não foi possível receber o arquivo. Tente novamente.',
      });
    }
    const file = req.file;
    if (!file) {
      return res.status(422).json({ error: "Nenhum arquivo recebido — envie o campo 'imagem'." });
    }

    const kind = sniffImage(file.buffer);
    if (!kind) {
      return res.status(422).json({
        error: 'Formato não suportado. Envie uma imagem JPG, PNG ou WebP.',
      });
    }

    const name = `${crypto.randomUUID()}.${kind}`;
    fs.writeFileSync(path.join(uploadsDir, name), file.buffer);
    res.status(201).json({ url: `/uploads/${name}` });
  });
});

/** Remove do disco os arquivos locais (/uploads/...) de uma lista de URLs. */
export function deleteLocalImages(urls: string[]): void {
  for (const url of urls) {
    if (!url.startsWith('/uploads/')) continue;
    const name = path.basename(url); // nunca confiar no caminho inteiro
    const file = path.join(uploadsDir, name);
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {
      // arquivo já ausente/em uso — não é motivo para falhar a requisição
    }
  }
}
