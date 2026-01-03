import { apiRequest } from '@/lib/queryClient';

export const invokeOpenAI = async (prompt, responseJsonSchema = null) => {
  try {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth') || '{}').token}`
      },
      body: JSON.stringify({ prompt, schema: responseJsonSchema })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro na análise de IA');
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('AI Request Error:', error.message);
    throw error;
  }
};
