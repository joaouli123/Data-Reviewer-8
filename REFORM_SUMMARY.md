# Resumo da Reforma do Sistema

## 1. Modularização de Rotas
- O arquivo `server/routes.ts` foi dividido em módulos:
  - `auth.ts`, `customers.ts`, `transactions.ts`, `suppliers.ts`, `categories.ts`, `sales-purchases.ts`, `ai.ts`
- Ponto de entrada centralizado em `server/routes/index.ts`.

## 2. Migração de IA para Backend
- Lógica de integração com Groq (Llama 3.1 8B) movida para `server/api/ai.ts`.
- Novo endpoint seguro: `POST /api/ai/analyze`.
- O cliente frontend (`src/api/openaiClient.js`) agora atua como um proxy para o backend.
- **Ação Necessária:** O usuário deve configurar a chave `GROQ_API_KEY` nos Secrets do Replit.

## 3. Limpeza e Padronização
- Removidos arquivos mortos (`base44Client.js`, `geminiClient.js`).
- Padronizado o uso de notificações com `sonner` em todas as páginas admin.
- Removidos arquivos redundantes de toast.

## 4. Performance e Monitoramento
- Implementado `logger` condicional (`src/lib/logger.js`).
- Otimizado `staleTime` global para queries do TanStack Query (5 minutos).
