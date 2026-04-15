-- ============================================================
-- Atualiza o check constraint da coluna origem em leads para
-- incluir o novo valor 'landing-clube' usado pela newsletter
-- na home do site de assinatura.
-- ============================================================

alter table public.leads
  drop constraint if exists leads_origem_check;

alter table public.leads
  add constraint leads_origem_check check (origem in (
    'checkout',
    'reserva',
    'manual',
    'blog',
    'social',
    'indicacao',
    'landing',
    'landing-clube'
  ));
