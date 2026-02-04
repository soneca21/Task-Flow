import React, { useState, useEffect } from 'react';
import { api } from '@/api/dataClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Camera, 
  CheckCircle, 
  X,
  Upload,
  Save,
  Loader2,
  AlertCircle,
  WifiOff,
  CheckCheck
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ExecutarChecklist({ tarefa, checklist, onConcluir, onFechar, readOnly = false, funcionarioAtual, isAdmin = false }) {
  const queryClient = useQueryClient();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [respostas, setRespostas] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(null);

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes-checklist'],
    queryFn: () => api.entities.ConfiguracaoSistema.list(),
  });

  const getConfig = (chave) => {
    const config = configuracoes.find((c) => c.chave === chave);
    return config?.valor === 'true';
  };

  const fotoObrigatoriaTodos = getConfig('foto_obrigatoria_todos');
  const fotoObrigatoriaConferencia = getConfig('foto_obrigatoria_conferencia') && checklist?.tipo === 'conferencia';
  const exigeFotoEmTodosItens = fotoObrigatoriaTodos || fotoObrigatoriaConferencia;

  useEffect(() => {
    // Carregar respostas salvas do localStorage (modo offline)
    const saved = localStorage.getItem(`checklist_${tarefa.id}`);
    if (readOnly && tarefa.checklist_preenchido) {
      setRespostas(tarefa.checklist_preenchido);
    } else if (saved) {
      setRespostas(JSON.parse(saved));
    } else {
      // Inicializar respostas vazias
      setRespostas(checklist.itens?.map((item, i) => ({
        item: item.pergunta,
        resposta: '',
        foto_url: '',
        data_hora: new Date().toISOString(),
        index: i,
      })) || []);
    }

    // Monitorar status online/offline
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('Conexão restabelecida');
      syncOfflineData();
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.warning('Modo offline ativado');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [tarefa.id, checklist, readOnly]);

  // Auto-save no localStorage
  useEffect(() => {
    if (!readOnly && respostas.length > 0) {
      localStorage.setItem(`checklist_${tarefa.id}`, JSON.stringify(respostas));
    }
  }, [respostas, tarefa.id, readOnly]);

  const syncOfflineData = async () => {
    const saved = localStorage.getItem(`checklist_${tarefa.id}`);
    if (saved && !isOffline) {
      toast.info('Sincronizando dados...');
      // Dados serão sincronizados ao concluir
    }
  };

  const handleResposta = (index, valor) => {
    if (readOnly) return;
    setRespostas(prev => prev.map((r, i) => 
      i === index ? { ...r, resposta: valor, data_hora: new Date().toISOString() } : r
    ));
  };

  const handleUploadFoto = async (index, file) => {
    if (readOnly) return;
    if (!file) return;
    
    setUploadingPhoto(index);
    try {
      if (isOffline) {
        // Modo offline: salvar como base64
        const reader = new FileReader();
        reader.onloadend = () => {
          setRespostas(prev => prev.map((r, i) => 
            i === index ? { ...r, foto_url: reader.result } : r
          ));
          setUploadingPhoto(null);
          toast.success('Foto salva localmente');
        };
        reader.readAsDataURL(file);
      } else {
        // Modo online: fazer upload
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        setRespostas(prev => prev.map((r, i) => 
          i === index ? { ...r, foto_url: file_url } : r
        ));
        setUploadingPhoto(null);
        toast.success('Foto enviada');
      }
    } catch (error) {
      setUploadingPhoto(null);
      toast.error('Erro ao enviar foto');
    }
  };

  const handleClearFoto = (index) => {
    if (readOnly) return;
    setRespostas(prev => prev.map((r, i) =>
      i === index ? { ...r, foto_url: '' } : r
    ));
  };

  const handleCameraCapture = (index) => {
    if (readOnly) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) handleUploadFoto(index, file);
    };
    input.click();
  };

  const validarRespostas = () => {
    const erros = [];
    checklist.itens?.forEach((item, i) => {
      const fotoObrigatoriaItem = item.tipo_resposta === 'foto_obrigatoria' || exigeFotoEmTodosItens;
      if (item.obrigatorio) {
        const resposta = respostas[i];
        if (!resposta?.resposta && item.tipo_resposta !== 'foto_obrigatoria') {
          erros.push(`"${item.pergunta}" é obrigatório`);
        }
      }
      const resposta = respostas[i];
      if (fotoObrigatoriaItem && !resposta?.foto_url) {
        erros.push(`Foto obrigatória para "${item.pergunta}"`);
      }
      if (item.tipo_resposta === 'numero' && resposta?.resposta && isNaN(resposta.resposta)) {
        erros.push(`"${item.pergunta}" deve ser um número`);
      }
    });
    return erros;
  };

  const handleConcluir = async () => {
    if (readOnly) {
      toast.info('Somente visualização');
      return;
    }
    const erros = validarRespostas();
    if (erros.length > 0) {
      toast.error(erros[0]);
      return;
    }

    setIsSaving(true);
    try {
      if (isOffline) {
        // Salvar no localStorage e notificar
        toast.warning('Checklist salvo localmente. Será enviado quando houver conexão.');
        localStorage.setItem(`checklist_pending_${tarefa.id}`, JSON.stringify({
          tarefaId: tarefa.id,
          respostas,
          timestamp: new Date().toISOString(),
        }));
      } else {
        // Atualizar tarefa com checklist preenchido
        await api.entities.Tarefa.update(tarefa.id, {
          checklist_preenchido: respostas,
          status: 'concluida',
          data_conclusao: new Date().toISOString(),
        });

        // Liberar funcionários (admin libera todos; usuário libera apenas o próprio)
        if (tarefa.funcionarios_designados?.length > 0) {
          for (const funcId of tarefa.funcionarios_designados) {
            if (!isAdmin && funcionarioAtual?.id !== funcId) continue;
            const func = await api.entities.Funcionario.get(funcId);
            if (func) {
              await api.entities.Funcionario.update(funcId, {
                status: 'disponivel',
                tarefas_ativas: Math.max(0, (func.tarefas_ativas || 1) - 1),
                tarefas_concluidas: (func.tarefas_concluidas || 0) + 1,
              });
            }
          }
        }

        // Log de auditoria
        await api.entities.LogAuditoria.create({
          acao: 'validar_checklist',
          entidade: 'Tarefa',
          entidade_id: tarefa.id,
          descricao: `Checklist concluído para tarefa ${tarefa.titulo}`,
        });

        // Limpar localStorage
        localStorage.removeItem(`checklist_${tarefa.id}`);
        localStorage.removeItem(`checklist_pending_${tarefa.id}`);

        queryClient.invalidateQueries({ queryKey: ['tarefas'] });
        toast.success('Checklist concluído com sucesso!');
      }

      onConcluir?.();
    } catch (error) {
      toast.error('Erro ao salvar checklist');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const progresso = respostas.filter(r => {
    const item = checklist.itens?.[r.index];
    if (!item) return false;
    const fotoObrigatoriaItem = item.tipo_resposta === 'foto_obrigatoria' || exigeFotoEmTodosItens;
    const respostaOk = item.obrigatorio
      ? (item.tipo_resposta === 'foto_obrigatoria' ? r.foto_url : r.resposta)
      : true;
    const fotoOk = fotoObrigatoriaItem ? r.foto_url : true;
    return respostaOk && fotoOk;
  }).length;
  const total = checklist.itens?.length || 0;
  const percentual = total > 0 ? Math.round((progresso / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center px-4 pb-4 pt-0 sm:items-center sm:p-6 sm:pt-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-2xl w-full max-h-[calc(100svh-2rem)] sm:max-h-[90vh] overflow-hidden flex flex-col min-h-0">
        {/* Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white">{checklist.nome}</h2>
            <Button variant="ghost" size="icon" onClick={onFechar} className="text-slate-400">
              <X className="w-5 h-5" />
            </Button>
          </div>
          {readOnly && (
            <div className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded mb-3 inline-flex">
              Somente leitura
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${percentual}%` }}
              />
            </div>
            <span className="text-sm font-medium text-white">{progresso}/{total}</span>
            {isOffline && (
              <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                <WifiOff className="w-3 h-3" />
                Offline
              </div>
            )}
          </div>
        </div>

        {/* Checklist Items */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-4 [-webkit-overflow-scrolling:touch]">
          {checklist.itens?.map((item, index) => {
            const resposta = respostas[index];
            const fotoObrigatoriaItem = item.tipo_resposta === 'foto_obrigatoria' || exigeFotoEmTodosItens;
            const respostaObrigatoria = item.obrigatorio
              ? (item.tipo_resposta === 'foto_obrigatoria' ? resposta?.foto_url : resposta?.resposta)
              : true;
            const fotoObrigatoriaOk = fotoObrigatoriaItem ? resposta?.foto_url : true;
            const isValid = respostaObrigatoria && fotoObrigatoriaOk;

            return (
              <div 
                key={index}
                className={cn(
                  "bg-slate-800/50 rounded-xl p-4 border-2 transition-all",
                  isValid ? "border-slate-800" : "border-amber-500/30"
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    isValid ? "bg-green-500/20" : "bg-slate-700"
                  )}>
                    {isValid ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <span className="text-xs text-slate-400">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label className="text-white font-medium">
                      {item.pergunta}
                      {item.obrigatorio && <span className="text-red-400 ml-1">*</span>}
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.tipo_resposta === 'sim_nao' && 'Resposta: Sim ou Não'}
                      {item.tipo_resposta === 'texto' && 'Resposta em texto'}
                      {item.tipo_resposta === 'numero' && 'Resposta numérica'}
                      {item.tipo_resposta === 'foto_obrigatoria' && 'Foto obrigatória'}
                      {item.tipo_resposta === 'selecao' && 'Selecione uma opção'}
                      {item.tipo_resposta !== 'foto_obrigatoria' && exigeFotoEmTodosItens && ' • Foto obrigatória'}
                    </p>
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-white"
                      onClick={() => handleCameraCapture(index)}
                      disabled={uploadingPhoto === index}
                      title="Tirar foto"
                    >
                      {uploadingPhoto === index ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Input baseado no tipo */}
                <div className="ml-9">
                  {item.tipo_resposta === 'sim_nao' && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={resposta?.resposta === 'sim' ? 'default' : 'outline'}
                        className={cn(
                          "flex-1 touch-btn",
                          resposta?.resposta === 'sim' && "bg-green-500 hover:bg-green-600"
                        )}
                        onClick={() => handleResposta(index, 'sim')}
                        disabled={readOnly}
                      >
                        Sim
                      </Button>
                      <Button
                        type="button"
                        variant={resposta?.resposta === 'nao' ? 'default' : 'outline'}
                        className={cn(
                          "flex-1 touch-btn",
                          resposta?.resposta === 'nao' && "bg-red-500 hover:bg-red-600"
                        )}
                        onClick={() => handleResposta(index, 'nao')}
                        disabled={readOnly}
                      >
                        Não
                      </Button>
                    </div>
                  )}

                  {item.tipo_resposta === 'texto' && (
                    <Textarea
                      value={resposta?.resposta || ''}
                      onChange={(e) => handleResposta(index, e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                      rows={3}
                      placeholder="Digite sua resposta..."
                      disabled={readOnly}
                    />
                  )}

                  {item.tipo_resposta === 'numero' && (
                    <Input
                      type="number"
                      value={resposta?.resposta || ''}
                      onChange={(e) => handleResposta(index, e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                      placeholder="Digite o número..."
                      disabled={readOnly}
                    />
                  )}

                  {item.tipo_resposta === 'selecao' && item.opcoes && (
                    <Select 
                      value={resposta?.resposta || ''} 
                      onValueChange={(v) => handleResposta(index, v)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {item.opcoes.map((op, i) => (
                          <SelectItem key={i} value={op}>{op}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {item.tipo_resposta === 'foto_obrigatoria' && (
                    <div className="space-y-3">
                      {resposta?.foto_url ? (
                        <div className="relative">
                          <img 
                            src={resposta.foto_url} 
                            alt="Foto" 
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                            onClick={() => handleClearFoto(index)}
                            disabled={readOnly}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 border-slate-700 hover:bg-slate-800 touch-btn"
                            onClick={() => handleCameraCapture(index)}
                            disabled={uploadingPhoto === index || readOnly}
                          >
                            {uploadingPhoto === index ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Camera className="w-4 h-4 mr-2" />
                            )}
                            Tirar Foto
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-slate-700 hover:bg-slate-800 touch-btn"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadFoto(index, file);
                              };
                              input.click();
                            }}
                            disabled={uploadingPhoto === index || readOnly}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {item.tipo_resposta !== 'foto_obrigatoria' && resposta?.foto_url && (
                    <div className="mt-3">
                      <div className="relative">
                        <img
                          src={resposta.foto_url}
                          alt="Foto"
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                          onClick={() => handleClearFoto(index)}
                          disabled={readOnly}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-slate-700"
              onClick={onFechar}
              disabled={isSaving}
            >
              {readOnly ? 'Fechar' : 'Cancelar'}
            </Button>
            {!readOnly && (
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 touch-btn"
                onClick={handleConcluir}
                disabled={isSaving || percentual < 100}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Concluir Checklist
                  </>
                )}
              </Button>
            )}
          </div>
          {!readOnly && percentual < 100 && (
            <p className="text-xs text-amber-400 text-center mt-2">
              Preencha todos os campos obrigatórios para concluir
            </p>
          )}
        </div>
      </div>
    </div>
  );
}








