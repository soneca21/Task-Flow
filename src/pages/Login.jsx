import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast, Toaster } from 'sonner';

const isRecoveryUrl = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery';
};

const clearRecoveryParamsFromUrl = () => {
  const url = new URL(window.location.href);
  const keysToRemove = ['type', 'token', 'token_hash', 'access_token', 'refresh_token', 'expires_in', 'expires_at'];
  keysToRemove.forEach((key) => url.searchParams.delete(key));
  url.hash = '';
  const query = url.searchParams.toString();
  const nextUrl = `${url.pathname}${query ? `?${query}` : ''}`;
  window.history.replaceState({}, document.title, nextUrl);
};

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(() => isRecoveryUrl());
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && !isRecoveryFlow) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, isRecoveryFlow, navigate]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryFlow(true);
      }
    });

    if (isRecoveryUrl()) {
      setIsRecoveryFlow(true);
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const exchangeRecoveryToken = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      if (type !== 'recovery' || !tokenHash) return;

      const { error } = await supabase.auth.verifyOtp({
        type: 'recovery',
        token_hash: tokenHash,
      });

      if (error) {
        toast.error('Link de recuperacao invalido ou expirado.');
        return;
      }

      setIsRecoveryFlow(true);
    };

    exchangeRecoveryToken();
  }, []);

  const submitLabel = useMemo(() => {
    if (isRecoveryFlow) return 'Redefinir senha';
    return mode === 'register' ? 'Criar conta' : 'Entrar';
  }, [mode, isRecoveryFlow]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.auth.loginViaEmailPassword(email, password);
      navigate('/', { replace: true });
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
        toast.error('As senhas nao coincidem.');
        return;
      }

      const data = await api.auth.register({ email, password });
      // If email confirmation is OFF, Supabase can return a session and user is already logged in.
      if (data?.session) {
        navigate('/', { replace: true });
        return;
      }
      toast.success('Conta criada. Se sua conta exigir confirmacao, verifique seu e-mail.');
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

  const handleForgotPassword = async () => {
    const targetEmail = String(email || '').trim();
    if (!targetEmail) {
      toast.error('Informe seu e-mail para recuperar a senha.');
      return;
    }

    setIsSendingRecovery(true);
    try {
      await api.auth.sendPasswordRecovery(targetEmail, `${window.location.origin}/login`);
      toast.success('Enviamos o link de recuperacao para seu e-mail.');
    } catch (error) {
      toast.error(error?.message || 'Nao foi possivel enviar o e-mail de recuperacao.');
    } finally {
      setIsSendingRecovery(false);
    }
  };

  const handleRecoveryReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!password || password.length < 6) {
        toast.error('A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('As senhas nao coincidem.');
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data?.session) {
        throw new Error('Link invalido ou expirado. Solicite uma nova recuperacao.');
      }

      await api.auth.changePassword(password, {
        currentPassword: currentPassword || undefined,
      });
      clearRecoveryParamsFromUrl();
      toast.success('Senha redefinida com sucesso.');
      setIsRecoveryFlow(false);
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error?.message || 'Nao foi possivel redefinir a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" expand={true} richColors closeButton />
      <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground px-4 py-10 sm:px-6 sm:py-6 overflow-auto">
        <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-5 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-amber-400">Casa do Serralheiro</h1>
            <p className="text-sm text-muted-foreground">
              {isRecoveryFlow ? 'Defina sua nova senha' : mode === 'register' ? 'Crie sua conta' : 'Acesse sua conta'}
            </p>
          </div>

          <form onSubmit={isRecoveryFlow ? handleRecoveryReset : mode === 'register' ? handleRegister : handleLogin} className="space-y-4">
            {!isRecoveryFlow && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu e-mail"
                  className="bg-background border-border h-12 text-base"
                  required
                />
              </div>
            )}

            {isRecoveryFlow && (
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="bg-background border-border h-12 text-base"
                  autoComplete="current-password"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">{isRecoveryFlow ? 'Nova senha' : 'Senha'}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRecoveryFlow ? 'Minimo 6 caracteres' : 'Sua senha'}
                className="bg-background border-border h-12 text-base"
                required
              />
            </div>

            {mode === 'login' && !isRecoveryFlow && (
              <div className="flex justify-end -mt-2">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs text-amber-500 hover:text-amber-600"
                  onClick={handleForgotPassword}
                  disabled={isLoading || isSendingRecovery}
                >
                  {isSendingRecovery ? 'Enviando...' : 'Esqueci minha senha'}
                </Button>
              </div>
            )}

            {(mode === 'register' || isRecoveryFlow) && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita sua senha"
                  className="bg-background border-border h-12 text-base"
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 h-12 text-base" disabled={isLoading}>
              {submitLabel}
            </Button>
          </form>

          {mode === 'login' && !isRecoveryFlow && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-card" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="h-px flex-1 bg-card" />
              </div>

              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-border h-12 text-base"
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
              variant="outline"
              className="border-border text-foreground hover:text-foreground hover:bg-card/70"
              onClick={() => {
                if (isRecoveryFlow) {
                  clearRecoveryParamsFromUrl();
                  setIsRecoveryFlow(false);
                  setMode('login');
                  setCurrentPassword('');
                  setPassword('');
                  setConfirmPassword('');
                  return;
                }
                setMode((m) => (m === 'login' ? 'register' : 'login'));
              }}
              disabled={isLoading}
            >
              {isRecoveryFlow ? 'Voltar ao login' : mode === 'login' ? 'Criar conta' : 'Ja tenho conta'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
