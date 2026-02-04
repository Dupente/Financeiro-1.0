
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

// Função helper para obter a instância de forma segura
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key não configurada.");
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Erro ao inicializar Gemini Client:", error);
    return null;
  }
};

export const getFinancialAdvice = async (transactions: Transaction[]) => {
  const ai = getAiClient();
  
  if (!ai) {
    return "A chave de API da IA não está configurada ou é inválida. Verifique as configurações do Vercel.";
  }

  const summary = transactions.map(t => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    status: t.status,
    description: t.description
  }));

  const prompt = `
    Abaixo está o histórico de transações financeiras de um usuário. 
    Analise os gastos e ganhos e forneça 3 dicas curtas e acionáveis para melhorar a saúde financeira dele.
    Responda em Português do Brasil.
    
    Dados: ${JSON.stringify(summary)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.8,
      },
    });

    return response.text || "Não foi possível gerar conselhos no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao contatar o consultor financeiro IA.";
  }
};
