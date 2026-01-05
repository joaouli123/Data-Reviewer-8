import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.VITE_GOOGLE_GEMINI_API_KEY || "";

// Inicialização diferente (conforme o texto que você mandou)
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export async function analyzeWithAI(prompt: string, responseJsonSchema: any = null) {
  if (!ai) throw new Error('API_KEY_NOT_CONFIGURED');

  try {
    const promptWithInstruction = `${prompt}

Você é um CFO Sênior. Você DEVE retornar um JSON válido e estruturado. 
O campo 'executive_summary' é OBRIGATÓRIO, deve estar em Português (BR) e deve conter pelo menos 3 parágrafos de análise profunda e estratégica sobre os dados fornecidos. 
Não use placeholders. Se os dados forem escassos, analise a tendência ou a necessidade de mais informações de forma profissional.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp", 
      config: {
        responseMimeType: responseJsonSchema ? "application/json" : "text/plain",
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
      contents: [
        {
          role: "user",
          parts: [{ text: promptWithInstruction }]
        }
      ]
    });

    const responseText = response.text;

    if (!responseText) {
      console.error("[AI Debug] Resposta vazia do modelo");
      throw new Error("IA retornou resposta vazia");
    }

    console.log("[AI Debug] Resposta bruta recebida:", responseText);

    if (responseJsonSchema) {
      // Limpeza robusta do JSON
      const cleanText = responseText.replace(/```json|```/g, '').trim();
      try {
        const parsed = JSON.parse(cleanText);
        console.log("[AI Debug] JSON parseado com sucesso");
        return parsed;
      } catch (e) {
        console.error("[AI Debug] Erro Parse JSON:", cleanText);
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log("[AI Debug] JSON extraído via Regex com sucesso");
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error("A IA não retornou um JSON válido.");
      }
    }
    
    return responseText;

  } catch (error: any) {
    console.error("Erro SDK Novo:", error);
    throw new Error(error.message || "Erro na IA");
  }
}

export const invokeGeminiAnalysis = analyzeWithAI;
