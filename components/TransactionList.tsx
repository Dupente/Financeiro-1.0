
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, TransactionType, TransactionStatus } from '../types';
import { 
  Edit2, Trash2, CheckCircle, Clock, Tag, RotateCcw, 
  Check, Filter, X, Search, ArrowUpAZ, ArrowDownZA, SortAsc,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  onToggleStatus: (id: string) => void;
  isDarkMode?: boolean;
}

interface FilterState {
  status: string;
  description: string;
  category: string;
  date: string;
  paymentDate: string;
  amount: string;
}

type SortKey = 'description' | 'category' | 'date' | 'paymentDate' | 'amount';
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: SortKey | null;
  direction: SortDirection;
}

export const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  onEdit, 
  onDelete, 
  onToggleStatus,
  isDarkMode
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    description: '',
    category: '',
    date: '',
    paymentDate: '',
    amount: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const processedTransactions = useMemo(() => {
    // 1. Filtragem
    let result = transactions.filter(t => {
      const matchStatus = filters.status === '' || t.status === filters.status;
      const matchDesc = t.description.toLowerCase().includes(filters.description.toLowerCase());
      const matchCat = filters.category === '' || t.category === filters.category;
      const matchDate = new Date(t.date).toLocaleDateString('pt-BR').includes(filters.date);
      const matchPayDate = t.paymentDate 
        ? new Date(t.paymentDate).toLocaleDateString('pt-BR').includes(filters.paymentDate)
        : filters.paymentDate === '';
      const matchAmount = t.amount.toString().includes(filters.amount);

      return matchStatus && matchDesc && matchCat && matchDate && matchPayDate && matchAmount;
    });

    // 2. Ordenação Refinada
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        const key = sortConfig.key as SortKey;
        const direction = sortConfig.direction === 'asc' ? 1 : -1;
        
        let valA: any = a[key];
        let valB: any = b[key];

        // Tratamento para Datas
        if (key === 'date' || key === 'paymentDate') {
          const timeA = valA ? new Date(valA).getTime() : 0;
          const timeB = valB ? new Date(valB).getTime() : 0;
          return (timeA - timeB) * direction;
        }

        // Tratamento para Números (Valor/Amount)
        if (key === 'amount') {
          const numA = Number(valA) || 0;
          const numB = Number(valB) || 0;
          return (numA - numB) * direction;
        }

        // Tratamento para Strings (Descrição, Categoria)
        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return strA.localeCompare(strB) * direction;
      });
    } else {
      // Ordenação padrão: Data de Vencimento descendente
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return result;
  }, [transactions, filters, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortConfig, transactions.length]);

  const totalPages = Math.max(1, Math.ceil(processedTransactions.length / itemsPerPage));
  
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [processedTransactions, currentPage, itemsPerPage]);

  const hasActiveFilters = Object.values(filters).some(v => v !== '') || sortConfig.key !== null;

  const clearFilters = () => {
    setFilters({
      status: '',
      description: '',
      category: '',
      date: '',
      paymentDate: '',
      amount: ''
    });
    setSortConfig({ key: null, direction: null });
  };

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key: direction ? key : null, direction });
  };

  const SortIndicator = ({ columnKey, isNumeric = false }: { columnKey: SortKey, isNumeric?: boolean }) => {
    if (sortConfig.key !== columnKey) return <SortAsc size={12} className="opacity-20 group-hover:opacity-50" />;
    if (isNumeric) {
      return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUpAZ size={14} /> : <ArrowDownZA size={14} />;
  };

  const headerBtnClass = (key: SortKey) => `group flex items-center gap-2 transition-colors hover:text-indigo-500 font-bold uppercase tracking-widest ${sortConfig.key === key ? 'text-indigo-500' : ''}`;

  const inputClass = `w-full px-2 py-1.5 text-[10px] font-medium rounded-md border outline-none transition-all ${
    isDarkMode 
    ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-indigo-500' 
    : 'bg-white border-slate-200 text-slate-600 focus:border-indigo-600'
  }`;

  if (transactions.length === 0) {
    return (
      <div className="p-12 text-center animate-in fade-in duration-700">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
          <Tag className={isDarkMode ? 'text-slate-600' : 'text-slate-300'} size={32} />
        </div>
        <p className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Nenhuma transação registrada.</p>
        <p className={`text-sm ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Adicione uma nova para começar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className={`px-6 py-3 border-b flex items-center justify-between gap-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-50 bg-slate-50/30'}`}>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              showFilters || hasActiveFilters
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700')
            }`}
          >
            <Filter size={14} />
            {hasActiveFilters ? 'Filtros Ativos' : 'Filtrar Colunas'}
          </button>
          
          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter"
            >
              <X size={14} />
              Limpar
            </button>
          )}
        </div>
        
        <span className={`text-[10px] font-bold uppercase tracking-tighter ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {processedTransactions.length} registros encontrados
        </span>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className={`text-[10px] border-b transition-colors ${isDarkMode ? 'text-slate-500 border-slate-800' : 'text-slate-400 border-slate-100'}`}>
              <th className="px-6 py-4 w-16 text-center font-bold uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 min-w-[200px]">
                <button onClick={() => handleSort('description')} className={headerBtnClass('description')}>
                  Descrição <SortIndicator columnKey="description" />
                </button>
              </th>
              <th className="px-6 py-4">
                <button onClick={() => handleSort('category')} className={headerBtnClass('category')}>
                  Categoria <SortIndicator columnKey="category" />
                </button>
              </th>
              <th className="px-6 py-4">
                <button onClick={() => handleSort('date')} className={headerBtnClass('date')}>
                  Vencimento <SortIndicator columnKey="date" isNumeric />
                </button>
              </th>
              <th className="px-6 py-4">
                <button onClick={() => handleSort('paymentDate')} className={headerBtnClass('paymentDate')}>
                  Pagamento <SortIndicator columnKey="paymentDate" isNumeric />
                </button>
              </th>
              <th className="px-6 py-4 text-right">
                <button onClick={() => handleSort('amount')} className={`ml-auto ${headerBtnClass('amount')}`}>
                  Valor <SortIndicator columnKey="amount" isNumeric />
                </button>
              </th>
              <th className="px-6 py-4 text-center font-bold uppercase tracking-widest">Ações</th>
            </tr>
            {showFilters && (
              <tr className={`animate-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-slate-900/40' : 'bg-slate-50/40'}`}>
                <td className="px-4 py-2 text-center">
                  <select 
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className={inputClass}
                  >
                    <option value="">Todos</option>
                    <option value={TransactionStatus.PAID}>Pago</option>
                    <option value={TransactionStatus.PENDING}>Pendente</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <div className="relative">
                    <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.description}
                      onChange={(e) => setFilters({...filters, description: e.target.value})}
                      className={`${inputClass} pl-6`}
                    />
                  </div>
                </td>
                <td className="px-4 py-2">
                  <select 
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    className={inputClass}
                  >
                    <option value="">Todas</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="text"
                    placeholder="DD/MM/AAAA"
                    value={filters.date}
                    onChange={(e) => setFilters({...filters, date: e.target.value})}
                    className={inputClass}
                  />
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="text"
                    placeholder="DD/MM/AAAA"
                    value={filters.paymentDate}
                    onChange={(e) => setFilters({...filters, paymentDate: e.target.value})}
                    className={inputClass}
                  />
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="text"
                    placeholder="Valor"
                    value={filters.amount}
                    onChange={(e) => setFilters({...filters, amount: e.target.value})}
                    className={`${inputClass} text-right`}
                  />
                </td>
                <td className="px-4 py-2"></td>
              </tr>
            )}
          </thead>
          <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-slate-800' : 'divide-slate-50'}`}>
            {paginatedTransactions.map((t) => (
              <tr 
                key={t.id} 
                className={`transition-all group animate-in slide-in-from-left-2 duration-300 ${isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'}`}
              >
                <td className="px-6 py-4">
                  <div className={`flex items-center justify-center w-9 h-9 mx-auto rounded-lg transition-all ${
                      t.status === TransactionStatus.PAID 
                      ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') 
                      : (isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')
                    }`}>
                    {t.status === TransactionStatus.PAID ? <CheckCircle size={18} /> : <Clock size={18} />}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className={`font-semibold text-sm break-words ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      {t.description}
                    </span>
                    {t.seriesId && (
                      <span className="text-[9px] uppercase tracking-tighter text-indigo-500 font-black">
                        {t.recurrence === 'INSTALLMENT' ? `Parcela ${t.installmentNumber}/${t.installmentsCount}` : 'Fixa'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border whitespace-nowrap ${
                    isDarkMode 
                    ? 'bg-slate-800 border-slate-700 text-slate-400' 
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    {t.category}
                  </span>
                </td>
                <td className={`px-6 py-4 text-xs font-medium whitespace-nowrap ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {new Date(t.date).toLocaleDateString('pt-BR')}
                </td>
                <td className={`px-6 py-4 text-xs font-medium whitespace-nowrap ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.paymentDate ? new Date(t.paymentDate).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className={`px-6 py-4 text-right font-bold text-sm whitespace-nowrap ${
                  t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {t.type === TransactionType.INCOME ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onToggleStatus(t.id)}
                      title={t.status === TransactionStatus.PAID ? 'Marcar como Pendente' : 'Marcar como Pago'}
                      className={`p-2 rounded-lg transition-colors ${
                        t.status === TransactionStatus.PAID 
                        ? 'text-amber-500 hover:bg-amber-500/10' 
                        : 'text-emerald-500 hover:bg-emerald-500/10'
                      }`}
                    >
                      {t.status === TransactionStatus.PAID ? <RotateCcw size={16} /> : <Check size={16} />}
                    </button>
                    <button 
                      onClick={() => onEdit(t)}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(t)}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-400/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {processedTransactions.length === 0 && (
          <div className="p-8 text-center">
            <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Nenhum resultado encontrado.</p>
          </div>
        )}
      </div>

      {/* Footer com Paginação */}
      <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Página {currentPage} de {totalPages}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
              currentPage === 1 
              ? 'opacity-30 cursor-not-allowed text-slate-500' 
              : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
            }`}
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = Math.min(totalPages, currentPage - 2 + i);
                if (pageNum + (4 - i) > totalPages) pageNum = totalPages - 4 + i;
              }
              
              return (
                <button 
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                    currentPage === pageNum
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : (isDarkMode ? 'bg-slate-800 text-slate-500 hover:text-slate-300' : 'bg-slate-100 text-slate-400 hover:text-slate-600')
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
              currentPage === totalPages 
              ? 'opacity-30 cursor-not-allowed text-slate-500' 
              : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
            }`}
          >
            Próxima <ChevronRight size={14} />
          </button>
        </div>

        <div className="text-[10px] font-bold text-slate-400 hidden lg:block">
          Mostrando {paginatedTransactions.length} de {processedTransactions.length} filtrados
        </div>
      </div>
    </div>
  );
};
