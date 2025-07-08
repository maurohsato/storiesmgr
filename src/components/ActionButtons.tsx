import React from 'react';
import { Save, FileText, Send, Loader2 } from 'lucide-react';

interface ActionButtonsProps {
  onSave: () => void;
  onExportPDF: () => void;
  onSendToBacklog: () => void;
  isSubmitting: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSave,
  onExportPDF,
  onSendToBacklog,
  isSubmitting
}) => {
  const buttonBaseClasses = "flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <button
        onClick={onSave}
        disabled={isSubmitting}
        className={`${buttonBaseClasses} bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg disabled:bg-orange-400`}
      >
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Save className="h-5 w-5" />
        )}
        <span>Salvar como Rascunho</span>
      </button>
      
      <button
        onClick={onExportPDF}
        disabled={isSubmitting}
        className={`${buttonBaseClasses} bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg disabled:bg-green-400`}
      >
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <FileText className="h-5 w-5" />
        )}
        <span>Exportar PDF</span>
      </button>
      
      <button
        onClick={onSendToBacklog}
        disabled={isSubmitting}
        className={`${buttonBaseClasses} bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg disabled:bg-blue-400`}
      >
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
        <span>Enviar para o backlog</span>
      </button>
    </div>
  );
};

export default ActionButtons;