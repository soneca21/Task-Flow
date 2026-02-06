import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Factory, Package } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const items = [
  { page: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'Tarefas', label: 'Tarefas', icon: ClipboardList },
  { page: 'Producao', label: 'Produção', icon: Factory },
  { page: 'Expedicao', label: 'Expedição', icon: Package },
];

export default function MobileBottomNav({ currentPageName }) {
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    const mediaStandalone = window.matchMedia?.('(display-mode: standalone)');
    const mediaFullscreen = window.matchMedia?.('(display-mode: fullscreen)');
    const mediaMinimal = window.matchMedia?.('(display-mode: minimal-ui)');
    const check = () => setIsPwa(Boolean(
      window.navigator?.standalone ||
      mediaStandalone?.matches ||
      mediaFullscreen?.matches ||
      mediaMinimal?.matches
    ));
    check();
    const onChange = () => check();
    mediaStandalone?.addEventListener?.('change', onChange);
    mediaFullscreen?.addEventListener?.('change', onChange);
    mediaMinimal?.addEventListener?.('change', onChange);
    return () => {
      mediaStandalone?.removeEventListener?.('change', onChange);
      mediaFullscreen?.removeEventListener?.('change', onChange);
      mediaMinimal?.removeEventListener?.('change', onChange);
    };
  }, []);

  if (!isPwa) {
    return null;
  }

  return (
    <nav
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-50 pwa-only",
        "border-t border-border bg-background/80 backdrop-blur-xl",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      aria-label="Navegação principal"
    >
      <div className="mx-auto max-w-xl px-3 py-2 grid grid-cols-4 gap-2">
        {items.map((item) => {
          const active = currentPageName === item.page;
          const Icon = item.icon;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl px-2 py-2 transition-colors",
                "min-h-[52px]",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium leading-none mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
