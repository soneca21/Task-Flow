-- Patch: cria tabela tarefa_template (modelos de tarefas) + RLS
-- Execute no Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.tarefa_template (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  nome text,
  descricao text,
  tipo text,
  prioridade text,
  frente_trabalho_id text,
  frente_trabalho_nome text,
  checklist_id text,
  quantidade_profissionais integer default 1,
  observacoes text,
  ativo boolean default true
);

create index if not exists idx_tarefa_template_created on public.tarefa_template (created_date desc);

alter table public.tarefa_template enable row level security;

drop policy if exists tarefa_template_select on public.tarefa_template;
drop policy if exists tarefa_template_insert on public.tarefa_template;
drop policy if exists tarefa_template_update on public.tarefa_template;
drop policy if exists tarefa_template_delete on public.tarefa_template;

create policy tarefa_template_select on public.tarefa_template
  for select using (auth.role() = 'authenticated');

create policy tarefa_template_insert on public.tarefa_template
  for insert with check (coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'admin');

create policy tarefa_template_update on public.tarefa_template
  for update using (coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'admin')
  with check (coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'admin');

create policy tarefa_template_delete on public.tarefa_template
  for delete using (coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'admin');

