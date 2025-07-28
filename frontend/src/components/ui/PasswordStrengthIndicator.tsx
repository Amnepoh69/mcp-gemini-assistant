/**
 * Password strength indicator component
 */

import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  show?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ 
  password, 
  show = true 
}) => {
  if (!show) return null;

  const requirements = [
    { 
      test: /.{8,}/, 
      label: 'At least 8 characters',
      passed: /.{8,}/.test(password)
    },
    { 
      test: /[a-z]/, 
      label: 'One lowercase letter',
      passed: /[a-z]/.test(password)
    },
    { 
      test: /[A-Z]/, 
      label: 'One uppercase letter',
      passed: /[A-Z]/.test(password)
    },
    { 
      test: /[0-9]/, 
      label: 'One number',
      passed: /[0-9]/.test(password)
    },
    { 
      test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 
      label: 'One special character',
      passed: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }
  ];

  const passedCount = requirements.filter(req => req.passed).length;
  const strengthPercentage = (passedCount / requirements.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage < 40) return 'bg-red-500';
    if (strengthPercentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strengthPercentage < 40) return 'Weak';
    if (strengthPercentage < 70) return 'Medium';
    return 'Strong';
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Strength Bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Password Strength</span>
          <span className={`text-sm font-medium ${
            strengthPercentage < 40 ? 'text-red-600' :
            strengthPercentage < 70 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {getStrengthText()}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      {/* Requirements List */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-2">Requirements:</div>
        <div className="space-y-1">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center text-xs">
              <div className="mr-2">
                {req.passed ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <X className="h-3 w-3 text-gray-400" />
                )}
              </div>
              <span className={req.passed ? 'text-green-600' : 'text-gray-500'}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};