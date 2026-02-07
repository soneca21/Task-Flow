import React, { useState } from 'react';
import { api } from '@/api/dataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Warehouse, 
  Plus, 
  Edit2, 
  Trash2, 
  MoreVertical,
  Package,
  Wrench,
  Forklift,
  Factory,
  Truck,
  Users,
  GripVertical
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIAS = [
  { value: 'logistica', label: 'Logística / Materiais', icon: Package, color: 'blue' },
  { value: 'apoio_operacional', label: 'Apoio Operacional', icon: Wrench, color: 'slate' },
  { value: 'movimentacao_carga', label: 'Movimentação de Carga', icon: Forklift, color: 'green' },
  { value: 'producao', label: 'Produção - Máquinas e Processos', icon: Factory, color: 'amber' },
  { value: 'rota_entrega', label: 'Veículos no Pátio', icon: Truck, color: 'cyan' },
];

const CORES = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#eab308', label: 'Amarelo' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#06b6d4', label: 'Ciano' },
  { value: '#f97316', label: 'Laranja' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#64748b', label: 'Cinza' },
];

export default function FrentesTrabalho() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFrente, setEditingFrente] = useState(null);

  const { data: frentes = [], isLoading } = useQuery({
    queryKey: ['frentes-trabalho'],
    queryFn: () => api.entities.FrenteTrabalho.list('-categoria,ordem'),
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios-frentes'],
    queryFn: () => api.entities.Funcionario.filter({ ativo: true }),
  });

  const { data: veiculosPatio = [] } = useQuery({
    queryKey: ['veiculos-patio-frentes'],
    queryFn: () => api.entities.Veiculo.filter({ status: { $in: ['no_patio', 'carregando'] } }),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const frente = await api.entities.FrenteTrabalho.create(data);
      await api.audit.log({
        acao: 'criar',
        entidade: 'FrenteTrabalho',
        entidade_id: frente.id,
        descricao: `Frente de trabalho criada: ${data.nome}`,
      });
      return frente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frentes-trabalho'] });
      queryClient.invalidateQueries({ queryKey: ['frentes'] });
      queryClient.invalidateQueries({ queryKey: ['frentes-tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['frentes-producao'] });
      queryClient.invalidateQueries({ queryKey: ['frentes-expedicao'] });
      setDialogOpen(false);
      setEditingFrente(null);
      toast.success('Frente de trabalho criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar frente de trabalho');
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const frente = await api.entities.FrenteTrabalho.update(id, data);
      await api.audit.log({
        acao: 'editar',
        entidade: 'FrenteTrabalho',
        entidade_id: id,
        descricao: `Frente de trabalho atualizada: ${data.nome}`,
      });
      return frente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frentes-trabalho'] });
      queryClient.invalidateQueries({ queryKey: ['frentes'] });
      queryClient.invalidateQueries({ queryKey: ['frentes-tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['frentes-producao'] });
      queryClient.invalidateQueries({ queryKey: ['frentes-expedicao'] });
      setDialogOpen(false);
      setEditingFrente(null);
      toast.success('Frente de trabalho atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar frente de trabalho');
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const frente = frentes.find(f => f.id === id);
      await api.entities.FrenteTrabalho.delete(id);
      await api.audit.log({
        acao: 'excluir',
        entidade: 'FrenteTrabalho',
        entidade_id: id,
        descricao: `Frente de trabalho excluída: ${frente?.nome}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frentes-trabalho'] });
      queryClient.invalidateQueries({ queryKey: ['frentes'] });
      toast.success('Frente de trabalho excluída');
    },
    onError: (error) => {
      toast.error('Erro ao excluir frente de trabalho');
      console.error(error);
    },
  });

  const handleSave = (formData) => {
    if (editingFrente) {
      updateMutation.mutate({ id: editingFrente.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getFuncionariosByFrente = (frenteId) => {
    return funcionarios.filter(f => f.frentes_trabalho?.includes(frenteId));
  };

  const groupedFrentes = CATEGORIAS.map(cat => ({
    ...cat,
    frentes: frentes.filter(f => f.categoria === cat.value && f.ativo !== false),
    extraCount: cat.value === 'rota_entrega' ? veiculosPatio.length : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Frentes de Trabalho"
        icon={Warehouse}
        iconColor="text-lime-500"
        actions={
          <Button 
            onClick={() => { setEditingFrente(null); setDialogOpen(true); }}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold touch-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Frente
          </Button>
        }
      />
      <p className="text-muted-foreground -mt-2 text-center">Aguardando atendimento</p>

      {/* Frentes por Categoria */}
      <div className="space-y-6">
        {groupedFrentes.map(categoria => (
          <div key={categoria.value} className="space-y-4">
            <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  categoria.color === 'blue' && "bg-blue-500/20",
                  categoria.color === 'slate' && "bg-muted/50",
                  categoria.color === 'green' && "bg-green-500/20",
                  categoria.color === 'amber' && "bg-amber-500/20",
                  categoria.color === 'cyan' && "bg-cyan-500/20",
                )}>
                <categoria.icon className={cn(
                  "w-5 h-5",
                  categoria.color === 'blue' && "text-blue-400",
                  categoria.color === 'slate' && "text-muted-foreground",
                  categoria.color === 'green' && "text-green-400",
                  categoria.color === 'amber' && "text-amber-400",
                  categoria.color === 'cyan' && "text-cyan-400",
                )} />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{categoria.label}</h2>
              <Badge variant="secondary" className="bg-card text-muted-foreground">
                {categoria.frentes.length} frentes
                {categoria.extraCount !== null ? ` • ${categoria.extraCount} veículos no pátio` : ''}
              </Badge>
            </div>

            {categoria.frentes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoria.frentes.map(frente => {
                  const funcionariosFrente = getFuncionariosByFrente(frente.id);
                  return (
                    <div 
                      key={frente.id}
                      className="bg-card/60 border border-border rounded-xl p-4 hover:border-border transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: frente.cor || '#3b82f6' }}
                          />
                          <div>
                            <h3 className="font-semibold text-foreground">{frente.nome}</h3>
                            {frente.descricao && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{frente.descricao}</p>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingFrente(frente); setDialogOpen(true); }}>
                              <Edit2 className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-400"
                              onClick={() => deleteMutation.mutate(frente.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{funcionariosFrente.length} funcionários</span>
                        </div>
                        {funcionariosFrente.length > 0 && (
                          <div className="mt-2 flex -space-x-2">
                            {funcionariosFrente.slice(0, 5).map(func => (
                              <div 
                                key={func.id}
                                className="w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center text-xs font-medium text-foreground"
                                title={func.nome}
                              >
                                {func.nome?.[0]?.toUpperCase()}
                              </div>
                            ))}
                            {funcionariosFrente.length > 5 && (
                              <div className="w-8 h-8 rounded-full bg-muted border-2 border-border flex items-center justify-center text-xs font-medium text-foreground">
                                +{funcionariosFrente.length - 5}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-card/40 border border-dashed border-border rounded-xl p-6 text-center">
                <p className="text-muted-foreground text-sm">Nenhuma frente cadastrada nesta categoria</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 text-amber-400"
                  onClick={() => { 
                    setEditingFrente({ categoria: categoria.value }); 
                    setDialogOpen(true); 
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dialog */}
      <FrenteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        frente={editingFrente}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

function FrenteDialog({ open, onOpenChange, frente, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    nome: '',
    categoria: 'producao',
    descricao: '',
    cor: '#3b82f6',
    ativo: true,
    ordem: 0,
  });

  React.useEffect(() => {
    if (frente) {
      setFormData({
        nome: frente.nome || '',
        categoria: frente.categoria || 'producao',
        descricao: frente.descricao || '',
        cor: frente.cor || '#3b82f6',
        ativo: frente.ativo !== false,
        ordem: frente.ordem || 0,
      });
    } else {
      setFormData({
        nome: '',
        categoria: 'producao',
        descricao: '',
        cor: '#3b82f6',
        ativo: true,
        ordem: 0,
      });
    }
  }, [frente, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground overflow-y-auto rounded-lg border shadow-lg p-6 !inset-auto !left-1/2 !top-1/2 !w-[calc(100%-2rem)] !max-w-md !h-auto !max-h-[calc(100svh-2rem)] !-translate-x-1/2 !-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>{frente?.id ? 'Editar Frente' : 'Nova Frente de Trabalho'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Nome da Frente *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="bg-card border-border mt-1"
              placeholder="Ex: Perfiladeira Telha Galvalume"
            />
          </div>

          <div>
            <Label>Categoria *</Label>
            <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
              <SelectTrigger className="bg-card border-border mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="bg-card border-border mt-1"
              placeholder="Descrição opcional da frente de trabalho"
              rows={3}
            />
          </div>

          <div>
            <Label>Cor de Identificação</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CORES.map(cor => (
                <button
                  key={cor.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, cor: cor.value })}
                  className={cn(
                    "w-8 h-8 rounded-lg transition-all",
                    formData.cor === cor.value && "ring-2 ring-white ring-offset-2 ring-offset-slate-900"
                  )}
                  style={{ backgroundColor: cor.value }}
                  title={cor.label}
                />
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
            <Label htmlFor="ativo">Frente Ativa</Label>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
            onClick={() => onSave(formData)}
            disabled={isLoading || !formData.nome}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

