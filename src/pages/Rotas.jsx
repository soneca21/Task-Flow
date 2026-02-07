import React, { useMemo, useState } from 'react';
import { api } from '@/api/dataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Plus,
  Search,
  Calendar,
  Truck,
  User,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  MoreVertical,
  AlertTriangle
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { Switch } from '@/components/ui/switch';
import {
  AGENDAMENTO_STATUS,
  AGENDAMENTO_TIPO,
  dispararAgendamento,
  formatAgendamentoLabel,
  isAgendamentoVencido,
} from '@/lib/agendamentoVeiculos';

const STATUS_LABELS = {
  [AGENDAMENTO_STATUS.AGENDADO]: 'Agendado',
  [AGENDAMENTO_STATUS.EM_ATENDIMENTO]: 'Em atendimento',
  [AGENDAMENTO_STATUS.CONCLUIDO]: 'Concluído',
  [AGENDAMENTO_STATUS.CANCELADO]: 'Cancelado',
};

const STATUS_COLORS = {
  [AGENDAMENTO_STATUS.AGENDADO]: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  [AGENDAMENTO_STATUS.EM_ATENDIMENTO]: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  [AGENDAMENTO_STATUS.CONCLUIDO]: 'bg-green-500/20 text-green-400 border-green-500/30',
  [AGENDAMENTO_STATUS.CANCELADO]: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const TIPO_LABELS = {
  [AGENDAMENTO_TIPO.CARGA]: 'Carga',
  [AGENDAMENTO_TIPO.DESCARGA]: 'Descarga',
  [AGENDAMENTO_TIPO.RETIRADA]: 'Retirada',
  [AGENDAMENTO_TIPO.TROCA]: 'Troca',
  [AGENDAMENTO_TIPO.DEVOLUCAO]: 'Devolução',
};

export default function Rotas() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const role = user?.user_metadata?.role || '';
  const isManager = role === 'admin' || role === 'lider';
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterData, setFilterData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState(null);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos', filterData],
    queryFn: () => api.entities.AgendamentoVeiculo.filter({ data: filterData }, '-created_date'),
  });

  const { data: veiculos = [] } = useQuery({
    queryKey: ['veiculos-agendamento'],
    queryFn: () => api.entities.Veiculo.filter({ ativo: true }),
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios-agendamento'],
    queryFn: () => api.entities.Funcionario.filter({ ativo: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.AgendamentoVeiculo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      setDialogOpen(false);
      setEditingAgendamento(null);
      toast.success('Agendamento criado.');
    },
    onError: () => toast.error('Erro ao criar agendamento.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.AgendamentoVeiculo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      setDialogOpen(false);
      setEditingAgendamento(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.AgendamentoVeiculo.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agendamentos'] }),
  });

  const handleSave = (formData) => {
    if (!isManager) {
      toast.error('Apenas líder/admin pode criar ou editar agendamentos.');
      return;
    }
    if (!formData.data || !formData.hora) {
      toast.error('Informe data e horário.');
      return;
    }
    if (!formData.tipo) {
      toast.error('Selecione o tipo de atendimento.');
      return;
    }
    if (!formData.veiculo_id || formData.veiculo_id === 'sem_veiculo') {
      toast.error('Selecione o veículo.');
      return;
    }
    if (!formData.motorista_id || formData.motorista_id === 'sem_motorista') {
      toast.error('Selecione o motorista.');
      return;
    }
    if (formData.necessita_movimentacao && (!formData.equipamento_preferido || formData.equipamento_preferido === 'nenhum')) {
      toast.error('Selecione o equipamento preferido para movimentação.');
      return;
    }

    if (editingAgendamento) {
      if (editingAgendamento.status === AGENDAMENTO_STATUS.EM_ATENDIMENTO) {
        toast.error('Não é possível editar um agendamento em atendimento.');
        return;
      }
      updateMutation.mutate({ id: editingAgendamento.id, data: formData });
    } else {
      createMutation.mutate({
        ...formData,
        status: formData.status || AGENDAMENTO_STATUS.AGENDADO,
      });
    }
  };

  const handleDisparar = async (agendamento) => {
    if (!isManager) {
      toast.error('Apenas líder/admin pode liberar o atendimento.');
      return;
    }
    try {
      await dispararAgendamento({
        agendamento,
        api,
        queryClient,
        notify: (message) => toast.info(message),
      });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao disparar agendamento.');
    }
  };

  const handleConcluir = async (agendamento) => {
    if (!isManager) {
      toast.error('Apenas líder/admin pode concluir o atendimento.');
      return;
    }
    try {
      await api.entities.AgendamentoVeiculo.update(agendamento.id, {
        status: AGENDAMENTO_STATUS.CONCLUIDO,
      });
      if (agendamento.veiculo_id) {
        await api.entities.Veiculo.update(agendamento.veiculo_id, { status: 'disponivel' });
      }
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      toast.success('Agendamento concluído.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao concluir agendamento.');
    }
  };

  const handleCancel = async (agendamento) => {
    if (!isManager) {
      toast.error('Apenas líder/admin pode cancelar agendamentos.');
      return;
    }
    try {
      await api.entities.AgendamentoVeiculo.update(agendamento.id, {
        status: AGENDAMENTO_STATUS.CANCELADO,
      });
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast.success('Agendamento cancelado.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao cancelar agendamento.');
    }
  };

  const filteredAgendamentos = useMemo(() => {
    return agendamentos.filter((a) => {
      const matchSearch = a.veiculo_placa?.toLowerCase().includes(search.toLowerCase()) ||
        a.motorista_nome?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'todos' || a.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [agendamentos, filterStatus, search]);

  const stats = {
    total: agendamentos.length,
    agendados: agendamentos.filter((a) => a.status === AGENDAMENTO_STATUS.AGENDADO).length,
    emAtendimento: agendamentos.filter((a) => a.status === AGENDAMENTO_STATUS.EM_ATENDIMENTO).length,
    concluidos: agendamentos.filter((a) => a.status === AGENDAMENTO_STATUS.CONCLUIDO).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agendamentos"
        subtitle={`${agendamentos.length} agendamentos para ${format(new Date(filterData), "dd 'de' MMMM", { locale: ptBR })}`}
        icon={CalendarClock}
        iconColor="text-cyan-500"
        actions={
          <Button
            onClick={() => { setEditingAgendamento(null); setDialogOpen(true); }}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold touch-btn"
            disabled={!isManager}
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Agendamento
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 perfil-stats-grid">
        <div className="bg-card/60 border border-border rounded-xl p-4 perfil-stats-card">
          <p className="text-2xl font-bold text-foreground perfil-stats-value">{stats.total}</p>
          <p className="text-xs text-muted-foreground perfil-stats-label">Total</p>
        </div>
        <div className="bg-card/60 border border-amber-500/30 rounded-xl p-4 perfil-stats-card">
          <p className="text-2xl font-bold text-amber-400 perfil-stats-value">{stats.agendados}</p>
          <p className="text-xs text-muted-foreground perfil-stats-label">Agendados</p>
        </div>
        <div className="bg-card/60 border border-cyan-500/30 rounded-xl p-4 perfil-stats-card">
          <p className="text-2xl font-bold text-cyan-400 perfil-stats-value">{stats.emAtendimento}</p>
          <p className="text-xs text-muted-foreground perfil-stats-label">Em atendimento</p>
        </div>
        <div className="bg-card/60 border border-green-500/30 rounded-xl p-4 perfil-stats-card">
          <p className="text-2xl font-bold text-green-400 perfil-stats-value">{stats.concluidos}</p>
          <p className="text-xs text-muted-foreground perfil-stats-label">Concluídos</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-row lg:gap-4">
          <div className="relative col-span-2 lg:col-span-1 lg:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa ou motorista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/60 border-border text-foreground h-12"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="date"
              value={filterData}
              onChange={(e) => setFilterData(e.target.value)}
              className="pl-10 bg-card/60 border-border text-foreground h-12 w-full lg:w-48"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 text-xs lg:hidden"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
          >
            {showAdvancedFilters ? 'Ocultar filtros' : 'Filtros avancados'}
            {filterStatus !== 'todos' ? ' (ativos)' : ''}
          </Button>
        </div>

        <div className="hidden lg:block">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full lg:w-52 bg-card/60 border-border text-foreground h-12">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value={AGENDAMENTO_STATUS.AGENDADO}>Agendado</SelectItem>
              <SelectItem value={AGENDAMENTO_STATUS.EM_ATENDIMENTO}>Em atendimento</SelectItem>
              <SelectItem value={AGENDAMENTO_STATUS.CONCLUIDO}>Concluído</SelectItem>
              <SelectItem value={AGENDAMENTO_STATUS.CANCELADO}>Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showAdvancedFilters && (
          <div className="lg:hidden">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full bg-card/60 border-border text-foreground h-12">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value={AGENDAMENTO_STATUS.AGENDADO}>Agendado</SelectItem>
                <SelectItem value={AGENDAMENTO_STATUS.EM_ATENDIMENTO}>Em atendimento</SelectItem>
                <SelectItem value={AGENDAMENTO_STATUS.CONCLUIDO}>Concluído</SelectItem>
                <SelectItem value={AGENDAMENTO_STATUS.CANCELADO}>Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {filteredAgendamentos.map((agendamento) => {
          const vencido = agendamento.status === AGENDAMENTO_STATUS.AGENDADO && isAgendamentoVencido(agendamento);

          return (
            <div
              key={agendamento.id}
              className="bg-card/60 border border-border rounded-xl p-5 transition-all hover:border-border"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-foreground text-xl">{formatAgendamentoLabel(agendamento)}</h3>
                    <span className={cn('text-xs px-2 py-1 rounded-full border', STATUS_COLORS[agendamento.status])}>
                      {STATUS_LABELS[agendamento.status] || agendamento.status}
                    </span>
                    {vencido && (
                      <span className="text-xs px-2 py-1 rounded-full border border-red-500/40 text-red-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Atrasado
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {agendamento.hora || '--:--'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      {agendamento.veiculo_placa || 'Veículo não informado'}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {agendamento.motorista_nome || 'Motorista não informado'}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-card border border-border">
                      {TIPO_LABELS[agendamento.tipo] || 'Operação'}
                    </span>
                  </div>
                  {agendamento.observacoes && (
                    <p className="mt-3 text-sm text-muted-foreground">{agendamento.observacoes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {agendamento.status === AGENDAMENTO_STATUS.AGENDADO && (
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-black touch-btn"
                      onClick={() => handleDisparar(agendamento)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Disparar agora
                    </Button>
                  )}
                  {agendamento.status === AGENDAMENTO_STATUS.EM_ATENDIMENTO && (
                    <Button
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 touch-btn"
                      onClick={() => handleConcluir(agendamento)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Concluir
                    </Button>
                  )}
                  {agendamento.status === AGENDAMENTO_STATUS.AGENDADO && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-foreground"
                      onClick={() => handleCancel(agendamento)}
                      disabled={!isManager}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={!isManager || agendamento.status === AGENDAMENTO_STATUS.EM_ATENDIMENTO}
                        onClick={() => {
                          if (!isManager || agendamento.status === AGENDAMENTO_STATUS.EM_ATENDIMENTO) return;
                          setEditingAgendamento(agendamento);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400"
                        disabled={!isManager}
                        onClick={() => {
                          if (!isManager) return;
                          deleteMutation.mutate(agendamento.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAgendamentos.length === 0 && (
          <div className="text-center py-12 bg-card/40 border border-dashed border-border rounded-xl">
            <CalendarClock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum agendamento encontrado para esta data</p>
          </div>
        )}
      </div>

      <AgendamentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agendamento={editingAgendamento}
        veiculos={veiculos}
        funcionarios={funcionarios}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

function AgendamentoDialog({ open, onOpenChange, agendamento, veiculos, funcionarios, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    hora: '08:00',
    tipo: AGENDAMENTO_TIPO.CARGA,
    veiculo_id: '',
    veiculo_placa: '',
    motorista_id: '',
    motorista_nome: '',
    necessita_movimentacao: false,
    equipamento_preferido: 'nenhum',
    status: AGENDAMENTO_STATUS.AGENDADO,
    observacoes: '',
  });

  React.useEffect(() => {
    if (agendamento) {
      setFormData({
        data: agendamento.data || format(new Date(), 'yyyy-MM-dd'),
        hora: agendamento.hora || '08:00',
        tipo: agendamento.tipo || AGENDAMENTO_TIPO.CARGA,
        veiculo_id: agendamento.veiculo_id || '',
        veiculo_placa: agendamento.veiculo_placa || '',
        motorista_id: agendamento.motorista_id || '',
        motorista_nome: agendamento.motorista_nome || '',
        necessita_movimentacao: !!agendamento.necessita_movimentacao,
        equipamento_preferido: agendamento.equipamento_preferido || 'nenhum',
        status: agendamento.status || AGENDAMENTO_STATUS.AGENDADO,
        observacoes: agendamento.observacoes || '',
      });
      return;
    }

    setFormData({
      data: format(new Date(), 'yyyy-MM-dd'),
      hora: '08:00',
      tipo: AGENDAMENTO_TIPO.CARGA,
      veiculo_id: '',
      veiculo_placa: '',
      motorista_id: '',
      motorista_nome: '',
      necessita_movimentacao: false,
      equipamento_preferido: 'nenhum',
      status: AGENDAMENTO_STATUS.AGENDADO,
      observacoes: '',
    });
  }, [agendamento, open]);

  const handleMotoristaChange = (id) => {
    if (id === 'sem_motorista') {
      setFormData((prev) => ({ ...prev, motorista_id: '', motorista_nome: '' }));
      return;
    }
    const func = funcionarios.find((f) => f.id === id);
    setFormData((prev) => ({ ...prev, motorista_id: id, motorista_nome: func?.nome || '' }));
  };

  const handleVeiculoChange = (id) => {
    if (id === 'sem_veiculo') {
      setFormData((prev) => ({ ...prev, veiculo_id: '', veiculo_placa: '' }));
      return;
    }
    const v = veiculos.find((veiculo) => veiculo.id === id);
    setFormData((prev) => ({ ...prev, veiculo_id: id, veiculo_placa: v?.placa || '' }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agendamento ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="bg-card border-border mt-1"
              />
            </div>
            <div>
              <Label>Horário *</Label>
              <Input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                className="bg-card border-border mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Tipo de Operação *</Label>
            <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
              <SelectTrigger className="bg-card border-border mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AGENDAMENTO_TIPO.CARGA}>Carga</SelectItem>
                <SelectItem value={AGENDAMENTO_TIPO.DESCARGA}>Descarga</SelectItem>
                <SelectItem value={AGENDAMENTO_TIPO.RETIRADA}>Retirada</SelectItem>
                <SelectItem value={AGENDAMENTO_TIPO.TROCA}>Troca</SelectItem>
                <SelectItem value={AGENDAMENTO_TIPO.DEVOLUCAO}>Devolução</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 bg-card/70 border border-border rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Necessita movimentação?</p>
              <p className="text-xs text-muted-foreground">Defina se precisa de ponte rolante, pórtico ou empilhadeira.</p>
            </div>
            <Switch
              checked={!!formData.necessita_movimentacao}
              onCheckedChange={(v) => setFormData({ ...formData, necessita_movimentacao: !!v, equipamento_preferido: v ? formData.equipamento_preferido : 'nenhum' })}
            />
          </div>

          {formData.necessita_movimentacao && (
            <div>
              <Label>Equipamento Preferido *</Label>
              <Select
                value={formData.equipamento_preferido}
                onValueChange={(v) => setFormData({ ...formData, equipamento_preferido: v })}
              >
                <SelectTrigger className="bg-card border-border mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ponte_rolante">Ponte rolante</SelectItem>
                  <SelectItem value="portico">Pórtico</SelectItem>
                  <SelectItem value="empilhadeira">Empilhadeira</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Veículo</Label>
              <Select value={formData.veiculo_id || 'sem_veiculo'} onValueChange={handleVeiculoChange}>
                <SelectTrigger className="bg-card border-border mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_veiculo">Não informado</SelectItem>
                  {veiculos.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.placa} - {v.modelo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motorista</Label>
              <Select value={formData.motorista_id || 'sem_motorista'} onValueChange={handleMotoristaChange}>
                <SelectTrigger className="bg-card border-border mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_motorista">Não informado</SelectItem>
                  {funcionarios.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger className="bg-card border-border mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AGENDAMENTO_STATUS.AGENDADO}>Agendado</SelectItem>
                <SelectItem value={AGENDAMENTO_STATUS.EM_ATENDIMENTO}>Em atendimento</SelectItem>
                <SelectItem value={AGENDAMENTO_STATUS.CONCLUIDO}>Concluído</SelectItem>
                <SelectItem value={AGENDAMENTO_STATUS.CANCELADO}>Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="bg-card border-border mt-1"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
            onClick={() => onSave(formData)}
            disabled={isLoading}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

