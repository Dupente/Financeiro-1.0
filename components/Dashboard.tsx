
import React from 'react';

interface DashboardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  description?: string;
  isDarkMode?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ title, value, icon, color, description, isDarkMode }) => {
  const isPositive = value >= 0;
  // Lógica mais robusta para detecção de tipo baseado no título
  const isIncome = title.toLowerCase().includes('receita');
  const isExpense = title.toLowerCase().includes('despesa');

  return (
    <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-all hover:scale-[1.02] cursor-default ${
      isDarkMode 
      ? 'bg-slate-900 border-slate-800' 
      : 'bg-white border-slate-200'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
          <h3 className={`text-2xl font-bold mt-1 truncate ${
            isIncome 
              ? 'text-emerald-500' 
              : isExpense 
                ? 'text-rose-500' 
                : (isDarkMode ? 'text-white' : 'text-slate-800')
          }`}>
            {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
        </div>
        <div className={`${color} p-3 rounded-xl shadow-lg shadow-indigo-500/10`}>
          {icon}
        </div>
      </div>
      {description && (
        <p className={`text-[10px] font-bold uppercase tracking-tight ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {description}
        </p>
      )}
    </div>
  );
};
