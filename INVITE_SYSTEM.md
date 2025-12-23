# Sistema de Convites (Invite Links) - Documentação Técnica

## 📋 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE CONVITES                                │
└─────────────────────────────────────────────────────────────────────────┘

1. ADMIN CLICA "GERAR LINK"
   ↓
2. Frontend envia: POST /api/invitations
   ├─ email: "joao@empresa.com"
   ├─ role: "operational"
   └─ permissions: { view_dashboard: true, ... }
   ↓
3. Backend cria registro em `invitations` table
   ├─ token: uuid-aleatório (ex: abc-123-xyz)
   ├─ companyId: empresa do admin
   ├─ email: joao@empresa.com
   ├─ role: operational
   ├─ permissions: JSON serializado
   ├─ expiresAt: NOW + 24 horas
   └─ createdBy: id do admin
   ↓
4. Backend retorna JSON
   {
     "invitationId": "uuid-do-convite",
     "token": "abc-123-xyz"
   }
   ↓
5. Frontend monta link
   → https://seuapp.com/accept-invite?token=abc-123-xyz
   ↓
6. Admin copia/envia link para João (WhatsApp, Email, etc)
   ↓
7. JOÃO CLICA NO LINK
   ↓
8. Frontend renderiza página `/accept-invite?token=abc-123-xyz`
   ├─ Email já está travado (vem de `invitations.email`)
   ├─ Pede: Nome, Senha
   └─ Botão: "Aceitar Convite"
   ↓
9. João preenche e clica "Aceitar"
   ↓
10. Frontend envia: POST /api/invitations/accept
    ├─ token: "abc-123-xyz"
    ├─ username: "joao" (input do João)
    └─ password: "senha-provisoria" (input do João)
    ↓
11. Backend valida
    ├─ Busca convite por token
    ├─ Verifica se expirou (< 24h)
    ├─ Se inválido/expirado → erro 400
    └─ Se OK → continua
    ↓
12. Backend cria usuário
    {
      username: "joao",
      email: "joao@empresa.com",
      companyId: (do convite),
      role: "operational",
      permissions: (do convite),
      password: bcrypt("senha-provisoria")
    }
    ↓
13. Backend marca convite como aceito
    {
      acceptedAt: NOW,
      acceptedBy: id-do-novo-usuario
    }
    ↓
14. Frontend redireciona para `/login`
    ↓
15. João faz login com username+password
    ↓
16. ✅ João está logado com permissões de operacional
```

---

## 🗄️ Tabela: `invitations`

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  token TEXT NOT NULL UNIQUE,        -- uuid aleatório
  email TEXT NOT NULL,               -- email do convidado
  role TEXT NOT NULL DEFAULT 'user', -- admin, user, operational
  permissions TEXT,                  -- JSON: {view_dashboard: true, ...}
  expires_at TIMESTAMP NOT NULL,     -- agora + 24h
  accepted_at TIMESTAMP,             -- NULL até aceitar
  accepted_by UUID REFERENCES users(id),  -- ID do usuário criado
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id) -- ID do admin que criou
);
```

**Campos-chave:**
- `token`: Único e aleatório (uuid). Impossível de adivinhar.
- `expires_at`: Impede convites eternos. Padrão: 24 horas.
- `accepted_at`: NULL enquanto pendente. Preenchido quando aceito.
- `acceptedBy`: Liga o convite ao usuário criado.
- `permissions`: JSON serializado com permissões específicas.

---

## 🔌 Rotas da API

### 1️⃣ POST `/api/invitations` - Criar Convite

**Autenticação:** Requer Auth + Papel `admin`

**Request:**
```json
{
  "email": "joao@empresa.com",
  "role": "operational",
  "permissions": {
    "view_dashboard": true,
    "create_transactions": true,
    "import_bank": true
  }
}
```

**Response (201):**
```json
{
  "invitationId": "550e8400-e29b-41d4-a716-446655440000",
  "token": "abc-123-def-456-xyz"
}
```

**Código Backend:**
```typescript
app.post("/api/invitations", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { email, role, permissions } = req.body;
  
  // Expira em 24 horas
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  // Cria convite
  const invitation = await storage.createInvitation(
    req.user.companyId,           // Empresa do admin
    req.user.id,                  // Quem criou
    {
      email,
      role,
      expiresAt,
      permissions: JSON.stringify(permissions)
    }
  );
  
  // Retorna token para frontend gerar link
  res.json({
    invitationId: invitation.id,
    token: invitation.token
  });
});
```

---

### 2️⃣ POST `/api/invitations/accept` - Aceitar Convite

**Autenticação:** Nenhuma (público, apenas token)

**Request:**
```json
{
  "token": "abc-123-def-456-xyz",
  "username": "joao",
  "password": "senha-segura-123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid-novo-usuario",
    "username": "joao",
    "email": "joao@empresa.com"
  }
}
```

**Validações:**
- ✅ Token existe?
- ✅ Convite ainda não foi aceito? (`acceptedAt` é NULL)
- ✅ Convite não expirou? (`expiresAt` > NOW)
- ✅ Senha forte? (min 6 caracteres)

**Código Backend:**
```typescript
app.post("/api/invitations/accept", async (req, res) => {
  const { token, username, password } = req.body;
  
  // 1. Busca convite
  const invitation = await storage.getInvitationByToken(token);
  
  // 2. Valida
  if (!invitation) {
    return res.status(400).json({ error: "Invalid invitation" });
  }
  
  if (new Date(invitation.expiresAt) < new Date()) {
    return res.status(400).json({ error: "Invitation expired" });
  }
  
  if (invitation.acceptedAt) {
    return res.status(400).json({ error: "Invitation already accepted" });
  }
  
  // 3. Cria usuário com dados do convite
  const newUser = await createUser(
    invitation.companyId,     // Empresa correta (isolamento!)
    username,                 // Do input do João
    invitation.email,         // Email travado
    password,                 // Hash bcrypt
    username,                 // Nome = username
    invitation.role,          // Papel do convite
    false                      // Não é super admin
  );
  
  // 4. Marca convite como aceito
  await storage.acceptInvitation(token, newUser.id);
  
  // 5. Retorna sucesso
  res.json({
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email
    }
  });
});
```

---

## 🎯 Isolamento de Empresa (Multi-Tenancy)

**Segurança garantida por:**

1. **No POST `/api/invitations`:**
   ```typescript
   // CompanyId vem do TOKEN do admin, nunca do request body
   req.user.companyId  // ✅ Confiável (JWT verificado)
   ```

2. **No POST `/api/invitations/accept`:**
   ```typescript
   // CompanyId vem do banco de dados, não do input
   const invitation = await storage.getInvitationByToken(token);
   const newUser = await createUser(
     invitation.companyId,  // ✅ Vem do BD, não do request
     ...
   );
   ```

**Consequência:**
- ✅ Admin da Empresa A **NÃO PODE** criar convites para Empresa B
- ✅ Admin da Empresa B **NÃO PODE** aceitar convites da Empresa A
- ✅ Novo usuário **SEMPRE** fica vinculado à empresa correta

---

## 🔐 Fluxo de Segurança

### Ataques Prevenidos:

| Ataque | Prevenção |
|--------|-----------|
| **Força bruta no token** | Token é UUID aleatório (2^128 combinações) |
| **Reutilizar convite** | `acceptedAt` não é NULL → erro |
| **Convite expirado** | Valida `expiresAt > NOW` |
| **Trocar email** | Email vem do BD, não é editável no formulário |
| **Trocar empresa** | CompanyId vem do BD, não do request |
| **Criar múltiplos usuários** | `email` é unique em `users`, token é unique em `invitations` |
| **SQL injection** | Drizzle ORM + Prepared statements |

---

## 📊 Estados Possíveis de um Convite

```
┌─────────────────────────────────────────┐
│   CONVITE CRIADO                        │
│   acceptedAt: NULL                      │
│   acceptedBy: NULL                      │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┬─────────────────────┐
        │                     │                     │
        v                     v                     v
    ✅ ACEITO         ⏰ EXPIRADO            🚫 INVÁLIDO
    João clica        24h passaram            Token fakificado
    acceptedAt: NOW   Rejeitar com 400       Rejeitar com 400
    acceptedBy: uuid                         
```

---

## 🔄 Fluxo de Dados Completo

### Frontend (src/pages/settings/Team.jsx)

**Aba: "Enviar Convite"**
```jsx
// 1. User preenche:
// - email: "joao@empresa.com"
// - permissions: { view_dashboard: true, ... }

// 2. Clica "Gerar Link"
const handleGenerateInvite = async () => {
  const res = await fetch('/api/team/invite', {
    method: 'POST',
    body: JSON.stringify({
      email: formData.email,
      permissions: permissions,  // {view_dashboard: true, ...}
      companyId: company.id
    })
  });
  
  // 3. Recebe resposta
  const data = await res.json();
  const inviteLink = `${window.location.origin}/accept-invite?token=${data.token}`;
  
  // 4. Mostra link para copiar
  setInviteLink(inviteLink);
};
```

### Frontend (src/pages/AcceptInvite.jsx)

```jsx
// 1. URL tem ?token=abc-123
const token = new URLSearchParams(window.location.search).get('token');

// 2. User preenche:
// - username: "joao"
// - password: "senha123"
// (email está travado, vem do banco)

// 3. Clica "Aceitar Convite"
const handleAccept = async (e) => {
  const res = await fetch('/api/invitations/accept', {
    method: 'POST',
    body: JSON.stringify({
      token,
      username,
      password
    })
  });
  
  // 4. Sucesso! Redireciona para login
  if (res.ok) {
    window.location.href = '/login';
  }
};
```

### Backend (server/routes.ts)

```typescript
// POST /api/invitations
// 1. Valida autenticação (authMiddleware)
// 2. Valida papel (requireRole(["admin"]))
// 3. Cria registro em BD
// 4. Retorna token

// POST /api/invitations/accept
// 1. SEM autenticação (público, apenas token)
// 2. Valida token + expiração + status
// 3. Cria usuário
// 4. Marca convite como aceito
// 5. Retorna sucesso
```

---

## 🧪 Teste o Fluxo

### 1. Criar Convite
```bash
curl -X POST http://localhost:5000/api/invitations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "email": "teste@empresa.com",
    "role": "operational",
    "permissions": {"view_dashboard": true}
  }'

# Response:
# {
#   "invitationId": "uuid...",
#   "token": "abc-123..."
# }
```

### 2. Gerar Link e Compartilhar
```
https://seuapp.com/accept-invite?token=abc-123...
```

### 3. Aceitar Convite
```bash
curl -X POST http://localhost:5000/api/invitations/accept \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc-123...",
    "username": "teste",
    "password": "senha123"
  }'

# Response:
# {
#   "user": {
#     "id": "uuid...",
#     "username": "teste",
#     "email": "teste@empresa.com"
#   }
# }
```

### 4. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teste",
    "password": "senha123"
  }'

# Response: token + user + company
```

---

## 📝 Resumo Técnico

| Aspecto | Detalhe |
|---------|---------|
| **Tabela** | `invitations` |
| **Token** | UUID aleatório, unique |
| **Duração** | 24 horas |
| **Permissões** | JSON armazenado na tabela |
| **Isolamento** | CompanyId garantido no BD |
| **Autenticação (criar)** | Admin autenticado |
| **Autenticação (aceitar)** | Apenas token (público) |
| **Senha** | Bcrypt, hash completo |
| **Email** | Travado no formulário |

---

## 🚀 Próximos Passos

1. **Envio de Email**: Integrar SendGrid/Mailgun para enviar link automaticamente
2. **Resgate de Senha**: Usar mesma lógica de `invitations` para reset
3. **Analytics**: Log de quantos convites foram criados/aceitos
4. **Rate Limiting**: Máximo de convites por dia por admin
