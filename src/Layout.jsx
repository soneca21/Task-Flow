import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { useAuth } from '@/lib/AuthContext';
import { useFuncionarioAtual } from '@/hooks/useFuncionarioAtual';
import PreCadastroFuncionarioDialog from '@/components/funcionarios/PreCadastroFuncionarioDialog';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  ClipboardList, 
  AlertTriangle,
  Users,
  UserCircle,
  ClipboardCheck,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Factory,
  Route,
  CalendarClock,
  Warehouse,
  FileText
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Toaster } from 'sonner';
import AgendamentoMonitor from '@/components/veiculos/AgendamentoMonitor';
import AutomacaoTarefas from '@/components/tarefas/AutomacaoTarefas';
import TextNormalizer from '@/components/TextNormalizer';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { data: funcionarioAtual, isLoading: isLoadingFuncionario } = useFuncionarioAtual();
  const [showPreCadastro, setShowPreCadastro] = useState(false);
  const [isMobileHeaderHidden, setIsMobileHeaderHidden] = useState(false);
  const mainRef = useRef(null);
  const lastScrollYRef = useRef(0);
  const scrollTickingRef = useRef(false);
  const role = user?.user_metadata?.role || '';
  const isAdmin = role === 'admin';
  const isManager = ['admin', 'lider'].includes(role);

  useEffect(() => {
    if (user && !isLoadingFuncionario && !funcionarioAtual) {
      setShowPreCadastro(true);
    }
  }, [user, funcionarioAtual, isLoadingFuncionario]);

  useEffect(() => {
    const getScrollTop = (target) => {
      const scrollingElement = document.scrollingElement || document.documentElement;
      const docY = scrollingElement ? scrollingElement.scrollTop : (window.scrollY || 0);

      if (!target || target === window || target === document || target === document.body || target === document.documentElement) {
        return docY;
      }

      const targetY = typeof target.scrollTop === 'number' ? target.scrollTop : 0;
      return targetY || docY;
    };

    const onScroll = (currentY) => {
      if (scrollTickingRef.current) return;
      scrollTickingRef.current = true;

      window.requestAnimationFrame(() => {
        const lastY = lastScrollYRef.current || 0;
        const delta = currentY - lastY;
        const threshold = 10;

        // Always show header near the top.
        if (currentY <= 8) {
          setIsMobileHeaderHidden(false);
        } else if (delta > threshold) {
          // Scrolling down: hide.
          setIsMobileHeaderHidden(true);
        } else if (delta < -threshold) {
          // Scrolling up: show.
          setIsMobileHeaderHidden(false);
        }

        lastScrollYRef.current = currentY;
        scrollTickingRef.current = false;
      });
    };

    const handleAnyScroll = (event) => {
      onScroll(getScrollTop(event?.target));
    };

    const scrollOptions = { passive: true, capture: true };
    lastScrollYRef.current = getScrollTop();

    window.addEventListener('scroll', handleAnyScroll, scrollOptions);
    document.addEventListener('scroll', handleAnyScroll, scrollOptions);

    const mainEl = mainRef.current;
    if (mainEl) {
      mainEl.addEventListener('scroll', handleAnyScroll, scrollOptions);
    }

    return () => {
      window.removeEventListener('scroll', handleAnyScroll, scrollOptions);
      document.removeEventListener('scroll', handleAnyScroll, scrollOptions);
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleAnyScroll, scrollOptions);
      }
    };
  }, []);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', color: 'text-blue-500' },
    { name: 'Tarefas', icon: ClipboardList, page: 'Tarefas', color: 'text-indigo-500' },
    { name: 'Expedição', icon: Package, page: 'Expedicao', color: 'text-purple-500' },
    { name: 'Produção', icon: Factory, page: 'Producao', color: 'text-amber-500' },
    { name: 'Agendamentos', icon: CalendarClock, page: 'Rotas', color: 'text-cyan-500' },
    { name: 'Veículos no Pátio', icon: Truck, page: 'Logistica', color: 'text-green-500' },
    { name: 'Pendências', icon: AlertTriangle, page: 'Pendencias', color: 'text-red-500' },
    { name: 'Relatórios', icon: FileText, page: 'Relatorios', color: 'text-teal-500' },
    { name: 'Meu Perfil', icon: UserCircle, page: 'MeuPerfil', color: 'text-amber-500' },
  ];

  const adminItems = [
    { name: 'Equipe', icon: Users, page: 'GestaoEquipe', color: 'text-orange-500', allow: isAdmin },
    { name: 'Avaliações', icon: ClipboardCheck, page: 'AvaliacaoEquipe', color: 'text-amber-500', allow: isManager },
    { name: 'Frentes de Trabalho', icon: Warehouse, page: 'FrentesTrabalho', color: 'text-lime-500', allow: isAdmin },
    { name: 'Configurações', icon: Settings, page: 'Configuracoes', color: 'text-slate-500', allow: isAdmin },
  ].filter((item) => item.allow);

  const handleLogout = () => {
    logout();
  };

  const currentTitle =
    menuItems.find((item) => item.page === currentPageName)?.name
    || adminItems.find((item) => item.page === currentPageName)?.name
    || 'Casa do Serralheiro';

  return (
    <>
      <Toaster position="top-right" expand={true} richColors closeButton />
      <AgendamentoMonitor />
      <AutomacaoTarefas />
      <TextNormalizer />
      <div className="min-h-screen bg-background text-foreground">
      <style>{`
        .touch-btn { min-height: 48px; min-width: 48px; }
        @media (max-width: 768px) { .touch-btn { min-height: 56px; min-width: 56px; } }
      `}</style>

      {/* Mobile Header */}
      <header className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-50",
        "bg-background/80 backdrop-blur-xl border-b border-border px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2",
        "transition-transform duration-300 will-change-transform",
        isMobileHeaderHidden ? "-translate-y-full" : "translate-y-0"
      )}>
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(true)}
            className="touch-btn text-foreground hover:bg-accent"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-base font-semibold text-foreground truncate max-w-[65vw]">{currentTitle}</h1>
          <div className="w-12" />
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border shadow-[2px_0_14px_rgba(0,0,0,0.35)] z-50 transform transition-transform duration-300",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-primary leading-tight">Casa do Serralheiro</h1>
                <p className="text-sm text-muted-foreground mt-0 leading-none">Sistema Operacional</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-foreground hover:bg-sidebar-accent"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all touch-btn",
                  currentPageName === item.page 
                    ? "bg-sidebar-accent text-sidebar-foreground" 
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", item.color)} />
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}

            {(isAdmin || isManager) && (
              <>
                <div className="pt-6 pb-2">
                  <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Administração
                  </p>
                </div>
                {adminItems.map((item) => (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all touch-btn",
                      currentPageName === item.page 
                        ? "bg-sidebar-accent text-sidebar-foreground" 
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", item.color)} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ))}
              </>
            )}
          </nav>

          {/* User */}
          {user && (
            <div className="p-3 border-t border-sidebar-border">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sidebar-accent/60">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                  <span className="text-primary font-bold">
                    {user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.user_metadata?.full_name || 'Usuário'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  {funcionarioAtual && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Score: {funcionarioAtual.tarefas_concluidas || 0}
                    </p>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        ref={mainRef}
        className={cn(
          "min-h-screen transition-all duration-300",
          "lg:ml-72",
          isMobileHeaderHidden ? "pt-4" : "pt-16",
          "lg:pt-0"
        )}>
        <div className="p-4 lg:p-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-6">
          {children}
        </div>
      </main>

      <MobileBottomNav currentPageName={currentPageName} />

      <PreCadastroFuncionarioDialog
        open={showPreCadastro}
        onOpenChange={setShowPreCadastro}
        user={user}
      />
      </div>
    </>
  );
}

