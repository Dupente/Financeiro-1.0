
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum TransactionStatus {
  PAID = 'PAID',
  PENDING = 'PENDING'
}

export enum RecurrenceType {
  UNIQUE = 'UNIQUE',
  FIXED = 'FIXED',
  INSTALLMENT = 'INSTALLMENT'
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // ISO string (Data de vencimento/agendamento)
  paymentDate?: string; // ISO string (Data real do pagamento)
  status: TransactionStatus;
  recurrence: RecurrenceType;
  installmentsCount?: number;
  installmentNumber?: number;
  seriesId?: string; // Identificador do grupo de recorrência
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpenses: number;
  paidIncome: number;
  paidExpenses: number;
  balance: number;
  pendingBalance: number;
}
