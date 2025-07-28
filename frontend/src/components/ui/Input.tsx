/**
 * Input component
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, leftElement, rightElement, helperText, className, ...props }, ref) => {
    const inputClasses = clsx(
      'block w-full rounded-lg shadow-sm sm:text-sm',
      'bg-gray-800 dark:bg-gray-800 border-gray-700 dark:border-gray-700',
      'text-white dark:text-white placeholder-gray-500 dark:placeholder-gray-500',
      // Apply blue focus styles only when there's no error
      !error && 'focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-500 dark:focus:ring-blue-500',
      // Add left padding if there's an icon or leftElement
      icon && 'pl-10',
      leftElement && 'pl-8',
      rightElement && 'pr-10',
      // Error styles take precedence over focus styles
      error && 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500 dark:focus:border-red-500 dark:focus:ring-red-500',
      // Hide calendar icon for date inputs
      props.type === 'date' && '[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden',
      props.disabled && 'bg-gray-700 dark:bg-gray-900 cursor-not-allowed opacity-60',
      className
    );
    
    const IconComponent = icon;
    
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-300 dark:text-gray-300">
            {label}
          </label>
        )}
        
        <div className="relative">
          {IconComponent && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconComponent className="h-5 w-5 text-gray-500 dark:text-gray-500" />
            </div>
          )}
          {leftElement && (
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              {leftElement}
            </div>
          )}
          
          <input
            ref={ref}
            className={inputClasses}
            {...props}
            style={props.type === 'date' ? { 
              backgroundImage: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'textfield'
            } : undefined}
          />
          
          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-red-400 dark:text-red-400">{error}</p>
        )}
        
        {helperText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';