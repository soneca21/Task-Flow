import React, { useState } from 'react';
import { api } from '@/api/dataClient';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  Download,
  Users,
  Clock,
  Truck,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Calendar,
  Camera
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState('equipe');
  const [periodo, setPeriodo] = useState('7');
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchChecklist, setSearchChecklist] = useState('');

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas-relatorios'],
    queryFn: () => api.entities.Tarefa.list(),
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios-relatorios'],
    queryFn: () => api.entities.Funcionario.list(),
  });

  const { data: notas = [] } = useQuery({
    queryKey: ['notas-relatorios'],
    queryFn: () => api.entities.Nota.list(),
  });

  const { data: rotas = [] } = useQuery({
    queryKey: ['rotas-relatorios'],
    queryFn: () => api.entities.Rota.list(),
  });

  const { data: pendencias = [] } = useQuery({
    queryKey: ['pendencias-relatorios'],
    queryFn: () => api.entities.Pendencia.list(),
  });

  const { data: veiculos = [] } = useQuery({
    queryKey: ['veiculos-relatorios'],
    queryFn: () => api.entities.Veiculo.list(),
  });

  // Performance da Equipe
  const performanceEquipe = funcionarios.map(func => {
    const tarefasFunc = tarefas.filter(t => t.funcionarios_designados?.includes(func.id));
    const concluidas = tarefasFunc.filter(t => t.status === 'concluida').length;
    return {
      nome: func.nome?.split(' ')[0] || 'N/A',
      concluidas,
      ativas: tarefasFunc.filter(t => t.status === 'em_execucao').length,
      total: tarefasFunc.length,
    };
  }).filter(f => f.total > 0).sort((a, b) => b.concluidas - a.concluidas).slice(0, 10);

  // Eficiência Operacional - Tarefas por dia
  const tarefasPorDia = [];
  for (let i = 6; i >= 0; i--) {
    const data = subDays(new Date(), i);
    const dataStr = format(data, 'yyyy-MM-dd');
    const tarefasDia = tarefas.filter(t => t.created_date?.startsWith(dataStr));
    tarefasPorDia.push({
      dia: format(data, 'EEE', { locale: ptBR }),
      criadas: tarefasDia.length,
      concluidas: tarefasDia.filter(t => t.status === 'concluida').length,
    });
  }

  // Utilização de Veículos
  const utilizacaoVeiculos = veiculos.map(v => {
    const rotasVeiculo = rotas.filter(r => r.veiculo_id === v.id);
    return {
      placa: v.placa,
      viagens: rotasVeiculo.length,
      status: v.status,
    };
  }).filter(v => v.viagens > 0).sort((a, b) => b.viagens - a.viagens).slice(0, 8);

  // Análise de Pendências
  const pendenciasPorTipo = [
    { name: 'Falta Material', value: pendencias.filter(p => p.tipo === 'falta_material').length },
    { name: 'Problema Produção', value: pendencias.filter(p => p.tipo === 'problema_producao').length },
    { name: 'Atraso Entrega', value: pendencias.filter(p => p.tipo === 'atraso_entrega').length },
    { name: 'Conferência', value: pendencias.filter(p => p.tipo === 'conferencia_pendente').length },
    { name: 'Manutenção', value: pendencias.filter(p => p.tipo === 'manutencao').length },
    { name: 'Outros', value: pendencias.filter(p => p.tipo === 'outro' || p.tipo === 'documentacao').length },
  ].filter(p => p.value > 0);

  const tarefasComChecklist = tarefas.filter(t => Array.isArray(t.checklist_preenchido) && t.checklist_preenchido.length > 0);
  const fotosChecklist = tarefasComChecklist.flatMap(t => (
    (t.checklist_preenchido || [])
      .filter(item => item.foto_url)
      .map(item => ({
        tarefa: t.titulo,
        frente: t.frente_trabalho_nome,
        item: item.item,
        foto_url: item.foto_url,
        data_hora: item.data_hora,
      }))
  ));

  const fotosChecklistFiltradas = fotosChecklist.filter((foto) => {
    const term = searchChecklist.toLowerCase();
    return (
      foto.tarefa?.toLowerCase().includes(term) ||
      foto.item?.toLowerCase().includes(term) ||
      foto.frente?.toLowerCase().includes(term)
    );
  });

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Relatórios Gerenciais"
        subtitle="Análise de performance e eficiência operacional"
        icon={FileText}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900/50 border border-slate-800 p-2 grid grid-cols-2 gap-2 rounded-xl w-full h-auto">
          <TabsTrigger
            value="equipe"
            className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 w-full justify-center whitespace-normal min-h-[44px]"
          >
            <Users className="w-4 h-4 mr-2" />
            Performance Equipe
          </TabsTrigger>
          <TabsTrigger
            value="checklists"
            className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 w-full justify-center whitespace-normal min-h-[44px]"
          >
            <Camera className="w-4 h-4 mr-2" />
            Fotos de Checklists
          </TabsTrigger>
          <TabsTrigger
            value="eficiencia"
            className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 w-full justify-center whitespace-normal min-h-[44px]"
          >
            <Clock className="w-4 h-4 mr-2" />
            Eficiência
          </TabsTrigger>
          <TabsTrigger
            value="veiculos"
            className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 w-full justify-center whitespace-normal min-h-[44px]"
          >
            <Truck className="w-4 h-4 mr-2" />
            Veículos
          </TabsTrigger>
          <TabsTrigger
            value="pendencias"
            className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 w-full justify-center whitespace-normal min-h-[44px]"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Pendências
          </TabsTrigger>
        </TabsList>

        {/* Performance da Equipe */}
        <TabsContent value="equipe" className="mt-2 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Performance da Equipe</h2>
              <p className="text-sm text-slate-400">Tarefas concluídas por funcionário</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportToCSV(performanceEquipe, 'performance_equipe')}
              className="border-slate-700 text-slate-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Tarefas Concluídas</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceEquipe} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="nome" type="category" stroke="#94a3b8" width={80} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#f8fafc' }}
                    />
                    <Bar dataKey="concluidas" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Top Performers</h3>
              <div className="space-y-4">
                {performanceEquipe.slice(0, 5).map((func, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        i === 0 ? "bg-amber-500/20 text-amber-400" :
                        i === 1 ? "bg-slate-400/20 text-slate-300" :
                        i === 2 ? "bg-orange-500/20 text-orange-400" :
                        "bg-slate-700 text-slate-400"
                      )}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-white">{func.nome}</p>
                        <p className="text-xs text-slate-500">{func.total} tarefas total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-400">{func.concluidas}</p>
                      <p className="text-xs text-slate-500">concluídas</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Eficiência Operacional */}
        <TabsContent value="eficiencia" className="mt-2 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Eficiência Operacional</h2>
              <p className="text-sm text-slate-400">Tarefas criadas vs concluídas nos últimos 7 dias</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportToCSV(tarefasPorDia, 'eficiencia_operacional')}
              className="border-slate-700 text-slate-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">Total de Tarefas</p>
              <p className="text-3xl font-bold text-white mt-1">{tarefas.length}</p>
            </div>
            <div className="bg-slate-900/50 border border-green-500/30 rounded-xl p-5">
              <p className="text-sm text-slate-400">Taxa de Conclusão</p>
              <p className="text-3xl font-bold text-green-400 mt-1">
                {tarefas.length > 0 ? Math.round((tarefas.filter(t => t.status === 'concluida').length / tarefas.length) * 100) : 0}%
              </p>
            </div>
            <div className="bg-slate-900/50 border border-amber-500/30 rounded-xl p-5">
              <p className="text-sm text-slate-400">Em Execução</p>
              <p className="text-3xl font-bold text-amber-400 mt-1">
                {tarefas.filter(t => t.status === 'em_execucao').length}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Tarefas por Dia</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tarefasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="dia" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f8fafc' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="criadas" stroke="#3b82f6" name="Criadas" strokeWidth={2} />
                  <Line type="monotone" dataKey="concluidas" stroke="#22c55e" name="Concluídas" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Utilização de Veículos */}
        <TabsContent value="veiculos" className="mt-2 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Utilização de Veículos</h2>
              <p className="text-sm text-slate-400">Viagens realizadas por veículo</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportToCSV(utilizacaoVeiculos, 'utilizacao_veiculos')}
              className="border-slate-700 text-slate-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">Total de Veículos</p>
              <p className="text-3xl font-bold text-white mt-1">{veiculos.length}</p>
            </div>
            <div className="bg-slate-900/50 border border-blue-500/30 rounded-xl p-5">
              <p className="text-sm text-slate-400">Rotas Realizadas</p>
              <p className="text-3xl font-bold text-blue-400 mt-1">{rotas.length}</p>
            </div>
            <div className="bg-slate-900/50 border border-green-500/30 rounded-xl p-5">
              <p className="text-sm text-slate-400">Disponíveis Agora</p>
              <p className="text-3xl font-bold text-green-400 mt-1">
                {veiculos.filter(v => v.status === 'disponivel').length}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Viagens por Veículo</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilizacaoVeiculos}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="placa" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f8fafc' }}
                  />
                  <Bar dataKey="viagens" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Análise de Pendências */}
        <TabsContent value="pendencias" className="mt-2 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Análise de Pendências</h2>
              <p className="text-sm text-slate-400">Tipos de pendência mais recorrentes</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportToCSV(pendenciasPorTipo, 'analise_pendencias')}
              className="border-slate-700 text-slate-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 border border-red-500/30 rounded-xl p-5">
              <p className="text-sm text-slate-400">Pendências Abertas</p>
              <p className="text-3xl font-bold text-red-400 mt-1">
                {pendencias.filter(p => p.status === 'aberta').length}
              </p>
            </div>
            <div className="bg-slate-900/50 border border-amber-500/30 rounded-xl p-5">
              <p className="text-sm text-slate-400">Em Análise</p>
              <p className="text-3xl font-bold text-amber-400 mt-1">
                {pendencias.filter(p => p.status === 'em_analise').length}
              </p>
            </div>
            <div className="bg-slate-900/50 border border-green-500/30 rounded-xl p-5">
              <p className="text-sm text-slate-400">Resolvidas</p>
              <p className="text-3xl font-bold text-green-400 mt-1">
                {pendencias.filter(p => p.status === 'resolvida').length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Pendências por Tipo</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pendenciasPorTipo}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pendenciasPorTipo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Detalhamento</h3>
              <div className="space-y-3">
                {pendenciasPorTipo.map((tipo, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-white">{tipo.name}</span>
                    </div>
                    <span className="font-bold text-white">{tipo.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Fotos de Checklists */}
        <TabsContent value="checklists" className="mt-2 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Fotos de Checklists</h2>
              <p className="text-sm text-slate-400">Anexos registrados durante a execução das tarefas</p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Buscar por tarefa, frente ou item..."
                value={searchChecklist}
                onChange={(e) => setSearchChecklist(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white h-10 w-full lg:w-64"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(fotosChecklistFiltradas, 'fotos_checklists')}
                className="border-slate-700 text-slate-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fotosChecklistFiltradas.map((foto, index) => (
              <div key={`${foto.foto_url}-${index}`} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="h-40 bg-slate-800">
                  <img src={foto.foto_url} alt={foto.item} className="w-full h-full object-cover" />
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-sm font-semibold text-white">{foto.tarefa}</p>
                  <p className="text-xs text-slate-400">{foto.item}</p>
                  {foto.frente && (
                    <p className="text-xs text-slate-500">Frente: {foto.frente}</p>
                  )}
                  {foto.data_hora && !isNaN(new Date(foto.data_hora).getTime()) && (
                    <p className="text-xs text-slate-500">
                      {format(new Date(foto.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {fotosChecklistFiltradas.length === 0 && (
            <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
              <Camera className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">Nenhuma foto encontrada</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

