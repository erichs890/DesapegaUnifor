export const formatPreco = (valor: number): string =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Datas do banco: o Postgres (Supabase) devolve ISO 8601 com timezone
 * ("2026-07-16T05:00:00.000Z"); o SQLite antigo devolvia "YYYY-MM-DD HH:MM:SS"
 * em UTC. Normaliza os dois formatos.
 */
export const parseDbDate = (value: string): Date => {
  if (value.includes('T')) return new Date(value); // ISO — já tem timezone
  return new Date(`${value.replace(' ', 'T')}Z`); // formato legado do SQLite (UTC)
};

export const formatData = (value: string): string =>
  parseDbDate(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
