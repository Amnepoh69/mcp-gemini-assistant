import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Shield, Plus, X, Info, Save } from 'lucide-react';
import { hedgingApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { getInstrumentPremium, getAvailableStrikes, getAvailableTerms, formatPremium } from '@/types/quotes';

export interface HedgingInstrument {
  id: string;
  name: string;
  type: 'IRS' | 'CAP' | 'FLOOR' | 'FLOOR_SELL' | 'COLLAR' | 'SWAP';
  description: string;
  parameters: {
    notional?: number;
    hedgePercentage?: number; // Процент от общего номинала (5-100%)
    hedgingTerm?: number; // Срок хеджирования в месяцах (1-60)
    strike?: number;
    cap?: number;
    floor?: number;
    fixedRate?: number;
    floatingBaseType?: 'KEY_RATE' | 'RUONIA'; // Тип базового индикатора для свопа из фикса в плавающую
    creditSpread?: number; // Кредитный спред для свопа из фикса в плавающую
    maturity?: string;
    cost?: number;
    costType?: 'upfront' | 'annual'; // upfront - в дату заключения, annual - проценты годовых
  };
  effect: number; // Процент снижения риска
}

interface HedgingPanelProps {
  selectedInstruments: HedgingInstrument[];
  onInstrumentsChange: (instruments: HedgingInstrument[]) => void;
  totalPrincipal: number;
  currency?: string;
  enableSave?: boolean;
  selectedCreditTypes?: Set<'KEY_RATE' | 'FIXED'>;
}

const AVAILABLE_INSTRUMENTS: Omit<HedgingInstrument, 'id' | 'parameters'>[] = [
  {
    name: 'Процентный своп (IRS)',
    type: 'IRS',
    description: 'Обмен типа процентной ставки',
    effect: 0.85
  },
  {
    name: 'Процентный кэп (CAP)',
    type: 'CAP',
    description: 'Ограничение максимальной процентной ставки',
    effect: 0.6
  },
  {
    name: 'Процентный флор (FLOOR) - Покупка',
    type: 'FLOOR',
    description: 'Установление минимальной процентной ставки (защита от падения ставок)',
    effect: 0.4
  },
  {
    name: 'Процентный флор (FLOOR) - Продажа',
    type: 'FLOOR_SELL',
    description: 'Продажа опциона на минимальную ставку (получение премии)',
    effect: -0.3
  },
  {
    name: 'Процентный коллар (COLLAR)',
    type: 'COLLAR',
    description: 'Комбинация кэпа и флора',
    effect: 0.7
  },
  {
    name: 'Валютно-процентный своп',
    type: 'SWAP',
    description: 'Обмен процентных платежей в разных валютах',
    effect: 0.75
  }
];

export function HedgingPanel({ 
  selectedInstruments, 
  onInstrumentsChange, 
  totalPrincipal,
  currency = 'RUB',
  enableSave = false,
  selectedCreditTypes = new Set()
}: HedgingPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [parameters, setParameters] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({});
  
  // Фильтруем доступные инструменты на основе типов кредитов
  const getAvailableInstruments = () => {
    // Если не выбраны кредиты, показываем все инструменты
    if (selectedCreditTypes.size === 0) {
      return AVAILABLE_INSTRUMENTS;
    }
    
    // Если выбраны только кредиты с плавающей ставкой
    if (selectedCreditTypes.has('KEY_RATE') && !selectedCreditTypes.has('FIXED')) {
      // Доступны: IRS (плавающая → фиксированная), CAP, FLOOR_SELL, COLLAR, SWAP
      return AVAILABLE_INSTRUMENTS.filter(inst => 
        inst.type !== 'FLOOR' // Исключаем покупку флора
      );
    }
    
    // Если выбраны только кредиты с фиксированной ставкой
    if (selectedCreditTypes.has('FIXED') && !selectedCreditTypes.has('KEY_RATE')) {
      // Доступны: IRS (фиксированная → плавающая), FLOOR (покупка), SWAP
      // Недоступны: CAP, FLOOR_SELL, COLLAR
      return AVAILABLE_INSTRUMENTS.filter(inst => 
        inst.type === 'IRS' || 
        inst.type === 'FLOOR' || 
        inst.type === 'SWAP'
      );
    }
    
    // Если выбраны оба типа кредитов (смешанный портфель)
    if (selectedCreditTypes.has('KEY_RATE') && selectedCreditTypes.has('FIXED')) {
      // Показываем все инструменты для гибкости
      return AVAILABLE_INSTRUMENTS;
    }
    
    return AVAILABLE_INSTRUMENTS;
  };

  // Функция проверки и установки ошибок валидации
  const validateFields = () => {
    const errors: {[key: string]: boolean} = {};
    
    if (selectedType === 'CAP') {
      if (!parameters.cap || parameters.cap <= 0) {
        errors.cap = true;
      } else {
        // Проверка кратности 0.25
        const remainder = (parameters.cap * 4) % 1;
        if (remainder !== 0) {
          errors.cap = true;
        }
      }
      // Не проверяем cost для CAP, так как он рассчитывается автоматически
    } else if (selectedType === 'FLOOR' || selectedType === 'FLOOR_SELL') {
      if (!parameters.floor || parameters.floor <= 0) errors.floor = true;
      if (!parameters.cost || parameters.cost <= 0) errors.cost = true;
    } else if (selectedType === 'COLLAR') {
      if (!parameters.cap || parameters.cap <= 0) errors.cap = true;
      if (!parameters.floor || parameters.floor <= 0) errors.floor = true;
      if (parameters.floor >= parameters.cap) {
        errors.floor = true;
        errors.cap = true;
      }
      if (!parameters.cost || parameters.cost <= 0) errors.cost = true;
    } else if (selectedType === 'IRS' || selectedType === 'SWAP') {
      // Для фиксированных кредитов проверяем параметры плавающей ставки
      if (selectedCreditTypes.has('FIXED') && !selectedCreditTypes.has('KEY_RATE')) {
        if (!parameters.floatingBaseType) errors.floatingBaseType = true;
        if (parameters.creditSpread === undefined || parameters.creditSpread < 0) errors.creditSpread = true;
      } else {
        // Для плавающих кредитов проверяем фиксированную ставку
        if (!parameters.fixedRate || parameters.fixedRate <= 0) errors.fixedRate = true;
      }
    }
    
    console.log(`📝 Валидация для ${selectedType}:`, { parameters, errors });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Автоматический расчет премии для CAP
  const calculateCapPremium = (strike: number, termMonths: number) => {
    const termYears = termMonths / 12; // Используем точное значение для интерполяции
    const premium = getInstrumentPremium('CAP', strike, termYears);
    
    if (premium !== null) {
      const calculatedCost = parameters.costType === 'upfront' 
        ? Math.round((parameters.notional || totalPrincipal) * premium)
        : Math.round(premium * 100 * 100) / 100; // Convert to percentage points and round to 2 decimals
        
      setParameters(prev => ({
        ...prev,
        cost: calculatedCost,
        premium: premium // Store raw premium for reference
      }));
      
    } else {
      toast.error('Котировка для данного страйка и срока не найдена');
    }
  };

  // Effect для автоматического расчета премии CAP при изменении параметров
  useEffect(() => {
    if (selectedType === 'CAP' && parameters.cap && parameters.hedgingTerm) {
      calculateCapPremium(parameters.cap, parameters.hedgingTerm);
    }
  }, [selectedType, parameters.cap, parameters.hedgingTerm, parameters.costType, parameters.notional, totalPrincipal]);

  // Проверка валидности формы
  const isFormValid = () => {
    if (!selectedType) return false;
    
    if (selectedType === 'CAP') {
      if (!parameters.cap || parameters.cap <= 0) return false;
      // Проверка кратности 0.25
      const remainder = (parameters.cap * 4) % 1;
      return remainder === 0;
    } else if (selectedType === 'FLOOR' || selectedType === 'FLOOR_SELL') {
      return parameters.floor > 0 && parameters.cost > 0;
    } else if (selectedType === 'COLLAR') {
      return parameters.cap > 0 && parameters.floor > 0 && parameters.floor < parameters.cap && parameters.cost > 0;
    } else if (selectedType === 'IRS' || selectedType === 'SWAP') {
      if (selectedCreditTypes.has('FIXED') && !selectedCreditTypes.has('KEY_RATE')) {
        return !!parameters.floatingBaseType && parameters.creditSpread >= 0;
      } else {
        return parameters.fixedRate > 0;
      }
    }
    
    return false;
  };

  const handleAddInstrument = () => {
    const availableInstruments = getAvailableInstruments();
    const instrument = availableInstruments.find(i => i.type === selectedType);
    if (!instrument) return;

    // Проверяем валидность и подсвечиваем ошибки
    if (!validateFields()) {
      console.log('❌ Валидация не пройдена. Ошибки:', validationErrors);
      
      // Специальное сообщение для CAP
      if (selectedType === 'CAP' && validationErrors.cap && parameters.cap) {
        const remainder = (parameters.cap * 4) % 1;
        if (remainder !== 0) {
          toast.error('Страйк должен быть кратен 0.25% (например: 16.00, 16.25, 16.50, 16.75)');
          return;
        }
      }
      
      toast.error('Заполните все обязательные поля');
      return;
    }

    const newInstrument: HedgingInstrument = {
      ...instrument,
      id: Date.now().toString(),
      parameters: {
        notional: parameters.notional || totalPrincipal,
        ...parameters
      }
    };

    onInstrumentsChange([...selectedInstruments, newInstrument]);
    setShowAddForm(false);
    setSelectedType('');
    setParameters({});
    setValidationErrors({});
    toast.success(`${instrument.name} успешно добавлен`);
  };

  const handleRemoveInstrument = (id: string) => {
    onInstrumentsChange(selectedInstruments.filter(i => i.id !== id));
  };

  // Функция для получения CSS классов поля с учетом ошибок
  const getInputClassName = (fieldName: string) => {
    const baseClass = "w-full px-3 py-2 border-2 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-colors";
    const normalClass = "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500";
    const errorClass = "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/30 focus:ring-red-500 focus:border-red-500 animate-pulse";
    
    const hasError = validationErrors[fieldName];
    if (hasError) {
      console.log(`🔴 Поле ${fieldName} подсвечено красным`);
    }
    
    return `${baseClass} ${hasError ? errorClass : normalClass}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getTotalHedgingEffect = () => {
    if (selectedInstruments.length === 0) return 0;
    
    // Комбинированный эффект с учетом диверсификации
    const totalEffect = selectedInstruments.reduce((acc, inst) => {
      return acc + inst.effect * (1 - acc);
    }, 0);
    
    return Math.min(totalEffect * 100, 95); // Максимум 95% хеджирования
  };

  const handleSaveInstruments = async () => {
    if (!enableSave || selectedInstruments.length === 0) return;
    
    setIsSaving(true);
    try {
      const savePromises = selectedInstruments
        .filter(inst => !inst.id.includes('saved_')) // Only save unsaved instruments
        .map(async (instrument) => {
          const apiData = {
            name: instrument.name,
            instrument_type: instrument.type,
            description: instrument.description,
            notional_amount: instrument.parameters.notional || totalPrincipal,
            currency: currency,
            parameters: {
              ...instrument.parameters,
              notional: undefined // Remove from parameters as it's a separate field
            },
            hedge_effectiveness: instrument.effect
          };
          
          const response = await hedgingApi.createInstrument(apiData);
          return {
            ...instrument,
            id: `saved_${response.data.id}` // Mark as saved
          };
        });
      
      const savedInstruments = await Promise.all(savePromises);
      
      // Update instruments with saved IDs
      const updatedInstruments = selectedInstruments.map(inst => {
        const saved = savedInstruments.find(s => s.name === inst.name && s.type === inst.type);
        return saved || inst;
      });
      
      onInstrumentsChange(updatedInstruments);
      toast.success(`Сохранено ${savedInstruments.length} инструментов хеджирования`);
    } catch (error) {
      console.error('Error saving hedging instruments:', error);
      toast.error('Ошибка при сохранении инструментов хеджирования');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-indigo-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Хеджирование
          </h2>
        </div>
        <div className="flex space-x-2">
          {enableSave && selectedInstruments.length > 0 && (
            <Button
              onClick={handleSaveInstruments}
              variant="outline"
              size="sm"
              icon={Save}
              disabled={isSaving}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          )}
          <Button
            onClick={() => setShowAddForm(true)}
            variant="primary"
            size="sm"
            icon={Plus}
          >
            Добавить инструмент
          </Button>
        </div>
      </div>

      {selectedInstruments.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Инструменты хеджирования не выбраны</p>
          {getAvailableInstruments().length === 0 ? (
            <div className="mt-2">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                {selectedCreditTypes.has('FIXED') && !selectedCreditTypes.has('KEY_RATE') 
                  ? 'Для кредитов с фиксированной ставкой доступна только покупка флора'
                  : 'Выберите кредиты для активации инструментов хеджирования'
                }
              </p>
            </div>
          ) : (
            <p className="text-sm mt-2">Добавьте инструменты для снижения процентного риска</p>
          )}
        </div>
      )}

      {selectedInstruments.length > 0 && (
        <div className="space-y-3 mb-4">
          {selectedInstruments.map((instrument) => (
            <div 
              key={instrument.id} 
              className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {instrument.name}
                  </span>
                  <span className="ml-2 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
                    {instrument.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {instrument.type === 'IRS' ? (
                    selectedCreditTypes.has('KEY_RATE') && !selectedCreditTypes.has('FIXED') 
                      ? 'Обмен плавающей ставки на фиксированную'
                      : selectedCreditTypes.has('FIXED') && !selectedCreditTypes.has('KEY_RATE')
                        ? 'Обмен фиксированной ставки на плавающую'
                        : 'Обмен типа процентной ставки'
                  ) : (
                    instrument.description
                  )}
                </p>
                <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  <div className="flex items-center space-x-4">
                    <span>Номинал: {formatCurrency(instrument.parameters.notional || totalPrincipal)}</span>
                    {instrument.parameters.hedgePercentage && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                        {instrument.parameters.hedgePercentage}% портфеля
                      </span>
                    )}
                    {instrument.parameters.hedgingTerm && (
                      <span 
                        className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs font-medium"
                        title={`${instrument.parameters.hedgingTerm} месяцев`}
                      >
                        Срок: {Math.round((instrument.parameters.hedgingTerm / 60) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    {instrument.parameters.strike && `Страйк: ${instrument.parameters.strike}% • `}
                    {instrument.parameters.fixedRate && `Фикс. ставка: ${instrument.parameters.fixedRate}% • `}
                    {instrument.parameters.floatingBaseType && (
                      `Базовый индикатор: ${instrument.parameters.floatingBaseType === 'KEY_RATE' ? 'Ключевая ставка ЦБ РФ' : 'RUONIA'} • `
                    )}
                    {instrument.parameters.creditSpread !== undefined && `Спред: ${instrument.parameters.creditSpread}% • `}
                    {instrument.parameters.cap && `Макс. ставка: ${instrument.parameters.cap}% • `}
                    {instrument.parameters.floor && `Мин. ставка: ${instrument.parameters.floor}% • `}
                    {instrument.parameters.cost && (
                      `${instrument.type === 'FLOOR_SELL' ? 'Получаемая премия' : 'Стоимость'}: ${instrument.parameters.costType === 'upfront' 
                        ? formatCurrency(instrument.parameters.cost) 
                        : `${instrument.parameters.cost}% годовых`}`
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemoveInstrument(instrument.id)}
                className="ml-3 text-gray-400 hover:text-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            Добавить инструмент хеджирования
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Тип инструмента
              </label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setParameters({ hedgePercentage: 100, hedgingTerm: 12 }); // Устанавливаем значения по умолчанию
                  setValidationErrors({}); // Сбрасываем ошибки при смене типа
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Выберите инструмент...</option>
                {getAvailableInstruments().map((inst) => (
                  <option key={inst.type} value={inst.type}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
            

            {selectedType && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Доля от общего номинала: {parameters.hedgePercentage || 100}%
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={parameters.hedgePercentage || 100}
                      onChange={(e) => {
                        const percentage = Number(e.target.value);
                        const notionalAmount = (totalPrincipal * percentage) / 100;
                        setParameters({ 
                          ...parameters, 
                          hedgePercentage: percentage,
                          notional: notionalAmount
                        });
                      }}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 
                               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 
                               [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                               [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full 
                               [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:cursor-pointer 
                               [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-lg"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>5%</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatCurrency((parameters.hedgePercentage || 100) * totalPrincipal / 100)}
                      </span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Срок хеджирования: {Math.round(((parameters.hedgingTerm || 12) / 60) * 100)}%
                    </label>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="1"
                        max="60"
                        step="1"
                        value={parameters.hedgingTerm || 12}
                        onChange={(e) => {
                          const term = Number(e.target.value);
                          setParameters({ 
                            ...parameters, 
                            hedgingTerm: term
                          });
                        }}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                                 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 
                                 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-600 
                                 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                                 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full 
                                 [&::-moz-range-thumb]:bg-green-600 [&::-moz-range-thumb]:cursor-pointer 
                                 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-lg"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>2%</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {parameters.hedgingTerm || 12} мес.
                        </span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {(selectedType === 'IRS' || selectedType === 'SWAP') && (
                  <>
                    {/* Для кредитов с фиксированной ставкой - вводим параметры плавающей */}
                    {selectedCreditTypes.has('FIXED') && !selectedCreditTypes.has('KEY_RATE') ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Базовый индикатор плавающей ставки
                          </label>
                          <select
                            value={parameters.floatingBaseType || ''}
                            onChange={(e) => {
                              setParameters({ ...parameters, floatingBaseType: e.target.value });
                              setValidationErrors({ ...validationErrors, floatingBaseType: false });
                            }}
                            className={getInputClassName('floatingBaseType')}
                          >
                            <option value="">Выберите индикатор...</option>
                            <option value="KEY_RATE">Ключевая ставка ЦБ РФ</option>
                            <option value="RUONIA">RUONIA</option>
                          </select>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Базовый индикатор для расчета плавающей ставки
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Кредитный спред (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={parameters.creditSpread || ''}
                            onChange={(e) => {
                              setParameters({ ...parameters, creditSpread: Number(e.target.value) });
                              setValidationErrors({ ...validationErrors, creditSpread: false });
                            }}
                            placeholder="Например: 2.5"
                            className={getInputClassName('creditSpread')}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Надбавка к базовой ставке
                          </p>
                        </div>
                      </>
                    ) : (
                      /* Для кредитов с плавающей ставкой - вводим фиксированную */
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Фиксированная ставка (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={parameters.fixedRate || ''}
                          onChange={(e) => {
                            setParameters({ ...parameters, fixedRate: Number(e.target.value) });
                            setValidationErrors({ ...validationErrors, fixedRate: false });
                          }}
                          placeholder="Например: 12.5"
                          className={getInputClassName('fixedRate')}
                        />
                      </div>
                    )}
                  </>
                )}

                {selectedType === 'CAP' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Максимальная ставка (страйк, %)
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="10"
                        max="30"
                        value={parameters.cap || ''}
                        onChange={(e) => {
                          const strike = Number(e.target.value);
                          setParameters({ ...parameters, cap: strike });
                          setValidationErrors({ ...validationErrors, cap: false });
                        }}
                        placeholder="Например: 16.75"
                        className={getInputClassName('cap')}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Тип оплаты
                      </label>
                      <select
                        value={parameters.costType || 'annual'}
                        onChange={(e) => {
                          setParameters({ ...parameters, costType: e.target.value as 'upfront' | 'annual' });
                        }}
                        className={getInputClassName('costType')}
                      >
                        <option value="annual">Проценты годовых</option>
                        <option value="upfront">Единовременно при заключении</option>
                      </select>
                    </div>

                    {parameters.cost !== undefined && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {parameters.costType === 'upfront' ? 'Стоимость' : 'Стоимость (% годовых)'}
                        </label>
                        <div className="w-full px-3 py-2 border-2 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/30 rounded-md text-gray-900 dark:text-gray-100">
                          {parameters.costType === 'upfront' 
                            ? formatCurrency(parameters.cost)
                            : `${Number(parameters.cost).toFixed(2)}%`
                          }
                        </div>
                      </div>
                    )}

                  </>
                )}

                {(selectedType === 'FLOOR' || selectedType === 'FLOOR_SELL') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Минимальная ставка (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={parameters.floor || ''}
                        onChange={(e) => {
                          setParameters({ ...parameters, floor: Number(e.target.value) });
                          setValidationErrors({ ...validationErrors, floor: false });
                        }}
                        placeholder="Например: 8.0"
                        className={getInputClassName('floor')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Тип оплаты
                      </label>
                      <select
                        value={parameters.costType || 'annual'}
                        onChange={(e) => {
                          setParameters({ ...parameters, costType: e.target.value as 'upfront' | 'annual' });
                        }}
                        className={getInputClassName('costType')}
                      >
                        <option value="annual">Проценты годовых</option>
                        <option value="upfront">Единовременно при заключении</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {selectedType === 'FLOOR_SELL' 
                          ? (parameters.costType === 'upfront' ? 'Получаемая премия (руб.)' : 'Получаемая премия (% годовых)')
                          : (parameters.costType === 'upfront' ? 'Стоимость (руб.)' : 'Стоимость (% годовых)')
                        }
                      </label>
                      <input
                        type="number"
                        step={parameters.costType === 'upfront' ? '1000' : '0.1'}
                        value={parameters.cost || ''}
                        onChange={(e) => {
                          setParameters({ ...parameters, cost: Number(e.target.value) });
                          setValidationErrors({ ...validationErrors, cost: false });
                        }}
                        placeholder={parameters.costType === 'upfront' ? 'Например: 300000' : 'Например: 1.0'}
                        className={getInputClassName('cost')}
                      />
                    </div>
                  </>
                )}

                {selectedType === 'COLLAR' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Максимальная ставка (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={parameters.cap || ''}
                        onChange={(e) => {
                          setParameters({ ...parameters, cap: Number(e.target.value) });
                          setValidationErrors({ ...validationErrors, cap: false });
                        }}
                        placeholder="Например: 18.0"
                        className={getInputClassName('cap')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Минимальная ставка (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={parameters.floor || ''}
                        onChange={(e) => {
                          setParameters({ ...parameters, floor: Number(e.target.value) });
                          setValidationErrors({ ...validationErrors, floor: false });
                        }}
                        placeholder="Например: 10.0"
                        className={getInputClassName('floor')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Тип оплаты
                      </label>
                      <select
                        value={parameters.costType || 'annual'}
                        onChange={(e) => {
                          setParameters({ ...parameters, costType: e.target.value as 'upfront' | 'annual' });
                        }}
                        className={getInputClassName('costType')}
                      >
                        <option value="annual">Проценты годовых</option>
                        <option value="upfront">Единовременно при заключении</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {parameters.costType === 'upfront' ? 'Стоимость (руб.)' : 'Стоимость (% годовых)'}
                      </label>
                      <input
                        type="number"
                        step={parameters.costType === 'upfront' ? '1000' : '0.1'}
                        value={parameters.cost || ''}
                        onChange={(e) => {
                          setParameters({ ...parameters, cost: Number(e.target.value) });
                          setValidationErrors({ ...validationErrors, cost: false });
                        }}
                        placeholder={parameters.costType === 'upfront' ? 'Например: 200000' : 'Например: 0.5'}
                        className={getInputClassName('cost')}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedType('');
                  setParameters({});
                  setValidationErrors({});
                }}
                variant="ghost"
                size="sm"
              >
                Отмена
              </Button>
              <Button
                onClick={handleAddInstrument}
                variant="primary"
                size="sm"
              >
                Добавить
              </Button>
            </div>
          </div>
        </div>
      )}

    </Card>
  );
}