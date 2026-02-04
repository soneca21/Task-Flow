-- Patch: adiciona campos e ajusta permissões para Agendamentos/Veículos (atendimento no pátio)
-- Execute no Supabase SQL Editor.

-- 1) Colunas novas
alter table public.veiculo
  add column if not exists tipo_atendimento text,
  add column if not exists necessita_movimentacao boolean default false,
  add column if not exists equipamento_preferido text;

alter table public.agendamento_veiculo
  add column if not exists necessita_movimentacao boolean default false,
  add column if not exists equipamento_preferido text;

update public.veiculo
   set necessita_movimentacao = false
 where necessita_movimentacao is null;

update public.agendamento_veiculo
   set necessita_movimentacao = false
 where necessita_movimentacao is null;

-- 2) RLS: apenas Admin/Líder pode criar/editar/excluir agendamentos.
alter table public.agendamento_veiculo enable row level security;

drop policy if exists agendamento_veiculo_select on public.agendamento_veiculo;
drop policy if exists agendamento_veiculo_insert on public.agendamento_veiculo;
drop policy if exists agendamento_veiculo_update on public.agendamento_veiculo;
drop policy if exists agendamento_veiculo_delete on public.agendamento_veiculo;

create policy agendamento_veiculo_select on public.agendamento_veiculo
  for select
  using (auth.role() = 'authenticated');

create policy agendamento_veiculo_insert on public.agendamento_veiculo
  for insert
  with check (coalesce(auth.jwt()->'user_metadata'->>'role', '') in ('admin','lider'));

create policy agendamento_veiculo_update on public.agendamento_veiculo
  for update
  using (coalesce(auth.jwt()->'user_metadata'->>'role', '') in ('admin','lider'))
  with check (coalesce(auth.jwt()->'user_metadata'->>'role', '') in ('admin','lider'));

create policy agendamento_veiculo_delete on public.agendamento_veiculo
  for delete
  using (coalesce(auth.jwt()->'user_metadata'->>'role', '') in ('admin','lider'));

