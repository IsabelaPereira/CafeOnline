-- ============================================================
-- DAS MATAS — SCHEMA COMPLETO (Supabase / PostgreSQL)
-- ============================================================
-- Execute no SQL Editor do painel Supabase em ordem.
-- ============================================================

-- Extensão para UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (estende auth.users do Supabase Auth)
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       text not null default 'cliente'
               check (role in ('admin','financeiro','operacoes','marketing','conteudo','atendimento','estoque','cliente')),
  avatar_url text,
  created_at timestamptz default now()
);

-- Trigger: criar profile automaticamente após signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'cliente')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- CLIENTES
-- ============================================================
create table public.clientes (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid unique references public.profiles(id) on delete set null,
  phone            text,
  cpf              text,
  birthdate        date,
  preferencia_cafe text check (preferencia_cafe in ('grao','moido')),
  tipo_moagem      text check (tipo_moagem in ('fino','medio','grosso','extraGrosso')),
  created_at       timestamptz default now()
);

-- ============================================================
-- ENDEREÇOS
-- ============================================================
create table public.enderecos (
  id          uuid primary key default uuid_generate_v4(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  apelido     text,
  cep         text not null,
  logradouro  text not null,
  numero      text not null,
  complemento text,
  bairro      text not null,
  cidade      text not null,
  estado      char(2) not null,
  padrao      boolean default false,
  created_at  timestamptz default now()
);

-- Garantir apenas um endereço padrão por cliente
create unique index enderecos_padrao_unico
  on public.enderecos (cliente_id)
  where padrao = true;

-- ============================================================
-- PLANOS DE ASSINATURA
-- ============================================================
create table public.planos (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  descricao   text,
  preco       numeric(10,2) not null,
  beneficios  text[] default '{}',
  destaque    boolean default false,
  ativo       boolean default true,
  ordem       integer default 0,
  created_at  timestamptz default now()
);

-- ============================================================
-- ASSINATURAS
-- ============================================================
create table public.assinaturas (
  id                  uuid primary key default uuid_generate_v4(),
  cliente_id          uuid not null references public.clientes(id),
  plano_id            uuid not null references public.planos(id),
  status              text not null default 'pendente'
                        check (status in ('ativa','pendente','inadimplente','cancelada','pausada')),
  preferencia_cafe    text check (preferencia_cafe in ('grao','moido')),
  tipo_moagem         text,
  endereco_id         uuid references public.enderecos(id),
  frete               numeric(10,2) default 0,
  total_mensal        numeric(10,2) not null,
  proxima_cobranca    date,
  proximo_envio       date,
  data_inicio         date not null default current_date,
  data_fim            date,
  motivo_cancelamento text,
  created_at          timestamptz default now()
);

-- ============================================================
-- COBRANCAS DA ASSINATURA
-- ============================================================
create table public.cobrancas_assinatura (
  id             uuid primary key default uuid_generate_v4(),
  assinatura_id  uuid not null references public.assinaturas(id) on delete cascade,
  data           timestamptz default now(),
  valor          numeric(10,2) not null,
  status         text not null default 'pendente'
                   check (status in ('pago','pendente','falhou','estornado')),
  tentativas     integer default 0,
  transacao_id   text,
  created_at     timestamptz default now()
);

-- ============================================================
-- ALTERAÇÕES DA ASSINATURA (histórico)
-- ============================================================
create table public.alteracoes_assinatura (
  id             uuid primary key default uuid_generate_v4(),
  assinatura_id  uuid not null references public.assinaturas(id) on delete cascade,
  tipo           text not null,
  de             text,
  para           text,
  data           timestamptz default now(),
  usuario        text
);

-- ============================================================
-- CATEGORIAS DE PRODUTO
-- ============================================================
create table public.categorias_produto (
  id        uuid primary key default uuid_generate_v4(),
  nome      text not null,
  slug      text unique not null,
  descricao text
);

-- ============================================================
-- PRODUTOS
-- ============================================================
create table public.produtos (
  id                 uuid primary key default uuid_generate_v4(),
  sku                text unique not null,
  nome               text not null,
  descricao          text,
  descricao_curta    text,
  preco              numeric(10,2) not null,
  preco_promocional  numeric(10,2),
  estoque            integer default 0,
  estoque_minimo     integer default 0,
  peso               integer,
  fotos              text[] default '{}',
  categoria_id       uuid references public.categorias_produto(id),
  notas_sensoriais   text[] default '{}',
  regiao             text,
  produtor           text,
  variedade          text,
  processo           text,
  altitude           text,
  torra              text,
  ativo              boolean default true,
  destaque           boolean default false,
  produto_assinatura boolean default false,
  created_at         timestamptz default now()
);

-- ============================================================
-- PEDIDOS
-- ============================================================
create table public.pedidos (
  id               uuid primary key default uuid_generate_v4(),
  numero           text unique not null,
  cliente_id       uuid references public.clientes(id),
  subtotal         numeric(10,2) not null,
  frete            numeric(10,2) default 0,
  desconto         numeric(10,2) default 0,
  total            numeric(10,2) not null,
  status           text not null default 'pendente'
                     check (status in ('pendente','pago','em_separacao','enviado','entregue','cancelado','reembolsado')),
  endereco_entrega jsonb not null,
  forma_pagamento  text,
  cupom            text,
  codigo_rastreio  text,
  observacoes      text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Trigger updated_at em pedidos
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger pedidos_updated_at
  before update on public.pedidos
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- ITENS DE PEDIDO
-- ============================================================
create table public.itens_pedido (
  id             uuid primary key default uuid_generate_v4(),
  pedido_id      uuid not null references public.pedidos(id) on delete cascade,
  produto_id     uuid references public.produtos(id),
  nome_produto   text not null,
  sku_produto    text,
  quantidade     integer not null,
  preco_unitario numeric(10,2) not null,
  subtotal       numeric(10,2) not null
);

-- ============================================================
-- MESAS DA CAFETERIA
-- ============================================================
create table public.mesas (
  id         uuid primary key default uuid_generate_v4(),
  numero     text not null,
  capacidade integer not null,
  ativa      boolean default true,
  descricao  text
);

-- ============================================================
-- LEADS / CRM
-- ============================================================
create table public.leads (
  id                uuid primary key default uuid_generate_v4(),
  nome              text not null,
  email             text not null,
  telefone          text,
  origem            text check (origem in ('checkout','reserva','manual','blog','social','indicacao','landing')),
  etapa             text not null default 'novo'
                      check (etapa in ('novo','interesse_assinatura','checkout_iniciado','assinatura_concluida','interesse_reserva','cliente_ativo','inadimplente','recuperacao','perdido')),
  interesse         text,
  plano_desejado    text,
  tags              text[] default '{}',
  responsavel       text,
  ultimo_contato    date,
  proximo_follow_up date,
  observacoes       text,
  cliente_id        uuid references public.clientes(id),
  created_at        timestamptz default now()
);

create index leads_email_idx on public.leads(email);
create index leads_etapa_idx on public.leads(etapa);

-- ============================================================
-- INTERAÇÕES CRM
-- ============================================================
create table public.interacoes_crm (
  id        uuid primary key default uuid_generate_v4(),
  lead_id   uuid not null references public.leads(id) on delete cascade,
  tipo      text not null check (tipo in ('email','whatsapp','ligacao','anotacao')),
  descricao text not null,
  data      timestamptz default now(),
  usuario   text
);

-- ============================================================
-- RESERVAS
-- ============================================================
create table public.reservas (
  id                   uuid primary key default uuid_generate_v4(),
  nome                 text not null,
  email                text not null,
  telefone             text,
  data                 date not null,
  horario              time not null,
  pessoas              integer not null,
  mesa_id              uuid references public.mesas(id),
  status               text not null default 'solicitada'
                         check (status in ('solicitada','confirmada','recusada','cancelada','concluida','no_show')),
  observacoes          text,
  observacoes_internas text,
  cliente_id           uuid references public.clientes(id),
  lead_id              uuid references public.leads(id),
  created_at           timestamptz default now()
);

create index reservas_data_idx on public.reservas(data);

-- ============================================================
-- EDIÇÕES DO CLUBE
-- ============================================================
create table public.edicoes_clube (
  id              uuid primary key default uuid_generate_v4(),
  titulo          text not null,
  mes             integer not null check (mes between 1 and 12),
  ano             integer not null,
  descricao       text,
  foto            text,
  video_youtube   text,
  texto_exclusivo text,
  publicada       boolean default false,
  created_at      timestamptz default now(),
  unique(mes, ano)
);

-- ============================================================
-- CAFÉS DAS EDIÇÕES
-- ============================================================
create table public.cafes_edicao (
  id               uuid primary key default uuid_generate_v4(),
  edicao_id        uuid not null references public.edicoes_clube(id) on delete cascade,
  nome             text not null,
  descricao        text,
  produtor         text,
  regiao           text,
  estado           char(2),
  variedade        text,
  processo         text,
  altitude         text,
  torra            text,
  notas_sensoriais text[] default '{}',
  sugestoes_preparo text[] default '{}',
  foto             text,
  curiosidades     text
);

-- ============================================================
-- CICLOS DA ASSINATURA (envio mensal)
-- ============================================================
create table public.ciclos_assinatura (
  id              uuid primary key default uuid_generate_v4(),
  assinatura_id   uuid not null references public.assinaturas(id) on delete cascade,
  mes             integer not null,
  ano             integer not null,
  edicao_id       uuid references public.edicoes_clube(id),
  status          text not null default 'pendente'
                    check (status in ('pendente','enviado','entregue')),
  codigo_rastreio text,
  data_envio      date,
  data_entrega    date
);

-- ============================================================
-- BLOG — CATEGORIAS
-- ============================================================
create table public.categorias_blog (
  id   uuid primary key default uuid_generate_v4(),
  nome text not null,
  slug text unique not null
);

-- ============================================================
-- BLOG — POSTS
-- ============================================================
create table public.posts_blog (
  id               uuid primary key default uuid_generate_v4(),
  titulo           text not null,
  slug             text unique not null,
  resumo           text,
  conteudo         text,
  imagem_destacada text,
  autor_id         uuid references public.profiles(id),
  status           text not null default 'rascunho'
                     check (status in ('rascunho','publicado','agendado')),
  meta_title       text,
  meta_description text,
  publicado_em     timestamptz,
  agendado_para    timestamptz,
  visualizacoes    integer default 0,
  created_at       timestamptz default now()
);

-- Post ↔ Categoria (many-to-many)
create table public.post_categorias (
  post_id      uuid references public.posts_blog(id) on delete cascade,
  categoria_id uuid references public.categorias_blog(id) on delete cascade,
  primary key (post_id, categoria_id)
);

-- Post → Tags (texto simples)
create table public.post_tags (
  post_id uuid references public.posts_blog(id) on delete cascade,
  tag     text not null,
  primary key (post_id, tag)
);

-- ============================================================
-- FINANCEIRO — CATEGORIAS
-- ============================================================
create table public.categorias_financeiras (
  id            uuid primary key default uuid_generate_v4(),
  nome          text not null,
  tipo          text not null check (tipo in ('receita','despesa')),
  subcategorias text[] default '{}'
);

-- ============================================================
-- CONTAS A RECEBER
-- ============================================================
create table public.contas_receber (
  id               uuid primary key default uuid_generate_v4(),
  descricao        text not null,
  cliente_id       uuid references public.clientes(id),
  valor            numeric(10,2) not null,
  data_vencimento  date not null,
  data_recebimento date,
  status           text not null default 'pendente'
                     check (status in ('pendente','recebido','vencido','cancelado')),
  categoria        text not null,
  subcategoria     text,
  centro_custo     text,
  forma_pagamento  text,
  competencia      text not null,
  pedido_id        uuid references public.pedidos(id),
  assinatura_id    uuid references public.assinaturas(id),
  observacoes      text,
  created_at       timestamptz default now()
);

-- ============================================================
-- CONTAS A PAGAR
-- ============================================================
create table public.contas_pagar (
  id              uuid primary key default uuid_generate_v4(),
  descricao       text not null,
  fornecedor      text,
  valor           numeric(10,2) not null,
  data_vencimento date not null,
  data_pagamento  date,
  status          text not null default 'pendente'
                    check (status in ('pendente','pago','vencido','cancelado')),
  categoria       text not null,
  subcategoria    text,
  centro_custo    text,
  forma_pagamento text,
  competencia     text not null,
  observacoes     text,
  anexo_url       text,
  created_at      timestamptz default now()
);

-- ============================================================
-- AVALIAÇÕES DA BOX
-- ============================================================
create table public.avaliacoes_box (
  id          uuid primary key default uuid_generate_v4(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  edicao_id   uuid not null references public.edicoes_clube(id) on delete cascade,
  nota_geral  integer check (nota_geral between 1 and 5),
  comentario  text,
  created_at  timestamptz default now(),
  unique(cliente_id, edicao_id)
);

-- ============================================================
-- AVALIAÇÕES DE CAFÉ INDIVIDUAL
-- ============================================================
create table public.avaliacoes_cafe (
  id          uuid primary key default uuid_generate_v4(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  cafe_id     uuid not null references public.cafes_edicao(id) on delete cascade,
  edicao_id   uuid not null references public.edicoes_clube(id),
  nota_geral  integer check (nota_geral between 1 and 5),
  aroma       integer check (aroma between 1 and 5),
  docura      integer check (docura between 1 and 5),
  acidez      integer check (acidez between 1 and 5),
  corpo       integer check (corpo between 1 and 5),
  finalizacao integer check (finalizacao between 1 and 5),
  comentario  text,
  created_at  timestamptz default now(),
  unique(cliente_id, cafe_id)
);

-- ============================================================
-- CONFIGURAÇÕES (singleton — apenas 1 linha, id = 1)
-- ============================================================
create table public.configuracoes (
  id        integer primary key default 1 check (id = 1),
  empresa   jsonb default '{}',
  cafeteria jsonb default '{}',
  cobranca  jsonb default '{}'
);

insert into public.configuracoes (empresa, cafeteria, cobranca) values (
  '{"nome":"Das Matas","email":"contato@dasmatas.com.br","telefone":"(11) 99999-8888","whatsapp":"5511999998888","endereco":"Rua dos Cafezeiros, 100","cep":"01310-100","cidade":"São Paulo","estado":"SP","instagram":"@dasmatas","facebook":"dasmatas"}',
  '{"capacidadeTotal":24,"tempoReservaMins":90,"aprovacaoAutomatica":false}',
  '{"diaCobranca":5,"tentativasMaximas":3,"intervaloDiasTentativas":3}'
);

-- ============================================================
-- RLS — ROW LEVEL SECURITY
-- ============================================================

-- Habilitar RLS em todas as tabelas sensíveis
alter table public.profiles          enable row level security;
alter table public.clientes          enable row level security;
alter table public.enderecos         enable row level security;
alter table public.assinaturas       enable row level security;
alter table public.cobrancas_assinatura enable row level security;
alter table public.pedidos           enable row level security;
alter table public.itens_pedido      enable row level security;
alter table public.leads             enable row level security;
alter table public.interacoes_crm    enable row level security;
alter table public.reservas          enable row level security;
alter table public.contas_receber    enable row level security;
alter table public.contas_pagar      enable row level security;
alter table public.avaliacoes_box    enable row level security;
alter table public.avaliacoes_cafe   enable row level security;
alter table public.configuracoes     enable row level security;

-- Tabelas públicas (leitura para todos, escrita autenticada)
alter table public.planos             enable row level security;
alter table public.produtos           enable row level security;
alter table public.edicoes_clube      enable row level security;
alter table public.cafes_edicao       enable row level security;
alter table public.categorias_produto enable row level security;
alter table public.posts_blog         enable row level security;
alter table public.categorias_blog    enable row level security;
alter table public.post_categorias    enable row level security;
alter table public.post_tags          enable row level security;
alter table public.mesas              enable row level security;
alter table public.categorias_financeiras enable row level security;
alter table public.ciclos_assinatura  enable row level security;
alter table public.alteracoes_assinatura enable row level security;

-- Função auxiliar: verificar papel do usuário
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- PROFILES: cada um vê o próprio perfil; admin vê todos
create policy "profiles_self" on public.profiles
  for all using (id = auth.uid() or public.get_my_role() != 'cliente');

-- CLIENTES: cliente vê apenas os próprios dados; admin/equipe vê todos
create policy "clientes_own" on public.clientes
  for select using (user_id = auth.uid() or public.get_my_role() != 'cliente');
create policy "clientes_insert" on public.clientes
  for insert with check (user_id = auth.uid() or public.get_my_role() != 'cliente');
create policy "clientes_update" on public.clientes
  for update using (user_id = auth.uid() or public.get_my_role() != 'cliente');

-- ENDEREÇOS: cliente acessa apenas os próprios
create policy "enderecos_own" on public.enderecos
  for all using (
    cliente_id in (select id from public.clientes where user_id = auth.uid())
    or public.get_my_role() != 'cliente'
  );

-- PEDIDOS: cliente vê os seus; equipe vê todos
create policy "pedidos_own" on public.pedidos
  for select using (
    cliente_id in (select id from public.clientes where user_id = auth.uid())
    or public.get_my_role() != 'cliente'
  );
create policy "pedidos_insert" on public.pedidos
  for insert with check (true);
create policy "pedidos_update" on public.pedidos
  for update using (public.get_my_role() != 'cliente');

-- ASSINATURAS: idem
create policy "assinaturas_own" on public.assinaturas
  for select using (
    cliente_id in (select id from public.clientes where user_id = auth.uid())
    or public.get_my_role() != 'cliente'
  );
create policy "assinaturas_manage" on public.assinaturas
  for all using (public.get_my_role() != 'cliente');

-- PLANOS/PRODUTOS/EDIÇÕES: leitura pública
create policy "planos_read" on public.planos for select using (true);
create policy "planos_manage" on public.planos for all using (public.get_my_role() != 'cliente');

create policy "produtos_read" on public.produtos for select using (ativo = true or public.get_my_role() != 'cliente');
create policy "produtos_manage" on public.produtos for all using (public.get_my_role() != 'cliente');

create policy "edicoes_read" on public.edicoes_clube for select using (publicada = true or public.get_my_role() != 'cliente');
create policy "edicoes_manage" on public.edicoes_clube for all using (public.get_my_role() != 'cliente');

create policy "cafes_edicao_read" on public.cafes_edicao for select using (true);
create policy "cafes_edicao_manage" on public.cafes_edicao for all using (public.get_my_role() != 'cliente');

-- BLOG: posts publicados são públicos
create policy "posts_publicados" on public.posts_blog
  for select using (status = 'publicado' or public.get_my_role() != 'cliente');
create policy "posts_manage" on public.posts_blog
  for all using (public.get_my_role() in ('admin','conteudo','marketing'));

create policy "cat_blog_read" on public.categorias_blog for select using (true);
create policy "cat_blog_manage" on public.categorias_blog for all using (public.get_my_role() != 'cliente');
create policy "post_cat_read" on public.post_categorias for select using (true);
create policy "post_cat_manage" on public.post_categorias for all using (public.get_my_role() != 'cliente');
create policy "post_tags_read" on public.post_tags for select using (true);
create policy "post_tags_manage" on public.post_tags for all using (public.get_my_role() != 'cliente');

-- RESERVAS: qualquer um pode criar; equipe gerencia
create policy "reservas_insert" on public.reservas for insert with check (true);
create policy "reservas_own" on public.reservas
  for select using (
    email = (select email from auth.users where id = auth.uid())
    or public.get_my_role() != 'cliente'
  );
create policy "reservas_manage" on public.reservas
  for update using (public.get_my_role() != 'cliente');

-- LEADS: somente equipe
create policy "leads_team" on public.leads
  for all using (public.get_my_role() != 'cliente');
create policy "leads_insert_public" on public.leads
  for insert with check (true);

create policy "interacoes_team" on public.interacoes_crm
  for all using (public.get_my_role() != 'cliente');

-- FINANCEIRO: somente admin/financeiro
create policy "cr_team" on public.contas_receber
  for all using (public.get_my_role() in ('admin','financeiro'));
create policy "cp_team" on public.contas_pagar
  for all using (public.get_my_role() in ('admin','financeiro'));
create policy "cat_fin_read" on public.categorias_financeiras
  for select using (public.get_my_role() in ('admin','financeiro'));

-- AVALIAÇÕES: cliente gerencia as suas; admin lê todas
create policy "aval_box_own" on public.avaliacoes_box
  for all using (
    cliente_id in (select id from public.clientes where user_id = auth.uid())
    or public.get_my_role() != 'cliente'
  );
create policy "aval_cafe_own" on public.avaliacoes_cafe
  for all using (
    cliente_id in (select id from public.clientes where user_id = auth.uid())
    or public.get_my_role() != 'cliente'
  );

-- CONFIGURAÇÕES: somente admin
create policy "config_admin" on public.configuracoes
  for all using (public.get_my_role() = 'admin');

-- MESAS: leitura pública; escrita admin
create policy "mesas_read" on public.mesas for select using (true);
create policy "mesas_manage" on public.mesas for all using (public.get_my_role() != 'cliente');

-- CATEGORIAS PRODUTO: leitura pública
create policy "cat_prod_read" on public.categorias_produto for select using (true);
create policy "cat_prod_manage" on public.categorias_produto for all using (public.get_my_role() != 'cliente');

-- CICLOS/COBRANÇAS/ALTERAÇÕES: acesso interno
create policy "ciclos_own" on public.ciclos_assinatura
  for select using (
    assinatura_id in (
      select id from public.assinaturas where cliente_id in (
        select id from public.clientes where user_id = auth.uid()
      )
    ) or public.get_my_role() != 'cliente'
  );
create policy "ciclos_manage" on public.ciclos_assinatura
  for all using (public.get_my_role() != 'cliente');

create policy "cob_manage" on public.cobrancas_assinatura
  for all using (public.get_my_role() != 'cliente');

create policy "alt_manage" on public.alteracoes_assinatura
  for all using (public.get_my_role() != 'cliente');

-- ============================================================
-- INDEXES DE PERFORMANCE
-- ============================================================
create index pedidos_cliente_idx       on public.pedidos(cliente_id);
create index pedidos_status_idx        on public.pedidos(status);
create index assinaturas_cliente_idx   on public.assinaturas(cliente_id);
create index assinaturas_status_idx    on public.assinaturas(status);
create index clientes_user_idx         on public.clientes(user_id);
create index posts_slug_idx            on public.posts_blog(slug);
create index posts_status_idx          on public.posts_blog(status);
create index produtos_ativo_idx        on public.produtos(ativo);
create index ciclos_assinatura_idx     on public.ciclos_assinatura(assinatura_id);
