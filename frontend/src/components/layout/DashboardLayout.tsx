/**
 * Main dashboard layout component
 */

import React from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/auth';
import { 
  BarChart3, 
  Upload, 
  FileText, 
  Bell, 
  Settings, 
  LogOut,
  User,
  Home,
  TrendingUp,
  Database,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  CFO/CTO Helper
                </h1>
              </div>
              
              <nav className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/credits?view=list')}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    router.pathname.startsWith('/credits') 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Кредиты</span>
                </button>
                
                
                <button
                  onClick={() => router.push('/scenarios')}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    router.pathname.startsWith('/scenarios') 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Сценарии</span>
                </button>
                
                <button
                  onClick={() => router.push('/analysis')}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    router.pathname.startsWith('/analysis') 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Анализ</span>
                </button>
                
                <button
                  onClick={() => router.push('/upload')}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    router.pathname === '/upload' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  <span>Загрузка</span>
                </button>
              </nav>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {user?.first_name} {user?.last_name}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 px-2 py-1 rounded">
                  {user?.role}
                </span>
              </div>
              
              <ThemeToggle />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/settings')}
                icon={Settings}
              >
                Настройки
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                icon={LogOut}
              >
                Выход
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
};