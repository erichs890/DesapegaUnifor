import type { Anuncio, Stats, UsuarioPublico, Vendedor } from './types';

const BASE = '/api';
const TOKEN_KEY = 'desapego:token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  fields?: Record<string, string>;
  status: number;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string>) } });
  } catch {
    throw new ApiError('Sem conexão. Verifique sua internet e tente novamente.', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error ?? 'Algo deu errado. Tente novamente.', res.status, body.fields);
  }
  return body as T;
}

/* ---------------- Auth ---------------- */

export interface AuthResponse {
  token: string;
  usuario: UsuarioPublico;
}

export function registro(data: {
  nome: string;
  email: string;
  senha: string;
  matricula: string;
  curso?: string;
  campus?: string;
}): Promise<AuthResponse> {
  return request('/auth/registro', { method: 'POST', body: JSON.stringify(data) });
}

export function login(email: string, senha: string): Promise<AuthResponse> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
}

export function getMe(): Promise<{ usuario: UsuarioPublico }> {
  return request('/auth/me');
}

export function updateMe(data: {
  nome?: string;
  curso?: string;
  campus?: string;
  avatar_url?: string;
  matricula?: string;
}): Promise<{ usuario: UsuarioPublico }> {
  return request('/auth/me', { method: 'PATCH', body: JSON.stringify(data) });
}

/* ---------------- Anúncios ---------------- */

export interface ListFilters {
  categoria?: string;
  tipo?: string;
  q?: string;
  usuario?: string;
  sort?: string;
  page?: number;
  per_page?: number;
}

export interface ListResponse {
  anuncios: Anuncio[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export function listAnuncios(filters: ListFilters = {}): Promise<ListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return request(`/anuncios${qs ? `?${qs}` : ''}`);
}

export interface DetalheResponse {
  anuncio: Anuncio;
  vendedor: Vendedor;
  relacionados: Anuncio[];
}

export function getAnuncio(id: number): Promise<DetalheResponse> {
  return request(`/anuncios/${id}`);
}

export interface AnuncioPayload {
  titulo: string;
  descricao: string;
  categoria: string;
  tipo: 'doacao' | 'venda';
  preco: number | null;
  estado_conservacao: string;
  campus: string | null;
  ponto_encontro: string | null;
  aceita_trocas: boolean;
  imagens: string[];
}

export function createAnuncio(data: AnuncioPayload): Promise<{ anuncio: Anuncio }> {
  return request('/anuncios', { method: 'POST', body: JSON.stringify(data) });
}

export function updateAnuncio(id: number, data: AnuncioPayload): Promise<{ anuncio: Anuncio }> {
  return request(`/anuncios/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteAnuncio(id: number): Promise<{ deleted: boolean }> {
  return request(`/anuncios/${id}`, { method: 'DELETE' });
}

export function getStats(): Promise<{ stats: Stats }> {
  return request('/stats');
}

/* ---------------- Upload ---------------- */

/**
 * Upload com progresso real via XMLHttpRequest (fetch não expõe progresso
 * de upload de forma simples/compatível).
 */
export function uploadImagem(file: Blob, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/upload`);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) resolve(body.url as string);
        else reject(new ApiError(body.error ?? 'Falha no upload. Tente novamente.', xhr.status));
      } catch {
        reject(new ApiError('Resposta inesperada do servidor.', xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError('Sem conexão durante o upload. Tente novamente.', 0));

    const form = new FormData();
    form.append('imagem', file);
    xhr.send(form);
  });
}
