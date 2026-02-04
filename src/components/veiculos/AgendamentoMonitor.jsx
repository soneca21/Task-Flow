import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';
import { dispararAgendamento, isAgendamentoVencido } from '@/lib/agendamentoVeiculos';

export default function AgendamentoMonitor() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const role = user?.user_metadata?.role || '';
    const isManager = role === 'admin' || role === 'lider';
    if (!isManager) return undefined;

    let cancelled = false;

    const tick = async () => {
      if (runningRef.current || cancelled) return;
      runningRef.current = true;

      try {
        const agendados = await api.entities.AgendamentoVeiculo.filter(
          { status: 'agendado' },
          '-created_date',
          200
        );

        const now = new Date();
        for (const agendamento of agendados) {
          if (!isAgendamentoVencido(agendamento, now)) continue;
          await dispararAgendamento({
            agendamento,
            api,
            queryClient,
            notify: (message) => toast.info(message),
          });
        }
      } catch {
        // Best-effort
      } finally {
        runningRef.current = false;
      }
    };

    tick();
    const interval = setInterval(tick, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated, queryClient, user]);

  return null;
}
