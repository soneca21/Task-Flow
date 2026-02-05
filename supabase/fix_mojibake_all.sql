-- Corrige "mojibake" (acentos quebrados) em campos de texto do banco.
-- Ex: "ProduÃ§Ã£o" -> "Produção"
--
-- Execute no Supabase SQL Editor.

create or replace function public.fix_mojibake(input text)
returns text
language plpgsql
immutable
as $$
begin
  if input is null then
    return null;
  end if;

  -- Caso típico: UTF-8 interpretado como Latin1.
  return convert_from(convert_to(input, 'LATIN1'), 'UTF8');
exception when others then
  -- Se não der para converter (texto já OK ou outro caso), retorna como está.
  return input;
end;
$$;

-- =========
-- TAREFAS
-- =========
update public.tarefa
   set titulo = public.fix_mojibake(titulo)
 where titulo like '%Ã%' or titulo like '%Â%';

update public.tarefa
   set descricao = public.fix_mojibake(descricao)
 where descricao like '%Ã%' or descricao like '%Â%';

update public.tarefa
   set frente_trabalho_nome = public.fix_mojibake(frente_trabalho_nome)
 where frente_trabalho_nome like '%Ã%' or frente_trabalho_nome like '%Â%';

update public.tarefa
   set observacoes = public.fix_mojibake(observacoes)
 where observacoes like '%Ã%' or observacoes like '%Â%';

update public.tarefa
   set funcionarios_nomes = (
     select array_agg(public.fix_mojibake(u.elem) order by u.ord)
       from unnest(public.tarefa.funcionarios_nomes) with ordinality as u(elem, ord)
   )
 where public.tarefa.funcionarios_nomes is not null
   and array_to_string(public.tarefa.funcionarios_nomes, ',') like '%Ã%';

-- =========
-- FUNCIONÁRIOS
-- =========
update public.funcionario
   set nome = public.fix_mojibake(nome)
 where nome like '%Ã%' or nome like '%Â%';

update public.funcionario
   set cargo = public.fix_mojibake(cargo)
 where cargo like '%Ã%' or cargo like '%Â%';

-- =========
-- TEMPLATES
-- =========
update public.tarefa_template
   set nome = public.fix_mojibake(nome)
 where nome like '%Ã%' or nome like '%Â%';

update public.tarefa_template
   set descricao = public.fix_mojibake(descricao)
 where descricao like '%Ã%' or descricao like '%Â%';

update public.tarefa_template
   set frente_trabalho_nome = public.fix_mojibake(frente_trabalho_nome)
 where frente_trabalho_nome like '%Ã%' or frente_trabalho_nome like '%Â%';

update public.tarefa_template
   set observacoes = public.fix_mojibake(observacoes)
 where observacoes like '%Ã%' or observacoes like '%Â%';

-- =========
-- AVALIAÇÕES
-- =========
update public.avaliacao_funcionario
   set avaliador_nome = public.fix_mojibake(avaliador_nome)
 where avaliador_nome like '%Ã%' or avaliador_nome like '%Â%';

update public.avaliacao_funcionario
   set comentario = public.fix_mojibake(comentario)
 where comentario like '%Ã%' or comentario like '%Â%';

update public.avaliacao_funcionario
   set tags = (
     select array_agg(public.fix_mojibake(u.elem) order by u.ord)
       from unnest(public.avaliacao_funcionario.tags) with ordinality as u(elem, ord)
   )
 where public.avaliacao_funcionario.tags is not null
   and array_to_string(public.avaliacao_funcionario.tags, ',') like '%Ã%';

-- =========
-- FRENTES DE TRABALHO
-- =========
update public.frente_trabalho
   set nome = public.fix_mojibake(nome)
 where nome like '%Ã%' or nome like '%Â%';

update public.frente_trabalho
   set descricao = public.fix_mojibake(descricao)
 where descricao like '%Ã%' or descricao like '%Â%';

-- =========
-- CHECKLISTS
-- =========
update public.checklist
   set nome = public.fix_mojibake(nome)
 where nome like '%Ã%' or nome like '%Â%';

update public.checklist
   set itens = (
     select jsonb_agg(
              case
                when jsonb_typeof(e.elem) = 'object' and (e.elem ? 'pergunta') then
                  e.elem || jsonb_build_object('pergunta', public.fix_mojibake(e.elem->>'pergunta'))
                else
                  e.elem
              end
              order by e.ord
            )
       from jsonb_array_elements(public.checklist.itens) with ordinality as e(elem, ord)
   )
 where public.checklist.itens is not null
   and public.checklist.itens::text like '%Ã%';

update public.checklist_execucao
   set funcionario_nome = public.fix_mojibake(funcionario_nome)
 where funcionario_nome like '%Ã%' or funcionario_nome like '%Â%';

-- =========
-- NOTAS / ROTAS / VEÍCULOS / AGENDAMENTOS
-- =========
update public.nota
   set cliente = public.fix_mojibake(cliente)
 where cliente like '%Ã%' or cliente like '%Â%';

update public.nota
   set frente_destino_nome = public.fix_mojibake(frente_destino_nome)
 where frente_destino_nome like '%Ã%' or frente_destino_nome like '%Â%';

update public.nota
   set endereco_entrega = public.fix_mojibake(endereco_entrega)
 where endereco_entrega like '%Ã%' or endereco_entrega like '%Â%';

update public.nota
   set cidade = public.fix_mojibake(cidade)
 where cidade like '%Ã%' or cidade like '%Â%';

update public.nota
   set observacoes = public.fix_mojibake(observacoes)
 where observacoes like '%Ã%' or observacoes like '%Â%';

update public.rota
   set motorista_nome = public.fix_mojibake(motorista_nome)
 where motorista_nome like '%Ã%' or motorista_nome like '%Â%';

update public.veiculo
   set modelo = public.fix_mojibake(modelo)
 where modelo like '%Ã%' or modelo like '%Â%';

update public.agendamento_veiculo
   set motorista_nome = public.fix_mojibake(motorista_nome)
 where motorista_nome like '%Ã%' or motorista_nome like '%Â%';

update public.agendamento_veiculo
   set observacoes = public.fix_mojibake(observacoes)
 where observacoes like '%Ã%' or observacoes like '%Â%';

-- =========
-- PENDÊNCIAS
-- =========
update public.pendencia
   set titulo = public.fix_mojibake(titulo)
 where titulo like '%Ã%' or titulo like '%Â%';

update public.pendencia
   set descricao = public.fix_mojibake(descricao)
 where descricao like '%Ã%' or descricao like '%Â%';

update public.pendencia
   set responsavel_nome = public.fix_mojibake(responsavel_nome)
 where responsavel_nome like '%Ã%' or responsavel_nome like '%Â%';

update public.pendencia
   set resolucao = public.fix_mojibake(resolucao)
 where resolucao like '%Ã%' or resolucao like '%Â%';

-- =========
-- AUDITORIA / CONFIGURAÇÕES
-- =========
update public.log_auditoria
   set descricao = public.fix_mojibake(descricao)
 where descricao like '%Ã%' or descricao like '%Â%';

update public.configuracao_sistema
   set valor = public.fix_mojibake(valor)
 where valor like '%Ã%' or valor like '%Â%';

