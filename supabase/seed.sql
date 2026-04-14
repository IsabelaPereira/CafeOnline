-- ============================================================
-- DAS MATAS — SEED DE DADOS INICIAIS
-- ============================================================
-- ATENÇÃO: Execute APÓS criar os usuários no Auth do Supabase.
--
-- Usuários necessários (criar em Authentication > Users):
--   admin@dasmatas.com.br      senha: Admin@123!    (metadata: {"name":"Ana Costa","role":"admin"})
--   marina.andrade@hotmail.com senha: Cliente@123!  (metadata: {"name":"Marina Andrade","role":"cliente"})
--   financeiro@dasmatas.com.br senha: Fin@123!      (metadata: {"name":"Pedro Alves","role":"financeiro"})
--
-- Os UUIDs são buscados automaticamente por e-mail — não é necessário substituir nada.
-- ============================================================

do $$
declare
  -- AUTH — buscados automaticamente por e-mail
  v_admin_uid  uuid;
  v_cli_uid    uuid;
  v_fin_uid    uuid;

  -- CLIENTES
  v_cli1 uuid := '10000000-0000-4000-8000-000000000001';
  v_cli2 uuid := '10000000-0000-4000-8000-000000000002';
  v_cli3 uuid := '10000000-0000-4000-8000-000000000003';

  -- ENDEREÇOS
  v_end1 uuid := '20000000-0000-4000-8000-000000000001';
  v_end2 uuid := '20000000-0000-4000-8000-000000000002';
  v_end3 uuid := '20000000-0000-4000-8000-000000000003';

  -- PLANOS
  v_plan1 uuid := '30000000-0000-4000-8000-000000000001';
  v_plan2 uuid := '30000000-0000-4000-8000-000000000002';
  v_plan3 uuid := '30000000-0000-4000-8000-000000000003';

  -- CATEGORIAS PRODUTO
  v_catprod1 uuid := '40000000-0000-4000-8000-000000000001';
  v_catprod2 uuid := '40000000-0000-4000-8000-000000000002';
  v_catprod3 uuid := '40000000-0000-4000-8000-000000000003';

  -- PRODUTOS
  v_prod1 uuid := '50000000-0000-4000-8000-000000000001';
  v_prod2 uuid := '50000000-0000-4000-8000-000000000002';
  v_prod3 uuid := '50000000-0000-4000-8000-000000000003';
  v_prod4 uuid := '50000000-0000-4000-8000-000000000004';
  v_prod5 uuid := '50000000-0000-4000-8000-000000000005';
  v_prod6 uuid := '50000000-0000-4000-8000-000000000006';

  -- EDIÇÕES
  v_ed1 uuid := '60000000-0000-4000-8000-000000000001';
  v_ed2 uuid := '60000000-0000-4000-8000-000000000002';
  v_ed3 uuid := '60000000-0000-4000-8000-000000000003';

  -- CAFÉS EDIÇÃO
  v_cafe1 uuid := '65000000-0000-4000-8000-000000000001';
  v_cafe2 uuid := '65000000-0000-4000-8000-000000000002';
  v_cafe3 uuid := '65000000-0000-4000-8000-000000000003';
  v_cafe4 uuid := '65000000-0000-4000-8000-000000000004';
  v_cafe5 uuid := '65000000-0000-4000-8000-000000000005';
  v_cafe6 uuid := '65000000-0000-4000-8000-000000000006';

  -- ASSINATURAS
  v_assin1 uuid := '70000000-0000-4000-8000-000000000001';
  v_assin2 uuid := '70000000-0000-4000-8000-000000000002';
  v_assin3 uuid := '70000000-0000-4000-8000-000000000003';

  -- PEDIDOS
  v_ped1 uuid := '80000000-0000-4000-8000-000000000001';
  v_ped2 uuid := '80000000-0000-4000-8000-000000000002';
  v_ped3 uuid := '80000000-0000-4000-8000-000000000003';

  -- MESAS
  v_mesa1 uuid := '90000000-0000-4000-8000-000000000001';
  v_mesa2 uuid := '90000000-0000-4000-8000-000000000002';
  v_mesa3 uuid := '90000000-0000-4000-8000-000000000003';
  v_mesa4 uuid := '90000000-0000-4000-8000-000000000004';
  v_mesa5 uuid := '90000000-0000-4000-8000-000000000005';
  v_mesa6 uuid := '90000000-0000-4000-8000-000000000006';

  -- LEADS
  v_lead1 uuid := 'a0000000-0000-4000-8000-000000000001';
  v_lead2 uuid := 'a0000000-0000-4000-8000-000000000002';
  v_lead3 uuid := 'a0000000-0000-4000-8000-000000000003';
  v_lead4 uuid := 'a0000000-0000-4000-8000-000000000004';

  -- POSTS BLOG
  v_post1 uuid := 'b0000000-0000-4000-8000-000000000001';
  v_post2 uuid := 'b0000000-0000-4000-8000-000000000002';
  v_post3 uuid := 'b0000000-0000-4000-8000-000000000003';
  v_post4 uuid := 'b0000000-0000-4000-8000-000000000004';

  -- CATEGORIAS BLOG
  v_catb1 uuid := 'c0000000-0000-4000-8000-000000000001';
  v_catb2 uuid := 'c0000000-0000-4000-8000-000000000002';
  v_catb3 uuid := 'c0000000-0000-4000-8000-000000000003';
  v_catb4 uuid := 'c0000000-0000-4000-8000-000000000004';

  -- FINANCEIRO
  v_cr1 uuid := 'd0000000-0000-4000-8000-000000000001';
  v_cr2 uuid := 'd0000000-0000-4000-8000-000000000002';
  v_cr3 uuid := 'd0000000-0000-4000-8000-000000000003';
  v_cr4 uuid := 'd0000000-0000-4000-8000-000000000004';
  v_cp1 uuid := 'e0000000-0000-4000-8000-000000000001';
  v_cp2 uuid := 'e0000000-0000-4000-8000-000000000002';
  v_cp3 uuid := 'e0000000-0000-4000-8000-000000000003';
  v_cp4 uuid := 'e0000000-0000-4000-8000-000000000004';
  v_cp5 uuid := 'e0000000-0000-4000-8000-000000000005';
  v_cp6 uuid := 'e0000000-0000-4000-8000-000000000006';

begin

  -- Buscar UUIDs dos usuários Auth por e-mail
  select id into v_admin_uid from auth.users where email = 'admin@dasmatas.com.br'       limit 1;
  select id into v_cli_uid   from auth.users where email = 'marina.andrade@hotmail.com'  limit 1;
  select id into v_fin_uid   from auth.users where email = 'financeiro@dasmatas.com.br'  limit 1;

  if v_admin_uid is null then
    raise exception 'Usuário admin@dasmatas.com.br não encontrado. Crie os três usuários no Authentication antes de rodar o seed.';
  end if;
  if v_cli_uid is null then
    raise exception 'Usuário marina.andrade@hotmail.com não encontrado. Crie os três usuários no Authentication antes de rodar o seed.';
  end if;
  if v_fin_uid is null then
    raise exception 'Usuário financeiro@dasmatas.com.br não encontrado. Crie os três usuários no Authentication antes de rodar o seed.';
  end if;

-- ---- PROFILES (trigger já cria — apenas garante role correta) ----
insert into public.profiles (id, name, role) values
  (v_admin_uid, 'Ana Costa',      'admin'),
  (v_cli_uid,   'Marina Andrade', 'cliente'),
  (v_fin_uid,   'Pedro Alves',    'financeiro')
on conflict (id) do update set name = excluded.name, role = excluded.role;

-- ---- CLIENTES ----
insert into public.clientes (id, user_id, phone, cpf, birthdate, preferencia_cafe, tipo_moagem) values
  (v_cli1, v_cli_uid,  '(31) 99812-3456', '123.456.789-00', '1988-05-14', 'moido', 'medio'),
  (v_cli2, null,       '(11) 97845-2310', '987.654.321-00', null,         'grao',  null),
  (v_cli3, null,       '(41) 98765-4321', '456.789.123-00', null,         'moido', 'fino')
on conflict (id) do nothing;

-- ---- ENDEREÇOS ----
insert into public.enderecos (id, cliente_id, apelido, cep, logradouro, numero, complemento, bairro, cidade, estado, padrao) values
  (v_end1, v_cli1, 'Casa',     '30130-009', 'Rua dos Aimorés',   '512',  'Apto 301',  'Funcionários', 'Belo Horizonte', 'MG', true),
  (v_end2, v_cli2, 'Trabalho', '01310-100', 'Avenida Paulista',  '1578', '12º andar', 'Bela Vista',   'São Paulo',      'SP', true),
  (v_end3, v_cli3, 'Casa',     '80420-210', 'Rua XV de Novembro','890',  null,         'Centro',       'Curitiba',       'PR', true)
on conflict (id) do nothing;

-- ---- PLANOS ----
insert into public.planos (id, nome, descricao, preco, beneficios, destaque, ativo, ordem) values
  (v_plan1, 'Cafés da Casa',      'Cafés especiais cuidadosamente selecionados para o cotidiano.',
   99.00,  array['2 pacotes de 250g por mês','Cafés especiais certificados','Notas sensoriais detalhadas','Conteúdo exclusivo de membro','Acesso às edições anteriores'],
   false, true, 1),
  (v_plan2, 'Cafés Selecionados', 'Uma curadoria refinada de cafés com perfis sensoriais marcantes.',
   129.00, array['2 pacotes de 250g por mês','Perfis sensoriais distintos','Diferentes regiões produtoras','Ficha técnica completa','Vídeos exclusivos sobre os produtores','Conteúdo exclusivo de membro','Acesso prioritário a novidades'],
   true, true, 2),
  (v_plan3, 'Cafés Raridades',    'Experiências sensoriais únicas com os cafés mais especiais do Brasil.',
   189.00, array['2 pacotes de 250g por mês','Cafés de alta pontuação SCA','Microlotes e edições limitadas','Experiências sensoriais únicas','Acesso a lançamentos exclusivos','Convites para eventos','Atendimento personalizado','Conteúdo premium e editorial'],
   false, true, 3)
on conflict (id) do nothing;

-- ---- CATEGORIAS PRODUTO ----
insert into public.categorias_produto (id, nome, slug) values
  (v_catprod1, 'Cafés Especiais', 'cat_especial'),
  (v_catprod2, 'Premium',         'cat_premium'),
  (v_catprod3, 'Raridades',       'cat_raridades')
on conflict (id) do nothing;

-- ---- PRODUTOS ----
insert into public.produtos (id, sku, nome, descricao, descricao_curta, preco, estoque, estoque_minimo, peso, categoria_id, notas_sensoriais, regiao, produtor, variedade, processo, altitude, torra, ativo, destaque, produto_assinatura) values
  (v_prod1,'DM-001','Serra do Caparaó — Natural',
   'Produzido nas altitudes da Serra do Caparaó, processo natural revela notas de frutas vermelhas maduras, chocolate ao leite e mel.',
   'Natural de altitude com notas de frutas vermelhas e chocolate.',
   42.00, 48, 10, 250, v_catprod1,
   array['Frutas vermelhas','Chocolate ao leite','Mel','Caramelo'],
   'Serra do Caparaó','Família Rodrigues','Catuaí Vermelho','Natural','1.350m','Média',
   true, true, true),
  (v_prod2,'DM-002','Chapada Diamantina — Lavado',
   'Das montanhas da Bahia, processo lavado com acidez brilhante e notas cítricas.',
   'Lavado da Bahia com acidez cítrica e corpo elegante.',
   48.00, 32, 8, 250, v_catprod1,
   array['Laranja','Limão siciliano','Chá branco','Açúcar mascavo'],
   'Chapada Diamantina','Sítio Flor da Serra','Arara','Lavado','1.100m','Clara',
   true, true, true),
  (v_prod3,'DM-003','Sul de Minas — Honey',
   'Um clássico do Sul de Minas em processo Honey com doçura pronunciada e notas de baunilha.',
   'Honey mineiro com notas de baunilha e damasco.',
   38.00, 60, 15, 250, v_catprod1,
   array['Baunilha','Damasco','Nozes','Caramelo'],
   'Sul de Minas','Fazenda Boa Vista','Bourbon Amarelo','Honey','900m','Média',
   true, false, true),
  (v_prod4,'DM-004','Mogiana — Fermentado',
   'Da região da Mogiana, fermentação controlada amplifica notas tropicais.',
   'Fermentado tropical com notas de manga e abacaxi.',
   58.00, 20, 5, 250, v_catprod2,
   array['Manga','Abacaxi','Hibisco','Baunilha'],
   'Mogiana','Hacienda Café','Gesha','Fermentação Anaeróbica','1.050m','Clara-Média',
   true, true, false),
  (v_prod5,'DM-005','Cerrado Mineiro — Natural',
   'O clássico do Cerrado em processo natural. Notas de chocolate amargo, nozes e corpo pleno.',
   'Clássico cerrado com chocolate amargo e corpo pleno.',
   35.00, 80, 20, 250, v_catprod1,
   array['Chocolate amargo','Nozes','Caramelo','Tabaco'],
   'Cerrado Mineiro','Cooperativa Caccer','Catuaí Amarelo','Natural','850m','Média-Escura',
   true, false, true),
  (v_prod6,'DM-006','Poços de Caldas — Microlote',
   'Microlote excepcional SCA 88 com complexidade aromática singular.',
   'Microlote SCA 88 com complexidade e dulçor extraordinários.',
   79.00, 12, 3, 100, v_catprod3,
   array['Jasmim','Pêssego','Mel de abelha','Bergamota'],
   'Poços de Caldas','Sítio das Araras','Icatu','Lavado','1.200m','Clara',
   true, true, false)
on conflict (id) do nothing;

-- ---- EDIÇÕES DO CLUBE ----
insert into public.edicoes_clube (id, titulo, mes, ano, descricao, video_youtube, texto_exclusivo, publicada) values
  (v_ed1, 'Edição Primavera — Florais e Tropicais', 10, 2025,
   'Esta edição celebra a primavera com dois cafés de perfis florais e tropicais.',
   'https://www.youtube.com/embed/dQw4w9WgXcQ',
   'Nesta edição especial, selecionamos dois cafés que evocam a leveza e a exuberância da primavera...',
   true),
  (v_ed2, 'Edição Inverno — Chocolates e Caramelos', 7, 2025,
   'Para o inverno, selecionamos dois cafés encorpados e reconfortantes.',
   null,
   null,
   true),
  (v_ed3, 'Edição Outono — Fermentados Especiais', 4, 2026,
   'Edição dedicada à complexidade e experimentação sensorial com fermentados especiais.',
   null,
   null,
   true)
on conflict (id) do nothing;

-- ---- CAFÉS DAS EDIÇÕES ----
insert into public.cafes_edicao (id, edicao_id, nome, descricao, produtor, regiao, estado, variedade, processo, altitude, torra, notas_sensoriais, sugestoes_preparo, curiosidades) values
  (v_cafe1, v_ed1, 'Serra do Caparaó — Arara Natural',
   'Café extraordinário produzido na Serra do Caparaó, perfil floral e tropical.',
   'Família Oliveira','Serra do Caparaó','MG','Arara','Natural','1.400m','Clara',
   array['Jasmim','Maracujá','Pêssego','Mel'],
   array['Coador de papel','Aeropress','V60'],
   'A variedade Arara é um híbrido brasileiro resultante do cruzamento entre Catuaí e Mundo Novo.'),
  (v_cafe2, v_ed1, 'Chapada Diamantina — Bourbon Lavado',
   'Da Bahia, café lavado com acidez vibrante e notas de frutas cítricas refinadas.',
   'Sítio Flor da Serra','Chapada Diamantina','BA','Bourbon Amarelo','Lavado','1.050m','Clara-Média',
   array['Laranja','Limão','Chá de camomila','Açúcar mascavo'],
   array['V60','Chemex','Prensa Francesa'],
   'A Chapada Diamantina ainda é uma das regiões menos exploradas do Brasil.'),
  (v_cafe3, v_ed2, 'Cerrado Mineiro — Catuaí Natural',
   'Clássico reconfortante do Cerrado, corpo pleno e notas de chocolate ao leite.',
   'Fazenda Primavera','Cerrado Mineiro','MG','Catuaí Vermelho','Natural','900m','Média',
   array['Chocolate ao leite','Caramelo','Nozes','Baunilha'],
   array['Prensa Francesa','Moka','Espresso'],
   'O Cerrado Mineiro foi a primeira região brasileira com Denominação de Origem para cafés.'),
  (v_cafe4, v_ed2, 'Sul de Minas — Bourbon Honey',
   'Processo Honey em altitude, resultando em doçura incomum e textura aveludada.',
   'Sítio Recanto Verde','Sul de Minas','MG','Bourbon Vermelho','Honey','1.000m','Média',
   array['Damasco','Tâmara','Mel','Canela'],
   array['Coador de papel','Clever Dripper','AeroPress'],
   'O processo Honey preserva parte da mucilagem da cereja, adicionando doçura natural.'),
  (v_cafe5, v_ed3, 'Mogiana — Gesha Anaeróbico',
   'Fermentação anaeróbica controlada com variedade Gesha, complexidade tropical única.',
   'Hacienda Café','Mogiana','SP','Gesha','Fermentação Anaeróbica','1.050m','Clara',
   array['Manga','Maracujá','Hibisco','Baunilha'],
   array['V60','Chemex','AeroPress'],
   'A variedade Gesha, originária da Etiópia, ganhou fama mundial no Panamá nos anos 2000.'),
  (v_cafe6, v_ed3, 'Caparaó — Icatu Natural',
   'Natural encorpado com notas de frutas vermelhas e especiarias sutis.',
   'Família Souza','Serra do Caparaó','MG','Icatu','Natural','1.250m','Média-Clara',
   array['Amora','Cereja','Cravo','Chocolate meio amargo'],
   array['Prensa Francesa','Coador de papel','Moka'],
   'O Icatu é uma variedade nacional criada pelo IAC de Campinas, resistente à ferrugem.')
on conflict (id) do nothing;

-- ---- ASSINATURAS ----
insert into public.assinaturas (id, cliente_id, plano_id, status, preferencia_cafe, tipo_moagem, endereco_id, frete, total_mensal, proxima_cobranca, proximo_envio, data_inicio) values
  (v_assin1, v_cli1, v_plan3, 'ativa',        'moido', 'medio', v_end1, 18.90, 207.90, '2026-05-05', '2026-05-08', '2026-04-05'),
  (v_assin2, v_cli2, v_plan2, 'ativa',        'grao',  null,    v_end2, 22.50, 151.50, '2026-04-20', '2026-04-23', '2026-02-20'),
  (v_assin3, v_cli3, v_plan1, 'inadimplente', 'moido', 'fino',  v_end3, 19.90, 118.90, '2026-04-15', '2026-04-18', '2026-01-15')
on conflict (id) do nothing;

-- ---- COBRANÇAS ASSINATURA ----
insert into public.cobrancas_assinatura (assinatura_id, data, valor, status, tentativas, transacao_id) values
  (v_assin1, '2026-04-05', 207.90, 'pago',    1, 'txn_abc123'),
  (v_assin2, '2026-02-20', 151.50, 'pago',    1, 'txn_def456'),
  (v_assin2, '2026-03-20', 151.50, 'pago',    1, 'txn_ghi789'),
  (v_assin2, '2026-04-20', 151.50, 'pendente',0, null),
  (v_assin3, '2026-01-15', 118.90, 'pago',    1, null),
  (v_assin3, '2026-02-15', 118.90, 'pago',    1, null),
  (v_assin3, '2026-03-15', 118.90, 'pago',    1, null),
  (v_assin3, '2026-04-15', 118.90, 'falhou',  2, null);

-- ---- CICLOS DE ASSINATURA ----
insert into public.ciclos_assinatura (assinatura_id, mes, ano, edicao_id, status, codigo_rastreio, data_envio, data_entrega) values
  (v_assin1, 4, 2026, v_ed3, 'pendente', null, null, null),
  (v_assin2, 2, 2026, v_ed1, 'entregue', 'BR123456789BR', '2026-02-23', '2026-02-28'),
  (v_assin2, 3, 2026, v_ed2, 'enviado',  'BR987654321BR', '2026-03-23', null),
  (v_assin2, 4, 2026, v_ed3, 'pendente', null, null, null),
  (v_assin3, 1, 2026, v_ed2, 'entregue', 'BR555555555BR', '2026-01-18', '2026-01-24'),
  (v_assin3, 2, 2026, v_ed1, 'entregue', 'BR666666666BR', '2026-02-18', '2026-02-25'),
  (v_assin3, 3, 2026, v_ed3, 'entregue', 'BR777777777BR', '2026-03-18', '2026-03-25');

-- ---- PEDIDOS ----
insert into public.pedidos (id, numero, cliente_id, subtotal, frete, desconto, total, status, endereco_entrega, forma_pagamento, cupom, codigo_rastreio, created_at, updated_at) values
  (v_ped1,'DM-2026-0001', v_cli1, 158.00, 18.90,  0,     176.90, 'entregue',
   '{"cep":"30130-009","logradouro":"Rua dos Aimorés","numero":"512","complemento":"Apto 301","bairro":"Funcionários","cidade":"Belo Horizonte","estado":"MG"}'::jsonb,
   'Cartão de Crédito', null, 'BR111111111BR', '2026-04-02', '2026-04-09'),
  (v_ped2,'DM-2026-0002', v_cli2, 136.00, 22.50, 13.60, 144.90, 'enviado',
   '{"cep":"01310-100","logradouro":"Avenida Paulista","numero":"1578","complemento":"12º andar","bairro":"Bela Vista","cidade":"São Paulo","estado":"SP"}'::jsonb,
   'Pix', 'DASMATAS10', 'BR222222222BR', '2026-04-10', '2026-04-12'),
  (v_ped3,'DM-2026-0003', v_cli3,  48.00, 19.90,  0,     67.90, 'pago',
   '{"cep":"80420-210","logradouro":"Rua XV de Novembro","numero":"890","bairro":"Centro","cidade":"Curitiba","estado":"PR"}'::jsonb,
   'Cartão de Crédito', null, null, '2026-04-13', '2026-04-13')
on conflict (id) do nothing;

-- ---- ITENS DE PEDIDO ----
insert into public.itens_pedido (pedido_id, produto_id, nome_produto, sku_produto, quantidade, preco_unitario, subtotal) values
  (v_ped1, v_prod6, 'Poços de Caldas — Microlote',    'DM-006', 2, 79.00, 158.00),
  (v_ped2, v_prod4, 'Mogiana — Fermentado',           'DM-004', 1, 52.00,  52.00),
  (v_ped2, v_prod1, 'Serra do Caparaó — Natural',     'DM-001', 2, 42.00,  84.00),
  (v_ped3, v_prod2, 'Chapada Diamantina — Lavado',    'DM-002', 1, 48.00,  48.00);

-- ---- MESAS ----
insert into public.mesas (id, numero, capacidade, ativa, descricao) values
  (v_mesa1, '01', 2, true,  'Mesa íntima próxima à janela'),
  (v_mesa2, '02', 4, true,  'Mesa central no salão principal'),
  (v_mesa3, '03', 4, true,  null),
  (v_mesa4, '04', 6, true,  'Mesa grande, ideal para grupos'),
  (v_mesa5, '05', 2, true,  'Mesas do jardim externo'),
  (v_mesa6, '06', 2, false, 'Em manutenção')
on conflict (id) do nothing;

-- ---- LEADS ----
insert into public.leads (id, nome, email, telefone, origem, etapa, interesse, plano_desejado, tags, responsavel, ultimo_contato, proximo_follow_up, observacoes, cliente_id) values
  (v_lead1,'Carlos Eduardo Lima','carlos.lima@email.com','(11) 99821-4532','checkout','checkout_iniciado','Clube de assinatura','Cafés Selecionados',
   array['quente','checkout-abandonado'],'Ana Costa','2026-04-12','2026-04-14',
   'Abandonou no step de endereço. Já tinha selecionado o plano Selecionados.', null),
  (v_lead2,'Fernanda Souza','fernanda.souza@gmail.com','(21) 98745-6320','reserva','interesse_reserva','Reserva de mesa',null,
   array['reserva','potencial-assinante'],'Pedro Alves','2026-04-11','2026-04-18',
   'Veio pela reserva de aniversário. Demonstrou interesse no clube durante a visita.', null),
  (v_lead3,'Roberto Machado','rmachado@empresa.com.br','(51) 99234-7815','social','novo','Presente corporativo',null,
   array['corporativo','gift'], null, null, null, null, null),
  (v_lead4,'Marina Andrade','marina.andrade@hotmail.com','(31) 99812-3456','checkout','assinatura_concluida','Clube de assinatura','Cafés Raridades',
   array['assinante','raridades'],'Ana Costa','2026-04-05', null, null, v_cli1)
on conflict (id) do nothing;

-- ---- INTERAÇÕES CRM ----
insert into public.interacoes_crm (lead_id, tipo, descricao, data, usuario) values
  (v_lead1, 'email',    'E-mail de recuperação de carrinho enviado automaticamente.', '2026-04-12', 'Sistema'),
  (v_lead2, 'whatsapp', 'Confirmação de reserva enviada. Cliente perguntou sobre o clube.', '2026-04-11', 'Pedro Alves'),
  (v_lead4, 'email',    'E-mail de boas-vindas ao clube enviado.', '2026-04-05', 'Sistema');

-- ---- RESERVAS ----
insert into public.reservas (nome, email, telefone, data, horario, pessoas, mesa_id, status, observacoes) values
  ('Fernanda Souza','fernanda.souza@gmail.com','(21) 98745-6320','2026-04-15','19:30',2, v_mesa1,'confirmada','Celebração de aniversário'),
  ('João Mendes',  'joao.mendes@email.com',   '(11) 97654-3210','2026-04-14','10:00',3, v_mesa2,'confirmada', null),
  ('Patricia Campos','patricia@email.com',    '(31) 98765-4321','2026-04-16','14:00',4, null,  'solicitada', null),
  ('Empresa TechCafé','eventos@techcafe.com.br','(11) 3456-7890','2026-04-20','09:00',8, v_mesa4,'confirmada','Evento corporativo — café da manhã');

-- ---- CATEGORIAS BLOG ----
insert into public.categorias_blog (id, nome, slug) values
  (v_catb1, 'Educação', 'educacao'),
  (v_catb2, 'Sensorial', 'sensorial'),
  (v_catb3, 'Preparo',   'preparo'),
  (v_catb4, 'Origem',    'origem')
on conflict (id) do nothing;

-- ---- POSTS BLOG ----
insert into public.posts_blog (id, titulo, slug, resumo, conteudo, autor_id, status, meta_title, meta_description, publicado_em, visualizacoes) values
  (v_post1,'Como identificar as notas sensoriais do seu café','como-identificar-notas-sensoriais-cafe',
   'Aprenda a desenvolver seu paladar e identificar os diferentes sabores e aromas presentes em um café especial.',
   '<h2>O universo sensorial do café especial</h2><p>Quando provamos um café especial pela primeira vez, é comum nos surpreendermos com a complexidade de sabores que ele pode apresentar. Chocolates, frutas, flores, mel — como é possível que uma bebida extraída de um grão contenha tanta informação sensorial?</p>',
   v_admin_uid, 'publicado',
   'Como identificar notas sensoriais do café | Das Matas',
   'Aprenda a desenvolver seu paladar e identificar os diferentes sabores e aromas presentes em um café especial.',
   '2026-03-10', 847),
  (v_post2,'Grão ou moído? O guia completo para escolher','grao-ou-moido-guia-completo',
   'Entenda as vantagens e desvantagens de cada opção e descubra qual é a melhor escolha para sua rotina com café.',
   '<h2>A eterna dúvida do apreciador de cafés</h2><p>Uma das primeiras perguntas que recebemos de novos assinantes é: devo pedir o café em grão ou já moído?</p>',
   v_admin_uid, 'publicado',
   'Grão ou moído? Guia completo | Das Matas',
   'Entenda as vantagens do café em grão e do café moído.',
   '2026-03-22', 1203),
  (v_post3,'Conheça as principais regiões produtoras de café do Brasil','principais-regioes-produtoras-cafe-brasil',
   'Do Sul de Minas à Chapada Diamantina: um panorama das principais regiões produtoras de cafés especiais.',
   '<h2>O Brasil como potência do café especial</h2><p>O Brasil é o maior produtor e exportador de café do mundo.</p>',
   v_admin_uid, 'publicado',
   'Regiões produtoras de café do Brasil | Das Matas',
   'Conheça as principais regiões produtoras de cafés especiais do Brasil.',
   '2026-04-01', 2156),
  (v_post4,'Métodos de preparo: qual combina com você?','metodos-preparo-cafe-qual-combina',
   'V60, Chemex, AeroPress, Prensa Francesa — cada método realça perfis diferentes.',
   '<h2>A arte do preparo</h2><p>Um mesmo café pode revelar características completamente diferentes dependendo do método de preparo utilizado.</p>',
   v_admin_uid, 'publicado', null, null, '2026-04-08', 934)
on conflict (id) do nothing;

-- ---- POST CATEGORIAS ----
insert into public.post_categorias (post_id, categoria_id) values
  (v_post1, v_catb1),(v_post1, v_catb2),
  (v_post2, v_catb3),
  (v_post3, v_catb1),(v_post3, v_catb4),
  (v_post4, v_catb3)
on conflict do nothing;

-- ---- POST TAGS ----
insert into public.post_tags (post_id, tag) values
  (v_post1,'notas sensoriais'),(v_post1,'paladar'),(v_post1,'café especial'),
  (v_post2,'grão'),(v_post2,'moído'),(v_post2,'moagem'),
  (v_post3,'regiões produtoras'),(v_post3,'Sul de Minas'),(v_post3,'terroir'),
  (v_post4,'V60'),(v_post4,'AeroPress'),(v_post4,'Chemex')
on conflict do nothing;

-- ---- CATEGORIAS FINANCEIRAS ----
insert into public.categorias_financeiras (nome, tipo, subcategorias) values
  ('Assinaturas',   'receita', array['Clube','Renovação']),
  ('Vendas',        'receita', array['E-commerce','Cafeteria']),
  ('Custo',         'despesa', array['Café','Embalagem','Insumos']),
  ('Logística',     'despesa', array['Frete','Embalagem']),
  ('Marketing',     'despesa', array['Tráfego Pago','Conteúdo','Influenciadores']),
  ('Operacional',   'despesa', array['Aluguel','Utilities','Manutenção']),
  ('Pessoal',       'despesa', array['Salários','Benefícios','Freelancers']),
  ('Tecnologia',    'despesa', array['Plataformas','Ferramentas','Hospedagem']);

-- ---- CONTAS A RECEBER ----
insert into public.contas_receber (id, descricao, cliente_id, valor, data_vencimento, data_recebimento, status, categoria, subcategoria, forma_pagamento, competencia, assinatura_id) values
  (v_cr1,'Assinatura Raridades — Marina Andrade / Abr',  v_cli1, 207.90,'2026-04-05','2026-04-05','recebido','Assinaturas','Clube','Cartão de Crédito','2026-04', v_assin1),
  (v_cr2,'Assinatura Selecionados — Thiago Ferreira / Abr', v_cli2, 151.50,'2026-04-20', null,'pendente','Assinaturas','Clube',null,'2026-04', v_assin2),
  (v_cr3,'Venda E-commerce — DM-2026-0001',              v_cli1, 176.90,'2026-04-02','2026-04-02','recebido','Vendas','E-commerce','Cartão de Crédito','2026-04', null),
  (v_cr4,'Venda E-commerce — DM-2026-0002',              v_cli2, 144.90,'2026-04-10','2026-04-10','recebido','Vendas','E-commerce','Pix','2026-04', null)
on conflict (id) do nothing;

-- ---- CONTAS A PAGAR ----
insert into public.contas_pagar (id, descricao, fornecedor, valor, data_vencimento, data_pagamento, status, categoria, subcategoria, forma_pagamento, competencia) values
  (v_cp1,'Aluguel — Abril/2026',       'Imobiliária Central',   3200.00,'2026-04-05','2026-04-05','pago',    'Operacional','Aluguel','Transferência','2026-04'),
  (v_cp2,'Café — Fornecedor Mensal',   'Cooperativa Sul Minas', 2800.00,'2026-04-10', null,       'pendente','Custo',      'Café',   null,           '2026-04'),
  (v_cp3,'Google Ads — Abril',         'Google',                 800.00,'2026-04-15', null,       'pendente','Marketing',  'Tráfego Pago',null,        '2026-04'),
  (v_cp4,'Melhor Envio — Faturamento', 'Melhor Envio',           450.00,'2026-04-20', null,       'pendente','Logística',  'Frete',  null,           '2026-04'),
  (v_cp5,'Pagar.me — Taxa Transações', 'Pagar.me',               320.00,'2026-04-25', null,       'pendente','Tecnologia', 'Plataformas',null,         '2026-04'),
  (v_cp6,'Salário — Equipe Abril',     'Folha de Pagamento',    4500.00,'2026-04-30', null,       'pendente','Pessoal',    'Salários',null,           '2026-04')
on conflict (id) do nothing;

end $$;
