# HVAC RenewIQ — Architecture & Build Plan

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS + React Router + Recharts (dashboards)
- **Backend**: Node.js / Express with TypeScript
- **Database**: PostgreSQL (multi-tenant with company_id isolation)
- **Auth**: JWT + Passport (local + Google OAuth), 2FA via speakeasy
- **Email**: SendGrid API
- **Billing**: Stripe subscriptions
- **AI**: OpenAI API (GPT-4) for renewal probability, churn risk, opportunity scoring, email generation
- **Deployment**: Docker + Docker Compose

## Build Phases

### Phase 1: Core Backend (Week 1)
- Project scaffolding with Express + TypeScript
- PostgreSQL schema (migrations)
- Multi-tenant middleware (company_id scoping)
- Auth system (register, login, Google OAuth, password reset, 2FA, RBAC)
- Audit logging middleware

### Phase 2: Core Frontend (Week 2)
- React + Vite + Tailwind scaffold
- Auth pages (login, register, forgot password, 2FA)
- Layout with sidebar navigation
- Role-based routing
- Customer management pages
- Equipment management pages

### Phase 3: Agreements & Service (Week 3)
- Maintenance agreement CRUD + API
- Service call tracking
- Invoice management
- Dashboard API endpoints
- Executive dashboard UI

### Phase 4: AI Features (Week 4)
- Renewal probability engine (OpenAI)
- Churn risk detection
- Replacement opportunity scoring
- AI Email writer
- Insights dashboard

### Phase 5: Automation & Integrations (Week 5)
- Agreement expiration workflow
- SendGrid email campaigns
- Stripe billing integration
- Webhooks

### Phase 6: Admin Portal & Polish (Week 6)
- Super Admin portal
- Reporting suite
- Dark/light mode refinement
- SEO landing pages
- Docker + deployment config