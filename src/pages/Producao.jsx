import React, { useState } from 'react';
import { api } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';
import { useFuncionarioAtual } from '@/hooks/useFuncionarioAtual';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ExecutarChecklist from '../components/tarefas/ExecutarChecklist';
import { 
  Factory, 
  Search,
  Filter,
  Clock,
  Play,
  Pause,
  CheckCircle,
  User,
  FileCheck,
  History
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChecklistHistoricoDialog from '../components/tarefas/ChecklistHistoricoDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Producao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: funcionarioAtual } = useFuncionarioAtual();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterFrente, setFilterFrente] = useState('todas');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [executandoChecklist, setExecutandoChecklist] = useState(null);
  const [checklistExecucao, setChecklistExecucao] = useState(null);
  const [checklistReadOnly, setChecklistReadOnly] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoTarefa, setHistoricoTarefa] = useState(null);

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas-producao'],
    queryFn: () => api.entities.Tarefa.filter({ tipo: 'producao' }, '-created_date'),
  });

  const { data: frentes = [] } = useQuery({
    queryKey: ['frentes-producao'],
    queryFn: () => api.entities.FrenteTrabalho.filter({ categoria: 'producao', ativo: true }),
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ['checklists-producao'],
    queryFn: () => api.entities.Checklist.filter({ ativo: true }),
  });

  const updateTarefaMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Tarefa.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarefas-producao'] }),
  });

  const role = user?.user_metadata?.role || '';
  const isAdmin = role === 'admin';
  const isManager = role === 'admin' || role === 'lider';
  const canEditTarefa = (tarefa) =>
    isAdmin || (funcionarioAtual && tarefa.funcionarios_designados?.includes(funcionarioAtual.id));

  const tarefasVisiveis = isManager
    ? tarefas
    : tarefas.filter((t) => {
        if (!funcionarioAtual?.id) return false;
        const assigned = t.funcionarios_designados?.includes(funcionarioAtual.id);
        if (!assigned) return false;
        if (!t.frente_trabalho_id) return true;
        const frentes = funcionarioAtual.frentes_trabalho || [];
        return frentes.length === 0 || frentes.includes(t.frente_trabalho_id);
      });

  const filteredTarefas = tarefasVisiveis.filter(t => {
    const matchSearch = t.titulo?.toLowerCase().includes(search.toLowerCase()) ||
                       t.nota_numero?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || t.status === filterStatus;
    const matchFrente = filterFrente === 'todas' || t.frente_trabalho_id === filterFrente;
    return matchSearch && matchStatus && matchFrente;
  });

  const statusColors = {
    criada: 'bg-muted/50 text-muted-foreground border-border',
    aguardando_alocacao: 'bg-primary/15 text-primary border-primary/25',
    em_execucao: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    pausada: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    concluida: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelada: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const prioridadeColors = {
    baixa: 'bg-muted/50 text-muted-foreground',
    media: 'bg-primary/15 text-primary',
    alta: 'bg-amber-500/15 text-amber-300',
    urgente: 'bg-red-500/20 text-red-400',
  };

  const marcarChecklistConcluido = async (tarefaId) => {
    try {
      const rows = await api.entities.ChecklistExecucao.filter({ tarefa_id: tarefaId }, '-created_date', 1);
      const execucao = rows?.[0];
      if (execucao) {
        await api.entities.ChecklistExecucao.update(execucao.id, {
          status: 'concluido',
          data_conclusao: new Date().toISOString(),
        });
      }
    } catch {
      // Best-effort
    }
  };

  const finalizarTarefa = async (tarefa) => {
    if (tarefa.checklist_id && (!tarefa.checklist_preenchido || tarefa.checklist_preenchido.length === 0)) {
      toast.info('Preencha o checklist antes de concluir a tarefa.');
      await handleExecutarChecklist(tarefa);
      return;
    }
    try {
      await api.entities.Tarefa.update(tarefa.id, {
        status: 'concluida',
        data_conclusao: new Date().toISOString(),
      });

      if (tarefa.checklist_id) {
        await marcarChecklistConcluido(tarefa.id);
      }

      if (tarefa.funcionarios_designados?.length > 0) {
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

      queryClient.invalidateQueries({ queryKey: ['tarefas-producao'] });
      toast.success('Tarefa concluida');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao concluir tarefa');
    }
  };

  const handleUpdateStatus = async (tarefa, newStatus) => {
    const canEdit = isAdmin || (funcionarioAtual && tarefa.funcionarios_designados?.includes(funcionarioAtual.id));
    if (!canEdit) {
      toast.error('Somente o responsável pode editar esta tarefa');
      return;
    }
    if (newStatus === 'concluida') {
      const checklistPreenchido = Array.isArray(tarefa.checklist_preenchido) && tarefa.checklist_preenchido.length > 0;
      if (tarefa.checklist_id && !checklistPreenchido) {
        handleExecutarChecklist(tarefa);
        return;
      }
      finalizarTarefa(tarefa);
      return;
    }
    const updates = { status: newStatus };
    if (newStatus === 'em_execucao' && !tarefa.data_inicio) {
      updates.data_inicio = new Date().toISOString();
    }
    const optimistic = {
      ...tarefa,
      ...updates,
      data_inicio: updates.data_inicio ?? tarefa.data_inicio,
    };
    queryClient.setQueryData(['tarefas-producao'], (old = []) =>
      Array.isArray(old) ? old.map(t => (t.id === tarefa.id ? optimistic : t)) : old
    );
    queryClient.setQueryData(['tarefas'], (old = []) =>
      Array.isArray(old) ? old.map(t => (t.id === tarefa.id ? optimistic : t)) : old
    );
    try {
      const updated = await updateTarefaMutation.mutateAsync({ id: tarefa.id, data: updates });
      if (!updated || updated.status !== updates.status) {
        queryClient.invalidateQueries({ queryKey: ['tarefas-producao'] });
        queryClient.invalidateQueries({ queryKey: ['tarefas'] });
        toast.error('Não foi possível alterar o status da tarefa');
        return;
      }
      if (updated?.id) {
        queryClient.setQueryData(['tarefas-producao'], (old = []) =>
          Array.isArray(old) ? old.map(t => (t.id === updated.id ? { ...t, ...updated } : t)) : old
        );
        queryClient.setQueryData(['tarefas'], (old = []) =>
          Array.isArray(old) ? old.map(t => (t.id === updated.id ? { ...t, ...updated } : t)) : old
        );
      }
      if (newStatus === 'pausada') {
        toast.success('Tarefa pausada');
      }
      if (newStatus === 'em_execucao') {
        toast.success('Tarefa iniciada');
      }
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ['tarefas-producao'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      toast.error(error?.message || 'Erro ao atualizar status da tarefa');
      return;
    }

    if (newStatus === 'em_execucao' && tarefa.funcionarios_designados?.length > 0) {
      tarefa.funcionarios_designados.forEach(async (funcId) => {
        if (!isAdmin && funcionarioAtual?.id !== funcId) return;
        try {
          const func = await api.entities.Funcionario.get(funcId);
          if (func) {
            await api.entities.Funcionario.update(funcId, {
              status: 'ocupado',
              tarefas_ativas: (func.tarefas_ativas || 0) + 1,
            });
          }
        } catch {
          // Best-effort
        }
      });
    }
  };

  const stats = {
    total: tarefasVisiveis.length,
    emExecucao: tarefasVisiveis.filter(t => t.status === 'em_execucao').length,
    aguardando: tarefasVisiveis.filter(t => t.status === 'aguardando_alocacao' || t.status === 'criada').length,
    concluidas: tarefasVisiveis.filter(t => t.status === 'concluida').length,
  };

  const handleExecutarChecklist = async (tarefa) => {
    if (!tarefa.checklist_id) {
      toast.error('Esta tarefa não possui checklist configurado');
      return;
    }
    try {
      const [checklist, tarefaAtualizada] = await Promise.all([
        api.entities.Checklist.get(tarefa.checklist_id),
        api.entities.Tarefa.get(tarefa.id),
      ]);
      const tarefaRef = tarefaAtualizada || tarefa;
      setExecutandoChecklist(tarefaRef);
      setChecklistExecucao(checklist);
      setChecklistReadOnly(!canEditTarefa(tarefaRef));
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar checklist');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Produção"
        subtitle={`em execução: ${stats.emExecucao}`}
        icon={Factory}
        iconColor="text-amber-500"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 perfil-stats-grid">
        <div className="bg-card/60 border border-border rounded-2xl p-4 perfil-stats-card">
          <p className="text-2xl font-bold text-foreground perfil-stats-value">{stats.total}</p>
          <p className="text-xs text-muted-foreground perfil-stats-label">Total de Ordens</p>
        </div>
        <div className="bg-card/60 border border-amber-500/30 rounded-2xl p-4 perfil-stats-card">
          <p className="text-2xl font-bold text-amber-300 perfil-stats-value">{stats.emExecucao}</p>
          <p className="text-xs text-muted-foreground perfil-stats-label">Em Execução</p>
        </div>
        <div className="bg-card/60 border border-primary/25 rounded-2xl p-4 perfil-stats-card">
          <p className="text-2xl font-bold text-primary perfil-stats-value">{stats.aguardando}</p>
          <p className="text-xs text-muted-foreground perfil-stats-label">Aguardando</p>
        </div>
        <div className="bg-card/60 border border-emerald-500/25 rounded-2xl p-4 perfil-stats-card">
          <p className="text-2xl font-bold text-emerald-300 perfil-stats-value">{stats.concluidas}</p>
          <p className="text-xs text-muted-foreground perfil-stats-label">Concluídas Hoje</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-row lg:gap-4">
          <div className="relative col-span-2 lg:col-span-1 lg:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou nota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/60 border-border text-foreground h-12"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full lg:w-48 bg-card/60 border-border text-foreground h-9 text-xs lg:h-12 lg:text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="criada">Criada</SelectItem>
              <SelectItem value="aguardando_alocacao">Aguardando</SelectItem>
              <SelectItem value="em_execucao">Em Execução</SelectItem>
              <SelectItem value="pausada">Pausada</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="h-9 text-xs lg:hidden"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
          >
            {showAdvancedFilters ? 'Ocultar filtros' : 'Filtros avancados'}
            {filterFrente !== 'todas' ? ' (ativos)' : ''}
          </Button>
        </div>

        <div className="hidden lg:block">
          <Select value={filterFrente} onValueChange={setFilterFrente}>
            <SelectTrigger className="w-full lg:w-56 bg-card/60 border-border text-foreground h-12">
              <SelectValue placeholder="Frente de Trabalho" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Frentes</SelectItem>
              {frentes.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showAdvancedFilters && (
          <div className="lg:hidden">
            <Select value={filterFrente} onValueChange={setFilterFrente}>
              <SelectTrigger className="w-full bg-card/60 border-border text-foreground h-12">
                <SelectValue placeholder="Frente de Trabalho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Frentes</SelectItem>
                {frentes.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Lista de Ordens */}
      <div className="space-y-3">
        {filteredTarefas.map(tarefa => {
          const canEdit = canEditTarefa(tarefa);
          const checklistPreenchido = Array.isArray(tarefa.checklist_preenchido) && tarefa.checklist_preenchido.length > 0;
          return (
          <div 
            key={tarefa.id}
            className={cn(
              "bg-card/50 border rounded-2xl p-4 lg:p-5 transition-all",
              tarefa.prioridade === 'urgente' ? "border-red-500/30" : "border-border"
            )}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-foreground">{tarefa.titulo}</h3>
                  <span className={cn("text-xs px-2 py-1 rounded-full border", statusColors[tarefa.status])}>
                    {tarefa.status?.replace('_', ' ')}
                  </span>
                  <span className={cn("text-xs px-2 py-1 rounded-full", prioridadeColors[tarefa.prioridade])}>
                    {tarefa.prioridade}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {tarefa.nota_numero && (
                    <span className="flex items-center gap-1">
                      ?? Nota: {tarefa.nota_numero}
                    </span>
                  )}
                    <span className="flex items-center gap-1">
                      ?? {tarefa.frente_trabalho_nome || 'Sem frente'}
                    </span>
                  {tarefa.funcionarios_nomes?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {tarefa.funcionarios_nomes.join(', ')}
                    </span>
                  )}
                  {tarefa.data_inicio && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Início: {format(new Date(tarefa.data_inicio), 'HH:mm')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {(tarefa.status === 'criada' || tarefa.status === 'aguardando_alocacao') && (
                  <Button 
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-foreground touch-btn order-1"
                    onClick={() => handleUpdateStatus(tarefa, 'em_execucao')}
                    disabled={!canEdit}
                    title={!canEdit ? 'Somente o responsável pode editar' : undefined}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Iniciar
                  </Button>
                )}
                {tarefa.status === 'pausada' && (
                  <Button 
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-foreground touch-btn order-1"
                    onClick={() => handleUpdateStatus(tarefa, 'em_execucao')}
                    disabled={!canEdit}
                    title={!canEdit ? 'Somente o responsável pode editar' : undefined}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Iniciar
                  </Button>
                )}
                {tarefa.status === 'em_execucao' && (
                  <Button 
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-foreground touch-btn order-1"
                    onClick={() => handleUpdateStatus(tarefa, 'pausada')}
                    disabled={!canEdit}
                    title={!canEdit ? 'Somente o responsável pode editar' : undefined}
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    Pausar
                  </Button>
                )}
                {tarefa.checklist_id && (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground touch-btn order-2 shadow-lg"
                    onClick={() => handleExecutarChecklist(tarefa)}
                  >
                    <FileCheck className="w-4 h-4 mr-1" />
                    {canEdit && tarefa.status !== 'concluida' ? 'Checklist' : 'Ver Checklist'}
                  </Button>
                )}
                {tarefa.status === 'em_execucao' && (
                  <Button 
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 touch-btn order-3"
                    onClick={() => handleUpdateStatus(tarefa, 'concluida')}
                    disabled={!canEdit || (tarefa.checklist_id && !checklistPreenchido)}
                    title={
                      !canEdit
                        ? 'Somente o responsável pode editar'
                        : (tarefa.checklist_id && !checklistPreenchido)
                          ? 'Preencha o checklist para concluir'
                          : undefined
                    }
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Concluir
                  </Button>
                )}
                {tarefa.checklist_id && isManager && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-foreground hover:bg-accent/60 touch-btn order-4"
                    onClick={() => { setHistoricoTarefa(tarefa); setHistoricoOpen(true); }}
                  >
                    <History className="w-4 h-4 mr-1" />
                    Histórico
                  </Button>
                )}
              </div>
            </div>
          </div>
        )})}

        {filteredTarefas.length === 0 && (
          <div className="text-center py-12 bg-card/30 border border-dashed border-border/70 rounded-2xl">
            <Factory className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma ordem de producao encontrada</p>
          </div>
        )}
      </div>

      {/* Executar Checklist */}
      {executandoChecklist && checklistExecucao && (
        <ExecutarChecklist
          tarefa={executandoChecklist}
          checklist={checklistExecucao}
          readOnly={checklistReadOnly}
          funcionarioAtual={funcionarioAtual}
          isAdmin={isAdmin}
          onConcluir={() => {
            setExecutandoChecklist(null);
            setChecklistExecucao(null);
            setChecklistReadOnly(false);
            queryClient.invalidateQueries({ queryKey: ['tarefas-producao'] });
            queryClient.invalidateQueries({ queryKey: ['tarefas'] });
          }}
          onFechar={() => {
            setExecutandoChecklist(null);
            setChecklistExecucao(null);
            setChecklistReadOnly(false);
          }}
        />
      )}

      <ChecklistHistoricoDialog
        open={historicoOpen}
        onOpenChange={(open) => {
          setHistoricoOpen(open);
          if (!open) setHistoricoTarefa(null);
        }}
        tarefa={historicoTarefa}
        checklists={checklists}
      />
    </div>
  );
}
