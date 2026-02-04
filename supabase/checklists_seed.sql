-- Checklists detalhados do sistema
-- execute no Supabase SQL editor

delete from checklist
where nome in (
  'Checklist de Produção - Início de Lote',
  'Checklist de Carregamento - Expedição',
  'Checklist de Conferência - Saída',
  'Checklist de Retirada - Balcão/Cliente',
  'Checklist de Movimentação de Carga',
  'Checklist de Entrada de Veículo',
  'Checklist de Saída de Veículo',
  'Checklist de Descarga - Pátio',
  'Checklist de Troca - Pátio',
  'Checklist de Devolução - Pátio'
);

insert into checklist (nome, tipo, itens, ativo, bloqueio_saida) values
(
  'Checklist de Produção - Início de Lote',
  'producao',
  $$[
    {"pergunta":"Ordem de produção conferida?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Desenho técnico disponível no posto?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Matéria-prima correta e identificada?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Dimensão inicial (mm)","tipo_resposta":"numero","obrigatorio":true},
    {"pergunta":"Máquina limpa e lubrificada?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Parâmetros ajustados (velocidade/pressão)?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Primeira peça aprovada?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Foto da primeira peça","tipo_resposta":"foto_obrigatoria","obrigatorio":true},
    {"pergunta":"EPI completo e em boas condições?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Observações do líder","tipo_resposta":"texto","obrigatorio":false}
  ]$$::jsonb,
  true,
  false
),
(
  'Checklist de Carregamento - Expedição',
  'carregamento',
  $$[
    {"pergunta":"Nota/romaneio conferidos?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Quantidade de volumes conferida?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Etiquetas/identificação dos volumes OK?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Integridade dos itens (sem avarias)?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Amarração e fixação corretas?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Foto do carregamento finalizado","tipo_resposta":"foto_obrigatoria","obrigatorio":true},
    {"pergunta":"Documentos entregues ao motorista?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Horário de saída","tipo_resposta":"texto","obrigatorio":false},
    {"pergunta":"Responsável pela conferência","tipo_resposta":"texto","obrigatorio":false}
  ]$$::jsonb,
  true,
  false
),
(
  'Checklist de Conferência - Saída',
  'conferencia',
  $$[
    {"pergunta":"Nota fiscal conferida?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Cliente e endereço confirmados?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Produtos conferidos por item?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Foto da carga no veículo","tipo_resposta":"foto_obrigatoria","obrigatorio":true},
    {"pergunta":"Assinatura/confirmação do responsável?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Número do lacre","tipo_resposta":"texto","obrigatorio":true},
    {"pergunta":"EPI do motorista OK?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Checklist de segurança aprovado?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Observações","tipo_resposta":"texto","obrigatorio":false}
  ]$$::jsonb,
  true,
  true
),
(
  'Checklist de Retirada - Balcão/Cliente',
  'retirada',
  $$[
    {"pergunta":"Documento do cliente conferido?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Autorização de retirada validada?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Quantidades separadas e conferidas?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Integridade dos itens verificada?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Assinatura do cliente registrada?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Foto da retirada","tipo_resposta":"foto_obrigatoria","obrigatorio":true},
    {"pergunta":"Observações","tipo_resposta":"texto","obrigatorio":false}
  ]$$::jsonb,
  true,
  false
),
(
  'Checklist de Movimentação de Carga',
  'movimentacao',
  $$[
    {"pergunta":"Área isolada e sinalizada?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Equipamento inspecionado (empilhadeira/ponte)?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Freios, buzina e luzes funcionando?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Carga dentro da capacidade do equipamento?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"EPI do operador em dia?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Amarração/estabilidade da carga OK?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Rotas livres de obstáculos?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Foto da carga movimentada","tipo_resposta":"foto_obrigatoria","obrigatorio":true},
    {"pergunta":"Observações","tipo_resposta":"texto","obrigatorio":false}
  ]$$::jsonb,
  true,
  false
),
(
  'Checklist de Entrada de Veículo',
  'entrada_veiculo',
  $$[
    {"pergunta":"Placa e veículo registrados?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Motorista identificado?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Documentos do veículo conferidos?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"EPI/sinalização conferidos?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Foto do veículo na chegada","tipo_resposta":"foto_obrigatoria","obrigatorio":true},
    {"pergunta":"Horário de chegada","tipo_resposta":"texto","obrigatorio":false},
    {"pergunta":"Observações","tipo_resposta":"texto","obrigatorio":false}
  ]$$::jsonb,
  true,
  false
),
(
  'Checklist de Saída de Veículo',
  'saida_veiculo',
  $$[
    {"pergunta":"Carga liberada?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Documentação entregue?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Lacre conferido?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Foto do veículo na saída","tipo_resposta":"foto_obrigatoria","obrigatorio":true},
    {"pergunta":"Horário de saída","tipo_resposta":"texto","obrigatorio":false},
    {"pergunta":"Ocorrências","tipo_resposta":"texto","obrigatorio":false}
  ]$$::jsonb,
  true,
  false
),
(
  'Checklist de Descarga - Pátio',
  'descarga',
  $$[
    {"pergunta":"Nota/romaneio recebidos conferidos?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Placa e veículo confirmados?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Motorista identificado?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Local de descarga liberado e sinalizado?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"EPI e sinalização OK?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Integridade da carga (sem avarias) confirmada?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Foto da carga na chegada","tipo_resposta":"foto_obrigatoria","obrigatorio":true},
    {"pergunta":"Foto após descarregar","tipo_resposta":"foto_obrigatoria","obrigatorio":false},
    {"pergunta":"Observações","tipo_resposta":"texto","obrigatorio":false}
  ]$$::jsonb,
  true,
  false
),
(
  'Checklist de Troca - Pátio',
  'troca',
  $$[
    {"pergunta":"Motivo da troca informado?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Itens devolvidos conferidos?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Itens para entrega conferidos?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Conferência por item realizada?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Foto dos itens devolvidos","tipo_resposta":"foto_obrigatoria","obrigatorio":true},
    {"pergunta":"Foto dos itens entregues","tipo_resposta":"foto_obrigatoria","obrigatorio":true},
    {"pergunta":"Assinatura/confirmação do responsável?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Observações","tipo_resposta":"texto","obrigatorio":false}
  ]$$::jsonb,
  true,
  false
),
(
  'Checklist de Devolução - Pátio',
  'devolucao',
  $$[
    {"pergunta":"Motivo da devolução informado?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Itens devolvidos conferidos por item?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Condição/avarias registradas?","tipo_resposta":"sim_nao","obrigatorio":true},
    {"pergunta":"Destino informado (estoque/produção/sucata)?","tipo_resposta":"texto","obrigatorio":true},
    {"pergunta":"Foto dos itens devolvidos","tipo_resposta":"foto_obrigatoria","obrigatorio":true},
    {"pergunta":"Foto da nota/romaneio (se houver)","tipo_resposta":"foto_obrigatoria","obrigatorio":false},
    {"pergunta":"Observações","tipo_resposta":"texto","obrigatorio":false}
  ]$$::jsonb,
  true,
  false
);
