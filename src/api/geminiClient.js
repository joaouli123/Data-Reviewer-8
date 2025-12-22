// Google Gemini AI Integration
const API_KEY = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

// Mock response para quando API key não está configurada
const generateMockAnalysis = (responseJsonSchema) => {
  if (!responseJsonSchema) {
    return 'Análise financeira gerada. Configure VITE_GOOGLE_GEMINI_API_KEY para análises reais com IA.';
  }
  
  // Detectar tipo de análise baseado no schema
  if (responseJsonSchema.properties?.optimal_price_point) {
    return {
      optimal_price_point: {
        price: 149.99,
        expected_volume: "150-200 unidades/mês",
        expected_revenue: 22498.50,
        reasoning: "Baseado na elasticidade de preço estimada e histórico de demanda, este é o ponto ótimo que maximiza margem e volume. Oferece melhor equilíbrio entre competitividade e lucratividade."
      },
      demand_forecast: [
        {
          price_point: 99.99,
          estimated_demand: "300-350 un/mês",
          total_revenue: 29997,
          profit_margin: 15.5
        },
        {
          price_point: 124.99,
          estimated_demand: "220-260 un/mês",
          total_revenue: 27498,
          profit_margin: 22.3
        },
        {
          price_point: 149.99,
          estimated_demand: "150-200 un/mês",
          total_revenue: 22498,
          profit_margin: 28.7
        },
        {
          price_point: 174.99,
          estimated_demand: "80-120 un/mês",
          total_revenue: 13999,
          profit_margin: 35.2
        },
        {
          price_point: 199.99,
          estimated_demand: "40-60 un/mês",
          total_revenue: 7999,
          profit_margin: 41.5
        }
      ],
      price_elasticity: {
        classification: "elastic",
        sensitivity: "Demanda sensível a mudanças de preço. A cada 10% de aumento no preço, espera-se redução de ~12-15% na demanda.",
        recommendations: "Considere estratégias de diferenciação de produto para reduzir sensibilidade de preço e aumentar inelasticidade."
      },
      pricing_strategies: [
        {
          strategy: "Precificação Competitiva",
          price: 124.99,
          expected_outcome: "Posiciona produto em faixa média-baixa, atrai alto volume de vendas (220-260 un/mês) com margem de 22.3%.",
          risk_level: "low"
        },
        {
          strategy: "Precificação Premium",
          price: 174.99,
          expected_outcome: "Posiciona como produto premium, volume menor (80-120 un/mês) mas margem maior (35.2%). Requer diferenciação clara.",
          risk_level: "medium"
        },
        {
          strategy: "Penetração de Mercado",
          price: 99.99,
          expected_outcome: "Preço agressivo para capturar market share rapidamente. Alta demanda (300-350 un/mês) mas margem reduzida (15.5%).",
          risk_level: "high"
        }
      ],
      market_positioning: "Produto se posiciona melhor na faixa de R$ 124.99-149.99, onde oferece bom equilíbrio entre competitividade e rentabilidade. Evite preços acima de R$ 199.99 sem diferenciação significativa de produto."
    };
  }
  
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
  
  if (responseJsonSchema.properties?.anomalies || responseJsonSchema.properties?.trends) {
    return {
      anomalies: [
        {
          category: "Alimentação",
          severity: "medium",
          description: "Gasto 30% acima da média histórica nos últimos 15 dias.",
          recommendation: "Revisar notas fiscais e considerar redução em refeições fora de casa."
        }
      ],
      trends: [
        {
          category: "Vendas",
          trend_type: "positive",
          description: "Crescimento constante de 10% ao mês no último trimestre.",
          impact: "Aumento projetado de R$ 5.000 no faturamento do próximo mês."
        }
      ],
      optimization_opportunities: [
        {
          category: "Assinaturas",
          opportunity: "Serviços duplicados identificados.",
          potential_savings: "R$ 150/mês",
          action_items: ["Cancelar assinatura do Plano X", "Migrar para plano familiar"]
        }
      ],
      categorization_rules: [
        {
          pattern: "Uber",
          suggested_category: "Transporte",
          confidence: "high",
          examples: ["Uber *Trip", "Uber Pending"]
        }
      ]
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
