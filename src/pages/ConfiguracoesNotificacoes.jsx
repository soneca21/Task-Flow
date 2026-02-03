import React, { useState } from 'react';
import { api } from '@/api/dataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Save } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ConfiguracoesNotificacoes() {
  const queryClient = useQueryClient();

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes-notificacoes'],
    queryFn: () => api.entities.ConfiguracaoSistema.filter({ categoria: 'notificacoes' }),
  });

  const [config, setConfig] = useState({
    notificar_tarefas_urgentes: true,
    notificar_mudancas_status: true,
    notificar_alertas_seguranca: true,
    notificar_funcionario_disponivel: true,
  });

  React.useEffect(() => {
    if (configuracoes.length > 0) {
      const newConfig = {};
      configuracoes.forEach(c => {
        newConfig[c.chave] = c.valor === 'true';
      });
      setConfig(prev => ({ ...prev, ...newConfig }));
    }
  }, [configuracoes]);

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const promises = Object.entries(updates).map(async ([chave, valor]) => {
        const existing = configuracoes.find(c => c.chave === chave);
        if (existing) {
          return api.entities.ConfiguracaoSistema.update(existing.id, { valor: String(valor) });
        } else {
          return api.entities.ConfiguracaoSistema.create({
            chave,
            valor: String(valor),
            tipo: 'booleano',
            categoria: 'notificacoes',
          });
        }
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-notificacoes'] });
      queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
      toast.success('Configurações salvas!');
    },
  });

  const handleSave = () => {
    updateMutation.mutate(config);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Configurações de Notificações"
        subtitle="Configure alertas e notificações em tempo real"
        icon={Bell}
      />

      <div className="max-w-3xl space-y-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Notificações de Tarefas</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <Label className="text-white font-medium">Tarefas Urgentes/Alta Prioridade</Label>
                <p className="text-sm text-slate-400 mt-1">
                  Receber alerta quando uma tarefa urgente ou de alta prioridade for criada
                </p>
              </div>
              <Switch
                checked={config.notificar_tarefas_urgentes}
                onCheckedChange={(v) => setConfig({ ...config, notificar_tarefas_urgentes: v })}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <Label className="text-white font-medium">Mudanças de Status Críticas</Label>
                <p className="text-sm text-slate-400 mt-1">
                  Notificar quando tarefas críticas mudarem de status (pausadas, concluídas, etc)
                </p>
              </div>
              <Switch
                checked={config.notificar_mudancas_status}
                onCheckedChange={(v) => setConfig({ ...config, notificar_mudancas_status: v })}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Alertas de Segurança</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <Label className="text-white font-medium">Checklist de Segurança Falhado</Label>
                <p className="text-sm text-slate-400 mt-1">
                  Alerta imediato quando um item de segurança for reprovado no checklist
                </p>
              </div>
              <Switch
                checked={config.notificar_alertas_seguranca}
                onCheckedChange={(v) => setConfig({ ...config, notificar_alertas_seguranca: v })}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Notificações de Equipe</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <Label className="text-white font-medium">Funcionário Disponível</Label>
                <p className="text-sm text-slate-400 mt-1">
                  Notificar quando um funcionário concluir suas tarefas e ficar disponível
                </p>
              </div>
              <Switch
                checked={config.notificar_funcionario_disponivel}
                onCheckedChange={(v) => setConfig({ ...config, notificar_funcionario_disponivel: v })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            {updateMutation.isPending ? (
              'Salvando...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}


