# Base44 Dashboard - Documentação do Projeto

## 📋 Visão Geral

Sistema de dashboard financeiro completo com interface moderna, dark mode e componentes Shadcn UI. Integrado com API Base44 e IA Gemini para análises preditivas.

**Status**: ✅ Atualizado com Melhorias UX/UI  
**Data Última Atualização**: 22 de Dezembro de 2025
**Commits Recentes**: Refactor de abas por compra e edição de pagamentos

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
- ✅ Botão "Nova Transação" com modal integrado

### Gestão de Transações
- ✅ Registro e rastreamento de transações com categorias
- ✅ Categorização com tipos (Entrada/Saída)
- ✅ Valores automáticos (negativo para despesa, positivo para receita)
- ✅ Criação de categorias dentro do formulário
- ✅ Edição e deleção de transações
- ✅ Filtro por categoria, tipo e período
- ✅ Paginação e busca avançada
- ✅ Modal de importação de extrato bancário

### Gestão de Categorias
- ✅ Página dedicada para gerenciar categorias
- ✅ Configuração de tipo (Entrada/Saída) com badges coloridas
- ✅ Criar, editar e deletar categorias
- ✅ Validação de nome e tipo

### Gestão de Clientes e Fornecedores
- ✅ Gerenciamento de clientes com histórico de vendas
- ✅ Gerenciamento de fornecedores com histórico de compras

### Gestão de Pagamentos de Fornecedores
- ✅ **Nova UX**: Cada compra em sua própria aba
- ✅ **Parcelas Organizadas**: Instalações em ordem crescente (1 → N) dentro de cada aba
- ✅ Edição de valor pago com suporte a juros/taxas
- ✅ Cancelamento de pagamentos confirmados
- ✅ Exibição de "Pago" e "Juros" em cada parcela

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

## 📝 Atualizações Recentes

### 🎯 Sistema de Pagamentos de Fornecedores - MELHORIAS UX/UI
**Data**: 22 de Dezembro de 2025

#### Melhorias Implementadas
1. **Nova Interface de Abas por Compra**
   - ✅ Cada compra agrupada é uma aba separada
   - ✅ Nome descritivo + quantidade de parcelas na aba
   - ✅ Navegação intuitiva entre compras
   - ✅ Aba "Todas Parcelas" para visão consolidada

2. **Organização de Parcelas em Ordem Crescente**
   - ✅ Parcelas exibidas de 1 até a última (1, 2, 3, ..., N)
   - ✅ Ordem respeitada mesmo após edição de pagamentos
   - ✅ Identificadores visuais com números de parcela

3. **Funcionalidades de Pagamento**
   - ✅ Modal `PaymentEditDialog` para editar valor pago
   - ✅ Suporte a juros e taxas adicionais
   - ✅ Exibição de "Pago: R$X" e "Juros: R$Y" após confirmação
   - ✅ Botão X para cancelar pagamento confirmado
   - ✅ Feedback visual com badges de status

#### Arquivos Modificados
- **Modificado**: `src/components/suppliers/SupplierPurchasesDialog.jsx` (refactor de abas)
- **Criado**: `src/components/suppliers/PaymentEditDialog.jsx` (modal de edição)
- **Modificado**: `shared/schema.ts` (adicionados campos paidAmount e interest)
- **Modificado**: `server/routes.ts` (PATCH endpoint com suporte a juros)

#### Commits Associados
```
08336670 - Organize purchases into individual tabs with sequential installments
9e56c6f - Add fields for paid amount and interest to transactions
```

#### Fluxo de Uso
1. Abra um fornecedor → Clique "Ver Compras"
2. Cada aba representa uma compra com suas parcelas
3. Dentro de cada aba, parcelas estão em ordem crescente (1 → N)
4. Clique "Confirmar Pagamento" em uma parcela
5. No modal, defina valor pago e juros
6. Confirme ou cancele com o botão X ao lado de "Pago"

---

### Anterior (20/Dez/2025) - Sistema de Categorias e Transações

Consulte histórico anterior para detalhes do sistema de categorização e transações.

---

## ⚙️ Configurações Importantes

- **Alias @** → `src/` (imports de código)
- **Alias @assets** → `attached_assets/` (media)
- **Alias @shared** → `shared/` (tipos compartilhados)
- **Servidor**: Vite em PORT 5000
- **Dark Mode**: Suportado
- **Database**: Postgres com Drizzle ORM

---

## 🎨 Paleta de Cores

Gerenciada via Tailwind CSS com variáveis CSS customizadas em `src/index.css`. Temas light/dark automáticos.

---

**Última atualização**: 22/Dez/2025 (14h45)  
**Sistema**: 🟢 Pronto para desenvolvimento  
**Status UX/UI**: ✅ Melhorias de Abas Implementadas  
**Status Pagamentos**: ✅ Edição, Juros e Cancelamento Funcionais
