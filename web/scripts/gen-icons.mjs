/**
 * Gera os PNGs do PWA (192, 512 e maskable) a partir de rasterização
 * manual — sem dependências nativas. Roda uma vez: `node scripts/gen-icons.mjs`
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const BG = [0x17, 0x0d, 0x29]; // dark-purple Vortex
const FG = [0x12, 0xce, 0xe4]; // light-blue Vortex

function crc32(buf) {
  let c,
    crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc & 0xffffff00) | c;
    crc = (crc >>> 8) ^ ((0xedb88320 & -(((crc ^ buf[n]) >>> 0) & 0)) | c);
  }
  // implementação simples e correta:
  crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    crc ^= buf[n];
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function writePng(file, size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtro none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(file, png);
  console.log(`✓ ${path.basename(file)} (${size}x${size})`);
}

/** Desenha o ícone: fundo arredondado + duas setas circulares (economia circular). */
function render(size, { maskable = false } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const radius = maskable ? size : size * 0.235; // maskable = fundo cheio
  const ringR = size * (maskable ? 0.27 : 0.32);
  const ringW = size * 0.07;
  const gap = 0.55; // rad — abertura das duas metades do anel

  // ângulos das cabeças de seta (fim de cada arco)
  const arrow1 = -0.35;
  const arrow2 = Math.PI - 0.35;
  const arrowSize = size * 0.11;

  const inRoundRect = (x, y) => {
    const r = radius;
    const dx = Math.max(Math.abs(x - c) - (c - r), 0);
    const dy = Math.max(Math.abs(y - c) - (c - r), 0);
    return dx * dx + dy * dy <= r * r;
  };

  const norm = (a) => {
    while (a < 0) a += Math.PI * 2;
    return a % (Math.PI * 2);
  };
  // dois arcos com aberturas opostas
  const inArc = (angle) => {
    const a = norm(angle);
    const a1s = norm(arrow1 - (Math.PI - gap));
    const a2s = norm(arrow2 - (Math.PI - gap));
    const within = (start, sweep) => norm(a - start) <= sweep;
    return within(a1s, Math.PI - gap) || within(a2s, Math.PI - gap);
  };

  const inArrow = (x, y, tipAngle) => {
    // triângulo apontando tangencialmente no fim do arco
    const tx = c + ringR * Math.cos(tipAngle);
    const ty = c + ringR * Math.sin(tipAngle);
    const dx = x - tx;
    const dy = y - ty;
    return Math.sqrt(dx * dx + dy * dy) <= arrowSize;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (!inRoundRect(x + 0.5, y + 0.5)) continue; // transparente
      let [r, g, b] = BG;
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const onRing = Math.abs(dist - ringR) <= ringW / 2 && inArc(angle);
      if (onRing || inArrow(x + 0.5, y + 0.5, arrow1) || inArrow(x + 0.5, y + 0.5, arrow2)) {
        [r, g, b] = FG;
      }
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255;
    }
  }
  return px;
}

writePng(path.join(outDir, 'icon-192.png'), 192, render(192));
writePng(path.join(outDir, 'icon-512.png'), 512, render(512));
writePng(path.join(outDir, 'icon-maskable-512.png'), 512, render(512, { maskable: true }));
