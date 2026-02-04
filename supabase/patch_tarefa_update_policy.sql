-- Garante update de tarefa para responsaveis designados
alter table tarefa enable row level security;

drop policy if exists tarefa_update on tarefa;
create policy tarefa_update on tarefa
  for update using (
    auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador')
    and (
      is_admin()
      or exists (
        select 1
          from funcionario f
         where f.user_id = auth.uid()
           and f.id::text = any (tarefa.funcionarios_designados)
      )
    )
  )
  with check (
    auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador')
    and (
      is_admin()
      or exists (
        select 1
          from funcionario f
         where f.user_id = auth.uid()
           and f.id::text = any (tarefa.funcionarios_designados)
      )
    )
  );
