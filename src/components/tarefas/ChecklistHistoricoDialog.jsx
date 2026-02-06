import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/api/dataClient';
import { cn, fixMojibakePtBr } from '@/lib/utils';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, History, User, ClipboardList, X } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '';
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm');
  } catch {
    return '';
  }
};

const formatResposta = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (value === 'sim') return 'Sim';
  if (value === 'nao') return 'Não';
  return String(value);
};

export default function ChecklistHistoricoDialog({ open, onOpenChange, tarefa, checklists = [] }) {
  const [expandedId, setExpandedId] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });
  const [previewDragging, setPreviewDragging] = useState(false);
  const [previewDragStart, setPreviewDragStart] = useState({ x: 0, y: 0 });
  const checklistMap = useMemo(
    () => new Map(checklists.map((c) => [String(c.id), c])),
    [checklists]
  );

  const tarefaId = tarefa?.id;
  const { data: execucoes = [], isLoading } = useQuery({
    queryKey: ['checklist-execucao', tarefaId],
    queryFn: () => api.entities.ChecklistExecucao.filter({ tarefa_id: tarefaId }, '-created_date', 200),
    enabled: Boolean(tarefaId && open),
  });

  useEffect(() => {
    if (!open) {
      setExpandedId(null);
      closeFotoPreview();
    }
  }, [open, tarefaId]);

  const openFotoPreview = (url, titulo) => {
    if (!url) return;
    setPreviewScale(1);
    setPreviewOffset({ x: 0, y: 0 });
    setPreviewDragging(false);
    setFotoPreview({ url, titulo });
  };

  const closeFotoPreview = () => {
    setFotoPreview(null);
    setPreviewScale(1);
    setPreviewOffset({ x: 0, y: 0 });
    setPreviewDragging(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white inset-auto left-1/2 top-1/2 h-auto max-h-[90vh] w-[95vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 rounded-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Checklists</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {tarefa?.titulo && (
            <div className="text-sm text-slate-400">
              Tarefa: <span className="text-white font-medium">{fixMojibakePtBr(tarefa.titulo)}</span>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-10 text-slate-400">Carregando histórico...</div>
          )}

          {!isLoading && execucoes.length === 0 && (
            <div className="text-center py-10 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
              <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">Nenhuma execução registrada</p>
            </div>
          )}

          {!isLoading && execucoes.map((execucao) => {
            const checklistInfo = checklistMap.get(String(execucao.checklist_id));
            const checklistNome = checklistInfo?.nome || execucao.checklist_id || 'Checklist';
            const status = execucao.status === 'concluido' ? 'concluido' : 'salvo';
            const totalRespostas = Array.isArray(execucao.respostas) ? execucao.respostas.length : 0;
            const isExpanded = expandedId === execucao.id;

            return (
              <div key={execucao.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-300">
                      {formatDate(execucao.created_date) || 'Data não informada'}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <ClipboardList className="w-3 h-3" />
                      {fixMojibakePtBr(checklistNome)}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {fixMojibakePtBr(execucao.funcionario_nome) || execucao.funcionario_id || 'Responsável não informado'}
                    </p>
                    {execucao.data_conclusao && (
                      <p className="text-xs text-green-400">
                        Concluído em {formatDate(execucao.data_conclusao)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full border",
                        status === 'concluido'
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      )}
                    >
                      {status === 'concluido' ? 'Concluído' : 'Salvo'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-white"
                      onClick={() => setExpandedId(isExpanded ? null : execucao.id)}
                      title={isExpanded ? 'Ocultar respostas' : 'Ver respostas'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-slate-800/60 pt-4 space-y-3">
                    {totalRespostas === 0 && (
                      <p className="text-sm text-slate-500">Sem respostas registradas.</p>
                    )}
                    {Array.isArray(execucao.respostas) && execucao.respostas.map((resposta, idx) => (
                      <div key={`${execucao.id}-${idx}`} className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 space-y-2">
                        <div className="text-sm text-white">
                          {fixMojibakePtBr(resposta?.item) || `Item ${idx + 1}`}
                        </div>
                        <div className="text-xs text-slate-400">
                          Resposta: <span className="text-slate-200">{formatResposta(resposta?.resposta)}</span>
                        </div>
                        {resposta?.data_hora && (
                          <div className="text-[11px] text-slate-500">
                            {formatDate(resposta.data_hora)}
                          </div>
                        )}
                        {resposta?.foto_url && (
                          <div className="pt-2">
                            <img
                              src={resposta.foto_url}
                              alt="Foto do checklist"
                              className="w-full max-h-64 object-cover rounded-lg border border-slate-700 cursor-zoom-in"
                              loading="lazy"
                              onClick={() => openFotoPreview(resposta.foto_url, resposta?.item)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {fotoPreview?.url && (
          <div
            className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"
            onClick={closeFotoPreview}
            role="dialog"
            aria-label="Visualizar foto do checklist"
          >
            <div
              className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
              onMouseUp={() => setPreviewDragging(false)}
              onMouseLeave={() => setPreviewDragging(false)}
              onMouseMove={(e) => {
                if (!previewDragging) return;
                const dx = e.clientX - previewDragStart.x;
                const dy = e.clientY - previewDragStart.y;
                setPreviewOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
                setPreviewDragStart({ x: e.clientX, y: e.clientY });
              }}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                setPreviewScale((prev) => Math.min(4, Math.max(1, Number((prev + delta).toFixed(2)))));
              }}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute -top-3 -right-3 bg-black/70 hover:bg-black/80 text-white"
                onClick={closeFotoPreview}
                aria-label="Fechar visualização da foto"
              >
                <X className="w-4 h-4" />
              </Button>
              <img
                src={fotoPreview.url}
                alt={fotoPreview.titulo || 'Foto do checklist'}
                className="max-h-[90vh] w-auto max-w-full rounded-lg object-contain cursor-grab"
                style={{ transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewScale})` }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setPreviewDragging(true);
                  setPreviewDragStart({ x: e.clientX, y: e.clientY });
                }}
              />
              {fotoPreview.titulo && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full">
                  {fixMojibakePtBr(fotoPreview.titulo)}
                </div>
              )}
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] px-2 py-1 rounded-full">
                Zoom: {Math.round(previewScale * 100)}%
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
