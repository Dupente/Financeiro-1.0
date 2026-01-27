
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
  const isBalance = title.toLowerCase().includes('balanço') || title.toLowerCase().includes('saldo');

  const getTextColor = () => {
    // Se o valor for zero, tratamos como neutro/positivo (verde)
    if (Math.abs(value) < 0.001) return 'text-emerald-500';
    
    if (isIncome) return 'text-emerald-500';
    if (isExpense) return 'text-rose-500';
    if (isBalance) return isPositive ? 'text-emerald-500' : 'text-rose-500';
    return isDarkMode ? 'text-white' : 'text-slate-800';
  };

  return (
    <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-all hover:scale-[1.02] cursor-default ${
      isDarkMode 
      ? 'bg-slate-900 border-slate-800' 
      : 'bg-white border-slate-200'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="overflow-hidden">
          <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
          <h3 className={`text-2xl font-black mt-1 truncate ${getTextColor()}`}>
            {Math.abs(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
        </div>
        <div className={`${color} p-3 rounded-xl shadow-lg shadow-indigo-500/10 shrink-0`}>
          {icon}
        </div>
      </div>
      {description && (
        <p className={`text-[10px] font-bold uppercase tracking-tight truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {description}
        </p>
      )}
    </div>
  );
};
