
import { createClient } from '@supabase/supabase-js';
import { Transaction, TransactionStatus, TransactionType, RecurrenceType } from '../types';

// Usa variáveis de ambiente se disponíveis (Vercel), senão usa fallback
// Fallbacks vazios no env são tratados para evitar erros do cliente
const envUrl = process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_ANON_KEY;

// URLs padrão de fallback apenas se o env não estiver definido ou vazio
const SUPABASE_URL = envUrl && envUrl.length > 0 ? envUrl : 'https://perbfjbezxaxftvnvfds.supabase.co';
const SUPABASE_ANON_KEY = envKey && envKey.length > 0 ? envKey : 'sb_publishable_gqJfX5Lxtr_6fZrPpLB1cw_nZQUrsxw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper para converter do DB (snake_case) para o App (camelCase)
const mapFromDB = (t: any): Transaction => ({
  id: t.id,
  description: t.description,
  amount: Number(t.amount),
  type: t.type as TransactionType,
  category: t.category,
  date: t.date,
  paymentDate: t.payment_date,
  status: t.status as TransactionStatus,
  recurrence: t.recurrence as RecurrenceType,
  installmentsCount: t.installments_count,
  installmentNumber: t.installment_number,
  seriesId: t.series_id
});

// Helper para converter do App (camelCase) para o DB (snake_case)
const mapToDB = (t: Transaction, username: string) => ({
  id: t.id,
  username: username, // Associando a transação ao usuário
  description: t.description,
  amount: t.amount,
  type: t.type,
  category: t.category,
  date: t.date,
  payment_date: t.paymentDate,
  status: t.status,
  recurrence: t.recurrence,
  installments_count: t.installmentsCount,
  installment_number: t.installmentNumber,
  series_id: t.seriesId
});

export const supabaseService = {
  async fetchTransactions(username: string): Promise<Transaction[]> {
    try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('username', username)
          .order('date', { ascending: false });

        if (error) {
            console.error("Supabase fetch error:", error);
            return [];
        }
        return (data || []).map(mapFromDB);
    } catch (e) {
        console.error("Supabase connection error:", e);
        return [];
    }
  },

  async upsertTransactions(transactions: Transaction[], username: string): Promise<boolean> {
    try {
        const dbData = transactions.map(t => mapToDB(t, username));
        const { error } = await supabase
          .from('transactions')
          .upsert(dbData, { onConflict: 'id' });
        
        if (error) console.error("Supabase upsert error:", error);
        return !error;
    } catch (e) {
        return false;
    }
  },

  async deleteTransaction(id: string): Promise<boolean> {
    try {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        return !error;
    } catch (e) {
        return false;
    }
  },

  // Busca perfil do usuário (Login)
  async fetchUserSettings(username: string): Promise<{auth: any, config: any} | null> {
    try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('id', username.toLowerCase()) // O ID agora é o username
          .single();

        if (error || !data) return null;
        return { auth: data.auth_data, config: data.config_data };
    } catch (e) {
        console.error("Supabase auth fetch error:", e);
        return null;
    }
  },

  // Salva ou cria perfil (Registro/Update)
  async upsertUserSettings(username: string, auth: any, config: any): Promise<boolean> {
    try {
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            id: username.toLowerCase(),
            auth_data: auth,
            config_data: config,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        return !error;
    } catch (e) {
        return false;
    }
  }
};
