import React, { useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/dataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
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
import { ClipboardCheck, Star } from 'lucide-react';
import { toast } from 'sonner';

const MANAGER_ROLES = ['admin', 'lider'];

export default function AvaliacaoEquipe() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    funcionario_id: '',
    periodo: '',
    nota_geral: '3',
    qualidade: '3',
    prazo: '3',
    colaboracao: '3',
    comentario: '',
    tags: '',
  });

  const isManager = MANAGER_ROLES.includes(user?.user_metadata?.role || '');

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios-avaliacao'],
    queryFn: () => api.entities.Funcionario.list(),
  });

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ['avaliacoes-funcionarios'],
    queryFn: () => api.entities.AvaliacaoFuncionario.list('-created_date'),
    enabled: isManager,
  });

  const filteredFuncionarios = useMemo(() => {
    const term = search.trim().toLowerCase();
    return funcionarios.filter((f) => {
      const matchesSearch = !term || f.nome?.toLowerCase().includes(term) || f.cargo?.toLowerCase().includes(term);
      const matchesSelected = selectedFuncionarioId === 'all' || f.id === selectedFuncionarioId;
      return matchesSearch && matchesSelected;
    });
  }, [funcionarios, search, selectedFuncionarioId]);

  const avaliacoesPorFuncionario = useMemo(() => {
    const map = new Map();
    avaliacoes.forEach((a) => {
      if (!a.funcionario_id) return;
      if (!map.has(a.funcionario_id)) map.set(a.funcionario_id, []);
      map.get(a.funcionario_id).push(a);
    });
    return map;
  }, [avaliacoes]);

  const openForFuncionario = (func) => {
    setForm((prev) => ({
      ...prev,
      funcionario_id: func.id,
      periodo: prev.periodo || new Date().toISOString().slice(0, 7),
    }));
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const criterios = {
        qualidade: Number(form.qualidade),
        prazo: Number(form.prazo),
        colaboracao: Number(form.colaboracao),
      };
      const payload = {
        funcionario_id: form.funcionario_id,
        avaliador_user_id: user?.id || null,
        avaliador_nome: user?.user_metadata?.full_name || user?.email || 'Avaliador',
        periodo: form.periodo,
        nota_geral: Number(form.nota_geral),
        criterios,
        comentario: form.comentario,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      return api.entities.AvaliacaoFuncionario.create(payload);
    },
    onSuccess: () => {
      toast.success('Avaliação registrada');
      queryClient.invalidateQueries({ queryKey: ['avaliacoes-funcionarios'] });
      setDialogOpen(false);
      setForm({
        funcionario_id: '',
        periodo: '',
        nota_geral: '3',
        qualidade: '3',
        prazo: '3',
        colaboracao: '3',
        comentario: '',
        tags: '',
      });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Erro ao salvar avaliação');
    },
  });

  if (!isManager) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Avaliação da Equipe"
          subtitle="Acesso restrito para administradores e líderes"
          icon={ClipboardCheck}
        />
        <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6">
          <p className="text-white font-medium">Acesso restrito</p>
          <p className="text-slate-300 mt-2">Você não tem permissão para acessar este painel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avaliação da Equipe"
        subtitle="Feedback e desempenho por colaborador"
        icon={ClipboardCheck}
        actions={
          <Button
            type="button"
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            onClick={() => setDialogOpen(true)}
          >
            Nova Avaliação
          </Button>
        }
      />

      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 lg:p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400">Total de Avaliações</p>
          <p className="text-2xl font-bold text-white">{avaliacoes.length}</p>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400">Funcionários Avaliados</p>
          <p className="text-2xl font-bold text-white">{avaliacoesPorFuncionario.size}</p>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400">Equipe Ativa</p>
          <p className="text-2xl font-bold text-white">
            {funcionarios.filter(f => f.ativo !== false).length}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar funcionário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-950 border-slate-700 text-white h-11"
          />
        </div>
        <Select value={selectedFuncionarioId} onValueChange={setSelectedFuncionarioId}>
          <SelectTrigger className="w-full lg:w-64 bg-slate-950 border-slate-700 text-white h-11">
            <SelectValue placeholder="Filtrar por funcionário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {funcionarios.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredFuncionarios.map((func) => {
          const avaliacoesFunc = avaliacoesPorFuncionario.get(func.id) || [];
          const media = avaliacoesFunc.length
            ? Math.round((avaliacoesFunc.reduce((acc, a) => acc + (a.nota_geral || 0), 0) / avaliacoesFunc.length) * 10) / 10
            : 0;
          const ultima = avaliacoesFunc[0];
          return (
            <div key={func.id} className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{func.nome}</p>
                  <p className="text-sm text-slate-400">{func.cargo || 'Cargo não informado'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-white">{media || '-'}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
                  <p className="text-xs text-slate-400">Score</p>
                  <p className="text-lg font-semibold text-white">{func.tarefas_concluidas || 0}</p>
                </div>
                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
                  <p className="text-xs text-slate-400">Ativas</p>
                  <p className="text-lg font-semibold text-white">{func.tarefas_ativas || 0}</p>
                </div>
                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
                  <p className="text-xs text-slate-400">Status</p>
                  <p className="text-sm font-semibold text-white">{func.status || '-'}</p>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-300">
                {ultima ? (
                  <p>
                    Última avaliação: <span className="text-white">{ultima.periodo || 'Sem período'}</span> — Nota {ultima.nota_geral}
                  </p>
                ) : (
                  <p>Nenhuma avaliação registrada.</p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 text-slate-200"
                  onClick={() => openForFuncionario(func)}
                >
                  Avaliar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Avaliação</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Funcionário</label>
              <Select
                value={form.funcionario_id}
                onValueChange={(v) => setForm((p) => ({ ...p, funcionario_id: v }))}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {funcionarios.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Período (AAAA-MM)</label>
                <Input
                  value={form.periodo}
                  onChange={(e) => setForm((p) => ({ ...p, periodo: e.target.value }))}
                  placeholder="2025-01"
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Nota geral</label>
                <Select
                  value={form.nota_geral}
                  onValueChange={(v) => setForm((p) => ({ ...p, nota_geral: v }))}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Qualidade</label>
                <Select
                  value={form.qualidade}
                  onValueChange={(v) => setForm((p) => ({ ...p, qualidade: v }))}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Prazo</label>
                <Select
                  value={form.prazo}
                  onValueChange={(v) => setForm((p) => ({ ...p, prazo: v }))}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Colaboração</label>
                <Select
                  value={form.colaboracao}
                  onValueChange={(v) => setForm((p) => ({ ...p, colaboracao: v }))}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Comentário</label>
              <Textarea
                value={form.comentario}
                onChange={(e) => setForm((p) => ({ ...p, comentario: e.target.value }))}
                placeholder="Feedback objetivo, pontos fortes e melhorias..."
                className="bg-slate-950 border-slate-800"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Tags (separadas por vírgula)</label>
              <Input
                value={form.tags}
                onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                placeholder="qualidade, proatividade, segurança"
                className="bg-slate-950 border-slate-800"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-800"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                disabled={!form.funcionario_id || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'Salvando...' : 'Salvar Avaliação'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



