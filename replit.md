# Base44 Dashboard - Documentação do Projeto

## 📋 Visão Geral

Sistema de dashboard financeiro completo com interface moderna, dark mode e componentes Shadcn UI.

**Status**: ✅ Reorganizado e Limpo  
**Data Última Atualização**: 19 de Dezembro de 2025

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

- ✅ Dashboard com KPI cards
- ✅ Indicadores de tendência
- ✅ Análise financeira
- ✅ Interface responsiva
- ✅ Dark mode completo
- ✅ Componentes Shadcn UI
- ✅ Múltiplas páginas (Dashboard, Customers, Suppliers, Transactions, etc)
- ✅ API client para integração

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

## 📝 Nota de Reorganização (19/Dez/2025)

### Limpeza Realizada
- ✅ Removidos configs duplicados (vite.config.js único)
- ✅ Removidos arquivos obsoletos (REFACTORING_PLAN, OPTIMIZATION_REPORT, etc)
- ✅ Estrutura padronizada em src/
- ✅ client/ contém apenas HTML e assets estáticos
- ✅ Aliases corrigidos (@, @assets, @shared)

### Arquivos Removidos
- ❌ vite.config.ts (duplicado)
- ❌ tailwind.config.ts (duplicado)
- ❌ jsconfig.json (duplicado)
- ❌ REFACTORING_PLAN.md
- ❌ OPTIMIZATION_REPORT.md
- ❌ OBSERVACOES_BUGS_E_FALHAS.md
- ❌ design_guidelines.md (da raiz)

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
