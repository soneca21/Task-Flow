import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/dataClient';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserCircle, Trophy, Activity, Phone, CalendarDays, ClipboardList } from 'lucide-react';
import { cn, formatTelefoneBR } from '@/lib/utils';
import { createPageUrl } from '@/utils';

export default function PerfilFuncionario() {
  const { id } = useParams();
  const { user } = useAuth();
  const role = user?.user_metadata?.role || '';
  const isManager = role === 'admin' || role === 'lider';

  const { data: funcionario, isLoading: loadingFuncionario } = useQuery({
    queryKey: ['funcionario-perfil', id],
    queryFn: () => api.entities.Funcionario.get(id),
    enabled: !!id && isManager,
  });

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas-perfil-funcionario', id],
    queryFn: () => api.entities.Tarefa.list('-created_date', 200),
    enabled: !!id && isManager,
  });

  const { data: frentes = [] } = useQuery({
    queryKey: ['frentes-perfil-funcionario'],
    queryFn: () => api.entities.FrenteTrabalho.filter({ ativo: true }),
    enabled: isManager,
  });

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ['avaliacoes-perfil-funcionario', id],
    queryFn: () => api.entities.AvaliacaoFuncionario.filter({ funcionario_id: id }),
    enabled: !!id && isManager,
  });

  const tarefasDoFuncionario = useMemo(() => {
    if (!funcionario?.id) return [];
    return tarefas.filter((t) => t.funcionarios_designados?.includes(funcionario.id));
  }, [tarefas, funcionario?.id]);

  const statsTarefas = useMemo(() => {
    const total = tarefasDoFuncionario.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').length;
    const emExecucao = tarefasDoFuncionario.filter(t => t.status === 'em_execucao').length;
    const aguardando = tarefasDoFuncionario.filter(t => t.status === 'aguardando_alocacao' || t.status === 'criada').length;
    const concluidas = tarefasDoFuncionario.filter(t => t.status === 'concluida').length;
    return { total, emExecucao, aguardando, concluidas };
  }, [tarefasDoFuncionario]);

  const score = funcionario?.tarefas_concluidas || 0;
  const scoreLevels = [
    { label: 'Bronze', min: 0, max: 9, color: 'text-amber-400', bar: 'bg-amber-500' },
    { label: 'Prata', min: 10, max: 29, color: 'text-foreground', bar: 'bg-muted' },
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

  const frentesFuncionario = (funcionario?.frentes_trabalho || []).map((frenteId) => ({
    id: frenteId,
    nome: frentesMap.get(frenteId) || frenteId,
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

  const statusLabel = {
    disponivel: 'Disponível',
    ocupado: 'Ocupado',
    indisponivel: 'Indisponível',
    ferias: 'Férias',
    afastado: 'Afastado',
  };

  const statusPillClass = (status) => {
    switch (status) {
      case 'disponivel':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'ocupado':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ferias':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'afastado':
        return 'bg-muted/50 text-muted-foreground border-border';
      default:
        return 'bg-card text-muted-foreground border-border';
    }
  };

  if (!isManager) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Perfil do Funcionário"
          subtitle="Acesso restrito para Líder/Admin"
          icon={UserCircle}
          iconColor="text-orange-500"
          actions={
            <Button variant="outline" className="border-border text-foreground" asChild>
              <Link to={createPageUrl('GestaoEquipe')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Link>
            </Button>
          }
        />
        <div className="bg-card/60 border border-border rounded-2xl p-6 text-muted-foreground">
          Você não tem permissão para visualizar este perfil.
        </div>
      </div>
    );
  }

  if (loadingFuncionario) {
    return (
      <div className="space-y-6">
        <PageHeader title="Perfil do Funcionário" subtitle="Carregando dados..." icon={UserCircle} iconColor="text-orange-500" />
        <div className="h-32 rounded-2xl border border-border bg-card/60 animate-pulse" />
      </div>
    );
  }

  if (!funcionario) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Perfil do Funcionário"
          subtitle="Funcionário não encontrado"
          icon={UserCircle}
          iconColor="text-orange-500"
          actions={
            <Button variant="outline" className="border-border text-foreground" asChild>
              <Link to={createPageUrl('GestaoEquipe')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Link>
            </Button>
          }
        />
        <div className="bg-card/60 border border-border rounded-2xl p-6 text-muted-foreground">
          Não foi possível localizar o funcionário solicitado.
        </div>
      </div>
    );
  }

  const currentStatus = funcionario.status || 'disponivel';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil do Funcionário"
        subtitle="Visão de liderança para análise"
        icon={UserCircle}
        iconColor="text-orange-500"
        actions={
          <Button variant="outline" className="border-border text-foreground" asChild>
            <Link to={createPageUrl('GestaoEquipe')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card/60 border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-400 font-bold text-lg">
                {funcionario.nome?.[0] || 'F'}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{funcionario.nome || 'Funcionário'}</p>
              <p className="text-sm text-muted-foreground">{funcionario.cargo || '-'}</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="text-muted-foreground">Vínculo:</span> {funcionario.vinculo || '-'}</p>
            <p><span className="text-muted-foreground">Nível:</span> {funcionario.nivel_acesso || '-'}</p>
            <p><span className="text-muted-foreground">Capacidade:</span> {funcionario.capacidade_tarefas || 1} tarefa(s)</p>
            <p><span className="text-muted-foreground">User ID:</span> {funcionario.user_id || 'Não vinculado'}</p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{funcionario.telefone ? formatTelefoneBR(funcionario.telefone) : '-'}</span>
            </p>
            <p className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span>
                {funcionario.data_nascimento
                  ? new Date(funcionario.data_nascimento).toLocaleDateString('pt-BR')
                  : '-'}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Status:</span>
              <span className={`text-xs px-2 py-1 rounded-full border ${statusPillClass(currentStatus)}`}>
                {statusLabel[currentStatus] || currentStatus}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-card/60 border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">Score do Funcionário</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{score}</p>
                <p className={`text-sm ${currentLevel.color}`}>{currentLevel.label}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{statsTarefas.concluidas} concluídas</p>
                {nextLevel ? (
                  <p>Próximo: {nextLevel.label} ({nextLevel.min})</p>
                ) : (
                  <p>Nível máximo</p>
                )}
              </div>
            </div>
            <div className="h-2 w-full bg-card rounded-full overflow-hidden">
              <div
                className={`h-full ${currentLevel.bar} transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-card/60 border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-foreground">Resumo Operacional</h3>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><span className="text-muted-foreground">Ativas:</span> {statsTarefas.total}</p>
            <p><span className="text-muted-foreground">Em execução:</span> {statsTarefas.emExecucao}</p>
            <p><span className="text-muted-foreground">Aguardando:</span> {statsTarefas.aguardando}</p>
            <p><span className="text-muted-foreground">Concluídas:</span> {statsTarefas.concluidas}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card/60 border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Tarefas Ativas</p>
          <p className="text-2xl font-bold text-foreground">{statsTarefas.total}</p>
        </div>
        <div className="bg-card/60 border border-amber-500/30 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Em Execução</p>
          <p className="text-2xl font-bold text-amber-400">{statsTarefas.emExecucao}</p>
        </div>
        <div className="bg-card/60 border border-blue-500/30 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Aguardando</p>
          <p className="text-2xl font-bold text-blue-400">{statsTarefas.aguardando}</p>
        </div>
        <div className="bg-card/60 border border-green-500/30 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Concluídas</p>
          <p className="text-2xl font-bold text-green-400">{statsTarefas.concluidas}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card/60 border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-foreground">Tarefas Recentes</h3>
          </div>
          <div className="space-y-3">
            {tarefasRecentes.map((tarefa) => (
              <div key={tarefa.id} className="flex items-center justify-between p-3 bg-card/70 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-foreground">{tarefa.titulo}</p>
                  <p className="text-xs text-muted-foreground">{tarefa.frente_trabalho_nome}</p>
                </div>
                <span className={cn(
                  'text-xs px-2 py-1 rounded-full',
                  tarefa.status === 'concluida'
                    ? 'bg-green-500/20 text-green-300'
                    : tarefa.status === 'em_execucao'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-card text-muted-foreground'
                )}>
                  {tarefa.status}
                </span>
              </div>
            ))}
            {tarefasRecentes.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa associada.</p>
            )}
          </div>
        </div>

        <div className="bg-card/60 border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Frentes de Trabalho</h3>
          {frentesFuncionario.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {frentesFuncionario.map((frente) => (
                <span
                  key={frente.id}
                  className="text-xs px-3 py-1 rounded-full bg-card text-muted-foreground border border-border"
                >
                  {frente.nome}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma frente vinculada.</p>
          )}
        </div>
      </div>

      <div className="bg-card/60 border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Avaliações recentes</h3>
          <div className="text-sm text-muted-foreground">
            Média: <span className="text-foreground font-semibold">{mediaAvaliacao || '-'}</span>
          </div>
        </div>
        <div className="space-y-3">
          {avaliacoesOrdenadas.slice(0, 5).map((avaliacao) => (
            <div key={avaliacao.id} className="p-3 bg-card/70 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground">
                  {avaliacao.periodo || 'Sem período'} — Nota {avaliacao.nota_geral}
                </p>
                <span className="text-xs text-muted-foreground">
                  {avaliacao.avaliador_nome || 'Avaliador'}
                </span>
              </div>
              {avaliacao.comentario && (
                <p className="text-xs text-muted-foreground mt-2">{avaliacao.comentario}</p>
              )}
              {avaliacao.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {avaliacao.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded-full bg-card text-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {avaliacoesOrdenadas.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
