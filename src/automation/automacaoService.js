import { selecionarMelhoresFuncionarios } from '@/components/tarefas/AlocacaoInteligente';
import { notificarAlocacaoSucesso } from '@/components/notificacoes/SistemaNotificacoes';
import { toast } from 'sonner';
import { AUTOMATION_CONFIG } from './config';

const getConfigValue = (configs, chave, fallback) => {
  const config = configs?.find?.((c) => c.chave === chave);
  if (!config || config.valor === undefined || config.valor === null) return fallback;
  return config.valor;
};

const getConfigBool = (configs, chave, fallback) => {
  const value = getConfigValue(configs, chave, String(fallback));
  return String(value) === 'true';
};

const getConfigNumber = (configs, chave, fallback) => {
  const value = getConfigValue(configs, chave, String(fallback));
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export const getAutomationConfig = (configs = []) => ({
  notaTriggerStatus: getConfigValue(configs, 'automacao_nota_trigger_status', AUTOMATION_CONFIG.notaTriggerStatus),
  notaLegacyStatus: AUTOMATION_CONFIG.notaLegacyStatus,
  notaStatusProducao: getConfigValue(configs, 'automacao_nota_status_producao', AUTOMATION_CONFIG.notaStatusProducao),
  frenteCategoriaProducao: getConfigValue(configs, 'automacao_frente_categoria_producao', AUTOMATION_CONFIG.frenteCategoriaProducao),
  tarefaTipoDefault: getConfigValue(configs, 'automacao_tarefa_tipo_default', AUTOMATION_CONFIG.tarefaTipoDefault),
  tarefaPrioridadeDefault: getConfigValue(configs, 'automacao_tarefa_prioridade_default', AUTOMATION_CONFIG.tarefaPrioridadeDefault),
  tarefaStatusExecucao: getConfigValue(configs, 'automacao_tarefa_status_execucao', AUTOMATION_CONFIG.tarefaStatusExecucao),
  tarefaStatusAguardando: getConfigValue(configs, 'automacao_tarefa_status_aguardando', AUTOMATION_CONFIG.tarefaStatusAguardando),
  prioridadeUrgente: AUTOMATION_CONFIG.prioridadeUrgente,
  funcionarioStatusDisponivel: AUTOMATION_CONFIG.funcionarioStatusDisponivel,
  funcionarioStatusOcupado: AUTOMATION_CONFIG.funcionarioStatusOcupado,
  autoDistribuicaoScoreSemDisponiveis: getConfigBool(
    configs,
    'automacao_auto_distribuicao_score_sem_disponiveis',
    AUTOMATION_CONFIG.autoDistribuicaoScoreSemDisponiveis
  ),
  quantidadePorPrioridade: {
    urgente: getConfigNumber(configs, 'automacao_quantidade_urgente', AUTOMATION_CONFIG.quantidadePorPrioridade.urgente),
    default: getConfigNumber(configs, 'automacao_quantidade_default', AUTOMATION_CONFIG.quantidadePorPrioridade.default),
  },
  tipoNotaParaTarefa: {
    entrega: getConfigValue(configs, 'automacao_tipo_nota_entrega', AUTOMATION_CONFIG.tipoNotaParaTarefa.entrega),
    retirada_balcao: getConfigValue(configs, 'automacao_tipo_nota_retirada_balcao', AUTOMATION_CONFIG.tipoNotaParaTarefa.retirada_balcao),
    retirada_terceiro: getConfigValue(configs, 'automacao_tipo_nota_retirada_terceiro', AUTOMATION_CONFIG.tipoNotaParaTarefa.retirada_terceiro),
    transferencia: getConfigValue(configs, 'automacao_tipo_nota_transferencia', AUTOMATION_CONFIG.tipoNotaParaTarefa.transferencia),
  },
});

export const shouldProcessNota = (nota, isAdmin, config = AUTOMATION_CONFIG) => {
  if (!isAdmin) return false;
  if (!nota?.frente_destino_id) return false;
  return (
    nota.status === config.notaTriggerStatus ||
    (config.notaLegacyStatus && nota.status === config.notaLegacyStatus)
  );
};

const resolveTipoTarefa = (nota, config) =>
  config.tipoNotaParaTarefa[nota?.tipo] || config.tarefaTipoDefault;

const resolveQuantidadeNecessaria = (nota, config) =>
  nota?.prioridade === config.prioridadeUrgente
    ? config.quantidadePorPrioridade.urgente
    : config.quantidadePorPrioridade.default;

// Automatic task creation has been removed per user request.
// A minimal stub is kept to preserve the module interface.
export async function criarTarefaAutomatica({ nota, api, queryClient, config = AUTOMATION_CONFIG }) {
  // No automatic task creation performed.
  return null;
}

