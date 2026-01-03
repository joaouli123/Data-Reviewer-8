import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.VITE_GOOGLE_GEMINI_API_KEY || "";

// Inicialização diferente (conforme o texto que você mandou)
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export async function analyzeWithAI(prompt: string, responseJsonSchema: any = null) {
  if (!ai) throw new Error('API_KEY_NOT_CONFIGURED');

  try {
    console.log("[AI Debug] Usando SDK Novo com Gemini 2.0...");

    // Na biblioteca nova, a estrutura muda um pouco
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", 
      config: {
        responseMimeType: responseJsonSchema ? "application/json" : "text/plain",
        temperature: 0.2,
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    });

    const responseText = response.text;

    if (!responseText) throw new Error("IA retornou resposta vazia");

    let cleanText = responseText;
    // Tratamento de JSON
    if (responseJsonSchema) {
      // Reforço para garantir JSON limpo se a IA mandar markdown
      cleanText = responseText.replace(/```json|```/g, '').trim();
      try {
        return JSON.parse(cleanText);
      } catch (e) {
        console.error("Erro Parse JSON:", cleanText);
        // Tenta extrair JSON se houver texto ao redor
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error("A IA não retornou um JSON válido.");
      }
    }
    
    return cleanText;

  } catch (error: any) {
    console.error("Erro SDK Novo:", error);
    throw new Error(error.message || "Erro na IA");
  }
}

export const invokeGeminiAnalysis = analyzeWithAI;
