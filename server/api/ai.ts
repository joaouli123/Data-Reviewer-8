import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_GEMINI_API_KEY || "";

// Inicialização diferente (conforme o texto que você mandou)
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY, apiVersion: "v1alpha" }) : null;

export async function analyzeWithAI(prompt: string, responseJsonSchema: any = null) {
  if (!ai) throw new Error('API_KEY_NOT_CONFIGURED');

  try {
    // Verificar se é análise financeira (tem campos específicos de CFO) ou precificação
    const isCFOAnalysis = prompt.includes('executive_summary') || 
                          prompt.includes('expense_reduction') || 
                          prompt.includes('revenue_growth');
    
    let finalPrompt = prompt;
    
    // Só adicionar instruções de CFO se for análise financeira
    if (isCFOAnalysis) {
      finalPrompt = `${prompt}

Você é um CFO Sênior. Você DEVE retornar um JSON válido e estruturado. 
O campo 'executive_summary' é OBRIGATÓRIO, deve estar em Português (BR) e deve conter pelo menos 3 parágrafos de análise profunda e estratégica sobre os dados fornecidos. 
O campo 'expense_reduction_opportunities' deve ser um array com pelo menos 3 sugestões reais baseadas nos dados, ou tendências do setor caso os dados sejam poucos.
O campo 'revenue_growth_suggestions' deve ser um array com pelo menos 3 estratégias de crescimento.
Não use placeholders como "Nenhuma oportunidade identificada". Se os dados forem escassos, use sua expertise para sugerir melhorias baseadas em melhores práticas de gestão financeira para PMEs.`;
    } else {
      // Para precificação e outras análises, apenas garantir JSON
      finalPrompt = `${prompt}

IMPORTANTE: Responda APENAS com um JSON válido, sem texto adicional antes ou depois. Todos os campos devem estar em português do Brasil.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      config: {
        responseMimeType: responseJsonSchema ? "application/json" : "text/plain",
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
      contents: [
        {
          role: "user",
          parts: [{ text: finalPrompt }]
        }
      ]
    });

    let responseText = '';

    if (typeof response.text === 'function') {
      responseText = await response.text();
    } else if (typeof response.text === 'string') {
      responseText = response.text;
    } else {
      // Fallback para estrutura de resposta do SDK
      const candidateText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof candidateText === 'string') {
        responseText = candidateText;
      }
    }

    if (!responseText) {
      console.error("[AI Debug] Resposta vazia do modelo");
      throw new Error("IA retornou resposta vazia");
    }

    console.log("[AI Debug] Resposta bruta recebida:", responseText.substring(0, 500));

    if (responseJsonSchema) {
      // Limpeza robusta do JSON
      const cleanText = responseText.replace(/```json|```/g, '').trim();
      try {
        const parsed = JSON.parse(cleanText);
        console.log("[AI Debug] JSON parseado com sucesso");
        return parsed;
      } catch (e) {
        console.error("[AI Debug] Erro Parse JSON:", cleanText.substring(0, 200));
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
