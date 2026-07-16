export type Tipo = 'doacao' | 'venda';

export type EstadoConservacao = 'novo' | 'seminovo' | 'usado' | 'com_marcas';

export const ESTADO_LABEL: Record<EstadoConservacao, string> = {
  novo: 'Novo',
  seminovo: 'Semi-novo',
  usado: 'Usado',
  com_marcas: 'Com marcas de uso',
};

export interface AnuncioImagem {
  id: number;
  anuncio_id: number;
  url: string;
  ordem: number;
  capa: number;
}

export interface Anuncio {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  tipo: Tipo;
  preco: number | null;
  imagem_url: string | null;
  estado_conservacao: EstadoConservacao;
  campus: string | null;
  ponto_encontro: string | null;
  aceita_trocas: number;
  usuario_id: number;
  criado_em: string;
  // presentes na listagem (JOIN) e no detalhe
  vendedor_nome?: string;
  vendedor_avatar?: string | null;
  imagens?: AnuncioImagem[];
}

export interface UsuarioPublico {
  id: number;
  nome: string;
  email: string;
  curso: string | null;
  campus: string | null;
  avatar_url: string | null;
  matricula?: string | null; // presente apenas nos dados do próprio usuário
  criado_em: string;
  stats?: { anuncios: number; doacoes: number };
}

export interface Vendedor extends UsuarioPublico {
  total_anuncios: number;
}

export interface Stats {
  itens_anunciados: number;
  doacoes: number;
  estudantes_ativos: number;
  co2_evitado_kg: number;
}

export const CATEGORIAS = [
  'Livros',
  'Engenharia',
  'Computação',
  'Eletrônicos',
  'Vestuário',
  'Móveis',
  'Outros',
] as const;

export const CAMPI = ['Campus', 'EAD', 'Polo da Medicina', 'Polo da Medicina Veterinária'] as const;
