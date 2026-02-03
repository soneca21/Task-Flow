import { useEffect } from 'react';
import { api } from '@/api/dataClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, Clock, Users, Zap } from 'lucide-react';

/**
 * Sistema de Notificações Push em Tempo Real
 * Monitora eventos e dispara notificações personalizadas
 */
export default function SistemaNotificacoes() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Carregar configurações de notificações
    const loadConfig = async () => {
      try {
        const configs = await api.entities.ConfiguracaoSistema.list();
        return {
          notificarTarefasUrgentes: configs.find(c => c.chave === 'notificar_tarefas_urgentes')?.valor === 'true',
          notificarMudancasStatus: configs.find(c => c.chave === 'notificar_mudancas_status')?.valor === 'true',
          notificarAlertasSeguranca: configs.find(c => c.chave === 'notificar_alertas_seguranca')?.valor === 'true',
          notificarFuncionarioDisponivel: configs.find(c => c.chave === 'notificar_funcionario_disponivel')?.valor === 'true',
        };
      } catch {
        return {
          notificarTarefasUrgentes: true,
          notificarMudancasStatus: true,
          notificarAlertasSeguranca: true,
          notificarFuncionarioDisponivel: true,
        };
      }
    };

    let config = {
      notificarTarefasUrgentes: true,
      notificarMudancasStatus: true,
      notificarAlertasSeguranca: true,
      notificarFuncionarioDisponivel: true,
    };

    loadConfig().then(c => { config = c; });

    // Subscrever a Tarefas
    const unsubscribeTarefas = api.entities.Tarefa.subscribe((event) => {
      if (event.type === 'create') {
        const tarefa = event.data;
        
        // Notificar tarefas urgentes/alta prioridade
        if (config.notificarTarefasUrgentes && (tarefa.prioridade === 'urgente' || tarefa.prioridade === 'alta')) {
          toast.error(`Nova tarefa ${tarefa.prioridade.toUpperCase()}: ${tarefa.titulo}`, {
            icon: <AlertTriangle className="w-5 h-5" />,
            duration: 8000,
            action: {
              label: 'Ver',
              onClick: () => window.location.href = '/Tarefas',
            },
          });
          
          // Som de alerta (se suportado)
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      }

      if (event.type === 'update') {
        const tarefa = event.data;
        
        // Notificar mudanças críticas de status
        if (config.notificarMudancasStatus && tarefa.prioridade === 'urgente') {
          if (tarefa.status === 'concluida') {
            toast.success(`Tarefa urgente concluída: ${tarefa.titulo}`, {
              icon: <CheckCircle className="w-5 h-5" />,
            });
          } else if (tarefa.status === 'pausada') {
            toast.warning(`Tarefa urgente pausada: ${tarefa.titulo}`, {
              icon: <Clock className="w-5 h-5" />,
            });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
    });

    // Subscrever a Pendências
    const unsubscribePendencias = api.entities.Pendencia.subscribe((event) => {
      if (event.type === 'create') {
        const pendencia = event.data;
        
        // Notificar pendências críticas
        if (pendencia.prioridade === 'critica') {
          toast.error(`PENDÊNCIA CRÍTICA: ${pendencia.titulo}`, {
            icon: <AlertTriangle className="w-5 h-5" />,
            duration: 10000,
            action: {
              label: 'Resolver',
              onClick: () => window.location.href = '/Pendências',
            },
          });
          
          if ('vibrate' in navigator) {
            navigator.vibrate([300, 100, 300, 100, 300]);
          }
        }
      }

      if (event.type === 'update') {
        const pendencia = event.data;
        
        // Notificar resolução de pendências críticas
        if (config.notificarMudancasStatus && pendencia.prioridade === 'critica' && pendencia.status === 'resolvida') {
          toast.success(`Pendência crítica resolvida: ${pendencia.titulo}`, {
            icon: <CheckCircle className="w-5 h-5" />,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['pendencias'] });
    });

    // Subscrever a Funcionários
    const unsubscribeFuncionarios = api.entities.Funcionario.subscribe((event) => {
      if (event.type === 'update') {
        const func = event.data;
        
        // Notificar quando funcionário fica disponível
        if (config.notificarFuncionarioDisponivel && func.status === 'disponivel' && func.tarefas_ativas === 0) {
          toast.info(`${func.nome} está disponível`, {
            icon: <Users className="w-5 h-5" />,
            duration: 5000,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
    });

    // Subscrever a Notas (alertas de atraso)
    const unsubscribeNotas = api.entities.Nota.subscribe((event) => {
      if (event.type === 'update') {
        const nota = event.data;
        
        // Verificar se está atrasada
        if (nota.data_prevista && config.notificarMudancasStatus) {
          const hoje = new Date();
          const prevista = new Date(nota.data_prevista);
          
          if (prevista < hoje && nota.status !== 'entregue' && nota.status !== 'retirada') {
            toast.warning(`Nota ${nota.numero} em ATRASO - Cliente: ${nota.cliente}`, {
              icon: <Clock className="w-5 h-5" />,
              duration: 8000,
              action: {
                label: 'Ver',
                onClick: () => window.location.href = '/Expedição',
              },
            });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['notas'] });
    });

    return () => {
      unsubscribeTarefas();
      unsubscribePendencias();
      unsubscribeFuncionarios();
      unsubscribeNotas();
    };
  }, [queryClient]);

  return null;
}

/**
 * Notificações de Segurança - Checklists falhados
 */
export function notificarChecklistSeguranca(tarefa, itensReprovados) {
  toast.error(`Checklist de segurança FALHOU: ${tarefa.titulo}`, {
    description: `${itensReprovados.length} item(ns) reprovado(s)`,
    icon: <AlertTriangle className="w-5 h-5" />,
    duration: 10000,
    action: {
      label: 'Ver Detalhes',
      onClick: () => console.log('Itens reprovados:', itensReprovados),
    },
  });

  if ('vibrate' in navigator) {
    navigator.vibrate([500, 200, 500]);
  }
}

/**
 * Notificação de alocação bem-sucedida
 */
export function notificarAlocacaoSucesso(tarefa, funcionarios) {
  toast.success(`Tarefa alocada com sucesso`, {
    description: `${funcionarios.length} funcionário(s) designado(s) para "${tarefa.titulo}"`,
    icon: <Zap className="w-5 h-5" />,
    duration: 4000,
  });
}

