/**
 * Credit obligations management page
 */

import React, { useState } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Plus, Upload, FileText, ArrowLeft, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CreditForm } from '@/components/credits/CreditForm';
import { CreditList } from '@/components/credits/CreditList';
import { CreditUpload } from '@/components/credits/CreditUpload';
import { PaymentScheduleUpload } from '@/components/credits/PaymentScheduleUpload';
import { CreditVisualization } from '@/components/credits/CreditVisualization';
import { CreditObligation } from '@/types/credit';
import { useAuthStore } from '@/store/auth';
import { creditsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

type ViewMode = 'list' | 'add' | 'edit' | 'upload' | 'schedule' | 'visualization' | 'form';

const CreditsPage: NextPage = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCredit, setSelectedCredit] = useState<CreditObligation | null>(null);
  const [credits, setCredits] = useState<CreditObligation[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  // Load credits for visualization
  React.useEffect(() => {
    if (user) {
      loadCredits();
    }
  }, [user]);

  // Check URL parameters for view mode
  React.useEffect(() => {
    if (router.isReady && user) {
      const view = router.query.view as string;
      if (view) {
        // Handle 'form' as an alias for 'add'
        if (view === 'form') {
          setViewMode('add');
        } else {
          setViewMode(view as ViewMode);
        }
      }
    }
  }, [router.isReady, router.query.view, user]);

  const loadCredits = async () => {
    try {
      const response = await creditsApi.getCredits();
      setCredits(response.data);
    } catch (error: any) {
      console.error('Error loading credits:', error);
      toast.error('Ошибка при загрузке кредитов');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleAddNew = () => {
    setSelectedCredit(null);
    setViewMode('add');
    router.push('/credits?view=add', undefined, { shallow: true });
  };

  const handleEdit = (credit: CreditObligation) => {
    setSelectedCredit(credit);
    setViewMode('edit');
    router.push('/credits?view=edit', undefined, { shallow: true });
  };

  const handleUpload = () => {
    setViewMode('upload');
    router.push('/credits?view=upload', undefined, { shallow: true });
  };

  const handleScheduleUpload = () => {
    setViewMode('schedule');
    router.push('/credits?view=schedule', undefined, { shallow: true });
  };

  const handleVisualization = () => {
    setViewMode('visualization');
    router.push('/credits?view=visualization', undefined, { shallow: true });
  };

  const handleBackToList = () => {
    setSelectedCredit(null);
    setViewMode('list');
    router.push('/credits', undefined, { shallow: true });
  };

  const handleFormSubmit = (credit: CreditObligation) => {
    // Form submission is handled by the form component
    // Reload credits and navigate back to list
    loadCredits();
    setRefreshTrigger(prev => prev + 1); // Trigger refresh
    setViewMode('list');
    router.push('/credits', undefined, { shallow: true });
  };

  const handleUploadComplete = () => {
    // Upload completion is handled by the upload component
    // Reload credits and navigate back to list
    loadCredits();
    setViewMode('list');
    router.push('/credits', undefined, { shallow: true });
  };

  const getPageTitle = () => {
    switch (viewMode) {
      case 'add':
      case 'form':
        return 'Добавить кредит';
      case 'edit':
        return 'Редактировать кредит';
      case 'upload':
        return 'Загрузить кредиты';
      case 'schedule':
        return 'Загрузить график платежей';
      case 'visualization':
        return 'Анализ кредитов';
      default:
        return 'Кредиты';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {getPageTitle()}
                </h1>
              </div>
            </div>
            
            {viewMode === 'list' && (
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleVisualization}
                  icon={BarChart3}
                  className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  Анализ
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUpload}
                  icon={Upload}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  Простой файл
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddNew}
                  icon={Plus}
                >
                  Добавить кредит
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div>
        {viewMode === 'list' && (
          <CreditList
            onEdit={handleEdit}
            onCreditsChange={loadCredits}
            refreshTrigger={refreshTrigger}
          />
        )}

        {(viewMode === 'add' || viewMode === 'form') && (
          <CreditForm
            onSubmit={handleFormSubmit}
            onCancel={handleBackToList}
          />
        )}

        {viewMode === 'edit' && selectedCredit && (
          <CreditForm
            initialData={selectedCredit}
            isEdit={true}
            onSubmit={handleFormSubmit}
            onCancel={handleBackToList}
          />
        )}

        {viewMode === 'upload' && (
          <CreditUpload
            onUploadComplete={handleUploadComplete}
            onCancel={handleBackToList}
          />
        )}

        {viewMode === 'schedule' && (
          <PaymentScheduleUpload
            onUploadComplete={handleUploadComplete}
            onCancel={handleBackToList}
          />
        )}

        {viewMode === 'visualization' && (
          <CreditVisualization
            credits={credits}
            selectedCredit={selectedCredit}
          />
        )}
      </div>

        {/* Help Section */}
        {viewMode === 'list' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
              Работа с кредитами
            </h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <p>
                • <strong>Добавить кредит:</strong> Используйте форму для ручного ввода данных по кредиту
              </p>
              <p>
                • <strong>График платежей:</strong> Загрузите Excel файл с детальным графиком платежей (как ваш файл График.xlsx)
              </p>
              <p>
                • <strong>Простой файл:</strong> Импортируйте данные из CSV или Excel файла со сводной информацией по кредитам
              </p>
              <p>
                • <strong>Анализ рисков:</strong> После добавления кредитов вы сможете создавать сценарии для анализа процентных рисков
              </p>
              <p>
                • <strong>Поддерживаемые валюты:</strong> RUB, USD, EUR, CNY
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CreditsPage;