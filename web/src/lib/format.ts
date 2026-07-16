export const formatPreco = (valor: number): string =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatData = (iso: string): string => {
  // SQLite grava "YYYY-MM-DD HH:MM:SS" em UTC
  const date = new Date(`${iso.replace(' ', 'T')}Z`);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};
