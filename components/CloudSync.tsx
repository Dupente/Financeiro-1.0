
import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, LogIn, Database } from 'lucide-react';
import { driveService } from '../services/googleDriveService';
import { db } from '../services/dbService';

interface CloudSyncProps {
  onDataSynced: () => void;
  isDarkMode: boolean;
}

export const CloudSync: React.FC<CloudSyncProps> = ({ onDataSynced, isDarkMode }) => {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(driveService.isLoggedIn());
  }, []);

  const handleConnect = async () => {
    setStatus('syncing');
    try {
      await driveService.authenticate();
      setIsConnected(true);
      await handleSyncDown();
    } catch (err) {
      setStatus('error');
    }
  };

  const handleSyncUp = async () => {
    setStatus('syncing');
    try {
      const data = await db.exportDatabase();
      const success = await driveService.uploadData(data);
      if (success) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  const handleSyncDown = async () => {
    setStatus('syncing');
    try {
      const cloudData = await driveService.downloadData();
      if (cloudData) {
        if (confirm("Dados encontrados na nuvem. Deseja substituir seus dados locais pelos da nuvem?")) {
          await db.clearTransactions();
          if (cloudData.transactions) await db.saveTransactions(cloudData.transactions);
          if (cloudData.auth) await db.setAuthData(cloudData.auth);
          onDataSynced();
          setStatus('success');
        } else {
          setStatus('idle');
        }
      } else {
        // Se não houver arquivo, faz o primeiro upload
        await handleSyncUp();
      }
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <div className={`p-6 rounded-2xl border shadow-sm transition-all ${
      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-500/10' : 'bg-slate-500/10'}`}>
            <Cloud size={20} className={isConnected ? 'text-emerald-500' : 'text-slate-500'} />
          </div>
          <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            Sincronização na Nuvem
          </h3>
        </div>
        {isConnected && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Conectado</span>
          </div>
        )}
      </div>

      <p className={`text-xs mb-6 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {isConnected 
          ? "Seus dados estão sendo sincronizados com o Google Drive. Acesse de qualquer lugar!"
          : "Conecte sua conta Google para salvar seus dados na nuvem e acessá-los em outros navegadores ou no app Windows."}
      </p>

      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={status === 'syncing'}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          {status === 'syncing' ? <RefreshCw className="animate-spin" size={18} /> : <LogIn size={18} />}
          Conectar Google Drive
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleSyncUp}
            disabled={status === 'syncing'}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
              isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-600'
            }`}
          >
            {status === 'syncing' ? (
              <RefreshCw className="animate-spin text-indigo-500 mb-2" size={20} />
            ) : status === 'success' ? (
              <CheckCircle2 className="text-emerald-500 mb-2" size={20} />
            ) : (
              <RefreshCw className="text-indigo-500 mb-2" size={20} />
            )}
            <span className="text-[10px] font-bold uppercase">Enviar Agora</span>
          </button>

          <button
            onClick={handleSyncDown}
            disabled={status === 'syncing'}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
              isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-amber-500' : 'bg-slate-50 border-slate-200 hover:border-amber-600'
            }`}
          >
            <Database className="text-amber-500 mb-2" size={20} />
            <span className="text-[10px] font-bold uppercase">Puxar Nuvem</span>
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 text-rose-500">
          <AlertCircle size={14} />
          <span className="text-[10px] font-bold">Erro ao sincronizar. Tente novamente.</span>
        </div>
      )}
    </div>
  );
};
