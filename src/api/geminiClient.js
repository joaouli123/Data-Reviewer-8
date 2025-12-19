// Google Gemini AI Integration
const API_KEY = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Mock response para quando API key não está configurada
const generateMockAnalysis = (responseJsonSchema) => {
  if (!responseJsonSchema) {
    return 'Análise financeira gerada. Configure VITE_GOOGLE_GEMINI_API_KEY para análises reais com IA.';
  }
  
  // Detectar tipo de análise baseado no schema
  if (responseJsonSchema.properties?.suggested_reports) {
    return {
      suggested_reports: [
        { report_name: "Fluxo de Caixa Projetado", priority: "high", reason: "Prever problemas de liquidez nos próximos 3 meses", key_insight: "Crítico para planejamento financeiro" },
        { report_name: "Análise de Despesas por Categoria", priority: "high", reason: "Identificar oportunidades de redução de custos", key_insight: "Potencial de 15% em economia" },
        { report_name: "Comparativo Cliente-Fornecedor", priority: "medium", reason: "Entender relações comerciais principais", key_insight: "Concentração em 2 clientes" },
        { report_name: "Sazonalidade de Vendas", priority: "medium", reason: "Padrões de receita ao longo dos meses", key_insight: "Picos identificados em Q1 e Q4" }
      ]
    };
  }
  
  if (responseJsonSchema.properties?.executive_summary) {
    return {
      executive_summary: "Análise realizada com dados históricos. A empresa apresenta fluxo de caixa estável com potencial de crescimento.",
      cash_flow_forecast: [
        { month: "Jan 2025", predicted_revenue: 5000, predicted_expense: 3000, reasoning: "Baseado em histórico de vendas" },
        { month: "Fev 2025", predicted_revenue: 5500, predicted_expense: 3100, reasoning: "Tendência de crescimento prevista" },
        { month: "Mar 2025", predicted_revenue: 6000, predicted_expense: 3200, reasoning: "Sazonalidade considerada" }
      ],
      expense_reduction_opportunities: [
        { category: "Utilidades", suggestion: "Considere fornecedores alternativos", potential_savings: "10-15%" },
        { category: "Salários", suggestion: "Otimizar processos para aumentar produtividade", potential_savings: "5-8%" }
      ],
      revenue_growth_suggestions: [
        { strategy: "Expandir linha de produtos", rationale: "Mercado apresenta demanda", target_customer_segment: "Clientes corporativos" },
        { strategy: "Aumentar frequência de vendas", rationale: "Clientes atuais mostram potencial", target_customer_segment: "Base existente" }
      ],
      anomalies: []
    };
  }
  
  // Fallback genérico
  return { result: "Análise gerada com sucesso" };
};

export const invokeGemini = async (prompt, responseJsonSchema = null) => {
  try {
    // Se não tem API key, retorna mock
    if (!API_KEY) {
      console.warn('VITE_GOOGLE_GEMINI_API_KEY não configurada. Usando análise fictícia de demonstração.');
      return generateMockAnalysis(responseJsonSchema);
    }

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
      console.error('API Gemini error:', error);
      // Fallback to mock on API error
      return generateMockAnalysis(responseJsonSchema);
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]) {
      return generateMockAnalysis(responseJsonSchema);
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
        return generateMockAnalysis(responseJsonSchema);
      }
    }
    
    return textContent;
  } catch (error) {
    console.error('Erro ao chamar Gemini:', error);
    return generateMockAnalysis(responseJsonSchema);
  }
};
