import { useState } from 'react';
import { api } from '@/api/dataClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.auth.loginViaEmailPassword(email, password);
      window.location.href = '/';
    } catch (error) {
      toast.error(error.message || 'Falha ao entrar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      await api.auth.register({ email, password });
      toast.success('Cadastro realizado. Verifique seu email para confirmar.');
    } catch (error) {
      toast.error(error.message || 'Falha ao cadastrar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    try {
      await api.auth.loginWithProvider(provider, window.location.origin);
    } catch (error) {
      toast.error(error.message || 'Falha ao autenticar');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-amber-400">Casa do Serralheiro</h1>
          <p className="text-sm text-slate-400">Acesse sua conta</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu e-mail"
              className="bg-slate-950 border-slate-800"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="bg-slate-950 border-slate-800"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600"
            disabled={isLoading}
          >
            Entrar
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-xs text-slate-500">ou</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <div className="grid gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-slate-800"
            onClick={() => handleOAuth('google')}
          >
            Entrar com Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-slate-800"
            onClick={() => handleOAuth('github')}
          >
            Entrar com GitHub
          </Button>
        </div>

        <div className="text-center">
          <Button
            type="button"
            variant="ghost"
            className="text-slate-400 hover:text-white"
            onClick={handleRegister}
            disabled={isLoading}
          >
            Criar conta
          </Button>
        </div>
      </div>
    </div>
  );
}
