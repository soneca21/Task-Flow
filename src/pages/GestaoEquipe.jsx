import React, { useState } from 'react';
import { api } from '@/api/dataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Home,
  Truck,
  Edit2,
  Trash2,
  MoreVertical,
  Shield,
  UserCheck,
  UserX,
  Phone,
  Link2
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { cn, formatTelefoneBR } from "@/lib/utils";

export default function GestaoEquipe() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterVinculo, setFilterVinculo] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState(null);
  const [dialogMode, setDialogMode] = useState('create');

  const { data: funcionarios = [], isLoading } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => api.entities.Funcionario.list(),
  });

  const { data: frentes = [] } = useQuery({
    queryKey: ['frentes'],
    queryFn: () => api.entities.FrenteTrabalho.filter({ ativo: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Funcionario.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      setDialogOpen(false);
      setEditingFuncionario(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Funcionario.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      setDialogOpen(false);
      setEditingFuncionario(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Funcionario.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['funcionarios'] }),
  });

  const filteredFuncionarios = funcionarios.filter(f => {
    const matchSearch = f.nome?.toLowerCase().includes(search.toLowerCase()) ||
                       f.cargo?.toLowerCase().includes(search.toLowerCase());
    const matchVinculo = filterVinculo === 'todos' || f.vinculo === filterVinculo;
    const matchStatus = filterStatus === 'todos' || f.status === filterStatus;
    return matchSearch && matchVinculo && matchStatus;
  });

  const daCasa = funcionarios.filter(f => f.vinculo === 'da_casa' && f.ativo);
  const terceirizados = funcionarios.filter(f => f.vinculo === 'terceirizado' && f.ativo);

  const cargoOptions = React.useMemo(() => {
    const unique = new Set();
    for (const f of funcionarios) {
      const cargo = String(f.cargo || '').trim();
      if (cargo) unique.add(cargo);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [funcionarios]);

  const handleSave = (formData) => {
    const payload = { ...formData, user_id: formData.user_id || null };
    if (editingFuncionario) {
      updateMutation.mutate({ id: editingFuncionario.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const statusColors = {
    disponivel: 'bg-green-500/20 text-green-400 border-green-500/30',
    ocupado: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    indisponivel: 'bg-red-500/20 text-red-400 border-red-500/30',
    ferias: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    afastado: 'bg-muted/50 text-muted-foreground border-border',
  };

  const nivelColors = {
    colaborador: 'bg-emerald-500/20 text-emerald-400',
    operador: 'bg-muted/50 text-muted-foreground',
    lider: 'bg-blue-500/20 text-blue-400',
    admin: 'bg-purple-500/20 text-purple-400',
  };
  const nivelLabels = {
    colaborador: 'Colaborador',
    operador: 'Operador',
    lider: 'Líder',
    admin: 'Admin',
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gestão de Equipe"
        subtitle={`${funcionarios.filter(f => f.ativo).length} funcionários ativos`}
        icon={Users}
        iconColor="text-orange-500"
        actions={
          <Button 
            onClick={() => { setEditingFuncionario(null); setDialogMode('create'); setDialogOpen(true); }}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold touch-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Funcionário
          </Button>
        }
      />

      {/* Stats Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card/60 border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Home className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{daCasa.length}</p>
              <p className="text-xs text-muted-foreground">Da Casa</p>
            </div>
          </div>
        </div>
        <div className="bg-card/60 border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Truck className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{terceirizados.length}</p>
              <p className="text-xs text-muted-foreground">Terceirizados</p>
            </div>
          </div>
        </div>
        <div className="bg-card/60 border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <UserCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {funcionarios.filter(f => f.status === 'disponivel').length}
              </p>
              <p className="text-xs text-muted-foreground">Disponíveis</p>
            </div>
          </div>
        </div>
        <div className="bg-card/60 border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <UserX className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {funcionarios.filter(f => f.status === 'ocupado').length}
              </p>
              <p className="text-xs text-muted-foreground">Ocupados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/60 border-border text-foreground h-12"
          />
        </div>
        <Select value={filterVinculo} onValueChange={setFilterVinculo}>
          <SelectTrigger className="w-full lg:w-48 bg-card/60 border-border text-foreground h-12">
            <SelectValue placeholder="Vínculo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Vínculos</SelectItem>
            <SelectItem value="da_casa">Da Casa</SelectItem>
            <SelectItem value="terceirizado">Terceirizado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full lg:w-48 bg-card/60 border-border text-foreground h-12">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="disponivel">Disponível</SelectItem>
            <SelectItem value="ocupado">Ocupado</SelectItem>
            <SelectItem value="indisponivel">Indisponível</SelectItem>
            <SelectItem value="ferias">Férias</SelectItem>
            <SelectItem value="afastado">Afastado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredFuncionarios.map(funcionario => (
          <div 
            key={funcionario.id} 
            className={cn(
              "bg-card/60 border rounded-2xl p-5 transition-all hover:border-border",
              funcionario.ativo ? "border-border" : "border-red-900/30 opacity-60"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold",
                  funcionario.vinculo === 'da_casa' 
                    ? "bg-blue-500/20 text-blue-400" 
                    : "bg-orange-500/20 text-orange-400"
                )}>
                  {funcionario.nome?.[0]?.toUpperCase() || 'F'}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{funcionario.nome}</h3>
                  <p className="text-sm text-muted-foreground">{funcionario.cargo}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      funcionario.vinculo === 'da_casa' 
                        ? "bg-blue-500/20 text-blue-400" 
                        : "bg-orange-500/20 text-orange-400"
                    )}>
                      {funcionario.vinculo === 'da_casa' ? 'Da Casa' : 'Terceirizado'}
                    </span>
                    <span className={cn("text-xs px-2 py-1 rounded-full border", statusColors[funcionario.status])}>
                      {funcionario.status}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-300">
                      Score {funcionario.tarefas_concluidas || 0}
                    </span>
                    {funcionario.user_id && (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300">
                        Vinculado
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { navigate(`/perfil-funcionario/${funcionario.id}`); }}>
                    <UserCheck className="w-4 h-4 mr-2" /> Ver Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setEditingFuncionario(funcionario); setDialogMode('edit'); setDialogOpen(true); }}>
                    <Edit2 className="w-4 h-4 mr-2" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-400"
                    onClick={() => deleteMutation.mutate(funcionario.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className={cn("text-xs px-2 py-1 rounded-full", nivelColors[funcionario.nivel_acesso] || nivelColors.colaborador)}>
                  {nivelLabels[funcionario.nivel_acesso] || 'Colaborador'}
                </span>
              </div>
              {funcionario.user_id && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Link2 className="w-3 h-3" />
                  {String(funcionario.user_id).slice(0, 8)}...
                </div>
              )}
              {funcionario.telefone && (
                <a href={`tel:${funcionario.telefone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Phone className="w-3 h-3" />
                  {funcionario.telefone}
                </a>
                )}
              </div>
              {funcionario.frentes_trabalho?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {funcionario.frentes_trabalho.slice(0, 3).map((frenteId, i) => {
                    const frente = frentes.find(f => f.id === frenteId);
                    return frente ? (
                      <span key={i} className="text-xs px-2 py-1 rounded bg-card text-muted-foreground">
                        {frente.nome}
                      </span>
                    ) : null;
                  })}
                  {funcionario.frentes_trabalho.length > 3 && (
                    <span className="text-xs px-2 py-1 rounded bg-card text-muted-foreground">
                      +{funcionario.frentes_trabalho.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredFuncionarios.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum funcionário encontrado</p>
        </div>
      )}

      {/* Dialog */}
      <FuncionarioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        funcionario={editingFuncionario}
        frentes={frentes}
        cargoOptions={cargoOptions}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
        mode={dialogMode}
      />
    </div>
  );
}

function FuncionarioDialog({ open, onOpenChange, funcionario, frentes, cargoOptions, onSave, isLoading, mode = 'create' }) {
  const isView = mode === 'view';
  const [formData, setFormData] = useState({
    user_id: '',
    nome: '',
    vinculo: 'da_casa',
    cargo: '',
    nivel_acesso: 'colaborador',
    frentes_trabalho: [],
    status: 'disponivel',
    capacidade_tarefas: 1,
    telefone: '',
    data_nascimento: '',
    ativo: true,
  });

  React.useEffect(() => {
    if (funcionario) {
      setFormData({
        user_id: funcionario.user_id || '',
        nome: funcionario.nome || '',
        vinculo: funcionario.vinculo || 'da_casa',
        cargo: funcionario.cargo || '',
        nivel_acesso: funcionario.nivel_acesso || 'colaborador',
        frentes_trabalho: funcionario.frentes_trabalho || [],
        status: funcionario.status || 'disponivel',
        capacidade_tarefas: funcionario.capacidade_tarefas || 1,
        telefone: funcionario.telefone || '',
        data_nascimento: funcionario.data_nascimento || '',
        ativo: funcionario.ativo !== false,
      });
    } else {
      setFormData({
        user_id: '',
        nome: '',
        vinculo: 'da_casa',
        cargo: '',
        nivel_acesso: 'colaborador',
        frentes_trabalho: [],
        status: 'disponivel',
        capacidade_tarefas: 1,
        telefone: '',
        data_nascimento: '',
        ativo: true,
      });
    }
  }, [funcionario, open]);

  const toggleFrente = (frenteId) => {
    setFormData(prev => ({
      ...prev,
      frentes_trabalho: prev.frentes_trabalho.includes(frenteId)
        ? prev.frentes_trabalho.filter(id => id !== frenteId)
        : [...prev.frentes_trabalho, frenteId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isView ? 'Perfil do Funcionário' : (funcionario ? 'Editar Funcionário' : 'Novo Funcionário')}</DialogTitle>
        </DialogHeader>

        <fieldset disabled={isView} className="space-y-4 py-4">
          <div>
            <Label>ID do Usuário (Supabase)</Label>
            <Input
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              className="bg-card border-border mt-1"
              placeholder="Cole o auth.uid do usuário"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use para vincular a conta do colaborador ao cadastro.
            </p>
          </div>
          <div>
            <Label>Nome Completo *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="bg-card border-border mt-1"
              placeholder="Nome do funcionário"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vínculo *</Label>
              <Select value={formData.vinculo} onValueChange={(v) => setFormData({ ...formData, vinculo: v })}>
                <SelectTrigger className="bg-card border-border mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="da_casa">Da Casa</SelectItem>
                  <SelectItem value="terceirizado">Terceirizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nível de Acesso *</Label>
              <Select value={formData.nivel_acesso} onValueChange={(v) => setFormData({ ...formData, nivel_acesso: v })}>
                <SelectTrigger className="bg-card border-border mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="lider">Líder</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Cargo/Função *</Label>
            <Input
              list="cargo-funcionario-options"
              value={formData.cargo}
              onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
              className="bg-card border-border mt-1"
              placeholder="Ex: Operador de Perfiladeira"
            />
            <datalist id="cargo-funcionario-options">
              {(cargoOptions || []).map((cargo) => (
                <option key={cargo} value={cargo} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="bg-card border-border mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="ocupado">Ocupado</SelectItem>
                  <SelectItem value="indisponivel">Indisponível</SelectItem>
                  <SelectItem value="ferias">Férias</SelectItem>
                  <SelectItem value="afastado">Afastado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Capacidade de Tarefas</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={formData.capacidade_tarefas}
                onChange={(e) => setFormData({ ...formData, capacidade_tarefas: parseInt(e.target.value) || 1 })}
                className="bg-card border-border mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Telefone</Label>
            <Input
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: formatTelefoneBR(e.target.value) })}
              className="bg-card border-border mt-1"
              placeholder="(00) 00000-0000"
              inputMode="numeric"
              autoComplete="tel"
            />
          </div>

          <div>
            <Label>Data de Nascimento</Label>
            <Input
              type="date"
              value={formData.data_nascimento || ''}
              onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
              className="bg-card border-border mt-1"
            />
          </div>

          <div>
            <Label>Frentes de Trabalho</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {frentes.map(frente => (
                <button
                  key={frente.id}
                  type="button"
                  onClick={() => toggleFrente(frente.id)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm transition-all",
                    formData.frentes_trabalho.includes(frente.id)
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-card text-muted-foreground border border-border hover:border-border"
                  )}
                >
                  {frente.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="rounded border-border"
            />
            <Label htmlFor="ativo">Funcionário Ativo</Label>
          </div>
        </fieldset>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            {isView ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isView && (
            <Button 
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => onSave(formData)}
              disabled={isLoading || !formData.nome || !formData.cargo}
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


