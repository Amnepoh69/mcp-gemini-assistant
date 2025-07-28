/**
 * Simple DatePicker component without external dependencies
 */

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface SimpleDatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  error?: string;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  disabled?: boolean;
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const SimpleDatePicker: React.FC<SimpleDatePickerProps> = ({
  value,
  onChange,
  error,
  minDate,
  maxDate,
  placeholder = 'ДД.ММ.ГГГГ',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth());
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse date string to Date object
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  // Format date for display
  const formatDateForDisplay = (dateStr: string): string => {
    const date = parseDate(dateStr);
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Get days in month
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (year: number, month: number): number => {
    const firstDay = new Date(year, month, 1).getDay();
    // Convert to Monday-based (0 = Monday, 6 = Sunday)
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  // Check if date is disabled
  const isDateDisabled = (year: number, month: number, day: number): boolean => {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    
    return false;
  };

  // Handle date selection
  const handleDateSelect = (day: number) => {
    // Format date without timezone issues
    const dateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange?.(dateStr);
    setIsOpen(false);
  };

  // Handle month/year navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (displayMonth === 0) {
        setDisplayMonth(11);
        setDisplayYear(displayYear - 1);
      } else {
        setDisplayMonth(displayMonth - 1);
      }
    } else {
      if (displayMonth === 11) {
        setDisplayMonth(0);
        setDisplayYear(displayYear + 1);
      } else {
        setDisplayMonth(displayMonth + 1);
      }
    }
  };

  // Handle year change
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDisplayYear(parseInt(e.target.value));
  };

  // Handle month change
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDisplayMonth(parseInt(e.target.value));
  };

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Update display month/year when value changes
  useEffect(() => {
    const date = parseDate(value || '');
    if (date) {
      setDisplayMonth(date.getMonth());
      setDisplayYear(date.getFullYear());
    }
  }, [value]);

  const daysInMonth = getDaysInMonth(displayYear, displayMonth);
  const firstDayOfMonth = getFirstDayOfMonth(displayYear, displayMonth);
  const selectedDate = parseDate(value || '');

  // Local input state for typing
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Sync input value with prop value when not typing
  useEffect(() => {
    if (!isTyping) {
      setInputValue(formatDateForDisplay(value || ''));
    }
  }, [value, isTyping]);

  // Handle manual input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsTyping(true);
    
    // Clear the value if input is empty
    if (newValue === '') {
      onChange?.('');
    }
  };

  // Handle input blur to format the date
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const currentInputValue = inputValue.trim();
    setIsTyping(false);
    
    if (!currentInputValue) {
      onChange?.('');
      return;
    }

    // Try various date formats
    const formats = [
      // DD.MM.YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
      // DD.MM.YY  
      /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/,
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      // YYYY-MM-DD (ISO format)
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    ];

    let dateFound = false;
    for (const format of formats) {
      const match = currentInputValue.match(format);
      if (match) {
        let day, month, year;
        
        if (format === formats[4]) { // YYYY-MM-DD format
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else { // DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY formats
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          year = parseInt(match[3]);
          
          // Handle 2-digit years
          if (year < 100) {
            year += year < 50 ? 2000 : 1900;
          }
        }
        
        // Validate date
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const date = new Date(year, month - 1, day);
          if (date.getFullYear() === year && 
              date.getMonth() === month - 1 && 
              date.getDate() === day) {
            // Format date without timezone issues
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            onChange?.(dateStr);
            dateFound = true;
            break;
          }
        }
      }
    }
    
    // If no valid date was found, revert to the original value
    if (!dateFound && value) {
      setInputValue(formatDateForDisplay(value));
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input field */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={(e) => {
            // Select all text on focus for easy editing
            setIsTyping(true);
            e.target.select();
          }}
          onClick={(e) => {
            // Only open calendar if clicking on the calendar icon area
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            if (clickX <= 40 && !disabled) { // Calendar icon is in first 40px
              setIsOpen(true);
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          className={clsx(
            'block w-full rounded-lg shadow-sm sm:text-sm',
            'bg-gray-800 dark:bg-gray-800 border-gray-700 dark:border-gray-700',
            'text-white dark:text-white placeholder-gray-500 dark:placeholder-gray-500',
            'pl-10', // Space for calendar icon
            !error && 'focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-500 dark:focus:ring-blue-500',
            error && 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500 dark:focus:border-red-500 dark:focus:ring-red-500',
            disabled && 'bg-gray-700 dark:bg-gray-900 cursor-not-allowed opacity-60'
          )}
        />
        <div 
          className="absolute inset-y-0 left-0 pl-3 flex items-center cursor-pointer"
          onClick={() => !disabled && setIsOpen(true)}
        >
          <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-500" />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-400 dark:text-red-400">{error}</p>
      )}

      {/* Calendar dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4">
          {/* Month/Year header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-2">
              <select
                value={displayMonth}
                onChange={handleMonthChange}
                className="bg-gray-700 text-gray-300 border border-gray-600 rounded px-2 py-1 text-sm"
              >
                {MONTHS.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
              <select
                value={displayYear}
                onChange={handleYearChange}
                className="bg-gray-700 text-gray-300 border border-gray-600 rounded px-2 py-1 text-sm"
              >
                {Array.from({ length: 100 }, (_, i) => displayYear - 50 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-xs text-gray-500 font-medium py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for first week */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            
            {/* Days of month */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const isSelected = selectedDate && 
                selectedDate.getDate() === day && 
                selectedDate.getMonth() === displayMonth && 
                selectedDate.getFullYear() === displayYear;
              const isDisabled = isDateDisabled(displayYear, displayMonth, day);
              const isToday = new Date().getDate() === day && 
                new Date().getMonth() === displayMonth && 
                new Date().getFullYear() === displayYear;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => !isDisabled && handleDateSelect(day)}
                  disabled={isDisabled}
                  className={clsx(
                    'p-2 text-sm rounded hover:bg-gray-700',
                    isSelected && 'bg-blue-600 text-white hover:bg-blue-700',
                    !isSelected && !isDisabled && 'text-gray-300 hover:text-white',
                    isDisabled && 'text-gray-600 cursor-not-allowed',
                    isToday && !isSelected && 'font-bold text-blue-400'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};