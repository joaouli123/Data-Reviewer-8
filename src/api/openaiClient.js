// Groq AI Integration with Llama 3.1 8B
const API_KEY = import.meta.env.VITE_GROQ;
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Function to extract JSON from text more robustly
const extractJSON = (text) => {
  // Try to parse the entire text first
  try {
    return JSON.parse(text);
  } catch (e) {
    // If that fails, try to find JSON objects in the text
  }

  // Try to find JSON with non-greedy matching
  const matches = text.match(/\{[\s\S]*?\}/g);
  if (matches && matches.length > 0) {
    // Try each match, starting from the longest (likely the main response)
    const sortedMatches = matches.sort((a, b) => b.length - a.length);
    for (const match of sortedMatches) {
      try {
        return JSON.parse(match);
      } catch (e) {
        continue;
      }
    }
  }

  // If we still can't find valid JSON, throw an error
  throw new Error('Não foi possível extrair JSON válido da resposta');
};

export const invokeOpenAI = async (prompt, responseJsonSchema = null) => {
  try {
    // Sem API key = erro (sem fallback!)
    if (!API_KEY) {
      console.error('❌ VITE_GROQ não configurada');
      throw new Error('API de IA não configurada. Configure VITE_GROQ para usar análises.');
    }

    // Construir o prompt com instruções de JSON se necessário
    let finalPrompt = prompt;
    if (responseJsonSchema) {
      finalPrompt = `${prompt}\n\nResponda APENAS com um JSON válido que corresponda a este schema: ${JSON.stringify(responseJsonSchema)}\n\nNão inclua texto antes ou depois do JSON. Retorne APENAS o objeto JSON, nada mais.`;
    }

    const requestBody = {
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente financeiro experiente. Forneça análises detalhadas e precisas em português brasileiro. Quando pedido para retornar JSON, retorne APENAS o JSON válido, sem texto adicional.'
        },
        {
          role: 'user',
          content: finalPrompt
        }
      ],
      temperature: 0.5,
      max_tokens: 2048
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Groq API Error:', error);
      throw new Error(error.error?.message || 'Erro na API Groq');
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Resposta vazia da API');
    }

    const textContent = data.choices[0].message.content.trim();
    
    // Se esperamos JSON, parse
    if (responseJsonSchema) {
      try {
        const result = extractJSON(textContent);
        
        // Se o resultado contiver uma propriedade 'properties' que envolve o objeto real
        // (comum quando o LLM se confunde com o formato do schema)
        if (result.properties && typeof result.properties === 'object' && !result.assessment && !result.overall_assessment) {
          console.log('⚠️ Re-envelopando objeto JSON (removendo "properties" extra)');
          return result.properties;
        }

        console.log('✅ JSON válido extraído da IA:', JSON.stringify(result).substring(0, 200));
        return result;
      } catch (e) {
        console.error('❌ Erro ao extrair JSON:', e.message);
        console.error('📝 Resposta completa da IA:', textContent);
        throw new Error('Resposta JSON inválida da IA');
      }
    }
    
    return textContent;
  } catch (error) {
    console.error('Groq Request Error:', error.message);
    throw error;
  }
};
