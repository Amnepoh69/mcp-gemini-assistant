/**
 * Analysis page for scenario impact on credits
 */

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  BarChart3, 
  Calculator, 
  TrendingUp, 
  AlertTriangle,
  Info,
  FileText,
  Download,
  Play,
  Upload,
  Sigma,
  List
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { creditsApi, rateScenariosApi, cbrApi, hedgingApi } from '@/lib/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { HedgingPanel, HedgingInstrument } from '@/components/analysis/HedgingPanel';
import { ExpandToggle } from '@/components/ui/ExpandToggle';

interface CreditItem {
  id: number;
  credit_name: string;
  principal_amount: number;
  base_rate_indicator: string;
  credit_spread: number;
  currency: string;
  start_date: string;
  end_date: string;
  base_rate_value: number;
  total_interest_amount?: number;
  interest_amount?: number;
}

interface Scenario {
  id: number;
  name: string;
  code: string;
  scenario_type: string;
  description: string;
  forecasts?: RateForecast[];
}

interface ScenarioImpact {
  credit_id: number;
  credit_name: string;
  scenario_interest_total: number;
}

interface RateForecast {
  forecast_date: string;
  rate_value: number;
  indicator: string;
}

// Advanced PDF export function with chart capture
const generatePDFReport = async (
  selectedScenario: number | null,
  scenarios: Scenario[],
  selectedCredits: Set<number>,
  credits: CreditItem[],
  analysisResults: ScenarioImpact[],
  hedgingInstruments: HedgingInstrument[]
) => {
  const scenarioName = scenarios.find(s => s.id === selectedScenario)?.name || 'Не выбран';
  
  // Create PDF document
  const doc = new jsPDF();
  let currentY = 20;
  
  // Helper function to add text with UTF-8 support
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    // Convert Cyrillic to Latin for basic display (jsPDF limitation workaround)
    const convertText = (str: string) => {
      // For now, we'll use transliteration for better compatibility
      return str
        .replace(/[а-я]/gi, (char) => {
          const cyrillicMap: {[key: string]: string} = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
            'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
            'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
            'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
            'я': 'ya', ' ': ' ', ':': ':', '%': '%', '№': 'No', '₽': 'RUB'
          };
          return cyrillicMap[char.toLowerCase()] || char;
        });
    };
    
    doc.text(convertText(text), x, y, options);
    return y;
  };
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  addText('OTCHET PO ANALIZU PROTSENTNYKH RISKOV', 20, currentY);
  currentY += 15;
  
  // Date and basic info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  addText(`Data sozdaniya: ${new Date().toLocaleDateString('ru-RU')}`, 20, currentY);
  currentY += 8;
  addText(`Stsenariy: ${scenarioName}`, 20, currentY);
  currentY += 8;
  addText(`Analiziruemye kredity: ${selectedCredits.size}`, 20, currentY);
  currentY += 8;
  addText(`Instrumenty khedjirovaniya: ${hedgingInstruments.length}`, 20, currentY);
  currentY += 15;
  
  // Credits section
  if (selectedCredits.size > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    addText('DETALI PO KREDITAM:', 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    Array.from(selectedCredits).forEach((creditId, index) => {
      const credit = credits.find(c => c.id === creditId);
      if (credit) {
        addText(`${index + 1}. ${credit.credit_name}`, 25, currentY);
        currentY += 6;
        addText(`   Summa: ${new Intl.NumberFormat('ru-RU').format(credit.principal_amount)} ${credit.currency}`, 25, currentY);
        currentY += 6;
        addText(`   Spred: ${credit.credit_spread}%`, 25, currentY);
        currentY += 6;
        addText(`   Period: ${new Date(credit.start_date).toLocaleDateString('ru-RU')} - ${new Date(credit.end_date).toLocaleDateString('ru-RU')}`, 25, currentY);
        currentY += 10;
      }
    });
  }
  
  // Hedging instruments section
  if (hedgingInstruments.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    addText('INSTRUMENTY KHEDJIROVANIYA:', 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    hedgingInstruments.forEach((instrument, index) => {
      addText(`${index + 1}. ${instrument.name} (${instrument.type})`, 25, currentY);
      currentY += 6;
      
      if (instrument.parameters.cap) {
        addText(`   Maksimalnaya stavka: ${instrument.parameters.cap}%`, 25, currentY);
        currentY += 6;
      }
      if (instrument.parameters.floor) {
        addText(`   Minimalnaya stavka: ${instrument.parameters.floor}%`, 25, currentY);
        currentY += 6;
      }
      if (instrument.parameters.fixedRate) {
        addText(`   Fiksirovannaya stavka: ${instrument.parameters.fixedRate}%`, 25, currentY);
        currentY += 6;
      }
      if (instrument.parameters.cost) {
        const costText = instrument.parameters.costType === 'upfront' 
          ? `${new Intl.NumberFormat('ru-RU').format(instrument.parameters.cost)} rub.`
          : `${instrument.parameters.cost}% godovykh`;
        addText(`   Stoimost: ${costText}`, 25, currentY);
        currentY += 6;
      }
      currentY += 5;
    });
  }
  
  // Capture chart if it exists
  try {
    const chartElement = document.getElementById('analysis-chart') || document.querySelector('.recharts-wrapper');
    if (chartElement && selectedCredits.size > 0) {
      // Add new page for chart
      doc.addPage();
      currentY = 20;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      addText('GRAFIK PROGNOZA EFFEKTIVNOY STAVKI', 20, currentY);
      currentY += 15;
      
      // Capture chart as image
      const canvas = await html2canvas(chartElement as HTMLElement, {
        backgroundColor: 'white',
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 170; // PDF width - margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      doc.addImage(imgData, 'PNG', 20, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
    }
  } catch (error) {
    console.error('Error capturing chart:', error);
    // Continue without chart if capture fails
  }
  
  // Analysis results
  if (analysisResults.length > 0) {
    doc.addPage();
    currentY = 20;
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    addText('REZULTATY ANALIZA:', 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    analysisResults.forEach((result, index) => {
      addText(`${index + 1}. ${result.credit_name}`, 25, currentY);
      currentY += 6;
      
      const scenarioInterest = result.scenario_interest_total || 0;
      addText(`   Protsenty po stsenariyu: ${new Intl.NumberFormat('ru-RU').format(scenarioInterest)} RUB`, 25, currentY);
      currentY += 6;
      
      if (hedgingInstruments.length > 0) {
        const credit = credits.find(c => c.id === result.credit_id);
        if (credit) {
          const today = new Date();
          const endDate = new Date(credit.end_date);
          if (endDate > today) {
            const futureDays = Math.max(0, Math.ceil((endDate.getTime() - Math.max(today.getTime(), new Date(credit.start_date).getTime())) / (1000 * 60 * 60 * 24)));
            const principal = credit.principal_amount;
            
            const baseRate = 16 + credit.credit_spread;
            const unhedgedPayments = principal * (baseRate / 100) * (futureDays / 365);
            const hedgedPayments = unhedgedPayments * 0.85;
            const savings = unhedgedPayments - hedgedPayments;
            
            addText(`   S khedjirovaniem: ${new Intl.NumberFormat('ru-RU').format(hedgedPayments)} ${credit.currency}`, 25, currentY);
            currentY += 6;
            addText(`   Ekonomiya: ${new Intl.NumberFormat('ru-RU').format(savings)} ${credit.currency}`, 25, currentY);
            currentY += 6;
          }
        }
      }
      currentY += 8;
      
      // Check if we need a new page
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
    });
  }
  
  // Conclusion
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  addText('ZAKLYUCHENIE:', 20, currentY);
  currentY += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  addText('Dannyy otchet soderzhit analiz protsentnykh riskov po vybrannye kreditam', 20, currentY);
  currentY += 6;
  addText('na osnove ukazannogo stsenariya razvitiya klyuchevoy stavki CB RF.', 20, currentY);
  currentY += 8;
  
  if (hedgingInstruments.length > 0) {
    addText('Primenenie instrumentov khedjirovaniya mozhet snizit protsentnye riski', 20, currentY);
    currentY += 6;
    addText('i obespechit ekonomiyu na protsentnykh platezhakh.', 20, currentY);
  }
  
  // Save PDF
  const fileName = `analiz_riska_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
};

export default function AnalysisPage() {
  const { user } = useAuthStore();
  const [credits, setCredits] = useState<CreditItem[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedCredits, setSelectedCredits] = useState<Set<number>>(new Set());
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  const [analysisResults, setAnalysisResults] = useState<ScenarioImpact[]>([]);
  const [scenarioForecasts, setScenarioForecasts] = useState<RateForecast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [hedgingInstruments, setHedgingInstruments] = useState<HedgingInstrument[]>([]);
  const [viewMode, setViewMode] = useState<'aggregate' | 'individual'>('individual'); // По умолчанию детальный вид
  const [paymentSchedules, setPaymentSchedules] = useState<{[creditId: number]: any[]}>({});
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({
    'KEY_RATE': true,
    'FIXED': true
  });

  // Функция расчета остатка задолженности на конкретную дату из реальных данных графика платежей
  const calculateDebtBalance = (credit: CreditItem, targetDate: Date): number => {
    const startDate = new Date(credit.start_date);
    const endDate = new Date(credit.end_date);
    const principal = credit.principal_amount;
    
    // Если дата до начала кредита
    if (targetDate < startDate) {
      return 0;
    }
    
    // Если дата после окончания кредита
    if (targetDate > endDate) {
      return 0;
    }
    
    // Если дата точно в начале кредита
    if (targetDate.getTime() === startDate.getTime()) {
      return principal;
    }
    
    // Проверяем есть ли реальные данные payment schedule для этого кредита
    const schedule = paymentSchedules[credit.id];
    console.log(`📊 calculateDebtBalance для кредита ${credit.id} (${credit.credit_name}) на дату ${targetDate.toLocaleDateString('ru-RU')}`);
    console.log(`📊 Schedule data:`, schedule ? `${schedule.length} периодов` : 'НЕТ ДАННЫХ');
    
    if (schedule && schedule.length > 0) {
      // Ищем период, в который попадает целевая дата
      // Используем period_start_date и period_end_date для сопоставления
      for (const payment of schedule) {
        const periodStart = new Date(payment.period_start_date);
        const periodEnd = new Date(payment.period_end_date);
        
        console.log(`📊 Проверяем период ${payment.period_number}: ${periodStart.toLocaleDateString('ru-RU')} - ${periodEnd.toLocaleDateString('ru-RU')}, остаток: ${payment.principal_amount}`);
        
        // Если целевая дата попадает в этот период
        if (targetDate >= periodStart && targetDate <= periodEnd) {
          // Возвращаем остаток задолженности на начало периода
          console.log(`✅ Найден период! Возвращаем остаток: ${payment.principal_amount}`);
          return Math.max(0, payment.principal_amount || 0);
        }
      }
      
      // Если не нашли подходящий период, ищем последний период до целевой даты
      let lastValidBalance = principal;
      for (const payment of schedule) {
        const periodStart = new Date(payment.period_start_date);
        
        if (periodStart <= targetDate) {
          lastValidBalance = payment.principal_amount || 0;
        } else {
          break;
        }
      }
      
      console.log(`📊 Не найден точный период, используем последний период: ${lastValidBalance}`);
      return Math.max(0, lastValidBalance);
    }
    
    // Если нет payment schedule, возвращаем 0 (не показываем задолженность)
    console.log(`❌ НЕТ PAYMENT SCHEDULE! Возвращаем 0`);
    return 0;
  };

  // Функция нормализации остатка задолженности для отображения на графике
  const normalizeDebtForChart = (debtAmount: number, maxDebt: number, minRate: number = 10, maxRate: number = 32): number => {
    if (maxDebt === 0) return minRate;
    
    // Нормализуем от minRate до minRate + 30% от диапазона ставок
    const rateRange = maxRate - minRate;
    const normalizedValue = minRate + (debtAmount / maxDebt) * (rateRange * 0.3);
    
    return normalizedValue;
  };

  // Функция применения эффектов хеджирования к ключевой ставке
  const applyHedgingToKeyRate = (keyRate: number, creditId?: number) => {
    let adjustedRate = keyRate;
    let totalPremium = 0;
    let hasActiveCap = false;
    
    hedgingInstruments.forEach((instrument, idx) => {
      // Применяем CAP инструмент  
      if (instrument.type === 'CAP') {
        // ВСЕГДА добавляем премию за CAP опцион (платится за сам факт наличия инструмента)
        // Проверяем все возможные способы хранения стоимости
        const cost = instrument.parameters.cost || 0;
        const costType = instrument.parameters.costType || 'annual';
        
        if (cost > 0 && costType === 'annual') {
          totalPremium += cost;
        }
        
        // Применяем ограничение CAP если указан лимит
        if (instrument.parameters.cap && keyRate > instrument.parameters.cap) {
          adjustedRate = instrument.parameters.cap;
          hasActiveCap = true;
        }
        // Если ключевая ставка <= CAP или CAP не указан, оставляем ее без изменений
        // Но премия все равно платится!
      } else if (instrument.type === 'IRS' || instrument.type === 'SWAP') {
        // Для процентного свопа клиент фиксирует ставку
        if (instrument.parameters.fixedRate && instrument.parameters.fixedRate > 0) {
          adjustedRate = instrument.parameters.fixedRate;
          hasActiveCap = true; // Используем этот флаг для обозначения активности любого инструмента
        }
      }
      // TODO: Добавить логику для FLOOR, COLLAR
    });
    
    return { adjustedRate, premium: totalPremium, hasActiveCap };
  };

  // Новая функция для индивидуального применения каждого инструмента
  const applyIndividualHedgingInstrument = (keyRate: number, instrument: HedgingInstrument, creditId?: number) => {
    let adjustedRate = keyRate;
    let premium = 0;
    let hasActive = false;
    
    if (instrument.type === 'CAP') {
      const cost = instrument.parameters.cost || 0;
      const costType = instrument.parameters.costType || 'annual';
      
      if (cost > 0 && costType === 'annual') {
        premium = cost;
      }
      
      if (instrument.parameters.cap && keyRate > instrument.parameters.cap) {
        adjustedRate = instrument.parameters.cap;
        hasActive = true;
      }
    } else if (instrument.type === 'FLOOR') {
      const cost = instrument.parameters.cost || 0;
      const costType = instrument.parameters.costType || 'annual';
      
      if (cost > 0 && costType === 'annual') {
        premium = cost;
      }
      
      if (instrument.parameters.floor && keyRate < instrument.parameters.floor) {
        adjustedRate = instrument.parameters.floor;
        hasActive = true;
      }
    } else if (instrument.type === 'FLOOR_SELL') {
      const cost = instrument.parameters.cost || 0;
      const costType = instrument.parameters.costType || 'annual';
      
      // При продаже флора получаем премию (отрицательная стоимость)
      if (cost > 0 && costType === 'annual') {
        premium = -cost; // Отрицательная премия = получаем деньги
      }
      
      // При продаже флора мы НЕ защищены от падения ставок
      // Если ставка падает ниже флора, мы платим разницу
      if (instrument.parameters.floor && keyRate < instrument.parameters.floor) {
        // При продаже флора мы не ограничиваем ставку снизу
        // Вместо этого добавляем дополнительные расходы
        const floorDifference = instrument.parameters.floor - keyRate;
        premium += floorDifference; // Добавляем к премии (компенсация покупателю)
        hasActive = true;
      }
    } else if (instrument.type === 'COLLAR') {
      const cost = instrument.parameters.cost || 0;
      const costType = instrument.parameters.costType || 'annual';
      
      if (cost > 0 && costType === 'annual') {
        premium = cost;
      }
      
      if (instrument.parameters.cap && keyRate > instrument.parameters.cap) {
        adjustedRate = instrument.parameters.cap;
        hasActive = true;
      } else if (instrument.parameters.floor && keyRate < instrument.parameters.floor) {
        adjustedRate = instrument.parameters.floor;
        hasActive = true;
      }
    } else if (instrument.type === 'IRS' || instrument.type === 'SWAP') {
      // Для процентного свопа клиент меняет плавающую ставку на фиксированную
      // Расходы клиента теперь рассчитываются от фиксированной ставки свопа
      if (instrument.parameters.fixedRate && instrument.parameters.fixedRate > 0) {
        adjustedRate = instrument.parameters.fixedRate;
        hasActive = true; // Своп всегда активен, так как меняет базовую ставку
      }
    }
    
    return { 
      instrumentId: instrument.id,
      instrumentName: instrument.name,
      instrumentType: instrument.type,
      adjustedRate, 
      premium, 
      hasActive 
    };
  };
  const [historicalRates, setHistoricalRates] = useState<{[key: string]: number}>({});

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Auto-run analysis when scenario or credits change
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (selectedScenario && scenarios.length > 0 && credits.length > 0) {
        // Get required dates from selected credits and scenario
        const requiredDates = getRequiredDatesForScenario(selectedScenario, selectedCredits);
        
        // Always reload historical data for the new scenario to ensure we have all needed dates
        await loadHistoricalRates(requiredDates);
        
        runScenarioAnalysis();
      } else {
        // Clear results when selection is incomplete
        setAnalysisResults([]);
        setScenarioForecasts([]);
      }
    }, 300); // Small delay to prevent too frequent calls

    return () => clearTimeout(timeoutId);
  }, [selectedScenario, selectedCredits, scenarios, credits]);

  const loadInitialData = async () => {
    try {
      setIsLoadingData(true);
      
      // Load credits
      const creditsResponse = await creditsApi.getCredits();
      const creditsList = creditsResponse?.data?.credits || creditsResponse?.data || [];
      setCredits(creditsList);
      
      // Load payment schedules for all credits
      const schedules: {[creditId: number]: any[]} = {};
      console.log(`🔄 Загружаем payment schedules для ${creditsList.length} кредитов...`);
      
      for (const credit of creditsList) {
        try {
          console.log(`🔄 Загружаем schedule для кредита ${credit.id} (${credit.credit_name})`);
          const scheduleResponse = await creditsApi.getSchedule(credit.id);
          const scheduleData = scheduleResponse.data || [];
          schedules[credit.id] = scheduleData;
          console.log(`✅ Загружен schedule для кредита ${credit.id}: ${scheduleData.length} периодов`);
          if (scheduleData.length > 0) {
            console.log(`📊 Первый период:`, scheduleData[0]);
          }
        } catch (error) {
          console.log(`❌ Could not load payment schedule for credit ${credit.id}:`, error);
          schedules[credit.id] = [];
        }
      }
      
      console.log(`✅ Установка paymentSchedules:`, schedules);
      setPaymentSchedules(schedules);
      
      // Don't auto-select any credits - let user choose manually
      
      // Load scenarios (both public and user scenarios)
      try {
        let allScenarios: Scenario[] = [];
        
        // Load public scenarios (they include forecasts)
        try {
          const publicResponse = await rateScenariosApi.getPublicScenarios();
          allScenarios = publicResponse.data?.scenarios || publicResponse.data || [];
          console.log('Loaded public scenarios with forecasts:', allScenarios);
        } catch (error) {
          console.warn('Could not load public scenarios:', error);
        }
        
        // Load user scenarios if authenticated
        if (user) {
          try {
            const userResponse = await rateScenariosApi.getScenarios();
            const userScenarios = userResponse.data?.scenarios || userResponse.data || [];
            
            // Merge and deduplicate scenarios
            const existingIds = new Set(allScenarios.map(s => s.id));
            userScenarios.forEach((scenario: Scenario) => {
              if (!existingIds.has(scenario.id)) {
                allScenarios.push(scenario);
              }
            });
          } catch (error) {
            console.warn('Could not load user scenarios:', error);
          }
        }
        
        setScenarios(allScenarios);
        
        // Auto-select first scenario if available
        if (allScenarios.length > 0 && !selectedScenario) {
          setSelectedScenario(allScenarios[0].id);
        }
      } catch (error) {
        console.error('Error loading scenarios:', error);
        setScenarios([]);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleCreditToggle = (creditId: number) => {
    const newSelected = new Set(selectedCredits);
    const clickedCredit = credits.find(c => c.id === creditId);
    
    if (newSelected.has(creditId)) {
      newSelected.delete(creditId);
    } else {
      // В режиме "Суммарная позиция" проверяем однородность кредитов
      if (viewMode === 'aggregate' && newSelected.size > 0) {
        const selectedCreditTypes = Array.from(newSelected).map(id => {
          const credit = credits.find(c => c.id === id);
          return credit?.base_rate_indicator;
        });
        
        const clickedCreditType = clickedCredit?.base_rate_indicator;
        
        // Проверяем, что все выбранные кредиты имеют тот же тип ставки
        if (selectedCreditTypes.some(type => type !== clickedCreditType)) {
          const typeNames = {
            'KEY_RATE': 'с ключевой ставкой',
            'FIXED': 'с фиксированной ставкой'
          };
          
          toast.error(
            `В суммарной позиции можно выбирать только однородные кредиты. ` +
            `Вы пытаетесь добавить кредит ${typeNames[clickedCreditType as keyof typeof typeNames] || clickedCreditType}, ` +
            `но уже выбраны кредиты ${typeNames[selectedCreditTypes[0] as keyof typeof typeNames] || selectedCreditTypes[0]}.`
          );
          return;
        }
      }
      
      newSelected.add(creditId);
    }
    setSelectedCredits(newSelected);
  };

  const handleSelectAllCredits = () => {
    if (viewMode === 'aggregate') {
      // В агрегированном режиме группируем кредиты по типу ставки
      const creditsByType = credits.reduce((acc, credit) => {
        const type = credit.base_rate_indicator;
        if (!acc[type]) acc[type] = [];
        acc[type].push(credit.id);
        return acc;
      }, {} as Record<string, number[]>);
      
      // Если уже что-то выбрано, выбираем все кредиты того же типа
      if (selectedCredits.size > 0) {
        const firstSelectedCredit = credits.find(c => selectedCredits.has(c.id));
        const selectedType = firstSelectedCredit?.base_rate_indicator;
        if (selectedType && creditsByType[selectedType]) {
          setSelectedCredits(new Set(creditsByType[selectedType]));
          return;
        }
      }
      
      // Если ничего не выбрано, предлагаем выбрать наибольшую группу
      const largestGroup = Object.entries(creditsByType)
        .sort(([,a], [,b]) => b.length - a.length)[0];
      
      if (largestGroup) {
        setSelectedCredits(new Set(largestGroup[1]));
        const typeNames = {
          'KEY_RATE': 'с ключевой ставкой',
          'FIXED': 'с фиксированной ставкой'
        };
        toast.info(`Выбраны все кредиты ${typeNames[largestGroup[0] as keyof typeof typeNames] || largestGroup[0]}`);
      }
    } else {
      // В индивидуальном режиме выбираем все кредиты
      const allCreditIds = credits.map(credit => credit.id);
      setSelectedCredits(new Set(allCreditIds));
    }
  };

  const handleDeselectAllCredits = () => {
    setSelectedCredits(new Set());
  };

  const getRequiredDatesForScenario = (scenarioId: number | null, selectedCreditIds: Set<number>): Date[] => {
    if (!scenarioId) return [];
    
    const requiredDates: Date[] = [];
    const selectedScenarioData = scenarios.find(s => s.id === scenarioId);
    
    // Add dates from scenario forecasts
    if (selectedScenarioData?.forecasts) {
      selectedScenarioData.forecasts.forEach(forecast => {
        requiredDates.push(new Date(forecast.forecast_date));
      });
    }
    
    // Add dates from selected credits (start and end dates)
    Array.from(selectedCreditIds).forEach(creditId => {
      const credit = credits.find(c => c.id === creditId);
      if (credit) {
        requiredDates.push(new Date(credit.start_date));
        requiredDates.push(new Date(credit.end_date));
        
        // Add monthly dates between start and end for better interpolation
        const startDate = new Date(credit.start_date);
        const endDate = new Date(credit.end_date);
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          requiredDates.push(new Date(currentDate));
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }
    });
    
    return requiredDates;
  };

  const loadHistoricalRates = async (requiredDates: Date[]) => {
    try {
      console.log('Loading historical rates for', requiredDates.length, 'required dates');
      
      // Calculate the date range needed based on required dates
      const today = new Date();
      const minDate = requiredDates.length > 0 
        ? requiredDates.reduce((min, date) => date < min ? date : min, today)
        : new Date(today.getFullYear() - 2, today.getMonth(), today.getDate()); // Default: 2 years back
      
      const daysDiff = Math.ceil((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysToFetch = Math.max(daysDiff + 30, 730); // At least 2 years or required range + buffer
      
      console.log(`Fetching ${daysToFetch} days of historical data (from ${minDate.toLocaleDateString('ru-RU')})`);
      
      // Get historical data from CBR API
      const response = await cbrApi.getHistoricalRates(daysToFetch);
      const historicalData = response.data;
      
      if (historicalData && historicalData.rates) {
        const ratesMap: {[key: string]: number} = {};
        
        // Index rates by effective date (primary)
        historicalData.rates.forEach((rate: any) => {
          const effectiveDate = new Date(rate.effective_date);
          const dateKey = effectiveDate.toLocaleDateString('ru-RU');
          ratesMap[dateKey] = rate.rate;
        });
        
        // Also index by announcement date for better coverage
        historicalData.rates.forEach((rate: any) => {
          const announcementDate = new Date(rate.announcement_date);
          const dateKey = announcementDate.toLocaleDateString('ru-RU');
          // Don't overwrite if effective date already exists for this day
          if (!ratesMap[dateKey]) {
            ratesMap[dateKey] = rate.rate;
          }
        });
        
        setHistoricalRates(ratesMap);
        console.log(`Loaded historical rates: ${Object.keys(ratesMap).length} dates`);
        
        // Log coverage for required dates
        const coveredDates = requiredDates.filter(date => {
          const dateKey = date.toLocaleDateString('ru-RU');
          return ratesMap[dateKey] !== undefined;
        });
        console.log(`Coverage: ${coveredDates.length}/${requiredDates.length} required dates have historical data`);
        
        // Log sample data for verification
        console.log('=== Historical rates data verification ===');
        const sampleDates = Object.keys(ratesMap).sort().slice(0, 20);
        sampleDates.forEach(dateKey => {
          const rate = ratesMap[dateKey];
          if (rate < 5 || rate > 25) {
            console.warn(`⚠️ SUSPICIOUS RATE: ${dateKey}: ${rate}% (out of normal range 5-25%)`);
          } else {
            console.log(`${dateKey}: ${rate}%`);
          }
        });
        
        // Log recent data specifically
        console.log('=== Recent rates (2024-2025) ===');
        Object.keys(ratesMap).filter(dateKey => {
          return dateKey.includes('.2024') || dateKey.includes('.2025');
        }).slice(-10).forEach(dateKey => {
          console.log(`${dateKey}: ${ratesMap[dateKey]}%`);
        });
        
      } else {
        console.warn('No historical data received from CBR API');
        toast.error('Нет исторических данных от ЦБ РФ');
      }
    } catch (error) {
      console.error('Error loading historical rates:', error);
      toast.error('Не удалось загрузить исторические данные ЦБ РФ');
    }
  };

  const runScenarioAnalysis = async () => {
    // Function is now called automatically, no need for validation toast
    if (!selectedScenario) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Note: We now get forecasts directly from selected scenario data in calculations
      
      // Calculate real scenario analysis
      console.log('Calculating real scenario analysis...');
      
      // Pre-calculate current interest for all credits (this should be constant)
      const currentInterestMap = new Map<number, number>();
      for (const creditId of Array.from(selectedCredits)) {
        const credit = credits.find(c => c.id === creditId)!;
        const currentInterest = credit.total_interest_amount || credit.interest_amount || await calculateActualInterestPayments(credit);
        currentInterestMap.set(creditId, currentInterest);
      }
      
      const analysisPromises = Array.from(selectedCredits).map(async (creditId) => {
        const credit = credits.find(c => c.id === creditId)!;
        
        // Use pre-calculated constant current interest
        const currentInterest = currentInterestMap.get(creditId)!;
        
        // Calculate scenario interest using scenario forecasts
        let scenarioInterest = currentInterest;
        
        // Get forecasts specifically for the selected scenario
        const selectedScenarioData = scenarios.find(s => s.id === selectedScenario);
        const specificForecasts = selectedScenarioData?.forecasts || [];
        
        console.log(`Selected scenario: ${selectedScenarioData?.name} (ID: ${selectedScenario})`);
        console.log(`Forecasts for this scenario:`, specificForecasts.map(f => `${f.forecast_date}: ${f.rate_value}%`));
        
        if (specificForecasts.length > 0) {
          // Use the exact same formula as backend: Interest = Principal × (Rate / 100) × (Days / 365)
          // Recalculate total interest using scenario rates for future periods
          
          try {
            const today = new Date();
            const startDate = new Date(credit.start_date);
            const endDate = new Date(credit.end_date);
            const principal = credit.principal_amount;
            
            const avgScenarioRate = specificForecasts.reduce((sum, f) => sum + f.rate_value, 0) / specificForecasts.length;
            console.log(`\n=== ${credit.credit_name} ===`);
            console.log(`Текущие проценты (ПОСТОЯННАЯ): ${currentInterest.toLocaleString()} руб`);
            console.log(`Базовая ставка кредита: ${credit.base_rate_value}% + спред ${credit.credit_spread}% = ${credit.base_rate_value + credit.credit_spread}%`);
            console.log(`Средняя ставка сценария: ${avgScenarioRate.toFixed(1)}% + спред ${credit.credit_spread}% = ${(avgScenarioRate + credit.credit_spread).toFixed(1)}%`);
            
            // Backend formula: Interest = Principal × (Rate / 100) × (Days / 365)
            
            // Step 1: Calculate total interest with current rates (as baseline)
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const currentTotalRate = credit.base_rate_value + credit.credit_spread;
            const baselineInterest = principal * (currentTotalRate / 100) * (totalDays / 365);
            
            console.log('Baseline calculation:', {
              principal,
              currentTotalRate: currentTotalRate + '%',
              totalDays,
              baselineInterest
            });
            
            // Calculate interest from today to end of credit using scenario rates
            let totalScenarioInterest = 0;
            
            if (today <= endDate) {
              // Calculate only future period (from today to end of credit)
              const futureDays = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
              
              console.log('Future period calculation (from today to end):', {
                today: today.toLocaleDateString('ru-RU'),
                endDate: endDate.toLocaleDateString('ru-RU'),
                futureDays
              });
              
              if (futureDays > 0) {
                if (credit.base_rate_indicator === 'FIXED') {
                  // Для фиксированной ставки используем base_rate_value
                  const fixedRate = credit.base_rate_value;
                  totalScenarioInterest = principal * (fixedRate / 100) * (futureDays / 365);
                } else {
                  // Для плавающей ставки используем сценарий
                  const avgScenarioRate = specificForecasts.reduce((sum, f) => sum + f.rate_value, 0) / specificForecasts.length;
                  // Применяем хеджирование CAP к средней ставке сценария
                  const hedgingResult = applyHedgingToKeyRate(avgScenarioRate);
                  const scenarioTotalRate = hedgingResult.adjustedRate + credit.credit_spread + hedgingResult.premium;
                  totalScenarioInterest = principal * (scenarioTotalRate / 100) * (futureDays / 365);
                }
                
                console.log('Scenario interest calculation:', {
                  creditType: credit.base_rate_indicator,
                  rate: credit.base_rate_indicator === 'FIXED' ? credit.base_rate_value + '%' : 'scenario-based',
                  futureDays,
                  totalScenarioInterest
                });
              } else {
                // Credit has already ended
                totalScenarioInterest = 0;
                console.log('Credit has already ended, no future interest');
              }
            } else {
              // Credit is entirely in the future - use scenario rates for everything
              const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (credit.base_rate_indicator === 'FIXED') {
                // Для фиксированной ставки используем base_rate_value
                const fixedRate = credit.base_rate_value;
                totalScenarioInterest = principal * (fixedRate / 100) * (totalDays / 365);
              } else {
                // Для плавающей ставки используем сценарий
                const avgScenarioRate = specificForecasts.reduce((sum, f) => sum + f.rate_value, 0) / specificForecasts.length;
                // Применяем хеджирование CAP к средней ставке сценария
                const hedgingResult = applyHedgingToKeyRate(avgScenarioRate);
                const scenarioTotalRate = hedgingResult.adjustedRate + credit.credit_spread + hedgingResult.premium;
                totalScenarioInterest = principal * (scenarioTotalRate / 100) * (totalDays / 365);
              }
              
              console.log('Future credit calculation:', {
                creditType: credit.base_rate_indicator,
                rate: credit.base_rate_indicator === 'FIXED' ? credit.base_rate_value + '%' : 'scenario-based',
                totalDays,
                totalScenarioInterest
              });
            }
            
            scenarioInterest = totalScenarioInterest;
            
            // Добавляем upfront расходы на хеджирование для этого кредита (только для плавающей ставки)
            if (credit.base_rate_indicator === 'KEY_RATE') {
              hedgingInstruments.forEach(instrument => {
                if (instrument.type === 'CAP' && instrument.parameters.cost && instrument.parameters.costType === 'upfront') {
                  // Если у инструмента есть CAP, который активируется, добавляем upfront стоимость
                  const avgScenarioRate = specificForecasts.reduce((sum, f) => sum + f.rate_value, 0) / specificForecasts.length;
                  if (avgScenarioRate > (instrument.parameters.cap || 0)) {
                    scenarioInterest += instrument.parameters.cost;
                    console.log(`➜ Добавлена upfront стоимость CAP: ${instrument.parameters.cost.toLocaleString()} руб`);
                  }
                }
              });
            }
            
            console.log(`➜ Проценты по сценарию: ${scenarioInterest.toLocaleString()} руб`);
            console.log(`➜ ИТОГ: ${scenarioInterest > currentInterest ? '+' : ''}${(scenarioInterest - currentInterest).toLocaleString()} руб (${(((scenarioInterest - currentInterest) / currentInterest) * 100).toFixed(1)}%)`);
            
          } catch (error) {
            console.error('Error in scenario calculation:', error);
            // Fallback to simple calculation
            const avgScenarioRate = specificForecasts.reduce((sum, f) => sum + f.rate_value, 0) / specificForecasts.length;
            const currentRate = 20;
            const rateDifference = avgScenarioRate - currentRate;
            const rateImpactMultiplier = 1 + (rateDifference / 100);
            scenarioInterest = currentInterest * rateImpactMultiplier;
          }
        } else {
          // Fallback to mock calculation
          const scenario = scenarios.find(s => s.id === selectedScenario)!;
          let impactMultiplier = 1;
          
          if (scenario.scenario_type === 'OPTIMISTIC') {
            impactMultiplier = 0.85; // 15% reduction
          } else if (scenario.scenario_type === 'PESSIMISTIC') {
            impactMultiplier = 1.25; // 25% increase
          } else {
            impactMultiplier = 1.05; // 5% increase for base
          }
          
          scenarioInterest = currentInterest * impactMultiplier;
        }
        
        // Для fallback расчетов CAP уже применен в основной логике выше
        
        return {
          credit_id: creditId,
          credit_name: credit.credit_name,
          scenario_interest_total: scenarioInterest
        };
      });
      
      const mockResults = await Promise.all(analysisPromises);
      setAnalysisResults(mockResults);
      
      const selectedScenarioName = scenarios.find(s => s.id === selectedScenario)?.name;
      toast.success(`Анализ сценария "${selectedScenarioName}" завершен`);
      
    } catch (error) {
      console.error('Error running analysis:', error);
      toast.error('Ошибка при выполнении анализа');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'RUB') => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const getTotalPrincipal = () => {
    return Array.from(selectedCredits).reduce((total, creditId) => {
      const credit = credits.find(c => c.id === creditId);
      return total + (credit?.principal_amount || 0);
    }, 0);
  };

  const getSelectedCreditTypes = (): Set<'KEY_RATE' | 'FIXED'> => {
    const types = new Set<'KEY_RATE' | 'FIXED'>();
    Array.from(selectedCredits).forEach(creditId => {
      const credit = credits.find(c => c.id === creditId);
      if (credit) {
        types.add(credit.base_rate_indicator);
      }
    });
    return types;
  };

  const calculateActualInterestPayments = async (credit: CreditItem): Promise<number> => {
    console.warn('Using fallback interest calculation for credit:', credit.credit_name);
    // Simple fallback calculation when backend data is not available
    const principal = credit.principal_amount;
    const totalRate = (credit.base_rate_value + credit.credit_spread) / 100;
    const startDate = new Date(credit.start_date);
    const endDate = new Date(credit.end_date);
    const daysTotal = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return (principal * totalRate * daysTotal) / 365;
  };

  const generateMockForecasts = (scenarioType: string): RateForecast[] => {
    const startDate = new Date();
    const forecasts: RateForecast[] = [];
    
    // Base rate
    let baseRate = 16.0;
    
    // Rate progression based on scenario type
    let rateChange = 0;
    switch (scenarioType) {
      case 'OPTIMISTIC':
        rateChange = -0.5; // Decrease by 0.5% per quarter
        break;
      case 'PESSIMISTIC':
        rateChange = 0.75; // Increase by 0.75% per quarter
        break;
      case 'CONSERVATIVE':
        rateChange = 0.25; // Slight increase
        break;
      case 'BASE':
      default:
        rateChange = 0.1; // Minimal change
        break;
    }
    
    // Generate forecasts for next 8 quarters (2 years)
    for (let i = 0; i < 8; i++) {
      const forecastDate = new Date(startDate);
      forecastDate.setMonth(startDate.getMonth() + (i * 3)); // Every 3 months
      
      const rateValue = baseRate + (rateChange * i);
      
      forecasts.push({
        forecast_date: forecastDate.toISOString(),
        rate_value: Math.max(0, Math.min(25, rateValue)), // Keep between 0-25%
        indicator: 'KEY_RATE'
      });
    }
    
    return forecasts;
  };

  const getScenarioTypeLabel = (type: string) => {
    switch (type) {
      case 'BASE': return 'Базовый';
      case 'OPTIMISTIC': return 'Оптимистичный';
      case 'PESSIMISTIC': return 'Пессимистичный';
      case 'CONSERVATIVE': return 'Консервативный';
      case 'STRESS': return 'Стресс-тест';
      case 'CUSTOM': return 'Пользовательский';
      default: return 'Пользовательский';
    }
  };

  if (isLoadingData) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Загрузка данных...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Сценарный анализ
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Анализ влияния различных сценариев изменения ключевой ставки на ваши кредитные обязательства
          </p>
        </div>

        {/* Top Configuration Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Credit Selection */}
          <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Calculator className="h-5 w-5 text-green-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Выбор кредитов
                  </h2>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleDeselectAllCredits}
                    variant="ghost"
                    size="sm"
                  >
                    Очистить
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(() => {
                  // Группируем кредиты по типу ставки
                  const creditsByType = credits.reduce((acc, credit) => {
                    const type = credit.base_rate_indicator;
                    if (!acc[type]) acc[type] = [];
                    acc[type].push(credit);
                    return acc;
                  }, {} as Record<string, typeof credits>);

                  const typeNames = {
                    'KEY_RATE': 'Кредиты с ключевой ставкой ЦБ',
                    'FIXED': 'Кредиты с фиксированной ставкой'
                  };

                  return Object.entries(creditsByType).map(([rateType, typeCredits]) => {
                    const isExpanded = expandedGroups[rateType] ?? true;
                    const typeName = typeNames[rateType as keyof typeof typeNames] || `Кредиты ${rateType}`;
                    
                    // Подсчитываем выбранные кредиты в этой группе
                    const selectedInGroup = typeCredits.filter(credit => selectedCredits.has(credit.id)).length;
                    
                    // Проверяем совместимость группы в агрегированном режиме
                    const isGroupCompatible = viewMode === 'individual' || selectedCredits.size === 0 || 
                      Array.from(selectedCredits).every(id => {
                        const selectedCredit = credits.find(c => c.id === id);
                        return selectedCredit?.base_rate_indicator === rateType;
                      });

                    const toggleGroup = () => {
                      setExpandedGroups(prev => ({
                        ...prev,
                        [rateType]: !prev[rateType]
                      }));
                    };

                    return (
                      <div key={rateType} className="border border-gray-200 dark:border-gray-600 rounded-lg">
                        {/* Заголовок группы */}
                        <button
                          onClick={toggleGroup}
                          className={`w-full px-3 py-2 flex items-center justify-between text-left rounded-t-lg transition-colors ${
                            !isGroupCompatible && viewMode === 'aggregate' 
                              ? 'bg-gray-100 dark:bg-gray-700 opacity-50' 
                              : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {typeName}
                            </span>
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                              {selectedInGroup}/{typeCredits.length}
                            </span>
                          </div>
                          <ExpandToggle isExpanded={isExpanded} />
                        </button>

                        {/* Список кредитов */}
                        {isExpanded && (
                          <div className="px-3 py-2 space-y-2">
                            {typeCredits.map((credit) => {
                              const isDisabled = viewMode === 'aggregate' && !isGroupCompatible;
                              
                              return (
                                <label key={credit.id} className={`flex items-start ${isDisabled ? 'opacity-50' : ''}`}>
                                  <div
                                    onClick={() => !isDisabled && handleCreditToggle(credit.id)}
                                    className={`mt-1 mr-3 h-4 w-4 rounded border-2 flex items-center justify-center ${
                                      isDisabled 
                                        ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                                        : selectedCredits.has(credit.id)
                                          ? 'border-blue-600 bg-blue-600 cursor-pointer'
                                          : 'border-gray-400 bg-white hover:border-blue-400 cursor-pointer'
                                    }`}
                                  >
                                    {selectedCredits.has(credit.id) && (
                                      <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                      {credit.credit_name}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {formatCurrency(Number(credit.principal_amount), credit.currency)} • 
                                      {credit.base_rate_indicator === 'FIXED' ? 
                                        `Фиксированная ставка: ${credit.base_rate_value}%` : 
                                        `Спред: ${credit.credit_spread}%`
                                      }
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
              
              {credits.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Кредиты не найдены</p>
                  <p className="text-sm mt-2">Добавьте кредиты для проведения сценарного анализа</p>
                </div>
              )}
              
              {viewMode === 'aggregate' && selectedCredits.size > 0 && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="flex items-center">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      В режиме "Суммарная позиция" можно выбирать только однородные кредиты.
                    </div>
                  </div>
                </div>
              )}
              
              {credits.length > 0 && credits.filter(credit => credit.base_rate_indicator === 'KEY_RATE').length === 0 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      <strong>Внимание:</strong> Нет кредитов с базовой ставкой KEY_RATE. 
                      Хеджирование применимо только к кредитам с плавающей ставкой, привязанной к ключевой ставке ЦБ.
                      Кредиты с фиксированной ставкой будут отображены на графике без возможности хеджирования.
                    </div>
                  </div>
                </div>
              )}
            </Card>

          {/* Hedging Panel */}
          <Card className="p-6">
            <HedgingPanel
              selectedInstruments={hedgingInstruments}
              onInstrumentsChange={setHedgingInstruments}
              totalPrincipal={getTotalPrincipal()}
              currency="RUB"
              selectedCreditTypes={getSelectedCreditTypes()}
            />
          </Card>
        </div>

        {/* Analysis Status Row */}
        <div className="mb-8">
          {isLoading && (
              <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-blue-700 dark:text-blue-300 font-medium">
                    Выполнение анализа...
                  </span>
                </div>
              </div>
            )}
            
            {!selectedScenario && !isLoading && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  Выберите сценарий для начала анализа
                </p>
              </div>
            )}
            
            {selectedScenario && selectedCredits.size === 0 && !isLoading && (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-orange-700 dark:text-orange-300 text-center">
                  Выберите хотя бы один кредит для анализа
                </p>
              </div>
            )}
            
        </div>

        {/* Full Width Results Panel */}
        <div className="w-full">
            <Card className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 text-purple-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Результаты анализа
                  </h2>
                </div>
                
                {/* Export Button */}
                {analysisResults.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Download}
                    onClick={async () => {
                      try {
                        toast.loading('Создание PDF отчета...', { duration: 2000 });
                        await generatePDFReport(selectedScenario, scenarios, selectedCredits, credits, analysisResults, hedgingInstruments);
                        toast.success('PDF отчет успешно сгенерирован и загружен');
                      } catch (error) {
                        console.error('Error generating PDF report:', error);
                        toast.error('Ошибка при создании PDF отчета');
                      }
                    }}
                  >
                    Экспорт
                  </Button>
                )}
              </div>

              {/* Controls Row */}
              {(analysisResults.length > 0 || scenarios.length > 0) && (
                <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  {/* Scenario Selection */}
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Сценарий:
                    </label>
                    <select
                      value={selectedScenario || ''}
                      onChange={(e) => setSelectedScenario(e.target.value ? parseInt(e.target.value) : null)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Выберите сценарий</option>
                      {scenarios.map((scenario) => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.name} ({getScenarioTypeLabel(scenario.scenario_type)})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* View Mode Toggle */}
                  {analysisResults.length > 0 && (
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 ml-auto">
                      <button 
                        className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                          viewMode === 'aggregate' 
                            ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                        }`}
                        onClick={() => setViewMode('aggregate')}
                      >
                        <Sigma className="h-4 w-4 inline mr-1.5" />
                        Суммарная позиция
                      </button>
                      <button 
                        className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                          viewMode === 'individual' 
                            ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                        }`}
                        onClick={() => setViewMode('individual')}
                      >
                        <List className="h-4 w-4 inline mr-1.5" />
                        По кредитам
                      </button>
                    </div>
                  )}
                </div>
              )}

              {analysisResults.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Результаты анализа появятся здесь
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Выберите сценарий и кредиты для просмотра результатов анализа
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Credit Rates Forecast Chart */}
                  {(() => {
                    const selectedScenarioData = scenarios.find(s => s.id === selectedScenario);
                    const currentForecasts = selectedScenarioData?.forecasts || [];
                    return currentForecasts.length > 0;
                  })() && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {viewMode === 'aggregate' 
                            ? 'Прогноз средневзвешенной эффективной ставки' 
                            : 'Прогноз эффективной ставки по кредитам'
                          }
                        </h3>
                      </div>
                      <div className="relative">
                        <div className="h-96 overflow-visible">
                        {selectedCredits.size === 0 && (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center text-gray-500 dark:text-gray-400">
                              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              <p className="text-lg font-medium">Выберите кредиты для отображения графика</p>
                              <p className="text-sm max-w-md mx-auto mt-2">
                                График покажет прогноз эффективной ставки по кредитам и инструментам хеджирования
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedCredits.size > 0 && (
                          <ResponsiveContainer width="100%" height="100%" id="analysis-chart">
                            <ComposedChart
                            data={(() => {
                              const selectedScenarioData = scenarios.find(s => s.id === selectedScenario);
                              const currentForecasts = selectedScenarioData?.forecasts || [];
                              
                              // Create a comprehensive data structure that includes all credit periods
                              const chartDataMap = new Map();
                              
                              // Helper function to determine if a date is historical (before today)
                              const today = new Date();
                              const isHistoricalDate = (date: Date) => date < today;
                              
                              // First, determine the full date range we need to cover
                              const allDates: Date[] = [];
                              
                              // Add forecast dates
                              currentForecasts.forEach(f => {
                                allDates.push(new Date(f.forecast_date));
                              });
                              
                              // Add credit period dates
                              Array.from(selectedCredits).forEach(creditId => {
                                const credit = credits.find(c => c.id === creditId);
                                if (credit) {
                                  allDates.push(new Date(credit.start_date));
                                  allDates.push(new Date(credit.end_date));
                                }
                              });
                              
                              if (allDates.length > 0) {
                                const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
                                const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
                                
                                // Create weekly data points for smooth cursor tracking
                                const currentDate = new Date(minDate);
                                while (currentDate <= maxDate) {
                                  allDates.push(new Date(currentDate));
                                  currentDate.setDate(currentDate.getDate() + 7); // Weekly intervals
                                }
                              }
                              
                              // Remove duplicates and sort all dates
                              const uniqueTimes = Array.from(new Set(allDates.map(d => d.getTime())));
                              const uniqueDates = uniqueTimes.map(t => new Date(t)).sort((a, b) => a.getTime() - b.getTime());
                              
                              // Create data points for all dates
                              uniqueDates.forEach(date => {
                                const dateKey = date.toLocaleDateString('ru-RU');
                                
                                if (!chartDataMap.has(dateKey)) {
                                  // Check if this is an exact forecast date
                                  const exactForecast = currentForecasts.find(f => {
                                    const forecastDate = new Date(f.forecast_date);
                                    return Math.abs(forecastDate.getTime() - date.getTime()) < 24 * 60 * 60 * 1000; // Within 1 day
                                  });
                                  
                                  const displayDate = date.toLocaleDateString('ru-RU', {
                                    year: '2-digit',
                                    month: 'short',
                                    day: 'numeric'
                                  });
                                  
                                  if (exactForecast) {
                                    // Use exact forecast data
                                    chartDataMap.set(dateKey, {
                                      date: displayDate,
                                      originalDate: date,
                                      keyRate: exactForecast.rate_value,
                                      hasForecastData: true,
                                      isExactForecast: true
                                    });
                                  } else {
                                    // Use interpolated rate
                                    const interpolatedRate = findClosestRate(currentForecasts, date);
                                    chartDataMap.set(dateKey, {
                                      date: displayDate,
                                      originalDate: date,
                                      keyRate: interpolatedRate,
                                      hasForecastData: false,
                                      isInterpolated: true
                                    });
                                  }
                                }
                              });
                              
                              // Mark credit boundary points for special styling
                              Array.from(selectedCredits).forEach(creditId => {
                                const credit = credits.find(c => c.id === creditId);
                                if (!credit) return;
                                
                                const creditStart = new Date(credit.start_date);
                                const creditEnd = new Date(credit.end_date);
                                
                                // Mark existing points as credit boundaries
                                const startKey = creditStart.toLocaleDateString('ru-RU');
                                const endKey = creditEnd.toLocaleDateString('ru-RU');
                                
                                const startPoint = chartDataMap.get(startKey);
                                if (startPoint) {
                                  startPoint.isCreditBoundary = true;
                                  startPoint.boundaryType = 'start';
                                  startPoint.creditId = creditId;
                                }
                                
                                const endPoint = chartDataMap.get(endKey);
                                if (endPoint) {
                                  endPoint.isCreditBoundary = true;
                                  endPoint.boundaryType = 'end';
                                  endPoint.creditId = creditId;
                                }
                              });
                              
                              // Helper function to find closest rate (considering historical data)
                              function findClosestRate(forecasts: any[], targetDate: Date): number {
                                const dateStr = targetDate.toLocaleDateString('ru-RU');
                                const isHistorical = isHistoricalDate(targetDate);
                                console.log(`🔍 Finding rate for ${dateStr}, isHistorical: ${isHistorical}`);
                                
                                // For historical dates, prioritize CBR historical data
                                if (isHistorical) {
                                  const dateKey = targetDate.toLocaleDateString('ru-RU');
                                  
                                  // Try exact date match first
                                  if (historicalRates[dateKey]) {
                                    const rate = historicalRates[dateKey];
                                    console.log(`  ✅ Found exact CBR historical rate: ${rate}% for ${dateKey}`);
                                    
                                    // Validate the rate is reasonable
                                    if (rate < 5 || rate > 25) {
                                      console.warn(`  ⚠️ SUSPICIOUS RATE: ${rate}% for ${dateKey} - using fallback`);
                                      // Don't use suspicious rates, fall through to forecasts
                                    } else {
                                      return rate;
                                    }
                                  }
                                  
                                  // Try to find closest historical rate within reasonable range (±30 days)
                                  const historicalEntries = Object.entries(historicalRates);
                                  let closestRate = null;
                                  let minDiff = Infinity;
                                  
                                  historicalEntries.forEach(([dateStr, rate]) => {
                                    try {
                                      // Parse Russian date format (dd.mm.yyyy)
                                      const [day, month, year] = dateStr.split('.');
                                      const historicalDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                      const diff = Math.abs(historicalDate.getTime() - targetDate.getTime());
                                      const daysDiff = diff / (1000 * 60 * 60 * 24);
                                      
                                      // Only consider dates within 30 days
                                      if (daysDiff <= 30 && diff < minDiff) {
                                        minDiff = diff;
                                        closestRate = rate;
                                      }
                                    } catch (e) {
                                      // Skip invalid dates
                                    }
                                  });
                                  
                                  if (closestRate !== null) {
                                    const daysDiff = Math.round(minDiff / (1000 * 60 * 60 * 24));
                                    
                                    // Double-check the rate is reasonable
                                    if (closestRate < 5 || closestRate > 25) {
                                      console.warn(`  ⚠️ SUSPICIOUS closest rate: ${closestRate}% (±${daysDiff} days) - using forecast fallback`);
                                    } else {
                                      console.log(`  ✅ Using closest CBR historical rate: ${closestRate}% (±${daysDiff} days)`);
                                      return closestRate;
                                    }
                                  }
                                  
                                  console.log('  → No suitable historical rate found, falling back to forecasts');
                                }
                                
                                // For future dates or when historical data is not available, use forecast data
                                if (forecasts.length === 0) {
                                  console.log('  → No forecasts available, using default rate: 16%');
                                  return 16; // Default rate
                                }
                                
                                // Find closest forecast
                                let closest = forecasts[0];
                                let minDiff = Math.abs(new Date(forecasts[0].forecast_date).getTime() - targetDate.getTime());
                                
                                forecasts.forEach(f => {
                                  const diff = Math.abs(new Date(f.forecast_date).getTime() - targetDate.getTime());
                                  if (diff < minDiff) {
                                    minDiff = diff;
                                    closest = f;
                                  }
                                });
                                
                                console.log(`  → Using forecast rate: ${closest.rate_value}% from ${new Date(closest.forecast_date).toLocaleDateString('ru-RU')}`);
                                return closest.rate_value;
                              }
                              
                              // Convert map to sorted array
                              const sortedData = Array.from(chartDataMap.values())
                                .sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());
                              
                              // Now add credit rates for each point
                              return sortedData.map(point => {
                                const chartData: any = {
                                  date: point.date,
                                  keyRate: point.keyRate
                                };
                                
                                if (viewMode === 'aggregate') {
                                  // Calculate weighted average rate for all credits
                                  let totalWeightedRate = 0;
                                  let totalPrincipal = 0;
                                  let totalWeightedHedgedRate = 0;
                                  let hasActiveCredits = false;
                                  
                                  Array.from(selectedCredits).forEach(creditId => {
                                    const credit = credits.find(c => c.id === creditId);
                                    if (credit) {
                                      const creditStart = new Date(credit.start_date);
                                      const creditEnd = new Date(credit.end_date);
                                      const currentDate = point.originalDate;
                                      
                                      const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                                      const creditStartOnly = new Date(creditStart.getFullYear(), creditStart.getMonth(), creditStart.getDate());
                                      const creditEndOnly = new Date(creditEnd.getFullYear(), creditEnd.getMonth(), creditEnd.getDate());
                                      
                                      if (currentDateOnly >= creditStartOnly && currentDateOnly <= creditEndOnly) {
                                        hasActiveCredits = true;
                                        let rate;
                                        
                                        if (credit.base_rate_indicator === 'FIXED') {
                                          rate = credit.base_rate_value;
                                        } else {
                                          rate = point.keyRate + credit.credit_spread;
                                        }
                                        
                                        const debtBalance = calculateDebtBalance(credit, currentDate);
                                        totalWeightedRate += rate * debtBalance;
                                        totalPrincipal += debtBalance;
                                        
                                        // Calculate hedged rate if applicable
                                        
                                        if (hedgingInstruments.length > 0 && credit.base_rate_indicator === 'KEY_RATE') {
                                          const today = new Date();
                                          const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                          
                                          if (currentDateOnly >= todayDateOnly && debtBalance > 0) {
                                            // Проверяем срок хеджирования
                                            const hedgingEndDate = new Date(today);
                                            const maxHedgingTerm = Math.max(...hedgingInstruments.map(i => i.parameters.hedgingTerm || 12));
                                            hedgingEndDate.setMonth(hedgingEndDate.getMonth() + maxHedgingTerm);
                                            const hedgingEndDateOnly = new Date(hedgingEndDate.getFullYear(), hedgingEndDate.getMonth(), hedgingEndDate.getDate());
                                            
                                            if (currentDateOnly <= hedgingEndDateOnly) {
                                            // Calculate weighted hedged rate considering hedge coverage
                                            let totalHedgedAmount = 0;
                                            let totalCoveredAmount = 0;
                                            
                                            hedgingInstruments.forEach(instrument => {
                                              // Проверяем срок хеджирования для каждого инструмента
                                              const instrumentEndDate = new Date(today);
                                              const hedgingTerm = instrument.parameters.hedgingTerm || 12;
                                              instrumentEndDate.setMonth(instrumentEndDate.getMonth() + hedgingTerm);
                                              const instrumentEndDateOnly = new Date(instrumentEndDate.getFullYear(), instrumentEndDate.getMonth(), instrumentEndDate.getDate());
                                              
                                              if (currentDateOnly <= instrumentEndDateOnly) {
                                                const hedgePercentage = instrument.parameters.hedgePercentage || 100;
                                                const coveredAmount = (debtBalance * hedgePercentage) / 100;
                                                
                                                const instrumentResult = applyIndividualHedgingInstrument(point.keyRate, instrument, creditId);
                                                let instrumentRate;
                                                if (instrument.type === 'IRS' || instrument.type === 'SWAP') {
                                                  instrumentRate = instrumentResult.adjustedRate + instrumentResult.premium;
                                                } else {
                                                  instrumentRate = instrumentResult.adjustedRate + credit.credit_spread + instrumentResult.premium;
                                                }
                                                
                                                totalHedgedAmount += instrumentRate * coveredAmount;
                                                totalCoveredAmount += coveredAmount;
                                              }
                                            });
                                            
                                            if (totalCoveredAmount > 0) {
                                              // Weighted average of hedged and unhedged portions
                                              const avgHedgedRate = totalHedgedAmount / totalCoveredAmount;
                                              const unhedgedAmount = debtBalance - totalCoveredAmount;
                                              const combinedRate = (avgHedgedRate * totalCoveredAmount + rate * unhedgedAmount) / debtBalance;
                                              
                                              totalWeightedHedgedRate += combinedRate * debtBalance;
                                            } else {
                                              totalWeightedHedgedRate += rate * debtBalance;
                                            }
                                            } else {
                                              // Срок хеджирования истек
                                              totalWeightedHedgedRate += rate * debtBalance;
                                            }
                                          } else {
                                            totalWeightedHedgedRate += rate * debtBalance;
                                          }
                                        } else {
                                          totalWeightedHedgedRate += rate * debtBalance;
                                        }
                                      }
                                    }
                                  });
                                  
                                  if (hasActiveCredits && totalPrincipal > 0) {
                                    chartData['aggregate'] = totalWeightedRate / totalPrincipal;
                                    if (hedgingInstruments.length > 0) {
                                      chartData['aggregate_hedged'] = totalWeightedHedgedRate / totalPrincipal;
                                    }
                                    
                                    // Используем уже рассчитанный totalPrincipal как суммарный остаток задолженности
                                    chartData['debt_aggregate'] = totalPrincipal;
                                  }
                                } else {
                                  // Individual mode - add effective rate for each selected credit
                                  Array.from(selectedCredits).forEach(creditId => {
                                  const credit = credits.find(c => c.id === creditId);
                                  if (credit) {
                                    const creditStart = new Date(credit.start_date);
                                    const creditEnd = new Date(credit.end_date);
                                    const currentDate = point.originalDate;
                                    
                                    // Use date comparison on the same day basis
                                    const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                                    const creditStartOnly = new Date(creditStart.getFullYear(), creditStart.getMonth(), creditStart.getDate());
                                    const creditEndOnly = new Date(creditEnd.getFullYear(), creditEnd.getMonth(), creditEnd.getDate());
                                    
                                    if (currentDateOnly >= creditStartOnly && currentDateOnly <= creditEndOnly) {
                                      let originalRate;
                                      
                                      if (credit.base_rate_indicator === 'FIXED') {
                                        // Для кредитов с фиксированной ставкой используем base_rate_value
                                        originalRate = credit.base_rate_value;
                                      } else {
                                        // Для кредитов с плавающей ставкой используем прогноз + спред
                                        originalRate = point.keyRate + credit.credit_spread;
                                      }
                                      
                                      // Всегда показываем базовую линию кредита (без хеджирования)
                                      chartData[`credit_${creditId}`] = originalRate;
                                      
                                      // Добавляем остаток задолженности для заливки (нормализованный к процентам от максимального остатка)
                                      const debtBalance = calculateDebtBalance(credit, currentDate);
                                      chartData[`debt_${creditId}`] = debtBalance;
                                      
                                      // Если есть инструменты хеджирования, показываем отдельную линию для каждого
                                      // НО ТОЛЬКО с текущей даты (не показываем хеджирование для прошлых периодов)
                                      // Хеджирование применимо только к кредитам с плавающей ставкой (KEY_RATE)
                                      if (hedgingInstruments.length > 0 && credit.base_rate_indicator === 'KEY_RATE') {
                                        const today = new Date();
                                        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                        
                                        // Хеджирование применяется только с текущей даты
                                        if (currentDateOnly >= todayDateOnly) {
                                          hedgingInstruments.forEach((instrument, index) => {
                                            // Проверяем срок хеджирования для каждого инструмента
                                            const hedgingEndDate = new Date(today);
                                            const hedgingTerm = instrument.parameters.hedgingTerm || 12;
                                            hedgingEndDate.setMonth(hedgingEndDate.getMonth() + hedgingTerm);
                                            const hedgingEndDateOnly = new Date(hedgingEndDate.getFullYear(), hedgingEndDate.getMonth(), hedgingEndDate.getDate());
                                            
                                            if (currentDateOnly <= hedgingEndDateOnly) {
                                              const instrumentResult = applyIndividualHedgingInstrument(point.keyRate, instrument, creditId);
                                              
                                              let instrumentRate;
                                              if (instrument.type === 'IRS' || instrument.type === 'SWAP') {
                                                // Для свопа используется только фиксированная ставка (без прибавления кредитного спреда)
                                                instrumentRate = instrumentResult.adjustedRate + instrumentResult.premium;
                                              } else {
                                                // Для других инструментов (CAP, FLOOR, COLLAR) прибавляется кредитный спред
                                                instrumentRate = instrumentResult.adjustedRate + credit.credit_spread + instrumentResult.premium;
                                              }
                                              
                                              // Создаем уникальный ключ для каждого инструмента
                                              chartData[`hedge_${creditId}_${instrument.id}`] = instrumentRate;
                                            }
                                          });
                                        }
                                      }
                                    }
                                  }
                                });
                                }
                                
                                return chartData;
                              });
                            })()}
                            margin={{ top: 20, right: 70, left: 70, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
                            <XAxis 
                              dataKey="date" 
                              className="text-gray-600 dark:text-gray-400"
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={70}
                              interval="preserveStartEnd"
                              tickCount={8}
                            />
                            <YAxis 
                              className="text-gray-600 dark:text-gray-400"
                              tick={{ fontSize: 12 }}
                              domain={[(() => {
                                // Рассчитываем минимальное значение на основе прогнозов сценария
                                let minRate = 10; // Значение по умолчанию
                                
                                // Проверяем прогнозы сценария
                                if (scenarioForecasts && scenarioForecasts.length > 0) {
                                  const minForecastRate = Math.min(...scenarioForecasts.map(f => f.rate_value));
                                  minRate = minForecastRate;
                                }
                                
                                // Вычитаем 2% и округляем вниз
                                return Math.floor(minRate - 2);
                              })(), 32]}
                              ticks={(() => {
                                // Рассчитываем минимальное значение на основе прогнозов сценария
                                let minRate = 10;
                                
                                if (scenarioForecasts && scenarioForecasts.length > 0) {
                                  const minForecastRate = Math.min(...scenarioForecasts.map(f => f.rate_value));
                                  minRate = minForecastRate;
                                }
                                
                                const minTick = Math.floor(minRate - 2);
                                const ticks = [];
                                for (let i = minTick; i <= 32; i += 2) {
                                  ticks.push(i);
                                }
                                return ticks;
                              })()}
                              label={{ value: 'Ставка, %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                            />
                            <YAxis
                              yAxisId="debt"
                              orientation="right"
                              className="text-gray-600 dark:text-gray-400"
                              tick={{ fontSize: 10 }}
                              domain={[0, 'dataMax']}
                              label={{ value: 'Задолженность, млн руб.', angle: -90, position: 'insideRight', style: { textAnchor: 'middle' } }}
                              tickFormatter={(value) => `${(value / 1000000).toFixed(0)}`}
                              hide={false}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: '#374151',
                                border: '1px solid #4B5563',
                                borderRadius: '6px',
                                color: '#F3F4F6'
                              }}
                              content={({ active, payload, label }) => {
                                if (!active || !payload || payload.length === 0) return null;
                                
                                const firstPayload = payload[0].payload;
                                const date = firstPayload?.originalDate ? new Date(firstPayload.originalDate).toLocaleDateString('ru-RU') : label;
                                
                                // Add source indicator
                                let sourceInfo = '';
                                if (firstPayload?.isExactForecast) {
                                  sourceInfo = ' (точный прогноз)';
                                } else if (firstPayload?.isInterpolated) {
                                  sourceInfo = firstPayload?.isCreditBoundary ? ' (граница кредита)' : ' (интерполировано)';
                                }
                                
                                // Group data by credit or aggregate
                                const groupedData: { [key: string]: { rate?: number, debt?: number, name: string, color: string } } = {};
                                let aggregateData: { rate?: number, hedgedRate?: number, debt?: number } = {};
                                
                                payload.forEach((entry: any) => {
                                  const { dataKey, value, color, name } = entry;
                                  
                                  if (dataKey === 'keyRate') {
                                    // Handle key rate separately
                                    return;
                                  }
                                  
                                  // Handle aggregate mode data
                                  if (dataKey === 'aggregate') {
                                    aggregateData.rate = value;
                                    return;
                                  }
                                  if (dataKey === 'aggregate_hedged') {
                                    aggregateData.hedgedRate = value;
                                    return;
                                  }
                                  if (dataKey === 'debt_aggregate') {
                                    aggregateData.debt = value;
                                    return;
                                  }
                                  
                                  // Handle individual credit data
                                  if (dataKey.startsWith('debt_')) {
                                    // Debt data
                                    const creditId = dataKey.replace('debt_', '');
                                    if (!groupedData[creditId]) {
                                      const credit = credits.find(c => c.id === parseInt(creditId));
                                      groupedData[creditId] = { 
                                        name: credit?.credit_name || `Кредит ${creditId}`, 
                                        color: color 
                                      };
                                    }
                                    groupedData[creditId].debt = value;
                                  } else if (dataKey.startsWith('credit_')) {
                                    // Rate data
                                    const creditId = dataKey.replace('credit_', '');
                                    if (!groupedData[creditId]) {
                                      const credit = credits.find(c => c.id === parseInt(creditId));
                                      groupedData[creditId] = { 
                                        name: credit?.credit_name || `Кредит ${creditId}`, 
                                        color: color 
                                      };
                                    }
                                    groupedData[creditId].rate = value;
                                  }
                                });
                                
                                return (
                                  <div className="bg-gray-700 p-3 rounded border border-gray-600 text-gray-100">
                                    <div className="font-medium mb-2">{`${date}${sourceInfo}`}</div>
                                    
                                    {/* Key Rate */}
                                    {payload.find(entry => entry.dataKey === 'keyRate') && (
                                      <div className="mb-2">
                                        <div className="flex items-center">
                                          <div className="w-3 h-0.5 bg-gray-400 mr-2" style={{ borderStyle: 'dashed' }}></div>
                                          <span className="text-sm">Ключевая ставка ЦБ: {payload.find(entry => entry.dataKey === 'keyRate')?.value.toFixed(2)}%</span>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Aggregate Data */}
                                    {(aggregateData.rate !== undefined || aggregateData.debt !== undefined) && (
                                      <div className="mb-2">
                                        <div className="flex items-center mb-1">
                                          <div className="w-3 h-0.5 bg-blue-400 mr-2"></div>
                                          <span className="font-medium text-sm">Кредитный портфель</span>
                                        </div>
                                        {aggregateData.rate !== undefined && (
                                          <div className="ml-5 text-xs text-gray-300">
                                            Средневзвешенная ставка: {aggregateData.rate.toFixed(2)}%
                                          </div>
                                        )}
                                        {aggregateData.hedgedRate !== undefined && (
                                          <div className="ml-5 text-xs text-gray-300">
                                            Ставка с хеджированием: {aggregateData.hedgedRate.toFixed(2)}%
                                          </div>
                                        )}
                                        {aggregateData.debt !== undefined && (
                                          <div className="ml-5 text-xs text-gray-300">
                                            Совокупная задолженность по портфелю: {(aggregateData.debt / 1000000).toFixed(1)} млн руб.
                                          </div>
                                        )}
                                        {/* Hedging Information */}
                                        {hedgingInstruments.length > 0 && (
                                          <div className="ml-5 mt-2 text-xs">
                                            <div className="text-green-400 font-medium mb-1">Хеджирующие инструменты:</div>
                                            {hedgingInstruments.map((instrument, index) => (
                                              <div key={instrument.id} className="text-gray-300 mb-1">
                                                • {instrument.name}
                                                {instrument.parameters.cap && ` (${instrument.parameters.cap}%)`}
                                                {instrument.parameters.floor && ` (${instrument.parameters.floor}%)`}
                                                {instrument.parameters.hedgePercentage && ` - ${instrument.parameters.hedgePercentage}% портфеля`}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Individual Credits */}
                                    {Object.entries(groupedData).map(([creditId, data]) => (
                                      <div key={creditId} className="mb-2">
                                        <div className="flex items-center mb-1">
                                          <div className="w-3 h-0.5 mr-2" style={{ backgroundColor: data.color }}></div>
                                          <span className="font-medium text-sm">{data.name}</span>
                                        </div>
                                        {data.rate !== undefined && (
                                          <div className="ml-5 text-xs text-gray-300">
                                            Ставка: {data.rate.toFixed(2)}%
                                          </div>
                                        )}
                                        {data.debt !== undefined && (
                                          <div className="ml-5 text-xs text-gray-300">
                                            Задолженность: {(data.debt / 1000000).toFixed(1)} млн руб.
                                          </div>
                                        )}
                                        {/* Hedging for individual mode */}
                                        {hedgingInstruments.length > 0 && viewMode !== 'aggregate' && (
                                          <div className="ml-5 mt-1 text-xs">
                                            <div className="text-green-400 font-medium mb-1">Хеджирующие инструменты:</div>
                                            {hedgingInstruments.map((instrument, index) => (
                                              <div key={instrument.id} className="text-gray-300 mb-1">
                                                • {instrument.name}
                                                {instrument.parameters.cap && ` (${instrument.parameters.cap}%)`}
                                                {instrument.parameters.floor && ` (${instrument.parameters.floor}%)`}
                                                {instrument.parameters.hedgePercentage && ` - ${instrument.parameters.hedgePercentage}% портфеля`}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                );
                              }}
                            />
                            
                            {/* Key rate line */}
                            <Line 
                              type="monotone" 
                              dataKey="keyRate" 
                              stroke="#6B7280" 
                              strokeWidth={1}
                              strokeDasharray="5 5"
                              dot={false}
                              name="keyRate"
                            />
                            
                            {/* Debt balance areas - behind the rate lines */}
                            {viewMode === 'aggregate' ? (
                              // Aggregate mode - total portfolio debt
                              <Area
                                type="monotone"
                                dataKey="debt_aggregate"
                                fill="#3B82F6"
                                fillOpacity={0.1}
                                stroke="none"
                                yAxisId="debt"
                                name="Совокупная задолженность"
                              />
                            ) : (
                              // Individual mode - debt area for each credit
                              Array.from(selectedCredits).map((creditId, index) => {
                                const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
                                const color = colors[index % colors.length];
                                
                                return (
                                  <Area
                                    key={`debt_${creditId}`}
                                    type="monotone"
                                    dataKey={`debt_${creditId}`}
                                    fill={color}
                                    fillOpacity={0.08}
                                    stroke="none"
                                    yAxisId="debt"
                                    name={`Задолженность кредита ${creditId}`}
                                  />
                                );
                              })
                            )}

                            {/* Credit lines or Aggregate lines */}
                            {viewMode === 'aggregate' ? (
                              // Aggregate mode - single weighted average line
                              <>
                                <Line 
                                  type="monotone" 
                                  dataKey="aggregate"
                                  stroke="#3B82F6"
                                  strokeWidth={3}
                                  dot={false}
                                  name="Суммарная позиция"
                                />
                                {hedgingInstruments.length > 0 && (
                                  <Line 
                                    type="monotone" 
                                    dataKey="aggregate_hedged"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    strokeDasharray="8 4"
                                    dot={false}
                                    name="Суммарная позиция (с хеджированием)"
                                  />
                                )}
                              </>
                            ) : (
                              // Individual mode - line for each credit
                              Array.from(selectedCredits).map((creditId, index) => {
                              const credit = credits.find(c => c.id === creditId);
                              if (!credit) return null;
                              
                              const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
                              const color = colors[index % colors.length];
                              
                              return (
                                <>
                                  <Line 
                                    key={`credit_${creditId}`}
                                    type="monotone" 
                                    dataKey={`credit_${creditId}`}
                                    stroke={color}
                                    strokeWidth={2}
                                    dot={(props: any) => {
                                      // Check if this is a credit boundary point
                                      const isStart = props.payload?.isCreditBoundary && props.payload?.boundaryType === 'start' && props.payload?.creditId === creditId;
                                      const isEnd = props.payload?.isCreditBoundary && props.payload?.boundaryType === 'end' && props.payload?.creditId === creditId;
                                      
                                      if (isStart || isEnd) {
                                        return (
                                          <circle
                                            cx={props.cx}
                                            cy={props.cy}
                                            r={6}
                                            fill={color}
                                            stroke="white"
                                            strokeWidth={2}
                                            opacity={1}
                                          />
                                        );
                                      }
                                      
                                      // Regular dots for forecast points
                                      if (props.payload?.hasForecastData) {
                                        return (
                                          <circle
                                            cx={props.cx}
                                            cy={props.cy}
                                            r={3}
                                            fill={color}
                                            stroke={color}
                                            strokeWidth={1}
                                            opacity={0.8}
                                          />
                                        );
                                      }
                                      
                                      // No dot for interpolated points - return invisible dot
                                      return (
                                        <circle
                                          cx={props.cx}
                                          cy={props.cy}
                                          r={0}
                                          fill="transparent"
                                        />
                                      );
                                    }}
                                    name={credit.credit_name}
                                  />
                                  
                                  {/* Отдельные линии для каждого инструмента хеджирования - только для кредитов с KEY_RATE */}
                                  {hedgingInstruments.length > 0 && credit.base_rate_indicator === 'KEY_RATE' && hedgingInstruments.map((instrument, instrumentIndex) => {
                                    // Используем тот же цвет что и у кредита, но пунктирной линией
                                    const dashPatterns = ['8 4', '12 3', '6 6', '15 5', '4 8'];
                                    
                                    const hedgeColor = color; // Тот же цвет что у кредита
                                    const dashPattern = dashPatterns[instrumentIndex % dashPatterns.length];
                                    
                                    return (
                                      <Line 
                                        key={`hedge_${creditId}_${instrument.id}`}
                                        type="monotone" 
                                        dataKey={`hedge_${creditId}_${instrument.id}`}
                                        stroke={hedgeColor}
                                        strokeWidth={3}
                                        strokeDasharray={dashPattern}
                                        strokeOpacity={1}
                                        dot={false}
                                        name={`${credit.credit_name} (${instrument.name})`}
                                      />
                                    );
                                  })}
                                </>
                              );
                            })
                            )}
                            
                            {/* Reference lines for credit periods */}
                            {Array.from(selectedCredits).map((creditId, index) => {
                              const credit = credits.find(c => c.id === creditId);
                              if (!credit) return null;
                              
                              const creditStart = new Date(credit.start_date);
                              const creditEnd = new Date(credit.end_date);
                              
                              const startDateFormatted = `${creditStart.getDate().toString().padStart(2, '0')}.${(creditStart.getMonth() + 1).toString().padStart(2, '0')}.${creditStart.getFullYear().toString().substr(2)}`;
                              const endDateFormatted = `${creditEnd.getDate().toString().padStart(2, '0')}.${(creditEnd.getMonth() + 1).toString().padStart(2, '0')}.${creditEnd.getFullYear().toString().substr(2)}`;
                              const color = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'][index % 5];
                              
                              return (
                                <React.Fragment key={`ref-${creditId}`}>
                                  <ReferenceLine 
                                    x={startDateFormatted}
                                    stroke={color}
                                    strokeDasharray="2 2"
                                    strokeWidth={1}
                                    opacity={0.5}
                                  />
                                  <ReferenceLine 
                                    x={endDateFormatted}
                                    stroke={color}
                                    strokeDasharray="2 2"
                                    strokeWidth={1}
                                    opacity={0.5}
                                  />
                                </React.Fragment>
                              );
                            })}
                          </ComposedChart>
                          </ResponsiveContainer>
                        )}
                        </div>
                        
                        {/* Custom Legend */}
                        {selectedCredits.size > 0 && (
                          <div className="mt-4 flex flex-wrap justify-center gap-4">
                            {/* Key Rate */}
                            <div className="flex items-center space-x-2">
                              <svg width="32" height="4">
                                <line
                                  x1="0"
                                  y1="2"
                                  x2="32"
                                  y2="2"
                                  stroke="#6B7280"
                                  strokeWidth="2"
                                  strokeDasharray="5 5"
                                />
                              </svg>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Ключевая ставка ЦБ
                              </span>
                            </div>
                            
                            {/* Credits or Aggregate */}
                            {viewMode === 'aggregate' ? (
                              <>
                                <div className="flex items-center space-x-2">
                                  <svg width="32" height="4">
                                    <line
                                      x1="0"
                                      y1="2"
                                      x2="32"
                                      y2="2"
                                      stroke="#3B82F6"
                                      strokeWidth="3"
                                    />
                                  </svg>
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Средневзвешенная ставка
                                  </span>
                                </div>
                                {hedgingInstruments.length > 0 && (
                                  <div className="flex items-center space-x-2">
                                    <svg width="32" height="4">
                                      <line
                                        x1="0"
                                        y1="2"
                                        x2="32"
                                        y2="2"
                                        stroke="#3B82F6"
                                        strokeWidth="3"
                                        strokeDasharray="8 4"
                                      />
                                    </svg>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      С хеджированием ({hedgingInstruments.length} инстр.)
                                    </span>
                                  </div>
                                )}
                                
                              </>
                            ) : (
                              <>
                                {Array.from(selectedCredits).map((creditId, index) => {
                                const credit = credits.find(c => c.id === creditId);
                                if (!credit) return null;
                                const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
                                const color = colors[index % colors.length];
                                
                                return (
                                  <div key={`credit-${creditId}`} className="flex items-center space-x-2">
                                    <svg width="32" height="4">
                                      <line
                                        x1="0"
                                        y1="2"
                                        x2="32"
                                        y2="2"
                                        stroke={color}
                                        strokeWidth="2"
                                      />
                                    </svg>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      {credit.credit_name}
                                    </span>
                                  </div>
                                );
                                })}
                                
                                {/* Hedging line for individual mode - same as aggregate */}
                                {hedgingInstruments.length > 0 && (
                                  <div className="flex items-center space-x-2">
                                    <svg width="32" height="4">
                                      <line
                                        x1="0"
                                        y1="2"
                                        x2="32"
                                        y2="2"
                                        stroke="#3B82F6"
                                        strokeWidth="3"
                                        strokeDasharray="8 4"
                                      />
                                    </svg>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      С хеджированием ({hedgingInstruments.length} инстр.)
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                            
                            
                          </div>
                        )}
                      </div>
                      
                    </div>
                  )}


                  {/* Multi-Scenario Results Table */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      {viewMode === 'aggregate' ? 'Анализ суммарной кредитной позиции' : 'Детальный анализ по кредитам'}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-4 pr-6 text-sm font-medium text-gray-600 dark:text-gray-400 sticky left-0 bg-white dark:bg-gray-800">
                              {viewMode === 'aggregate' ? 'Кредитный портфель' : 'Наименование кредита'}
                            </th>
                            {scenarios.map((scenario) => (
                              <th key={scenario.id} className="text-center py-4 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[250px]">
                                <div className="flex flex-col">
                                  <span className="font-semibold">{scenario.name}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Выплаты по сценарию
                                  </span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            // Получаем уникальные кредиты из analysisResults
                            const uniqueCredits = analysisResults.reduce((acc, result) => {
                              if (!acc.find(c => c.credit_id === result.credit_id)) {
                                acc.push({
                                  credit_id: result.credit_id,
                                  credit_name: result.credit_name
                                });
                              }
                              return acc;
                            }, [] as Array<{credit_id: number, credit_name: string}>);
                            
                            // Функция расчета выплат для конкретного кредита по сценарию
                            const calculatePaymentsForScenario = (creditId: number, scenarioData: any) => {
                              const credit = credits.find(c => c.id === creditId);
                              if (!credit || !scenarioData?.forecasts?.length) return { unhedged: 0, instruments: [] };
                              
                              const today = new Date();
                              const startDate = new Date(credit.start_date);
                              const endDate = new Date(credit.end_date);
                              const principal = credit.principal_amount;
                              
                              if (endDate <= today) return { unhedged: 0, instruments: [] };
                              
                              const futureDays = Math.max(0, Math.ceil((endDate.getTime() - Math.max(today.getTime(), startDate.getTime())) / (1000 * 60 * 60 * 24)));
                              if (futureDays === 0) return { unhedged: 0, instruments: [] };
                              
                              // Расчет средней ставки по сценарию
                              const avgScenarioRate = scenarioData.forecasts.reduce((sum: number, f: any) => sum + f.rate_value, 0) / scenarioData.forecasts.length;
                              
                              // Расчет без хеджирования
                              let unhedgedRate;
                              if (credit.base_rate_indicator === 'FIXED') {
                                // Для фиксированной ставки используем base_rate_value
                                unhedgedRate = credit.base_rate_value;
                              } else {
                                // Для плавающей ставки используем сценарий + спред
                                unhedgedRate = avgScenarioRate + credit.credit_spread;
                              }
                              const unhedgedPayments = principal * (unhedgedRate / 100) * (futureDays / 365);
                              
                              // Расчет для каждого инструмента отдельно
                              const instrumentsResults = credit.base_rate_indicator === 'FIXED' 
                                ? [] // Для фиксированной ставки хеджирование не применяется
                                : hedgingInstruments.map(instrument => {
                                  const instrumentResult = applyIndividualHedgingInstrument(avgScenarioRate, instrument, creditId);
                                  
                                  let instrumentRate;
                                  if (instrument.type === 'IRS' || instrument.type === 'SWAP') {
                                    // Для свопа используется только фиксированная ставка (без прибавления кредитного спреда)
                                    instrumentRate = instrumentResult.adjustedRate + instrumentResult.premium;
                                  } else {
                                    // Для других инструментов (CAP, FLOOR, COLLAR) прибавляется кредитный спред
                                    instrumentRate = instrumentResult.adjustedRate + credit.credit_spread + instrumentResult.premium;
                                  }
                                  
                                  const instrumentPayments = principal * (instrumentRate / 100) * (futureDays / 365);
                                  
                                  return {
                                    instrument,
                                    payments: instrumentPayments,
                                    savings: unhedgedPayments - instrumentPayments,
                                    savingsPercent: unhedgedPayments > 0 ? ((unhedgedPayments - instrumentPayments) / unhedgedPayments * 100) : 0
                                  };
                                });
                              
                              return { 
                                unhedged: unhedgedPayments,
                                instruments: instrumentsResults
                              };
                            };
                            
                            // Если нет выбранных кредитов, показываем сообщение
                            if (uniqueCredits.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={scenarios.length + 1} className="py-12 text-center">
                                    <div className="flex flex-col items-center space-y-3 text-gray-500 dark:text-gray-400">
                                      <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <p className="text-lg font-medium">Нет выбранных кредитов для анализа</p>
                                      <p className="text-sm max-w-md text-center">
                                        Выберите кредиты в левой панели, чтобы увидеть детальный анализ выплат по различным сценариям
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                            
                            if (viewMode === 'aggregate') {
                              // Aggregate mode - single row with total values
                              const totalPrincipal = credits
                                .filter(c => selectedCredits.has(c.id))
                                .reduce((sum, c) => sum + c.principal_amount, 0);
                              
                              return (
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                  <td className="py-6 pr-6 sticky left-0 bg-white dark:bg-gray-800 align-top">
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      Суммарная позиция
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-300">
                                      {formatCurrency(totalPrincipal)} • {selectedCredits.size} кредитов
                                    </div>
                                  </td>
                                  {scenarios.map((scenario) => {
                                    // Calculate total payments for all credits
                                    let totalUnhedged = 0;
                                    let totalHedged = 0;
                                    let totalSavings = 0;
                                    
                                    Array.from(selectedCredits).forEach(creditId => {
                                      const payments = calculatePaymentsForScenario(creditId, scenario);
                                      totalUnhedged += payments.unhedged;
                                      
                                      if (hedgingInstruments.length > 0 && payments.instruments.length > 0) {
                                        // Use best hedging option
                                        const bestInstrument = payments.instruments.reduce((best, current) => 
                                          current.savings > best.savings ? current : best
                                        );
                                        totalHedged += bestInstrument.payments;
                                        totalSavings += bestInstrument.savings;
                                      }
                                    });
                                    
                                    const hasHedging = hedgingInstruments.length > 0 && totalSavings > 0;
                                    
                                    return (
                                      <td key={scenario.id} className="text-center py-6 px-4 font-medium min-w-[250px] text-gray-900 dark:text-white align-top">
                                        <div className="flex flex-col items-center space-y-3">
                                          <div className="flex flex-col items-center">
                                            <span className="text-base font-medium">
                                              {formatCurrency(totalUnhedged)}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                              Без хеджирования
                                            </span>
                                          </div>
                                          
                                          {hasHedging && (
                                            <>
                                              <div className="border-t border-gray-300 dark:border-gray-600 w-full"></div>
                                              <div className="flex flex-col items-center space-y-1">
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-xs px-2 py-1 rounded font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                                                    Оптимальное хеджирование
                                                  </span>
                                                  <span className="text-base font-bold text-green-600 dark:text-green-400">
                                                    {formatCurrency(totalHedged)}
                                                  </span>
                                                </div>
                                                <span className="text-xs text-green-600 dark:text-green-400">
                                                  Экономия: {formatCurrency(totalSavings)} ({(totalSavings / totalUnhedged * 100).toFixed(1)}%)
                                                </span>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            }
                            
                            // Individual mode - row for each credit
                            return uniqueCredits.map((creditInfo) => (
                              <tr key={creditInfo.credit_id} className="border-b border-gray-100 dark:border-gray-800">
                                <td className="py-6 pr-6 sticky left-0 bg-white dark:bg-gray-800 align-top">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {creditInfo.credit_name}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-300">
                                    {(() => {
                                      const credit = credits.find(c => c.id === creditInfo.credit_id);
                                      if (credit) {
                                        const startDate = new Date(credit.start_date).toLocaleDateString('ru-RU');
                                        const endDate = new Date(credit.end_date).toLocaleDateString('ru-RU');
                                        const rateInfo = credit.base_rate_indicator === 'FIXED' 
                                          ? `FIX: ${credit.base_rate_value}%`
                                          : `КС + ${credit.credit_spread}%`;
                                        return `${formatCurrency(Number(credit.principal_amount), credit.currency)} • ${rateInfo} • ${startDate} - ${endDate}`;
                                      }
                                      return '';
                                    })()}
                                  </div>
                                </td>
                                {scenarios.map((scenario) => {
                                  const payments = calculatePaymentsForScenario(creditInfo.credit_id, scenario);
                                  const isCurrentScenario = scenario.id === selectedScenario;
                                  const hasHedging = hedgingInstruments.length > 0;
                                  
                                  return (
                                    <td key={scenario.id} className="text-center py-6 px-4 font-medium min-w-[250px] text-gray-900 dark:text-white align-top">
                                      <div className="flex flex-col items-center space-y-3">
                                        {/* Сумма без хеджирования */}
                                        <div className="flex flex-col items-center">
                                          <span className="text-base font-medium">
                                            {formatCurrency(payments.unhedged)}
                                          </span>
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            Без хеджирования
                                          </span>
                                        </div>
                                        
                                        {/* Разделитель */}
                                        {hasHedging && (
                                          <div className="border-t border-gray-300 dark:border-gray-600 w-full"></div>
                                        )}
                                        
                                        {/* Результаты для каждого инструмента */}
                                        {payments.instruments.map((instrumentResult, index) => (
                                          <div key={instrumentResult.instrument.id} className="flex flex-col items-center space-y-1 min-h-[60px]">
                                            <div className="flex items-center space-x-2">
                                              <span className={`text-xs px-2 py-1 rounded font-medium ${instrumentResult.payments > payments.unhedged ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'}`}>
                                                {instrumentResult.instrument.type}
                                              </span>
                                              <span className={`text-base font-bold ${instrumentResult.payments > payments.unhedged ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                {formatCurrency(instrumentResult.payments)}
                                              </span>
                                            </div>
                                            {/* Экономия для инструмента - всегда показываем область для сохранения высоты */}
                                            <div className="min-h-[20px] flex items-center">
                                              {instrumentResult.savings > 1000 ? (
                                                <span className="text-xs text-green-600 dark:text-green-400">
                                                  Экономия: {formatCurrency(instrumentResult.savings)} ({instrumentResult.savingsPercent.toFixed(1)}%)
                                                </span>
                                              ) : (
                                                <span className="text-xs text-transparent">
                                                  &nbsp;
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}