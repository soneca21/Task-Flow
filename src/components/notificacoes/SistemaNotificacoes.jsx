import { useEffect, useRef } from 'react';
import { api } from '@/api/dataClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, Clock, Users, Zap } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';

const ALERT_AUDIO_COOLDOWN_MS = 1800;

/**
 * Sistema de notificacoes em tempo real
 * Monitora eventos e dispara notificacoes personalizadas
 */
export default function SistemaNotificacoes() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const funcionarioIdRef = useRef(null);
  const audioContextRef = useRef(null);
  const lastAlertAtRef = useRef(0);

  const playAlertTone = () => {
    const now = Date.now();
    if (now - lastAlertAtRef.current < ALERT_AUDIO_COOLDOWN_MS) return;
    lastAlertAtRef.current = now;

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const triggerBeep = (delay, frequency, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const startAt = ctx.currentTime + delay;
        gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        osc.start(startAt);
        osc.stop(startAt + duration + 0.02);
      };

      triggerBeep(0, 880, 0.18);
      triggerBeep(0.22, 988, 0.2);
    } catch {
      // Audio alert is best effort.
    }
  };

  const showNativeNotification = (title, body, href) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const notif = new Notification(title, {
        body,
        tag: 'nova-tarefa',
        renotify: true,
      });
      notif.onclick = () => {
        window.focus();
        if (href) window.location.href = href;
        notif.close();
      };
    } catch {
      // Native notification is best effort.
    }
  };

  useEffect(() => {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return undefined;

    const unlockAudio = () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextCtor();
        }
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }
      } catch {
        // Audio unlock is best effort.
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!('Notification' in window)) return undefined;
    if (Notification.permission !== 'default') return undefined;

    const requestPermission = () => {
      Notification.requestPermission().catch(() => {});
    };

    window.addEventListener('pointerdown', requestPermission, { once: true });
    window.addEventListener('touchstart', requestPermission, { once: true });
    window.addEventListener('keydown', requestPermission, { once: true });

    return () => {
      window.removeEventListener('pointerdown', requestPermission);
      window.removeEventListener('touchstart', requestPermission);
      window.removeEventListener('keydown', requestPermission);
    };
  }, []);

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
          const targetUrl = createPageUrl('Tarefas');
          toast.success('Nova tarefa atribuída: ' + tarefa.titulo, {
            duration: 6000,
            action: {
              label: 'Ver',
              onClick: () => window.location.href = targetUrl,
            },
          });
          playAlertTone();
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
          if (document.visibilityState !== 'visible') {
            showNativeNotification('Nova tarefa atribuida', tarefa.titulo, targetUrl);
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
          toast.error(`PENDÊNCIA CRÍTICA: ${pendencia.titulo}`, {
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
          toast.success(`Pendência crítica resolvida: ${pendencia.titulo}`, {
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
  toast.success('Tarefa atribuída com sucesso', {
    description: `${funcionarios.length} funcionário(s) designado(s) para "${tarefa.titulo}"`,
    icon: <Zap className="w-5 h-5" />,
    duration: 4000,
  });
}

