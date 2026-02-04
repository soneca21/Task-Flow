import React, { useState } from 'react';
import { api } from '@/api/dataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, 
  Plus, 
  Search,
  Filter,
  Send,
  Eye,
  Edit2,
  Trash2,
  MoreVertical,
  MapPin,
  User,
  Calendar
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

export default function Expedicao() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNota, setEditingNota] = useState(null);

  const { data: notas = [] } = useQuery({
    queryKey: ['notas'],
    queryFn: () => api.entities.Nota.list('-created_date'),
  });

  const { data: frentes = [] } = useQuery({
    queryKey: ['frentes-expedicao'],
    queryFn: () => api.entities.FrenteTrabalho.filter({ ativo: true }),
  });

  const createNotaMutation = useMutation({
    mutationFn: (data) => api.entities.Nota.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] });
      setDialogOpen(false);
      setEditingNota(null);
    },
  });

  const updateNotaMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Nota.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] });
      setDialogOpen(false);
      setEditingNota(null);
    },
  });

  const deleteNotaMutation = useMutation({
    mutationFn: (id) => api.entities.Nota.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notas'] }),
  });

  const handleSave = (formData) => {
    if (editingNota) {
      updateNotaMutation.mutate({ id: editingNota.id, data: formData });
    } else {
      createNotaMutation.mutate(formData);
    }
  };

  const filteredNotas = notas.filter(n => {
    const matchSearch = n.numero?.toLowerCase().includes(search.toLowerCase()) ||
                       n.cliente?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || n.status === filterStatus;
    const matchTipo = filterTipo === 'todos' || n.tipo === filterTipo;
    return matchSearch && matchStatus && matchTipo;
  });

  const statusColors = {
    pendente: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    em_expedicao: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    em_producao: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    aguardando_carregamento: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    carregando: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    em_rota: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    entregue: 'bg-green-500/20 text-green-400 border-green-500/30',
    retirada: 'bg-green-500/20 text-green-400 border-green-500/30',
    parcial: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    cancelada: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const tipoLabels = {
    entrega: 'Entrega',
    retirada_balcao: 'Retirada Balcão',
    retirada_terceiro: 'Retirada Terceiro',
    transferencia: 'Transferência',
  };

  const stats = {
    pendentes: notas.filter(n => n.status === 'pendente' || n.status === 'em_expedicao').length,
    emProducao: notas.filter(n => n.status === 'em_producao').length,
    aguardando: notas.filter(n => n.status === 'aguardando_carregamento').length,
    emRota: notas.filter(n => n.status === 'em_rota').length,
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader 
          title="Expedição"
          subtitle={`${notas.length} notas cadastradas`}
          icon={Package}
          actions={
          <Button 
            onClick={() => { setEditingNota(null); setDialogOpen(true); }}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold touch-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Nota
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-400">{stats.pendentes}</p>
          <p className="text-xs text-slate-500">Em Expedição</p>
        </div>
        <div className="bg-slate-900/50 border border-amber-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-400">{stats.emProducao}</p>
          <p className="text-xs text-slate-500">Em Produção</p>
        </div>
        <div className="bg-slate-900/50 border border-blue-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-400">{stats.aguardando}</p>
          <p className="text-xs text-slate-500">Aguardando Carregamento</p>
        </div>
        <div className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-400">{stats.emRota}</p>
          <p className="text-xs text-slate-500">Em Rota</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Buscar por número ou cliente..."
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
            <SelectItem value="em_expedicao">Em Expedição</SelectItem>
            <SelectItem value="pendente">Pendente (antigo)</SelectItem>
            <SelectItem value="em_producao">Em Produção</SelectItem>
            <SelectItem value="aguardando_carregamento">Aguardando Carregamento</SelectItem>
            <SelectItem value="carregando">Carregando</SelectItem>
            <SelectItem value="em_rota">Em Rota</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-full lg:w-48 bg-slate-900/50 border-slate-700 text-white h-12">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Tipos</SelectItem>
            <SelectItem value="entrega">Entrega</SelectItem>
            <SelectItem value="retirada_balcao">Retirada Balcão</SelectItem>
            <SelectItem value="retirada_terceiro">Retirada Terceiro</SelectItem>
            <SelectItem value="transferencia">Transferência</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Notas */}
      <div className="space-y-3">
        {filteredNotas.map(nota => (
          <div 
            key={nota.id}
            className={cn(
              "bg-slate-900/50 border rounded-xl p-4 lg:p-5 transition-all hover:border-slate-700",
              nota.prioridade === 'urgente' ? "border-red-500/30" : "border-slate-800"
            )}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-white text-lg">#{nota.numero}</h3>
                  <span className={cn("text-xs px-2 py-1 rounded-full border", statusColors[nota.status])}>
                    {nota.status?.replace('_', ' ')}
                  </span>
                  {nota.prioridade === 'urgente' && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                      URGENTE
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {nota.cliente}
                  </span>
                  <span>{tipoLabels[nota.tipo]}</span>
                  {nota.cidade && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {nota.cidade}
                    </span>
                  )}
                  {nota.data_prevista && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(nota.data_prevista), 'dd/MM')}
                    </span>
                  )}
                  {nota.frente_destino_nome && (
                    <span className="text-xs px-2 py-1 rounded bg-slate-800">
                      Frente: {nota.frente_destino_nome}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingNota(nota); setDialogOpen(true); }}>
                      <Edit2 className="w-4 h-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-400"
                      onClick={() => deleteNotaMutation.mutate(nota.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}

        {filteredNotas.length === 0 && (
          <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">Nenhuma nota encontrada</p>
          </div>
        )}
      </div>

      {/* Dialog */}
      <NotaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nota={editingNota}
        frentes={frentes}
        onSave={handleSave}
        isLoading={createNotaMutation.isPending || updateNotaMutation.isPending}
      />
      </div>
    </>
  );
}

function NotaDialog({ open, onOpenChange, nota, frentes, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    numero: '',
    cliente: '',
    tipo: 'entrega',
    status: 'em_expedicao',
    prioridade: 'normal',
    frente_destino_id: '',
    frente_destino_nome: '',
    endereco_entrega: '',
    cidade: '',
    observacoes: '',
    data_prevista: '',
  });

  React.useEffect(() => {
    if (nota) {
      setFormData({
        numero: nota.numero || '',
        cliente: nota.cliente || '',
        tipo: nota.tipo || 'entrega',
        status: nota.status || 'em_expedicao',
        prioridade: nota.prioridade || 'normal',
        frente_destino_id: nota.frente_destino_id || '',
        frente_destino_nome: nota.frente_destino_nome || '',
        endereco_entrega: nota.endereco_entrega || '',
        cidade: nota.cidade || '',
        observacoes: nota.observacoes || '',
        data_prevista: nota.data_prevista || '',
      });
    } else {
      setFormData({
        numero: '',
        cliente: '',
        tipo: 'entrega',
        status: 'em_expedicao',
        prioridade: 'normal',
        frente_destino_id: '',
        frente_destino_nome: '',
        endereco_entrega: '',
        cidade: '',
        observacoes: '',
        data_prevista: '',
      });
    }
  }, [nota, open]);

  const handleFrenteChange = (frenteId) => {
    const frente = frentes.find(f => f.id === frenteId);
    setFormData(prev => ({
      ...prev,
      frente_destino_id: frenteId,
      frente_destino_nome: frente?.nome || '',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{nota ? 'Editar Nota' : 'Nova Nota'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Número da Nota *</Label>
              <Input
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                className="bg-slate-800 border-slate-700 mt-1"
                placeholder="Ex: NF-12345"
              />
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={formData.prioridade} onValueChange={(v) => setFormData({ ...formData, prioridade: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Cliente *</Label>
            <Input
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              className="bg-slate-800 border-slate-700 mt-1"
              placeholder="Nome do cliente"
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
                  <SelectItem value="entrega">Entrega</SelectItem>
                  <SelectItem value="retirada_balcao">Retirada Balcão</SelectItem>
                  <SelectItem value="retirada_terceiro">Retirada Terceiro</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
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
                  <SelectItem value="em_expedicao">Em Expedição</SelectItem>
                  <SelectItem value="pendente">Pendente (antigo)</SelectItem>
                  <SelectItem value="em_producao">Em Produção</SelectItem>
                  <SelectItem value="aguardando_carregamento">Aguardando Carregamento</SelectItem>
                  <SelectItem value="carregando">Carregando</SelectItem>
                  <SelectItem value="em_rota">Em Rota</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Frente de Trabalho de Destino</Label>
            <Select value={formData.frente_destino_id} onValueChange={handleFrenteChange}>
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
              <Label>Cidade</Label>
              <Input
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                className="bg-slate-800 border-slate-700 mt-1"
              />
            </div>
            <div>
              <Label>Data Prevista</Label>
              <Input
                type="date"
                value={formData.data_prevista}
                onChange={(e) => setFormData({ ...formData, data_prevista: e.target.value })}
                className="bg-slate-800 border-slate-700 mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Endereço de Entrega</Label>
            <Textarea
              value={formData.endereco_entrega}
              onChange={(e) => setFormData({ ...formData, endereco_entrega: e.target.value })}
              className="bg-slate-800 border-slate-700 mt-1"
              rows={2}
            />
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
            disabled={isLoading || !formData.numero || !formData.cliente}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}




