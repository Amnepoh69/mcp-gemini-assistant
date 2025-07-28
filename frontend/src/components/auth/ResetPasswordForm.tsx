/**
 * Reset password form component
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, Lock, Save, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Validation schema for reset request
const resetRequestSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
});

// Validation schema for reset confirmation
const resetConfirmSchema = yup.object({
  token: yup
    .string()
    .required('Reset token is required'),
  newPassword: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character')
    .required('New password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your new password'),
});

interface ResetRequestFormData {
  email: string;
}

interface ResetConfirmFormData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

interface ResetPasswordFormProps {
  mode: 'request' | 'confirm';
  token?: string;
  onSuccess?: () => void;
  onBackToLogin?: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ 
  mode, 
  token, 
  onSuccess, 
  onBackToLogin 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { resetPassword, confirmResetPassword, isLoading, error } = useAuthStore();
  
  const requestForm = useForm<ResetRequestFormData>({
    resolver: yupResolver(resetRequestSchema),
  });
  
  const confirmForm = useForm<ResetConfirmFormData>({
    resolver: yupResolver(resetConfirmSchema),
    defaultValues: { token: token || '' }
  });
  
  const onSubmitRequest = async (data: ResetRequestFormData) => {
    try {
      await resetPassword(data.email);
      onSuccess?.();
    } catch (error) {
      console.error('Reset password request failed:', error);
    }
  };
  
  const onSubmitConfirm = async (data: ResetConfirmFormData) => {
    try {
      await confirmResetPassword(data.token, data.newPassword);
      onSuccess?.();
    } catch (error) {
      console.error('Reset password confirmation failed:', error);
    }
  };
  
  const passwordStrengthIndicator = (password: string) => {
    const requirements = [
      { test: /.{8,}/, label: 'At least 8 characters' },
      { test: /[a-z]/, label: 'One lowercase letter' },
      { test: /[A-Z]/, label: 'One uppercase letter' },
      { test: /[0-9]/, label: 'One number' },
      { test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, label: 'One special character' }
    ];
    
    return (
      <div className="mt-2">
        <div className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</div>
        <div className="space-y-1">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center text-xs">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                req.test.test(password) ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <span className={req.test.test(password) ? 'text-green-600' : 'text-gray-500'}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  if (mode === 'request') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Reset your password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={requestForm.handleSubmit(onSubmitRequest)}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                {...requestForm.register('email')}
                placeholder="Enter your email"
                className={requestForm.formState.errors.email ? 'border-red-300' : ''}
                icon={Mail}
              />
              {requestForm.formState.errors.email && (
                <p className="mt-1 text-sm text-red-600">{requestForm.formState.errors.email.message}</p>
              )}
            </div>
            
            <div className="flex space-x-4">
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={onBackToLogin}
                className="flex-1"
              >
                Back to Login
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={confirmForm.handleSubmit(onSubmitConfirm)}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}
          
          <input
            type="hidden"
            {...confirmForm.register('token')}
          />
          
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                {...confirmForm.register('newPassword')}
                placeholder="Enter your new password"
                className={confirmForm.formState.errors.newPassword ? 'border-red-300' : ''}
                icon={Lock}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmForm.formState.errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{confirmForm.formState.errors.newPassword.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                {...confirmForm.register('confirmPassword')}
                placeholder="Confirm your new password"
                className={confirmForm.formState.errors.confirmPassword ? 'border-red-300' : ''}
                icon={Lock}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmForm.formState.errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{confirmForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          
          {/* Password Strength Indicator */}
          {passwordStrengthIndicator('')}
          
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            icon={Save}
            className="w-full"
          >
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};