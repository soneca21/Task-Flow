export const AUTOMATION_CONFIG = {
  notaTriggerStatus: 'em_expedicao',
  notaLegacyStatus: 'pendente',
  notaStatusProducao: 'em_producao',
  frenteCategoriaProducao: 'producao',
  tarefaTipoDefault: 'producao',
  tarefaPrioridadeDefault: 'media',
  tarefaStatusExecucao: 'em_execucao',
  tarefaStatusAguardando: 'aguardando_alocacao',
  prioridadeUrgente: 'urgente',
  funcionarioStatusDisponivel: 'disponivel',
  funcionarioStatusOcupado: 'ocupado',
  // Quando não houver ninguém disponível, permite autoalocação baseada em score.
  autoDistribuicaoScoreSemDisponiveis: true,
  quantidadePorPrioridade: {
    urgente: 2,
    default: 1,
  },
  tipoNotaParaTarefa: {
    entrega: 'entrega',
    retirada_balcao: 'retirada',
    retirada_terceiro: 'retirada',
    transferencia: 'movimentacao',
  },
};


