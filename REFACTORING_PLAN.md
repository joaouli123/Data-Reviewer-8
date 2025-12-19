# Plano de Refatoração Arquitetural - HUA

## Situação Atual

### Estrutura de Diretórios Duplicada
```
./client/src/          ← TypeScript (Vite) - 54 arquivos
  ├── App.tsx
  ├── components/ui/  (shadcn components)
  ├── pages/
  ├── hooks/
  ├── lib/
  └── index.css (328 linhas - COMPLETO com cores HUA)

./src/                 ← JavaScript (Vite) - 100 arquivos [ATIVO]
  ├── App.jsx         (ESTÁ RODANDO)
  ├── main.jsx        (ESTÁ RODANDO)
  ├── components/
  ├── api/
  ├── pages/
  ├── hooks/
  └── index.css (85 linhas - INCOMPLETO)
```

### Status
- **App Rodando Em:** `./src/` ✅
- **Vite Config:** Apontado para `./src/` como root (client: path.resolve(..., "client"))
- **Shadcn Components:** Duplicados em ambos (accordion, alert, button, etc.)
- **CSS:** Dois arquivos diferentes (client/src tem 328 linhas, src tem 85)
- **Pages:** Dashboard está em ambos (client/src/pages/dashboard.tsx + src/pages/Dashboard.jsx)

## Análise de Dependências

### Arquivos ÚNICOS em ./src (não em client/src):
- `src/api/` - Base44Client, entities, gemini, integrations
- `src/components/dashboard/` - KPIWidget, RevenueChart, WidgetWrapper, etc.
- `src/components/reports/` - Análises complexas
- `src/components/suppliers/`, `src/components/customers/`, `src/components/transactions/`
- `src/pages/` - Dashboard, Reports, Customers, Suppliers, Transactions, etc.
- `src/components/pricing/` - PricingCalculator

### Arquivos em ./client/src que estão DUPLICADOS:
- `client/src/components/ui/*` ← Duplicado em `src/components/ui/*`
- `client/src/pages/dashboard.tsx` ← Versão incompleta
- `client/src/pages/not-found.tsx` ← Pode usar

## Plano de Ação (Por Turnos)

### TURNO 1 (ESTE) - ANÁLISE E DOCUMENTAÇÃO ✅
- [x] Mapear estrutura completa
- [x] Identificar duplicatas
- [x] Criar plano detalhado
- [ ] Validar imports

### TURNO 2 - VALIDAÇÃO E PREPARAÇÃO
- [ ] Verificar imports de `src/` - garantir que não usam `client/src`
- [ ] Confirmar que `src/App.jsx` e `src/main.jsx` são os únicos entry points
- [ ] Backup dos arquivos críticos
- [ ] Validar que todos os componentes em `src/components/ui/` funcionam

### TURNO 3 - PRIMEIRA LIMPEZA (SAFE)
- [ ] Copiar `client/src/index.css` → `src/index.css` (substituir completamente)
- [ ] Validar que cores HUA estão aplicadas
- [ ] Testar em modo escuro/claro

### TURNO 4 - SEGUNDA LIMPEZA (COMPONENTES UI)
- [ ] Comparar componentes UI (procurar diferenças)
- [ ] Manter versão do `src/` (está em uso)
- [ ] Remover `client/src/components/ui/` (backup primeiro)

### TURNO 5 - LIMPEZA FINAL
- [ ] Remover `client/src/pages/` (manter src/pages/)
- [ ] Remover `client/src/App.tsx`, `client/src/main.tsx`
- [ ] Remover `client/src/lib/`, `client/src/hooks/` (duplicados)

### TURNO 6 - REMOÇÃO DO DIRETÓRIO
- [ ] Deletar diretório `./client/src/` completamente
- [ ] Validar que app continua rodando normalmente
- [ ] Testar todas as páginas

## Critérios de Sucesso

✅ App roda normalmente  
✅ Cores HUA (azul #0066CC, dourado #FFB800) aparecem  
✅ Sem warnings de imports não encontrados  
✅ Todas as páginas funcionam  
✅ Modo escuro/claro funcionam  

## Pontos Críticos de Atenção

⚠️ **NÃO REMOVER ANTES DE VALIDAR:**
- `src/api/` - Lógica de negócio crítica
- `src/pages/` - Páginas ativas
- `src/components/dashboard/`, `reports/`, `transactions/`, etc.

⚠️ **SAFE TO REMOVE (após backup):**
- `client/src/` - Não está sendo usado
- Duplicatas de componentes UI

---

**Status:** 🟢 TURNO 1 CONCLUÍDO - Aguardando aprovação para TURNO 2
