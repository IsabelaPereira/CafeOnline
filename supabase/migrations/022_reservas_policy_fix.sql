-- Corrige a policy "reservas_own" que tentava acessar auth.users diretamente
-- (erro 42501: permission denied for table users)
-- Substitui pelo uso de auth.email() que não requer permissão adicional

drop policy if exists "reservas_own" on public.reservas;

create policy "reservas_own" on public.reservas
  for select using (
    email = auth.email()
    or public.get_my_role() != 'cliente'
  );
