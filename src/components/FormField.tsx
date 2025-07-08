import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  type: 'text' | 'textarea' | 'date';
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  type,
  value,
  onChange,
  required = false,
  placeholder,
  disabled = false
}) => {
  const baseInputClasses = "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors";
  const textareaClasses = "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors min-h-[100px] resize-y";
  
  const disabledClasses = disabled ? "bg-gray-50 text-gray-600 cursor-not-allowed" : "";

  return (
    <div className="space-y-2">
      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
        <span>{label}</span>
        {required && <AlertCircle className="h-4 w-4 text-red-500" />}
      </label>
      
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${textareaClasses} ${disabledClasses}`}
          required={required}
          disabled={disabled}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${baseInputClasses} ${disabledClasses}`}
          required={required}
          disabled={disabled}
        />
      )}
      
      {type === 'textarea' && (
        <div className="text-xs text-gray-500 text-right">
          {value.length} caracteres
        </div>
      )}
    </div>
  );
};

export default FormField;