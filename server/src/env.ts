/**
 * Carrega server/.env ANTES de qualquer outro módulo ler process.env
 * (imports ESM são içados — este arquivo é o primeiro import do index.ts).
 */
try {
  process.loadEnvFile();
} catch {
  // sem .env — segue com os defaults de desenvolvimento
}
