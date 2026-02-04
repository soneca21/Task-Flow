-- Seeds/atualiza Frentes de Trabalho (conforme lista confirmada).
-- Pode ser executado com segurança: usa UPSERT por (id).
--
-- Execute no Supabase SQL Editor.

insert into public.frente_trabalho (id, nome, categoria, descricao, cor, ativo, ordem) values
('logistica_expedicao_retirar', 'Expedição e Retira', 'logistica', 'Expedição e retirada/retira no balcão', '#3b82f6', true, 1),
('logistica_almoxarife', 'Almoxarife', 'logistica', 'Separação e controle de materiais', '#3b82f6', true, 2),
('logistica_motorista', 'Motorista', 'logistica', 'Transporte e entregas/retiradas', '#3b82f6', true, 3),
('logistica_aux_carga_descarga', 'Auxiliar de Carga e Descarga', 'logistica', 'Apoio no carregamento e descarregamento', '#3b82f6', true, 4),

('apoio_aux_servicos_gerais', 'Auxiliar de Serviços Gerais', 'apoio_operacional', 'Apoio operacional e serviços gerais', '#64748b', true, 1),

('mov_ponte_rolante', 'Operador de Ponte Rolante', 'movimentacao_carga', 'Movimentação interna de carga com ponte rolante', '#22c55e', true, 1),
('mov_portico', 'Operador de Pórtico', 'movimentacao_carga', 'Movimentação interna de carga com pórtico', '#22c55e', true, 2),
('mov_empilhadeira', 'Operador de Empilhadeira', 'movimentacao_carga', 'Movimentação interna de carga com empilhadeira', '#22c55e', true, 3),

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

