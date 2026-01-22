
import { Transaction } from "../types";
import { supabaseService } from "./supabaseService";

export interface DBFileSchema {
  transactions: Transaction[];
  auth: any;
  config: Record<string, any>;
  exportDate?: string;
}

export class DatabaseService {
  private cache: DBFileSchema = {
    transactions: [],
    auth: null,
    config: {}
  };

  private readonly LOCAL_STORAGE_KEY = 'fm_ricardo_db_persistent';

  private get isElectron() {
    return !!(window as any).electronAPI;
  }

  async init(): Promise<void> {
    // Carregar localmente primeiro
    if (this.isElectron) {
      try {
        const data = await (window as any).electronAPI.readDB();
        if (data) this.cache = { ...this.cache, ...data };
      } catch (err) {}
    }

    const saved = localStorage.getItem(this.LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.cache = { ...this.cache, ...parsed };
      } catch (err) {}
    }
  }

  async logout(): Promise<void> {
    // 1. Limpa o cache em memória imediatamente
    this.cache = {
      transactions: [],
      auth: null,
      config: { dark_mode: this.cache.config.dark_mode } // Preserva apenas o tema
    };
    
    // 2. Remove do LocalStorage
    localStorage.removeItem(this.LOCAL_STORAGE_KEY);
    
    // 3. Se for Electron, limpa o arquivo físico enviando o cache vazio
    if (this.isElectron) {
      try {
        await (window as any).electronAPI.writeDB(this.cache);
      } catch (err) {}
    }
  }

  async loadUserData(username: string): Promise<void> {
    try {
      const cloudSettings = await supabaseService.fetchUserSettings(username);
      if (cloudSettings) {
        this.cache.auth = cloudSettings.auth;
        this.cache.config = cloudSettings.config || {};
      }

      const cloudTransactions = await supabaseService.fetchTransactions(username);
      if (cloudTransactions) {
        this.cache.transactions = cloudTransactions;
      }

      await this.persist(false);
    } catch (err) {
      console.warn("Erro ao baixar dados do usuário da nuvem.");
    }
  }

  private async persist(syncToCloud: boolean = true) {
    // Se não houver auth, não persiste nada ou limpa o que existe
    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(this.cache));

    if (this.isElectron) {
      try {
        await (window as any).electronAPI.writeDB(this.cache);
      } catch (err) {}
    }

    const username = this.cache.auth?.username;
    if (syncToCloud && username) {
      try {
        await supabaseService.upsertTransactions(this.cache.transactions, username);
        await supabaseService.upsertUserSettings(username, this.cache.auth, this.cache.config);
      } catch (err) {}
    }
  }

  async countTransactions(): Promise<number> {
    return this.cache.transactions.length;
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    const index = this.cache.transactions.findIndex(t => t.id === transaction.id);
    if (index > -1) {
      this.cache.transactions[index] = transaction;
    } else {
      this.cache.transactions.push(transaction);
    }
    await this.persist();
  }

  async saveTransactions(transactions: Transaction[]): Promise<void> {
    const existingIds = new Set(this.cache.transactions.map(t => t.id));
    transactions.forEach(t => {
      if (!existingIds.has(t.id)) {
        this.cache.transactions.push(t);
      } else {
        const idx = this.cache.transactions.findIndex(et => et.id === t.id);
        this.cache.transactions[idx] = t;
      }
    });
    await this.persist();
  }

  async restoreFullBackup(data: DBFileSchema): Promise<void> {
    this.cache = {
      transactions: data.transactions || [],
      auth: data.auth || this.cache.auth,
      config: data.config || this.cache.config
    };
    await this.persist();
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return [...this.cache.transactions];
  }

  async deleteTransaction(id: string): Promise<void> {
    this.cache.transactions = this.cache.transactions.filter(t => t.id !== id);
    await this.persist();
    try {
      await supabaseService.deleteTransaction(id);
    } catch (err) {}
  }

  async clearTransactions(): Promise<void> {
    this.cache.transactions = [];
    await this.persist();
  }

  async setAuthData(data: any): Promise<void> {
    this.cache.auth = data;
    await this.persist(true);
  }

  async getAuthData(): Promise<any> {
    return this.cache.auth;
  }

  async setConfig(key: string, value: any): Promise<void> {
    this.cache.config[key] = value;
    await this.persist(true);
  }

  async getConfig(key: string): Promise<any> {
    return this.cache.config[key];
  }

  async exportDatabase(): Promise<string> {
    return JSON.stringify({
      ...this.cache,
      exportDate: new Date().toISOString()
    }, null, 2);
  }
}

export const db = new DatabaseService();
