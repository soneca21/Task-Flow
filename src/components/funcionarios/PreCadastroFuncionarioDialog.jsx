import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/dataClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function PreCadastroFuncionarioDialog({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cargo: '',
    vinculo: 'da_casa',
  });

  useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        nome: prev.nome || user?.user_metadata?.full_name || user?.email || '',
      }));
    }
  }, [open, user]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      return api.entities.Funcionario.create({
        user_id: user.id,
        nome: data.nome,
        telefone: data.telefone || null,
        cargo: data.cargo || null,
        vinculo: data.vinculo || 'da_casa',
        nivel_acesso: 'operador',
        status: 'disponivel',
        capacidade_tarefas: 1,
        frentes_trabalho: [],
        ativo: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionario-atual'] });
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      toast.success('Pré-cadastro enviado!');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Não foi possível criar o cadastro.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nome) {
      toast.error('Informe seu nome');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Pré-cadastro de Funcionário</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-400">
          Complete os dados básicos. O admin poderá complementar ou ajustar depois.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Nome completo *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="bg-slate-800 border-slate-700 mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vínculo</Label>
              <Select
                value={formData.vinculo}
                onValueChange={(v) => setFormData({ ...formData, vinculo: v })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="da_casa">Da Casa</SelectItem>
                  <SelectItem value="terceirizado">Terceirizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="bg-slate-800 border-slate-700 mt-1"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div>
            <Label>Cargo/Função</Label>
            <Input
              value={formData.cargo}
              onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
              className="bg-slate-800 border-slate-700 mt-1"
              placeholder="Ex: Operador de Perfiladeira"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Salvando...' : 'Enviar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

