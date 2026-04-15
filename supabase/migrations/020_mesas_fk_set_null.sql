-- Altera a FK reservas.mesa_id para SET NULL ao excluir uma mesa
alter table public.reservas
  drop constraint if exists reservas_mesa_id_fkey;

alter table public.reservas
  add constraint reservas_mesa_id_fkey
  foreign key (mesa_id) references public.mesas(id)
  on delete set null;
