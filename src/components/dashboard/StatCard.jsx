import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  color = 'blue',
  trend,
  trendUp,
  linkTo,
  onClick,
  className,
  size = 'default'
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', accent: 'bg-blue-500' },
    green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', accent: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', accent: 'bg-amber-500' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', accent: 'bg-red-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', accent: 'bg-purple-500' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', accent: 'bg-cyan-500' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', accent: 'bg-orange-500' },
    slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400', accent: 'bg-slate-500' },
  };

  const colors = colorMap[color] || colorMap.blue;

  const CardContent = (
    <div className={cn(
      "relative h-full overflow-hidden rounded-2xl border transition-all duration-300",
      "bg-card/55 backdrop-blur-sm border-border",
      colors.border,
      (linkTo || onClick) && "hover:scale-[1.02] hover:border-opacity-50 cursor-pointer active:scale-[0.98]",
      size === 'large' ? "p-6 lg:p-8" : "p-5 lg:p-6",
      className
    )}>
      {/* Gradient Accent */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20",
        colors.accent
      )} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className={cn(
            "p-3 rounded-xl",
            colors.bg
          )}>
            <Icon className={cn("w-6 h-6", colors.text)} />
          </div>
          {linkTo && (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        
        <div className="mt-4">
          <h3 className={cn(
            "font-bold text-foreground",
            size === 'large' ? "text-4xl lg:text-5xl" : "text-3xl"
          )}>
            {value}
          </h3>
          <p className="text-muted-foreground mt-1 font-medium">{title}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground/80 mt-1">{subtitle}</p>
          )}
        </div>

        {trend !== undefined && (
          <div className="mt-3 flex items-center gap-2">
            <span className={cn(
              "text-sm font-medium",
              trendUp ? "text-emerald-400" : "text-red-400"
            )}>
              {trendUp ? '↑' : '↓'} {trend}%
            </span>
            <span className="text-xs text-muted-foreground/80">vs ontem</span>
          </div>
        )}
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <Link to={createPageUrl(linkTo)} className="block w-full h-full">
        {CardContent}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full h-full text-left">
        {CardContent}
      </button>
    );
  }

  return CardContent;
}
