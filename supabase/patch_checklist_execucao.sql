-- Adiciona tabela de execucao de checklist (historico)
create table if not exists checklist_execucao (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  tarefa_id text,
  checklist_id text,
  funcionario_id text,
  funcionario_nome text,
  status text,
  respostas jsonb,
  data_conclusao timestamptz
);

create index if not exists idx_checklist_execucao_tarefa on checklist_execucao (tarefa_id);
create index if not exists idx_checklist_execucao_created on checklist_execucao (created_date desc);

alter table checklist_execucao enable row level security;

create policy checklist_execucao_select on checklist_execucao
  for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy checklist_execucao_insert on checklist_execucao
  for insert with check (
    auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador')
    and (
      is_manager()
      or exists (
        select 1
          from tarefa t
          join funcionario f on f.user_id = auth.uid()
         where t.id::text = checklist_execucao.tarefa_id
           and f.id::text = any (t.funcionarios_designados)
      )
    )
  );
create policy checklist_execucao_update on checklist_execucao
  for update using (
    auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador')
    and (
      is_manager()
      or exists (
        select 1
          from tarefa t
          join funcionario f on f.user_id = auth.uid()
         where t.id::text = checklist_execucao.tarefa_id
           and f.id::text = any (t.funcionarios_designados)
      )
    )
  )
  with check (
    auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador')
    and (
      is_manager()
      or exists (
        select 1
          from tarefa t
          join funcionario f on f.user_id = auth.uid()
         where t.id::text = checklist_execucao.tarefa_id
           and f.id::text = any (t.funcionarios_designados)
      )
    )
  );
create policy checklist_execucao_delete on checklist_execucao for delete using (is_admin());
