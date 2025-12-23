# Multi-Tenant SaaS Financial Dashboard

## Project Overview
Transform single-tenant financial dashboard into complete multi-tenant SaaS with:
- JWT authentication with bcrypt password hashing
- Role-Based Access Control (RBAC): admin, manager, user roles
- Complete data isolation by company_id
- 7-day token expiry

## Architecture

### Database Schema (Multi-Tenant)
- **companies**: Company accounts (name, document/tax ID)
- **users**: Users per company (username, email, role, companyId FK)
- **sessions**: JWT sessions tracking (userId FK, companyId FK, token, expiresAt)
- **ALL data tables**: Include company_id to enforce strict data isolation

### Backend Structure
- `server/auth.ts`: JWT generation, password hashing, user/company creation
- `server/middleware.ts`: Authentication, RBAC, token extraction (Bearer + cookies)
- `server/storage.ts`: All CRUD operations filtered by company_id
- `server/routes.ts`: Protected API endpoints with auth middleware

### Frontend Structure
- `src/contexts/AuthContext.jsx`: Auth state management, signup/login/logout
- `src/pages/Login.jsx`: Login form with company ID, username, password
- `src/pages/Signup.jsx`: Company + admin user registration
- `src/pages/Layout.jsx`: Integrated with auth, shows user/company info, logout button

## Authentication Flow
1. User signs up → Creates company + admin user + issues JWT token
2. User logs in → Validates credentials → Issues new JWT token
3. All API requests → Bearer token required
4. Protected endpoints → Verify token + ensure user's company_id matches request company_id

## Security Features
- ✓ Bcrypt password hashing (10 rounds)
- ✓ JWT tokens with 7-day expiry
- ✓ Company data isolation enforced at storage layer
- ✓ RBAC middleware for role-based access
- ✓ Token extraction from Authorization header + cookies

## Recent Changes (Latest Session)
- [COMPLETED] Multi-tenant database schema with companies/users/sessions tables
- [COMPLETED] JWT authentication backend with bcrypt
- [COMPLETED] RBAC middleware implementation
- [COMPLETED] Storage layer rewritten with company_id filtering
- [COMPLETED] All API routes protected with auth middleware
- [COMPLETED] Frontend auth system (context, login/signup pages)
- [COMPLETED] Layout updated for wouter routing with auth integration
- [COMPLETED] Database migration executed (drizzle-kit push)

## Testing Results
✅ Signup: Creates company + admin user + JWT token
✅ Login: Authenticates with credentials + returns token
✅ Protected endpoints: Reject unauthorized, accept valid tokens
✅ Data isolation: Returns company-filtered results

## Next Steps (For User)
1. Test login flow in browser
2. Create additional users with different roles (manager, user)
3. Implement role-based features per user type
4. Deploy to production with proper JWT_SECRET in env vars
