import React, { useState } from 'react';
import { api } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';
import { useFuncionarioAtual } from '@/hooks/useFuncionarioAtual';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Factory, 
  Plus, 
  Search,
  Filter,
  Clock,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  User
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas-producao'],
    queryFn: () => api.entities.Tarefa.filter({ tipo: 'producao' }, '-created_date'),
  });

  const { data: frentes = [] } = useQuery({
    queryKey: ['frentes-producao'],
    queryFn: () => api.entities.FrenteTrabalho.filter({ categoria: 'producao', ativo: true }),
  });

  const updateTarefaMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Tarefa.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarefas-producao'] }),
  });

  const filteredTarefas = tarefas.filter(t => {
    const matchSearch = t.titulo?.toLowerCase().includes(search.toLowerCase()) ||
                       t.nota_numero?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || t.status === filterStatus;
    const matchFrente = filterFrente === 'todas' || t.frente_trabalho_id === filterFrente;
    return matchSearch && matchStatus && matchFrente;
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

  const finalizarTarefa = async (tarefa) => {
    try {
      await api.entities.Tarefa.update(tarefa.id, {
        status: 'concluida',
        data_conclusao: new Date().toISOString(),
      });

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

  const handleUpdateStatus = (tarefa, newStatus) => {
    const canEdit = isAdmin || (funcionarioAtual && tarefa.funcionarios_designados?.includes(funcionarioAtual.id));
    if (!canEdit) {
      toast.error('Somente o responsável pode editar esta tarefa');
      return;
    }
    if (newStatus === 'concluida') {
      finalizarTarefa(tarefa);
      return;
    }
    const updates = { status: newStatus };
    if (newStatus === 'em_execucao' && !tarefa.data_inicio) {
      updates.data_inicio = new Date().toISOString();
    }
    updateTarefaMutation.mutate({ id: tarefa.id, data: updates });
  };

  const stats = {
    total: tarefas.length,
    emExecucao: tarefas.filter(t => t.status === 'em_execucao').length,
    aguardando: tarefas.filter(t => t.status === 'aguardando_alocacao' || t.status === 'criada').length,
    concluidas: tarefas.filter(t => t.status === 'concluida').length,
  };

  const isAdmin = user?.user_metadata?.role === 'admin';
  const canEditTarefa = (tarefa) =>
    isAdmin || (funcionarioAtual && tarefa.funcionarios_designados?.includes(funcionarioAtual.id));

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Produção"
        subtitle={`${stats.emExecucao} ordens em execução`}
        icon={Factory}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-slate-500">Total de Ordens</p>
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
          <p className="text-xs text-slate-500">Concluídas Hoje</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Buscar por título ou nota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-900/50 border-slate-700 text-white h-12"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full lg:w-48 bg-slate-900/50 border-slate-700 text-white h-12">
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
        <Select value={filterFrente} onValueChange={setFilterFrente}>
          <SelectTrigger className="w-full lg:w-56 bg-slate-900/50 border-slate-700 text-white h-12">
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

      {/* Lista de Ordens */}
      <div className="space-y-3">
        {filteredTarefas.map(tarefa => {
          const canEdit = canEditTarefa(tarefa);
          return (
          <div 
            key={tarefa.id}
            className={cn(
              "bg-slate-900/50 border rounded-xl p-4 lg:p-5 transition-all",
              tarefa.prioridade === 'urgente' ? "border-red-500/30" : "border-slate-800"
            )}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-white">{tarefa.titulo}</h3>
                  <span className={cn("text-xs px-2 py-1 rounded-full border", statusColors[tarefa.status])}>
                    {tarefa.status?.replace('_', ' ')}
                  </span>
                  <span className={cn("text-xs px-2 py-1 rounded-full", prioridadeColors[tarefa.prioridade])}>
                    {tarefa.prioridade}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  {tarefa.nota_numero && (
                    <span className="flex items-center gap-1">
                      📋 Nota: {tarefa.nota_numero}
                    </span>
                  )}
                    <span className="flex items-center gap-1">
                      🏭 {tarefa.frente_trabalho_nome || 'Sem frente'}
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

              <div className="flex items-center gap-2">
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
              </div>
            </div>
          </div>
        )})}

        {filteredTarefas.length === 0 && (
          <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
            <Factory className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">Nenhuma ordem de produção encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}

