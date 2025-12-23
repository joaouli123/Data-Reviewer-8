# Multi-Tenant SaaS Financial Dashboard with Super Admin & Enterprise Security

## Overview
This project is an enterprise-grade multi-tenant financial management system designed with Super Admin capabilities, subscription management, and advanced security features. It provides a complete financial dashboard for companies, ensuring strict data isolation between tenants.

**Key Capabilities:**
- **Super Admin Role**: Global management of companies and subscriptions.
- **Robust Security**: JWT-based authentication, RBAC with 5 roles (admin, manager, user, operational, super_admin), bcrypt-12 password hashing, 3-tier security middleware, rate limiting, and comprehensive audit logging.
- **Multi-Tenancy**: Enforced data isolation using `company_id` on all database queries.
- **Full-Stack**: Utilizes Express.js for the backend, React for the frontend, PostgreSQL for the database, and Drizzle ORM for data interaction.
- **Financial Modules**: Includes modules for Transactions, Customers, Suppliers, Categories, Cash Flow, Reports, and Pricing.

## User Preferences
- **Coding Style**: The agent should adhere to modern best practices in React and Node.js development.
- **Workflow**: I prefer an iterative development approach.
- **Communication**: Please provide clear, concise explanations and ask for confirmation before implementing major changes.
- **Code Changes**: Do not make changes to the `replit.nix` file. Do not alter the core authentication or multi-tenancy logic without explicit approval.

## System Architecture

### UI/UX Decisions
- Uses `shadcn/ui` and Tailwind CSS for a modern, responsive design.
- Lucide icons are used for visual indicators.
- Dynamic navigation menus adapt based on the user's role.
- Super Admin users have a dedicated dashboard, while regular users access financial management pages.
- Unauthenticated users are redirected to a login page.

### Technical Implementations
- **Backend (Express.js)**:
    - **Security Middleware**: A 3-layer system: `authMiddleware` (JWT verification), `subscriptionMiddleware` (subscription status check, bypassed for Super Admin), and `authorizationMiddleware` (role-based permission check, bypassed for Super Admin).
    - **Authentication**: JWT tokens (7-day expiry) with `isSuperAdmin` flag, bcrypt-12 for password hashing, and token signature verification.
    - **Rate Limiting**: Tracks login attempts by IP, blocking after 5 attempts/minute for 15 minutes.
    - **Audit Logging**: Logs all critical actions (login, logout, data changes) with user ID, company ID, action, IP, and User-Agent.
    - **Data Persistence**: Drizzle ORM for type-safe SQL, enforcing `company_id` filtering on all CRUD operations for multi-tenancy.
    - **API Routes**: Public routes for signup/login and protected routes for financial data management. Super Admin-specific routes for company and subscription management.
- **Frontend (React)**:
    - **Authentication System**: `AuthContext` for global auth state, `useAuth()` hook, handles signup, login, logout, and token management (localStorage).
    - **Pages**: Dedicated pages for Login, Signup, Dashboard, Transactions, Customers, Suppliers, Categories, Cash Flow Forecast, Reports, Pricing Calculator, and a Super Admin panel.
    - **Routing**: `wouter` for client-side routing, dynamically directing users based on their `isSuperAdmin` status.
    - **Forms & Data**: React Hook Form for validation, TanStack Query for data fetching and caching.

### Feature Specifications
- **Multi-Tenancy**: Strict data isolation for `companies`, `users`, `sessions`, `subscriptions`, `audit_logs`, `login_attempts`, `transactions`, `customers`, `suppliers`, `categories`, `cash_flows`, `installments`, and `purchase_installments` tables, all featuring a `company_id` foreign key.
- **User Roles**: Supports 5 distinct roles: `admin`, `manager`, `user`, `operational`, and `super_admin`.
- **Super Admin Functionality**: Allows listing all companies, viewing their subscription statuses, and toggling (blocking/activating) company subscriptions.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM for type safety and schema management.
- **Development**: Vite for frontend builds, React 18+ with JSX, and Hot Module Replacement (HMR).
- **API Communication**: `fetch` API, TanStack Query for state management, Zod for request validation.

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