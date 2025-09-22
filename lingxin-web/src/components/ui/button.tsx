import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
      default: 'bg-blue-600 text-white hover:bg-blue-700',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
      outline: 'border border-gray-300 bg-white hover:bg-gray-50',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
      ghost: 'hover:bg-gray-100',
      link: 'text-blue-600 underline-offset-4 hover:underline'
    };
    
    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10'
    };
    
    return (
      <button
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
