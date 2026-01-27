
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, TransactionStatus, RecurrenceType } from './types';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { AIAdvisor } from './components/AIAdvisor';
import { UpcomingAlerts } from './components/UpcomingAlerts';
import { BackupManager } from './components/BackupManager';
import { Auth } from './components/Auth';
import { db } from './services/dbService';
import { SkeletonCard, SkeletonTable } from './components/SkeletonLoader';
import { 
  LayoutDashboard, 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  AlertTriangle,
  Database,
  Loader2,
  CheckCircle2,
  Cloud,
  LogOut,
  RefreshCw,
  AlertCircle,
  Check,
  Sparkle
} from 'lucide-react';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dbStatus, setDbStatus] = useState({ connected: false, count: 0 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToUpdateMode, setTransactionToUpdateMode] = useState<Transaction | null>(null);
  const [transactionToPay, setTransactionToPay] = useState<Transaction | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState<number | string>(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  useEffect(() => {
    const initApp = async () => {
      try {
        await db.init();
        const darkMode = await db.getConfig('dark_mode');
        setIsDarkMode(!!darkMode);
        
        const authData = await db.getAuthData();
        if (authData?.username) {
          setCurrentUser(authData.username);
          setIsAuthenticated(true);
          setIsLoadingData(true);
          const allTransactions = await db.getAllTransactions();
          setTransactions(allTransactions);
          setIsLoadingData(false);
        }
        
        const count = await db.countTransactions();
        setDbStatus({ connected: true, count });
      } catch (err) {
        console.error("Falha ao inicializar app:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    initApp();
  }, []);

  const triggerSyncFeedback = async (action: () => Promise<any>) => {
    setSyncStatus('syncing');
    try {
      await action();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error("Sync error:", error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  const handleSaveTransactions = async (newItems: Transaction | Transaction[]) => {
    const itemsArray = Array.isArray(newItems) ? newItems : [newItems];
    const isSingleUpdate = !Array.isArray(newItems) && editingTransaction && itemsArray[0].id === editingTransaction.id;

    // Se for edição de um item que pertence a uma série, perguntar o modo
    if (isSingleUpdate && editingTransaction?.seriesId) {
      setTransactionToUpdateMode(itemsArray[0]);
      setIsFormOpen(false);
      return;
    }

    await triggerSyncFeedback(async () => {
      await db.saveTransactions(itemsArray);
      const updated = await db.getAllTransactions();
      setTransactions(updated);
      setIsFormOpen(false);
      setEditingTransaction(null);
    });
  };

  const confirmUpdate = async (mode: 'single' | 'future') => {
    if (!transactionToUpdateMode) return;

    await triggerSyncFeedback(async () => {
      if (mode === 'single') {
        await db.saveTransaction(transactionToUpdateMode);
      } else {
        const baseDate = new Date(transactionToUpdateMode.date);
        const toUpdate = transactions.filter(t => {
          const isSameSeries = t.seriesId === transactionToUpdateMode.seriesId;
          const tDate = new Date(t.date);
          return isSameSeries && tDate.getTime() >= baseDate.getTime();
        });

        const updatedItems = toUpdate.map(t => {
          // Se for o item original, usa os dados completos dele
          if (t.id === transactionToUpdateMode.id) return transactionToUpdateMode;
          
          // Para os outros da série, atualiza campos comuns mas preserva datas originais e parcelamento
          return {
            ...t,
            description: transactionToUpdateMode.description.split(' (')[0] + (t.recurrence === RecurrenceType.INSTALLMENT ? ` (${t.installmentNumber}/${t.installmentsCount})` : ' (Fixo)'),
            amount: transactionToUpdateMode.amount,
            category: transactionToUpdateMode.category,
            type: transactionToUpdateMode.type
          };
        });

        await db.saveTransactions(updatedItems);
      }
      
      const updated = await db.getAllTransactions();
      setTransactions(updated);
      setTransactionToUpdateMode(null);
      setEditingTransaction(null);
    });
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (transaction.seriesId && (transaction.recurrence === RecurrenceType.FIXED || transaction.recurrence === RecurrenceType.INSTALLMENT)) {
      setTransactionToDelete(transaction);
    } else {
      await triggerSyncFeedback(async () => {
        await db.deleteTransaction(transaction.id);
        setTransactions(prev => prev.filter(t => t.id !== transaction.id));
      });
    }
  };

  const confirmDelete = async (mode: 'single' | 'future') => {
    if (!transactionToDelete) return;
    await triggerSyncFeedback(async () => {
      if (mode === 'single') {
        await db.deleteTransaction(transactionToDelete.id);
        setTransactions(prev => prev.filter(t => transactionToDelete.id !== t.id));
      } else if (mode === 'future') {
        const deleteDate = new Date(transactionToDelete.date);
        const toDelete = transactions.filter(t => {
          const isSameSeries = t.seriesId === transactionToDelete.seriesId;
          const tDate = new Date(t.date);
          return (isSameSeries && tDate.getTime() >= deleteDate.getTime());
        });
        for (const t of toDelete) await db.deleteTransaction(t.id);
        setTransactions(prev => prev.filter(t => !toDelete.find(td => td.id === t.id)));
      }
      setTransactionToDelete(null);
    });
  };

  const toggleStatus = async (id: string) => {
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    if (target.status === TransactionStatus.PENDING) {
      setTransactionToPay(target);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentAmount(target.amount);
    } else {
      await triggerSyncFeedback(async () => {
        const updated = { ...target, status: TransactionStatus.PENDING, paymentDate: undefined };
        await db.saveTransaction(updated);
        setTransactions(prev => prev.map(t => t.id === id ? updated : t));
      });
    }
  };

  const handleConfirmPayment = async () => {
    if (!transactionToPay) return;
    await triggerSyncFeedback(async () => {
      const pDate = new Date(paymentDate);
      pDate.setMinutes(pDate.getMinutes() + pDate.getTimezoneOffset());
      const updated = { 
        ...transactionToPay, 
        status: TransactionStatus.PAID, 
        paymentDate: pDate.toISOString(),
        amount: Number(paymentAmount)
      };
      await db.saveTransaction(updated);
      setTransactions(prev => prev.map(t => t.id === transactionToPay.id ? updated : t));
      setTransactionToPay(null);
    });
  };

  const handleRefreshData = async () => {
    setIsLoadingData(true);
    const all = await db.getAllTransactions();
    setTransactions(all);
    const count = await db.countTransactions();
    setDbStatus({ connected: true, count });
    setIsLoadingData(false);
  };

  const handleLogout = async () => {
    try {
      await db.logout();
      setTransactions([]);
      setCurrentUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === currentDate.getMonth() && 
             tDate.getFullYear() === currentDate.getFullYear();
    });
  }, [transactions, currentDate]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); 

    const globalBalance = transactions.reduce((acc, t) => {
      if (t.status === TransactionStatus.PAID) {
        const effectiveDate = new Date(t.paymentDate || t.date);
        if (effectiveDate <= today) {
          return t.type === TransactionType.INCOME ? acc + Number(t.amount) : acc - Number(t.amount);
        }
      }
      return acc;
    }, 0);

    const monthly = filteredTransactions.reduce((acc, t) => {
      const amount = Number(t.amount);
      if (t.type === TransactionType.INCOME) {
        acc.totalIncome += amount;
        if (t.status === TransactionStatus.PAID) acc.paidIncome += amount;
      } else {
        acc.totalExpenses += amount;
        if (t.status === TransactionStatus.PAID) acc.paidExpenses += amount;
      }
      return acc;
    }, { totalIncome: 0, totalExpenses: 0, paidIncome: 0, paidExpenses: 0 });

    const monthlyBalance = monthly.totalIncome - monthly.totalExpenses;
    const realizedBalance = monthly.paidIncome - monthly.paidExpenses;
    const pendingBalance = monthlyBalance - realizedBalance;

    return { 
      ...monthly, 
      balance: globalBalance, 
      monthlyBalance, 
      realizedBalance,
      pendingBalance 
    };
  }, [transactions, filteredTransactions]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const monthName = `${currentDate.toLocaleString('pt-BR', { month: 'long' })} ${currentDate.getFullYear()}`;

  const formatDescriptionValue = (val: number) => {
    return Math.abs(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isInitializing) {
    return (
      <div className={`fixed inset-0 flex flex-col items-center justify-center ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <p className="font-black text-lg animate-pulse tracking-tight text-center">Iniciando Experiência<br/>Ricardo Finance...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onLogin={() => {
      db.getAuthData().then(data => setCurrentUser(data?.username));
      handleRefreshData();
      setIsAuthenticated(true);
    }} isDarkMode={isDarkMode} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} pb-24 md:pb-10`}>
      
      {syncStatus !== 'idle' && (
        <div className="fixed top-8 left-0 right-0 z-[250] flex justify-center px-6 pointer-events-none animate-in slide-in-from-top-full fade-in duration-700 ease-out">
          <div className={`
            pointer-events-auto flex items-center gap-4 p-2 pr-6 rounded-full border transition-all duration-500 shadow-2xl backdrop-blur-3xl
            ${syncStatus === 'syncing' 
              ? (isDarkMode 
                  ? 'bg-slate-900/90 border-indigo-500/30 text-indigo-100 shadow-indigo-500/10' 
                  : 'bg-white/95 border-indigo-200 text-indigo-900 shadow-indigo-200/50') 
              : syncStatus === 'success'
                ? (isDarkMode 
                    ? 'bg-slate-900/90 border-emerald-500/30 text-emerald-100 shadow-emerald-500/10' 
                    : 'bg-white/95 border-emerald-200 text-emerald-900 shadow-emerald-200/50')
                : (isDarkMode 
                    ? 'bg-slate-900/90 border-rose-500/30 text-rose-100 animate-shake shadow-rose-500/10' 
                    : 'bg-white/95 border-rose-200 text-rose-900 animate-shake shadow-rose-200/50')
            }
          `}>
            <div className={`
              flex items-center justify-center w-12 h-12 rounded-full shadow-inner transition-colors duration-500
              ${syncStatus === 'syncing' 
                ? 'bg-gradient-to-tr from-indigo-600 to-indigo-400' 
                : syncStatus === 'success' 
                  ? 'bg-gradient-to-tr from-emerald-600 to-emerald-400' 
                  : 'bg-gradient-to-tr from-rose-600 to-rose-400'}
            `}>
              {syncStatus === 'syncing' && <RefreshCw size={22} className="animate-spin text-white" strokeWidth={3} />}
              {syncStatus === 'success' && <Check size={24} className="animate-bounce text-white" strokeWidth={4} />}
              {syncStatus === 'error' && <AlertCircle size={24} className="animate-pulse text-white" strokeWidth={4} />}
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-0.5">
                <Sparkle size={10} className={`${syncStatus === 'syncing' ? 'animate-pulse text-indigo-400' : 'text-slate-400'}`} />
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] opacity-60 leading-none ${isDarkMode ? 'text-white' : 'text-slate-50'}`}>
                  Nuvem Supabase
                </span>
              </div>
              <span className={`text-sm font-black tracking-tight whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {syncStatus === 'syncing' && 'Sincronizando transações...'}
                {syncStatus === 'success' && 'Sincronização concluída'}
                {syncStatus === 'error' && 'Erro ao sincronizar dados'}
              </span>
            </div>
          </div>
        </div>
      )}

      <header className={`border-b sticky top-0 z-30 px-4 py-4 sm:px-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/80 border-slate-800 shadow-lg shadow-black/20 backdrop-blur-md' : 'bg-white/80 border-slate-200 shadow-sm backdrop-blur-md'}`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-transform cursor-pointer">
              <Wallet size={24} />
            </div>
          </div>

          <div className="flex-1 flex justify-center overflow-hidden">
            <h1 className="text-lg md:text-xl font-black tracking-[0.15em] leading-none text-slate-900 dark:text-white uppercase truncate text-center">
              Ricardo Finance
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className={`hidden lg:flex items-center px-5 py-2.5 rounded-xl transition-all shadow-xl bg-emerald-600 shadow-emerald-600/20 cursor-default active:scale-95 group`}>
              <span className={`text-sm font-black text-white truncate max-w-[120px] tracking-tight capitalize group-hover:scale-105 transition-transform`}>
                {currentUser || 'Ricardo'}
              </span>
            </div>

            <button onClick={() => setIsDarkMode(!isDarkMode)} title="Alternar Tema" className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button 
              type="button"
              onClick={handleLogout} 
              title="Sair da Conta" 
              className={`p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center ${
                isDarkMode 
                ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20' 
                : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100'
              }`}
            >
              <LogOut size={20} strokeWidth={2.5} />
            </button>

            <div className={`hidden sm:flex items-center rounded-xl p-1 transition-colors ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <button onClick={() => changeMonth(-1)} className="p-1.5 hover:text-indigo-500 transition-colors"><ChevronLeft size={20} /></button>
              <span className="px-3 py-1 font-bold text-xs sm:text-sm capitalize w-40 text-center truncate">{monthName}</span>
              <button onClick={() => changeMonth(1)} className="p-1.5 hover:text-indigo-500 transition-colors"><ChevronRight size={20} /></button>
            </div>
            
            <button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xl shadow-indigo-600/20 font-bold active:scale-95">
              <PlusCircle size={20} /> <span className="hidden sm:inline">Lançar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-8 sm:px-6 space-y-8">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoadingData ? (
            <>
              <SkeletonCard isDarkMode={isDarkMode} />
              <SkeletonCard isDarkMode={isDarkMode} />
              <SkeletonCard isDarkMode={isDarkMode} />
              <SkeletonCard isDarkMode={isDarkMode} />
            </>
          ) : (
            <>
              <Dashboard title="Saldo Geral" value={stats.balance} icon={<Wallet className="text-white" size={20} />} color="bg-indigo-600" description="Saldo Disponível" isDarkMode={isDarkMode} />
              <Dashboard title="Receitas do Mês" value={stats.totalIncome} icon={<TrendingUp className="text-white" size={20} />} color="bg-blue-500" description={`Recebido: R$ ${formatDescriptionValue(stats.paidIncome)}`} isDarkMode={isDarkMode} />
              <Dashboard title="Despesas do Mês" value={stats.totalExpenses} icon={<TrendingDown className="text-white" size={20} />} color="bg-rose-500" description={`Pago: R$ ${formatDescriptionValue(stats.paidExpenses)}`} isDarkMode={isDarkMode} />
              <Dashboard title="Balanço Mensal" value={stats.monthlyBalance} icon={<Calendar className="text-white" size={20} />} color="bg-amber-500" description={`Realizado: R$ ${formatDescriptionValue(stats.realizedBalance)}`} isDarkMode={isDarkMode} />
            </>
          )}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-3 space-y-6">
            <div className={`rounded-3xl shadow-xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="px-6 py-5 border-b flex justify-between items-center">
                <h2 className="font-black flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <LayoutDashboard size={22} className="text-indigo-600" />
                  Fluxo Mensal
                  {!isLoadingData && (
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full font-black uppercase">
                      {filteredTransactions.length} ITENS
                    </span>
                  )}
                </h2>
              </div>
              
              {isLoadingData ? (
                <SkeletonTable isDarkMode={isDarkMode} />
              ) : (
                <TransactionList transactions={filteredTransactions} onEdit={(t) => { setEditingTransaction(t); setIsFormOpen(true); }} onDelete={handleDeleteTransaction} onToggleStatus={toggleStatus} isDarkMode={isDarkMode} />
              )}
            </div>
          </div>
          <aside className="xl:col-span-1 space-y-6">
            <UpcomingAlerts transactions={transactions} isDarkMode={isDarkMode} />
            <AIAdvisor transactions={filteredTransactions} />
            <BackupManager onDataRestored={handleRefreshData} isDarkMode={isDarkMode} syncStatus={syncStatus} />
          </aside>
        </div>
      </main>

      <button 
        onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}
        className="fixed bottom-6 right-6 sm:hidden z-40 bg-indigo-600 text-white w-16 h-16 rounded-full shadow-2xl shadow-indigo-600/50 flex items-center justify-center active:scale-90 transition-transform"
      >
        <PlusCircle size={32} />
      </button>

      {isFormOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg">
          <div className="border rounded-[2.5rem] shadow-2xl w-full max-w-md bg-slate-900 border-slate-800 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-white">{editingTransaction ? 'Editar' : 'Novo'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white text-3xl">&times;</button>
            </div>
            <TransactionForm onSubmit={handleSaveTransactions} initialData={editingTransaction} onCancel={() => setIsFormOpen(false)} />
          </div>
        </div>
      )}

      {transactionToUpdateMode && (
        <div className="fixed inset-0 z-[175] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg">
          <div className="border rounded-[2.5rem] bg-slate-900 border-slate-800 p-10 text-center space-y-8 w-full max-w-sm">
            <div className="mx-auto w-20 h-20 bg-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500 shadow-xl shadow-rose-500/10">
              <RefreshCw size={40} className="animate-pulse-soft" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white mb-2">Atualizar Lançamento</h3>
              <p className="text-slate-400 text-sm">Deseja aplicar estas mudanças para quais registros?</p>
            </div>
            <div className="flex flex-col gap-4">
              <button onClick={() => confirmUpdate('single')} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase text-xs">Apenas este mês</button>
              <button onClick={() => confirmUpdate('future')} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold uppercase text-xs">Este e todos os futuros</button>
              <button onClick={() => setTransactionToUpdateMode(null)} className="text-slate-500 font-bold uppercase text-[10px]">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {transactionToPay && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg">
          <div className="border rounded-[2.5rem] bg-slate-900 border-slate-800 p-10 text-center space-y-8 w-full max-w-sm">
            <div className="mx-auto w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white mb-2">Liquidar Conta</h3>
              <p className="text-slate-400 text-sm">Confirme o valor e a data real:</p>
            </div>
            <div className="space-y-5 text-left">
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 text-white rounded-2xl" />
              <input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 text-white rounded-2xl" />
              <div className="flex gap-4">
                <button onClick={() => setTransactionToPay(null)} className="flex-1 py-4 border border-slate-800 rounded-2xl text-slate-500 font-bold uppercase text-xs">Voltar</button>
                <button onClick={handleConfirmPayment} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold uppercase text-xs">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {transactionToDelete && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg">
          <div className="border rounded-[2.5rem] bg-slate-900 border-slate-800 p-10 text-center space-y-8 w-full max-sm:p-6 w-full max-w-sm">
            <div className="mx-auto w-20 h-20 bg-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500 shadow-xl shadow-rose-500/10">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-white">Excluir Transação</h3>
            <div className="flex flex-col gap-4">
              <button onClick={() => confirmDelete('single')} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase text-xs">Apenas este mês</button>
              <button onClick={() => confirmDelete('future')} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold uppercase text-xs">Todos futuros</button>
              <button onClick={() => setTransactionToDelete(null)} className="text-slate-500 font-bold uppercase text-[10px]">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
