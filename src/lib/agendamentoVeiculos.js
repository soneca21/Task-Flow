export const AGENDAMENTO_STATUS = {
  AGENDADO: 'agendado',
  EM_ATENDIMENTO: 'em_atendimento',
  CONCLUIDO: 'concluido',
  CANCELADO: 'cancelado',
};

export const AGENDAMENTO_TIPO = {
  CARGA: 'carga',
  DESCARGA: 'descarga',
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
  const tipo = agendamento?.tipo === AGENDAMENTO_TIPO.CARGA ? 'Carga' : 'Descarga';
  return `${tipo} - ${placa}`;
};

export async function dispararAgendamento({
  agendamento,
  api,
  queryClient,
  notify,
}) {
  if (!agendamento || !api) return null;
  if (agendamento.status && agendamento.status !== AGENDAMENTO_STATUS.AGENDADO) return null;

  const tipoTarefa =
    agendamento.tipo === AGENDAMENTO_TIPO.CARGA ? 'carregamento' : 'movimentacao';
  const tipoLabel =
    agendamento.tipo === AGENDAMENTO_TIPO.CARGA ? 'Carga' : 'Descarga';
  const placa = agendamento.veiculo_placa || 'Veículo';

  const tarefa = await api.entities.Tarefa.create({
    titulo: `${tipoLabel} agendada - ${placa}`,
    descricao: `Agendamento de ${tipoLabel.toLowerCase()} para ${placa} em ${agendamento.data} às ${agendamento.hora}.`,
    tipo: tipoTarefa,
    prioridade: 'media',
    status: 'aguardando_alocacao',
    observacoes: `Agendamento ${agendamento.id}`,
  });

  if (agendamento.veiculo_id) {
    await api.entities.Veiculo.update(agendamento.veiculo_id, {
      status: 'no_patio',
    });
  }

  const updated = await api.entities.AgendamentoVeiculo.update(agendamento.id, {
    status: AGENDAMENTO_STATUS.EM_ATENDIMENTO,
    disparado_em: new Date().toISOString(),
    tarefa_id: tarefa?.id || null,
  });

  await api.entities.LogAuditoria.create({
    acao: 'agendamento_disparado',
    entidade: 'AgendamentoVeiculo',
    entidade_id: agendamento.id,
    descricao: `Agendamento liberado: ${tipoLabel} - ${placa} (${agendamento.data} ${agendamento.hora})`,
  });

  if (notify) {
    notify(`Agendamento liberado: ${tipoLabel} - ${placa}`);
  }

  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    queryClient.invalidateQueries({ queryKey: ['veiculos'] });
    queryClient.invalidateQueries({ queryKey: ['tarefas'] });
  }

  return updated;
}

