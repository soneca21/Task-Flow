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

export async function criarTarefaAutomatica({ nota, api, queryClient, config = AUTOMATION_CONFIG }) {
  try {
    const frente = await api.entities.FrenteTrabalho.get(nota.frente_destino_id);
    if (!frente) return null;

    const existentes = await api.entities.Tarefa.filter({ nota_id: nota.id });
    if (existentes?.length > 0) return null;

    const todosFuncionarios = await api.entities.Funcionario.filter({ ativo: true });
    const funcionariosDisponiveis = todosFuncionarios.filter(
      f => f.status === config.funcionarioStatusDisponivel
    );
    const candidatosAuto = funcionariosDisponiveis.length > 0
      ? funcionariosDisponiveis
      : (config.autoDistribuicaoScoreSemDisponiveis ? todosFuncionarios : []);

    const tipoTarefa = resolveTipoTarefa(nota, config);
    const checklists = await api.entities.Checklist.filter({ tipo: tipoTarefa, ativo: true });
    const checklist = checklists[0];
    const quantidadeNecessaria = resolveQuantidadeNecessaria(nota, config);

    const minScore = funcionariosDisponiveis.length === 0 && config.autoDistribuicaoScoreSemDisponiveis
      ? 0
      : 20;
    const funcionariosSelecionados = selecionarMelhoresFuncionarios(
      candidatosAuto,
      {
        frente_trabalho_id: nota.frente_destino_id,
        prioridade: nota.prioridade,
        tipo: tipoTarefa,
      },
      frente,
      quantidadeNecessaria,
      minScore
    );

    const funcionariosIds = funcionariosSelecionados.map(f => f.id);
    const funcionariosNomes = funcionariosSelecionados.map(f => f.nome);

    const tarefa = await api.entities.Tarefa.create({
      titulo: `${frente.nome} - Nota ${nota.numero}`,
      descricao: `Produzir itens da nota ${nota.numero} para cliente ${nota.cliente}`,
      tipo: tipoTarefa,
      frente_trabalho_id: nota.frente_destino_id,
      frente_trabalho_nome: frente.nome,
      nota_id: nota.id,
      nota_numero: nota.numero,
      funcionarios_designados: funcionariosIds,
      funcionarios_nomes: funcionariosNomes,
      quantidade_profissionais: funcionariosSelecionados.length || 1,
      prioridade: nota.prioridade === config.prioridadeUrgente
        ? config.prioridadeUrgente
        : config.tarefaPrioridadeDefault,
      status: config.tarefaStatusAguardando,
      checklist_id: checklist?.id || '',
      data_inicio: null,
    });

    if (frente.categoria === config.frenteCategoriaProducao) {
      await api.entities.Nota.update(nota.id, {
        status: config.notaStatusProducao,
      });
    }

    const scoreMedio = funcionariosSelecionados.length > 0
      ? Math.round(
          funcionariosSelecionados.reduce((acc, f) => acc + f.score.total, 0) /
            funcionariosSelecionados.length
        )
      : 0;

    await api.entities.LogAuditoria.create({
      acao: 'criar',
      entidade: 'Tarefa',
      entidade_id: tarefa.id,
      descricao: `Tarefa criada automaticamente - Nota: ${nota.numero} | Frente: ${frente.nome} | Alocados: ${funcionariosNomes.join(', ')} | Score médio: ${scoreMedio}`,
    });

    if (funcionariosSelecionados.length > 0) {
      notificarAlocacaoSucesso(tarefa, funcionariosSelecionados);
    } else {
      toast.warning(`Tarefa criada, mas aguardando funcionários disponíveis - ${frente.nome}`);
    }

    queryClient.invalidateQueries({ queryKey: ['tarefas'] });
    queryClient.invalidateQueries({ queryKey: ['notas'] });
    queryClient.invalidateQueries({ queryKey: ['funcionarios'] });

    return tarefa;
  } catch (error) {
    console.error('Erro ao criar tarefa automática:', error);
    return null;
  }
}

