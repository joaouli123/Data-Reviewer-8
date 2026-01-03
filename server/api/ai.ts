import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from "@google/generative-ai";

const API_KEY = process.env.VITE_GOOGLE_GEMINI_API_KEY || "";
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
// Versão da lib carregada (removido require para evitar erro ESM)
console.log("[AI Init] Carregando integração Gemini...");

export async function analyzeWithAI(prompt: string, responseJsonSchema: any = null) {
  // Verificação básica
  if (!genAI) throw new Error('API_KEY_NOT_CONFIGURED');

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", 
      generationConfig: {
        responseMimeType: responseJsonSchema ? "application/json" : "text/plain",
        temperature: 0.2,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    let finalPrompt = prompt;
    
    // Reforço no prompt para garantir a estrutura
    if (responseJsonSchema) {
      finalPrompt = `${prompt}\n\nIMPORTANTE: Responda APENAS com um JSON válido seguindo estritamente esta estrutura:\n${JSON.stringify(responseJsonSchema)}`;
    }

    console.log(`[AI Debug] Enviando prompt real para ${model.model}...`);
    const result = await model.generateContent(finalPrompt);
    const responseText = result.response.text();

    if (responseJsonSchema) {
      try {
        return JSON.parse(responseText);
      } catch (e) {
        console.error("Erro ao ler JSON da IA:", responseText);
        // Fallback: Tenta limpar caso a IA tenha mandado markdown ```json ... ```
        const cleanText = responseText.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
      }
    }
    
    return responseText;

  } catch (error: any) {
    console.error("Gemini Error Completo:", error);
    
    // Tratamento específico para o erro de versão antiga
    if (error.message?.includes("404") || error.message?.includes("not found")) {
        throw new Error("Erro de Versão: Rode 'npm install @google/generative-ai@latest' no terminal.");
    }

    throw new Error(error.message || "Erro ao conectar com a IA");
  }
}

// Mantendo o alias para compatibilidade se necessário
export const invokeGeminiAnalysis = analyzeWithAI;
