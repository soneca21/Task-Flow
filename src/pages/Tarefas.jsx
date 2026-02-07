import React, { useState, useEffect } from 'react';
import { api } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';
import { useFuncionarioAtual } from '@/hooks/useFuncionarioAtual';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ClipboardList, 
  Plus, 
  Search,
  Filter,
  Play,
  Pause,
  CheckCircle,
  Clock,
  User,
  Send,
  Camera,
  Edit2,
  Trash2,
  MoreVertical,
  AlertCircle,
  FileCheck,
  History
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import ExecutarChecklist from '../components/tarefas/ExecutarChecklist';
import ChecklistHistoricoDialog from '../components/tarefas/ChecklistHistoricoDialog';
import { useSincronizacaoTarefas } from '../components/tarefas/AutomacaoTarefas';
import { selecionarMelhoresFuncionarios } from '../components/tarefas/AlocacaoInteligente';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AUTOMATION_CONFIG } from '@/automation/config';
import SelecionarTemplateDialog from '@/components/tarefas/SelecionarTemplateDialog';

export default function Tarefas() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: funcionarioAtual } = useFuncionarioAtual();
  const { sincronizar } = useSincronizacaoTarefas();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterFrente, setFilterFrente] = useState('todas');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState(null);
  const [executandoChecklist, setExecutandoChecklist] = useState(null);
  const [checklistExecucao, setChecklistExecucao] = useState(null);
  const [checklistReadOnly, setChecklistReadOnly] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoTarefa, setHistoricoTarefa] = useState(null);
  const [isPwa, setIsPwa] = useState(false);

  // Sincronização ao montar
  useEffect(() => {
    sincronizar();
  }, []);

  useEffect(() => {
    const shouldCreate = searchParams.get('create') === 'true';
    if (shouldCreate) {
      setEditingTarefa(null);
      setDialogOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('create');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const mediaStandalone = window.matchMedia?.('(display-mode: standalone)');
    const mediaFullscreen = window.matchMedia?.('(display-mode: fullscreen)');
    const mediaMinimal = window.matchMedia?.('(display-mode: minimal-ui)');

    const checkPwa = () => {
      setIsPwa(Boolean(
        window.navigator?.standalone ||
        mediaStandalone?.matches ||
        mediaFullscreen?.matches ||
        mediaMinimal?.matches
      ));
    };

    checkPwa();
    mediaStandalone?.addEventListener?.('change', checkPwa);
    mediaFullscreen?.addEventListener?.('change', checkPwa);
    mediaMinimal?.addEventListener?.('change', checkPwa);

    return () => {
      mediaStandalone?.removeEventListener?.('change', checkPwa);
      mediaFullscreen?.removeEventListener?.('change', checkPwa);
      mediaMinimal?.removeEventListener?.('change', checkPwa);
    };
  }, []);

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas'],
    queryFn: () => api.entities.Tarefa.list('-created_date'),
  });

  const { data: frentes = [] } = useQuery({
    queryKey: ['frentes-tarefas'],
    queryFn: () => api.entities.FrenteTrabalho.filter({ ativo: true }),
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios-tarefas'],
    queryFn: () => api.entities.Funcionario.filter({ ativo: true }),
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ['checklists-tarefas'],
    queryFn: () => api.entities.Checklist.filter({ ativo: true }),
  });
  
  const { data: templates = [] } = useQuery({
    queryKey: ['templates-tarefas'],
    queryFn: () => api.entities.TarefaTemplate.filter({ ativo: true }, '-created_date'),
  });

  const resolveAutoAlocacao = (data) => {
    if (data.funcionarios_designados?.length > 0) return { payload: data, autoAssigned: false };
    const frente = frentes.find(f => f.id === data.frente_trabalho_id);
    const candidatosDisponiveis = funcionarios.filter(f =>
      f.ativo !== false &&
      f.status === 'disponivel' &&
      (!data.frente_trabalho_id || f.frentes_trabalho?.includes(data.frente_trabalho_id))
    );

    const candidatos = candidatosDisponiveis.length > 0
      ? candidatosDisponiveis
      : (AUTOMATION_CONFIG.autoDistribuicaoScoreSemDisponiveis
        ? funcionarios.filter(f =>
            f.ativo !== false &&
            (!data.frente_trabalho_id || f.frentes_trabalho?.includes(data.frente_trabalho_id))
          )
        : []);

    if (candidatos.length === 0) {
      return {
        payload: { ...data, status: 'aguardando_alocacao' },
        autoAssigned: false,
      };
    }

    const quantidade = data.quantidade_profissionais || 1;
    const minScore = candidatosDisponiveis.length === 0 && AUTOMATION_CONFIG.autoDistribuicaoScoreSemDisponiveis
      ? 0
      : 20;
    const selecionados = selecionarMelhoresFuncionarios(candidatos, data, frente, quantidade, minScore);
    if (selecionados.length === 0) {
      return {
        payload: { ...data, status: 'aguardando_alocacao' },
        autoAssigned: false,
      };
    }

    return {
      payload: {
        ...data,
        funcionarios_designados: selecionados.map(f => f.id),
        funcionarios_nomes: selecionados.map(f => f.nome),
        quantidade_profissionais: selecionados.length,
        status: 'aguardando_alocacao',
        data_inicio: null,
      },
      autoAssigned: true,
    };
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { payload, autoAssigned } = resolveAutoAlocacao(data);
      const tarefa = await api.entities.Tarefa.create(payload);
      if (autoAssigned) {
        toast.success('Funcionário atribuído à tarefa');
      }
      return tarefa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['funcionarios-tarefas'] });
      setDialogOpen(false);
      setEditingTarefa(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Tarefa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      setDialogOpen(false);
      setEditingTarefa(null);
    },
    onError: () => toast.error('Você não tem permissão para editar esta tarefa'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Tarefa.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarefas'] }),
    onError: () => toast.error('Você não tem permissão para excluir esta tarefa'),
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

  const finalizarTarefa = async (tarefa, extraData = {}) => {
    if (tarefa.checklist_id && (!tarefa.checklist_preenchido || tarefa.checklist_preenchido.length === 0)) {
      toast.info('Preencha o checklist antes de concluir a tarefa.');
      await handleExecutarChecklist(tarefa);
      return;
    }
    try {
      await api.entities.Tarefa.update(tarefa.id, {
        ...extraData,
        status: 'concluida',
        data_conclusao: new Date().toISOString(),
      });

      if (tarefa.checklist_id) {
        await marcarChecklistConcluido(tarefa.id);
      }

      if (tarefa.funcionarios_designados?.length > 0) {
        for (const funcId of tarefa.funcionarios_designados) {
          if (!isAdmin && funcionarioAtual?.id !== funcId) continue;
          const func = funcionarios.find(f => f.id === funcId) || await api.entities.Funcionario.get(funcId);
          if (func) {
            await api.entities.Funcionario.update(funcId, {
              status: 'disponivel',
              tarefas_ativas: Math.max(0, (func.tarefas_ativas || 1) - 1),
              tarefas_concluidas: (func.tarefas_concluidas || 0) + 1,
            });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['funcionarios-tarefas'] });
      toast.success('Tarefa concluida');
      setDialogOpen(false);
      setEditingTarefa(null);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao concluir tarefa');
    }
  };

  const handleSave = (formData) => {
    if (editingTarefa) {
      if (editingTarefa.status !== 'concluida' && formData.status === 'concluida') {
        if (editingTarefa.checklist_id) {
          toast.info('Esta tarefa exige checklist. Preencha o checklist para concluir.');
          handleExecutarChecklist(editingTarefa);
          return;
        }
        finalizarTarefa(editingTarefa, formData);
        return;
      }
      updateMutation.mutate({ id: editingTarefa.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleUpdateStatus = async (tarefa, newStatus) => {
    if (!canEditTarefa(tarefa)) {
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
    queryClient.setQueryData(['tarefas'], (old = []) =>
      Array.isArray(old) ? old.map(t => (t.id === tarefa.id ? optimistic : t)) : old
    );
    try {
      const updated = await updateMutation.mutateAsync({ id: tarefa.id, data: updates });
      if (!updated || updated.status !== updates.status) {
        queryClient.invalidateQueries({ queryKey: ['tarefas'] });
        toast.error('Não foi possível alterar o status da tarefa');
        return;
      }
      if (updated?.id) {
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
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      toast.error(error?.message || 'Erro ao atualizar status da tarefa');
      return;
    }

    if (newStatus === 'em_execucao' && tarefa.funcionarios_designados?.length > 0) {
      tarefa.funcionarios_designados.forEach(async (funcId) => {
        if (!isAdmin && funcionarioAtual?.id !== funcId) return;
        try {
          const func = funcionarios.find(f => f.id === funcId) || await api.entities.Funcionario.get(funcId);
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
      toast.error('Erro ao carregar checklist');
    }
  };

  const filteredTarefas = tarefasVisiveis.filter(t => {
    const matchSearch = t.titulo?.toLowerCase().includes(search.toLowerCase()) ||
                       t.nota_numero?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || t.status === filterStatus;
    const matchTipo = filterTipo === 'todos' || t.tipo === filterTipo;
    const matchFrente = filterFrente === 'todas' || t.frente_trabalho_id === filterFrente;
    return matchSearch && matchStatus && matchTipo && matchFrente;
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

  const tipoLabels = {
    producao: 'Produção',
    carregamento: 'Carregamento',
    movimentacao: 'Movimentação',
    conferencia: 'Conferência',
    retirada: 'Retirada',
    entrega: 'Entrega',
    manutencao: 'Manutenção',
    outros: 'Outros',
  };

  const stats = {
    total: tarefasVisiveis.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').length,
    emExecucao: tarefasVisiveis.filter(t => t.status === 'em_execucao').length,
    aguardando: tarefasVisiveis.filter(t => t.status === 'aguardando_alocacao' || t.status === 'criada').length,
    concluidas: tarefasVisiveis.filter(t => t.status === 'concluida').length,
  };

  return (
    <>
      {/* Automação de Tarefas */}

      <div className="space-y-6">
        <PageHeader 
          title="Tarefas"
          subtitle={`${stats.emExecucao} tarefas em execução`}
          icon={ClipboardList}
          iconColor="text-indigo-500"
          actions={
            <Button 
              onClick={() => { setEditingTarefa(null); setDialogOpen(true); }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold touch-btn"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Tarefa
            </Button>
          }
        />

      {/* Stats */}
      <div
        className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4 perfil-stats-grid", isPwa && "!grid-cols-4 !gap-2")}
        style={isPwa ? { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.5rem' } : undefined}
      >
        <div
          className="bg-card/60 border border-border rounded-2xl p-4 perfil-stats-card"
          style={isPwa ? { padding: '8px', borderRadius: '12px' } : undefined}
        >
          <p className={cn("text-2xl font-bold text-foreground perfil-stats-value", isPwa && "!text-xl !leading-tight")}>{stats.total}</p>
          <p className={cn("text-xs text-muted-foreground perfil-stats-label", isPwa && "!text-[11px] !leading-tight")}>Tarefas Ativas</p>
        </div>
        <div
          className="bg-card/60 border border-amber-500/30 rounded-2xl p-4 perfil-stats-card"
          style={isPwa ? { padding: '8px', borderRadius: '12px' } : undefined}
        >
          <p className={cn("text-2xl font-bold text-amber-300 perfil-stats-value", isPwa && "!text-xl !leading-tight")}>{stats.emExecucao}</p>
          <p className={cn("text-xs text-muted-foreground perfil-stats-label", isPwa && "!text-[11px] !leading-tight")}>Em Execução</p>
        </div>
        <div
          className="bg-card/60 border border-primary/25 rounded-2xl p-4 perfil-stats-card"
          style={isPwa ? { padding: '8px', borderRadius: '12px' } : undefined}
        >
          <p className={cn("text-2xl font-bold text-primary perfil-stats-value", isPwa && "!text-xl !leading-tight")}>{stats.aguardando}</p>
          <p className={cn("text-xs text-muted-foreground perfil-stats-label", isPwa && "!text-[11px] !leading-tight")}>Aguardando</p>
        </div>
        <div
          className="bg-card/60 border border-emerald-500/25 rounded-2xl p-4 perfil-stats-card"
          style={isPwa ? { padding: '8px', borderRadius: '12px' } : undefined}
        >
          <p className={cn("text-2xl font-bold text-emerald-300 perfil-stats-value", isPwa && "!text-xl !leading-tight")}>{stats.concluidas}</p>
          <p className={cn("text-xs text-muted-foreground perfil-stats-label", isPwa && "!text-[11px] !leading-tight")}>Concluídas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/60 border-border text-foreground h-12"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full lg:w-44 bg-card/60 border-border text-foreground h-12">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
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
            className="h-12 lg:hidden"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
          >
            {showAdvancedFilters ? 'Ocultar filtros' : 'Filtros avancados'}
            {(filterTipo !== 'todos' || filterFrente !== 'todas') ? ' (ativos)' : ''}
          </Button>
        </div>

        <div className="hidden lg:flex gap-4 flex-wrap">
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-full lg:w-44 bg-card/60 border-border text-foreground h-12">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Tipos</SelectItem>
              <SelectItem value="producao">Produção</SelectItem>
              <SelectItem value="carregamento">Carregamento</SelectItem>
              <SelectItem value="movimentacao">Movimentação</SelectItem>
              <SelectItem value="conferencia">Conferência</SelectItem>
              <SelectItem value="retirada">Retirada</SelectItem>
              <SelectItem value="entrega">Entrega</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterFrente} onValueChange={setFilterFrente}>
            <SelectTrigger className="w-full lg:w-52 bg-card/60 border-border text-foreground h-12">
              <SelectValue placeholder="Frente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas Frentes</SelectItem>
              {frentes.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showAdvancedFilters && (
          <div className="flex flex-col gap-4 lg:hidden">
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full bg-card/60 border-border text-foreground h-12">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Tipos</SelectItem>
                <SelectItem value="producao">Produção</SelectItem>
                <SelectItem value="carregamento">Carregamento</SelectItem>
                <SelectItem value="movimentacao">Movimentação</SelectItem>
                <SelectItem value="conferencia">Conferência</SelectItem>
                <SelectItem value="retirada">Retirada</SelectItem>
                <SelectItem value="entrega">Entrega</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFrente} onValueChange={setFilterFrente}>
              <SelectTrigger className="w-full bg-card/60 border-border text-foreground h-12">
                <SelectValue placeholder="Frente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas Frentes</SelectItem>
                {frentes.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Lista de Tarefas */}
      <div className="space-y-3">
        {filteredTarefas.map(tarefa => {
          const canEdit = canEditTarefa(tarefa);
          const checklistPreenchido = Array.isArray(tarefa.checklist_preenchido) && tarefa.checklist_preenchido.length > 0;
          const canOpenMenu = canEdit || isManager;
          return (
          <div 
            key={tarefa.id}
            className={cn(
              "bg-card/50 border rounded-2xl p-4 lg:p-5 transition-all hover:border-border/80",
              tarefa.prioridade === 'urgente' ? "border-red-500/50" : "border-border"
            )}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{tarefa.titulo}</h3>
                  <span className={cn("text-xs px-2 py-1 rounded-full border", statusColors[tarefa.status])}>
                    {tarefa.status?.replace('_', ' ')}
                  </span>
                  <span className={cn("text-xs px-2 py-1 rounded-full", prioridadeColors[tarefa.prioridade])}>
                    {tarefa.prioridade}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tipoLabels[tarefa.tipo]}
                  </span>
                </div>
                 
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {tarefa.frente_trabalho_nome && (
                    <span className="text-xs px-2 py-1 rounded bg-muted/60 border border-border/60 text-muted-foreground">
                      {tarefa.frente_trabalho_nome}
                    </span>
                  )}
                  {tarefa.nota_numero && (
                    <span className="flex items-center gap-1">
                      Nota: {tarefa.nota_numero}
                    </span>
                  )}
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
                  {tarefa.data_conclusao && (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Concluída: {format(new Date(tarefa.data_conclusao), 'HH:mm')}
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
                {canOpenMenu && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground order-5">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {tarefa.checklist_id && isManager && (
                        <DropdownMenuItem onClick={() => { setHistoricoTarefa(tarefa); setHistoricoOpen(true); }}>
                          <History className="w-4 h-4 mr-2" /> Histórico
                        </DropdownMenuItem>
                      )}
                      {canEdit && (
                        <DropdownMenuItem onClick={() => { setEditingTarefa(tarefa); setDialogOpen(true); }}>
                          <Edit2 className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                      )}
                      {isAdmin && (
                        <DropdownMenuItem 
                          className="text-red-400"
                          onClick={() => deleteMutation.mutate(tarefa.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        )})}

        {filteredTarefas.length === 0 && (
          <div className="text-center py-12 bg-card/30 border border-dashed border-border/70 rounded-2xl">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma tarefa encontrada</p>
          </div>
        )}
      </div>

      {/* Dialog */}
      <TarefaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tarefa={editingTarefa}
        frentes={frentes}
        funcionarios={funcionarios}
        checklists={checklists}
        templates={templates}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ChecklistHistoricoDialog
        open={historicoOpen}
        onOpenChange={(open) => {
          setHistoricoOpen(open);
          if (!open) setHistoricoTarefa(null);
        }}
        tarefa={historicoTarefa}
        checklists={checklists}
      />

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
            queryClient.invalidateQueries({ queryKey: ['tarefas'] });
          }}
          onFechar={() => {
            setExecutandoChecklist(null);
            setChecklistExecucao(null);
            setChecklistReadOnly(false);
          }}
        />
      )}
      </div>
    </>
  );
}

function TarefaDialog({ open, onOpenChange, tarefa, frentes, funcionarios, checklists, templates, onSave, isLoading }) {
  const NO_CHECKLIST = '__sem_checklist__';
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'producao',
    frente_trabalho_id: '',
    frente_trabalho_nome: '',
    funcionarios_designados: [],
    funcionarios_nomes: [],
    quantidade_profissionais: 1,
    prioridade: 'media',
    status: 'criada',
    nota_numero: '',
    checklist_id: '',
    observacoes: '',
  });
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  React.useEffect(() => {
    if (tarefa) {
      setFormData({
        titulo: tarefa.titulo || '',
        descricao: tarefa.descricao || '',
        tipo: tarefa.tipo || 'producao',
        frente_trabalho_id: tarefa.frente_trabalho_id || '',
        frente_trabalho_nome: tarefa.frente_trabalho_nome || '',
        funcionarios_designados: tarefa.funcionarios_designados || [],
        funcionarios_nomes: tarefa.funcionarios_nomes || [],
        quantidade_profissionais: tarefa.quantidade_profissionais || 1,
        prioridade: tarefa.prioridade || 'media',
        status: tarefa.status || 'criada',
        nota_numero: tarefa.nota_numero || '',
        checklist_id: tarefa.checklist_id || '',
        observacoes: tarefa.observacoes || '',
      });
    } else {
      setFormData({
        titulo: '',
        descricao: '',
        tipo: 'producao',
        frente_trabalho_id: '',
        frente_trabalho_nome: '',
        funcionarios_designados: [],
        funcionarios_nomes: [],
        quantidade_profissionais: 1,
        prioridade: 'media',
        status: 'criada',
        nota_numero: '',
        checklist_id: '',
        observacoes: '',
      });
    }
  }, [tarefa, open]);

  const applyTemplate = (tpl) => {
    if (!tpl) return;
    setFormData((prev) => ({
      ...prev,
      titulo: tpl.nome || prev.titulo,
      descricao: tpl.descricao || '',
      tipo: tpl.tipo || prev.tipo,
      prioridade: tpl.prioridade || prev.prioridade,
      frente_trabalho_id: tpl.frente_trabalho_id || '',
      frente_trabalho_nome: tpl.frente_trabalho_nome || '',
      checklist_id: tpl.checklist_id || '',
      quantidade_profissionais: Number(tpl.quantidade_profissionais || 1) || 1,
      observacoes: tpl.observacoes || '',
      funcionarios_designados: [],
      funcionarios_nomes: [],
    }));
  };

  const handleFrenteChange = (frenteId) => {
    const frente = frentes.find(f => f.id === frenteId);
    setFormData(prev => ({
      ...prev,
      frente_trabalho_id: frenteId,
      frente_trabalho_nome: frente?.nome || '',
    }));
  };

  const toggleFuncionario = (funcId) => {
    const func = funcionarios.find(f => f.id === funcId);
    setFormData(prev => {
      const isSelected = prev.funcionarios_designados.includes(funcId);
      if (isSelected) {
        return {
          ...prev,
          funcionarios_designados: prev.funcionarios_designados.filter(id => id !== funcId),
          funcionarios_nomes: prev.funcionarios_nomes.filter(n => n !== func?.nome),
        };
      } else {
        return {
          ...prev,
          funcionarios_designados: [...prev.funcionarios_designados, funcId],
          funcionarios_nomes: [...prev.funcionarios_nomes, func?.nome],
        };
      }
    });
  };

  // Filtrar funcionários pela frente selecionada
  const funcionariosFiltrados = formData.frente_trabalho_id
    ? funcionarios.filter(f => f.frentes_trabalho?.includes(formData.frente_trabalho_id) && f.status === 'disponivel')
    : funcionarios.filter(f => f.status === 'disponivel');

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border text-foreground max-w-2xl sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-12">
          <div className="flex items-center gap-3">
            <DialogTitle>{tarefa ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
            {!tarefa && (templates?.length || 0) > 0 && (
              <Button
                type="button"
                variant="outline"
                className="ml-auto h-7 px-3 text-xs border-border text-foreground hover:bg-accent"
                onClick={() => setTemplatePickerOpen(true)}
              >
                Usar Template
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Título da Tarefa *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              className="bg-card border-border mt-1"
              placeholder="Descreva a tarefa"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="bg-card border-border mt-1"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger className="bg-card border-border mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="carregamento">Carregamento</SelectItem>
                  <SelectItem value="descarga">Descarga</SelectItem>
                  <SelectItem value="movimentacao">Movimentação</SelectItem>
                  <SelectItem value="conferencia">Conferência</SelectItem>
                  <SelectItem value="retirada">Retirada</SelectItem>
                  <SelectItem value="troca">Troca</SelectItem>
                  <SelectItem value="devolucao">Devolução</SelectItem>
                  <SelectItem value="entrega">Entrega</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={formData.prioridade} onValueChange={(v) => setFormData({ ...formData, prioridade: v })}>
                <SelectTrigger className="bg-card border-border mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Frente de Trabalho *</Label>
            <Select value={formData.frente_trabalho_id} onValueChange={handleFrenteChange}>
              <SelectTrigger className="bg-card border-border mt-1">
                <SelectValue placeholder="Selecione a frente..." />
              </SelectTrigger>
              <SelectContent>
                {frentes.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nº da Nota (opcional)</Label>
              <Input
                value={formData.nota_numero}
                onChange={(e) => setFormData({ ...formData, nota_numero: e.target.value })}
                className="bg-card border-border mt-1"
                placeholder="Ex: NF-12345"
              />
            </div>
            <div>
              <Label>Qtd. Profissionais</Label>
              <Input
                type="number"
                min={1}
                value={formData.quantidade_profissionais}
                onChange={(e) => setFormData({ ...formData, quantidade_profissionais: parseInt(e.target.value) || 1 })}
                className="bg-card border-border mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Designar Funcionários</Label>
            <p className="text-xs text-muted-foreground mb-2">
              {funcionariosFiltrados.length} funcionários disponíveis 
              {formData.frente_trabalho_id && ' nesta frente'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {funcionariosFiltrados.map(func => (
                <button
                  key={func.id}
                  type="button"
                  onClick={() => toggleFuncionario(func.id)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm transition-all",
                    formData.funcionarios_designados.includes(func.id)
                      ? "bg-primary/15 text-primary border border-primary/25"
                      : "bg-card text-muted-foreground border border-border hover:border-border/80"
                  )}
                >
                  {func.nome}
                </button>
              ))}
              {funcionariosFiltrados.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum funcionario disponivel</p>
              )}
            </div>
          </div>

          <div>
            <Label>Checklist</Label>
            <Select
              value={formData.checklist_id || ''}
              onValueChange={(v) => setFormData({ ...formData, checklist_id: v === NO_CHECKLIST ? '' : v })}
            >
              <SelectTrigger className="bg-card border-border mt-1">
                <SelectValue placeholder="Selecione um checklist..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHECKLIST}>Nenhum</SelectItem>
                {checklists.filter(c => c.tipo === formData.tipo || !formData.tipo).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="bg-card border-border mt-1"
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => onSave(formData)}
            disabled={isLoading || !formData.titulo || !formData.frente_trabalho_id}
          >
            {isLoading ? 'Salvando...' : 'Salvar e Disparar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <SelecionarTemplateDialog
      open={templatePickerOpen}
      onOpenChange={setTemplatePickerOpen}
      templates={templates || []}
      onSelect={(tpl) => {
        applyTemplate(tpl);
        setTemplatePickerOpen(false);
      }}
    />
    </>
  );
}
