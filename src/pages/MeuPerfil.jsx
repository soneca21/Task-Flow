import React, { useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useFuncionarioAtual } from '@/hooks/useFuncionarioAtual';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from "@/components/ui/button";
import { Copy, Shield, UserCircle, ClipboardList, Trophy, Activity, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/dataClient';

export default function MeuPerfil() {
  const { user, promoteToAdmin } = useAuth();
  const { data: funcionarioAtual } = useFuncionarioAtual();
  const [isCopying, setIsCopying] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  const isDev = import.meta.env.DEV;
  const isAdmin = user?.user_metadata?.role === 'admin';
  const funcionarioId = funcionarioAtual?.id;

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas-perfil', funcionarioId],
    queryFn: () => api.entities.Tarefa.list('-created_date', 200),
    enabled: !!funcionarioId,
  });

  const { data: frentes = [] } = useQuery({
    queryKey: ['frentes-perfil'],
    queryFn: () => api.entities.FrenteTrabalho.filter({ ativo: true }),
  });

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ['avaliacoes-perfil', funcionarioId],
    queryFn: () => api.entities.AvaliacaoFuncionario.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const handleCopyUserId = async () => {
    if (!user?.id) return;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(user.id);
      toast.success('User ID copiado');
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível copiar o User ID.');
    } finally {
      setIsCopying(false);
    }
  };

  const handlePromoteToAdmin = async () => {
    setIsPromoting(true);
    try {
      await promoteToAdmin();
      toast.success('Permissão admin ativada (dev).');
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível tornar admin.');
    } finally {
      setIsPromoting(false);
    }
  };

  const tarefasDoFuncionario = useMemo(() => {
    if (!funcionarioId) return [];
    return tarefas.filter((t) => t.funcionarios_designados?.includes(funcionarioId));
  }, [tarefas, funcionarioId]);

  const statsTarefas = useMemo(() => {
    const total = tarefasDoFuncionario.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').length;
    const emExecucao = tarefasDoFuncionario.filter(t => t.status === 'em_execucao').length;
    const aguardando = tarefasDoFuncionario.filter(t => t.status === 'aguardando_alocacao' || t.status === 'criada').length;
    const concluidas = tarefasDoFuncionario.filter(t => t.status === 'concluida').length;
    return { total, emExecucao, aguardando, concluidas };
  }, [tarefasDoFuncionario]);

  const score = funcionarioAtual?.tarefas_concluidas || 0;
  const scoreLevels = [
    { label: 'Bronze', min: 0, max: 9, color: 'text-amber-400', bar: 'bg-amber-500' },
    { label: 'Prata', min: 10, max: 29, color: 'text-slate-200', bar: 'bg-slate-300' },
    { label: 'Ouro', min: 30, max: 59, color: 'text-yellow-300', bar: 'bg-yellow-400' },
    { label: 'Platina', min: 60, max: 119, color: 'text-cyan-200', bar: 'bg-cyan-300' },
    { label: 'Diamante', min: 120, max: Infinity, color: 'text-indigo-200', bar: 'bg-indigo-300' },
  ];
  const currentLevel = scoreLevels.find(l => score >= l.min && score <= l.max) || scoreLevels[0];
  const nextLevel = scoreLevels.find(l => l.min > currentLevel.min);
  const progress = nextLevel
    ? Math.min(100, Math.round(((score - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100))
    : 100;

  const frentesMap = useMemo(() => {
    const map = new Map();
    frentes.forEach((f) => map.set(f.id, f.nome));
    return map;
  }, [frentes]);

  const frentesFuncionario = (funcionarioAtual?.frentes_trabalho || []).map((id) => ({
    id,
    nome: frentesMap.get(id) || id,
  }));

  const tarefasRecentes = tarefasDoFuncionario
    .filter(t => t.status !== 'cancelada')
    .slice(0, 6);

  const avaliacoesOrdenadas = [...avaliacoes].sort((a, b) => {
    const aDate = a.created_date ? new Date(a.created_date).getTime() : 0;
    const bDate = b.created_date ? new Date(b.created_date).getTime() : 0;
    return bDate - aDate;
  });

  const mediaAvaliacao = avaliacoes.length
    ? Math.round((avaliacoes.reduce((acc, a) => acc + (a.nota_geral || 0), 0) / avaliacoes.length) * 10) / 10
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Perfil"
        subtitle="Dados da conta e permissões"
        icon={UserCircle}
        actions={
          isDev && !isAdmin ? (
            <Button
              type="button"
              variant="outline"
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
              onClick={handlePromoteToAdmin}
              disabled={isPromoting}
            >
              <Shield className="w-4 h-4 mr-2" />
              {isPromoting ? 'Promovendo...' : 'Tornar-me admin'}
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-400 font-bold text-lg">
                {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                {user?.user_metadata?.full_name || 'Usuário'}
              </p>
              <p className="text-sm text-slate-400">{user?.email || '-'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">User ID</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="text-xs bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 break-all">
                  {user?.id || 'Não disponível'}
                </code>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleCopyUserId}
                  disabled={!user?.id || isCopying}
                  className="text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Perfil</p>
              <p className="text-sm text-slate-300 mt-1">
                {isAdmin ? 'Administrador' : 'Operacional'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Score do Funcionário</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{score}</p>
                <p className={`text-sm ${currentLevel.color}`}>{currentLevel.label}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>{statsTarefas.concluidas} concluídas</p>
                {nextLevel ? (
                  <p>Próximo: {nextLevel.label} ({nextLevel.min})</p>
                ) : (
                  <p>Nível máximo</p>
                )}
              </div>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${currentLevel.bar} transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Status Operacional</h3>
          </div>
          {funcionarioAtual ? (
            <div className="space-y-2 text-sm text-slate-300">
              <p><span className="text-slate-500">Nome:</span> {funcionarioAtual.nome}</p>
              <p><span className="text-slate-500">Cargo:</span> {funcionarioAtual.cargo || '-'}</p>
              <p><span className="text-slate-500">Vínculo:</span> {funcionarioAtual.vinculo || '-'}</p>
              <p><span className="text-slate-500">Nível:</span> {funcionarioAtual.nivel_acesso || '-'}</p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500" />
                <span>{funcionarioAtual.telefone || '-'}</span>
              </p>
              <p><span className="text-slate-500">Status:</span> {funcionarioAtual.status || '-'}</p>
              <p><span className="text-slate-500">Capacidade:</span> {funcionarioAtual.capacidade_tarefas || 1} tarefa(s)</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhum funcionário vinculado.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500">Tarefas Ativas</p>
          <p className="text-2xl font-bold text-white">{statsTarefas.total}</p>
        </div>
        <div className="bg-slate-900/50 border border-amber-500/30 rounded-xl p-4">
          <p className="text-xs text-slate-500">Em Execucao</p>
          <p className="text-2xl font-bold text-amber-400">{statsTarefas.emExecucao}</p>
        </div>
        <div className="bg-slate-900/50 border border-blue-500/30 rounded-xl p-4">
          <p className="text-xs text-slate-500">Aguardando</p>
          <p className="text-2xl font-bold text-blue-400">{statsTarefas.aguardando}</p>
        </div>
        <div className="bg-slate-900/50 border border-green-500/30 rounded-xl p-4">
          <p className="text-xs text-slate-500">Concluidas</p>
          <p className="text-2xl font-bold text-green-400">{statsTarefas.concluidas}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Tarefas Recentes</h3>
          </div>
          <div className="space-y-3">
            {tarefasRecentes.map((tarefa) => (
              <div key={tarefa.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-white">{tarefa.titulo}</p>
                  <p className="text-xs text-slate-500">{tarefa.frente_trabalho_nome}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  tarefa.status === 'concluida' ? 'bg-green-500/20 text-green-300' :
                  tarefa.status === 'em_execucao' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  {tarefa.status}
                </span>
              </div>
            ))}
            {tarefasRecentes.length === 0 && (
              <p className="text-sm text-slate-500">Nenhuma tarefa associada.</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Frentes de Trabalho</h3>
          {frentesFuncionario.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {frentesFuncionario.map((frente) => (
                <span
                  key={frente.id}
                  className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
                >
                  {frente.nome}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhuma frente vinculada.</p>
          )}
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-white">Avaliações recentes</h3>
          <div className="text-sm text-slate-300">
            Média: <span className="text-white font-semibold">{mediaAvaliacao || '-'}</span>
          </div>
        </div>
        <div className="space-y-3">
          {avaliacoesOrdenadas.slice(0, 5).map((avaliacao) => (
            <div key={avaliacao.id} className="p-3 bg-slate-800/50 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white">
                  {avaliacao.periodo || 'Sem período'} — Nota {avaliacao.nota_geral}
                </p>
                <span className="text-xs text-slate-400">
                  {avaliacao.avaliador_nome || 'Avaliador'}
                </span>
              </div>
              {avaliacao.comentario && (
                <p className="text-xs text-slate-400 mt-2">{avaliacao.comentario}</p>
              )}
              {avaliacao.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {avaliacao.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {avaliacoesOrdenadas.length === 0 && (
            <p className="text-sm text-slate-500">Nenhuma avaliação registrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}



