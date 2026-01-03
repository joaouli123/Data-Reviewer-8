import { z } from "zod";

const API_KEY = process.env.GROQ_API_KEY;
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function analyzeWithAI(prompt: string, responseJsonSchema: any = null) {
  if (!API_KEY) {
    throw new Error('API_KEY_NOT_CONFIGURED');
  }

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
    throw new Error(error.error?.message || 'Erro na API Groq');
  }

  const data = await response.json();
  const textContent = data.choices[0].message.content.trim();

  if (responseJsonSchema) {
    return extractJSON(textContent);
  }
  
  return textContent;
}

function extractJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const matches = text.match(/\{[\s\S]*?\}/g);
    if (matches && matches.length > 0) {
      const sortedMatches = matches.sort((a, b) => b.length - a.length);
      for (const match of sortedMatches) {
        try {
          return JSON.parse(match);
        } catch (e) {
          continue;
        }
      }
    }
  }
  throw new Error('Não foi possível extrair JSON válido');
}
