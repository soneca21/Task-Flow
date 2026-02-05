import React, { useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useFuncionarioAtual } from '@/hooks/useFuncionarioAtual';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from "@/components/ui/button";
import { Copy, Shield, UserCircle, ClipboardList, Trophy, Activity, Phone, Pencil, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/dataClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatTelefoneBR } from '@/lib/utils';

export default function MeuPerfil() {
  const queryClient = useQueryClient();
  const { user, promoteToAdmin } = useAuth();
  const { data: funcionarioAtual } = useFuncionarioAtual();
  const [isCopying, setIsCopying] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ nome: '', telefone: '', data_nascimento: '' });

  const isDev = import.meta.env.DEV;
  const role = user?.user_metadata?.role || '';
  const isAdmin = role === 'admin';
  const isManager = role === 'admin' || role === 'lider';
  const roleLabel = ['admin', 'lider', 'operador', 'colaborador'].includes(role) ? role : 'colaborador';
  const funcionarioId = funcionarioAtual?.id;

  const updateFuncionarioMutation = useMutation({
    mutationFn: async (payload) => {
      if (!funcionarioId) throw new Error('Funcionário não vinculado');
      return api.entities.Funcionario.update(funcionarioId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionario-atual'] });
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      toast.success('Perfil atualizado.');
      setEditOpen(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Não foi possível atualizar o perfil.');
    },
  });

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas-perfil', funcionarioId],
    queryFn: () => api.entities.Tarefa.list('-created_date', 200),
    enabled: !!funcionarioId,
  });

  const { data: frentes = [] } = useQuery({
    queryKey: ['frentes-perfil'],
    queryFn: () => api.entities.FrenteTrabalho.filter({ ativo: true }),
  });

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ['avaliacoes-perfil', funcionarioId],
    queryFn: () => api.entities.AvaliacaoFuncionario.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const handleCopyUserId = async () => {
    if (!user?.id) return;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(user.id);
      toast.success('User ID copiado');
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível copiar o User ID.');
    } finally {
      setIsCopying(false);
    }
  };

  const handlePromoteToAdmin = async () => {
    setIsPromoting(true);
    try {
      await promoteToAdmin();
      toast.success('Permissão admin ativada (dev).');
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível tornar admin.');
    } finally {
      setIsPromoting(false);
    }
  };

  const tarefasDoFuncionario = useMemo(() => {
    if (!funcionarioId) return [];
    return tarefas.filter((t) => t.funcionarios_designados?.includes(funcionarioId));
  }, [tarefas, funcionarioId]);

  const statsTarefas = useMemo(() => {
    const total = tarefasDoFuncionario.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').length;
    const emExecucao = tarefasDoFuncionario.filter(t => t.status === 'em_execucao').length;
    const aguardando = tarefasDoFuncionario.filter(t => t.status === 'aguardando_alocacao' || t.status === 'criada').length;
    const concluidas = tarefasDoFuncionario.filter(t => t.status === 'concluida').length;
    return { total, emExecucao, aguardando, concluidas };
  }, [tarefasDoFuncionario]);

  const score = funcionarioAtual?.tarefas_concluidas || 0;
  const scoreLevels = [
    { label: 'Bronze', min: 0, max: 9, color: 'text-amber-400', bar: 'bg-amber-500' },
    { label: 'Prata', min: 10, max: 29, color: 'text-foreground', bar: 'bg-muted' },
    { label: 'Ouro', min: 30, max: 59, color: 'text-yellow-300', bar: 'bg-yellow-400' },
    { label: 'Platina', min: 60, max: 119, color: 'text-cyan-200', bar: 'bg-cyan-300' },
    { label: 'Diamante', min: 120, max: Infinity, color: 'text-indigo-200', bar: 'bg-indigo-300' },
  ];
  const currentLevel = scoreLevels.find(l => score >= l.min && score <= l.max) || scoreLevels[0];
  const nextLevel = scoreLevels.find(l => l.min > currentLevel.min);
  const progress = nextLevel
    ? Math.min(100, Math.round(((score - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100))
    : 100;

  const frentesMap = useMemo(() => {
    const map = new Map();
    frentes.forEach((f) => map.set(f.id, f.nome));
    return map;
  }, [frentes]);

  const frentesFuncionario = (funcionarioAtual?.frentes_trabalho || []).map((id) => ({
    id,
    nome: frentesMap.get(id) || id,
  }));

  const tarefasRecentes = tarefasDoFuncionario
    .filter(t => t.status !== 'cancelada')
    .slice(0, 6);

  const avaliacoesOrdenadas = [...avaliacoes].sort((a, b) => {
    const aDate = a.created_date ? new Date(a.created_date).getTime() : 0;
    const bDate = b.created_date ? new Date(b.created_date).getTime() : 0;
    return bDate - aDate;
  });

  const mediaAvaliacao = avaliacoes.length
    ? Math.round((avaliacoes.reduce((acc, a) => acc + (a.nota_geral || 0), 0) / avaliacoes.length) * 10) / 10
    : 0;

  const statusLabel = {
    disponivel: 'Disponível',
    ocupado: 'Ocupado',
    indisponivel: 'Indisponível',
    ferias: 'Férias',
    afastado: 'Afastado',
  };

  const statusPillClass = (status) => {
    switch (status) {
      case 'disponivel':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'ocupado':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ferias':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'afastado':
        return 'bg-muted/50 text-muted-foreground border-border';
      default:
        return 'bg-card text-muted-foreground border-border';
    }
  };

  const currentStatus = funcionarioAtual?.status || 'disponivel';

  const parseBirthdateInput = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const toISO = (y, m, d) => `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isValidYMD = (y, m, d) => {
      const yy = Number(y);
      const mm = Number(m);
      const dd = Number(d);
      if (!Number.isInteger(yy) || !Number.isInteger(mm) || !Number.isInteger(dd)) return false;
      if (yy < 1900 || yy > 2100) return false;
      if (mm < 1 || mm > 12) return false;
      if (dd < 1 || dd > 31) return false;
      const dt = new Date(Date.UTC(yy, mm - 1, dd));
      return dt.getUTCFullYear() === yy && dt.getUTCMonth() === mm - 1 && dt.getUTCDate() === dd;
    };

    // Accept YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-');
      if (!isValidYMD(y, m, d)) return undefined;
      return raw;
    }

    // Accept DD/MM/YYYY or DD-MM-YYYY
    if (/^\d{2}[\/-]\d{2}[\/-]\d{4}$/.test(raw)) {
      const [d, m, y] = raw.split(/\/|-/);
      if (!isValidYMD(y, m, d)) return undefined;
      return toISO(y, m, d);
    }

    return undefined;
  };

  const formatISODateToBR = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-');
      return `${d}/${m}/${y}`;
    }
    return raw;
  };

  const openEdit = () => {
    setEditForm({
      nome: funcionarioAtual?.nome || user?.user_metadata?.full_name || '',
      telefone: funcionarioAtual?.telefone || '',
      data_nascimento: formatISODateToBR(funcionarioAtual?.data_nascimento || ''),
    });
    setEditOpen(true);
  };

  const displayName = funcionarioAtual?.nome || user?.user_metadata?.full_name || 'Usuario';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Perfil"
        subtitle="Dados da conta e permissões"
        icon={UserCircle}
        iconColor="text-amber-500"
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-border text-foreground hover:bg-card"
              onClick={openEdit}
              disabled={!funcionarioAtual}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar perfil
            </Button>
            {isDev && !isAdmin ? (
              <Button
                type="button"
                variant="outline"
                className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                onClick={handlePromoteToAdmin}
                disabled={isPromoting}
              >
                <Shield className="w-4 h-4 mr-2" />
                {isPromoting ? 'Promovendo...' : 'Tornar-me admin'}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card/60 border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-400 font-bold text-lg">
                {displayName?.[0] || user?.email?.[0] || 'U'}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {displayName}
              </p>
              <p className="text-sm text-muted-foreground">{user?.email || '-'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">User ID</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="text-xs bg-background border border-border rounded px-2 py-1 text-muted-foreground break-all">
                  {user?.id || 'Não disponível'}
                </code>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleCopyUserId}
                  disabled={!user?.id || isCopying}
                  className="text-muted-foreground hover:text-foreground hover:bg-card"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Perfil</p>
              <p className="text-sm text-muted-foreground mt-1">
                {roleLabel === 'admin'
                  ? 'Administrador'
                  : roleLabel === 'lider'
                    ? 'Líder'
                    : roleLabel === 'operador'
                      ? 'Operador'
                      : 'Colaborador'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card/60 border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">Score do Funcionário</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{score}</p>
                <p className={`text-sm ${currentLevel.color}`}>{currentLevel.label}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{statsTarefas.concluidas} concluídas</p>
                {nextLevel ? (
                  <p>Próximo: {nextLevel.label} ({nextLevel.min})</p>
                ) : (
                  <p>Nível máximo</p>
                )}
              </div>
            </div>
            <div className="h-2 w-full bg-card rounded-full overflow-hidden">
              <div
                className={`h-full ${currentLevel.bar} transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-card/60 border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-foreground">Status Operacional</h3>
          </div>
          {funcionarioAtual ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><span className="text-muted-foreground">Nome:</span> {funcionarioAtual.nome}</p>
              <p><span className="text-muted-foreground">Cargo:</span> {funcionarioAtual.cargo || '-'}</p>
              <p><span className="text-muted-foreground">Vínculo:</span> {funcionarioAtual.vinculo || '-'}</p>
              <p><span className="text-muted-foreground">Nível:</span> {funcionarioAtual.nivel_acesso || '-'}</p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{funcionarioAtual.telefone || '-'}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status:</span>
                <span className={`text-xs px-2 py-1 rounded-full border ${statusPillClass(currentStatus)}`}>
                  {statusLabel[currentStatus] || currentStatus}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <span>
                  {funcionarioAtual.data_nascimento
                    ? new Date(funcionarioAtual.data_nascimento).toLocaleDateString('pt-BR')
                    : '-'}
                </span>
              </p>

              <div className="pt-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Ações rápidas</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-border text-foreground hover:bg-card"
                    onClick={() => updateFuncionarioMutation.mutate({ status: 'disponivel' })}
                    disabled={updateFuncionarioMutation.isPending}
                  >
                    Disponível
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-blue-500/40 text-blue-200 hover:bg-blue-500/10"
                    onClick={() => updateFuncionarioMutation.mutate({ status: 'ferias' })}
                    disabled={updateFuncionarioMutation.isPending}
                  >
                    Férias
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-border text-foreground hover:bg-card"
                    onClick={() => updateFuncionarioMutation.mutate({ status: 'afastado' })}
                    disabled={updateFuncionarioMutation.isPending}
                  >
                    Afastado
                  </Button>
                </div>
                {!isManager && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Você pode marcar férias/afastamento. Líder/Admin também pode ajustar pela Gestão de Equipe.
                  </p>
                )}
              </div>
              <p><span className="text-muted-foreground">Capacidade:</span> {funcionarioAtual.capacidade_tarefas || 1} tarefa(s)</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum funcionário vinculado.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card/60 border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Tarefas Ativas</p>
          <p className="text-2xl font-bold text-foreground">{statsTarefas.total}</p>
        </div>
        <div className="bg-card/60 border border-amber-500/30 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Em Execucao</p>
          <p className="text-2xl font-bold text-amber-400">{statsTarefas.emExecucao}</p>
        </div>
        <div className="bg-card/60 border border-blue-500/30 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Aguardando</p>
          <p className="text-2xl font-bold text-blue-400">{statsTarefas.aguardando}</p>
        </div>
        <div className="bg-card/60 border border-green-500/30 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Concluidas</p>
          <p className="text-2xl font-bold text-green-400">{statsTarefas.concluidas}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card/60 border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-foreground">Tarefas Recentes</h3>
          </div>
          <div className="space-y-3">
            {tarefasRecentes.map((tarefa) => (
              <div key={tarefa.id} className="flex items-center justify-between p-3 bg-card/70 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-foreground">{tarefa.titulo}</p>
                  <p className="text-xs text-muted-foreground">{tarefa.frente_trabalho_nome}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  tarefa.status === 'concluida' ? 'bg-green-500/20 text-green-300' :
                  tarefa.status === 'em_execucao' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-card text-muted-foreground'
                }`}>
                  {tarefa.status}
                </span>
              </div>
            ))}
            {tarefasRecentes.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa associada.</p>
            )}
          </div>
        </div>

        <div className="bg-card/60 border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Frentes de Trabalho</h3>
          {frentesFuncionario.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {frentesFuncionario.map((frente) => (
                <span
                  key={frente.id}
                  className="text-xs px-3 py-1 rounded-full bg-card text-muted-foreground border border-border"
                >
                  {frente.nome}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma frente vinculada.</p>
          )}
        </div>
      </div>

      <div className="bg-card/60 border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Avaliações recentes</h3>
          <div className="text-sm text-muted-foreground">
            Média: <span className="text-foreground font-semibold">{mediaAvaliacao || '-'}</span>
          </div>
        </div>
        <div className="space-y-3">
          {avaliacoesOrdenadas.slice(0, 5).map((avaliacao) => (
            <div key={avaliacao.id} className="p-3 bg-card/70 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground">
                  {avaliacao.periodo || 'Sem período'} — Nota {avaliacao.nota_geral}
                </p>
                <span className="text-xs text-muted-foreground">
                  {avaliacao.avaliador_nome || 'Avaliador'}
                </span>
              </div>
              {avaliacao.comentario && (
                <p className="text-xs text-muted-foreground mt-2">{avaliacao.comentario}</p>
              )}
              {avaliacao.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {avaliacao.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded-full bg-card text-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {avaliacoesOrdenadas.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada.</p>
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Nome</Label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm((prev) => ({ ...prev, nome: e.target.value }))}
                className="bg-card border-border mt-1"
                placeholder="Seu nome"
                autoComplete="name"
              />
            </div>

            <div>
              <Label>Telefone</Label>
              <Input
                value={editForm.telefone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, telefone: formatTelefoneBR(e.target.value) }))}
                className="bg-card border-border mt-1"
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                autoComplete="tel"
              />
            </div>

            <div>
              <Label>Data de Nascimento</Label>
              <div className="relative mt-1">
                <CalendarDays className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={editForm.data_nascimento || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, data_nascimento: e.target.value }))}
                  className="pl-10 bg-card border-border"
                  placeholder="DD/MM/AAAA ou AAAA-MM-DD"
                  inputMode="numeric"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Usamos apenas para identificação interna (aniversário).</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => {
                const parsedBirthdate = parseBirthdateInput(editForm.data_nascimento);
                if (parsedBirthdate === undefined) {
                  toast.error('Data de nascimento invalida. Use DD/MM/AAAA ou AAAA-MM-DD.');
                  return;
                }
                const nomeValue = editForm.nome?.trim() || funcionarioAtual?.nome || null;
                updateFuncionarioMutation.mutate({
                  nome: nomeValue,
                  telefone: editForm.telefone || null,
                  data_nascimento: parsedBirthdate,
                });
              }}
              disabled={updateFuncionarioMutation.isPending}
            >
              {updateFuncionarioMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



