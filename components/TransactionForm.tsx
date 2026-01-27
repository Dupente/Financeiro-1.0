
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, TransactionStatus, RecurrenceType } from '../types';

interface TransactionFormProps {
  onSubmit: (t: Transaction | Transaction[]) => void;
  onCancel: () => void;
  initialData?: Transaction | null;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const getLastDayOfCurrentMonth = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const year = lastDay.getFullYear();
    const month = String(lastDay.getMonth() + 1).padStart(2, '0');
    const day = String(lastDay.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    description: '',
    amount: '' as string | number,
    type: TransactionType.EXPENSE,
    category: 'Moradia',
    date: getLastDayOfCurrentMonth(),
    status: TransactionStatus.PENDING,
    recurrence: RecurrenceType.FIXED,
    installmentsCount: 2
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        description: initialData.description,
        amount: initialData.amount,
        type: initialData.type,
        category: initialData.category,
        date: initialData.date.split('T')[0],
        status: initialData.status,
        recurrence: initialData.recurrence || RecurrenceType.UNIQUE,
        installmentsCount: initialData.installmentsCount || 2
      });
    }
  }, [initialData]);

  const getRecurrentDate = (baseDate: Date, monthsToAdd: number): Date => {
    const targetDate = new Date(baseDate);
    const originalDay = baseDate.getDate();
    targetDate.setMonth(baseDate.getMonth() + monthsToAdd);
    if (targetDate.getDate() !== originalDay) {
      return new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
    }
    return targetDate;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = typeof formData.amount === 'string' ? parseFloat(formData.amount) : formData.amount;
    
    if (!formData.description || !formData.date || !formData.category || isNaN(numericAmount) || numericAmount <= 0) {
      alert("Por favor, preencha todos os campos corretamente.");
      return;
    }

    const startDate = new Date(formData.date);
    startDate.setMinutes(startDate.getMinutes() + startDate.getTimezoneOffset());

    // Verificamos se estamos EDITANDO e se a recorrência mudou de tipo
    const isNew = !initialData;
    const recurrenceChanged = initialData && initialData.recurrence !== formData.recurrence;

    // LÓGICA DE GERAÇÃO DE SÉRIE: Apenas para novos registros ou quando muda o tipo de recorrência
    if ((isNew || recurrenceChanged) && formData.recurrence === RecurrenceType.INSTALLMENT) {
      const transactions: Transaction[] = [];
      const seriesId = crypto.randomUUID();
      
      for (let i = 0; i < formData.installmentsCount; i++) {
        const installmentDate = getRecurrentDate(startDate, i);
        transactions.push({
          id: crypto.randomUUID(),
          seriesId,
          description: `${formData.description} (${i + 1}/${formData.installmentsCount})`,
          amount: numericAmount,
          type: formData.type,
          category: formData.category,
          date: installmentDate.toISOString(),
          status: i === 0 ? formData.status : TransactionStatus.PENDING,
          recurrence: RecurrenceType.INSTALLMENT,
          installmentsCount: formData.installmentsCount,
          installmentNumber: i + 1
        });
      }
      onSubmit(transactions);
    } else if ((isNew || recurrenceChanged) && formData.recurrence === RecurrenceType.FIXED) {
      const transactions: Transaction[] = [];
      const seriesId = crypto.randomUUID();
      const startMonth = startDate.getMonth();
      const monthsUntilEndOfYear = 11 - startMonth;

      for (let i = 0; i <= monthsUntilEndOfYear; i++) {
        const fixedDate = getRecurrentDate(startDate, i);
        transactions.push({
          id: crypto.randomUUID(),
          seriesId,
          description: `${formData.description} (Fixo)`,
          amount: numericAmount,
          type: formData.type,
          category: formData.category,
          date: fixedDate.toISOString(),
          status: i === 0 ? formData.status : TransactionStatus.PENDING,
          recurrence: RecurrenceType.FIXED,
        });
      }
      onSubmit(transactions);
    } else {
      // EDIÇÃO DE UM ÚNICO ITEM OU LANÇAMENTO ÚNICO
      // Se estamos editando um item recorrente mas não mudamos o tipo de recorrência, 
      // editamos apenas ESSE item para preservar a integridade da série antiga.
      onSubmit({
        id: initialData?.id || crypto.randomUUID(),
        seriesId: initialData?.seriesId,
        description: formData.description,
        amount: numericAmount,
        type: formData.type,
        category: formData.category,
        date: startDate.toISOString(),
        status: formData.status,
        recurrence: formData.recurrence,
        installmentNumber: initialData?.installmentNumber,
        installmentsCount: initialData?.installmentsCount
      } as Transaction);
    }
  };

  const categories = ["Alimentação", "Transporte", "Lazer", "Moradia", "Educação", "Saúde", "Salário", "Investimento", "Outros"];

  const labelStyle = "block text-sm font-semibold text-white mb-2 ml-1";
  const inputStyle = "w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none placeholder:text-slate-500";
  const toggleBtnStyle = (active: boolean) => `flex-1 py-2 text-xs font-bold rounded-lg transition-all border ${
    active 
    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' 
    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
  }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={labelStyle}>Descrição</label>
        <input
          required
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={inputStyle}
          placeholder="Ex: Aluguel, Internet, Netflix..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelStyle}>Valor (R$)</label>
          <input
            required
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className={inputStyle}
            placeholder="0,00"
          />
        </div>
        <div>
          <label className={labelStyle}>Tipo</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
            className={inputStyle}
          >
            <option value={TransactionType.EXPENSE}>Despesa</option>
            <option value={TransactionType.INCOME}>Receita</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelStyle}>Recorrência</label>
        <div className="flex gap-2 p-1 bg-slate-950 rounded-xl">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, recurrence: RecurrenceType.UNIQUE })}
            className={toggleBtnStyle(formData.recurrence === RecurrenceType.UNIQUE)}
          >
            Única
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, recurrence: RecurrenceType.FIXED })}
            className={toggleBtnStyle(formData.recurrence === RecurrenceType.FIXED)}
          >
            Fixa
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, recurrence: RecurrenceType.INSTALLMENT })}
            className={toggleBtnStyle(formData.recurrence === RecurrenceType.INSTALLMENT)}
          >
            Parcelada
          </button>
        </div>
        {formData.recurrence === RecurrenceType.FIXED && !initialData && (
          <p className="text-[10px] text-indigo-300 mt-2 ml-1 italic">
            * Transações fixas serão geradas mensalmente até Dezembro deste ano.
          </p>
        )}
        {initialData && initialData.seriesId && (
          <p className="text-[10px] text-amber-300 mt-2 ml-1 italic">
            * Editando item de uma série. Alterações recorrentes exigem novos lançamentos.
          </p>
        )}
      </div>

      {formData.recurrence === RecurrenceType.INSTALLMENT && !initialData && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-200">
          <label className={labelStyle}>Número de Parcelas</label>
          <input
            type="number"
            min="2"
            max="120"
            value={formData.installmentsCount}
            onChange={(e) => setFormData({ ...formData, installmentsCount: parseInt(e.target.value) || 2 })}
            className={inputStyle}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelStyle}>Categoria</label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className={inputStyle}
          >
            <option value="" disabled>Selecione...</option>
            {categories.map(cat => (
              <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelStyle}>Data Inicial</label>
          <input
            required
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className={inputStyle}
          />
        </div>
      </div>

      <div>
        <label className={labelStyle}>Status (Mês Atual)</label>
        <div className="flex gap-2 p-1 bg-slate-950 rounded-xl">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, status: TransactionStatus.PENDING })}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              formData.status === TransactionStatus.PENDING 
              ? 'bg-slate-800 text-white border border-slate-700' 
              : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Pendente
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, status: TransactionStatus.PAID })}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              formData.status === TransactionStatus.PAID 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
              : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Pago
          </button>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 text-slate-400 font-bold hover:bg-slate-800 rounded-xl transition-colors border border-slate-800">
          Cancelar
        </button>
        <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95">
          {initialData ? 'Salvar Alterações' : 'Criar Transação(ões)'}
        </button>
      </div>
    </form>
  );
};
