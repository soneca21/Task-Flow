-- Corrige "mojibake" (acentos quebrados) em checklists já gravados no banco.
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

-- Nome do checklist
update public.checklist
   set nome = public.fix_mojibake(nome)
 where nome like '%Ã%' or nome like '%Â%';

-- Itens (jsonb array de objetos com campo "pergunta")
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

