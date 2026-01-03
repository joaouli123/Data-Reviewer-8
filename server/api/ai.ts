import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.VITE_GOOGLE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export async function analyzeWithAI(prompt: string, responseJsonSchema: any = null) {
  if (!genAI) {
    throw new Error('API_KEY_NOT_CONFIGURED');
  }

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-pro",
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 2048,
      responseMimeType: responseJsonSchema ? "application/json" : "text/plain"
    }
  });

  let finalPrompt = prompt;
  if (responseJsonSchema) {
    finalPrompt = `${prompt}\n\nResponda obrigatoriamente com um JSON válido que siga exatamente este schema: ${JSON.stringify(responseJsonSchema)}`;
  }

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
      systemInstruction: "Você é um assistente financeiro experiente para o mercado brasileiro. Forneça análises detalhadas, precisas e profissionais em português brasileiro. Quando solicitado JSON, retorne apenas o objeto JSON sem explicações adicionais."
    });

    const textContent = result.response.text().trim();

    if (responseJsonSchema) {
      return extractJSON(textContent);
    }
    
    return textContent;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`Erro na API Gemini: ${error.message}`);
  }
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
  throw new Error('Não foi possível extrair JSON válido da resposta da IA');
}
