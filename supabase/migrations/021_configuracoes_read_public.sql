-- Permite leitura pública das configurações (necessário para a página de reservas no site)
-- A policy existente "config_admin" continua cobrindo INSERT/UPDATE/DELETE para admins
create policy "config_read_public" on public.configuracoes
  for select using (true);
