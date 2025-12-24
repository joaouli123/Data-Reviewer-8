# Super Admin Dashboard - Multi-Tenant SaaS

## Project Status: ✅ COMPLETE

### Overview
Desenvolvido um Super Admin Dashboard completo para gerenciamento global de empresas, clientes, usuários e assinaturas em um sistema SaaS multi-tenant com autenticação segura.

### Recent Changes (Session 4 - Página de Assinaturas)
- ✅ Página de Assinaturas (`/admin/subscriptions`) com tabela completa
- ✅ Colunas da tabela: Data Compra | Comprador | Forma Pagamento | Próximo Vencimento | Status | Ações
- ✅ Suporte a "Vitalício" para assinaturas sem data de expiração
- ✅ Status: Ativo | Cancelado | Não Pagou
- ✅ Botões de ação: Ver (modal com edição) | Bloquear
- ✅ Modal de edição com campos editáveis: Comprador, Plano, Forma Pagamento, Valor, Status
- ✅ Busca por empresa, comprador ou forma de pagamento
- ✅ Export Excel com dados de assinatura

### Architecture
```
src/
  pages/
    admin/
      super-dashboard.jsx    # KPI, tabela de empresas, impersonar, bloquear, deletar
      customers.jsx         # Lista global, busca, export, editar, deletar
      users.jsx            # Lista global, busca, export, editar, redefinir senha
  components/
    Layout.jsx             # Sidebar customizado (super admin vs regular users)
    
server/
  routes.ts               # Endpoints admin (GET/PATCH/DELETE customers, users)
  auth.ts                 # hashPassword, generateToken
  db.ts                   # Drizzle + Neon setup
  
shared/
  schema.ts               # customers, users, companies tables
```

### Super Admin Features
1. **Dashboard** `/`
   - KPI cards: Total empresas, Assinaturas ativas, Receita mensal, Alertas
   - Tabela com filtro por status e busca
   - Ações: Impersonate (JWT), Bloquear, Deletar, Ver Detalhes

2. **Clientes Globais** `/admin/customers`
   - Lista de clientes de TODAS as empresas
   - Busca por nome/email/empresa
   - Export CSV com: Data Criação (UTC-8), Nome, Empresa, Email, Telefone, CPF/CNPJ, Status
   - Editar: Nome, Email, Telefone, CPF/CNPJ
   - Deletar cliente

3. **Usuários Globais** `/admin/users`
   - Lista de usuários de TODAS as empresas
   - Busca por nome/usuário/email/empresa
   - Export CSV com: Data Criação (UTC-8), Nome, Usuário, Empresa, Email, Telefone, Função, Status
   - Editar: Nome, Email, Telefone, Função
   - Bloquear/Ativar usuário
   - Redefinir Senha
   - Deletar usuário

### Backend Endpoints (Super Admin Only)
```
GET /api/admin/stats              - Dashboard stats
GET /api/admin/companies          - List all companies
POST /api/admin/companies         - Create company + admin user
PATCH /api/admin/companies/:id/status - Block/unblock
POST /api/admin/companies/:id/impersonate - JWT impersonation
DELETE /api/admin/companies/:id   - Delete company

GET /api/admin/customers          - All customers + companyName
PATCH /api/admin/customers/:id    - Update customer
DELETE /api/admin/customers/:id   - Delete customer

GET /api/admin/users              - All users + companyName
PATCH /api/admin/users/:id        - Update user info
POST /api/admin/users/:id/reset-password - Reset password
DELETE /api/admin/users/:id       - Delete user
```

### Navigation Structure
**Super Admin (isSuperAdmin = true)**
- Dashboard (/) 
- Assinaturas (/admin/subscriptions)
- Usuários (/admin/users)
- [Divider]
- Meu Perfil (/profile)
- Logout

**Regular Users**
- Visão Geral (/)
- Transações
- Clientes
- Fornecedores
- Categorias
- Fluxo de Caixa
- IA Analista
- Calc. Preços
- Gestão de Usuários (admin only)
- [Divider]
- Meu Perfil (/profile)
- Logout

### Design Standards
- Tema: Logo HUA, background #040303, botão ativo #E7AA1C
- Formato moeda: R$ (Reais brasileiros)
- Timezone: UTC-8 (America/Sao_Paulo) para exports
- Componentes: Shadcn UI (Card, Badge, Button, Table, Dialog, etc)
- Forms: React Hook Form + Zod validation

### Database
- PostgreSQL com Neon (serverless)
- Drizzle ORM com migrations
- Relationships: companies → users, customers, etc
- Cascade delete em foreign keys

### Test Credentials
- Super Admin: `superadmin` / `senha123456`
- Admin: `admin` / `senha123456`
- Operacional: `operacional` / `senha123456`

### Completed Tasks
✅ Integração do Layout.jsx existente com sidebar customizado
✅ Menu dinâmico (super admin vs regular users)
✅ Endpoints /api/admin/customers e /api/admin/users
✅ Pages admin/customers.jsx e admin/users.jsx
✅ Export Excel com UTC-8 e todos os campos solicitados
✅ Modais de edição com save
✅ Botões de ação: ativar, bloquear, excluir, redefinir senha
✅ Ver informações completas em modal
✅ Alteração de infos no modal (edição)
✅ Perfil e Logout na list de sidebar (último item)
✅ Impersonação de empresas (JWT temporário)
✅ Audit logging para ações críticas
✅ Todos os endpoints protegidos com requireSuperAdmin middleware

### Arquivos Modificados (Session 4)
- ✅ `src/pages/admin/subscriptions.jsx` - Refatorada tabela de assinaturas
- ✅ `src/components/admin/SubscriptionEditModal.jsx` - Melhorado labels de status

### Campos da Tabela de Assinaturas
| Campo | Descrição |
|-------|-----------|
| Data Compra | Quando foi criada a assinatura (formatada) |
| Nome do Comprador | Nome da pessoa que comprou (subscriberName) |
| Forma de Pagamento | PIX, Card (Crédito/Débito), Boleto, TED |
| Próximo Vencimento | Data de renovação ou "Vitalício" se sem expiração |
| Status | Ativo / Cancelado / Não Pagou |
| Ações | Ver (editar) / Bloquear |

### Next Steps (if needed)
- Adicionar paginação para listas grandes
- Implementar soft delete para clientes/usuários (com restore)
- Dashboard com gráficos (Recharts)
- Notifications/webhooks para eventos críticos
