// AI Integration via backend endpoint
export const invokeOpenAI = async (prompt, responseJsonSchema = null) => {
  try {
    // Construir o prompt com instruções de JSON se necessário
    let finalPrompt = prompt;
    if (responseJsonSchema) {
      finalPrompt = `${prompt}\n\nResponda APENAS com um JSON válido que corresponda a este schema: ${JSON.stringify(responseJsonSchema)}\n\nNão inclua texto antes ou depois do JSON.`;
    }

    const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
    
    const response = await fetch('/api/ai-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        expectJson: !!responseJsonSchema
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('AI API Error:', error);
      throw new Error(error.message || 'Erro ao analisar com IA');
    }

    const data = await response.json();
    
    if (responseJsonSchema && typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        // Tentar extrair JSON da resposta
        const jsonMatch = data.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Resposta inválida da IA');
      }
    }
    
    return data;
  } catch (error) {
    console.error('AI Request Error:', error.message);
    throw error;
  }
};
