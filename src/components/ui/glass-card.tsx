import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'glow';
}

export function GlassCard({ 
  children, 
  className,
  variant = 'default' 
}: GlassCardProps) {
  const variants = {
    default: 'glass',
    subtle: 'glass-subtle',
    glow: 'glass glow-primary',
  };
  
  return (
    <div className={cn(
      variants[variant],
      'rounded-lg p-6 transition-all duration-300',
      className
    )}>
      {children}
    </div>
  );
}