
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
  User as UserIcon,
  RefreshCw,
  AlertCircle,
  Check
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
          // Começa a carregar dados em background para mostrar skeletons
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

  const handleAddTransactions = async (newItems: Transaction | Transaction[]) => {
    await triggerSyncFeedback(async () => {
      const itemsToAdd = Array.isArray(newItems) ? newItems : [newItems];
      if (editingTransaction) await db.deleteTransaction(editingTransaction.id);
      await db.saveTransactions(itemsToAdd);
      const updated = await db.getAllTransactions();
      setTransactions(updated);
      setIsFormOpen(false);
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
        setTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
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
    const globalBalance = transactions.reduce((acc, t) => {
      if (t.status === TransactionStatus.PAID) {
        return t.type === TransactionType.INCOME ? acc + t.amount : acc - t.amount;
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
    const pendingBalance = (monthly.totalIncome - monthly.paidIncome) - (monthly.totalExpenses - monthly.paidExpenses);
    return { ...monthly, balance: globalBalance, pendingBalance };
  }, [transactions, filteredTransactions]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const monthName = `${currentDate.toLocaleString('pt-BR', { month: 'long' })} ${currentDate.getFullYear()}`;

  // Splash Screen apenas na inicialização absoluta (antes de saber quem é o usuário)
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
        <div className="fixed top-6 left-0 right-0 z-[250] flex justify-center px-4 pointer-events-none animate-in slide-in-from-top-full duration-500">
          <div className={`
            pointer-events-auto flex items-center gap-4 px-6 py-3.5 rounded-[1.5rem] border shadow-2xl backdrop-blur-2xl transition-all duration-500
            ${syncStatus === 'syncing' 
              ? (isDarkMode 
                  ? 'bg-gradient-to-r from-indigo-600/30 to-violet-600/30 border-indigo-500/40 text-indigo-100' 
                  : 'bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700') 
              : syncStatus === 'success'
                ? (isDarkMode 
                    ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border-emerald-500/40 text-emerald-100' 
                    : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700')
                : (isDarkMode 
                    ? 'bg-gradient-to-r from-rose-600/30 to-orange-600/30 border-rose-500/40 text-rose-100 animate-shake' 
                    : 'bg-gradient-to-r from-rose-50 to-orange-50 border-rose-200 text-rose-700 animate-shake')
            }
          `}>
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-2xl shadow-inner
              ${syncStatus === 'syncing' 
                ? (isDarkMode ? 'bg-indigo-500/30' : 'bg-white shadow-indigo-100') 
                : syncStatus === 'success' 
                  ? (isDarkMode ? 'bg-emerald-500/30' : 'bg-white shadow-emerald-100') 
                  : (isDarkMode ? 'bg-rose-500/30' : 'bg-white shadow-rose-100')}
            `}>
              {syncStatus === 'syncing' && <RefreshCw size={20} className="animate-spin text-indigo-500" />}
              {syncStatus === 'success' && <Check size={22} className="animate-bounce text-emerald-500" strokeWidth={3} />}
              {syncStatus === 'error' && <AlertCircle size={22} className="animate-pulse text-rose-500" strokeWidth={3} />}
            </div>
            
            <div className="flex flex-col pr-1">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-70 leading-none mb-1.5 ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                Cloud Sync
              </span>
              <span className="text-sm font-black tracking-tight whitespace-nowrap">
                {syncStatus === 'syncing' && 'Sincronizando com Supabase...'}
                {syncStatus === 'success' && 'Nuvem atualizada com sucesso'}
                {syncStatus === 'error' && 'Erro na sincronização remota'}
              </span>
            </div>
          </div>
        </div>
      )}

      <header className={`border-b sticky top-0 z-30 px-4 py-4 sm:px-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/80 border-slate-800 shadow-lg shadow-black/20 backdrop-blur-md' : 'bg-white/80 border-slate-200 shadow-sm backdrop-blur-md'}`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
              <Wallet size={24} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black tracking-tight leading-none mb-1 text-slate-900 dark:text-white">Ricardo Finance</h1>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${
                  dbStatus.connected 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                }`}>
                  <Cloud size={10} className="animate-pulse" />
                  Supabase Ativo
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
               <UserIcon size={14} className="text-indigo-500" />
               <span className="text-xs font-bold truncate max-w-[100px]">{currentUser || 'Usuário'}</span>
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

            <div className={`flex items-center rounded-xl p-1 transition-colors ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <button onClick={() => changeMonth(-1)} className="p-1.5"><ChevronLeft size={20} /></button>
              <span className="px-3 py-1 font-bold text-xs sm:text-sm capitalize w-20 sm:w-40 text-center truncate">{monthName}</span>
              <button onClick={() => changeMonth(1)} className="p-1.5"><ChevronRight size={20} /></button>
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
              <Dashboard title="Saldo Geral" value={stats.balance} icon={<Wallet className="text-white" size={20} />} color="bg-emerald-500" description="Saldo pago acumulado" isDarkMode={isDarkMode} />
              <Dashboard title="Receitas do Mês" value={stats.totalIncome} icon={<TrendingUp className="text-white" size={20} />} color="bg-blue-500" description={`Liquidado: R$ ${stats.paidIncome.toFixed(2)}`} isDarkMode={isDarkMode} />
              <Dashboard title="Despesas do Mês" value={stats.totalExpenses} icon={<TrendingDown className="text-white" size={20} />} color="bg-rose-500" description={`Liquidado: R$ ${stats.paidExpenses.toFixed(2)}`} isDarkMode={isDarkMode} />
              <Dashboard title="Balanço Pendente" value={stats.pendingBalance} icon={<Calendar className="text-white" size={20} />} color="bg-amber-500" description="A liquidar no mês" isDarkMode={isDarkMode} />
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
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                  <Database size={14} className="text-emerald-500" /> Cloud Sync: OK
                </div>
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
            <BackupManager onDataRestored={handleRefreshData} isDarkMode={isDarkMode} />
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
            <TransactionForm onSubmit={handleAddTransactions} initialData={editingTransaction} onCancel={() => setIsFormOpen(false)} />
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
          <div className="border rounded-[2.5rem] bg-slate-900 border-slate-800 p-10 text-center space-y-8 w-full max-w-sm">
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
