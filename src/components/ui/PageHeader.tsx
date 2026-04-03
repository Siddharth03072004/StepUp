import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PageHeaderMetric {
  icon?: LucideIcon;
  label: string;
  value: string;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  highlight?: string;
  description: string;
  badge?: string;
  metrics?: PageHeaderMetric[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  highlight,
  description,
  badge,
  metrics = [],
  actions,
  className,
}: PageHeaderProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn('hero-shell', className)}
    >
      <div className="ambient-ring -left-16 top-8 h-40 w-40 bg-cyan-300/10" />
      <div className="ambient-ring right-0 top-0 h-36 w-36 bg-amber-300/10" />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/80">{eyebrow}</p> : null}
            {badge ? <Badge variant="secondary">{badge}</Badge> : null}
          </div>
          <div className="space-y-3">
            <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl">
              {title}{' '}
              {highlight ? <span className="text-gradient">{highlight}</span> : null}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-200/72 sm:text-lg">
              {description}
            </p>
          </div>
          {metrics.length ? (
            <div className="flex flex-wrap gap-3">
              {metrics.map((metric) => {
                const Icon = metric.icon;

                return (
                  <div key={metric.label} className="metric-chip">
                    {Icon ? <Icon className="h-4 w-4 text-cyan-200" /> : null}
                    <span className="font-semibold text-white">{metric.value}</span>
                    <span className="text-slate-300/70">{metric.label}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {actions ? <div className="relative flex flex-wrap gap-3 lg:justify-end">{actions}</div> : null}
      </div>
    </motion.section>
  );
}
