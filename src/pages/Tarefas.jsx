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
  FileCheck
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import ExecutarChecklist from '../components/tarefas/ExecutarChecklist';
import AutomacaoTarefas, { useSincronizacaoTarefas } from '../components/tarefas/AutomacaoTarefas';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState(null);
  const [executandoChecklist, setExecutandoChecklist] = useState(null);
  const [checklistExecucao, setChecklistExecucao] = useState(null);
  const [checklistReadOnly, setChecklistReadOnly] = useState(false);

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

    const shouldStart = !data.status || data.status === 'criada' || data.status === 'aguardando_alocacao';
    return {
      payload: {
        ...data,
        funcionarios_designados: selecionados.map(f => f.id),
        funcionarios_nomes: selecionados.map(f => f.nome),
        quantidade_profissionais: selecionados.length,
        status: shouldStart ? 'em_execucao' : data.status,
        data_inicio: shouldStart ? new Date().toISOString() : data.data_inicio,
      },
      autoAssigned: true,
    };
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { payload, autoAssigned } = resolveAutoAlocacao(data);
      const tarefa = await api.entities.Tarefa.create(payload);
      // Atualizar status dos funcionários designados
      if (payload.funcionarios_designados?.length > 0) {
        for (const funcId of payload.funcionarios_designados) {
          if (!isAdmin && funcionarioAtual?.id !== funcId) continue;
          const func = funcionarios.find(f => f.id === funcId);
          if (func) {
            await api.entities.Funcionario.update(funcId, {
              status: 'ocupado',
              tarefas_ativas: (func.tarefas_ativas || 0) + 1
            });
          }
        }
      }
      if (autoAssigned) {
        toast.success('Funcionário alocado automaticamente');
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

  const isAdmin = user?.user_metadata?.role === 'admin';
  const canEditTarefa = (tarefa) =>
    isAdmin || (funcionarioAtual && tarefa.funcionarios_designados?.includes(funcionarioAtual.id));

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

  const handleUpdateStatus = (tarefa, newStatus) => {
    if (!canEditTarefa(tarefa)) {
      toast.error('Somente o responsável pode editar esta tarefa');
      return;
    }
    if (newStatus === 'concluida') {
      if (tarefa.checklist_id) {
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
    updateMutation.mutate({ id: tarefa.id, data: updates });
  };

  const handleExecutarChecklist = async (tarefa) => {
    if (!tarefa.checklist_id) {
      toast.error('Esta tarefa não possui checklist configurado');
      return;
    }
    try {
      const checklist = await api.entities.Checklist.get(tarefa.checklist_id);
      setExecutandoChecklist(tarefa);
      setChecklistExecucao(checklist);
      setChecklistReadOnly(!canEditTarefa(tarefa));
    } catch (error) {
      toast.error('Erro ao carregar checklist');
    }
  };

  const filteredTarefas = tarefas.filter(t => {
    const matchSearch = t.titulo?.toLowerCase().includes(search.toLowerCase()) ||
                       t.nota_numero?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || t.status === filterStatus;
    const matchTipo = filterTipo === 'todos' || t.tipo === filterTipo;
    const matchFrente = filterFrente === 'todas' || t.frente_trabalho_id === filterFrente;
    return matchSearch && matchStatus && matchTipo && matchFrente;
  });

  const statusColors = {
    criada: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    aguardando_alocacao: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    em_execucao: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    pausada: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    concluida: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelada: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const prioridadeColors = {
    baixa: 'bg-slate-500/20 text-slate-400',
    media: 'bg-blue-500/20 text-blue-400',
    alta: 'bg-amber-500/20 text-amber-400',
    urgente: 'bg-red-500/20 text-red-400',
  };

  const tipoLabels = {
    producao: '🏭 Produção',
    carregamento: '📦 Carregamento',
    movimentacao: '🏗️ Movimentação',
    conferencia: '✅ Conferência',
    retirada: '🛒 Retirada',
    entrega: '🚚 Entrega',
    manutencao: '🔧 Manutenção',
    outros: '📋 Outros',
  };

  const stats = {
    total: tarefas.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').length,
    emExecucao: tarefas.filter(t => t.status === 'em_execucao').length,
    aguardando: tarefas.filter(t => t.status === 'aguardando_alocacao' || t.status === 'criada').length,
    concluidas: tarefas.filter(t => t.status === 'concluida').length,
  };

  return (
    <>
      {/* Automação de Tarefas */}
      <AutomacaoTarefas />

      <div className="space-y-6">
        <PageHeader 
          title="Tarefas"
          subtitle={`${stats.emExecucao} tarefas em execução`}
          icon={ClipboardList}
          actions={
            <Button 
              onClick={() => { setEditingTarefa(null); setDialogOpen(true); }}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold touch-btn"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Tarefa
            </Button>
          }
        />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-slate-500">Tarefas Ativas</p>
        </div>
        <div className="bg-slate-900/50 border border-amber-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-400">{stats.emExecucao}</p>
          <p className="text-xs text-slate-500">Em Execução</p>
        </div>
        <div className="bg-slate-900/50 border border-blue-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-400">{stats.aguardando}</p>
          <p className="text-xs text-slate-500">Aguardando</p>
        </div>
        <div className="bg-slate-900/50 border border-green-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-400">{stats.concluidas}</p>
          <p className="text-xs text-slate-500">Concluídas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Buscar tarefa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-900/50 border-slate-700 text-white h-12"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full lg:w-44 bg-slate-900/50 border-slate-700 text-white h-12">
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
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-full lg:w-44 bg-slate-900/50 border-slate-700 text-white h-12">
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
          <SelectTrigger className="w-full lg:w-52 bg-slate-900/50 border-slate-700 text-white h-12">
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

      {/* Lista de Tarefas */}
      <div className="space-y-3">
        {filteredTarefas.map(tarefa => {
          const canEdit = canEditTarefa(tarefa);
          return (
          <div 
            key={tarefa.id}
            className={cn(
              "bg-slate-900/50 border rounded-xl p-4 lg:p-5 transition-all hover:border-slate-700",
              tarefa.prioridade === 'urgente' ? "border-red-500/50" : "border-slate-800"
            )}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="font-semibold text-white">{tarefa.titulo}</h3>
                  <span className={cn("text-xs px-2 py-1 rounded-full border", statusColors[tarefa.status])}>
                    {tarefa.status?.replace('_', ' ')}
                  </span>
                  <span className={cn("text-xs px-2 py-1 rounded-full", prioridadeColors[tarefa.prioridade])}>
                    {tarefa.prioridade}
                  </span>
                  <span className="text-xs text-slate-400">
                    {tipoLabels[tarefa.tipo]}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  {tarefa.frente_trabalho_nome && (
                    <span className="text-xs px-2 py-1 rounded bg-slate-800">
                      {tarefa.frente_trabalho_nome}
                    </span>
                  )}
                  {tarefa.nota_numero && (
                    <span className="flex items-center gap-1">
                      📋 Nota: {tarefa.nota_numero}
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
                {tarefa.checklist_id && tarefa.status === 'em_execucao' && (
                  <Button 
                    size="sm"
                    className="bg-purple-500 hover:bg-purple-600 touch-btn"
                    onClick={() => handleExecutarChecklist(tarefa)}
                  >
                    <FileCheck className="w-4 h-4 mr-1" />
                    {canEdit ? 'Checklist' : 'Ver Checklist'}
                  </Button>
                )}
                {(tarefa.status === 'criada' || tarefa.status === 'aguardando_alocacao') && (
                  <Button 
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 touch-btn"
                    onClick={() => handleUpdateStatus(tarefa, 'em_execucao')}
                    disabled={!canEdit}
                    title={!canEdit ? 'Somente o responsável pode editar' : undefined}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Iniciar
                  </Button>
                )}
                {tarefa.status === 'em_execucao' && (
                  <>
                    <Button 
                      size="sm"
                      variant="outline"
                      className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 touch-btn"
                      onClick={() => handleUpdateStatus(tarefa, 'pausada')}
                      disabled={!canEdit}
                      title={!canEdit ? 'Somente o responsável pode editar' : undefined}
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pausar
                    </Button>
                    {!tarefa.checklist_id && (
                      <Button 
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 touch-btn"
                        onClick={() => handleUpdateStatus(tarefa, 'concluida')}
                        disabled={!canEdit}
                        title={!canEdit ? 'Somente o responsável pode editar' : undefined}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Concluir
                      </Button>
                    )}
                  </>
                )}
                {tarefa.status === 'pausada' && (
                  <Button 
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 touch-btn"
                    onClick={() => handleUpdateStatus(tarefa, 'em_execucao')}
                    disabled={!canEdit}
                    title={!canEdit ? 'Somente o responsável pode editar' : undefined}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Retomar
                  </Button>
                )}
                {(canEdit || isAdmin) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
          <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
            <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">Nenhuma tarefa encontrada</p>
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
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tarefa ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!tarefa && (templates?.length || 0) > 0 && (
            <div className="flex items-center justify-between gap-3 p-3 bg-slate-900/40 border border-slate-800 rounded-xl">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Usar template</p>
                <p className="text-xs text-slate-500 truncate">Preencha automaticamente os campos principais</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-slate-700 text-slate-200"
                onClick={() => setTemplatePickerOpen(true)}
              >
                Selecionar
              </Button>
            </div>
          )}
          <div>
            <Label>Título da Tarefa *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              className="bg-slate-800 border-slate-700 mt-1"
              placeholder="Descreva a tarefa"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="bg-slate-800 border-slate-700 mt-1"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 mt-1">
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
                <SelectTrigger className="bg-slate-800 border-slate-700 mt-1">
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
              <SelectTrigger className="bg-slate-800 border-slate-700 mt-1">
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
                className="bg-slate-800 border-slate-700 mt-1"
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
                className="bg-slate-800 border-slate-700 mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Designar Funcionários</Label>
            <p className="text-xs text-slate-500 mb-2">
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
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
                  )}
                >
                  {func.nome}
                </button>
              ))}
              {funcionariosFiltrados.length === 0 && (
                <p className="text-sm text-slate-500">Nenhum funcionário disponível</p>
              )}
            </div>
          </div>

          <div>
            <Label>Checklist</Label>
            <Select
              value={formData.checklist_id || ''}
              onValueChange={(v) => setFormData({ ...formData, checklist_id: v === NO_CHECKLIST ? '' : v })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 mt-1">
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
              className="bg-slate-800 border-slate-700 mt-1"
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-800">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
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

