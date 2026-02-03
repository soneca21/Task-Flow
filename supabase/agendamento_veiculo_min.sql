-- agendamento_veiculo minimal schema + policies
-- execute in Supabase SQL editor

create table if not exists agendamento_veiculo (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data date,
  hora text,
  tipo text,
  veiculo_id text,
  veiculo_placa text,
  motorista_id text,
  motorista_nome text,
  status text,
  observacoes text,
  tarefa_id text,
  disparado_em timestamptz
);

create index if not exists idx_agendamento_veiculo_data on agendamento_veiculo (data);
create index if not exists idx_agendamento_veiculo_status on agendamento_veiculo (status);
create index if not exists idx_agendamento_veiculo_created on agendamento_veiculo (created_date desc);

alter table agendamento_veiculo enable row level security;

drop policy if exists agendamento_veiculo_select on agendamento_veiculo;
drop policy if exists agendamento_veiculo_insert on agendamento_veiculo;
drop policy if exists agendamento_veiculo_update on agendamento_veiculo;
drop policy if exists agendamento_veiculo_delete on agendamento_veiculo;

create policy agendamento_veiculo_select on agendamento_veiculo
  for select using (auth.role() = 'authenticated');

create policy agendamento_veiculo_insert on agendamento_veiculo
  for insert with check (auth.role() = 'authenticated');

create policy agendamento_veiculo_update on agendamento_veiculo
  for update using (auth.role() = 'authenticated');

create policy agendamento_veiculo_delete on agendamento_veiculo
  for delete using (auth.role() = 'authenticated');
