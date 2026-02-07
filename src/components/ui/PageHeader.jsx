import React from 'react';
import { cn } from "@/lib/utils";

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
  iconColor = "text-primary",
  mobileInlineActions = true,
}) {
  return (
    <div className={cn("mb-6 lg:mb-8", className)}>
      <div
        className={cn(
          "gap-4",
          mobileInlineActions
            ? "flex items-start justify-between lg:flex-row lg:items-center lg:justify-between"
            : "flex flex-col lg:flex-row lg:items-center lg:justify-between"
        )}
      >
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-2 rounded-2xl bg-card border border-border">
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
          )}
          <div className="ml-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mt-2">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className={cn("flex items-center gap-3", mobileInlineActions && "mt-1 shrink-0")}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
