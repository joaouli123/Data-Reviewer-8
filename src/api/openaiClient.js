import { apiRequest } from '@/lib/queryClient';

export const invokeOpenAI = async (prompt, responseJsonSchema = null) => {
  try {
    console.log("[AI Proxy] Iniciando requisição para o backend...");
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth') || '{}').token}`
      },
      body: JSON.stringify({ prompt, schema: responseJsonSchema })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[AI Proxy] Erro no backend:", errorData);
      throw new Error(errorData.error || 'Erro na análise de IA');
    }

    const data = await response.json();
    console.log("[AI Proxy] Sucesso!", data);
    return data.result;
  } catch (error) {
    console.error('[AI Proxy] Erro Crítico:', error.message);
    throw error;
  }
};

// Alias para manter compatibilidade com componentes que usam InvokeLLM
export const InvokeLLM = invokeOpenAI;
