-- ============================================================
-- Corrige a função process_abandonment_checks:
--   - proximo_follow_up agora é timestamptz (migração 031)
--   - ultimo_contato continua date → usamos now_ts::date em vez
--     de to_char(...), que retornava text e quebrava o UPDATE.
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
    ass_status := null;
    if rec.assinatura_id is not null then
      select status into ass_status
        from public.assinaturas
       where id = rec.assinatura_id;
    end if;

    if ass_status = 'ativa' then
      tag_new := 'CARRINHO-ABANDONADA';
      obs_new := 'Cliente efetivou o pagamento da assinatura pelo site';
    else
      tag_new := 'carrinho-abandonado';
      obs_new := 'Retornou do Stripe e não concluiu o pagamento em 15 min';
    end if;

    select tags, etapa into tags_now, etapa_ant
      from public.leads
     where id = rec.lead_id;

    if tags_now is null then
      tags_now := array[]::text[];
    end if;

    if not (tag_new = any(tags_now)) then
      tags_now := tags_now || tag_new;
    end if;

    update public.leads
       set etapa             = 'carrinho-abandonado',
           tags              = tags_now,
           observacoes       = obs_new,
           proximo_follow_up = follow_up,
           ultimo_contato    = now_ts::date
     where id = rec.lead_id;

    if etapa_ant is distinct from 'carrinho-abandonado' then
      insert into public.historico_etapa_lead (lead_id, etapa_anterior, etapa_nova, alterado_por, alterado_em)
      values (rec.lead_id, etapa_ant, 'carrinho-abandonado', 'cron', now_ts);
    end if;

    update public.lead_abandonment_checks
       set processed_at = now_ts,
           result       = case when ass_status = 'ativa' then 'pago' else 'abandonado' end
     where id = rec.id;

    proc_ok := proc_ok + 1;
  end loop;

  return proc_ok;
end;
$$;
