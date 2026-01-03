import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from "@google/generative-ai";

const API_KEY = process.env.VITE_GOOGLE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export async function analyzeWithAI(prompt: string, responseJsonSchema: any = null) {
  if (!genAI) {
    throw new Error('API_KEY_NOT_CONFIGURED');
  }

  try {
    const modelsToTry = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"];
    let model: GenerativeModel | null = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[AI Debug] Tentando modelo: ${modelName}`);
        const currentModel = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            responseMimeType: responseJsonSchema ? "application/json" : "text/plain",
            temperature: 0.4,
          },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        });
        
        // Test call to verify model exists and API key works
        await currentModel.generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] });
        console.log(`[AI Debug] Modelo ${modelName} validado com sucesso.`);
        model = currentModel;
        break;
      } catch (e: any) {
        lastError = e;
        console.warn(`[AI Debug] Falha ao carregar/testar modelo ${modelName}:`, e.message);
      }
    }

    if (!model) {
      throw new Error(`Nenhum modelo Gemini disponível. Último erro: ${lastError?.message}`);
    }

    let finalPrompt = prompt;
    if (responseJsonSchema) {
      finalPrompt = `${prompt}\n\nResponda ESTRITAMENTE com este JSON:\n${JSON.stringify(responseJsonSchema)}`;
    }

    console.log(`[AI Debug] Enviando prompt real para ${model.model}...`);
    const result = await model.generateContent(finalPrompt);
    const textContent = result.response.text().trim();
    
    if (responseJsonSchema) {
      try {
        return JSON.parse(textContent);
      } catch (parseError) {
        console.error("Erro de Parse JSON:", textContent);
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error("A IA não retornou um JSON válido.");
      }
    }

    return textContent;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`Erro na API Gemini: ${error.message}`);
  }
}