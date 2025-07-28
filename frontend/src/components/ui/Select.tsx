/**
 * Select component
 */

import React from 'react';
import { clsx } from 'clsx';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, helperText, className, ...props }, ref) => {
    const selectClasses = clsx(
      'block w-full rounded-lg shadow-sm sm:text-sm',
      'bg-gray-800 dark:bg-gray-800 border-gray-700 dark:border-gray-700',
      'text-white dark:text-white',
      'focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-500 dark:focus:ring-blue-500',
      error && 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500',
      className
    );
    
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-300 dark:text-gray-300">
            {label}
          </label>
        )}
        
        <select
          ref={ref}
          className={selectClasses}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
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

Select.displayName = 'Select';