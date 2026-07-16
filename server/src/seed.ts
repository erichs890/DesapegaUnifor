import bcrypt from 'bcryptjs';
import { db } from './db.js';

/**
 * Usuários de teste — senha de todos: "senha123" (documentada no README).
 */
const USUARIOS = [
  { nome: 'Ana Lima', email: 'ana@edu.unifor.br', curso: 'Ciência da Computação', campus: 'Campus', matricula: '2311001' },
  { nome: 'Bruno Souza', email: 'bruno@edu.unifor.br', curso: 'Engenharia Elétrica', campus: 'Campus', matricula: '2211002' },
  { nome: 'Carla Melo', email: 'carla@edu.unifor.br', curso: 'Medicina', campus: 'Polo da Medicina', matricula: '2111003' },
] as const;

const u = (i: number, size = 640) => `https://images.unsplash.com/photo-${i}?w=${size}&q=80`;

interface SeedAnuncio {
  titulo: string;
  descricao: string;
  categoria: string;
  tipo: 'doacao' | 'venda';
  preco: number | null;
  estado: string;
  campus: string;
  ponto: string;
  trocas: 0 | 1;
  dono: number; // índice em USUARIOS
  imagens: string[];
}

const ANUNCIOS: SeedAnuncio[] = [
  { titulo: 'Cálculo Vol. 1 — James Stewart', descricao: 'Livro usado em Cálculo I e II, com marcações a lápis nas primeiras unidades. Capa em bom estado, sem páginas soltas.', categoria: 'Livros', tipo: 'doacao', preco: null, estado: 'usado', campus: 'Campus', ponto: 'Biblioteca central', trocas: 0, dono: 0, imagens: ['1544716278-ca5e3f4abd8c', '1512820790803-83ca734da794'] },
  { titulo: 'Calculadora HP 50g', descricao: 'Calculadora gráfica sobrevivente de 4 semestres de Engenharia. Acompanha capa protetora e manual em PDF. Bateria nova.', categoria: 'Engenharia', tipo: 'venda', preco: 180, estado: 'seminovo', campus: 'Campus', ponto: 'Bloco de Engenharia, hall', trocas: 1, dono: 1, imagens: ['1587145820266-a5951ee6f620'] },
  { titulo: 'Jaleco branco M — pouco uso', descricao: 'Jaleco de algodão tamanho M, usado apenas um semestre nas aulas de laboratório. Lavado, passado e sem manchas.', categoria: 'Vestuário', tipo: 'doacao', preco: null, estado: 'seminovo', campus: 'Polo da Medicina', ponto: 'Entrada do bloco de Saúde', trocas: 0, dono: 2, imagens: ['1582719508461-905c673771fd'] },
  { titulo: 'Kit Arduino Uno + sensores', descricao: 'Kit com Arduino Uno R3, protoboard, jumpers, LEDs e 6 sensores variados. Ideal para quem está começando em IoT. Tudo testado.', categoria: 'Eletrônicos', tipo: 'venda', preco: 120, estado: 'usado', campus: 'Campus', ponto: 'Laboratório de robótica', trocas: 1, dono: 1, imagens: ['1553406830-ef2513450d76', '1518770660439-4636190af475'] },
  { titulo: 'Apostilas de Algoritmos e ED', descricao: 'Xerox encadernado das disciplinas de Algoritmos e Estruturas de Dados, com resumos à mão nas margens. Ouro para a prova.', categoria: 'Computação', tipo: 'doacao', preco: null, estado: 'com_marcas', campus: 'Campus', ponto: 'Cantina do bloco B', trocas: 0, dono: 0, imagens: ['1456513080510-7bf3a84b82f8'] },
  { titulo: 'Escrivaninha compacta 90cm', descricao: 'Escrivaninha perfeita para quarto de república. Já desmontada e pronta para transporte. Poucas marcas de uso no tampo.', categoria: 'Móveis', tipo: 'venda', preco: 90, estado: 'usado', campus: 'Campus', ponto: 'Estacionamento principal', trocas: 0, dono: 1, imagens: ['1518455027359-f3f8164ba6bd'] },
  { titulo: 'Física — Halliday Vol. 2', descricao: 'Volume de eletromagnetismo, edição 10. Sem rabiscos, apenas nome na folha de rosto. Ideal para Física III.', categoria: 'Livros', tipo: 'venda', preco: 45, estado: 'seminovo', campus: 'Campus', ponto: 'Biblioteca central', trocas: 1, dono: 2, imagens: ['1532012197267-da84d127e765', '1509266272358-7701da638078'] },
  { titulo: 'Monitor 21" Dell (DVI/VGA)', descricao: 'Monitor funcionando perfeitamente, ideal como segunda tela para estudos e projetos. Acompanha cabo DVI.', categoria: 'Eletrônicos', tipo: 'doacao', preco: null, estado: 'usado', campus: 'Campus', ponto: 'Bloco de Computação', trocas: 0, dono: 1, imagens: ['1527443224154-c4a3942d3acf'] },
  { titulo: 'Anatomia Humana — Sobotta (2 vols.)', descricao: 'Atlas completo em dois volumes, edição antiga porém íntegra. Perfeito para o ciclo básico de Medicina.', categoria: 'Livros', tipo: 'venda', preco: 150, estado: 'usado', campus: 'Polo da Medicina', ponto: 'Bloco de Saúde, sala de estudos', trocas: 0, dono: 2, imagens: ['1583912267550-d6c2ac3196c0', '1576091160399-112ba8d25d1f'] },
  { titulo: 'Cadeira de escritório', descricao: 'Cadeira giratória com regulagem de altura. Estofado com leves marcas, estrutura firme. Retirada no campus.', categoria: 'Móveis', tipo: 'doacao', preco: null, estado: 'com_marcas', campus: 'Campus', ponto: 'Portaria 2', trocas: 0, dono: 0, imagens: ['1505843490538-5133c6c7d0e1'] },
  { titulo: 'Raspberry Pi 4 (4GB) + case', descricao: 'Raspberry Pi 4 com 4GB de RAM, case oficial com cooler e fonte. Usado num projeto de TCC, funcionando 100%.', categoria: 'Computação', tipo: 'venda', preco: 350, estado: 'seminovo', campus: 'Campus', ponto: 'Laboratório de IoT', trocas: 1, dono: 0, imagens: ['1553341640-9397992456f3', '1591799264318-7e6ef8ddb7ea'] },
  { titulo: 'Réguas e esquadros de desenho técnico', descricao: 'Kit completo: escalímetro, dois esquadros, transferidor e compasso. Sobrou do primeiro ano de Engenharia Civil.', categoria: 'Engenharia', tipo: 'doacao', preco: null, estado: 'usado', campus: 'Campus', ponto: 'Bloco de Engenharia, hall', trocas: 0, dono: 1, imagens: ['1503387762-592deb58ef4e'] },
  { titulo: 'Moletom do curso de Computação (G)', descricao: 'Moletom da turma, tamanho G, usado poucas vezes. Cor grafite com bordado do curso.', categoria: 'Vestuário', tipo: 'venda', preco: 60, estado: 'seminovo', campus: 'Campus', ponto: 'Centro acadêmico', trocas: 1, dono: 0, imagens: ['1556821840-3a63f95609a7'] },
];

export function seedIfEmpty(): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM usuarios').get() as { n: number }).n;
  if (count > 0) return;

  const hash = bcrypt.hashSync('senha123', 12);
  const insertUser = db.prepare(
    'INSERT INTO usuarios (nome, email, senha_hash, curso, campus, matricula) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const userIds = USUARIOS.map(
    (user) =>
      Number(insertUser.run(user.nome, user.email, hash, user.curso, user.campus, user.matricula).lastInsertRowid)
  );

  const insertAnuncio = db.prepare(
    `INSERT INTO anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao,
                           campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`
  );
  const insertImagem = db.prepare(
    'INSERT INTO anuncio_imagens (anuncio_id, url, ordem, capa) VALUES (?, ?, ?, ?)'
  );

  ANUNCIOS.forEach((a, idx) => {
    const urls = a.imagens.map((id) => u(id as unknown as number));
    const info = insertAnuncio.run(
      a.titulo, a.descricao, a.categoria, a.tipo, a.preco, a.estado, a.campus, a.ponto,
      a.trocas, userIds[a.dono], urls[0] ?? null,
      `-${(ANUNCIOS.length - idx) * 7} hours` // datas escalonadas p/ ordenação real
    );
    const anuncioId = Number(info.lastInsertRowid);
    urls.forEach((url, i) => insertImagem.run(anuncioId, url, i, i === 0 ? 1 : 0));
  });

  console.log(`🌱 Seed: ${USUARIOS.length} usuários (senha "senha123") e ${ANUNCIOS.length} anúncios.`);
}
