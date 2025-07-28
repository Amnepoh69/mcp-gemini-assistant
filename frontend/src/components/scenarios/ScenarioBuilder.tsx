/**
 * Scenario builder component
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings,
  Play,
  Save,
  ArrowLeft,
  Plus,
  X,
  AlertTriangle,
  DollarSign,
  Globe,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MarketDataPanel } from '@/components/scenarios/MarketDataPanel';
import { MarketIndicator, ScenarioParameter, ScenarioTemplate, RiskLevel } from '@/types/scenario';

interface ScenarioBuilderProps {
  onScenarioCreate?: (scenario: any) => void;
}

export const ScenarioBuilder: React.FC<ScenarioBuilderProps> = ({ onScenarioCreate }) => {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ScenarioTemplate | null>(null);
  const [parameters, setParameters] = useState<ScenarioParameter[]>([]);
  const [selectedMarketData, setSelectedMarketData] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const templates: ScenarioTemplate[] = [
    {
      id: 'recession',
      name: 'Economic Recession',
      description: 'Model impact of economic downturn on business performance',
      category: 'financial',
      icon: '📉',
      parameters: [
        {
          indicator: MarketIndicator.GDP_GROWTH,
          current_value: 2.5,
          scenario_value: -1.5,
          change_percentage: -160,
          impact_weight: 0.3
        },
        {
          indicator: MarketIndicator.UNEMPLOYMENT_RATE,
          current_value: 5.0,
          scenario_value: 8.5,
          change_percentage: 70,
          impact_weight: 0.25
        },
        {
          indicator: MarketIndicator.CONSUMER_CONFIDENCE,
          current_value: 75,
          scenario_value: 45,
          change_percentage: -40,
          impact_weight: 0.2
        }
      ]
    },
    {
      id: 'inflation',
      name: 'High Inflation Scenario',
      description: 'Analyze effects of sustained high inflation on operations',
      category: 'market',
      icon: '📈',
      parameters: [
        {
          indicator: MarketIndicator.INFLATION_RATE,
          current_value: 3.2,
          scenario_value: 7.5,
          change_percentage: 134,
          impact_weight: 0.35
        },
        {
          indicator: MarketIndicator.INTEREST_RATE,
          current_value: 2.5,
          scenario_value: 5.5,
          change_percentage: 120,
          impact_weight: 0.3
        }
      ]
    },
    {
      id: 'growth',
      name: 'Rapid Growth',
      description: 'Model scaling challenges and opportunities',
      category: 'strategic',
      icon: '🚀',
      parameters: [
        {
          indicator: MarketIndicator.GDP_GROWTH,
          current_value: 2.5,
          scenario_value: 5.2,
          change_percentage: 108,
          impact_weight: 0.25
        },
        {
          indicator: MarketIndicator.CONSUMER_CONFIDENCE,
          current_value: 75,
          scenario_value: 90,
          change_percentage: 20,
          impact_weight: 0.2
        }
      ]
    },
    {
      id: 'custom',
      name: 'Custom Scenario',
      description: 'Build your own scenario from scratch',
      category: 'operational',
      icon: '⚙️',
      parameters: []
    }
  ];

  const marketIndicatorOptions = [
    { value: MarketIndicator.INFLATION_RATE, label: 'Inflation Rate' },
    { value: MarketIndicator.INTEREST_RATE, label: 'Interest Rate' },
    { value: MarketIndicator.GDP_GROWTH, label: 'GDP Growth' },
    { value: MarketIndicator.UNEMPLOYMENT_RATE, label: 'Unemployment Rate' },
    { value: MarketIndicator.CURRENCY_EXCHANGE, label: 'Currency Exchange' },
    { value: MarketIndicator.COMMODITY_PRICES, label: 'Commodity Prices' },
    { value: MarketIndicator.STOCK_MARKET, label: 'Stock Market' },
    { value: MarketIndicator.CONSUMER_CONFIDENCE, label: 'Consumer Confidence' }
  ];

  const handleTemplateSelect = (template: ScenarioTemplate) => {
    setSelectedTemplate(template);
    setScenarioName(template.name);
    setScenarioDescription(template.description);
    setParameters(template.parameters);
    if (template.id !== 'custom') {
      setActiveStep(4); // Skip parameter setup for predefined templates
    } else {
      setActiveStep(2);
    }
  };

  const addParameter = () => {
    const newParameter: ScenarioParameter = {
      indicator: MarketIndicator.INFLATION_RATE,
      current_value: 0,
      scenario_value: 0,
      change_percentage: 0,
      impact_weight: 0.1
    };
    setParameters([...parameters, newParameter]);
  };

  const updateParameter = (index: number, field: keyof ScenarioParameter, value: any) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate change percentage
    if (field === 'current_value' || field === 'scenario_value') {
      const current = field === 'current_value' ? value : updated[index].current_value;
      const scenario = field === 'scenario_value' ? value : updated[index].scenario_value;
      if (current !== 0) {
        updated[index].change_percentage = ((scenario - current) / current) * 100;
      }
    }
    
    setParameters(updated);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const runScenario = async () => {
    setIsRunning(true);
    
    // Simulate scenario execution
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const scenarioData = {
      name: scenarioName,
      description: scenarioDescription,
      parameters: parameters.reduce((acc, param) => {
        acc[param.indicator] = {
          current_value: param.current_value,
          scenario_value: param.scenario_value,
          change_percentage: param.change_percentage,
          impact_weight: param.impact_weight
        };
        return acc;
      }, {} as Record<string, any>),
      market_indicators: parameters.map(p => p.indicator),
      external_market_data: selectedMarketData
    };
    
    setIsRunning(false);
    onScenarioCreate?.(scenarioData);
    
    // Redirect to results (placeholder)
    alert('Scenario executed successfully! Results would be displayed here.');
  };

  const steps = [
    { number: 1, title: 'Choose Template', description: 'Select a scenario template' },
    { number: 2, title: 'Configure Parameters', description: 'Set market indicators and values' },
    { number: 3, title: 'Market Data', description: 'Review external market data' },
    { number: 4, title: 'Review & Run', description: 'Review scenario and execute analysis' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/scenarios')}
          icon={ArrowLeft}
          size="sm"
        >
          Back to Scenarios
        </Button>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Create Financial Scenario
        </h1>
        <p className="text-gray-600">
          Model market conditions and analyze their impact on your business
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-8">
        {steps.map((step) => (
          <div key={step.number} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step.number <= activeStep 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              {step.number}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                step.number <= activeStep ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {step.title}
              </p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
            {step.number < steps.length && (
              <div className={`mx-4 w-8 h-0.5 ${
                step.number < activeStep ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Template Selection */}
      {activeStep === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className="bg-white border rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">{template.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    {template.category}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 mb-4">{template.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {template.parameters.length} parameters
                </span>
                <Button size="sm" variant="outline">
                  Select
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 2: Parameter Configuration */}
      {activeStep === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Scenario Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Input
                label="Scenario Name"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g., Q1 2024 Market Downturn"
                required
              />
              
              <Input
                label="Description"
                value={scenarioDescription}
                onChange={(e) => setScenarioDescription(e.target.value)}
                placeholder="Brief description of the scenario"
              />
            </div>

            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Market Indicators</h4>
              <Button onClick={addParameter} icon={Plus} size="sm">
                Add Indicator
              </Button>
            </div>

            <div className="space-y-4">
              {parameters.map((param, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">
                      Indicator {index + 1}
                    </h5>
                    <button
                      onClick={() => removeParameter(index)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <Select
                      options={marketIndicatorOptions}
                      value={param.indicator}
                      onChange={(e) => updateParameter(index, 'indicator', e.target.value)}
                      placeholder="Select indicator"
                    />
                    
                    <Input
                      type="number"
                      step="0.1"
                      value={param.current_value}
                      onChange={(e) => updateParameter(index, 'current_value', parseFloat(e.target.value))}
                      placeholder="Current value"
                      label="Current"
                    />
                    
                    <Input
                      type="number"
                      step="0.1"
                      value={param.scenario_value}
                      onChange={(e) => updateParameter(index, 'scenario_value', parseFloat(e.target.value))}
                      placeholder="Scenario value"
                      label="Scenario"
                    />
                    
                    <Input
                      type="number"
                      step="0.1"
                      value={param.change_percentage.toFixed(1)}
                      readOnly
                      label="Change %"
                      className="bg-gray-100"
                    />
                    
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={param.impact_weight}
                      onChange={(e) => updateParameter(index, 'impact_weight', parseFloat(e.target.value))}
                      placeholder="0.1"
                      label="Weight"
                    />
                  </div>
                </div>
              ))}
            </div>

            {parameters.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>No indicators added yet. Click "Add Indicator" to get started.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveStep(1)}>
              Back
            </Button>
            <Button 
              onClick={() => setActiveStep(3)}
              disabled={parameters.length === 0 || !scenarioName}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Market Data */}
      {activeStep === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              External Market Data
            </h3>
            <p className="text-gray-600 mb-6">
              Review current market data to enhance your scenario analysis with real-time insights.
            </p>
            
            <MarketDataPanel 
              onDataSelected={setSelectedMarketData}
              className="mb-6"
            />
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveStep(2)}>
              Back
            </Button>
            <Button onClick={() => setActiveStep(4)}>
              Continue to Review
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Run */}
      {activeStep === 4 && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Scenario Summary
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <p className="text-gray-900">{scenarioName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <p className="text-gray-600">{scenarioDescription || 'No description'}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Market Indicators</h4>
              <div className="space-y-3">
                {parameters.map((param, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {marketIndicatorOptions.find(opt => opt.value === param.indicator)?.label}
                        </p>
                        <p className="text-sm text-gray-500">
                          {param.current_value} → {param.scenario_value}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        param.change_percentage > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {param.change_percentage > 0 ? '+' : ''}{param.change_percentage.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500">
                        Weight: {param.impact_weight}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedMarketData && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">External Market Data</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Currency Rates</p>
                      <p className="font-medium text-gray-900">
                        {selectedMarketData.currency_rates?.length || 0} currencies
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Market Indices</p>
                      <p className="font-medium text-gray-900">
                        {selectedMarketData.market_indices?.length || 0} indices
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Commodities</p>
                      <p className="font-medium text-gray-900">
                        {selectedMarketData.commodity_prices?.length || 0} commodities
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last Updated</p>
                      <p className="font-medium text-gray-900">
                        {selectedMarketData.last_updated ? 
                          new Date(selectedMarketData.last_updated).toLocaleString() : 
                          'Never'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveStep(3)}>
              Back
            </Button>
            <div className="space-x-3">
              <Button variant="outline" icon={Save}>
                Save Draft
              </Button>
              <Button 
                onClick={runScenario}
                isLoading={isRunning}
                icon={Play}
                variant="primary"
              >
                {isRunning ? 'Running Scenario...' : 'Run Scenario'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};