import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface SecureButtonProps extends ButtonProps {
  children: ReactNode;
  glow?: boolean;
  loading?: boolean;
}

export function SecureButton({ 
  children, 
  className,
  glow = false,
  loading = false,
  disabled,
  ...props 
}: SecureButtonProps) {
  return (
    <Button
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        'bg-gradient-to-r from-primary to-secondary',
        'hover:from-primary-glow hover:to-secondary-glow',
        'text-primary-foreground font-semibold',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
        'before:translate-x-[-200%] hover:before:translate-x-[200%]',
        'before:transition-transform before:duration-700',
        glow && 'glow-primary animate-glow-pulse',
        loading && 'opacity-70 cursor-wait',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          Processing...
        </div>
      ) : (
        children
      )}
    </Button>
  );
}