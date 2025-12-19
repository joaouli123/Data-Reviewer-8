// Google Gemini AI Integration
const API_KEY = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export const invokeGemini = async (prompt, responseJsonSchema = null) => {
  try {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2048
      }
    };

    if (responseJsonSchema) {
      requestBody.generationConfig.responseSchema = {
        type: 'object',
        properties: responseJsonSchema.properties || {}
      };
      requestBody.generationConfig.responseMimeType = 'application/json';
    }

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erro na API do Gemini');
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]) {
      throw new Error('Resposta inválida do Gemini');
    }

    const textContent = data.candidates[0].content.parts[0].text;
    
    // Se esperamos JSON, parse
    if (responseJsonSchema) {
      try {
        return JSON.parse(textContent);
      } catch (e) {
        // Tentar extrair JSON da resposta
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Não foi possível fazer parse da resposta JSON');
      }
    }
    
    return textContent;
  } catch (error) {
    console.error('Erro ao chamar Gemini:', error);
    throw error;
  }
};
