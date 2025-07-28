/**
 * Login form component
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { LoginCredentials, AuthProvider } from '@/types/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SSOButtons } from './SSOButtons';

// Validation schema
const loginSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .required('Password is required'),
});

interface LoginFormProps {
  onToggleMode: () => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  onToggleMode, 
  onForgotPassword 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: yupResolver(loginSchema),
  });
  
  const onSubmit = async (data: LoginCredentials) => {
    try {
      await login(data);
    } catch (error) {
      // Error is handled by the store
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white dark:text-white mb-2">
          Welcome back
        </h1>
        <p className="text-gray-400 dark:text-gray-400">
          Sign in to your CFO/CTO Helper account
        </p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 dark:bg-red-900/20 border border-red-800 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-400 dark:text-red-400">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Input
            {...register('email')}
            type="email"
            placeholder="Email address"
            icon={Mail}
            error={errors.email?.message}
          />
        </div>
        
        <div>
          <Input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            icon={Lock}
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 text-gray-500 hover:text-gray-400 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 dark:border-gray-600 bg-gray-800 dark:bg-gray-800 rounded"
            />
            <label htmlFor="remember" className="ml-2 block text-sm text-gray-400 dark:text-gray-400">
              Remember me
            </label>
          </div>
          
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-blue-500 hover:text-blue-400 dark:text-blue-500 dark:hover:text-blue-400 focus:outline-none"
          >
            Forgot password?
          </button>
        </div>
        
        <Button
          type="submit"
          isLoading={isLoading}
          className="w-full"
          icon={LogIn}
        >
          Sign in
        </Button>
      </form>
      
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-950 dark:bg-gray-950 text-gray-500 dark:text-gray-500">Or continue with</span>
          </div>
        </div>
        
        <SSOButtons className="mt-4" />
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-400">
          Don't have an account?{' '}
          <button
            onClick={onToggleMode}
            className="text-blue-500 hover:text-blue-400 dark:text-blue-500 dark:hover:text-blue-400 focus:outline-none font-medium"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};