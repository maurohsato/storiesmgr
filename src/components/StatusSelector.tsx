import React from 'react';
import { Check, Clock, Play, Eye, Pause } from 'lucide-react';

interface StatusOption {
  value: string;
  label: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface StatusSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
}

const statusOptions: StatusOption[] = [
  {
    value: 'draft',
    label: 'Rascunho',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 border-gray-300',
    icon: Pause,
    description: 'História em desenvolvimento'
  },
  {
    value: 'ready',
    label: 'Pronta',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 border-yellow-300',
    icon: Clock,
    description: 'Pronta para desenvolvimento'
  },
  {
    value: 'in-progress',
    label: 'Em Andamento',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-300',
    icon: Play,
    description: 'Sendo desenvolvida'
  },
  {
    value: 'in-review',
    label: 'Em Revisão',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 border-purple-300',
    icon: Eye,
    description: 'Em processo de revisão'
  },
  {
    value: 'done',
    label: 'Finalizado',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-300',
    icon: Check,
    description: 'História finalizada'
  }
];

const StatusSelector: React.FC<StatusSelectorProps> = ({ value, onChange, label, required = false, disabled = false }) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {statusOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              onMouseDown={(e) => e.preventDefault()}
              disabled={disabled}
              className={`relative flex flex-col items-center p-3 border-2 rounded-lg transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                isSelected
                  ? `${option.bgColor} border-current shadow-md transform scale-105`
                  : 'bg-white border-gray-200 hover:border-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`flex-shrink-0 p-2 rounded-full mb-2 ${isSelected ? option.bgColor : 'bg-gray-100'}`}>
                <Icon className={`h-5 w-5 ${isSelected ? option.color : 'text-gray-500'}`} />
              </div>
              
              <div className="text-center">
                <div className={`text-sm font-medium ${isSelected ? option.color : 'text-gray-900'}`}>
                  {option.label}
                </div>
                <div className={`text-xs mt-1 ${isSelected ? option.color.replace('700', '600') : 'text-gray-500'}`}>
                  {option.description}
                </div>
              </div>
              
              {isSelected && (
                <div className="absolute top-1 right-1">
                  <div className={`w-3 h-3 rounded-full ${
                    option.color.includes('gray') ? 'bg-gray-600' : 
                    option.color.includes('yellow') ? 'bg-yellow-600' : 
                    option.color.includes('blue') ? 'bg-blue-600' : 
                    option.color.includes('purple') ? 'bg-purple-600' :
                    'bg-green-600'
                  }`} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {value && (
        <div className="mt-2 text-xs text-gray-600">
          Status selecionado: <span className="font-medium">{statusOptions.find(opt => opt.value === value)?.label}</span>
        </div>
      )}
    </div>
  );
};

export default StatusSelector;