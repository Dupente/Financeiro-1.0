
import React, { useState, useEffect } from 'react';
import { Lock, User, ShieldCheck, Eye, EyeOff, Wallet, ArrowRight, Loader2 } from 'lucide-react';
import { db } from '../services/dbService';

interface AuthProps {
  onLogin: () => void;
  isDarkMode: boolean;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, isDarkMode }) => {
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await db.init();
        const savedAuth = await db.getAuthData();
        setIsFirstTime(!savedAuth);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isFirstTime) {
      if (!username || !password || !confirmPassword) {
        setError('Preencha todos os campos.');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }
      if (password.length < 4) {
        setError('A senha deve ter pelo menos 4 caracteres.');
        return;
      }

      await db.setAuthData({ username, password });
      onLogin();
    } else {
      const savedAuth = await db.getAuthData();
      if (!savedAuth) {
        setIsFirstTime(true);
        setError('Erro ao recuperar dados. Crie um novo acesso.');
        return;
      }

      if (username === savedAuth.username && password === savedAuth.password) {
        onLogin();
      } else {
        setError('Usuário ou senha incorretos.');
      }
    }
  };

  if (loading) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-colors duration-500 ${
      isDarkMode ? 'bg-slate-950' : 'bg-slate-50'
    }`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-300'}`}></div>
        <div className={`absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 ${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-300'}`}></div>
      </div>

      <div className={`w-full max-w-md p-8 rounded-3xl border shadow-2xl backdrop-blur-xl transition-all animate-in fade-in zoom-in duration-300 ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-xl shadow-indigo-600/20 mb-4 transform -rotate-3 group hover:rotate-0 transition-transform">
            <Wallet size={32} />
          </div>
          <h2 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Controle Financeiro Ricardo
          </h2>
          <p className={`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {isFirstTime ? 'Defina seu acesso inicial' : 'Bem-vindo de volta! Faça login para continuar.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold text-center animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className={`text-xs font-bold uppercase ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Usuário
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: ricardo_finance"
                className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all ${
                  isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                }`}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className={`text-xs font-bold uppercase ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-12 pr-12 py-3 rounded-xl border outline-none transition-all ${
                  isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isFirstTime && (
            <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
              <label className={`text-xs font-bold uppercase ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Confirmar Senha
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all ${
                    isDarkMode 
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                  }`}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
          >
            {isFirstTime ? 'Criar Acesso Mestre' : 'Entrar no Sistema'}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <p className={`text-[10px] text-center mt-8 font-medium uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
          Banco de Dados Interno Ativo
        </p>
      </div>
    </div>
  );
};
