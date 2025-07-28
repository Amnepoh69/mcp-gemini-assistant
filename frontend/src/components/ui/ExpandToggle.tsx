/**
 * Reusable expand/collapse toggle component
 */

import React from 'react';

interface ExpandToggleProps {
  isExpanded: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6', 
  lg: 'w-7 h-7'
};

const iconSizeClasses = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5'
};

export const ExpandToggle: React.FC<ExpandToggleProps> = ({ 
  isExpanded, 
  size = 'md',
  className = '' 
}) => {
  return (
    <div className={`flex items-center justify-center ${sizeClasses[size]} rounded transition-all duration-200 ${
      isExpanded 
        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
    } ${className}`}>
      <svg 
        className={`${iconSizeClasses[size]} transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
};