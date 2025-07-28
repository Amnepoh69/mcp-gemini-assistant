/**
 * Card component for displaying content in containers
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  variant = 'default',
  ...props 
}) => {
  return (
    <div
      className={cn(
        'rounded-lg',
        {
          'bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700': variant === 'default',
          'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700': variant === 'outlined',
          'bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700': variant === 'elevated',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};