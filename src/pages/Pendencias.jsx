import React, { useState } from 'react';
import { api } from '@/api/dataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  AlertTriangle, 
  Plus, 
  Search,
  CheckCircle,
  Clock,
  User,
  Edit2,
  Trash2,
  MoreVertical,
  XCircle
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function Pendencias() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterPrioridade, setFilterPrioridade] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPendencia, setEditingPendencia] = useState(null);

  const { data: pendencias = [] } = useQuery({
    queryKey: ['pendencias'],
    queryFn: () => api.entities.Pendencia.list('-created_date'),
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios-pendencias'],
    queryFn: () => api.entities.Funcionario.filter({ ativo: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Pendencia.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendencias'] });
      setDialogOpen(false);
      setEditingPendencia(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Pendencia.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendencias'] });
      setDialogOpen(false);
      setEditingPendencia(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Pendencia.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pendencias'] }),
  });

  const handleSave = (formData) => {
    if (editingPendencia) {
      updateMutation.mutate({ id: editingPendencia.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredPendencias = pendencias.filter(p => {
    const matchSearch = p.titulo?.toLowerCase().includes(search.toLowerCase()) ||
                       p.descricao?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || p.status === filterStatus;
    const matchPrioridade = filterPrioridade === 'todos' || p.prioridade === filterPrioridade;
    return matchSearch && matchStatus && matchPrioridade;
  });

  const statusColors = {
    aberta: 'bg-red-500/20 text-red-400 border-red-500/30',
    em_analise: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    resolvida: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelada: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const prioridadeColors = {
    baixa: 'bg-slate-500/20 text-slate-400',
    media: 'bg-blue-500/20 text-blue-400',
    alta: 'bg-amber-500/20 text-amber-400',
    critica: 'bg-red-500/20 text-red-400',
  };

  const tipoLabels = {
    falta_material: 'Falta de Material',
    problema_producao: 'Problema na Produção',
    atraso_entrega: 'Atraso na Entrega',
    conferencia_pendente: 'Conferência Pendente',
    manutencao: 'Manutenção',
    documentacao: 'Documentação',
    outro: 'Outro',
  };

  const stats = {
    abertas: pendencias.filter(p => p.status === 'aberta').length,
    emAnalise: pendencias.filter(p => p.status === 'em_analise').length,
    criticas: pendencias.filter(p => p.prioridade === 'critica' && p.status !== 'resolvida').length,
    resolvidas: pendencias.filter(p => p.status === 'resolvida').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Pendências"
        subtitle={`${stats.abertas + stats.emAnalise} pendências ativas`}
        icon={AlertTriangle}
        actions={
          <Button 
            onClick={() => { setEditingPendencia(null); setDialogOpen(true); }}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold touch-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Pendência
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-red-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-400">{stats.abertas}</p>
          <p className="text-xs text-slate-500">Abertas</p>
        </div>
        <div className="bg-slate-900/50 border border-amber-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-400">{stats.emAnalise}</p>
          <p className="text-xs text-slate-500">Em Análise</p>
        </div>
        <div className="bg-slate-900/50 border border-red-500/50 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-500">{stats.criticas}</p>
          <p className="text-xs text-slate-500">Críticas</p>
        </div>
        <div className="bg-slate-900/50 border border-green-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-400">{stats.resolvidas}</p>
          <p className="text-xs text-slate-500">Resolvidas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Buscar pendência..."
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
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="em_analise">Em Análise</SelectItem>
            <SelectItem value="resolvida">Resolvida</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
          <SelectTrigger className="w-full lg:w-48 bg-slate-900/50 border-slate-700 text-white h-12">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas Prioridades</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filteredPendencias.map(pendencia => (
          <div 
            key={pendencia.id}
            className={cn(
              "bg-slate-900/50 border rounded-xl p-4 lg:p-5 transition-all hover:border-slate-700",
              pendencia.prioridade === 'critica' ? "border-red-500/50" : "border-slate-800"
            )}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-white">{pendencia.titulo}</h3>
                  <span className={cn("text-xs px-2 py-1 rounded-full border", statusColors[pendencia.status])}>
                    {pendencia.status?.replace('_', ' ')}
                  </span>
                  <span className={cn("text-xs px-2 py-1 rounded-full", prioridadeColors[pendencia.prioridade])}>
                    {pendencia.prioridade}
                  </span>
                </div>
                {pendencia.descricao && (
                  <p className="text-sm text-slate-400 mb-2 line-clamp-2">{pendencia.descricao}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  <span>{tipoLabels[pendencia.tipo]}</span>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded">Origem: {pendencia.origem}</span>
                  {pendencia.responsavel_nome && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {pendencia.responsavel_nome}
                    </span>
                  )}
                  {pendencia.created_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(pendencia.created_date), 'dd/MM HH:mm')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pendencia.status === 'aberta' && (
                  <Button 
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-black touch-btn"
                    onClick={() => updateMutation.mutate({ id: pendencia.id, data: { status: 'em_analise' } })}
                  >
                    Analisar
                  </Button>
                )}
                {pendencia.status === 'em_analise' && (
                  <Button 
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 touch-btn"
                    onClick={() => updateMutation.mutate({ id: pendencia.id, data: { status: 'resolvida', data_resolucao: new Date().toISOString() } })}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Resolver
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingPendencia(pendencia); setDialogOpen(true); }}>
                      <Edit2 className="w-4 h-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-400"
                      onClick={() => deleteMutation.mutate(pendencia.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}

        {filteredPendencias.length === 0 && (
          <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
            <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">Nenhuma pendência encontrada</p>
          </div>
        )}
      </div>

      {/* Dialog */}
      <PendenciaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pendencia={editingPendencia}
        funcionarios={funcionarios}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

function PendenciaDialog({ open, onOpenChange, pendencia, funcionarios, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'outro',
    origem: 'sistema',
    prioridade: 'media',
    status: 'aberta',
    responsavel_id: '',
    responsavel_nome: '',
    resolucao: '',
  });

  React.useEffect(() => {
    if (pendencia) {
      setFormData({
        titulo: pendencia.titulo || '',
        descricao: pendencia.descricao || '',
        tipo: pendencia.tipo || 'outro',
        origem: pendencia.origem || 'sistema',
        prioridade: pendencia.prioridade || 'media',
        status: pendencia.status || 'aberta',
        responsavel_id: pendencia.responsavel_id || '',
        responsavel_nome: pendencia.responsavel_nome || '',
        resolucao: pendencia.resolucao || '',
      });
    } else {
      setFormData({
        titulo: '',
        descricao: '',
        tipo: 'outro',
        origem: 'sistema',
        prioridade: 'media',
        status: 'aberta',
        responsavel_id: '',
        responsavel_nome: '',
        resolucao: '',
      });
    }
  }, [pendencia, open]);

  const handleResponsavelChange = (id) => {
    const func = funcionarios.find(f => f.id === id);
    setFormData(prev => ({ ...prev, responsavel_id: id, responsavel_nome: func?.nome || '' }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pendencia ? 'Editar Pendência' : 'Nova Pendência'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Título *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              className="bg-slate-800 border-slate-700 mt-1"
              placeholder="Descreva a pendência"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="bg-slate-800 border-slate-700 mt-1"
              rows={3}
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
                  <SelectItem value="falta_material">Falta Material</SelectItem>
                  <SelectItem value="problema_producao">Problema Produção</SelectItem>
                  <SelectItem value="atraso_entrega">Atraso Entrega</SelectItem>
                  <SelectItem value="conferencia_pendente">Conferência Pendente</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="documentacao">Documentação</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Origem *</Label>
              <Select value={formData.origem} onValueChange={(v) => setFormData({ ...formData, origem: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="expedicao">Expedição</SelectItem>
                  <SelectItem value="logistica">Logística</SelectItem>
                  <SelectItem value="carregamento">Carregamento</SelectItem>
                  <SelectItem value="rota">Rota</SelectItem>
                  <SelectItem value="sistema">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="resolvida">Resolvida</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Responsável</Label>
            <Select value={formData.responsavel_id} onValueChange={handleResponsavelChange}>
              <SelectTrigger className="bg-slate-800 border-slate-700 mt-1">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {funcionarios.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.status === 'resolvida' && (
            <div>
              <Label>Resolução</Label>
              <Textarea
                value={formData.resolucao}
                onChange={(e) => setFormData({ ...formData, resolucao: e.target.value })}
                className="bg-slate-800 border-slate-700 mt-1"
                rows={2}
                placeholder="Descreva como foi resolvido"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-800">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
            onClick={() => onSave(formData)}
            disabled={isLoading || !formData.titulo}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


