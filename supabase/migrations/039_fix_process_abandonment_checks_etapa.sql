-- ============================================================
-- Corrige bug em process_abandonment_checks(): a etapa do lead
-- era sempre fixada em 'carrinho-abandonado', mesmo quando a
-- assinatura ja estava ativa (paga). Somente a tag/observacao
-- diferenciavam quem pagou; a etapa (que define a coluna no
-- Kanban do CRM) empurrava todo mundo para "Carrinho Abandonado",
-- inclusive quem ja tinha concluido o pagamento.
--
-- Tambem faz o backfill dos leads ja afetados em producao: usa o
-- resultado ja registrado em lead_abandonment_checks.result='pago'
-- para identificar com precisao quem foi mal classificado.
-- ============================================================

create or replace function public.process_abandonment_checks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec        record;
  ass_status text;
  proc_ok    integer := 0;
  tag_new    text;
  obs_new    text;
  etapa_new  text;
  tags_now   text[];
  etapa_ant  text;
  now_ts     timestamptz := now();
  follow_up  timestamptz;
begin
  follow_up := now_ts + interval '20 minutes';

  for rec in
    select id, lead_id, assinatura_id
    from public.lead_abandonment_checks
    where processed_at is null
      and scheduled_at <= now_ts
    order by scheduled_at
    limit 200
  loop
    -- status atual da assinatura
    ass_status := null;
    if rec.assinatura_id is not null then
      select status into ass_status
      from public.assinaturas
      where id = rec.assinatura_id;
    end if;

    if ass_status = 'ativa' then
      tag_new   := 'CARRINHO-ABANDONADA';
      obs_new   := 'Cliente efetivou o pagamento da assinatura pelo site';
      etapa_new := 'assinatura_concluida';
    else
      tag_new   := 'carrinho-abandonado';
      obs_new   := 'Retornou do Stripe e não concluiu o pagamento em 15 min';
      etapa_new := 'carrinho-abandonado';
    end if;

    -- tags atuais do lead (para mesclar sem perder nada)
    select tags, etapa into tags_now, etapa_ant
    from public.leads
    where id = rec.lead_id;

    if tags_now is null then
      tags_now := array[]::text[];
    end if;

    if not (tag_new = any(tags_now)) then
      tags_now := tags_now || tag_new;
    end if;

    -- atualiza o lead
    update public.leads
       set etapa             = etapa_new,
           tags              = tags_now,
           observacoes       = obs_new,
           proximo_follow_up = follow_up,
           ultimo_contato    = now_ts::date
     where id = rec.lead_id;

    -- registra historico se houve mudanca de etapa
    if etapa_ant is distinct from etapa_new then
      insert into public.historico_etapa_lead (lead_id, etapa_anterior, etapa_nova, alterado_por, alterado_em)
      values (rec.lead_id, etapa_ant, etapa_new, 'cron', now_ts);
    end if;

    -- marca check como processado
    update public.lead_abandonment_checks
       set processed_at = now_ts,
           result       = case when ass_status = 'ativa' then 'pago' else 'abandonado' end
     where id = rec.id;

    proc_ok := proc_ok + 1;
  end loop;

  return proc_ok;
end;
$$;

-- ── Backfill: corrige leads ja mal classificados por este bug ──
-- Identifica, via o resultado ja registrado em lead_abandonment_checks
-- (result='pago'), quem pagou mas ficou preso em 'carrinho-abandonado'.
do $$
declare
  afetados uuid[];
begin
  select array_agg(distinct lac.lead_id) into afetados
  from public.lead_abandonment_checks lac
  join public.leads l on l.id = lac.lead_id
  where lac.result = 'pago'
    and l.etapa = 'carrinho-abandonado';

  if afetados is not null then
    insert into public.historico_etapa_lead (lead_id, etapa_anterior, etapa_nova, alterado_por, alterado_em)
    select id, 'carrinho-abandonado', 'assinatura_concluida', 'migration_039_backfill', now()
    from unnest(afetados) as id;

    update public.leads
       set etapa = 'assinatura_concluida'
     where id = any(afetados);

    raise notice 'migration_039: % lead(s) corrigido(s) de carrinho-abandonado para assinatura_concluida', array_length(afetados, 1);
  end if;
end
$$;
