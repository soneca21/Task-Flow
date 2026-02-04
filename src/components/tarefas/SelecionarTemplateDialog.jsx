import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Layers } from 'lucide-react';
import { cn, fixMojibakePtBr } from '@/lib/utils';

export default function SelecionarTemplateDialog({ open, onOpenChange, templates, onSelect }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => {
      const hay = [
        t?.nome,
        t?.descricao,
        t?.tipo,
        t?.frente_trabalho_nome,
        t?.prioridade,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [search, templates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Selecionar Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, tipo ou frente..."
              className="bg-slate-800 border-slate-700 pl-9"
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filtered.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelect?.(tpl)}
                className={cn(
                  'text-left p-4 rounded-xl border transition-all',
                  'bg-slate-900/40 border-slate-800 hover:border-slate-600 hover:bg-slate-900/60'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{fixMojibakePtBr(tpl.nome)}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {fixMojibakePtBr(tpl.descricao) || 'Sem descrição'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {tpl.tipo && (
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {tpl.tipo}
                        </span>
                      )}
                      {tpl.frente_trabalho_nome && (
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {fixMojibakePtBr(tpl.frente_trabalho_nome)}
                        </span>
                      )}
                      {tpl.prioridade && (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {tpl.prioridade}
                        </span>
                      )}
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-200"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelect?.(tpl);
                    }}
                  >
                    Usar
                  </Button>
                </div>
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-10 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
                <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum template encontrado</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


