import { useEffect, useRef } from 'react';
import { api } from '@/api/dataClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, Clock, Users, Zap } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';

/**
 * Sistema de notificacoes em tempo real
 * Monitora eventos e dispara notificacoes personalizadas
 */
export default function SistemaNotificacoes() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const funcionarioIdRef = useRef(null);

  useEffect(() => {
    let active = true;

    const loadFuncionarioAtual = async () => {
      if (!user?.id) return;
      try {
        const rows = await api.entities.Funcionario.filter({ user_id: user.id });
        if (active) {
          funcionarioIdRef.current = rows?.[0]?.id || null;
        }
      } catch {
        if (active) {
          funcionarioIdRef.current = null;
        }
      }
    };

    loadFuncionarioAtual();

    // Carregar configuracoes de notificacoes
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

    // Subscrever tarefas
    const unsubscribeTarefas = api.entities.Tarefa.subscribe((event) => {
      if (event.type === 'create') {
        const tarefa = event.data;
        const funcionarioId = funcionarioIdRef.current;
        if (funcionarioId && tarefa.funcionarios_designados?.includes(funcionarioId)) {
          toast.success('Nova tarefa atribuida: ' + tarefa.titulo, {
            duration: 6000,
            action: {
              label: 'Ver',
              onClick: () => window.location.href = createPageUrl('Tarefas'),
            },
          });
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        }

        // Notificar tarefas urgentes/alta prioridade
        if (config.notificarTarefasUrgentes && (tarefa.prioridade === 'urgente' || tarefa.prioridade === 'alta')) {
          toast.error(`Nova tarefa ${tarefa.prioridade.toUpperCase()}: ${tarefa.titulo}`, {
            icon: <AlertTriangle className="w-5 h-5" />,
            duration: 8000,
            action: {
              label: 'Ver',
              onClick: () => window.location.href = createPageUrl('Tarefas'),
            },
          });

          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      }

      if (event.type === 'update') {
        const tarefa = event.data;

        // Notificar mudancas criticas de status
        if (config.notificarMudancasStatus && tarefa.prioridade === 'urgente') {
          if (tarefa.status === 'concluida') {
            toast.success(`Tarefa urgente concluida: ${tarefa.titulo}`, {
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

    // Subscrever pendencias
    const unsubscribePendencias = api.entities.Pendencia.subscribe((event) => {
      if (event.type === 'create') {
        const pendencia = event.data;

        if (pendencia.prioridade === 'critica') {
          toast.error(`PENDENCIA CRITICA: ${pendencia.titulo}`, {
            icon: <AlertTriangle className="w-5 h-5" />,
            duration: 10000,
            action: {
              label: 'Resolver',
              onClick: () => window.location.href = createPageUrl('Pendencias'),
            },
          });

          if ('vibrate' in navigator) {
            navigator.vibrate([300, 100, 300, 100, 300]);
          }
        }
      }

      if (event.type === 'update') {
        const pendencia = event.data;

        if (config.notificarMudancasStatus && pendencia.prioridade === 'critica' && pendencia.status === 'resolvida') {
          toast.success(`Pendencia critica resolvida: ${pendencia.titulo}`, {
            icon: <CheckCircle className="w-5 h-5" />,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['pendencias'] });
    });

    // Subscrever funcionarios
    const unsubscribeFuncionarios = api.entities.Funcionario.subscribe((event) => {
      if (event.type === 'update') {
        const func = event.data;

        if (config.notificarFuncionarioDisponivel && func.status === 'disponivel' && func.tarefas_ativas === 0) {
          toast.info(`${func.nome} esta disponivel`, {
            icon: <Users className="w-5 h-5" />,
            duration: 5000,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
    });

    // Subscrever notas (alertas de atraso)
    const unsubscribeNotas = api.entities.Nota.subscribe((event) => {
      if (event.type === 'update') {
        const nota = event.data;

        if (nota.data_prevista && config.notificarMudancasStatus) {
          const hoje = new Date();
          const prevista = new Date(nota.data_prevista);

          if (prevista < hoje && nota.status !== 'entregue' && nota.status !== 'retirada') {
            toast.warning(`Nota ${nota.numero} em ATRASO - Cliente: ${nota.cliente}`, {
              icon: <Clock className="w-5 h-5" />,
              duration: 8000,
              action: {
                label: 'Ver',
                onClick: () => window.location.href = createPageUrl('Expedicao'),
              },
            });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['notas'] });
    });

    return () => {
      active = false;
      unsubscribeTarefas();
      unsubscribePendencias();
      unsubscribeFuncionarios();
      unsubscribeNotas();
    };
  }, [queryClient, user?.id]);

  return null;
}

/**
 * Notificacoes de seguranca - checklists falhados
 */
export function notificarChecklistSeguranca(tarefa, itensReprovados) {
  toast.error(`Checklist de seguranca FALHOU: ${tarefa.titulo}`, {
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
 * Notificacao de alocacao bem-sucedida
 */
export function notificarAlocacaoSucesso(tarefa, funcionarios) {
  toast.success('Tarefa atribuida com sucesso', {
    description: `${funcionarios.length} funcionario(s) designado(s) para "${tarefa.titulo}"`,
    icon: <Zap className="w-5 h-5" />,
    duration: 4000,
  });
}
