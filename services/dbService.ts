
import { Transaction } from "../types";

// Interface para o schema do arquivo JSON
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
    // 1. Tentar carregar do Electron (Arquivo físico)
    if (this.isElectron) {
      try {
        const data = await (window as any).electronAPI.readDB();
        if (data && data.transactions) {
          this.cache = data;
          // Sincroniza o localStorage com o que veio do arquivo para redundância
          localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(this.cache));
          console.log("Banco de dados local (Electron) carregado.");
          return;
        }
      } catch (err) {
        console.error("Falha ao ler banco Electron, tentando localStorage...", err);
      }
    }

    // 2. Fallback para LocalStorage (Navegador/PWA)
    const saved = localStorage.getItem(this.LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        this.cache = JSON.parse(saved);
        console.log("Banco de dados persistente (Navegador) carregado.");
      } catch (err) {
        console.error("Erro ao parsear localStorage:", err);
      }
    }
  }

  private async persist() {
    // Salva no localStorage sempre (redundância)
    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(this.cache));

    // Salva no Electron se disponível
    if (this.isElectron) {
      try {
        await (window as any).electronAPI.writeDB(this.cache);
      } catch (err) {
        console.error("Erro ao persistir no arquivo físico:", err);
      }
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
  }

  async clearTransactions(): Promise<void> {
    this.cache.transactions = [];
    await this.persist();
  }

  async setAuthData(data: any): Promise<void> {
    this.cache.auth = data;
    await this.persist();
  }

  async getAuthData(): Promise<any> {
    return this.cache.auth;
  }

  async setConfig(key: string, value: any): Promise<void> {
    this.cache.config[key] = value;
    await this.persist();
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
