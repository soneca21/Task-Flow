import { useLocation } from 'react-router-dom';
import { api } from '@/api/dataClient';
import { useQuery } from '@tanstack/react-query';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  const { data: authData, isFetched } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await api.auth.me();
        return { user, isAuthenticated: true };
      } catch {
        return { user: null, isAuthenticated: false };
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white">
      <div className="max-w-md w-full">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-7xl font-light text-slate-600">404</h1>
            <div className="h-0.5 w-16 bg-slate-700 mx-auto" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-medium text-white">Página não encontrada</h2>
            <p className="text-slate-400 leading-relaxed">
              A página <span className="font-medium text-slate-200">"{pageName}"</span> não foi encontrada.
            </p>
          </div>

          {isFetched && authData?.isAuthenticated && authData.user?.user_metadata?.role === 'admin' && (
            <div className="mt-8 p-4 bg-slate-900 rounded-lg border border-slate-800">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                </div>
                <div className="text-left space-y-1">
                  <p className="text-sm font-medium text-slate-200">Nota do Admin</p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Esta rota ainda não foi implementada. Peça no chat para criar a página.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-6">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="inline-flex items-center justify-center rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-400"
            >
              Voltar para o início
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
