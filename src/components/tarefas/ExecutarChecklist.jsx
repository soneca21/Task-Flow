import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/api/dataClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Camera, 
  CheckCircle, 
  X,
  Upload,
  Save,
  Loader2,
  WifiOff
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
  const [fotoPreview, setFotoPreview] = useState(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });
  const [previewDragging, setPreviewDragging] = useState(false);
  const [previewDragStart, setPreviewDragStart] = useState({ x: 0, y: 0 });
  const previewPinchRef = useRef({
    active: false,
    startDistance: 0,
    startScale: 1,
    lastCenter: null,
  });

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
  }, []);

  useEffect(() => {
    let active = true;

    const carregarRespostas = async () => {
      const saved = localStorage.getItem(`checklist_${tarefa.id}`);
      const savedParsed = saved ? JSON.parse(saved) : null;
      let execucao = null;

      if (!isOffline) {
        try {
          const rows = await api.entities.ChecklistExecucao.filter(
            { tarefa_id: tarefa.id },
            '-created_date',
            1
          );
          execucao = rows?.[0] || null;
        } catch (error) {
          // Best-effort
        }
      }

      if (!active) return;

      if (!readOnly && Array.isArray(savedParsed) && savedParsed.length > 0) {
        setRespostas(savedParsed);
      } else if (Array.isArray(execucao?.respostas) && execucao.respostas.length > 0) {
        setRespostas(execucao.respostas);
      } else if (Array.isArray(tarefa.checklist_preenchido) && tarefa.checklist_preenchido.length > 0) {
        setRespostas(tarefa.checklist_preenchido);
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

    };

    carregarRespostas();
    return () => {
      active = false;
    };
  }, [tarefa.id, tarefa.checklist_preenchido, checklist, readOnly, isOffline]);

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

  const openFotoPreview = (url, titulo) => {
    if (!url) return;
    setPreviewScale(1);
    setPreviewOffset({ x: 0, y: 0 });
    setPreviewDragging(false);
    previewPinchRef.current = {
      active: false,
      startDistance: 0,
      startScale: 1,
      lastCenter: null,
    };
    setFotoPreview({ url, titulo });
  };

  const closeFotoPreview = () => {
    setFotoPreview(null);
    setPreviewScale(1);
    setPreviewOffset({ x: 0, y: 0 });
    setPreviewDragging(false);
    previewPinchRef.current = {
      active: false,
      startDistance: 0,
      startScale: 1,
      lastCenter: null,
    };
  };

  const clampPreviewScale = (value) => Math.min(4, Math.max(1, Number(value.toFixed(2))));

  const getTouchDistance = (touches) => {
    if (touches.length < 2) return 0;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.hypot(dx, dy);
  };

  const getTouchCenter = (touches) => {
    if (touches.length < 2) return null;
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handlePreviewTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      previewPinchRef.current = {
        active: true,
        startDistance: getTouchDistance(e.touches),
        startScale: previewScale,
        lastCenter: getTouchCenter(e.touches),
      };
      setPreviewDragging(false);
      return;
    }

    if (e.touches.length === 1 && previewScale > 1) {
      const touch = e.touches[0];
      setPreviewDragging(true);
      setPreviewDragStart({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handlePreviewTouchMove = (e) => {
    if (e.touches.length === 2 && previewPinchRef.current.active) {
      e.preventDefault();
      const nextDistance = getTouchDistance(e.touches);
      const nextCenter = getTouchCenter(e.touches);
      const pinchRatio = previewPinchRef.current.startDistance > 0
        ? nextDistance / previewPinchRef.current.startDistance
        : 1;
      const nextScale = clampPreviewScale(previewPinchRef.current.startScale * pinchRatio);
      setPreviewScale(nextScale);

      if (previewPinchRef.current.lastCenter && nextCenter) {
        const dx = nextCenter.x - previewPinchRef.current.lastCenter.x;
        const dy = nextCenter.y - previewPinchRef.current.lastCenter.y;
        setPreviewOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      }

      previewPinchRef.current.lastCenter = nextCenter;
      if (nextScale <= 1) {
        setPreviewOffset({ x: 0, y: 0 });
      }
      return;
    }

    if (e.touches.length === 1 && previewDragging && previewScale > 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - previewDragStart.x;
      const dy = touch.clientY - previewDragStart.y;
      setPreviewOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setPreviewDragStart({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handlePreviewTouchEnd = (e) => {
    if (e.touches.length < 2) {
      previewPinchRef.current.active = false;
      previewPinchRef.current.startDistance = 0;
      previewPinchRef.current.startScale = previewScale;
      previewPinchRef.current.lastCenter = null;
    }

    if (e.touches.length === 1 && previewScale > 1) {
      const touch = e.touches[0];
      setPreviewDragging(true);
      setPreviewDragStart({ x: touch.clientX, y: touch.clientY });
      return;
    }

    if (e.touches.length === 0) {
      setPreviewDragging(false);
    }
  };

  const isDataUrl = (value) => typeof value === 'string' && value.startsWith('data:image/');

  const dataUrlToFile = (dataUrl, fileNameBase = 'checklist-foto') => {
    const [header, base64] = dataUrl.split(',');
    if (!base64) return null;
    const match = header.match(/data:(image\/[^;]+);base64/i);
    const mime = match?.[1] || 'image/jpeg';
    const ext = mime.split('/')[1] || 'jpg';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], `${fileNameBase}.${ext}`, { type: mime });
  };

  const uploadDataUrlIfNeeded = async (resposta, index) => {
    if (!resposta?.foto_url || !isDataUrl(resposta.foto_url)) return resposta;
    const file = dataUrlToFile(resposta.foto_url, `checklist-${tarefa.id}-${index}`);
    if (!file) return resposta;
    const { file_url } = await api.integrations.Core.UploadFile({ file });
    return { ...resposta, foto_url: file_url };
  };

  const pickImageFile = (source = 'gallery') => new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') {
      input.capture = 'environment';
    }
    input.style.display = 'none';
    const cleanup = () => {
      if (input.parentNode) input.parentNode.removeChild(input);
    };
    input.onchange = (e) => {
      const file = e.target.files?.[0] || null;
      cleanup();
      resolve(file);
    };
    document.body.appendChild(input);
    input.click();
  });

  const handlePickFoto = async (index, source = 'gallery') => {
    if (readOnly) return;
    const file = await pickImageFile(source);
    if (file) handleUploadFoto(index, file);
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

  const handleSalvarChecklist = async () => {
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
          checklistId: tarefa.checklist_id,
          funcionarioId: funcionarioAtual?.id || null,
          funcionarioNome: funcionarioAtual?.nome || null,
          respostas,
          timestamp: new Date().toISOString(),
        }));
      } else {
        const respostasUpload = await Promise.all(
          respostas.map((r, i) => uploadDataUrlIfNeeded(r, i))
        );
        await api.entities.ChecklistExecucao.create({
          tarefa_id: tarefa.id,
          checklist_id: tarefa.checklist_id || checklist?.id || null,
          funcionario_id: funcionarioAtual?.id || null,
          funcionario_nome: funcionarioAtual?.nome || null,
          status: 'salvo',
          respostas: respostasUpload,
        });

        // Atualizar tarefa com último checklist preenchido (sem concluir)
        await api.entities.Tarefa.update(tarefa.id, {
          checklist_preenchido: respostasUpload,
        });

        // Log de auditoria
        await api.audit.log({
          acao: 'salvar_checklist',
          entidade: 'Tarefa',
          entidade_id: tarefa.id,
          descricao: `Checklist salvo para tarefa ${tarefa.titulo}`,
        });

        // Atualizar localStorage com o último conteúdo salvo
        localStorage.setItem(`checklist_${tarefa.id}`, JSON.stringify(respostasUpload));
        localStorage.removeItem(`checklist_pending_${tarefa.id}`);

        queryClient.invalidateQueries({ queryKey: ['tarefas'] });
        toast.success('Checklist salvo com sucesso!');
      }

      onConcluir?.();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || error?.details || 'Erro ao salvar checklist');
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

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#0b0b0b] flex items-start justify-center px-4 pb-4 pt-4 sm:items-center sm:p-6 sm:pt-4">
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
                  {!readOnly && item.tipo_resposta !== 'foto_obrigatoria' && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-white"
                        onClick={() => handlePickFoto(index, 'camera')}
                        disabled={uploadingPhoto === index}
                        title="Tirar foto"
                      >
                        {uploadingPhoto === index ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-white"
                        onClick={() => handlePickFoto(index, 'gallery')}
                        disabled={uploadingPhoto === index}
                        title="Escolher da galeria"
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
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
                            className="w-full h-48 object-cover rounded-lg cursor-zoom-in"
                            onClick={() => openFotoPreview(resposta.foto_url, item.pergunta)}
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
                            onClick={() => handlePickFoto(index, 'camera')}
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
                            onClick={() => handlePickFoto(index, 'gallery')}
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
                          className="w-full h-40 object-cover rounded-lg cursor-zoom-in"
                          onClick={() => openFotoPreview(resposta.foto_url, item.pergunta)}
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
              className="flex-1 border-slate-700 touch-btn"
              onClick={onFechar}
              disabled={isSaving}
            >
              {readOnly ? 'Fechar' : 'Cancelar'}
            </Button>
            {!readOnly && (
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 touch-btn"
              onClick={handleSalvarChecklist}
              disabled={isSaving || percentual < 100}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Checklist
                </>
              )}
            </Button>
          )}
        </div>
        {!readOnly && percentual < 100 && (
          <p className="text-xs text-amber-400 text-center mt-2">
            Preencha todos os campos obrigatórios para salvar
          </p>
        )}
        </div>
      </div>
      {fotoPreview?.url && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={closeFotoPreview}
          role="dialog"
          aria-label="Visualizar foto do checklist"
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center"
            data-allow-pinch-zoom="true"
            onClick={(e) => e.stopPropagation()}
            onMouseUp={() => setPreviewDragging(false)}
            onMouseLeave={() => setPreviewDragging(false)}
            onMouseMove={(e) => {
              if (!previewDragging || previewScale <= 1) return;
              const dx = e.clientX - previewDragStart.x;
              const dy = e.clientY - previewDragStart.y;
              setPreviewOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
              setPreviewDragStart({ x: e.clientX, y: e.clientY });
            }}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -0.1 : 0.1;
              setPreviewScale((prev) => {
                const nextScale = clampPreviewScale(prev + delta);
                if (nextScale <= 1) {
                  setPreviewOffset({ x: 0, y: 0 });
                }
                return nextScale;
              });
            }}
            onTouchStart={handlePreviewTouchStart}
            onTouchMove={handlePreviewTouchMove}
            onTouchEnd={handlePreviewTouchEnd}
            onTouchCancel={handlePreviewTouchEnd}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -top-3 -right-3 bg-black/70 hover:bg-black/80 text-white"
              onClick={closeFotoPreview}
              aria-label="Fechar visualizaÃ§Ã£o da foto"
            >
              <X className="w-4 h-4" />
            </Button>
            <img
              src={fotoPreview.url}
              alt={fotoPreview.titulo || 'Foto do checklist'}
              className={cn(
                "max-h-[90vh] w-auto max-w-full rounded-lg object-contain touch-none",
                previewScale > 1 ? (previewDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
              )}
              style={{ transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewScale})` }}
              onMouseDown={(e) => {
                if (previewScale <= 1) return;
                e.preventDefault();
                setPreviewDragging(true);
                setPreviewDragStart({ x: e.clientX, y: e.clientY });
              }}
            />
            {fotoPreview.titulo && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full">
                {fotoPreview.titulo}
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] px-2 py-1 rounded-full">
              Zoom: {Math.round(previewScale * 100)}%
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
