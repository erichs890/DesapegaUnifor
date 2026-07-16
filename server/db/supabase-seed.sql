-- ============================================================
-- DesapegaUnifor — Seed (Supabase)
-- Senha de todos os usuários de teste: "senha123"
-- (hash bcrypt cost 12, gerado com a mesma lib da API)
-- Idempotente: só insere se a tabela estiver vazia.
-- ============================================================

do $$
declare
  hash constant text := '$2b$12$veT48/q1DRtuS.EqpUZmK.6kTGY8sQhJri3zM9nHRTYig0UBbcvMi';
  ana bigint; bruno bigint; carla bigint;
  a bigint;
begin
  if exists (select 1 from usuarios) then
    raise notice 'Seed ignorado: já existem usuários.';
    return;
  end if;

  insert into usuarios (nome, email, senha_hash, curso, campus, matricula)
    values ('Ana Lima', 'ana@edu.unifor.br', hash, 'Ciência da Computação', 'Campus', '2311001')
    returning id into ana;
  insert into usuarios (nome, email, senha_hash, curso, campus, matricula)
    values ('Bruno Souza', 'bruno@edu.unifor.br', hash, 'Engenharia Elétrica', 'Campus', '2211002')
    returning id into bruno;
  insert into usuarios (nome, email, senha_hash, curso, campus, matricula)
    values ('Carla Melo', 'carla@edu.unifor.br', hash, 'Medicina', 'Polo da Medicina', '2111003')
    returning id into carla;

  -- helper de URL do unsplash
  -- (as datas escalonadas mantêm a ordenação "mais recentes" realista)

  insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao, campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
  values ('Cálculo Vol. 1 — James Stewart', 'Livro usado em Cálculo I e II, com marcações a lápis nas primeiras unidades. Capa em bom estado, sem páginas soltas.', 'Livros', 'doacao', null, 'usado', 'Campus', 'Biblioteca central', 0, ana, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=640&q=80', now() - interval '91 hours')
  returning id into a;
  insert into anuncio_imagens (anuncio_id, url, ordem, capa) values
    (a, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=640&q=80', 0, 1),
    (a, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=640&q=80', 1, 0);

  insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao, campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
  values ('Calculadora HP 50g', 'Calculadora gráfica sobrevivente de 4 semestres de Engenharia. Acompanha capa protetora e manual em PDF. Bateria nova.', 'Engenharia', 'venda', 180, 'seminovo', 'Campus', 'Bloco de Engenharia, hall', 1, bruno, 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=640&q=80', now() - interval '84 hours')
  returning id into a;
  insert into anuncio_imagens (anuncio_id, url, ordem, capa) values
    (a, 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=640&q=80', 0, 1);

  insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao, campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
  values ('Jaleco branco M — pouco uso', 'Jaleco de algodão tamanho M, usado apenas um semestre nas aulas de laboratório. Lavado, passado e sem manchas.', 'Vestuário', 'doacao', null, 'seminovo', 'Polo da Medicina', 'Entrada do bloco de Saúde', 0, carla, 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=640&q=80', now() - interval '77 hours')
  returning id into a;
  insert into anuncio_imagens (anuncio_id, url, ordem, capa) values
    (a, 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=640&q=80', 0, 1);

  insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao, campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
  values ('Kit Arduino Uno + sensores', 'Kit com Arduino Uno R3, protoboard, jumpers, LEDs e 6 sensores variados. Ideal para quem está começando em IoT. Tudo testado.', 'Eletrônicos', 'venda', 120, 'usado', 'Campus', 'Laboratório de robótica', 1, bruno, 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=640&q=80', now() - interval '70 hours')
  returning id into a;
  insert into anuncio_imagens (anuncio_id, url, ordem, capa) values
    (a, 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=640&q=80', 0, 1),
    (a, 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=640&q=80', 1, 0);

  insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao, campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
  values ('Apostilas de Algoritmos e ED', 'Xerox encadernado das disciplinas de Algoritmos e Estruturas de Dados, com resumos à mão nas margens. Ouro para a prova.', 'Computação', 'doacao', null, 'com_marcas', 'Campus', 'Cantina do bloco B', 0, ana, 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=640&q=80', now() - interval '63 hours')
  returning id into a;
  insert into anuncio_imagens (anuncio_id, url, ordem, capa) values
    (a, 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=640&q=80', 0, 1);

  insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao, campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
  values ('Escrivaninha compacta 90cm', 'Escrivaninha perfeita para quarto de república. Já desmontada e pronta para transporte. Poucas marcas de uso no tampo.', 'Móveis', 'venda', 90, 'usado', 'Campus', 'Estacionamento principal', 0, bruno, 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=640&q=80', now() - interval '56 hours')
  returning id into a;
  insert into anuncio_imagens (anuncio_id, url, ordem, capa) values
    (a, 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=640&q=80', 0, 1);

  insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao, campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
  values ('Física — Halliday Vol. 2', 'Volume de eletromagnetismo, edição 10. Sem rabiscos, apenas nome na folha de rosto. Ideal para Física III.', 'Livros', 'venda', 45, 'seminovo', 'Campus', 'Biblioteca central', 1, carla, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=640&q=80', now() - interval '49 hours')
  returning id into a;
  insert into anuncio_imagens (anuncio_id, url, ordem, capa) values
    (a, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=640&q=80', 0, 1),
    (a, 'https://images.unsplash.com/photo-1509266272358-7701da638078?w=640&q=80', 1, 0);

  insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao, campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
  values ('Monitor 21" Dell (DVI/VGA)', 'Monitor funcionando perfeitamente, ideal como segunda tela para estudos e projetos. Acompanha cabo DVI.', 'Eletrônicos', 'doacao', null, 'usado', 'Campus', 'Bloco de Computação', 0, bruno, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=640&q=80', now() - interval '42 hours')
  returning id into a;
  insert into anuncio_imagens (anuncio_id, url, ordem, capa) values
    (a, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=640&q=80', 0, 1);

  insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao, campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
  values ('Anatomia Humana — Sobotta (2 vols.)', 'Atlas completo em dois volumes, edição antiga porém íntegra. Perfeito para o ciclo básico de Medicina.', 'Livros', 'venda', 150, 'usado', 'Polo da Medicina', 'Bloco de Saúde, sala de estudos', 0, carla, 'https://images.unsplash.com/photo-1583912267550-d6c2ac3196c0?w=640&q=80', now() - interval '35 hours')
  returning id into a;
  insert into anuncio_imagens (anuncio_id, url, ordem, capa) values
    (a, 'https://images.unsplash.com/photo-1583912267550-d6c2ac3196c0?w=640&q=80', 0, 1),
    (a, 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=640&q=80', 1, 0);

  insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao, campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
  values ('Cadeira de escritório', 'Cadeira giratória com regulagem de altura. Estofado com leves marcas, estrutura firme. Retirada no campus.', 'Móveis', 'doacao', null, 'com_marcas', 'Campus', 'Portaria 2', 0, ana, 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=640&q=80', now() - interval '28 hours')
  returning id into a;
  insert into anuncio_imagens (anuncio_id, url, ordem, capa) values
    (a, 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=640&q=80', 0, 1);

  insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao, campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
  values ('Raspberry Pi 4 (4GB) + case', 'Raspberry Pi 4 com 4GB de RAM, case oficial com cooler e fonte. Usado num projeto de TCC, funcionando 100%.', 'Computação', 'venda', 350, 'seminovo', 'Campus', 'Laboratório de IoT', 1, ana, 'https://images.unsplash.com/photo-1553341640-9397992456f3?w=640&q=80', now() - interval '21 hours')
  returning id into a;
  insert into anuncio_imagens (anuncio_id, url, ordem, capa) values
    (a, 'https://images.unsplash.com/photo-1553341640-9397992456f3?w=640&q=80', 0, 1),
    (a, 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=640&q=80', 1, 0);

  insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao, campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
  values ('Réguas e esquadros de desenho técnico', 'Kit completo: escalímetro, dois esquadros, transferidor e compasso. Sobrou do primeiro ano de Engenharia Civil.', 'Engenharia', 'doacao', null, 'usado', 'Campus', 'Bloco de Engenharia, hall', 0, bruno, 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=640&q=80', now() - interval '14 hours')
  returning id into a;
  insert into anuncio_imagens (anuncio_id, url, ordem, capa) values
    (a, 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=640&q=80', 0, 1);

  insert into anuncios (titulo, descricao, categoria, tipo, preco, estado_conservacao, campus, ponto_encontro, aceita_trocas, usuario_id, imagem_url, criado_em)
  values ('Moletom do curso de Computação (G)', 'Moletom da turma, tamanho G, usado poucas vezes. Cor grafite com bordado do curso.', 'Vestuário', 'venda', 60, 'seminovo', 'Campus', 'Centro acadêmico', 1, ana, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=640&q=80', now() - interval '7 hours')
  returning id into a;
  insert into anuncio_imagens (anuncio_id, url, ordem, capa) values
    (a, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=640&q=80', 0, 1);

  raise notice 'Seed: 3 usuários (senha "senha123") e 13 anúncios criados.';
end $$;
