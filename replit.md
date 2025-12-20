# Base44 Dashboard - Documentação do Projeto

## 📋 Visão Geral

Sistema de dashboard financeiro completo com interface moderna, dark mode e componentes Shadcn UI. Integrado com API Base44 e IA Gemini para análises preditivas.

**Status**: ✅ Atualizado com Novos Commits  
**Data Última Atualização**: 20 de Dezembro de 2025
**Commits Recentes**: Padronização de cores azul e formatação brasileira

---

## 🏗️ Arquitetura

### Estrutura do Projeto
```
.
├── src/                          # Código principal (React + JavaScript)
│   ├── App.jsx                  # Componente raiz
│   ├── main.jsx                 # Entry point
│   ├── index.css                # Estilos globais
│   ├── api/                     # Clientes API
│   ├── components/              # Componentes React
│   │   ├── ui/                  # Componentes Shadcn
│   │   ├── dashboard/           # Dashboard components
│   │   ├── customers/           # Customer management
│   │   ├── pricing/             # Pricing analysis
│   │   ├── reports/             # Report components
│   │   ├── suppliers/           # Supplier management
│   │   └── transactions/        # Transaction management
│   ├── hooks/                   # Hooks customizados
│   ├── lib/                     # Utilidades
│   ├── pages/                   # Páginas
│   └── utils/                   # Funções utilitárias
│
├── client/                      # Cliente estático
│   ├── index.html               # HTML principal
│   └── public/                  # Assets estáticos
│
├── server/                      # Backend Express (opcional)
│   ├── index.ts
│   ├── routes.ts
│   ├── storage.ts
│   └── ...
│
├── shared/                      # Tipos compartilhados
│   └── schema.ts
│
├── attached_assets/             # Assets do usuário
│
└── [Configurações]
    ├── vite.config.js           # Configuração Vite
    ├── tailwind.config.js       # Configuração Tailwind
    ├── tsconfig.json            # Configuração TypeScript
    ├── package.json             # Dependências
    └── replit.md                # Este arquivo
```

---

## 🎯 Features Atuais

### Dashboard
- ✅ KPI cards com indicadores de tendência
- ✅ Gráfico de receita em tempo real
- ✅ Indicadores de desempenho financeiro
- ✅ Widgets de ações rápidas (FAB)
- ✅ Filtro de data customizável

### Gestão
- ✅ Gerenciamento de clientes com histórico de vendas
- ✅ Gerenciamento de fornecedores com histórico de compras
- ✅ Registro e rastreamento de transações

### Relatórios Avançados
- ✅ Análise DRE (Demonstração de Resultado)
- ✅ Análise de Fluxo de Caixa e Previsões
- ✅ Análise de Despesas e Crescimento de Receita
- ✅ Análise de Dívidas e Capital de Giro
- ✅ Simulador What-If e Resumo Executivo

### Interface & Experiência
- ✅ Dark mode completo com persistência
- ✅ Componentes Shadcn UI premium
- ✅ Ícones Lucide React
- ✅ Animações Framer Motion
- ✅ Gráficos Recharts interativos
- ✅ Layout responsivo
- ✅ Integração API Base44
- ✅ Análise preditiva com Gemini AI

### Localização & Formatação
- ✅ Moeda brasileira (R$) com formatação correta
- ✅ Fuso horário São Paulo integrado
- ✅ Remoção de símbolos desnecessários ($)
- ✅ Paleta de cores azul consistente

---

## 🚀 Como Rodar

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento (Vite)
npm run dev

# Build para produção
npm run build
```

Acesso: `http://localhost:5000`

---

## 📦 Dependências Principais

- **React 18** - Framework UI
- **TailwindCSS** - Styling
- **Shadcn/ui** - Componentes prontos
- **Lucide React** - Icons
- **Framer Motion** - Animações
- **Recharts** - Gráficos
- **Date-fns** - Manipulação de datas
- **Zod** - Validação

---

## 🔄 Estrutura de Componentes

### Hierarquia de Pastas
```
src/components/
├── ui/                          # Componentes base (Shadcn)
├── dashboard/                   # Dashboard específico
├── customers/                   # Gestão de clientes
├── pricing/                     # Análise de preços
├── reports/                     # Relatórios
├── suppliers/                   # Gestão de fornecedores
└── transactions/                # Gestão de transações
```

---

## 📝 Atualizações Recentes (20/Dez/2025)

### Alterações de UI/UX
- ✅ **Padronização de Cores**: Toda paleta atualizada para azul primário
- ✅ **Remoção de Ícones $**: Símbolos de dólar removidos de displays financeiros
- ✅ **Botões Padronizados**: Todos os botões com cor azul e texto branco
- ✅ **Valores Financeiros**: Formatados apenas como números em Real (R$)

### Formatação Brasileira
- ✅ `formatCurrency()` - Converte valores para R$ com separadores corretos
- ✅ `formatDate()` - Datas formatadas com fuso horário SP
- ✅ `getBrazilianTimezone()` - Timestamp com timezone São Paulo
- ✅ Arquivo: `src/utils/formatters.ts`

### Commits Principais
```
9a400fc - Remove dollar sign icons from financial value displays
5a1e258 - Update button color to match primary blue
19f9649 - Standardize button colors across application
da7ab65 - Add Brazilian currency and São Paulo time formatting
```

### Anterior (19/Dez/2025) - Limpeza Realizada
- ✅ Removidos configs duplicados (vite.config.js único)
- ✅ Removidos arquivos obsoletos
- ✅ Estrutura padronizada em src/
- ✅ Aliases corrigidos (@, @assets, @shared)

---

## ⚙️ Configurações Importantes

- **Alias @** → `src/` (imports de código)
- **Alias @assets** → `attached_assets/` (media)
- **Alias @shared** → `shared/` (tipos compartilhados)
- **Servidor**: Vite em PORT 5000
- **Dark Mode**: Suportado

---

## 🎨 Paleta de Cores

Gerenciada via Tailwind CSS com variáveis CSS customizadas em `src/index.css`

---

**Última atualização**: 19/Dez/2025  
**Sistema**: 🟢 Pronto para desenvolvimento
