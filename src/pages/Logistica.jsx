import React, { useEffect, useState } from 'react';
import { api } from '@/api/dataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Plus,
  Search,
  Car,
  Forklift,
  Edit2,
  Trash2,
  MoreVertical,
  Gauge,
  Megaphone,
  MapPin,
  Wrench
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
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

const PATIO_STATUS = new Set(['no_patio', 'carregando']);

const isPatioStatus = (status) => PATIO_STATUS.has(status);

const statusLabels = {
  disponivel: 'Disponível',
  em_rota: 'Em rota',
  em_manutencao: 'Em manutenção',
  no_patio: 'No pátio',
  carregando: 'Em atendimento',
};

export default function Logistica() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('patio');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('default');
  const [editingVeiculo, setEditingVeiculo] = useState(null);

  const { data: veiculos = [] } = useQuery({
    queryKey: ['veiculos'],
    queryFn: () => api.entities.Veiculo.list(),
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios-logistica'],
    queryFn: () => api.entities.Funcionario.filter({ ativo: true }),
  });

  const announceVeiculo = async (veiculo, acao = 'veiculo_no_patio') => {
    if (!veiculo || !isPatioStatus(veiculo.status)) return;
    const placa = veiculo.placa || 'Veículo';
    const statusLabel = veiculo.status === 'carregando'
      ? 'em atendimento'
      : 'aguardando atendimento';
    const descricao = `${placa} ${statusLabel} no pátio.`;

    try {
      await api.audit.log({
        acao,
        entidade: 'Veiculo',
        entidade_id: veiculo.id,
        descricao,
      });
    } catch {
      // Best-effort
    }

    toast.info(`Veículo no pátio: ${placa}`);
  };

  const handleDialogChange = (open) => {
    setDialogOpen(open);
    if (!open) {
      setEditingVeiculo(null);
      setDialogMode('default');
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Veiculo.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      handleDialogChange(false);
      announceVeiculo(data, 'veiculo_chegada');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Veiculo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      handleDialogChange(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Veiculo.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['veiculos'] }),
  });

  const handleSave = (formData) => {
    const payload = {
      ...formData,
      status: dialogMode === 'arrival' && !editingVeiculo ? 'no_patio' : formData.status,
    };

    if (editingVeiculo) {
      updateMutation.mutate({ id: editingVeiculo.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleRegisterArrival = async (veiculo) => {
    try {
      const updated = await api.entities.Veiculo.update(veiculo.id, { status: 'no_patio' });
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      await announceVeiculo(updated, 'veiculo_chegada');
      toast.success('Chegada registrada.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao registrar chegada.');
    }
  };

  const handleAnnounce = async (veiculo) => {
    await announceVeiculo(veiculo, 'veiculo_anunciado');
  };

  const filteredVeiculos = veiculos.filter((v) => {
    const matchSearch = v.placa?.toLowerCase().includes(search.toLowerCase()) ||
      v.modelo?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos'
      ? true
      : filterStatus === 'patio'
        ? isPatioStatus(v.status)
        : v.status === filterStatus;
    const matchTipo = filterTipo === 'todos' || v.tipo === filterTipo;
    return matchSearch && matchStatus && matchTipo;
  });

  const statusColors = {
    disponivel: 'bg-green-500/20 text-green-400 border-green-500/30',
    em_rota: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    em_manutencao: 'bg-red-500/20 text-red-400 border-red-500/30',
    no_patio: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    carregando: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  };

  const tipoIcons = {
    caminhao_proprio: Truck,
    caminhao_terceiro: Truck,
    carro: Car,
    moto: Car,
    empilhadeira: Forklift,
    outro: Truck,
  };

  const stats = {
    total: veiculos.filter((v) => v.ativo).length,
    aguardando: veiculos.filter((v) => v.status === 'no_patio' && v.ativo).length,
    emAtendimento: veiculos.filter((v) => v.status === 'carregando' && v.ativo).length,
    emRota: veiculos.filter((v) => v.status === 'em_rota' && v.ativo).length,
  };

  const patioTotal = stats.aguardando + stats.emAtendimento;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Veículos no Pátio"
        subtitle={`${patioTotal} veículos aguardando atendimento`}
        icon={Truck}
        iconColor="text-green-500"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => { setDialogMode('arrival'); setEditingVeiculo(null); setDialogOpen(true); }}
              className="border-border text-foreground hover:bg-card"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Registrar Chegada
            </Button>
            <Button
              onClick={() => { setDialogMode('default'); setEditingVeiculo(null); setDialogOpen(true); }}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold touch-btn"
            >
              <Plus className="w-5 h-5 mr-2" />
              Cadastrar Veículo
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 perfil-stats-grid">
        <div className="bg-card/60 border border-border rounded-xl p-4 perfil-stats-card">
          <p className="text-2xl font-bold text-foreground perfil-stats-value">{stats.total}</p>
          <p className="text-xs text-muted-foreground perfil-stats-label">Total de Veículos</p>
        </div>
        <div className="bg-card/60 border border-amber-500/30 rounded-xl p-4 perfil-stats-card">
          <p className="text-2xl font-bold text-amber-400 perfil-stats-value">{stats.aguardando}</p>
          <p className="text-xs text-muted-foreground perfil-stats-label">Aguardando</p>
        </div>
        <div className="bg-card/60 border border-cyan-500/30 rounded-xl p-4 perfil-stats-card">
          <p className="text-2xl font-bold text-cyan-400 perfil-stats-value">{stats.emAtendimento}</p>
          <p className="text-xs text-muted-foreground perfil-stats-label">Em Atendimento</p>
        </div>
        <div className="bg-card/60 border border-blue-500/30 rounded-xl p-4 perfil-stats-card">
          <p className="text-2xl font-bold text-blue-400 perfil-stats-value">{stats.emRota}</p>
          <p className="text-xs text-muted-foreground perfil-stats-label">Em Rota</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-row lg:gap-4">
          <div className="relative col-span-2 lg:col-span-1 lg:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa ou modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/60 border-border text-foreground h-12"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full lg:w-56 bg-card/60 border-border text-foreground h-9 text-xs lg:h-12 lg:text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="patio">No Pátio (Aguardando)</SelectItem>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="disponivel">Disponível</SelectItem>
              <SelectItem value="em_rota">Em Rota</SelectItem>
              <SelectItem value="no_patio">No Pátio</SelectItem>
              <SelectItem value="carregando">Em Atendimento</SelectItem>
              <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="h-9 text-xs lg:hidden"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
          >
            {showAdvancedFilters ? 'Ocultar filtros' : 'Filtros avancados'}
            {filterTipo !== 'todos' ? ' (ativos)' : ''}
          </Button>
        </div>

        <div className="hidden lg:block">
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-full lg:w-56 bg-card/60 border-border text-foreground h-12">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="caminhao_proprio">Caminhão Próprio</SelectItem>
              <SelectItem value="caminhao_terceiro">Caminhão Terceiro</SelectItem>
              <SelectItem value="carro">Carro</SelectItem>
              <SelectItem value="moto">Moto</SelectItem>
              <SelectItem value="empilhadeira">Empilhadeira</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showAdvancedFilters && (
          <div className="lg:hidden">
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full bg-card/60 border-border text-foreground h-12">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="caminhao_proprio">Caminhão Próprio</SelectItem>
                <SelectItem value="caminhao_terceiro">Caminhão Terceiro</SelectItem>
                <SelectItem value="carro">Carro</SelectItem>
                <SelectItem value="moto">Moto</SelectItem>
                <SelectItem value="empilhadeira">Empilhadeira</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredVeiculos.map((veiculo) => {
          const Icon = tipoIcons[veiculo.tipo] || Truck;
          const motorista = funcionarios.find((f) => f.id === veiculo.motorista_fixo_id);

          return (
            <div
              key={veiculo.id}
              className={cn(
                "bg-card/60 border rounded-xl p-4 transition-all hover:border-border",
                veiculo.ativo ? "border-border" : "border-red-900/30 opacity-60"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-3 rounded-xl",
                      veiculo.tipo?.includes('terceiro') ? "bg-orange-500/20" : "bg-blue-500/20"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-6 h-6",
                        veiculo.tipo?.includes('terceiro') ? "text-orange-400" : "text-blue-400"
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{veiculo.placa}</h3>
                    <p className="text-sm text-muted-foreground">{veiculo.modelo}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!isPatioStatus(veiculo.status) && (
                      <DropdownMenuItem onClick={() => handleRegisterArrival(veiculo)}>
                        <MapPin className="w-4 h-4 mr-2" /> Registrar Chegada
                      </DropdownMenuItem>
                    )}
                    {isPatioStatus(veiculo.status) && (
                      <DropdownMenuItem onClick={() => handleAnnounce(veiculo)}>
                        <Megaphone className="w-4 h-4 mr-2" /> Anunciar no Pátio
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => { setEditingVeiculo(veiculo); setDialogMode('edit'); setDialogOpen(true); }}>
                      <Edit2 className="w-4 h-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-400"
                      onClick={() => deleteMutation.mutate(veiculo.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4">
                <span className={cn("text-xs px-2 py-1 rounded-full border", statusColors[veiculo.status])}>
                  {statusLabels[veiculo.status] || veiculo.status}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-border space-y-2">
                {veiculo.km_atual && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Gauge className="w-4 h-4" />
                    <span>{veiculo.km_atual.toLocaleString()} km</span>
                  </div>
                )}
                {veiculo.capacidade_kg && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-xs">Capacidade: {veiculo.capacidade_kg.toLocaleString()} kg</span>
                  </div>
                )}
                {motorista && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-xs">Motorista: {motorista.nome}</span>
                  </div>
                )}
                {veiculo.status === 'em_manutencao' && (
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <Wrench className="w-4 h-4" /> Em manutenção
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredVeiculos.length === 0 && (
        <div className="text-center py-12 bg-card/40 border border-dashed border-border rounded-xl">
          <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum veículo aguardando atendimento</p>
        </div>
      )}

      <VeiculoDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        mode={dialogMode}
        veiculo={editingVeiculo}
        funcionarios={funcionarios}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

function VeiculoDialog({ open, onOpenChange, mode, veiculo, funcionarios, onSave, isLoading }) {
  const isArrival = mode === 'arrival' && !veiculo;
  const [formData, setFormData] = useState({
    placa: '',
    modelo: '',
    tipo: 'caminhao_proprio',
    status: 'disponivel',
    capacidade_kg: '',
    km_atual: '',
    motorista_fixo_id: '',
    ativo: true,
  });

  useEffect(() => {
    if (veiculo) {
      setFormData({
        placa: veiculo.placa || '',
        modelo: veiculo.modelo || '',
        tipo: veiculo.tipo || 'caminhao_proprio',
        status: veiculo.status || 'disponivel',
        capacidade_kg: veiculo.capacidade_kg || '',
        km_atual: veiculo.km_atual || '',
        motorista_fixo_id: veiculo.motorista_fixo_id || '',
        ativo: veiculo.ativo !== false,
      });
      return;
    }

    setFormData({
      placa: '',
      modelo: '',
      tipo: 'caminhao_proprio',
      status: isArrival ? 'no_patio' : 'disponivel',
      capacidade_kg: '',
      km_atual: '',
      motorista_fixo_id: '',
      ativo: true,
    });
  }, [veiculo, open, isArrival]);

  const dialogTitle = veiculo
    ? 'Editar Veículo'
    : isArrival
      ? 'Registrar Chegada'
      : 'Cadastrar Veículo';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground overflow-y-auto rounded-lg border shadow-lg p-6 !inset-auto !left-1/2 !top-1/2 !w-[calc(100%-2rem)] !max-w-md !h-auto !max-h-[calc(100svh-2rem)] !-translate-x-1/2 !-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Placa *</Label>
              <Input
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                className="bg-card border-border mt-1"
                placeholder="ABC-1234"
              />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                className="bg-card border-border mt-1"
                placeholder="Ex: VW Constellation"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger className="bg-card border-border mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caminhao_proprio">Caminhão Próprio</SelectItem>
                  <SelectItem value="caminhao_terceiro">Caminhão Terceiro</SelectItem>
                  <SelectItem value="carro">Carro</SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                  <SelectItem value="empilhadeira">Empilhadeira</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
                disabled={isArrival}
              >
                <SelectTrigger className="bg-card border-border mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="em_rota">Em Rota</SelectItem>
                  <SelectItem value="no_patio">No Pátio</SelectItem>
                  <SelectItem value="carregando">Em Atendimento</SelectItem>
                  <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Capacidade (kg)</Label>
              <Input
                type="number"
                value={formData.capacidade_kg}
                onChange={(e) => setFormData({ ...formData, capacidade_kg: parseInt(e.target.value, 10) || '' })}
                className="bg-card border-border mt-1"
              />
            </div>
            <div>
              <Label>Km Atual</Label>
              <Input
                type="number"
                value={formData.km_atual}
                onChange={(e) => setFormData({ ...formData, km_atual: parseInt(e.target.value, 10) || '' })}
                className="bg-card border-border mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Motorista Fixo</Label>
            <Select
              value={formData.motorista_fixo_id || 'sem_motorista'}
              onValueChange={(v) => setFormData({ ...formData, motorista_fixo_id: v === 'sem_motorista' ? '' : v })}
            >
              <SelectTrigger className="bg-card border-border mt-1">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sem_motorista">Nenhum</SelectItem>
                {funcionarios.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="rounded border-border"
            />
            <Label htmlFor="ativo">Veículo Ativo</Label>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
            onClick={() => onSave(formData)}
            disabled={isLoading || !formData.placa}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
