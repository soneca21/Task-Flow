-- Banco de dados completo (schema + RLS + indexes + seed)

create extension if not exists "pgcrypto";

-- Drop (cuidado: destrutivo)
drop table if exists app_logs cascade;
drop table if exists log_auditoria cascade;
drop table if exists configuracao_sistema cascade;
drop table if exists pendencia cascade;
drop table if exists agendamento_veiculo cascade;
drop table if exists veiculo cascade;
drop table if exists rota cascade;
drop table if exists nota cascade;
drop table if exists checklist cascade;
drop table if exists frente_trabalho cascade;
drop table if exists avaliacao_funcionario cascade;
drop table if exists funcionario cascade;
drop table if exists tarefa cascade;
drop table if exists tarefa_template cascade;

-- Schema
create table if not exists tarefa (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  titulo text,
  descricao text,
  tipo text,
  frente_trabalho_id text,
  frente_trabalho_nome text,
  funcionarios_designados text[],
  funcionarios_nomes text[],
  quantidade_profissionais integer,
  prioridade text,
  status text,
  nota_id text,
  nota_numero text,
  checklist_id text,
  checklist_preenchido jsonb,
  observacoes text,
  data_inicio timestamptz,
  data_conclusao timestamptz
);

create table if not exists funcionario (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  user_id uuid,
  nome text,
  vinculo text,
  cargo text,
  nivel_acesso text default 'colaborador',
  frentes_trabalho text[],
  status text,
  capacidade_tarefas integer,
  telefone text,
  data_nascimento date,
  tarefas_ativas integer default 0,
  tarefas_concluidas integer default 0,
  ativo boolean default true
);

create table if not exists tarefa_template (
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

create table if not exists avaliacao_funcionario (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  funcionario_id uuid,
  avaliador_user_id uuid,
  avaliador_nome text,
  periodo text,
  nota_geral integer,
  criterios jsonb,
  comentario text,
  tags text[],
  visivel_para_funcionario boolean default true
);

create table if not exists frente_trabalho (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  nome text,
  categoria text,
  descricao text,
  cor text,
  ativo boolean default true,
  ordem integer default 0
);

create table if not exists checklist (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  nome text,
  tipo text,
  itens jsonb,
  ativo boolean default true,
  bloqueio_saida boolean default false
);

create table if not exists nota (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  numero text,
  cliente text,
  tipo text,
  status text,
  prioridade text,
  frente_destino_id text,
  frente_destino_nome text,
  endereco_entrega text,
  cidade text,
  observacoes text,
  data_prevista date
);

create table if not exists rota (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  codigo text,
  data date,
  motorista_id text,
  motorista_nome text,
  veiculo_id text,
  veiculo_placa text,
  notas_ids text[],
  status text,
  km_inicial integer,
  hora_saida text,
  hora_retorno text
);

create table if not exists veiculo (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  placa text,
  modelo text,
  tipo text,
  status text,
  capacidade_kg integer,
  km_atual integer,
  motorista_fixo_id text,
  tipo_atendimento text,
  necessita_movimentacao boolean default false,
  equipamento_preferido text,
  ativo boolean default true
);

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
  necessita_movimentacao boolean default false,
  equipamento_preferido text,
  status text,
  observacoes text,
  tarefa_id text,
  disparado_em timestamptz
);

create table if not exists pendencia (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  titulo text,
  descricao text,
  tipo text,
  origem text,
  prioridade text,
  status text,
  responsavel_id text,
  responsavel_nome text,
  resolucao text,
  data_resolucao timestamptz
);

create table if not exists configuracao_sistema (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  chave text,
  valor text,
  tipo text,
  categoria text,
  unique (chave)
);

create table if not exists log_auditoria (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  acao text,
  entidade text,
  entidade_id text,
  descricao text
);

create table if not exists app_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page text
);

-- Indexes
create unique index if not exists uniq_funcionario_user_id on funcionario (user_id) where user_id is not null;
create unique index if not exists uniq_configuracao_sistema_chave on configuracao_sistema (chave);
create index if not exists idx_tarefa_status on tarefa (status);
create index if not exists idx_tarefa_tipo on tarefa (tipo);
create index if not exists idx_tarefa_frente on tarefa (frente_trabalho_id);
create index if not exists idx_tarefa_created on tarefa (created_date desc);
create index if not exists idx_nota_status on nota (status);
create index if not exists idx_nota_tipo on nota (tipo);
create index if not exists idx_nota_data_prevista on nota (data_prevista);
create index if not exists idx_nota_created on nota (created_date desc);
create index if not exists idx_rota_data on rota (data);
create index if not exists idx_rota_status on rota (status);
create index if not exists idx_rota_created on rota (created_date desc);
create index if not exists idx_pendencia_status on pendencia (status);
create index if not exists idx_pendencia_prioridade on pendencia (prioridade);
create index if not exists idx_pendencia_created on pendencia (created_date desc);
create index if not exists idx_funcionario_status on funcionario (status);
create index if not exists idx_funcionario_ativo on funcionario (ativo);
create index if not exists idx_veiculo_status on veiculo (status);
create index if not exists idx_veiculo_ativo on veiculo (ativo);
create index if not exists idx_agendamento_veiculo_data on agendamento_veiculo (data);
create index if not exists idx_agendamento_veiculo_status on agendamento_veiculo (status);
create index if not exists idx_agendamento_veiculo_created on agendamento_veiculo (created_date desc);
create index if not exists idx_avaliacao_funcionario_funcionario_id on avaliacao_funcionario (funcionario_id);
create index if not exists idx_avaliacao_funcionario_created on avaliacao_funcionario (created_date desc);
create index if not exists idx_tarefa_template_created on tarefa_template (created_date desc);

-- RLS
alter table tarefa enable row level security;
alter table funcionario enable row level security;
alter table avaliacao_funcionario enable row level security;
alter table frente_trabalho enable row level security;
alter table checklist enable row level security;
alter table nota enable row level security;
alter table rota enable row level security;
alter table veiculo enable row level security;
alter table agendamento_veiculo enable row level security;
alter table pendencia enable row level security;
alter table configuracao_sistema enable row level security;
alter table log_auditoria enable row level security;
alter table app_logs enable row level security;
alter table tarefa_template enable row level security;

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt()->'user_metadata'->>'role', 'colaborador')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'admin'
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('admin', 'lider')
$$;

create or replace function public.is_colaborador()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'colaborador'
$$;

-- Policies
create policy tarefa_select on tarefa for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy tarefa_insert on tarefa for insert with check (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
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
  );
create policy tarefa_delete on tarefa for delete using (is_admin());

create policy funcionario_select on funcionario for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy funcionario_insert on funcionario
  for insert with check (
    auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador')
    and (is_admin() or user_id = auth.uid())
  );
create policy funcionario_update on funcionario
  for update using (
    auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador')
    and (is_manager() or user_id = auth.uid())
  )
  with check (
    auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador')
    and (is_manager() or user_id = auth.uid())
  );
create policy funcionario_delete on funcionario for delete using (is_admin());

create policy avaliacao_funcionario_select on avaliacao_funcionario
  for select using (
    auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador')
    and (
      is_manager()
      or exists (
        select 1
          from funcionario f
         where f.id = avaliacao_funcionario.funcionario_id
           and f.user_id = auth.uid()
      )
    )
  );
create policy avaliacao_funcionario_insert on avaliacao_funcionario
  for insert with check (is_manager());
create policy avaliacao_funcionario_update on avaliacao_funcionario
  for update using (is_manager());
create policy avaliacao_funcionario_delete on avaliacao_funcionario
  for delete using (is_manager());

create policy frente_trabalho_select on frente_trabalho for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy frente_trabalho_insert on frente_trabalho for insert with check (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy frente_trabalho_update on frente_trabalho for update using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy frente_trabalho_delete on frente_trabalho for delete using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));

create policy checklist_select on checklist for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy checklist_insert on checklist for insert with check (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy checklist_update on checklist for update using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy checklist_delete on checklist for delete using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));

create policy nota_select on nota for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy nota_insert on nota for insert with check (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy nota_update on nota for update using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy nota_delete on nota for delete using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));

create policy rota_select on rota for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy rota_insert on rota for insert with check (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy rota_update on rota for update using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy rota_delete on rota for delete using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));

create policy veiculo_select on veiculo for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy veiculo_insert on veiculo for insert with check (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy veiculo_update on veiculo for update using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy veiculo_delete on veiculo for delete using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));

create policy agendamento_veiculo_select on agendamento_veiculo
  for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy agendamento_veiculo_insert on agendamento_veiculo
  for insert with check (is_manager());
create policy agendamento_veiculo_update on agendamento_veiculo
  for update using (is_manager())
  with check (is_manager());
create policy agendamento_veiculo_delete on agendamento_veiculo
  for delete using (is_manager());

create policy pendencia_select on pendencia for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy pendencia_insert on pendencia for insert with check (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy pendencia_update on pendencia for update using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy pendencia_delete on pendencia for delete using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));

create policy configuracao_sistema_select on configuracao_sistema for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy configuracao_sistema_insert on configuracao_sistema for insert with check (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy configuracao_sistema_update on configuracao_sistema for update using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy configuracao_sistema_delete on configuracao_sistema for delete using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));

create policy log_auditoria_select on log_auditoria for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy log_auditoria_insert on log_auditoria for insert with check (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy log_auditoria_update on log_auditoria for update using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy log_auditoria_delete on log_auditoria for delete using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));

create policy app_logs_select on app_logs for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy app_logs_insert on app_logs for insert with check (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy app_logs_update on app_logs for update using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy app_logs_delete on app_logs for delete using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));

create policy tarefa_template_select on tarefa_template
  for select using (auth.role() = 'authenticated' and public.current_role() in ('admin','lider','operador','colaborador'));
create policy tarefa_template_insert on tarefa_template
  for insert with check (is_admin());
create policy tarefa_template_update on tarefa_template
  for update using (is_admin())
  with check (is_admin());
create policy tarefa_template_delete on tarefa_template
  for delete using (is_admin());

-- Seed (frentes confirmadas + exemplos)
insert into frente_trabalho (id, nome, categoria, descricao, cor, ativo, ordem) values
('logistica_expedicao_retirar', 'Expedição e Retira', 'logistica', null, '#3b82f6', true, 1),
('logistica_almoxarife', 'Almoxarife', 'logistica', null, '#3b82f6', true, 2),
('logistica_motorista', 'Motorista', 'logistica', null, '#3b82f6', true, 3),
('logistica_aux_carga_descarga', 'Auxiliar de Carga e Descarga', 'logistica', null, '#3b82f6', true, 4),
('apoio_aux_servicos_gerais', 'Auxiliar de Serviços Gerais', 'apoio_operacional', null, '#64748b', true, 1),
('mov_ponte_rolante', 'Operador de Ponte Rolante', 'movimentacao_carga', null, '#22c55e', true, 1),
('mov_portico', 'Operador de Pórtico', 'movimentacao_carga', null, '#22c55e', true, 2),
('mov_empilhadeira', 'Operador de Empilhadeira', 'movimentacao_carga', null, '#22c55e', true, 3),
('prod_perfiladeira_telha_galvalume_trapezoidal', 'Operador de Perfiladeira Telha Galvalume Trapezoidal', 'producao', null, '#eab308', true, 1),
('prod_perfiladeira_telha_galvalume_ondulada', 'Operador de Perfiladeira Telha Galvalume Ondulada', 'producao', null, '#eab308', true, 2),
('prod_perfiladeira_pano_porta', 'Operador de Perfiladeira Pano de Porta', 'producao', null, '#eab308', true, 3),
('prod_perfiladeira_calha_colonial', 'Operador de Perfiladeira Calha Colonial', 'producao', null, '#eab308', true, 4),
('prod_perfiladeira_perfil_cartola', 'Operador de Perfiladeira Perfil Cartola', 'producao', null, '#eab308', true, 5),
('prod_dobra_coluna_pronta', 'Operador Dobra de Coluna Pronta', 'producao', null, '#eab308', true, 6),
('prod_dobra_vergalhao', 'Dobra de Vergalhão', 'producao', null, '#eab308', true, 7)
on conflict (id) do update set
  nome = excluded.nome,
  categoria = excluded.categoria,
  descricao = excluded.descricao,
  cor = excluded.cor,
  ativo = excluded.ativo,
  ordem = excluded.ordem;

insert into funcionario (nome, vinculo, cargo, nivel_acesso, frentes_trabalho, status, capacidade_tarefas, telefone, tarefas_ativas, tarefas_concluidas, ativo) values
('Joao Silva', 'da_casa', 'Operador de Perfiladeira Telha Galvalume Trapezoidal', 'operador', array['prod_perfiladeira_telha_galvalume_trapezoidal'], 'disponivel', 2, '11999990001', 0, 3, true),
('Maria Souza', 'da_casa', 'Operador de Perfiladeira Calha Colonial', 'colaborador', array['prod_perfiladeira_calha_colonial'], 'disponivel', 2, '11999990002', 0, 5, true),
('Carlos Lima', 'terceirizado', 'Motorista', 'colaborador', array['logistica_motorista'], 'disponivel', 1, '11999990003', 0, 2, true),
('Ana Oliveira', 'da_casa', 'Supervisora', 'admin', array['logistica_expedicao_retirar','prod_perfiladeira_telha_galvalume_trapezoidal','mov_ponte_rolante'], 'disponivel', 3, '11999990004', 0, 8, true);

with f as (
  select id from funcionario where nome = 'Ana Oliveira' limit 1
)
insert into avaliacao_funcionario (
  funcionario_id, avaliador_nome, periodo, nota_geral, criterios, comentario, tags
)
select
  f.id,
  'Diretoria',
  '2025-01',
  4,
  '{"qualidade":4,"prazo":4,"colaboracao":5}'::jsonb,
  'Boa organizacao e execucao constante.',
  array['lideranca','proatividade']
from f;

insert into veiculo (placa, modelo, tipo, status, capacidade_kg, km_atual, ativo) values
('ABC1D23', 'Iveco Daily', 'caminhao_proprio', 'disponivel', 3500, 120000, true),
('XYZ9K88', 'Fiorino', 'furgao_terceiro', 'disponivel', 800, 80000, true);

insert into checklist (nome, tipo, itens, ativo, bloqueio_saida) values
(
  'Checklist de Produção - Início de Lote',
  'producao',
  '[
    { "pergunta": "Ordem de produção conferida?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Desenho técnico disponível no posto?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Matéria-prima correta e identificada?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Dimensão inicial (mm)", "tipo_resposta": "numero", "obrigatorio": true },
    { "pergunta": "Máquina limpa e lubrificada?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Parâmetros ajustados (velocidade/pressão)?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Primeira peça aprovada?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Foto da primeira peça", "tipo_resposta": "foto_obrigatoria", "obrigatorio": true },
    { "pergunta": "EPI completo e em boas condições?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Observações do líder", "tipo_resposta": "texto", "obrigatorio": false }
  ]'::jsonb,
  true,
  false
),
(
  'Checklist de Carregamento - Expedição',
  'carregamento',
  '[
    { "pergunta": "Nota/romaneio conferidos?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Quantidade de volumes conferida?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Etiquetas/identificação dos volumes OK?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Integridade dos itens (sem avarias)?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Amarração e fixação corretas?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Foto do carregamento finalizado", "tipo_resposta": "foto_obrigatoria", "obrigatorio": true },
    { "pergunta": "Documentos entregues ao motorista?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Horário de saída", "tipo_resposta": "texto", "obrigatorio": false },
    { "pergunta": "Responsável pela conferência", "tipo_resposta": "texto", "obrigatorio": false }
  ]'::jsonb,
  true,
  false
),
(
  'Checklist de Conferência - Saída',
  'conferencia',
  '[
    { "pergunta": "Nota fiscal conferida?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Cliente e endereço confirmados?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Produtos conferidos por item?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Foto da carga no veículo", "tipo_resposta": "foto_obrigatoria", "obrigatorio": true },
    { "pergunta": "Assinatura/confirmação do responsável?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Número do lacre", "tipo_resposta": "texto", "obrigatorio": true },
    { "pergunta": "EPI do motorista OK?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Checklist de segurança aprovado?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Observações", "tipo_resposta": "texto", "obrigatorio": false }
  ]'::jsonb,
  true,
  true
),
(
  'Checklist de Retirada - Balcão/Cliente',
  'retirada',
  '[
    { "pergunta": "Documento do cliente conferido?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Autorização de retirada validada?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Quantidades separadas e conferidas?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Integridade dos itens verificada?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Assinatura do cliente registrada?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Foto da retirada", "tipo_resposta": "foto_obrigatoria", "obrigatorio": true },
    { "pergunta": "Observações", "tipo_resposta": "texto", "obrigatorio": false }
  ]'::jsonb,
  true,
  false
),
(
  'Checklist de Movimentação de Carga',
  'movimentacao',
  '[
    { "pergunta": "Área isolada e sinalizada?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Equipamento inspecionado (empilhadeira/ponte)?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Freios, buzina e luzes funcionando?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Carga dentro da capacidade do equipamento?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "EPI do operador em dia?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Amarração/estabilidade da carga OK?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Rotas livres de obstáculos?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Foto da carga movimentada", "tipo_resposta": "foto_obrigatoria", "obrigatorio": true },
    { "pergunta": "Observações", "tipo_resposta": "texto", "obrigatorio": false }
  ]'::jsonb,
  true,
  false
),
(
  'Checklist de Entrada de Veículo',
  'entrada_veiculo',
  '[
    { "pergunta": "Placa e veículo registrados?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Motorista identificado?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Documentos do veículo conferidos?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "EPI/sinalização conferidos?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Foto do veículo na chegada", "tipo_resposta": "foto_obrigatoria", "obrigatorio": true },
    { "pergunta": "Horário de chegada", "tipo_resposta": "texto", "obrigatorio": false },
    { "pergunta": "Observações", "tipo_resposta": "texto", "obrigatorio": false }
  ]'::jsonb,
  true,
  false
),
(
  'Checklist de Saída de Veículo',
  'saida_veiculo',
  '[
    { "pergunta": "Carga liberada?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Documentação entregue?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Lacre conferido?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Foto do veículo na saída", "tipo_resposta": "foto_obrigatoria", "obrigatorio": true },
    { "pergunta": "Horário de saída", "tipo_resposta": "texto", "obrigatorio": false },
    { "pergunta": "Ocorrências", "tipo_resposta": "texto", "obrigatorio": false }
  ]'::jsonb,
  true,
  false
),
(
  'Checklist de Descarga - Pátio',
  'descarga',
  '[
    { "pergunta": "Nota/romaneio recebidos conferidos?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Placa e veículo confirmados?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Motorista identificado?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Local de descarga liberado e sinalizado?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "EPI e sinalização OK?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Integridade da carga (sem avarias) confirmada?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Foto da carga na chegada", "tipo_resposta": "foto_obrigatoria", "obrigatorio": true },
    { "pergunta": "Foto após descarregar", "tipo_resposta": "foto_obrigatoria", "obrigatorio": false },
    { "pergunta": "Observações", "tipo_resposta": "texto", "obrigatorio": false }
  ]'::jsonb,
  true,
  false
),
(
  'Checklist de Troca - Pátio',
  'troca',
  '[
    { "pergunta": "Motivo da troca informado?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Itens devolvidos conferidos?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Itens para entrega conferidos?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Conferência por item realizada?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Foto dos itens devolvidos", "tipo_resposta": "foto_obrigatoria", "obrigatorio": true },
    { "pergunta": "Foto dos itens entregues", "tipo_resposta": "foto_obrigatoria", "obrigatorio": true },
    { "pergunta": "Assinatura/confirmação do responsável?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Observações", "tipo_resposta": "texto", "obrigatorio": false }
  ]'::jsonb,
  true,
  false
),
(
  'Checklist de Devolução - Pátio',
  'devolucao',
  '[
    { "pergunta": "Motivo da devolução informado?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Itens devolvidos conferidos por item?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Condição/avarias registradas?", "tipo_resposta": "sim_nao", "obrigatorio": true },
    { "pergunta": "Destino informado (estoque/produção/sucata)?", "tipo_resposta": "texto", "obrigatorio": true },
    { "pergunta": "Foto dos itens devolvidos", "tipo_resposta": "foto_obrigatoria", "obrigatorio": true },
    { "pergunta": "Foto da nota/romaneio (se houver)", "tipo_resposta": "foto_obrigatoria", "obrigatorio": false },
    { "pergunta": "Observações", "tipo_resposta": "texto", "obrigatorio": false }
  ]'::jsonb,
  true,
  false
);

insert into configuracao_sistema (chave, valor, tipo, categoria) values
('notificar_tarefas_urgentes', 'true', 'booleano', 'notificacoes'),
('notificar_mudancas_status', 'true', 'booleano', 'notificacoes'),
('notificar_alertas_seguranca', 'true', 'booleano', 'notificacoes'),
('notificar_funcionario_disponivel', 'true', 'booleano', 'notificacoes'),
('foto_obrigatoria_conferencia', 'false', 'booleano', 'seguranca'),
('foto_obrigatoria_todos', 'false', 'booleano', 'seguranca'),
('automacao_nota_trigger_status', 'em_expedicao', 'texto', 'automacao'),
('automacao_nota_status_producao', 'em_producao', 'texto', 'automacao'),
('automacao_frente_categoria_producao', 'producao', 'texto', 'automacao'),
('automacao_tarefa_tipo_default', 'producao', 'texto', 'automacao'),
('automacao_tarefa_prioridade_default', 'media', 'texto', 'automacao'),
('automacao_tarefa_status_execucao', 'em_execucao', 'texto', 'automacao'),
('automacao_tarefa_status_aguardando', 'aguardando_alocacao', 'texto', 'automacao'),
('automacao_auto_distribuicao_score_sem_disponiveis', 'true', 'booleano', 'automacao'),
('automacao_quantidade_urgente', '2', 'numero', 'automacao'),
('automacao_quantidade_default', '1', 'numero', 'automacao'),
('automacao_tipo_nota_entrega', 'entrega', 'texto', 'automacao'),
('automacao_tipo_nota_retirada_balcao', 'retirada', 'texto', 'automacao'),
('automacao_tipo_nota_retirada_terceiro', 'retirada', 'texto', 'automacao'),
('automacao_tipo_nota_transferencia', 'movimentacao', 'texto', 'automacao')
on conflict (chave) do update set
  valor = excluded.valor,
  tipo = excluded.tipo,
  categoria = excluded.categoria;

insert into nota (numero, cliente, tipo, status, prioridade, frente_destino_id, frente_destino_nome, endereco_entrega, cidade, observacoes, data_prevista) values
('NF-1001', 'Construtora Alfa', 'entrega', 'em_expedicao', 'normal', 'logistica_expedicao_retirar', 'Expedicao e Retira', 'Rua A, 123', 'Sao Paulo', 'Entrega pela manha', current_date + 2),
('NF-1002', 'Cliente Beta', 'retirada_balcao', 'em_expedicao', 'alta', 'logistica_expedicao_retirar', 'Expedicao e Retira', '', 'Sao Paulo', 'Cliente retira', current_date + 1);

insert into pendencia (titulo, descricao, tipo, origem, prioridade, status, responsavel_id, responsavel_nome) values
('Atraso no fornecimento', 'Fornecedor atrasou materia-prima', 'processo', 'externo', 'critica', 'aberta', null, null),
('Equipamento com manutencao', 'Maquina precisa de revisao', 'manutencao', 'interno', 'media', 'em_analise', null, null);

with f as (
  select id, nome from funcionario where nome = 'Joao Silva' limit 1
)
insert into tarefa (
  titulo, descricao, tipo, frente_trabalho_id, frente_trabalho_nome,
  funcionarios_designados, funcionarios_nomes, quantidade_profissionais,
  prioridade, status, nota_numero, checklist_id, observacoes
)
select
  'Perfiladeira - Nota NF-1001',
  'Produzir itens da nota NF-1001',
  'producao',
  'prod_perfiladeira_telha_galvalume_trapezoidal',
  'Operador de Perfiladeira Telha Galvalume Trapezoidal',
  array[f.id::text],
  array[f.nome],
  1,
  'media',
  'criada',
  'NF-1001',
  null,
  'Prioridade normal'
from f;

