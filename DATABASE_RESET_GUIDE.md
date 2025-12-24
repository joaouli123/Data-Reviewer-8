# 🔄 Guia de Reset do Banco de Dados

## ✅ STATUS ATUAL
- **Login**: ✅ FUNCIONANDO
- **Banco de Dados**: ✅ CORRIGIDO (Todas as 16 tabelas criadas)
- **Script de Reset**: ✅ ATUALIZADO

## 🚀 COMO RESETAR O BANCO DE DADOS

### Opção 1: Usar o Script (RECOMENDADO)
```bash
npx tsx server/reset-all-tables.ts
```

### Opção 2: Se configurar npm scripts (edite package.json)
```bash
npm run db:reset
```

## 🔐 CREDENCIAIS APÓS RESET

Quando você rodar o script de reset, as seguintes credenciais serão criadas:

```
Usuário:  admin
Senha:    senha123456
Email:    admin@example.com
Tipo:     Super Admin
```

## 📋 O QUE O SCRIPT FAZ

1. ✅ **Deleta TODOS os dados** em ordem reversa de dependências:
   - login_attempts
   - audit_logs
   - sessions
   - invitations
   - installments
   - purchase_installments
   - purchases
   - sales
   - transactions
   - cash_flow
   - categories
   - customers
   - suppliers
   - subscriptions
   - users
   - companies

2. ✅ **Cria a empresa padrão**:
   - Nome: "HUA Consultoria"
   - Document: "00.000.000/0000-00"

3. ✅ **Cria o Super Admin**:
   - Username: admin
   - Password: senha123456
   - Email: admin@example.com
   - Tipo: Super Admin

4. ✅ **Cria a sessão inicial**:
   - Token JWT
   - Expires em 7 dias

## 🧪 TESTE DE LOGIN

Após rodar o script, teste:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"senha123456"}'
```

Resposta esperada:
```json
{
  "user": {
    "id": "...",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "isSuperAdmin": true,
    "companyId": "...",
    "permissions": {}
  },
  "company": {
    "id": "...",
    "name": "HUA Consultoria"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 📊 TABELAS CRIADAS

| Tabela | Descrição |
|--------|-----------|
| companies | Empresas (Multi-tenant) |
| users | Usuários e Super Admin |
| subscriptions | Assinaturas/Planos |
| categories | Categorias de transações |
| customers | Clientes |
| suppliers | Fornecedores |
| transactions | Transações financeiras |
| cash_flow | Fluxo de caixa |
| sales | Vendas |
| purchases | Compras |
| installments | Parcelas de vendas |
| purchase_installments | Parcelas de compras |
| sessions | Sessões JWT |
| invitations | Convites de usuários |
| audit_logs | Logs de auditoria |
| login_attempts | Tentativas de login |

## ⚠️ CUIDADO

- ⚠️ Este script **DELETA TODOS OS DADOS**
- ⚠️ Não pode ser desfeito sem backup
- ✅ Use apenas em desenvolvimento!

## 🐛 SE HOUVER ERROS

Verifique:
1. ✅ Banco de dados está rodando
2. ✅ `DATABASE_URL` está configurada
3. ✅ Permissões de acesso ao banco

Para debug, rode:
```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
```

## 📚 ARQUIVOS RELACIONADOS

- `server/reset-all-tables.ts` - Script de reset completo (novo/atualizado)
- `server/reset-db.ts` - Script antigo (ainda funciona, mas use o novo)
- `shared/schema.ts` - Definição de todas as tabelas
- `migrations/0001_add_subscriptions_table.sql` - Migração SQL
- `/tmp/create_all_tables.sql` - Script SQL completo (backup)

---

**Atualizado em**: 24 de Dezembro de 2024
**Status**: ✅ Completo e Testado
