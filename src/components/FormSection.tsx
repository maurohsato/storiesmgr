import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface FormSectionProps {
  title: string;
  icon: LucideIcon;
  isActive: boolean;
  children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, icon: Icon, isActive, children }) => {
  return (
    <div className={`transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-50'}`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Icon className="h-6 w-6 text-orange-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
};

export default FormSection;