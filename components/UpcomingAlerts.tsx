
import React from 'react';
import { Transaction, TransactionStatus, TransactionType } from '../types';
import { AlertCircle, Calendar, ChevronRight } from 'lucide-react';

interface UpcomingAlertsProps {
  transactions: Transaction[];
  isDarkMode: boolean;
}

export const UpcomingAlerts: React.FC<UpcomingAlertsProps> = ({ transactions, isDarkMode }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next7Days = new Date();
  next7Days.setDate(today.getDate() + 7);
  next7Days.setHours(23, 59, 59, 999);

  const upcoming = transactions.filter(t => {
    if (t.status !== TransactionStatus.PENDING) return false;
    const tDate = new Date(t.date);
    return tDate >= today && tDate <= next7Days;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (upcoming.length === 0) {
    return (
      <div className={`p-6 rounded-2xl border border-dashed transition-colors ${
        isDarkMode ? 'border-slate-800 bg-slate-900/50 text-slate-500' : 'border-slate-200 bg-white text-slate-400'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={18} />
          <h3 className="font-bold text-sm">Alertas de Vencimento</h3>
        </div>
        <p className="text-xs">Tudo em dia! Nenhuma conta vencendo nos próximos 7 dias.</p>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-2xl border shadow-sm transition-colors ${
      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 rounded-lg">
            <AlertCircle size={18} className="text-amber-500" />
          </div>
          <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            Alertas Próximos
          </h3>
        </div>
        <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
          {upcoming.length}
        </span>
      </div>

      <div className="space-y-3">
        {upcoming.map(t => {
          const tDate = new Date(t.date);
          const diffTime = tDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let dayLabel = `Em ${diffDays} dias`;
          if (diffDays === 0) dayLabel = "Vence hoje!";
          if (diffDays === 1) dayLabel = "Vence amanhã";

          return (
            <div 
              key={t.id} 
              className={`p-3 rounded-xl border flex items-center justify-between group transition-all hover:translate-x-1 ${
                isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'
              }`}
            >
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <span className={`text-xs font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  {t.description}
                </span>
                <span className={`text-[10px] font-medium ${diffDays <= 2 ? 'text-rose-500' : 'text-amber-500'}`}>
                  {dayLabel} • {tDate.toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="text-right ml-2">
                <span className={`text-xs font-bold block ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {t.type === TransactionType.INCOME ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
