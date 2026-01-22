
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, TransactionStatus, RecurrenceType } from './types';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { AIAdvisor } from './components/AIAdvisor';
import { UpcomingAlerts } from './components/UpcomingAlerts';
import { BackupManager } from './components/BackupManager';
import { db } from './services/dbService';
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
  DollarSign,
  ShieldCheck,
  Check,
  Download
} from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Estado para a animação de gravação
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Inicialização do Banco de Dados Local e Detecção de Atalhos
  useEffect(() => {
    const initApp = async () => {
      try {
        await db.init();
        
        const darkMode = await db.getConfig('dark_mode');
        setIsDarkMode(!!darkMode);
        
        const allTransactions = await db.getAllTransactions();
        const count = await db.countTransactions();
        
        setTransactions(allTransactions);
        setDbStatus({ connected: true, count });

        // Verificar se foi aberto via atalho ?action=new
        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'new') {
          setIsFormOpen(true);
          // Limpar a URL para evitar reabrir ao atualizar
          window.history.replaceState({}, document.title, "/");
        }
      } catch (err) {
        console.error("Falha ao inicializar banco local:", err);
      } finally {
        setLoading(false);
      }
    };
    initApp();

    // Capturar o evento de instalação PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  // Monitora alterações para atualizar o contador de integridade
  useEffect(() => {
    if (dbStatus.connected) {
      db.countTransactions().then(c => setDbStatus(prev => ({ ...prev, count: c })));
    }
  }, [transactions, dbStatus.connected]);

  useEffect(() => {
    if (loading) return;
    db.setConfig('dark_mode', isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode, loading]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const triggerSaveFeedback = () => {
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2500);
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
    }, {
      totalIncome: 0,
      totalExpenses: 0,
      paidIncome: 0,
      paidExpenses: 0
    });

    const pendingBalance = (monthly.totalIncome - monthly.paidIncome) - (monthly.totalExpenses - monthly.paidExpenses);
    
    return {
      ...monthly,
      balance: globalBalance,
      pendingBalance
    };
  }, [transactions, filteredTransactions]);

  const handleRefreshData = async () => {
    const all = await db.getAllTransactions();
    const count = await db.countTransactions();
    setTransactions(all);
    setDbStatus({ connected: true, count });
  };

  const handleAddTransactions = async (newItems: Transaction | Transaction[]) => {
    const itemsToAdd = Array.isArray(newItems) ? newItems : [newItems];
    if (editingTransaction) await db.deleteTransaction(editingTransaction.id);
    await db.saveTransactions(itemsToAdd);
    const updated = await db.getAllTransactions();
    setTransactions(updated);
    setIsFormOpen(false);
    setEditingTransaction(null);
    triggerSaveFeedback();
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (transaction.seriesId && (transaction.recurrence === RecurrenceType.FIXED || transaction.recurrence === RecurrenceType.INSTALLMENT)) {
      setTransactionToDelete(transaction);
    } else {
      await db.deleteTransaction(transaction.id);
      setTransactions(prev => prev.filter(t => t.id !== transaction.id));
      triggerSaveFeedback();
    }
  };

  const confirmDelete = async (mode: 'single' | 'future') => {
    if (!transactionToDelete) return;
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
    triggerSaveFeedback();
  };

  const toggleStatus = async (id: string) => {
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    if (target.status === TransactionStatus.PENDING) {
      setTransactionToPay(target);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentAmount(target.amount);
    } else {
      const updated = { ...target, status: TransactionStatus.PENDING, paymentDate: undefined };
      await db.saveTransaction(updated);
      setTransactions(prev => prev.map(t => t.id === id ? updated : t));
      triggerSaveFeedback();
    }
  };

  const handleConfirmPayment = async () => {
    if (!transactionToPay) return;

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
    triggerSaveFeedback();
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + offset);
      return d;
    });
  };

  const monthName = `${currentDate.toLocaleString('pt-BR', { month: 'long' })} ${currentDate.getFullYear()}`;

  if (loading) {
    return (
      <div className={`fixed inset-0 flex flex-col items-center justify-center ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <p className="font-bold text-lg animate-pulse tracking-tight">Verificando Banco Ricardo...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} pb-20 md:pb-10`}>
      
      {/* Feedback de Gravação */}
      {showSaveSuccess && (
        <div className="fixed top-24 right-6 z-[100] animate-in slide-in-from-right-10 fade-in duration-500">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border shadow-2xl ${
            isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
          } backdrop-blur-md`}>
            <div className={`p-1.5 rounded-full ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-500/10'}`}>
              <Check size={16} strokeWidth={3} className="animate-bounce" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest">Banco Sincronizado</span>
              <span className="text-[9px] font-bold opacity-70">Dados persistentes OK</span>
            </div>
          </div>
        </div>
      )}

      <header className={`border-b sticky top-0 z-30 px-4 py-4 sm:px-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-lg shadow-black/20' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
              <Wallet size={24} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black tracking-tight leading-none mb-1">Ricardo Finance</h1>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${
                  dbStatus.connected 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                }`}>
                  <ShieldCheck size={10} />
                  Banco {dbStatus.connected ? 'Persistente' : 'Erro'} • {dbStatus.count} Itens
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Botão de Instalação PWA */}
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className={`p-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
                  isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                }`}
              >
                <Download size={16} />
                <span className="hidden lg:inline">Instalar App</span>
              </button>
            )}

            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className={`flex items-center rounded-xl p-1 transition-colors ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <button onClick={() => changeMonth(-1)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-white text-slate-600'}`}>
                <ChevronLeft size={20} />
              </button>
              <span className="px-3 py-1 font-bold text-xs sm:text-sm capitalize w-24 sm:w-40 text-center truncate tracking-tight">{monthName}</span>
              <button onClick={() => changeMonth(1)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-white text-slate-600'}`}>
                <ChevronRight size={20} />
              </button>
            </div>
            
            <button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 sm:px-6 sm:py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/20 font-bold active:scale-95">
              <PlusCircle size={20} />
              <span className="hidden sm:inline">Novo Lançamento</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-8 sm:px-6 space-y-8">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500">
          <Dashboard title="Saldo Geral" value={stats.balance} icon={<Wallet className="text-white" size={20} />} color="bg-emerald-500" description="Histórico acumulado pago" isDarkMode={isDarkMode} />
          <Dashboard title="Receitas do Mês" value={stats.totalIncome} icon={<TrendingUp className="text-white" size={20} />} color="bg-blue-500" description={`Confirmado: R$ ${stats.paidIncome.toFixed(2)}`} isDarkMode={isDarkMode} />
          <Dashboard title="Dashboard de Despesas" value={stats.totalExpenses} icon={<TrendingDown className="text-white" size={20} />} color="bg-rose-500" description={`Liquidado: R$ ${stats.paidExpenses.toFixed(2)}`} isDarkMode={isDarkMode} />
          <Dashboard title="Balanço Pendente" value={stats.pendingBalance} icon={<Calendar className="text-white" size={20} />} color="bg-amber-500" description="Diferença a liquidar" isDarkMode={isDarkMode} />
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start transition-all duration-700 ease-in-out">
          <div className="xl:col-span-3 space-y-6">
            <div className={`rounded-3xl shadow-xl border overflow-hidden transition-all duration-500 ease-in-out ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-black/40' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
              <div className={`px-6 py-5 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <h2 className="font-black flex items-center gap-3 text-lg tracking-tight">
                  <LayoutDashboard size={22} className="text-indigo-600" />
                  Fluxo de Caixa
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full ml-2 font-black uppercase">
                    {filteredTransactions.length} LANÇAMENTOS
                  </span>
                </h2>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  <Database size={14} className="text-indigo-500" />
                  Storage: OK
                </div>
              </div>
              <TransactionList transactions={filteredTransactions} onEdit={(t) => { setEditingTransaction(t); setIsFormOpen(true); }} onDelete={handleDeleteTransaction} onToggleStatus={toggleStatus} isDarkMode={isDarkMode} />
            </div>
          </div>
          <aside className="xl:col-span-1 space-y-6">
            <UpcomingAlerts transactions={transactions} isDarkMode={isDarkMode} />
            <AIAdvisor transactions={filteredTransactions} />
            <BackupManager onDataRestored={handleRefreshData} isDarkMode={isDarkMode} />
            <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-800/50' : 'bg-slate-50 border-slate-100'}`}>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                Sistema Seguro: Banco de dados com redundância local.
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Modal de Transação */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-300">
          <div className="border rounded-[2.5rem] shadow-2xl w-full max-w-md bg-slate-900 border-slate-800 transform animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-2xl font-black text-white tracking-tight">{editingTransaction ? 'Editar Item' : 'Novo Registro'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white transition-all bg-slate-800 p-2 rounded-full text-3xl leading-none">&times;</button>
            </div>
            <div className="p-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <TransactionForm onSubmit={handleAddTransactions} initialData={editingTransaction} onCancel={() => setIsFormOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento */}
      {transactionToPay && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-200">
          <div className="border rounded-[2.5rem] shadow-2xl w-full max-w-sm bg-slate-900 border-slate-800 p-10 text-center space-y-8 transform animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Confirmar Baixa</h3>
              <p className="text-slate-400 text-sm">Validar detalhes da liquidação:</p>
            </div>
            <div className="space-y-5 text-left">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1 tracking-widest">Data do Pagamento</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-800 border border-slate-700 text-white rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1 tracking-widest">Valor Final (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-slate-800 border border-slate-700 text-white rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setTransactionToPay(null)} className="flex-1 py-4 text-slate-500 font-black uppercase text-xs hover:bg-slate-800 rounded-2xl transition-all border border-slate-800">
                  Voltar
                </button>
                <button onClick={handleConfirmPayment} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs rounded-2xl shadow-xl shadow-emerald-600/30 transition-all active:scale-95 tracking-widest">
                  Liquidar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {transactionToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg animate-in fade-in duration-200">
          <div className="border rounded-[2.5rem] shadow-2xl w-full max-w-sm p-10 bg-slate-900 border-slate-800 text-center space-y-8 animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-20 h-20 bg-rose-500/20 rounded-3xl flex items-center justify-center shadow-xl shadow-rose-500/10">
              <AlertTriangle size={40} className="text-rose-500" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Remover Lançamento</h3>
              <p className="text-slate-400 text-sm">Esta transação possui recorrência ativa.</p>
            </div>
            <div className="flex flex-col gap-4">
              <button onClick={() => confirmDelete('single')} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-xs rounded-2xl transition-all tracking-wider">Apenas este mês</button>
              <button onClick={() => confirmDelete('future')} className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs rounded-2xl shadow-xl shadow-rose-600/30 transition-all tracking-wider">Este e todos os próximos</button>
              <button onClick={() => setTransactionToDelete(null)} className="w-full py-2 text-slate-500 font-black uppercase text-[10px] tracking-widest">Cancelar Operação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
