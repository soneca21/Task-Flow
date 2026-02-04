import { useEffect, useRef } from 'react';
import { api } from '@/api/dataClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { criarTarefaAutomatica, shouldProcessNota, getAutomationConfig } from '@/automation/automacaoService';

/**
 * Componente de Automação e Orquestração de Tarefas
 * Monitora criação/atualização de notas e dispara tarefas automaticamente
 */
export default function AutomacaoTarefas() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const role = user?.user_metadata?.role || '';
  const isManager = role === 'admin' || role === 'lider';
  const runningRef = useRef(false);

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes-automacoes'],
    queryFn: () => api.entities.ConfiguracaoSistema.list(),
  });

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let cancelled = false;

    const processNotas = async () => {
      if (!isManager || runningRef.current || cancelled) return;
      runningRef.current = true;

      try {
        const config = getAutomationConfig(configuracoes);
        const statuses = [config.notaTriggerStatus, config.notaLegacyStatus].filter(Boolean);
        const notas = statuses.length > 0
          ? await api.entities.Nota.filter({ status: { $in: statuses } }, '-created_date', 200)
          : [];

        for (const nota of notas) {
          if (!shouldProcessNota(nota, isManager, config)) continue;
          await criarTarefaAutomatica({ nota, api, queryClient, config });
        }
      } catch {
        // Best-effort
      } finally {
        runningRef.current = false;
      }
    };

    // Subscrever a mudanças em Notas (tempo real)
    const unsubscribeNotas = isManager
      ? api.entities.Nota.subscribe(async (event) => {
          if (event.type === 'create' || event.type === 'update') {
            const nota = event.data;

            const config = getAutomationConfig(configuracoes);
            if (shouldProcessNota(nota, isManager, config)) {
              await criarTarefaAutomatica({ nota, api, queryClient, config });
            }
          }
        })
      : () => {};

    // Subscrever a mudanças em Tarefas para sincronização
    const unsubscribeTarefas = api.entities.Tarefa.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-producao'] });

      if (event.type === 'update' && event.data.status === 'concluida') {
        toast.success(`Tarefa "${event.data.titulo}" concluída!`);
      }
    });

    // Subscrever a Funcionários para atualização em tempo real
    const unsubscribeFuncionarios = api.entities.Funcionario.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      queryClient.invalidateQueries({ queryKey: ['funcionarios-dashboard'] });
    });

    processNotas();
    const interval = isManager ? setInterval(processNotas, 30000) : null;

    return () => {
      cancelled = true;
      unsubscribeNotas();
      unsubscribeTarefas();
      unsubscribeFuncionarios();
      if (interval) clearInterval(interval);
    };
  }, [queryClient, configuracoes, isManager, isAuthenticated]);
  // Componente não renderiza nada, apenas executa lógica
  return null;
}

/**
 * Hook para sincronização manual
 */
export function useSincronizacaoTarefas() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const role = user?.user_metadata?.role || '';
  const isManager = role === 'admin' || role === 'lider';
  const runningRef = useRef(false);

  const sincronizar = async () => {
    // Verificar se há tarefas pendentes no localStorage
    const keys = Object.keys(localStorage);
    const pendingKeys = keys.filter(k => k.startsWith('checklist_pending_'));

    let funcionarioAtual = null;
    if (user?.id) {
      const rows = await api.entities.Funcionario.filter({ user_id: user.id });
      funcionarioAtual = rows?.[0] || null;
    }

    for (const key of pendingKeys) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data && data.tarefaId) {
          const tarefa = await api.entities.Tarefa.get(data.tarefaId);
          // Tentar enviar
          await api.entities.Tarefa.update(data.tarefaId, {
            checklist_preenchido: data.respostas,
            status: 'concluida',
            data_conclusao: new Date().toISOString(),
          });

          if (tarefa?.funcionarios_designados?.length > 0) {
            for (const funcId of tarefa.funcionarios_designados) {
              if (!isAdmin && funcionarioAtual?.id !== funcId) continue;
              const func = await api.entities.Funcionario.get(funcId);
              if (func) {
                await api.entities.Funcionario.update(funcId, {
                  status: 'disponivel',
                  tarefas_ativas: Math.max(0, (func.tarefas_ativas || 1) - 1),
                  tarefas_concluidas: (func.tarefas_concluidas || 0) + 1,
                });
              }
            }
          }

          // Remover do localStorage
          localStorage.removeItem(key);
          localStorage.removeItem(`checklist_${data.tarefaId}`);
          
          toast.success('Checklist sincronizado com sucesso');
        }
      } catch (error) {
        console.error('Erro ao sincronizar:', error);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['tarefas'] });
  };

  return { sincronizar };
}





