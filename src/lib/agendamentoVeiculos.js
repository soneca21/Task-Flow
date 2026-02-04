export const AGENDAMENTO_STATUS = {
  AGENDADO: 'agendado',
  EM_ATENDIMENTO: 'em_atendimento',
  CONCLUIDO: 'concluido',
  CANCELADO: 'cancelado',
};

export const AGENDAMENTO_TIPO = {
  CARGA: 'carga',
  DESCARGA: 'descarga',
  RETIRADA: 'retirada',
  TROCA: 'troca',
  DEVOLUCAO: 'devolucao',
};

export const EQUIPAMENTO_PREFERIDO = {
  NENHUM: 'nenhum',
  PONTE_ROLANTE: 'ponte_rolante',
  PORTICO: 'portico',
  EMPILHADEIRA: 'empilhadeira',
};

const TIPO_LABEL = {
  [AGENDAMENTO_TIPO.CARGA]: 'Carga',
  [AGENDAMENTO_TIPO.DESCARGA]: 'Descarga',
  [AGENDAMENTO_TIPO.RETIRADA]: 'Retirada',
  [AGENDAMENTO_TIPO.TROCA]: 'Troca',
  [AGENDAMENTO_TIPO.DEVOLUCAO]: 'Devolução',
};

const EQUIPAMENTO_FRENTE = {
  [EQUIPAMENTO_PREFERIDO.PONTE_ROLANTE]: {
    frente_trabalho_id: 'mov_ponte_rolante',
    frente_trabalho_nome: 'Operador de Ponte Rolante',
  },
  [EQUIPAMENTO_PREFERIDO.PORTICO]: {
    frente_trabalho_id: 'mov_portico',
    frente_trabalho_nome: 'Operador de Pórtico',
  },
  [EQUIPAMENTO_PREFERIDO.EMPILHADEIRA]: {
    frente_trabalho_id: 'mov_empilhadeira',
    frente_trabalho_nome: 'Operador de Empilhadeira',
  },
};

const CHECKLIST_BY_TIPO = {
  [AGENDAMENTO_TIPO.CARGA]: 'Checklist de Carregamento - Expedição',
  [AGENDAMENTO_TIPO.RETIRADA]: 'Checklist de Retirada - Balcão/Cliente',
  [AGENDAMENTO_TIPO.DESCARGA]: 'Checklist de Descarga - Pátio',
  [AGENDAMENTO_TIPO.TROCA]: 'Checklist de Troca - Pátio',
  [AGENDAMENTO_TIPO.DEVOLUCAO]: 'Checklist de Devolução - Pátio',
};

export const buildAgendamentoDate = (agendamento) => {
  if (!agendamento?.data || !agendamento?.hora) return null;
  return new Date(`${agendamento.data}T${agendamento.hora}:00`);
};

export const isAgendamentoVencido = (agendamento, now = new Date()) => {
  const dt = buildAgendamentoDate(agendamento);
  if (!dt) return false;
  return dt.getTime() <= now.getTime();
};

export const formatAgendamentoLabel = (agendamento) => {
  const placa = agendamento?.veiculo_placa || 'Veículo';
  const tipo = TIPO_LABEL[agendamento?.tipo] || 'Atendimento';
  return `${tipo} - ${placa}`;
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function getChecklistIdByName({ api, nome }) {
  if (!api || !nome) return null;
  const list = await api.entities.Checklist.filter({ ativo: true }, '-created_date', 200);
  const target = normalizeText(nome);
  const found = list.find((c) => normalizeText(c.nome) === target);
  return found?.id || null;
}

export async function criarTarefasAtendimentoVeiculo({
  api,
  tipo_atendimento,
  veiculo_id,
  veiculo_placa,
  data,
  hora,
  motorista_id,
  motorista_nome,
  necessita_movimentacao = false,
  equipamento_preferido,
  origem = 'agendamento',
  agendamento_id,
  queryClient,
  notify,
}) {
  if (!api) return { tarefaExpedicao: null, tarefaMovimentacao: null };

  const tipoLabel = TIPO_LABEL[tipo_atendimento] || 'Atendimento';
  const placa = veiculo_placa || 'Veículo';

  const checklistName = CHECKLIST_BY_TIPO[tipo_atendimento] || null;
  const checklistId = checklistName ? await getChecklistIdByName({ api, nome: checklistName }) : null;

  const descricaoBase = [
    `${tipoLabel} para ${placa}.`,
    data && hora ? `Agendado para ${data} às ${hora}.` : null,
    motorista_nome ? `Motorista: ${motorista_nome}.` : null,
  ].filter(Boolean).join(' ');

  const tarefaExpedicao = await api.entities.Tarefa.create({
    titulo: `${tipoLabel} - ${placa}`,
    descricao: descricaoBase,
    tipo: tipo_atendimento,
    prioridade: 'media',
    status: 'aguardando_alocacao',
    frente_trabalho_id: 'logistica_expedicao_retirar',
    frente_trabalho_nome: 'Expedição e Retira',
    checklist_id: checklistId,
    observacoes: [
      origem ? `Origem: ${origem}` : null,
      agendamento_id ? `Agendamento: ${agendamento_id}` : null,
      veiculo_id ? `Veículo: ${veiculo_id}` : null,
      motorista_id ? `Motorista: ${motorista_id}` : null,
    ].filter(Boolean).join(' | '),
  });

  let tarefaMovimentacao = null;
  if (necessita_movimentacao) {
    const frente = EQUIPAMENTO_FRENTE[equipamento_preferido] || null;
    const checklistMovId = await getChecklistIdByName({ api, nome: 'Checklist de Movimentação de Carga' });
    tarefaMovimentacao = await api.entities.Tarefa.create({
      titulo: `Movimentação (${tipoLabel}) - ${placa}`,
      descricao: `Apoio de movimentação para ${tipoLabel.toLowerCase()} do veículo ${placa}.`,
      tipo: 'movimentacao',
      prioridade: 'media',
      status: 'aguardando_alocacao',
      ...(frente ? frente : {}),
      checklist_id: checklistMovId,
      observacoes: [
        origem ? `Origem: ${origem}` : null,
        agendamento_id ? `Agendamento: ${agendamento_id}` : null,
        veiculo_id ? `Veículo: ${veiculo_id}` : null,
      ].filter(Boolean).join(' | '),
    });
  }

  if (notify) {
    notify(`Atendimento liberado: ${tipoLabel} - ${placa}`);
  }

  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    queryClient.invalidateQueries({ queryKey: ['veiculos'] });
    queryClient.invalidateQueries({ queryKey: ['tarefas'] });
  }

  return { tarefaExpedicao, tarefaMovimentacao };
}

export async function dispararAgendamento({
  agendamento,
  api,
  queryClient,
  notify,
}) {
  if (!agendamento || !api) return null;
  if (agendamento.status && agendamento.status !== AGENDAMENTO_STATUS.AGENDADO) return null;

  const { tarefaExpedicao } = await criarTarefasAtendimentoVeiculo({
    api,
    tipo_atendimento: agendamento.tipo,
    veiculo_id: agendamento.veiculo_id,
    veiculo_placa: agendamento.veiculo_placa,
    data: agendamento.data,
    hora: agendamento.hora,
    motorista_id: agendamento.motorista_id,
    motorista_nome: agendamento.motorista_nome,
    necessita_movimentacao: !!agendamento.necessita_movimentacao,
    equipamento_preferido: agendamento.equipamento_preferido,
    origem: 'agendamento',
    agendamento_id: agendamento.id,
    queryClient,
    notify,
  });

  if (agendamento.veiculo_id) {
    await api.entities.Veiculo.update(agendamento.veiculo_id, {
      status: 'no_patio',
      tipo_atendimento: agendamento.tipo,
      necessita_movimentacao: !!agendamento.necessita_movimentacao,
      equipamento_preferido: agendamento.equipamento_preferido || null,
    });
  }

  const updated = await api.entities.AgendamentoVeiculo.update(agendamento.id, {
    status: AGENDAMENTO_STATUS.EM_ATENDIMENTO,
    disparado_em: new Date().toISOString(),
    tarefa_id: tarefaExpedicao?.id || null,
  });

  await api.entities.LogAuditoria.create({
    acao: 'agendamento_disparado',
    entidade: 'AgendamentoVeiculo',
    entidade_id: agendamento.id,
    descricao: `Agendamento liberado: ${formatAgendamentoLabel(agendamento)} (${agendamento.data} ${agendamento.hora})`,
  });

  return updated;
}
