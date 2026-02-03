import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';

export function useFuncionarioAtual() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['funcionario-atual', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const rows = await api.entities.Funcionario.filter({ user_id: user.id });
      return rows?.[0] || null;
    },
    enabled: !!user?.id,
  });
}

