
import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Transaction } from '../types';
import { getFinancialAdvice } from '../services/geminiService';

interface AIAdvisorProps {
  transactions: Transaction[];
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ transactions }) => {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAdvice = async () => {
    if (transactions.length === 0) return;
    setLoading(true);
    try {
      const result = await getFinancialAdvice(transactions);
      setAdvice(result);
    } catch (err) {
      setAdvice("Ocorreu um erro ao buscar conselhos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-xl text-white">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-white/20 rounded-lg">
          <Sparkles size={20} className="text-white" />
        </div>
        <h3 className="font-bold text-lg">Consultor IA</h3>
      </div>
      
      {advice ? (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="text-indigo-50 leading-relaxed text-sm bg-white/10 p-4 rounded-xl border border-white/10">
            {advice.split('\n').map((line, i) => (
              <p key={i} className={line.trim() ? 'mb-2' : ''}>{line}</p>
            ))}
          </div>
          <button 
            onClick={fetchAdvice}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-200 hover:text-white transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            Atualizar Insights
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-indigo-100 text-sm">
            Deixe nossa IA analisar seus gastos e sugerir melhorias para suas economias.
          </p>
          <button
            onClick={fetchAdvice}
            disabled={loading || transactions.length === 0}
            className={`w-full py-3 bg-white text-indigo-600 font-bold rounded-xl shadow-lg transition-all hover:bg-indigo-50 active:scale-95 flex items-center justify-center gap-2 ${
              transactions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Sparkles size={18} />
                Gerar Análise
              </>
            )}
          </button>
          {transactions.length === 0 && (
            <p className="text-[10px] text-center text-indigo-300">
              Adicione transações para habilitar a IA
            </p>
          )}
        </div>
      )}
    </div>
  );
};
