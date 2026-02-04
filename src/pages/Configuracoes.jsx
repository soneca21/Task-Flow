import React, { useState } from 'react';
import { api } from '@/api/dataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings, 
  Shield, 
  Bell, 
  ClipboardCheck, 
  Layers,
  Truck,
  Factory,
  FileText,
  Camera,
  Sliders,
  ChevronRight,
  Lock,
  Unlock,
  Save,
  Plus,
  Edit2,
  Trash2,
  Eye,
  History
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, fixMojibakePtBr } from "@/lib/utils";
import { format } from 'date-fns';
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function Configuracoes() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const role = user?.user_metadata?.role || 'colaborador';
  const isAdmin = role === 'admin';
  const [activeTab, setActiveTab] = useState('checklists');
  const [checklistDialog, setChecklistDialog] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [seedingChecklists, setSeedingChecklists] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [seedingTemplates, setSeedingTemplates] = useState(false);

  const { data: checklists = [] } = useQuery({
    queryKey: ['checklists'],
    queryFn: () => api.entities.Checklist.list(),
  });

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => api.entities.ConfiguracaoSistema.list(),
  });

  const { data: frentes = [] } = useQuery({
    queryKey: ['frentes-config'],
    queryFn: () => api.entities.FrenteTrabalho.filter({ ativo: true }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['tarefa-templates'],
    queryFn: () => api.entities.TarefaTemplate.list('-created_date'),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['logs-auditoria'],
    queryFn: () => api.entities.LogAuditoria.list('-created_date', 50),
  });

  const createChecklistMutation = useMutation({
    mutationFn: (data) => api.entities.Checklist.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      setChecklistDialog(false);
      setEditingChecklist(null);
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Checklist.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      setChecklistDialog(false);
      setEditingChecklist(null);
    },
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: (id) => api.entities.Checklist.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklists'] }),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => api.entities.TarefaTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefa-templates'] });
      setTemplateDialog(false);
      setEditingTemplate(null);
    },
    onError: () => toast.error('Erro ao criar template.'),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.TarefaTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefa-templates'] });
      setTemplateDialog(false);
      setEditingTemplate(null);
    },
    onError: () => toast.error('Erro ao atualizar template.'),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => api.entities.TarefaTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarefa-templates'] }),
    onError: () => toast.error('Erro ao excluir template.'),
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ chave, valor, tipo, categoria }) => {
      const existing = configuracoes.find(c => c.chave === chave);
      if (existing) {
        return api.entities.ConfiguracaoSistema.update(existing.id, { valor: String(valor) });
      } else {
        return api.entities.ConfiguracaoSistema.create({
          chave,
          valor: String(valor),
          tipo: tipo || 'booleano',
          categoria: categoria || 'seguranca',
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['configuracoes'] }),
  });

  const getConfig = (chave, defaultValue = 'false') => {
    const config = configuracoes.find(c => c.chave === chave);
    if (!config) return defaultValue === 'true';
    return config.valor === 'true';
  };

  const getConfigValue = (chave, defaultValue = '') => {
    const config = configuracoes.find(c => c.chave === chave);
    return config?.valor ?? defaultValue;
  };

  const getConfigNumber = (chave, defaultValue = 0) => {
    const value = getConfigValue(chave, String(defaultValue));
    const num = Number(value);
    return Number.isFinite(num) ? num : defaultValue;
  };

  const handleSaveChecklist = (formData) => {
    if (editingChecklist) {
      updateChecklistMutation.mutate({ id: editingChecklist.id, data: formData });
    } else {
      createChecklistMutation.mutate(formData);
    }
  };

  const checklistsPadrao = [
    {
      nome: 'Checklist de Produção - Início de Lote',
      tipo: 'producao',
      bloqueio_saida: false,
      itens: [
        { pergunta: 'Ordem de produção conferida?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Desenho técnico disponível no posto?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Matéria-prima correta e identificada?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Dimensão inicial (mm)', tipo_resposta: 'numero', obrigatorio: true },
        { pergunta: 'Máquina limpa e lubrificada?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Parâmetros ajustados (velocidade/pressão)?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Primeira peça aprovada?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Foto da primeira peça', tipo_resposta: 'foto_obrigatoria', obrigatorio: true },
        { pergunta: 'EPI completo e em boas condições?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Observações do líder', tipo_resposta: 'texto', obrigatorio: false },
      ],
    },
    {
      nome: 'Checklist de Carregamento - Expedição',
      tipo: 'carregamento',
      bloqueio_saida: false,
      itens: [
        { pergunta: 'Nota/romaneio conferidos?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Quantidade de volumes conferida?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Etiquetas/identificação dos volumes OK?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Integridade dos itens (sem avarias)?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Amarração e fixação corretas?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Foto do carregamento finalizado', tipo_resposta: 'foto_obrigatoria', obrigatorio: true },
        { pergunta: 'Documentos entregues ao motorista?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Horário de saída', tipo_resposta: 'texto', obrigatorio: false },
        { pergunta: 'Responsável pela conferência', tipo_resposta: 'texto', obrigatorio: false },
      ],
    },
    {
      nome: 'Checklist de Conferência - Saída',
      tipo: 'conferencia',
      bloqueio_saida: true,
      itens: [
        { pergunta: 'Nota fiscal conferida?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Cliente e endereço confirmados?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Produtos conferidos por item?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Foto da carga no veículo', tipo_resposta: 'foto_obrigatoria', obrigatorio: true },
        { pergunta: 'Assinatura/confirmação do responsável?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Número do lacre', tipo_resposta: 'texto', obrigatorio: true },
        { pergunta: 'EPI do motorista OK?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Checklist de segurança aprovado?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Observações', tipo_resposta: 'texto', obrigatorio: false },
      ],
    },
    {
      nome: 'Checklist de Retirada - Balcão/Cliente',
      tipo: 'retirada',
      bloqueio_saida: false,
      itens: [
        { pergunta: 'Documento do cliente conferido?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Autorização de retirada validada?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Quantidades separadas e conferidas?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Integridade dos itens verificada?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Assinatura do cliente registrada?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Foto da retirada', tipo_resposta: 'foto_obrigatoria', obrigatorio: true },
        { pergunta: 'Observações', tipo_resposta: 'texto', obrigatorio: false },
      ],
    },
    {
      nome: 'Checklist de Movimentação de Carga',
      tipo: 'movimentacao',
      bloqueio_saida: false,
      itens: [
        { pergunta: 'Área isolada e sinalizada?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Equipamento inspecionado (empilhadeira/ponte)?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Freios, buzina e luzes funcionando?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Carga dentro da capacidade do equipamento?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'EPI do operador em dia?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Amarração/estabilidade da carga OK?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Rotas livres de obstáculos?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Foto da carga movimentada', tipo_resposta: 'foto_obrigatoria', obrigatorio: true },
        { pergunta: 'Observações', tipo_resposta: 'texto', obrigatorio: false },
      ],
    },
    {
      nome: 'Checklist de Entrada de Veículo',
      tipo: 'entrada_veiculo',
      bloqueio_saida: false,
      itens: [
        { pergunta: 'Placa e veículo registrados?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Motorista identificado?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Documentos do veículo conferidos?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'EPI/sinalização conferidos?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Foto do veículo na chegada', tipo_resposta: 'foto_obrigatoria', obrigatorio: true },
        { pergunta: 'Horário de chegada', tipo_resposta: 'texto', obrigatorio: false },
        { pergunta: 'Observações', tipo_resposta: 'texto', obrigatorio: false },
      ],
    },
    {
      nome: 'Checklist de Saída de Veículo',
      tipo: 'saida_veiculo',
      bloqueio_saida: false,
      itens: [
        { pergunta: 'Carga liberada?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Documentação entregue?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Lacre conferido?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Foto do veículo na saída', tipo_resposta: 'foto_obrigatoria', obrigatorio: true },
        { pergunta: 'Horário de saída', tipo_resposta: 'texto', obrigatorio: false },
        { pergunta: 'Ocorrências', tipo_resposta: 'texto', obrigatorio: false },
      ],
    },
    {
      nome: 'Checklist de Descarga - Pátio',
      tipo: 'descarga',
      bloqueio_saida: false,
      itens: [
        { pergunta: 'Nota/romaneio recebidos conferidos?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Placa e veículo confirmados?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Motorista identificado?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Local de descarga liberado e sinalizado?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'EPI e sinalização OK?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Integridade da carga (sem avarias) confirmada?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Foto da carga na chegada', tipo_resposta: 'foto_obrigatoria', obrigatorio: true },
        { pergunta: 'Foto após descarregar', tipo_resposta: 'foto_obrigatoria', obrigatorio: false },
        { pergunta: 'Observações', tipo_resposta: 'texto', obrigatorio: false },
      ],
    },
    {
      nome: 'Checklist de Troca - Pátio',
      tipo: 'troca',
      bloqueio_saida: false,
      itens: [
        { pergunta: 'Motivo da troca informado?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Itens devolvidos conferidos?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Itens para entrega conferidos?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Conferência por item realizada?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Foto dos itens devolvidos', tipo_resposta: 'foto_obrigatoria', obrigatorio: true },
        { pergunta: 'Foto dos itens entregues', tipo_resposta: 'foto_obrigatoria', obrigatorio: true },
        { pergunta: 'Assinatura/confirmação do responsável?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Observações', tipo_resposta: 'texto', obrigatorio: false },
      ],
    },
    {
      nome: 'Checklist de Devolução - Pátio',
      tipo: 'devolucao',
      bloqueio_saida: false,
      itens: [
        { pergunta: 'Motivo da devolução informado?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Itens devolvidos conferidos por item?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Condição/avarias registradas?', tipo_resposta: 'sim_nao', obrigatorio: true },
        { pergunta: 'Destino informado (estoque/produção/sucata)?', tipo_resposta: 'texto', obrigatorio: true },
        { pergunta: 'Foto dos itens devolvidos', tipo_resposta: 'foto_obrigatoria', obrigatorio: true },
        { pergunta: 'Foto da nota/romaneio (se houver)', tipo_resposta: 'foto_obrigatoria', obrigatorio: false },
        { pergunta: 'Observações', tipo_resposta: 'texto', obrigatorio: false },
      ],
    },
  ];

  const templatesPadrao = [
    {
      nome: 'Atendimento no Pátio - Carga (Expedição)',
      tipo: 'carregamento',
      prioridade: 'media',
      frente_trabalho_id: 'logistica_expedicao_retirar',
      checklist_nome: 'Checklist de Carregamento - Expedição',
      quantidade_profissionais: 1,
      descricao: 'Triagem, documentos e liberação de carga.',
      observacoes: 'Template padrão do sistema.',
    },
    {
      nome: 'Atendimento no Pátio - Descarga (Expedição)',
      tipo: 'descarga',
      prioridade: 'media',
      frente_trabalho_id: 'logistica_expedicao_retirar',
      checklist_nome: 'Checklist de Descarga - Pátio',
      quantidade_profissionais: 1,
      descricao: 'Triagem e conferência de documentos para descarga.',
      observacoes: 'Template padrão do sistema.',
    },
    {
      nome: 'Atendimento no Pátio - Retirada (Expedição)',
      tipo: 'retirada',
      prioridade: 'media',
      frente_trabalho_id: 'logistica_expedicao_retirar',
      checklist_nome: 'Checklist de Retirada - Balcão/Cliente',
      quantidade_profissionais: 1,
      descricao: 'Separação e liberação para retirada.',
      observacoes: 'Template padrão do sistema.',
    },
    {
      nome: 'Atendimento no Pátio - Troca (Expedição)',
      tipo: 'troca',
      prioridade: 'media',
      frente_trabalho_id: 'logistica_expedicao_retirar',
      checklist_nome: 'Checklist de Troca - Pátio',
      quantidade_profissionais: 1,
      descricao: 'Processo de troca: devolução + entrega.',
      observacoes: 'Template padrão do sistema.',
    },
    {
      nome: 'Atendimento no Pátio - Devolução (Expedição)',
      tipo: 'devolucao',
      prioridade: 'media',
      frente_trabalho_id: 'logistica_expedicao_retirar',
      checklist_nome: 'Checklist de Devolução - Pátio',
      quantidade_profissionais: 1,
      descricao: 'Recebimento e registro de devolução.',
      observacoes: 'Template padrão do sistema.',
    },
    {
      nome: 'Movimentação - Empilhadeira (Padrão)',
      tipo: 'movimentacao',
      prioridade: 'media',
      frente_trabalho_id: 'mov_empilhadeira',
      checklist_nome: 'Checklist de Movimentação de Carga',
      quantidade_profissionais: 1,
      descricao: 'Movimentação interna de carga (empilhadeira).',
      observacoes: 'Template padrão do sistema.',
    },
    {
      nome: 'Movimentação - Ponte Rolante (Padrão)',
      tipo: 'movimentacao',
      prioridade: 'media',
      frente_trabalho_id: 'mov_ponte_rolante',
      checklist_nome: 'Checklist de Movimentação de Carga',
      quantidade_profissionais: 1,
      descricao: 'Movimentação interna de carga (ponte rolante).',
      observacoes: 'Template padrão do sistema.',
    },
    {
      nome: 'Movimentação - Pórtico (Padrão)',
      tipo: 'movimentacao',
      prioridade: 'media',
      frente_trabalho_id: 'mov_portico',
      checklist_nome: 'Checklist de Movimentação de Carga',
      quantidade_profissionais: 1,
      descricao: 'Movimentação interna de carga (pórtico).',
      observacoes: 'Template padrão do sistema.',
    },
    {
      nome: 'Tarefa Rápida (Sem Checklist)',
      tipo: 'outros',
      prioridade: 'media',
      frente_trabalho_id: 'logistica_expedicao_retirar',
      checklist_nome: null,
      quantidade_profissionais: 1,
      descricao: 'Tarefa simples sem checklist obrigatório.',
      observacoes: 'Template padrão do sistema.',
    },
  ];

  const handleSeedChecklists = async () => {
    setSeedingChecklists(true);
    try {
      const existingNames = new Set(checklists.map((c) => c.nome));
      const toCreate = checklistsPadrao.filter((c) => !existingNames.has(c.nome));
      for (const checklist of toCreate) {
        await api.entities.Checklist.create({ ...checklist, ativo: true });
      }
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      if (toCreate.length === 0) {
        toast.info('Os checklists padrão já estão cadastrados.');
      } else {
        toast.success('Checklists padrão adicionados.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao adicionar checklists padrão.');
    } finally {
      setSeedingChecklists(false);
    }
  };

  const handleSeedTemplates = async () => {
    setSeedingTemplates(true);
    try {
      const existingNames = new Set(templates.map((t) => t.nome));
      const checklistByName = new Map(checklists.map((c) => [c.nome, c]));
      const frenteById = new Map(frentes.map((f) => [f.id, f]));

      const toCreate = templatesPadrao.filter((t) => !existingNames.has(t.nome));
      for (const t of toCreate) {
        const frente = frenteById.get(t.frente_trabalho_id);
        const checklist = t.checklist_nome ? checklistByName.get(t.checklist_nome) : null;
        await api.entities.TarefaTemplate.create({
          nome: t.nome,
          descricao: t.descricao || null,
          tipo: t.tipo,
          prioridade: t.prioridade || 'media',
          frente_trabalho_id: t.frente_trabalho_id,
          frente_trabalho_nome: frente?.nome || '',
          checklist_id: checklist?.id || null,
          quantidade_profissionais: t.quantidade_profissionais || 1,
          observacoes: t.observacoes || null,
          ativo: true,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['tarefa-templates'] });
      if (toCreate.length === 0) {
        toast.info('Os templates padrão já estão cadastrados.');
      } else {
        toast.success('Templates padrão adicionados.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao adicionar templates.');
    } finally {
      setSeedingTemplates(false);
    }
  };

  const tipoChecklistLabels = {
    producao: 'Produção',
    carregamento: 'Carregamento',
    conferencia: 'Conferência',
    retirada: 'Retirada',
    movimentacao: 'Movimentação',
    descarga: 'Descarga',
    troca: 'Troca',
    devolucao: 'Devolução',
    saida_veiculo: 'Saída de Veículo',
    entrada_veiculo: 'Entrada de Veículo',
  };

  return (
    <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <PageHeader 
        title="Configurações do Sistema"
        subtitle="Gerencie checklists, regras e auditoria"
        icon={Settings}
      />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900/50 border border-slate-800 p-2 grid grid-cols-2 gap-2 rounded-xl mb-4 w-full h-auto">
            <TabsTrigger value="checklists" className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 w-full justify-center whitespace-normal">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Checklists
            </TabsTrigger>
            <TabsTrigger value="templates" className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 w-full justify-center whitespace-normal">
              <Layers className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="automacoes" className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 w-full justify-center whitespace-normal">
              <Sliders className="w-4 h-4 mr-2" />
              Automações
            </TabsTrigger>
            <TabsTrigger value="seguranca" className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 w-full justify-center whitespace-normal">
              <Shield className="w-4 h-4 mr-2" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 w-full justify-center whitespace-normal">
              <Bell className="w-4 h-4 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 w-full justify-center whitespace-normal">
              <History className="w-4 h-4 mr-2" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          {/* Checklists */}
          <TabsContent value="checklists" className="mt-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Editor de Checklists</h2>
                <p className="text-sm text-slate-400">Crie e modifique checklists obrigatórios</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleSeedChecklists}
                  disabled={seedingChecklists}
                  className="border-slate-700 text-slate-200 w-full sm:w-auto"
                >
                  {seedingChecklists ? 'Adicionando...' : 'Adicionar Checklists Padrão'}
                </Button>
                <Button 
                  onClick={() => { setEditingChecklist(null); setChecklistDialog(true); }}
                  className="bg-amber-500 hover:bg-amber-600 text-black w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Checklist
                </Button>
              </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checklists.map(checklist => (
              <div 
                key={checklist.id}
                className={cn(
                  "bg-slate-900/50 border rounded-xl p-5",
                  checklist.ativo ? "border-slate-800" : "border-red-900/30 opacity-60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{fixMojibakePtBr(checklist.nome)}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {tipoChecklistLabels[checklist.tipo] || checklist.tipo}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-white"
                      onClick={() => { setEditingChecklist(checklist); setChecklistDialog(true); }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                      onClick={() => deleteChecklistMutation.mutate(checklist.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="text-xs text-slate-500 mb-2">{checklist.itens?.length || 0} itens</p>
                  {checklist.itens?.slice(0, 3).map((item, i) => (
                    <div key={i} className="text-sm text-slate-400 flex items-center gap-2 py-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      <span className="truncate">{fixMojibakePtBr(item.pergunta)}</span>
                    </div>
                  ))}
                  {(checklist.itens?.length || 0) > 3 && (
                    <p className="text-xs text-slate-500 mt-2">+{checklist.itens.length - 3} mais itens</p>
                  )}
                </div>

                {checklist.bloqueio_saida && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
                    <Lock className="w-3 h-3" />
                    Bloqueia saída se não preenchido
                  </div>
                )}
              </div>
            ))}
          </div>

          {checklists.length === 0 && (
            <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
              <ClipboardCheck className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">Nenhum checklist cadastrado</p>
            </div>
          )}
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="mt-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Templates de Tarefas</h2>
                <p className="text-sm text-slate-400">Crie modelos para abrir tarefas rapidamente (com ou sem checklist)</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleSeedTemplates}
                  disabled={!isAdmin || seedingTemplates}
                  className="border-slate-700 text-slate-200 w-full sm:w-auto"
                >
                  {seedingTemplates ? 'Adicionando...' : 'Adicionar Templates Padrão'}
                </Button>
                <Button
                  onClick={() => { setEditingTemplate(null); setTemplateDialog(true); }}
                  disabled={!isAdmin}
                  className="bg-amber-500 hover:bg-amber-600 text-black w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Template
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={cn(
                    "bg-slate-900/50 border rounded-2xl p-5 transition-all hover:border-slate-600",
                    tpl.ativo ? "border-slate-800" : "border-red-900/30 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{fixMojibakePtBr(tpl.nome)}</h3>
                      <p className="text-xs text-slate-500 mt-1">{fixMojibakePtBr(tpl.descricao) || 'Sem descrição'}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {tpl.tipo || 'tipo'}
                        </span>
                        {tpl.frente_trabalho_nome && (
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {fixMojibakePtBr(tpl.frente_trabalho_nome)}
                          </span>
                        )}
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {tpl.prioridade || 'media'}
                        </span>
                        {tpl.checklist_id ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-200 border border-purple-500/20">
                            Checklist
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            Sem checklist
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-slate-400 hover:text-white"
                        disabled={!isAdmin}
                        onClick={() => { setEditingTemplate(tpl); setTemplateDialog(true); }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300"
                        disabled={!isAdmin}
                        onClick={() => deleteTemplateMutation.mutate(tpl.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {tpl.observacoes && (
                    <p className="text-xs text-slate-400 mt-3">{fixMojibakePtBr(tpl.observacoes)}</p>
                  )}
                </div>
              ))}

              {templates.length === 0 && (
                <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl md:col-span-2 lg:col-span-3">
                  <Layers className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhum template cadastrado</p>
                </div>
              )}
            </div>

            <TemplateDialog
              open={templateDialog}
              onOpenChange={setTemplateDialog}
              template={editingTemplate}
              frentes={frentes}
              checklists={checklists}
              onSave={(data) => {
                if (editingTemplate) {
                  updateTemplateMutation.mutate({ id: editingTemplate.id, data });
                } else {
                  createTemplateMutation.mutate(data);
                }
              }}
              isLoading={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            />
          </TabsContent>

          {/* Automações */}
          <TabsContent value="automacoes" className="mt-2">
          <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Gestão de Automações</h2>
              <p className="text-sm text-slate-400">Configure regras automáticas do sistema</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200">Gatilhos de Nota</h3>
                <div>
                  <Label>Status que ativa a automação</Label>
                  <Select
                    value={getConfigValue('automacao_nota_trigger_status', 'em_expedicao')}
                    onValueChange={(v) => updateConfigMutation.mutate({ chave: 'automacao_nota_trigger_status', valor: v, tipo: 'texto', categoria: 'automacao' })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_expedicao">Em expedição</SelectItem>
                      <SelectItem value="em_producao">Em produção</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status para produção</Label>
                  <Select
                    value={getConfigValue('automacao_nota_status_producao', 'em_producao')}
                    onValueChange={(v) => updateConfigMutation.mutate({ chave: 'automacao_nota_status_producao', valor: v, tipo: 'texto', categoria: 'automacao' })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_producao">Em produção</SelectItem>
                      <SelectItem value="em_expedicao">Em expedição</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Categoria de frente para produção</Label>
                  <Select
                    value={getConfigValue('automacao_frente_categoria_producao', 'producao')}
                    onValueChange={(v) => updateConfigMutation.mutate({ chave: 'automacao_frente_categoria_producao', valor: v, tipo: 'texto', categoria: 'automacao' })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producao">Produção</SelectItem>
                      <SelectItem value="logistica">Logística</SelectItem>
                      <SelectItem value="movimentacao_carga">Movimentação de Carga</SelectItem>
                      <SelectItem value="apoio_operacional">Apoio Operacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200">Tarefas Automáticas</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo padrão</Label>
                    <Select
                      value={getConfigValue('automacao_tarefa_tipo_default', 'producao')}
                      onValueChange={(v) => updateConfigMutation.mutate({ chave: 'automacao_tarefa_tipo_default', valor: v, tipo: 'texto', categoria: 'automacao' })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="producao">Produção</SelectItem>
                        <SelectItem value="carregamento">Carregamento</SelectItem>
                        <SelectItem value="movimentacao">Movimentação</SelectItem>
                        <SelectItem value="conferencia">Conferência</SelectItem>
                        <SelectItem value="retirada">Retirada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade padrão</Label>
                    <Select
                      value={getConfigValue('automacao_tarefa_prioridade_default', 'media')}
                      onValueChange={(v) => updateConfigMutation.mutate({ chave: 'automacao_tarefa_prioridade_default', valor: v, tipo: 'texto', categoria: 'automacao' })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 mt-2">
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status inicial</Label>
                    <Select
                      value={getConfigValue('automacao_tarefa_status_execucao', 'em_execucao')}
                      onValueChange={(v) => updateConfigMutation.mutate({ chave: 'automacao_tarefa_status_execucao', valor: v, tipo: 'texto', categoria: 'automacao' })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="em_execucao">Em execução</SelectItem>
                        <SelectItem value="aguardando_alocacao">Aguardando alocação</SelectItem>
                        <SelectItem value="criada">Criada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status quando não alocado</Label>
                    <Select
                      value={getConfigValue('automacao_tarefa_status_aguardando', 'aguardando_alocacao')}
                      onValueChange={(v) => updateConfigMutation.mutate({ chave: 'automacao_tarefa_status_aguardando', valor: v, tipo: 'texto', categoria: 'automacao' })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aguardando_alocacao">Aguardando alocação</SelectItem>
                        <SelectItem value="criada">Criada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-800 p-3 bg-slate-900/50">
                  <div>
                    <p className="text-sm font-medium text-white">Auto-distribuir por score se ninguém disponível</p>
                    <p className="text-xs text-slate-400">Distribui mesmo sem disponibilidade</p>
                  </div>
                  <Switch
                    checked={getConfig('automacao_auto_distribuicao_score_sem_disponiveis', 'true')}
                    onCheckedChange={(v) => updateConfigMutation.mutate({ chave: 'automacao_auto_distribuicao_score_sem_disponiveis', valor: v, tipo: 'booleano', categoria: 'automacao' })}
                  />
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200">Quantidade por Prioridade</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Urgente</Label>
                    <Input
                      type="number"
                      value={getConfigNumber('automacao_quantidade_urgente', 2)}
                      onChange={(e) => updateConfigMutation.mutate({ chave: 'automacao_quantidade_urgente', valor: e.target.value || '0', tipo: 'numero', categoria: 'automacao' })}
                      className="bg-slate-800 border-slate-700 mt-2"
                    />
                  </div>
                  <div>
                    <Label>Padrão</Label>
                    <Input
                      type="number"
                      value={getConfigNumber('automacao_quantidade_default', 1)}
                      onChange={(e) => updateConfigMutation.mutate({ chave: 'automacao_quantidade_default', valor: e.target.value || '0', tipo: 'numero', categoria: 'automacao' })}
                      className="bg-slate-800 border-slate-700 mt-2"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200">Mapeamento Nota ? Tarefa</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Entrega</Label>
                    <Select
                      value={getConfigValue('automacao_tipo_nota_entrega', 'entrega')}
                      onValueChange={(v) => updateConfigMutation.mutate({ chave: 'automacao_tipo_nota_entrega', valor: v, tipo: 'texto', categoria: 'automacao' })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrega">Entrega</SelectItem>
                        <SelectItem value="movimentacao">Movimentação</SelectItem>
                        <SelectItem value="carregamento">Carregamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Retirada balcão</Label>
                    <Select
                      value={getConfigValue('automacao_tipo_nota_retirada_balcao', 'retirada')}
                      onValueChange={(v) => updateConfigMutation.mutate({ chave: 'automacao_tipo_nota_retirada_balcao', valor: v, tipo: 'texto', categoria: 'automacao' })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retirada">Retirada</SelectItem>
                        <SelectItem value="movimentacao">Movimentação</SelectItem>
                        <SelectItem value="conferencia">Conferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Retirada terceiro</Label>
                    <Select
                      value={getConfigValue('automacao_tipo_nota_retirada_terceiro', 'retirada')}
                      onValueChange={(v) => updateConfigMutation.mutate({ chave: 'automacao_tipo_nota_retirada_terceiro', valor: v, tipo: 'texto', categoria: 'automacao' })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retirada">Retirada</SelectItem>
                        <SelectItem value="movimentacao">Movimentação</SelectItem>
                        <SelectItem value="conferencia">Conferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Transferência</Label>
                    <Select
                      value={getConfigValue('automacao_tipo_nota_transferencia', 'movimentacao')}
                      onValueChange={(v) => updateConfigMutation.mutate({ chave: 'automacao_tipo_nota_transferencia', valor: v, tipo: 'texto', categoria: 'automacao' })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="movimentacao">Movimentação</SelectItem>
                        <SelectItem value="entrega">Entrega</SelectItem>
                        <SelectItem value="carregamento">Carregamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Segurança */}
        <TabsContent value="seguranca" className="mt-2">
          <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Bloqueios de Segurança</h2>
              <p className="text-sm text-slate-400">Configure regras automáticas de segurança</p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-red-500/20">
                      <Lock className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Bloquear Saída sem Checklist</h3>
                      <p className="text-sm text-slate-400">
                        Impede a saída do caminhão se o checklist de conferência não estiver 100% preenchido
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={getConfig('bloquear_saida_sem_checklist')}
                    onCheckedChange={(v) => updateConfigMutation.mutate({ chave: 'bloquear_saida_sem_checklist', valor: v })}
                  />
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-amber-500/20">
                      <Shield className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Validação por Líder Obrigatória</h3>
                      <p className="text-sm text-slate-400">
                        Requer aprovação de um líder antes de liberar carregamento
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={getConfig('validacao_lider_obrigatoria')}
                    onCheckedChange={(v) => updateConfigMutation.mutate({ chave: 'validacao_lider_obrigatoria', valor: v })}
                  />
                </div>
              </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-blue-500/20">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Foto Obrigatória na Conferência</h3>
                        <p className="text-sm text-slate-400">
                          Exige anexo de foto em cada item do checklist de conferência
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={getConfig('foto_obrigatoria_conferencia')}
                      onCheckedChange={(v) => updateConfigMutation.mutate({ chave: 'foto_obrigatoria_conferencia', valor: v })}
                    />
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-amber-500/20">
                        <Camera className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Foto Obrigatória em Todos os Checklists</h3>
                        <p className="text-sm text-slate-400">
                          Obriga foto em todos os itens, independentemente do tipo de checklist
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={getConfig('foto_obrigatoria_todos')}
                      onCheckedChange={(v) => updateConfigMutation.mutate({ chave: 'foto_obrigatoria_todos', valor: v })}
                    />
                  </div>
                </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-500/20">
                      <Bell className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Notificar Pendências Críticas</h3>
                      <p className="text-sm text-slate-400">
                        Envia notificação imediata quando uma pendência crítica é criada
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={getConfig('notificar_pendencias_criticas')}
                    onCheckedChange={(v) => updateConfigMutation.mutate({ chave: 'notificar_pendencias_criticas', valor: v })}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notificacoes" className="mt-2">
          <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Notificações em Tempo Real</h2>
              <p className="text-sm text-slate-400">Configure alertas personalizados para eventos do sistema</p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-red-500/20">
                      <Bell className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Tarefas Urgentes/Alta Prioridade</h3>
                      <p className="text-sm text-slate-400">
                        Receber alerta quando uma tarefa urgente ou de alta prioridade for criada
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={getConfig('notificar_tarefas_urgentes')}
                    onCheckedChange={(v) => updateConfigMutation.mutate({ chave: 'notificar_tarefas_urgentes', valor: v })}
                  />
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-amber-500/20">
                      <Bell className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Mudanças de Status Críticas</h3>
                      <p className="text-sm text-slate-400">
                        Notificar quando tarefas críticas mudarem de status (pendências resolvidas, notas em atraso)
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={getConfig('notificar_mudancas_status')}
                    onCheckedChange={(v) => updateConfigMutation.mutate({ chave: 'notificar_mudancas_status', valor: v })}
                  />
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-orange-500/20">
                      <Shield className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Alertas de Segurança</h3>
                      <p className="text-sm text-slate-400">
                        Alerta imediato quando um item de segurança for reprovado no checklist
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={getConfig('notificar_alertas_seguranca')}
                    onCheckedChange={(v) => updateConfigMutation.mutate({ chave: 'notificar_alertas_seguranca', valor: v })}
                  />
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-500/20">
                      <Bell className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Funcionário Disponível</h3>
                      <p className="text-sm text-slate-400">
                        Notificar quando um funcionário concluir suas tarefas e ficar disponível
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={getConfig('notificar_funcionario_disponivel')}
                    onCheckedChange={(v) => updateConfigMutation.mutate({ chave: 'notificar_funcionario_disponivel', valor: v })}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Auditoria */}
        <TabsContent value="auditoria" className="mt-2">
          <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Log de Auditoria</h2>
              <p className="text-sm text-slate-400">Histórico completo de ações no sistema</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Data/Hora</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Usuário</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Ação</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Entidade</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="p-4 text-sm text-slate-300">
                          {log.created_date && format(new Date(log.created_date), 'dd/MM HH:mm')}
                        </td>
                        <td className="p-4 text-sm text-slate-300">{log.created_by}</td>
                        <td className="p-4">
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full",
                            log.acao === 'criar' && "bg-green-500/20 text-green-400",
                            log.acao === 'editar' && "bg-blue-500/20 text-blue-400",
                            log.acao === 'excluir' && "bg-red-500/20 text-red-400",
                            log.acao === 'aprovar' && "bg-amber-500/20 text-amber-400",
                            log.acao === 'validar_checklist' && "bg-purple-500/20 text-purple-400",
                            log.acao === 'liberar_veiculo' && "bg-cyan-500/20 text-cyan-400",
                          )}>
                            {log.acao}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-400">{log.entidade}</td>
                        <td className="p-4 text-sm text-slate-300 max-w-xs truncate">{log.descricao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logs.length === 0 && (
                <div className="p-8 text-center">
                  <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhum log registrado</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Checklist Dialog */}
      <ChecklistDialog
        open={checklistDialog}
        onOpenChange={setChecklistDialog}
        checklist={editingChecklist}
        onSave={handleSaveChecklist}
        isLoading={createChecklistMutation.isPending || updateChecklistMutation.isPending}
      />
    </div>
  );
}

function ChecklistDialog({ open, onOpenChange, checklist, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'producao',
    itens: [],
    ativo: true,
    bloqueio_saida: false,
  });

  const [novoItem, setNovoItem] = useState({ pergunta: '', tipo_resposta: 'sim_nao', obrigatorio: true });

  React.useEffect(() => {
    if (checklist) {
      setFormData({
        nome: checklist.nome || '',
        tipo: checklist.tipo || 'producao',
        itens: checklist.itens || [],
        ativo: checklist.ativo !== false,
        bloqueio_saida: checklist.bloqueio_saida || false,
      });
    } else {
      setFormData({
        nome: '',
        tipo: 'producao',
        itens: [],
        ativo: true,
        bloqueio_saida: false,
      });
    }
  }, [checklist, open]);

  const addItem = () => {
    if (!novoItem.pergunta) return;
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, { ...novoItem }]
    }));
    setNovoItem({ pergunta: '', tipo_resposta: 'sim_nao', obrigatorio: true });
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{checklist?.id ? 'Editar Checklist' : 'Novo Checklist'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome do Checklist *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="bg-slate-800 border-slate-700 mt-1"
                placeholder="Ex: Checklist de Carregamento"
              />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="carregamento">Carregamento</SelectItem>
                  <SelectItem value="conferencia">Conferência</SelectItem>
                  <SelectItem value="retirada">Retirada</SelectItem>
                  <SelectItem value="movimentacao">Movimentação</SelectItem>
                  <SelectItem value="descarga">Descarga</SelectItem>
                  <SelectItem value="troca">Troca</SelectItem>
                  <SelectItem value="devolucao">Devolução</SelectItem>
                  <SelectItem value="saida_veiculo">Saída de Veículo</SelectItem>
                  <SelectItem value="entrada_veiculo">Entrada de Veículo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <Switch 
                checked={formData.ativo}
                onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
              />
              <Label>Ativo</Label>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <Switch 
                checked={formData.bloqueio_saida}
                onCheckedChange={(v) => setFormData({ ...formData, bloqueio_saida: v })}
              />
              <Label>Bloqueia Saída</Label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <Label>Itens do Checklist</Label>
            
            <div className="mt-3 space-y-2">
              {formData.itens.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-white">{item.pergunta}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.tipo_resposta === 'sim_nao' && 'Sim/Não'}
                      {item.tipo_resposta === 'texto' && 'Texto'}
                      {item.tipo_resposta === 'numero' && 'Número'}
                      {item.tipo_resposta === 'foto_obrigatoria' && 'Foto Obrigatória'}
                      {item.obrigatorio && ' é Obrigatório'}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-red-400"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Input
                    value={novoItem.pergunta}
                    onChange={(e) => setNovoItem({ ...novoItem, pergunta: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                    placeholder="Pergunta do item..."
                  />
                </div>
                <Select value={novoItem.tipo_resposta} onValueChange={(v) => setNovoItem({ ...novoItem, tipo_resposta: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim_nao">Sim/Não</SelectItem>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="numero">Número</SelectItem>
                    <SelectItem value="foto_obrigatoria">Foto Obrigatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <input
                    type="checkbox"
                    checked={novoItem.obrigatorio}
                    onChange={(e) => setNovoItem({ ...novoItem, obrigatorio: e.target.checked })}
                    className="rounded border-slate-700"
                  />
                  <span className="text-sm text-slate-400">Obrigatório</span>
                </div>
                <Button 
                  size="sm" 
                  onClick={addItem}
                  className="bg-slate-700 hover:bg-slate-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Item
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-800">
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

function TemplateDialog({ open, onOpenChange, template, frentes, checklists, onSave, isLoading }) {
  const NO_CHECKLIST = '__sem_checklist__';

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'outros',
    prioridade: 'media',
    frente_trabalho_id: '',
    frente_trabalho_nome: '',
    checklist_id: null,
    quantidade_profissionais: 1,
    observacoes: '',
    ativo: true,
  });

  React.useEffect(() => {
    if (!open) return;
    if (template) {
      setFormData({
        nome: template.nome || '',
        descricao: template.descricao || '',
        tipo: template.tipo || 'outros',
        prioridade: template.prioridade || 'media',
        frente_trabalho_id: template.frente_trabalho_id || '',
        frente_trabalho_nome: template.frente_trabalho_nome || '',
        checklist_id: template.checklist_id || null,
        quantidade_profissionais: Number(template.quantidade_profissionais || 1) || 1,
        observacoes: template.observacoes || '',
        ativo: template.ativo !== false,
      });
      return;
    }

    setFormData({
      nome: '',
      descricao: '',
      tipo: 'outros',
      prioridade: 'media',
      frente_trabalho_id: '',
      frente_trabalho_nome: '',
      checklist_id: null,
      quantidade_profissionais: 1,
      observacoes: '',
      ativo: true,
    });
  }, [open, template]);

  const handleFrenteChange = (id) => {
    const frente = frentes.find((f) => f.id === id);
    setFormData((prev) => ({
      ...prev,
      frente_trabalho_id: id,
      frente_trabalho_nome: frente?.nome || '',
    }));
  };

  const checklistValue = formData.checklist_id ? String(formData.checklist_id) : NO_CHECKLIST;

  const handleSave = () => {
    const payload = {
      nome: formData.nome?.trim(),
      descricao: formData.descricao?.trim() || null,
      tipo: formData.tipo,
      prioridade: formData.prioridade || 'media',
      frente_trabalho_id: formData.frente_trabalho_id,
      frente_trabalho_nome: formData.frente_trabalho_nome || '',
      checklist_id: formData.checklist_id || null,
      quantidade_profissionais: Number(formData.quantidade_profissionais || 1) || 1,
      observacoes: formData.observacoes?.trim() || null,
      ativo: !!formData.ativo,
    };
    onSave(payload);
  };

  const canSave = Boolean(formData.nome?.trim()) && Boolean(formData.frente_trabalho_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template?.id ? 'Editar Template' : 'Novo Template'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="bg-slate-800 border-slate-700 mt-1"
                placeholder="Ex: Atendimento no Pátio - Carga"
              />
            </div>
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="bg-slate-800 border-slate-700 mt-1"
              rows={2}
              placeholder="Uma descrição curta do que este template cria..."
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
                  <SelectItem value="retirada">Retirada</SelectItem>
                  <SelectItem value="troca">Troca</SelectItem>
                  <SelectItem value="devolucao">Devolução</SelectItem>
                  <SelectItem value="movimentacao">Movimentação</SelectItem>
                  <SelectItem value="conferencia">Conferência</SelectItem>
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
            <Select value={formData.frente_trabalho_id || undefined} onValueChange={handleFrenteChange}>
              <SelectTrigger className="bg-slate-800 border-slate-700 mt-1">
                <SelectValue placeholder="Selecione a frente..." />
              </SelectTrigger>
              <SelectContent>
                {frentes.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Checklist (opcional)</Label>
              <Select
                value={checklistValue}
                onValueChange={(v) =>
                  setFormData({ ...formData, checklist_id: v === NO_CHECKLIST ? null : v })
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CHECKLIST}>Sem checklist</SelectItem>
                  {checklists
                    .filter((c) => c.ativo !== false)
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {fixMojibakePtBr(c.nome)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Qtd. Profissionais</Label>
              <Input
                type="number"
                min={1}
                value={formData.quantidade_profissionais}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantidade_profissionais: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="bg-slate-800 border-slate-700 mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Observações (opcional)</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="bg-slate-800 border-slate-700 mt-1"
              rows={2}
              placeholder="Regras, lembretes ou instruções para o líder..."
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <Switch checked={formData.ativo} onCheckedChange={(v) => setFormData({ ...formData, ativo: v })} />
            <Label>Ativo</Label>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-800">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
            onClick={handleSave}
            disabled={isLoading || !canSave}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



