-- ============================================================
-- Auditoria completa da área administrativa
-- Registra automaticamente todos os INSERT / UPDATE / DELETE
-- nas tabelas relevantes, com identificação do usuário
-- autenticado via auth.uid().
-- ============================================================

-- ── Tabela principal ─────────────────────────────────────────
create table if not exists public.audit_logs (
  id           uuid        primary key default gen_random_uuid(),
  usuario_id   uuid,
  usuario_nome text,
  usuario_email text,
  operacao     text        not null check (operacao in ('INSERT','UPDATE','DELETE')),
  tabela       text        not null,
  registro_id  text,
  dados_antes  jsonb,
  dados_depois jsonb,
  criado_em    timestamptz not null default now()
);

create index if not exists audit_logs_criado_em_idx  on public.audit_logs (criado_em desc);
create index if not exists audit_logs_usuario_id_idx on public.audit_logs (usuario_id);
create index if not exists audit_logs_tabela_idx     on public.audit_logs (tabela);
create index if not exists audit_logs_operacao_idx   on public.audit_logs (operacao);

-- ── RLS: apenas usuários autenticados admin lêem; inserção só pelo trigger ──
alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin"
  on public.audit_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
    )
  );

-- ── Função trigger genérica ───────────────────────────────────
create or replace function public.fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid;
  v_user_nome   text;
  v_user_email  text;
  v_reg_id      text;
  v_antes       jsonb;
  v_depois      jsonb;
  v_antes_clean jsonb;
  v_depois_clean jsonb;
  k             text;
begin
  -- Captura o usuário autenticado (disponível nas chamadas do supabase client)
  v_user_id := auth.uid();

  if v_user_id is not null then
    select name, email
      into v_user_nome, v_user_email
      from public.profiles
     where id = v_user_id;
  end if;

  -- Monta os dados conforme a operação
  if TG_OP = 'DELETE' then
    v_reg_id := OLD.id::text;
    v_antes  := row_to_json(OLD)::jsonb;
    v_depois := null;
  elsif TG_OP = 'INSERT' then
    v_reg_id := NEW.id::text;
    v_antes  := null;
    v_depois := row_to_json(NEW)::jsonb;
  else -- UPDATE
    v_reg_id := NEW.id::text;
    v_antes  := row_to_json(OLD)::jsonb;
    v_depois := row_to_json(NEW)::jsonb;

    -- Guarda apenas os campos que realmente mudaram
    v_antes_clean  := '{}'::jsonb;
    v_depois_clean := '{}'::jsonb;
    for k in select jsonb_object_keys(v_depois)
    loop
      if (v_antes->k) is distinct from (v_depois->k) then
        v_antes_clean  := v_antes_clean  || jsonb_build_object(k, v_antes->k);
        v_depois_clean := v_depois_clean || jsonb_build_object(k, v_depois->k);
      end if;
    end loop;
    v_antes  := v_antes_clean;
    v_depois := v_depois_clean;

    -- Ignora updates que não alteraram nenhum campo relevante
    if v_depois = '{}'::jsonb then
      return NEW;
    end if;
  end if;

  insert into public.audit_logs (
    usuario_id, usuario_nome, usuario_email,
    operacao, tabela, registro_id,
    dados_antes, dados_depois
  ) values (
    v_user_id, v_user_nome, v_user_email,
    TG_OP, TG_TABLE_NAME, v_reg_id,
    v_antes, v_depois
  );

  return coalesce(NEW, OLD);
end;
$$;

-- ── Aplica triggers nas tabelas relevantes ────────────────────
do $$
declare
  t text;
  tabelas text[] := array[
    'leads',
    'clientes',
    'enderecos',
    'pedidos',
    'itens_pedido',
    'assinaturas',
    'cobrancas_assinatura',
    'ciclos_assinatura',
    'planos',
    'produtos',
    'categorias_produto',
    'posts_blog',
    'reservas',
    'mesas',
    'edicoes_clube',
    'cafes_edicao',
    'configuracoes',
    'contas_receber',
    'contas_pagar',
    'profiles',
    'interacoes_crm'
  ];
begin
  foreach t in array tabelas loop
    execute format(
      'drop trigger if exists trg_audit_%1$s on public.%1$I;
       create trigger trg_audit_%1$s
         after insert or update or delete
         on public.%1$I
         for each row execute function public.fn_audit_log();',
      t
    );
  end loop;
end;
$$;
