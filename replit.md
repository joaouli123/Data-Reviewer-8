# Multi-Tenant SaaS Financial Dashboard with Super Admin & Enterprise Security

## Overview
This project is an enterprise-grade multi-tenant financial management system designed with Super Admin capabilities, subscription management, and advanced security features. It provides a complete financial dashboard for companies, ensuring strict data isolation between tenants.

**Key Capabilities:**
- **Super Admin Role**: Global management of companies and subscriptions.
- **Robust Security**: JWT-based authentication, RBAC with 5 roles (admin, manager, user, operational, super_admin), bcrypt-12 password hashing, 3-tier security middleware, rate limiting, and comprehensive audit logging.
- **Multi-Tenancy**: Enforced data isolation using `company_id` on all database queries.
- **Full-Stack**: Utilizes Express.js for the backend, React for the frontend, PostgreSQL for the database, and Drizzle ORM for data interaction.
- **Financial Modules**: Includes modules for Transactions, Customers, Suppliers, Categories, Cash Flow, Reports, and Pricing.
- **User Management**: Complete admin/user management system with role-based permissions, invite links, and user profiles with avatar upload.

## Recent Updates (Latest Session)
- ✅ Added `avatar` and `phone` columns to users table schema
- ✅ Created User Profile page (`src/pages/Profile.jsx`) with:
  - Avatar upload with image validation
  - Editable name and phone fields
  - Read-only email, role, and company information
- ✅ Implemented admin bypass logic in `ProtectedRoute` component - admins can access everything
- ✅ Added PATCH `/api/auth/profile` endpoint for profile updates
- ✅ Added "Meu Perfil" (My Profile) link in sidebar navigation
- ✅ User Management page already existed with invite system (`src/pages/settings/Team.jsx`)
- ✅ Accept Invite page with token validation and user registration (`src/pages/AcceptInvite.jsx`)

## User Preferences
- **Coding Style**: The agent should adhere to modern best practices in React and Node.js development.
- **Workflow**: I prefer an iterative development approach.
- **Communication**: Please provide clear, concise explanations and ask for confirmation before implementing major changes.
- **Code Changes**: Do not make changes to the `replit.nix` file. Do not alter the core authentication or multi-tenancy logic without explicit approval.
- **Language**: Development in Portuguese (Brazilian Portuguese preference in UI)

## System Architecture

### UI/UX Decisions
- Uses `shadcn/ui` and Tailwind CSS for a modern, responsive design.
- Lucide icons are used for visual indicators.
- Dynamic navigation menus adapt based on the user's role.
- Super Admin users have a dedicated dashboard, while regular users access financial management pages.
- Unauthenticated users are redirected to a login page.
- Profile page accessible from sidebar for all authenticated users.

### Technical Implementations
- **Backend (Express.js)**:
    - **Security Middleware**: A 3-layer system: `authMiddleware` (JWT verification), `subscriptionMiddleware` (subscription status check, bypassed for Super Admin), and `authorizationMiddleware` (role-based permission check, bypassed for Super Admin).
    - **Authentication**: JWT tokens (7-day expiry) with `isSuperAdmin` flag, bcrypt-12 for password hashing, and token signature verification.
    - **Rate Limiting**: Tracks login attempts by IP, blocking after 5 attempts/minute for 15 minutes.
    - **Audit Logging**: Logs all critical actions (login, logout, data changes) with user ID, company ID, action, IP, and User-Agent.
    - **Data Persistence**: Drizzle ORM for type-safe SQL, enforcing `company_id` filtering on all CRUD operations for multi-tenancy.
    - **API Routes**: Public routes for signup/login and protected routes for financial data management. Super Admin-specific routes for company and subscription management. Profile update endpoint for user-managed profile fields.
- **Frontend (React)**:
    - **Authentication System**: `AuthContext` for global auth state, `useAuth()` hook, handles signup, login, logout, and token management (localStorage).
    - **Pages**: Dedicated pages for Login, Signup, Dashboard, Transactions, Customers, Suppliers, Categories, Cash Flow Forecast, Reports, Pricing Calculator, User Profile, and a Super Admin panel.
    - **Routing**: `wouter` for client-side routing, dynamically directing users based on their `isSuperAdmin` status. Admin bypass in ProtectedRoute allows admins to access all permission-gated routes.
    - **Forms & Data**: React Hook Form for validation, TanStack Query for data fetching and caching.

### Feature Specifications
- **Multi-Tenancy**: Strict data isolation for `companies`, `users`, `sessions`, `subscriptions`, `audit_logs`, `login_attempts`, `transactions`, `customers`, `suppliers`, `categories`, `cash_flows`, `installments`, and `purchase_installments` tables, all featuring a `company_id` foreign key.
- **User Roles**: Supports 5 distinct roles: `admin`, `manager`, `user`, `operational`, and `super_admin`.
- **Super Admin Functionality**: Allows listing all companies, viewing their subscription statuses, and toggling (blocking/activating) company subscriptions.
- **Admin Bypass**: Admins can access all pages and features regardless of specific permission settings.
- **User Management**: 
  - Team members management with role assignment
  - Granular permission control for non-admin users
  - Invite system with shareable links and email notifications
  - Direct user creation with password setup
- **User Profiles**:
  - Edit name, phone, and avatar
  - View account information (email, role, company)
  - Avatar upload with validation
  - Profile accessible from sidebar navigation

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM for type safety and schema management.
- **Development**: Vite for frontend builds, React 18+ with JSX, and Hot Module Replacement (HMR).
- **API Communication**: `fetch` API, TanStack Query for state management, Zod for request validation.

## Project Structure
```
.
├── server/
│   ├── routes.ts           # All API endpoints (auth, users, transactions, etc.)
│   ├── auth.ts             # Authentication utilities (JWT, password hashing)
│   ├── middleware.ts       # Security middleware (auth, role-based, subscriptions)
│   ├── storage.ts          # Data access layer interface and implementation
│   └── index.ts            # Express app setup
├── shared/
│   └── schema.ts           # Drizzle schema definitions and Zod validation
├── client/src/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Transactions.jsx
│   │   ├── Customers.jsx
│   │   ├── Suppliers.jsx
│   │   ├── Reports.jsx
│   │   ├── Categories.jsx
│   │   ├── CashFlowForecast.jsx
│   │   ├── PricingCalculator.jsx
│   │   ├── UserManagement.jsx
│   │   ├── UserPermissions.jsx
│   │   ├── Profile.jsx         # ✨ NEW: User profile page
│   │   ├── AcceptInvite.jsx
│   │   ├── SuperAdmin.jsx
│   │   ├── AccessDenied.jsx
│   │   ├── index.jsx           # Route configuration
│   │   └── settings/
│   │       └── Team.jsx        # User management and invite system
│   ├── components/
│   │   ├── Layout.jsx          # Main layout with sidebar navigation
│   │   └── ui/                 # shadcn/ui components
│   ├── contexts/
│   │   └── AuthContext.jsx     # Global auth state
│   ├── hooks/
│   │   └── usePermission.js    # Permission checking hook
│   └── App.jsx
```

## External Dependencies

- **Backend**:
    - **Express.js**: Web application framework.
    - **Drizzle ORM**: TypeScript ORM for PostgreSQL.
    - **jsonwebtoken**: For generating and verifying JWTs.
    - **bcryptjs**: For password hashing.
    - **Zod**: For schema validation.
    - **Neon driver**: PostgreSQL database driver.

- **Frontend**:
    - **React 18+**: UI library.
    - **Wouter**: Lightweight router.
    - **TanStack Query**: Data fetching and caching library.
    - **React Hook Form**: Form management library.
    - **shadcn/ui**: Component library.
    - **Tailwind CSS**: Utility-first CSS framework.
    - **Lucide icons**: Icon library.
    - **Sonner**: Toast notifications.

## Implementation Notes
- Admin bypass is implemented at the route protection level in `ProtectedRoute` component
- User profiles are editable (name, phone, avatar) while account info (email, role, company) is read-only
- Avatar upload uses FormData API with validation for file type and size (max 5MB)
- The existing Team Management page (`Team.jsx`) provides the complete invite and permission system
- All user data updates respect multi-tenancy constraints via `company_id` filtering
