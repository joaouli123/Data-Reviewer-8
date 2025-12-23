# Multi-Tenant SaaS Financial Dashboard with JWT Authentication

## 🎯 Project Overview

Complete multi-tenant financial management system with:
- **Authentication**: JWT-based (7-day expiry) + bcrypt password hashing
- **Authorization**: RBAC with 3 roles (admin, manager, user)
- **Multi-Tenancy**: Strict company-based data isolation via company_id
- **Full-Stack**: Express backend + React frontend + PostgreSQL database
- **Data Modules**: Transactions, Customers, Suppliers, Categories, Cash Flow, Reports, Pricing

## 🏗️ Architecture & Implementation

### Database Schema (Multi-Tenant with Complete Isolation)

**Core Auth Tables:**
- `companies` - Company accounts (id, name, document)
- `users` - Team members per company (id, username, email, password_hash, role, companyId FK)
- `sessions` - JWT session tracking (id, userId FK, companyId FK, token, expiresAt)

**Financial Data Tables (ALL include company_id for isolation):**
- `transactions` - Income/expense records (id, company_id FK, type, amount, date, category)
- `customers` - Client records (id, company_id FK, name, email, phone, document)
- `suppliers` - Vendor records (id, company_id FK, name, email, phone, document)
- `categories` - Transaction categories (id, company_id FK, name, type)
- `cash_flows` - Monthly cash flow forecasts (id, company_id FK, month, inflow, outflow)
- `installments` - Payment plans (id, company_id FK, amount, dueDate, status)
- `purchase_installments` - Supplier payment plans (id, company_id FK, amount, dueDate, status)

### Backend Architecture (`/server`)

**Authentication & Security (`server/auth.ts`):**
- `hashPassword()` - Bcrypt hashing (10 rounds)
- `verifyPassword()` - Compare password with hash
- `generateToken()` - Create JWT tokens (payload: userId, companyId, role; expiry: 7d)
- `verifyToken()` - Validate and decode JWT
- `createUser()`, `createCompany()`, `createSession()` - User/company creation
- `findUserByUsername()`, `findUserById()`, `findCompanyById()` - Database queries

**Middleware & Authorization (`server/middleware.ts`):**
- `authMiddleware()` - Verify Bearer token or cookie
- `requireRole()` - Check user role (admin/manager/user)
- `extractToken()` - Extract from Authorization header or cookies
- `ensureCompanyAccess()` - Validate company_id matches user's company

**Data Persistence (`server/storage.ts`):**
- Full CRUD operations for all entities
- **CRITICAL**: ALL queries filtered by company_id (company-based data isolation enforced)
- Support for Drizzle ORM with automatic company_id filtering
- Methods: `get*()`, `create*()`, `update*()`, `delete*()` per entity

**API Routes (`server/routes.ts`):**
- **Public Routes** (no auth required):
  - `POST /api/health` - Server health check
  - `POST /api/auth/signup` - Register new company + admin user
  - `POST /api/auth/login` - Authenticate user, return JWT token

- **Protected Routes** (require Bearer token):
  - `GET /api/auth/me` - Current user + company info
  - `POST /api/auth/logout` - Logout (invalidate session)
  - `GET|POST|PATCH|DELETE /api/customers` - Customer management
  - `GET|POST|PATCH|DELETE /api/suppliers` - Supplier management
  - `GET|POST|PATCH|DELETE /api/categories` - Category management
  - `GET|POST|PATCH|DELETE /api/transactions` - Transaction management
  - `GET|POST|PATCH|DELETE /api/cash-flows` - Cash flow forecasts
  - `GET|POST|PATCH|DELETE /api/installments` - Payment plan management
  - `GET|POST|PATCH|DELETE /api/purchase-installments` - Supplier payment plans

### Frontend Architecture (`/src`)

**Authentication System:**
- `src/contexts/AuthContext.jsx` - Global auth state (user, company, token, loading)
  - `useAuth()` hook for accessing auth state
  - `signup()` - Register new company + admin
  - `login()` - Authenticate with credentials
  - `logout()` - Clear auth state + localStorage
  - Token stored in localStorage + injected in API requests

**Auth Pages:**
- `src/pages/Login.jsx` - Login form (company ID, username, password)
- `src/pages/Signup.jsx` - Registration (company name, admin details)

**Main Application:**
- `src/pages/index.jsx` - Protected pages router (wouter)
- `src/pages/Layout.jsx` - Main layout with sidebar + logout
  - Displays current user + company info
  - Navigation menu to all dashboards
  - Mobile-responsive with Sheet menu

**Financial Pages** (protected, company-scoped):
- `src/pages/Dashboard.jsx` - Overview with key metrics + charts
- `src/pages/Transactions.jsx` - Income/expense management
- `src/pages/Customers.jsx` - Client database + management
- `src/pages/Suppliers.jsx` - Vendor database + management
- `src/pages/Categories.jsx` - Transaction category setup
- `src/pages/CashFlowForecast.jsx` - Monthly cash flow projections
- `src/pages/Reports.jsx` - Analytics + AI insights (if enabled)
- `src/pages/PricingCalculator.jsx` - Pricing/margin tools

**UI Components:**
- Uses shadcn/ui + Tailwind CSS
- Lucide icons for visual indicators
- Sonner toasts for notifications
- React Hook Form for form validation
- TanStack Query (React Query) for data fetching + caching

**Routing:**
- Frontend: wouter (lightweight alternative to react-router)
- Unauthenticated users → Login/Signup pages
- Authenticated users → Dashboard + all protected pages

### Development Tools

**Database:**
- Drizzle ORM for type-safe SQL
- PostgreSQL with Neon driver
- `drizzle-kit push` for schema migrations

**Frontend Build:**
- Vite for fast development + production builds
- React 18+ with JSX
- Hot Module Replacement (HMR) enabled

**API Communication:**
- fetch API with Bearer token authentication
- TanStack Query for caching + state management
- Request validation with Zod schemas

## 🔐 Security Features

✅ **Authentication:**
- JWT tokens with 7-day expiry
- Bcrypt password hashing (10 rounds)
- Token stored securely in localStorage

✅ **Authorization:**
- Role-Based Access Control (RBAC)
- 3 user roles: admin, manager, user
- Middleware enforces role requirements

✅ **Multi-Tenancy:**
- Strict company-based data isolation
- ALL queries filtered by company_id at storage layer
- User can only access their company's data
- Cross-company access is impossible (enforced in middleware)

✅ **API Security:**
- All protected routes require Bearer token
- Token extracted from Authorization header or cookies
- Invalid/expired tokens return 401 Unauthorized
- Role mismatches return 403 Forbidden

## 🚀 How to Use

### Starting the Application

```bash
npm run dev
# Or: npx tsx server/index.ts
```

Server runs on `http://localhost:5000`

### Sign Up (Register New Company)

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Corp",
    "companyDocument": "12.345.678/0001-90",
    "username": "admin",
    "email": "admin@acme.com",
    "password": "password123",
    "name": "Admin User"
  }'
```

Response includes:
- `user` - Admin user details (id, username, role)
- `company` - Company details (id, name)
- `token` - JWT bearer token for API requests

### Log In (Authenticate User)

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123",
    "companyId": "company-id-here"
  }'
```

### API Requests (with Authentication)

All protected endpoints require Bearer token:

```bash
curl -X GET http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Token is automatically included in all frontend requests via AuthContext.

### Testing in Browser

1. Visit `http://localhost:5000`
2. Sign up with company details
3. Login with created credentials
4. Access dashboard and all financial modules
5. All data is automatically filtered by your company

## 📊 Data Flow

1. **User Signs Up** → Creates company + admin user in database
2. **JWT Token Generated** → Valid for 7 days
3. **Token Stored** → localStorage (frontend) + sessions table (backend)
4. **API Requests** → Attach token in Authorization header
5. **Middleware Validates** → Extracts userId + companyId from token
6. **Storage Queries** → Automatically filtered by company_id
7. **Response** → Only user's company data returned

## 🗄️ Database Tables & Isolation

Every data table includes `company_id` to ensure:
- **Company A** cannot see Company B's customers, transactions, etc.
- Queries are filtered at the storage layer (not just UI)
- Even admin users can only access their company's data
- Multi-tenant isolation is enforced in code, not just config

Example isolation in storage:
```typescript
// Returns only THIS company's transactions
const transactions = await storage.getTransactions(req.user.companyId);
```

## 🔧 Configuration

**Environment Variables:**
- `JWT_SECRET` - Secret key for signing tokens (change in production!)
- `DATABASE_URL` - PostgreSQL connection string

**Token Settings:**
- Expiry: 7 days
- Algorithm: HS256
- Payload: userId, companyId, role

## 📦 Dependencies

**Backend:**
- Express.js - HTTP server
- Drizzle ORM - Database layer
- jsonwebtoken - JWT handling
- bcryptjs - Password hashing
- Zod - Schema validation

**Frontend:**
- React 18+ - UI framework
- Wouter - Lightweight router
- TanStack Query - Data fetching
- React Hook Form - Form management
- shadcn/ui - Component library
- Tailwind CSS - Styling

## ✅ Testing Checklist

- [x] Signup creates company + admin user
- [x] Login returns valid JWT token
- [x] Protected routes reject unauthorized requests
- [x] Protected routes accept valid tokens
- [x] Data isolation works (company_id filtering)
- [x] Frontend shows user + company info after login
- [x] Logout clears auth state
- [x] All financial pages accessible when authenticated

## 🚀 Deployment

1. Build: `npm run build`
2. Deploy to production environment
3. Set `JWT_SECRET` environment variable (production-grade secret)
4. Database migrations run automatically on deployment
5. Application ready to accept multi-tenant signups

## 📝 Latest Updates

**Session 23/Dec/2025 - Complete Multi-Tenant Architecture:**
- ✅ JWT authentication backend fully implemented
- ✅ RBAC middleware with 3 roles (admin, manager, user)
- ✅ Multi-tenant storage layer with company_id isolation
- ✅ Frontend auth context + login/signup pages
- ✅ Layout integrated with auth system
- ✅ Database schema updated with companies/users/sessions tables
- ✅ Drizzle migration executed (tables created)
- ✅ All API routes protected and company-scoped
- ✅ Bearer token authentication on all endpoints

**Removed:**
- ✅ `/api/admin/init-db` endpoint (not needed with proper migrations)
- ✅ Manual database initialization scripts (Drizzle handles it)

## 🎯 Next Steps for Production

1. Change `JWT_SECRET` from dev value to secure production value
2. Set `DATABASE_URL` to production database
3. Enable HTTPS for production deployment
4. Add rate limiting for auth endpoints
5. Implement token refresh mechanism (optional)
6. Add user management UI (create/edit/delete team members)
7. Add audit logging for security events

---

**System Status: ✅ FULLY OPERATIONAL**
- Backend: Running with multi-tenant auth
- Frontend: Authenticated access to all financial modules
- Database: Multi-tenant schema with company isolation
- Ready for production deployment
