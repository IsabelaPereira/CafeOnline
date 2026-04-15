-- ============================================================
-- Agendamento server-side do processamento de carrinho abandonado
-- ------------------------------------------------------------
-- Executa a Edge Function `process-abandonment-checks` a cada 1 min.
-- Requisitos no projeto Supabase:
--   - extensão pg_cron habilitada (Database → Extensions)
--   - extensão pg_net  habilitada (para http_post)
--   - GUCs definidos (ver bloco "Configuração" abaixo)
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ------------------------------------------------------------
-- Configuração (execute uma vez por ambiente, como superuser):
-- ------------------------------------------------------------
-- alter database postgres
--   set "app.settings.supabase_url" = 'https://SEU_PROJETO.supabase.co';
-- alter database postgres
--   set "app.settings.service_role_key" = 'eyJhbGciOi...';
-- ------------------------------------------------------------

-- Remove job anterior (se existir) para permitir re-agendamento idempotente
do $$
begin
  if exists (select 1 from cron.job where jobname = 'process-abandonment-checks') then
    perform cron.unschedule('process-abandonment-checks');
  end if;
end
$$;

-- Agenda: a cada 1 minuto chama a Edge Function via HTTP
select cron.schedule(
  'process-abandonment-checks',
  '* * * * *',
  $cron$
  select net.http_post(
    url     := current_setting('app.settings.supabase_url') || '/functions/v1/process-abandonment-checks',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);
