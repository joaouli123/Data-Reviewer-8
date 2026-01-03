import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.VITE_GOOGLE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export async function analyzeWithAI(prompt: string, responseJsonSchema: any = null) {
  if (!genAI) {
    throw new Error('API_KEY_NOT_CONFIGURED');
  }

  // Usando gemini-1.5-flash que é o modelo mais estável e suporta JSON nativo
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash"
  });

  let finalPrompt = prompt;
  if (responseJsonSchema) {
    finalPrompt = `${prompt}\n\nResponda APENAS com um objeto JSON seguindo este formato:\n${JSON.stringify(responseJsonSchema)}\nNão inclua markdown ou explicações.`;
  }

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }]
    });

    const textContent = result.response.text().trim().replace(/^```json/, '').replace(/```$/, '');

    if (responseJsonSchema) {
      try {
        return JSON.parse(textContent);
      } catch (parseError) {
        // Fallback: tenta extrair JSON do texto caso a IA tenha incluído texto extra
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw parseError;
      }
    }

    return textContent;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`Erro na API Gemini: ${error.message}`);
  }
}