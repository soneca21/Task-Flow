import { useMemo, useState } from 'react';
import { api } from '@/api/dataClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submitLabel = useMemo(() => (mode === 'register' ? 'Criar conta' : 'Entrar'), [mode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.auth.loginViaEmailPassword(email, password);
      window.location.href = '/';
    } catch (error) {
      toast.error(error?.message || 'Falha ao entrar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!email) {
        toast.error('Informe seu e-mail.');
        return;
      }
      if (!password || password.length < 6) {
        toast.error('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('As senhas não coincidem.');
        return;
      }

      const data = await api.auth.register({ email, password });
      // If email confirmation is OFF, Supabase can return a session and user is already logged in.
      if (data?.session) {
        window.location.href = '/';
        return;
      }
      toast.success('Conta criada. Se sua conta exigir confirmação, verifique seu e-mail.');
      setMode('login');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error?.message || 'Falha ao cadastrar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    try {
      await api.auth.loginWithProvider(provider, window.location.origin);
    } catch (error) {
      toast.error(error?.message || 'Falha ao autenticar');
    }
  };

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center bg-slate-950 text-white p-4 sm:p-6 pt-10 sm:pt-6">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-amber-400">Casa do Serralheiro</h1>
          <p className="text-sm text-slate-400">{mode === 'register' ? 'Crie sua conta' : 'Acesse sua conta'}</p>
        </div>

        <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu e-mail"
              className="bg-slate-950 border-slate-800 h-12 text-base"
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
              className="bg-slate-950 border-slate-800 h-12 text-base"
              required
            />
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita sua senha"
                className="bg-slate-950 border-slate-800 h-12 text-base"
                required
              />
            </div>
          )}

          <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 h-12 text-base" disabled={isLoading}>
            {submitLabel}
          </Button>
        </form>

        {mode === 'login' && (
          <>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-xs text-slate-500">ou</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-800 h-12 text-base"
                onClick={() => handleOAuth('google')}
              >
                Entrar com Google
              </Button>
            </div>
          </>
        )}

        <div className="text-center">
          <Button
            type="button"
            variant="ghost"
            className="text-slate-400 hover:text-white"
            onClick={() => setMode((m) => (m === 'login' ? 'register' : 'login'))}
            disabled={isLoading}
          >
            {mode === 'login' ? 'Criar conta' : 'Já tenho conta'}
          </Button>
        </div>
      </div>
    </div>
  );
}

