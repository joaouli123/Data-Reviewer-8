import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.VITE_GOOGLE_GEMINI_API_KEY || "";

// Inicialização diferente (conforme o texto que você mandou)
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export async function analyzeWithAI(prompt: string, responseJsonSchema: any = null) {
  if (!ai) throw new Error('API_KEY_NOT_CONFIGURED');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp", 
      config: {
        responseMimeType: responseJsonSchema ? "application/json" : "text/plain",
        temperature: 0.1,
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
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
