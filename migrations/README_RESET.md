# 🔄 RESET COMPLETO DO BANCO DE DADOS

## ⚠️ ATENÇÃO
Este script **DELETA TODOS OS DADOS** e recria o banco do zero!

## 📋 O que o script faz:

1. **Remove todas as tabelas** existentes
2. **Recria todas as tabelas** com a estrutura correta
3. **Cria índices** para performance
4. **Insere um SuperAdmin** com credenciais fixas

## 🔐 Credenciais do SuperAdmin criado:

```
Username: superadmin
Password: superadmin
Email: admin@huacontrol.com
```

## 🚀 Como executar:

### Opção 1: Neon Database Console
1. Acesse: https://console.neon.tech
2. Abra seu projeto
3. Vá em **SQL Editor**
4. Copie todo o conteúdo de `RESET_DATABASE.sql`
5. Cole e execute

### Opção 2: Via psql (linha de comando)
```bash
psql "postgresql://user:password@host/database" -f migrations/RESET_DATABASE.sql
```

### Opção 3: Railway Dashboard
1. Acesse o dashboard do Railway
2. Clique no seu banco de dados PostgreSQL
3. Vá em **Data** → **Query**
4. Cole o SQL e execute

### Opção 4: Usar conexão direta
```bash
psql $DATABASE_URL -f migrations/RESET_DATABASE.sql
```

## ✅ Verificação

Após executar, você deve ver:
```
status: Database reset completed successfully!
info: Superadmin created: username=superadmin, password=superadmin
```

## 🔑 Primeiro Login

1. Acesse seu sistema
2. Login com:
   - **Username:** `superadmin`
   - **Password:** `superadmin`
3. ✅ Você terá acesso total ao sistema!

## 📝 O que mudou das versões anteriores:

- ✅ `companies.paymentStatus` default = **'pending'** (não mais 'approved')
- ✅ `companies.subscriptionStatus` default = **'pending'** (não mais 'active')
- ✅ `companies.subscriptionPlan` default = **'basic'** (não mais 'pro')
- ✅ Usuários **NÃO conseguem logar** sem pagamento aprovado
- ✅ SuperAdmin pode logar sem empresa

## 🛠️ Estrutura das tabelas:

1. **companies** - Empresas cadastradas
2. **subscriptions** - Planos e pagamentos
3. **users** - Usuários do sistema
4. **sessions** - Sessões ativas
5. **customers** - Clientes
6. **suppliers** - Fornecedores
7. **categories** - Categorias de transações
8. **transactions** - Movimentações financeiras
9. **invitations** - Convites para novos usuários
10. **password_resets** - Tokens de reset de senha
11. **audit_logs** - Logs de auditoria
12. **rate_limit** - Controle de rate limiting

## 🔄 Se precisar resetar novamente:

Basta executar o script `RESET_DATABASE.sql` novamente. Ele sempre cria tudo do zero.

## ⚡ Após o reset:

- SuperAdmin pode criar novas empresas
- Empresas começam com status **pending**
- Usuários precisam pagar para ter acesso
- Todas as permissões funcionam corretamente
