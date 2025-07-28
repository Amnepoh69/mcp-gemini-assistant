/**
 * Registration form component
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, Mail, Lock, User, Building, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { RegisterData, UserRole } from '@/types/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SSOButtons } from './SSOButtons';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';

// Validation schema
const registerSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  first_name: yup
    .string()
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required'),
  last_name: yup
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .required('Last name is required'),
  company: yup
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .optional(),
  role: yup
    .string()
    .oneOf(Object.values(UserRole))
    .required('Role is required'),
});

interface RegisterFormData extends RegisterData {
  confirmPassword: string;
}

interface RegisterFormProps {
  onToggleMode: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleMode }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const { register: registerUser, isLoading, error } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      role: UserRole.ANALYST,
    },
  });
  
  const onSubmit = async (data: RegisterFormData) => {
    try {
      const { confirmPassword, ...registerData } = data;
      await registerUser(registerData);
    } catch (error) {
      // Error is handled by the store
    }
  };
  
  const roleOptions = [
    { value: UserRole.ANALYST, label: 'Analyst' },
    { value: UserRole.CFO, label: 'CFO' },
    { value: UserRole.CTO, label: 'CTO' },
  ];
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">
          Create your account
        </h1>
        <p className="text-gray-300">
          Join CFO/CTO Helper and start analyzing your business
        </p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              {...register('first_name')}
              type="text"
              placeholder="First name"
              icon={User}
              error={errors.first_name?.message}
            />
          </div>
          
          <div>
            <Input
              {...register('last_name')}
              type="text"
              placeholder="Last name"
              icon={User}
              error={errors.last_name?.message}
            />
          </div>
        </div>
        
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
            {...register('company')}
            type="text"
            placeholder="Company name (optional)"
            icon={Building}
            error={errors.company?.message}
          />
        </div>
        
        <div>
          <Select
            {...register('role')}
            options={roleOptions}
            placeholder="Select your role"
            error={errors.role?.message}
          />
        </div>
        
        <div>
          <Input
            {...register('password', {
              onChange: (e) => setPasswordValue(e.target.value)
            })}
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            icon={Lock}
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 text-gray-400 hover:text-gray-300 focus:outline-none"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            }
          />
          <PasswordStrengthIndicator password={passwordValue} show={!!passwordValue} />
        </div>
        
        <div>
          <Input
            {...register('confirmPassword')}
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            icon={Lock}
            error={errors.confirmPassword?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="p-2 text-gray-400 hover:text-gray-300 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            }
          />
        </div>
        
        <div className="flex items-center">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-300">
            I agree to the{' '}
            <a href="/terms" className="text-blue-400 hover:text-blue-300">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-400 hover:text-blue-300">
              Privacy Policy
            </a>
          </label>
        </div>
        
        <Button
          type="submit"
          isLoading={isLoading}
          className="w-full"
          icon={UserPlus}
        >
          Create account
        </Button>
      </form>
      
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
          </div>
        </div>
        
        <SSOButtons className="mt-4" />
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-300">
          Already have an account?{' '}
          <button
            onClick={onToggleMode}
            className="text-blue-400 hover:text-blue-300 focus:outline-none font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};