'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'monochrome' | 'blue' | 'amber' | 'emerald' | 'purple' | 'red' | 'cyan';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'monochrome',
  size = 'md',
  className,
}) => {
  const baseStyles = 'inline-flex items-center font-mono font-medium rounded-md tracking-wide uppercase';

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variantStyles = {
    monochrome: 'bg-neutral-900 text-neutral-300 border border-neutral-800',
    blue: 'bg-blue-950/60 text-blue-400 border border-blue-500/30',
    amber: 'bg-amber-950/60 text-amber-400 border border-amber-500/30',
    emerald: 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30',
    purple: 'bg-purple-950/60 text-purple-400 border border-purple-500/30',
    red: 'bg-red-950/60 text-red-400 border border-red-500/30',
    cyan: 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30',
  };

  return (
    <span className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}>
      {children}
    </span>
  );
};
