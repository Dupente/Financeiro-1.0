
import React, { useRef, useState } from 'react';
import { Upload, Database, Save, FileCheck, Loader2, Info, X, AlertCircle, CheckCircle2, Cloud, RefreshCw } from 'lucide-react';
import { db, DBFileSchema } from '../services/dbService';
import { TransactionType } from '../types';

interface BackupManagerProps {
  onDataRestored: () => void;
  isDarkMode: boolean;
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
}

interface BackupPreview {
  totalItems: number;
  totalIncome: number;
  totalExpenses: number;
  date?: string;
  rawData: DBFileSchema;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ onDataRestored, isDarkMode, syncStatus = 'idle' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);

  const handleExport = async () => {
    try {
      const data = await db.exportDatabase();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `backup_financeiro_ricardo_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export Error:", error);
      alert("Erro ao gerar o arquivo de backup.");
    }
  };

  const processFileForPreview = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsProcessing(true);
        const content = event.target?.result as string;
        const data: DBFileSchema = JSON.parse(content);

        if (!data.transactions || !Array.isArray(data.transactions)) {
          throw new Error("Formato de arquivo inválido.");
        }

        // Calcula Resumo
        let income = 0;
        let expense = 0;
        data.transactions.forEach(t => {
          if (t.type === TransactionType.INCOME) income += Number(t.amount);
          else expense += Number(t.amount);
        });

        setPreview({
          totalItems: data.transactions.length,
          totalIncome: income,
          totalExpenses: expense,
          date: data.exportDate,
          rawData: data
        });

      } catch (error) {
        console.error("Preview Error:", error);
        alert("O arquivo selecionado não é um backup válido.");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const confirmRestoration = async () => {
    if (!preview) return;
    try {
      setIsProcessing(true);
      await db.restoreFullBackup(preview.rawData);
      setPreview(null);
      alert("Banco de dados restaurado com sucesso!");
      onDataRestored();
    } catch (error) {
      console.error("Restoration Error:", error);
      alert("Erro fatal ao restaurar banco.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getSyncStatusContent = () => {
    switch (syncStatus) {
      case 'syncing':
        return { 
          label: 'Sincronizando...', 
          color: 'text-indigo-500', 
          bg: 'bg-indigo-500/10', 
          icon: <RefreshCw size={14} className="animate-spin" /> 
        };
      case 'success':
        return { 
          label: 'Atualizado', 
          color: 'text-emerald-500', 
          bg: 'bg-emerald-500/10', 
          icon: <CheckCircle2 size={14} /> 
        };
      case 'error':
        return { 
          label: 'Erro na Nuvem', 
          color: 'text-rose-500', 
          bg: 'bg-rose-500/10', 
          icon: <AlertCircle size={14} /> 
        };
      default:
        return { 
          label: 'Conectado', 
          color: 'text-emerald-500', 
          bg: 'bg-emerald-500/5', 
          icon: <Cloud size={14} /> 
        };
    }
  };

  const syncInfo = getSyncStatusContent();

  return (
    <>
      <div className={`p-6 rounded-2xl border shadow-sm transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Database size={20} className="text-indigo-500" />
          </div>
          <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            Banco de Dados & Backup
          </h3>
        </div>

        <p className={`text-[11px] mb-6 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Sincronize ou restaure seus dados locais. A restauração substitui todos os lançamentos atuais.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleExport}
            disabled={isProcessing}
            className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 ${
              isDarkMode 
              ? 'bg-slate-800 border-slate-700 hover:border-indigo-500 text-indigo-400' 
              : 'bg-indigo-50/50 border-indigo-100 hover:border-indigo-500 text-indigo-600'
            }`}
          >
            <Save size={24} className="mb-2" />
            <span className="text-[11px] font-black uppercase tracking-wider">SALVAR</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 ${
              isDarkMode 
              ? 'bg-slate-800 border-slate-700 hover:border-emerald-500 text-emerald-400' 
              : 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-500 text-emerald-600'
            }`}
          >
            {isProcessing ? <Loader2 size={24} className="mb-2 animate-spin" /> : <Upload size={24} className="mb-2" />}
            <span className="text-[11px] font-black uppercase tracking-wider">
              {isProcessing ? 'Lendo...' : 'RESTAURAR'}
            </span>
          </button>
        </div>

        {/* Status da Sincronização Supabase */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between group transition-all backdrop-blur-sm ${
          isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50/50 border-slate-100'
        }`}>
          <div className="flex flex-col gap-0.5 overflow-hidden">
            <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Sincronização Supabase
            </span>
            <div className="flex items-center gap-1.5 mt-1">
               <span className={`flex h-1.5 w-1.5 rounded-full ${syncInfo.color.replace('text', 'bg')} ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`}></span>
               <span className={`text-xs font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                {syncInfo.label}
              </span>
            </div>
          </div>
          <div className={`p-2 rounded-lg ${syncInfo.bg} ${syncInfo.color}`}>
            {syncInfo.icon}
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={processFileForPreview}
          accept=".json"
          className="hidden"
        />
      </div>

      {/* Modal de Pré-visualização */}
      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-indigo-600/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg text-white">
                  <FileCheck size={20} />
                </div>
                <div>
                  <h4 className="text-white font-black text-lg leading-tight">Resumo do Backup</h4>
                  <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest">Verificação de Integridade</p>
                </div>
              </div>
              <button 
                onClick={() => setPreview(null)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Lançamentos</p>
                  <p className="text-xl font-bold text-white">{preview.totalItems}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Data Backup</p>
                  <p className="text-xs font-bold text-white">
                    {preview.date ? new Date(preview.date).toLocaleDateString('pt-BR') : 'Não informada'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-xs font-bold text-slate-300">Total Receitas</span>
                  </div>
                  <span className="text-sm font-black text-emerald-500">
                    {preview.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-500" />
                    <span className="text-xs font-bold text-slate-300">Total Despesas</span>
                  </div>
                  <span className="text-sm font-black text-rose-500">
                    {preview.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 mt-4">
                  <span className="text-xs font-black text-white uppercase">Saldo Final</span>
                  <span className={`text-lg font-black ${(preview.totalIncome - preview.totalExpenses) >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                    {(preview.totalIncome - preview.totalExpenses).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex gap-3 items-start">
                <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200/70 font-medium leading-relaxed">
                  <b>Atenção:</b> Ao confirmar, os dados atuais salvos em seu computador serão completamente substituídos pelo conteúdo deste arquivo.
                </p>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => setPreview(null)}
                  className="flex-1 py-4 text-slate-400 font-black uppercase text-xs hover:bg-slate-800 rounded-2xl transition-all border border-slate-800"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmRestoration}
                  disabled={isProcessing}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs rounded-2xl shadow-xl shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
