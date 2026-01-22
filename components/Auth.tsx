
import React, { useState, useEffect } from 'react';
import { Lock, User, ShieldCheck, Eye, EyeOff, Wallet, ArrowRight, Loader2, UserPlus, LogIn } from 'lucide-react';
import { db } from '../services/dbService';
import { supabaseService } from '../services/supabaseService';

interface AuthProps {
  onLogin: () => void;
  isDarkMode: boolean;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, isDarkMode }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    db.init().finally(() => setIsInitializing(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedUsername = username.trim().toLowerCase();

      if (!normalizedUsername || !password) {
        setError('Preencha usuário e senha.');
        setLoading(false);
        return;
      }

      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('As senhas não coincidem.');
          setLoading(false);
          return;
        }
        if (password.length < 4) {
          setError('A senha deve ter pelo menos 4 caracteres.');
          setLoading(false);
          return;
        }

        // Verificar se usuário já existe
        const existing = await supabaseService.fetchUserSettings(normalizedUsername);
        if (existing) {
          setError('Este nome de usuário já está em uso.');
          setLoading(false);
          return;
        }

        // Criar Novo Usuário
        const authData = { username: normalizedUsername, password };
        await db.setAuthData(authData); // Isso já salva no Supabase
        onLogin();
      } else {
        // Modo Login
        const userData = await supabaseService.fetchUserSettings(normalizedUsername);
        
        if (userData && userData.auth.password === password) {
          await db.setAuthData(userData.auth);
          await db.loadUserData(normalizedUsername); // Carrega transações do usuário
          onLogin();
        } else {
          setError('Usuário ou senha incorretos.');
        }
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (isInitializing) {
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
            Ricardo Finance
          </h2>
          <p className={`text-sm mt-2 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {mode === 'login' ? 'Entre com sua conta' : 'Crie seu banco de dados pessoal'}
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
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: ricardo_user"
                className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all ${
                  isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
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
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-12 pr-12 py-3 rounded-xl border outline-none transition-all ${
                  isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
              <label className={`text-xs font-bold uppercase ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Confirmar Senha
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all ${
                    isDarkMode 
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
                  }`}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {mode === 'login' ? 'Entrar no Sistema' : 'Cadastrar Conta'}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className={`text-xs font-bold flex items-center justify-center gap-2 mx-auto transition-colors ${
                isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
              }`}
            >
              {mode === 'login' ? (
                <><UserPlus size={14} /> Não tem conta? Cadastre-se</>
              ) : (
                <><LogIn size={14} /> Já tem conta? Faça Login</>
              )}
            </button>
          </div>
        </form>

        <p className={`text-[9px] text-center mt-8 font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
          Nuvem Supabase • Multi-User Mode
        </p>
      </div>
    </div>
  );
};
