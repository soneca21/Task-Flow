import React, { useState } from 'react';
import { api } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';
import { useFuncionarioAtual } from '@/hooks/useFuncionarioAtual';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SistemaNotificacoes from '../components/notificacoes/SistemaNotificacoes';
import { 
  Factory, 
  Truck, 
  Package, 
  AlertTriangle, 
  Users,
  ClipboardCheck,
} from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import PageHeader from '../components/ui/PageHeader';
import { LayoutDashboard } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { selecionarMelhoresFuncionarios } from '../components/tarefas/AlocacaoInteligente';
import { AUTOMATION_CONFIG } from '@/automation/config';
import SelecionarTemplateDialog from '@/components/tarefas/SelecionarTemplateDialog';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: funcionarioAtual } = useFuncionarioAtual();
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    titulo: '',
    descricao: '',
    tipo: 'producao',
    prioridade: 'media',
    frente_trabalho_id: '',
    frente_trabalho_nome: '',
  });

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas-dashboard'],
    queryFn: () => api.entities.Tarefa.filter({ status: { $nin: ['concluida', 'cancelada'] } }),
  });

  const { data: notas = [] } = useQuery({
    queryKey: ['notas-dashboard'],
    queryFn: () => api.entities.Nota.filter({ status: { $nin: ['entregue', 'retirada', 'cancelada'] } }),
  });

  const { data: pendencias = [] } = useQuery({
    queryKey: ['pendencias-dashboard'],
    queryFn: () => api.entities.Pendencia.filter({ status: { $in: ['aberta', 'em_analise'] } }),
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios-dashboard'],
    queryFn: () => api.entities.Funcionario.filter({ ativo: true }),
  });

  const { data: veiculos = [] } = useQuery({
    queryKey: ['veiculos-dashboard'],
    queryFn: () => api.entities.Veiculo.filter({ ativo: true }),
  });

  const { data: frentes = [] } = useQuery({
    queryKey: ['frentes-dashboard'],
    queryFn: () => api.entities.FrenteTrabalho.filter({ ativo: true }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates-dashboard'],
    queryFn: () => api.entities.TarefaTemplate.filter({ ativo: true }, '-created_date'),
  });

  const tarefasProducao = tarefas.filter(t => t.tipo === 'producao');
  const veiculosPatio = veiculos.filter(v => v.status === 'no_patio' || v.status === 'carregando');
  const notasPendentes = notas.filter(n =>
    n.status === 'em_expedicao' || n.status === 'em_producao' || n.status === 'pendente'
  );
  const pendenciasCriticas = pendencias.filter(p => p.prioridade === 'critica' || p.prioridade === 'alta');
  const funcionariosAtivos = funcionarios.filter(f => f.status === 'disponivel' || f.status === 'ocupado');

  const isAdmin = user?.user_metadata?.role === 'admin';

  const createTarefaMutation = useMutation({
    mutationFn: async (payload) => {
      const tarefa = await api.entities.Tarefa.create(payload);
      if (payload.funcionarios_designados?.length > 0) {
        for (const funcId of payload.funcionarios_designados) {
          if (!isAdmin && funcionarioAtual?.id !== funcId) continue;
          const func = funcionarios.find(f => f.id === funcId);
          if (func) {
            await api.entities.Funcionario.update(funcId, {
              status: 'ocupado',
              tarefas_ativas: (func.tarefas_ativas || 0) + 1,
            });
          }
        }
      }
      return tarefa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-producao'] });
      setQuickTaskOpen(false);
      setTaskForm({
        titulo: '',
        descricao: '',
        tipo: 'producao',
        prioridade: 'media',
        frente_trabalho_id: '',
        frente_trabalho_nome: '',
      });
      toast.success('Tarefa criada!');
    },
    onError: (error) => {
      console.error(error);
      toast.error('Erro ao criar tarefa');
    },
  });

  const openQuickTask = () => {
    setQuickTaskOpen(true);
  };
  
  const applyTemplate = (tpl) => {
    if (!tpl) return;
    const frenteNome =
      tpl.frente_trabalho_nome ||
      frentes.find((f) => f.id === tpl.frente_trabalho_id)?.nome ||
      '';
    setTaskForm((p) => ({
      ...p,
      titulo: tpl.nome || '',
      descricao: tpl.descricao || '',
      tipo: tpl.tipo || 'outros',
      prioridade: tpl.prioridade || 'media',
      frente_trabalho_id: tpl.frente_trabalho_id || '',
      frente_trabalho_nome: frenteNome,
    }));
  };

  const handleQuickCreate = () => {
    if (!taskForm.titulo || !taskForm.frente_trabalho_id) {
      toast.error('Preencha título e frente de trabalho');
      return;
    }
    const frente = frentes.find(f => f.id === taskForm.frente_trabalho_id);
    const candidatosDisponiveis = funcionarios.filter(f =>
      f.ativo !== false &&
      f.status === 'disponivel' &&
      f.frentes_trabalho?.includes(taskForm.frente_trabalho_id)
    );
    const candidatos = candidatosDisponiveis.length > 0
      ? candidatosDisponiveis
      : (AUTOMATION_CONFIG.autoDistribuicaoScoreSemDisponiveis
        ? funcionarios.filter(f =>
            f.ativo !== false &&
            f.frentes_trabalho?.includes(taskForm.frente_trabalho_id)
          )
        : []);
    let funcionariosSelecionados = [];
    if (candidatos.length > 0) {
      const minScore = candidatosDisponiveis.length === 0 && AUTOMATION_CONFIG.autoDistribuicaoScoreSemDisponiveis
        ? 0
        : 20;
      funcionariosSelecionados = selecionarMelhoresFuncionarios(
        candidatos,
        { frente_trabalho_id: taskForm.frente_trabalho_id, prioridade: taskForm.prioridade, tipo: taskForm.tipo },
        frente,
        1,
        minScore
      );
    }

    createTarefaMutation.mutate({
      titulo: taskForm.titulo,
      descricao: taskForm.descricao,
      tipo: taskForm.tipo,
      prioridade: taskForm.prioridade,
      frente_trabalho_id: taskForm.frente_trabalho_id,
      frente_trabalho_nome: taskForm.frente_trabalho_nome,
      funcionarios_designados: funcionariosSelecionados.map(f => f.id),
      funcionarios_nomes: funcionariosSelecionados.map(f => f.nome),
      quantidade_profissionais: funcionariosSelecionados.length || 1,
      status: 'aguardando_alocacao',
      data_inicio: null,
    });
  };

  return (
    <>
      <SistemaNotificacoes />
      <div className="space-y-6">
        <PageHeader 
          title="Dashboard Operacional"
          subtitle={`${format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`}
          icon={LayoutDashboard}
        />

      {/* Status Rápido */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Nova Tarefa"
          value="Criar"
          subtitle="Criação rápida"
          icon={ClipboardCheck}
          color="blue"
          onClick={openQuickTask}
        />
        <StatCard
          title="Produção"
          value={tarefasProducao.length}
          subtitle="Ordens ativas"
          icon={Factory}
          color="amber"
          linkTo="Producao"
        />
        <StatCard
          title="Veículos no Pátio"
          value={veiculosPatio.length}
          subtitle="Aguardando atendimento"
          icon={Truck}
          color="green"
          linkTo="Logistica"
        />
        <StatCard
          title="Expedição"
          value={notasPendentes.length}
          subtitle="Notas em expedição"
          icon={Package}
          color="purple"
          linkTo="Expedicao"
        />
        <StatCard
          title="Pendências"
          value={pendenciasCriticas.length}
          subtitle="Alertas críticos"
          icon={AlertTriangle}
          color="red"
          linkTo="Pendencias"
        />
        <StatCard
          title="Equipe"
          value={funcionariosAtivos.length}
          subtitle="Funcionários ativos"
          icon={Users}
          color="orange"
          linkTo="GestaoEquipe"
        />
      </div>

      {/* Detalhes Rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Tarefas Recentes */}
        <div className="bg-card/55 border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-400" />
              Tarefas em Execução
            </h3>
            <span className="text-xs text-muted-foreground">{tarefas.filter(t => t.status === 'em_execucao').length} ativas</span>
          </div>
          <div className="space-y-3">
            {tarefas.filter(t => t.status === 'em_execucao').slice(0, 4).map(tarefa => (
              <div key={tarefa.id} className="flex items-center justify-between p-3 bg-muted/40 border border-border/60 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-foreground">{tarefa.titulo}</p>
                  <p className="text-xs text-muted-foreground">{tarefa.frente_trabalho_nome}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  tarefa.prioridade === 'urgente' ? 'bg-red-500/20 text-red-400' :
                  tarefa.prioridade === 'alta' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {tarefa.prioridade}
                </span>
              </div>
            ))}
            {tarefas.filter(t => t.status === 'em_execucao').length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa em execucao</p>
            )}
          </div>
        </div>

        {/* Veículos */}
        <div className="bg-card/55 border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Truck className="w-5 h-5 text-green-400" />
              Veículos no Pátio
            </h3>
            <span className="text-xs text-muted-foreground">{veiculosPatio.length} veiculos</span>
          </div>
          <div className="space-y-3">
            {veiculosPatio.slice(0, 4).map(veiculo => (
              <div key={veiculo.id} className="flex items-center justify-between p-3 bg-muted/40 border border-border/60 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-foreground">{veiculo.placa}</p>
                  <p className="text-xs text-muted-foreground">{veiculo.modelo}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  veiculo.status === 'carregando' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {veiculo.status === 'carregando' ? 'Carregando' : 'No Pátio'}
                </span>
              </div>
            ))}
            {veiculosPatio.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum veiculo no patio</p>
            )}
          </div>
        </div>

        {/* Pendências Críticas */}
        <div className="bg-card/55 border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Alertas Críticos
            </h3>
            <span className="text-xs text-muted-foreground">{pendenciasCriticas.length} alertas</span>
          </div>
          <div className="space-y-3">
            {pendenciasCriticas.slice(0, 4).map(pendencia => (
              <div key={pendencia.id} className="flex items-center justify-between p-3 bg-muted/40 border border-border/60 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-foreground">{pendencia.titulo}</p>
                  <p className="text-xs text-muted-foreground">{pendencia.origem}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  pendencia.prioridade === 'critica' ? 'bg-red-500/20 text-red-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {pendencia.prioridade}
                </span>
              </div>
            ))}
            {pendenciasCriticas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta critico</p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={quickTaskOpen} onOpenChange={setQuickTaskOpen}>
        <DialogContent className="bg-popover border-border text-foreground">
          <DialogHeader className="pr-12">
            <div className="flex items-center gap-3">
              <DialogTitle>Criar Tarefa Rápida</DialogTitle>
              {(templates?.length || 0) > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="ml-auto h-7 px-3 text-xs border-border hover:bg-accent"
                  onClick={() => setTemplatePickerOpen(true)}
                >
                  Usar Template
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Titulo</label>
              <Input
                value={taskForm.titulo}
                onChange={(e) => setTaskForm((p) => ({ ...p, titulo: e.target.value }))}
                placeholder="Ex: Perfiladeira - Nota 123"
                className="bg-card border-border"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Frente de Trabalho</label>
              <Select
                value={taskForm.frente_trabalho_id}
                onValueChange={(v) => {
                  const frente = frentes.find((f) => f.id === v);
                  setTaskForm((p) => ({
                    ...p,
                    frente_trabalho_id: v,
                    frente_trabalho_nome: frente?.nome || '',
                  }));
                }}
              >
                <SelectTrigger className="bg-card border-border text-foreground">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {frentes.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Tipo</label>
                <Select
                  value={taskForm.tipo}
                  onValueChange={(v) => setTaskForm((p) => ({ ...p, tipo: v }))}
                >
                  <SelectTrigger className="bg-card border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="producao">Produção</SelectItem>
                    <SelectItem value="entrega">Entrega</SelectItem>
                    <SelectItem value="retirada">Retirada</SelectItem>
                    <SelectItem value="carregamento">Carregamento</SelectItem>
                    <SelectItem value="descarga">Descarga</SelectItem>
                    <SelectItem value="movimentacao">Movimentação</SelectItem>
                    <SelectItem value="conferencia">Conferência</SelectItem>
                    <SelectItem value="troca">Troca</SelectItem>
                    <SelectItem value="devolucao">Devolução</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Prioridade</label>
                <Select
                  value={taskForm.prioridade}
                  onValueChange={(v) => setTaskForm((p) => ({ ...p, prioridade: v }))}
                >
                  <SelectTrigger className="bg-card border-border text-foreground">
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

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Descricao (opcional)</label>
              <Textarea
                value={taskForm.descricao}
                onChange={(e) => setTaskForm((p) => ({ ...p, descricao: e.target.value }))}
                placeholder="Detalhes rápidos..."
                className="bg-card border-border"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Link to={createPageUrl('Tarefas')} className="text-sm text-muted-foreground hover:text-foreground">
                Abrir Tarefas
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-border"
                  onClick={() => setQuickTaskOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  onClick={handleQuickCreate}
                  disabled={createTarefaMutation.isPending || !taskForm.titulo || !taskForm.frente_trabalho_id}
                >
                  {createTarefaMutation.isPending ? 'Criando...' : 'Criar'}
                </Button>
              </div>
            </div>
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

      </div>
    </>
  );
}




