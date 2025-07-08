import React from 'react';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-orange-100 mb-2">
        <span>Progresso do formulário</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-orange-800 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-yellow-400 to-orange-300 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;