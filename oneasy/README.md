# OnEasy - Offer & Appointment Letter Generator

A full-stack web application that generates professionally structured, legally compliant Offer Letters and Appointment Letters as DOCX files. Features a multi-step form wizard, auto-calculated Indian payroll salary breakdowns, Supabase authentication with Row Level Security, cloud document storage, audit logging, and a responsive modern UI.

---

## Table of Contents

- [Features](#features)
- [Generated Document Structure](#generated-document-structure)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Deployment (Vercel)](#deployment-vercel)
- [API Reference](#api-reference)
- [Authentication Flow](#authentication-flow)
- [Security Measures](#security-measures)
- [Frontend Details](#frontend-details)
- [Backend Details](#backend-details)
- [Document Generation Engine](#document-generation-engine)
- [Salary Breakdown Logic](#salary-breakdown-logic)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Scripts Reference](#scripts-reference)
- [Document Specifications](#document-specifications)

---

## Features

- **Multi-Step Form Wizard** - Guided 6-step process: Company > Employee > Compensation > Employment Terms > Policies > Review & Generate
- **Auto-Calculated Salary Breakdown** - Enter Annual CTC and get a complete Indian payroll structure (Basic, HRA, Conveyance, Medical, PF, LTA, etc.) auto-generated as Annexure A
- **Instant DOCX Download** - A4-formatted Word document matching professional corporate template standards
- **Cloud Document Storage** - Generated documents are automatically uploaded to Supabase Storage for later download
- **Supabase Authentication** - Email/password login and signup with JWT-based session management
- **Row Level Security (RLS)** - All database operations are scoped per user; users can only access their own data
- **Company Profiles** - Save and reuse company details across multiple offer letters
- **Auto-Save Drafts** - Form state persists to localStorage and auto-syncs to the database as you type (debounced)
- **Offer History Management** - View, edit, duplicate, re-generate, download, and delete previously created offer letters
- **Sidebar Navigation** - Quick access to recent drafts with inline rename, delete, and generate actions
- **Print/PDF Export** - Browser-based print preview for saving as PDF
- **Hash-Based Routing** - Browser back/forward navigation between form steps and pages
- **Audit Logging** - All document generation and auth events are logged to an audit trail
- **Structured Logging** - JSON-formatted logs in production, readable format in development, with request correlation IDs
- **Input Validation** - Zod-based server-side validation with cross-field date checks; client-side validation with inline error messages
- **Rate Limiting** - 100 requests/15min general, 10 document generations/hour per IP
- **Security Headers** - Helmet.js with CSP, HSTS, Permissions-Policy, and HTTPS enforcement
- **CORS Protection** - Origin whitelist for production and development environments
- **Mobile Responsive** - Hamburger menu and responsive layout for mobile devices
- **Accessibility** - ARIA labels, skip-to-content link, focus management, keyboard-navigable modal with focus trap
- **Toast Notifications** - Auto-dismissing success/error notifications with manual close
- **XSS Prevention** - HTML escaping for all user-generated content rendered via innerHTML
- **Graceful Shutdown** - Server handles SIGTERM/SIGINT for clean process termination

---

## Generated Document Structure

The application generates a single DOCX file containing four sections:

| Section | Contents |
|---------|----------|
| **Offer Letter** | 8 clauses: Offer of Employment, Compensation, Date of Joining, Working Hours, Validity of Offer, Conditions Precedent, Documents Required at Joining, Acceptance. Includes candidate acceptance signature block. |
| **Appointment Letter** | 11 clauses with sub-clauses: Commencement, Designation & Duties, Probation Period, Compensation & Benefits, Working Hours & Attendance, Leave Entitlement, Notice Period & Termination (8 sub-clauses), Confidentiality & Non-Disclosure, Intellectual Property, Code of Conduct, General Provisions. Includes employee acceptance signature block. |
| **Annexure A** | Compensation Structure - Auto-calculated salary breakdown table with 10 components (Basic Pay, HRA, Conveyance, Medical, Children Education, Children Hostel, Special Allowance, LTA, Differential Allowance, Employer PF) plus total row. Shows monthly and annual figures. |
| **Annexure B** | Code of Conduct, Policies & Procedures - 16 sections covering: Attendance, Leave Policy, Dress Code, Equal Employment, Professional Conduct, Gifts & Conflicts, Asset Management, Electronic Resources, Confidentiality & Non-Compete, IP Rights, Workplace Conduct, Harassment Policy, Disciplinary Action, Safety & Health, Open Door Policy, Amendments. Includes acknowledgement signature block. |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vanilla HTML, CSS, JavaScript (ES Modules) | UI, form wizard, auth overlay, history page |
| Backend | Node.js (>=18), Express 4 | REST API, static file serving, document generation |
| Database | Supabase (PostgreSQL) | Data persistence with RLS policies |
| Auth | Supabase Auth | Email/password authentication, JWT tokens |
| Storage | Supabase Storage | Cloud storage for generated DOCX files |
| Document | docx.js (v8.5) | Server-side Word document generation |
| Validation | Zod (v4) | Server-side schema validation |
| Security | Helmet, express-rate-limit, CORS | HTTP security headers, rate limiting, CORS |
| Fonts | Inter + Outfit (Google Fonts) | UI typography |
| Testing | Jest 30, Supertest 7 | Unit and integration tests |
| Dev Tools | Nodemon | Auto-restart on file changes |
| Deployment | Vercel | Serverless hosting (Node.js + Static) |

---

## Project Structure

```
oneasy/
├── backend/
│   ├── server.js                      # Express server: middleware stack, routes, error handling
│   ├── validation.js                  # Zod schema for /generate payload validation
│   ├── .env.example                   # Template for environment variables
│   ├── config/
│   │   ├── cors.js                    # CORS origin whitelist configuration
│   │   └── rateLimit.js               # Rate limiter configs (general + generate)
│   ├── middleware/
│   │   └── auth.js                    # JWT verification middleware via Supabase
│   ├── utils/
│   │   ├── supabase.js                # Supabase client initialization (anon + admin)
│   │   ├── audit.js                   # Audit logging to audit_logs table
│   │   └── logger.js                  # Structured logger with correlation IDs
│   ├── docGenerator/
│   │   ├── index.js                   # Main entry: buildContext() + generateDoc()
│   │   ├── constants.js               # Page dimensions, colors, numbering, salary percentages
│   │   ├── helpers.js                 # Paragraph/TextRun/border builder functions
│   │   ├── numberUtils.js             # formatINR, toWords, buildBreakdown, formatDate, formatTime
│   │   ├── tables.js                  # Signature table and salary breakdown table builders
│   │   ├── headerFooter.js            # Document header (org name + CIN) and footer (page numbers)
│   │   └── sections/
│   │       ├── offerLetter.js         # Offer Letter section (8 clauses)
│   │       ├── appointmentLetter.js   # Appointment Letter section (11 clauses with sub-clauses)
│   │       ├── annexureA.js           # Annexure A: Compensation Structure table
│   │       └── annexureB.js           # Annexure B: Code of Conduct (16 sections)
│   └── __tests__/
│       ├── audit.test.js              # Audit logging tests
│       ├── auth.test.js               # Auth middleware tests
│       ├── constants.test.js          # Constants validation tests
│       ├── cors.test.js               # CORS configuration tests
│       ├── generateDoc.integration.test.js  # Document generation integration tests
│       ├── helpers.test.js            # Helper function tests
│       ├── logger.test.js             # Logger tests
│       ├── numberUtils.test.js        # Number utility tests (formatINR, toWords, etc.)
│       ├── server.integration.test.js # Server route integration tests
│       └── validation.test.js         # Zod validation schema tests
├── frontend/
│   ├── index.html                     # Main HTML: auth overlay, app shell, form wizard, history, modal
│   ├── favicon.svg                    # SVG favicon
│   ├── robots.txt                     # Search engine directives
│   ├── css/
│   │   ├── variables.css              # CSS custom properties (colors, spacing, typography, shadows)
│   │   ├── layout.css                 # App shell layout (sidebar, content area, responsive grid)
│   │   ├── components.css             # Component styles (form, cards, buttons, modal, toast, auth)
│   │   └── main.css                   # CSS import aggregator
│   └── js/
│       ├── main.js                    # App entry point: auth init, navigation, CRUD, generation, modals
│       ├── auth.js                    # Supabase auth (login, signup, logout, session check, token)
│       ├── config.js                  # API URL + Supabase URL & anon key
│       ├── salary.js                  # CTC-to-salary breakdown calculator + UI update
│       └── utils.js                   # Utility functions (toWords, fmtINR, fmtDate, fmtTime, escapeHTML, showAlert)
├── database/
│   ├── supabase_setup.sql             # Full database schema: tables, RLS, triggers, cleanup function
│   └── company_profiles.sql           # Standalone company_profiles table migration
├── vercel.json                        # Vercel deployment configuration
├── .vercelignore                      # Files excluded from Vercel deployment
├── .gitignore                         # Git ignore rules
├── jest.config.js                     # Jest test configuration
├── test-gen.js                        # Standalone document generation test script
├── package.json                       # Dependencies, scripts, engines
└── README.md                          # This file
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENT                            │
│  ┌─────────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │  Auth Flow   │  │  Form    │  │  History/Sidebar   │  │
│  │  (auth.js)   │  │  Wizard  │  │  (CRUD via         │  │
│  │             │  │ (main.js) │  │   Supabase RLS)    │  │
│  └──────┬──────┘  └────┬─────┘  └─────────┬──────────┘  │
│         │              │                   │             │
│         ▼              ▼                   ▼             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           Supabase JS Client (anon key)             │ │
│  │  Auth: login/signup/logout   |  DB: offers CRUD     │ │
│  │  Storage: download docs      |  DB: company profiles │ │
│  └────────────────────┬────────────────────────────────┘ │
└───────────────────────┼──────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌────────────┐ ┌──────────────┐
│  Supabase    │ │  Supabase  │ │  Supabase    │
│  Auth        │ │  Database  │ │  Storage     │
│  (JWT)       │ │  (Postgres │ │  (offer-docs │
│              │ │   + RLS)   │ │   bucket)    │
└──────────────┘ └────────────┘ └──────────────┘
                        ▲               ▲
                        │               │
┌───────────────────────┼───────────────┼──────────────────┐
│                    BACKEND (Express)                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Middleware Stack:                                  │  │
│  │  Request Logger → Helmet → CORS → Rate Limiter →   │  │
│  │  JSON Parser → Static Files                        │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  POST /generate                                    │  │
│  │  verifyAuth → validatePayload → generateDoc →      │  │
│  │  upload to Storage → send DOCX → logAudit          │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Supabase Admin Client (service role key)          │  │
│  │  - JWT verification via auth.getUser()             │  │
│  │  - Audit log inserts (bypasses RLS)                │  │
│  │  - Storage uploads                                 │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- CRUD operations (create, read, update, delete offers) are handled **directly by the frontend** Supabase client, which respects RLS. This eliminates the risk of bypassing RLS via the service-role admin client.
- The backend only handles document **generation** (which requires server-side docx.js) and **storage uploads** (which use the admin client to write to the `offer-docs` bucket).
- The admin client on the backend is used only for: JWT verification, audit log inserts, and storage operations.

---

## Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** (comes with Node.js)
- **Supabase** project (free tier is sufficient)

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/Mani5266/final-offer-letter-generator.git
cd final-offer-letter-generator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your Supabase credentials (see [Environment Variables](#environment-variables)).

### 4. Set up the database

Run the SQL scripts in your Supabase SQL Editor (see [Database Setup](#database-setup)).

### 5. Start the server

```bash
npm start
```

Open **http://localhost:3002** in your browser.

---

## Environment Variables

Create `backend/.env` from the example file. All variables are **required** unless noted.

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key (safe for client-side, respects RLS) | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only, bypasses RLS) | `eyJhbGci...` |
| `PORT` | Server port (optional, defaults to `3002`) | `3002` |
| `NODE_ENV` | Environment mode (optional). Set to `production` for Vercel deployment | `production` |

The application will **crash immediately** on startup if any required Supabase variable is missing, with a clear error message indicating which variables are absent.

> **Note:** The frontend `config.js` contains the Supabase URL and anon key directly. These are safe to expose publicly as they only allow operations that pass RLS policies. The service role key is never exposed to the client.

---

## Database Setup

Run the contents of `database/supabase_setup.sql` in your **Supabase SQL Editor**. This creates:

### Tables

| Table | Description |
|-------|-------------|
| `offers` | Stores offer letter data (employee name, designation, CTC, full form payload as JSONB, document URL) |
| `profiles` | Extended user profiles (full name, avatar, role) |
| `audit_logs` | Audit trail for document generation and auth events |
| `company_profiles` | Reusable company detail profiles per user |

### Row Level Security (RLS)

All tables have RLS enabled. Each table has policies ensuring:
- Users can only SELECT, INSERT, UPDATE, DELETE their own records
- `audit_logs` SELECT is restricted to admin-role users
- `audit_logs` INSERT by users is scoped to their own `user_id`
- The service role client bypasses RLS for server-side audit logging

### Triggers

- `update_updated_at_column()` - Automatically updates the `updated_at` timestamp on row modifications for `offers` and `company_profiles` tables

### Functions

- `cleanup_old_offers(retention_days)` - Deletes offers older than the specified number of days (default 30) and logs the cleanup action. Can be scheduled via `pg_cron` for automatic data retention.

### Storage Bucket

After running the SQL, create a storage bucket manually:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-docs', 'offer-docs', false);
```

Then add storage RLS policies:

```sql
CREATE POLICY "Users can upload their own docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'offer-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'offer-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'offer-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
```

Files are stored under the path: `{user_id}/{offer_id}/{filename}.docx`

---

## Running the Application

### Production mode

```bash
npm start
```

### Development mode (auto-restart on file changes)

```bash
npm run dev
```

The server starts at `http://localhost:3002` by default.

---

## Deployment (Vercel)

The application is configured for Vercel deployment via `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    { "src": "backend/server.js", "use": "@vercel/node" },
    { "src": "frontend/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/generate", "dest": "backend/server.js" },
    { "src": "/api/(.*)", "dest": "backend/server.js" },
    { "src": "/(.*)", "dest": "frontend/$1" }
  ]
}
```

**Routing:**
- `POST /generate` and `/api/*` routes are handled by the Express backend (serverless function)
- All other routes serve static files from the `frontend/` directory

**Production behavior:**
- `trust proxy` is enabled for accurate IP-based rate limiting behind Vercel's proxy
- HTTP requests are redirected to HTTPS via `x-forwarded-proto` header check
- Static assets are cached for 1 day; HTML files use `no-cache`
- The Express app is exported as a module (`module.exports = app`) instead of calling `app.listen()`

**Files excluded from deployment** (via `.vercelignore`):
- `test-gen.js`, `test.docx`
- `database/` directory
- `.git`, `.gitignore`, `README.md`

**Required Vercel environment variables:**
Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NODE_ENV=production` in your Vercel project settings.

---

## API Reference

### POST /generate

Generates a DOCX offer letter document.

**Authentication:** Required (Bearer token in `Authorization` header)

**Rate Limit:** 10 requests per hour per IP

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_offerId` | string (UUID) | No | Offer ID for storage path (prevents path traversal via UUID validation) |
| `orgName` | string | Yes | Organization name (max 200 chars) |
| `entityType` | string | No | Entity type: Company, Proprietorship, Partnership, LLP, Firm (default: "Company") |
| `cin` | string | No | CIN / Registration number (max 100 chars) |
| `signatoryName` | string | Yes | Authorized signatory name (max 200 chars) |
| `signatoryDesig` | string | Yes | Signatory designation (max 200 chars) |
| `officeAddress` | string | Yes | Registered office address (max 500 chars) |
| `firstAid` | string | No | First-aid kit location (default: empty) |
| `salutation` | string | No | Mr./Mrs./Ms. (default: "Mr.") |
| `empFullName` | string | Yes | Employee full name (max 200 chars) |
| `empAddress` | string | No | Employee address (max 500 chars) |
| `designation` | string | Yes | Job title (max 200 chars) |
| `employeeId` | string | No | Employee ID (max 100 chars) |
| `reportingManager` | string | No | Reporting manager's designation (max 200 chars) |
| `attendanceSystem` | string | No | Attendance system type (default: "biometric attendance system") |
| `offerDate` | string | Yes | Offer date (ISO format, max 50 chars) |
| `offerValidity` | string | Yes | Offer validity date (must be after offer date) |
| `joiningDate` | string | Yes | Joining date (must not be before offer date) |
| `annualCTC` | number/string | Yes | Annual CTC (must be > 0) |
| `probationPeriod` | string | No | Probation period text |
| `workDayFrom` | string | No | Work week start day |
| `workDayTo` | string | No | Work week end day |
| `workStart` | string | No | Work start time (24h format) |
| `workEnd` | string | No | Work end time (24h format) |
| `breakDuration` | string | No | Break duration text |
| `monthlyLeave` | string | No | Monthly leave entitlement text |
| `carryForward` | string | No | Max carry forward days text |
| `noticePeriod` | string | No | Notice period text |
| `abscondDays` | string | No | Absconding threshold text |

**Cross-field validations:**
- `offerValidity` must be after `offerDate`
- `joiningDate` must not be before `offerDate`
- Unrecognized fields are stripped (`.strip()`) to prevent injection of unexpected data

**Success Response:** Binary DOCX file download

- `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `Content-Disposition: attachment; filename="Offer_{empName}.docx"`

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ success: false, error: "Invalid input", details: [...] }` | Validation failure |
| 401 | `{ success: false, error: "Missing or invalid Authorization header..." }` | Missing/invalid token |
| 403 | `{ success: false, error: "Origin not allowed by CORS policy." }` | CORS rejection |
| 429 | `{ success: false, error: "Document generation limit reached..." }` | Rate limit exceeded |
| 500 | `{ success: false, error: "Failed to generate document" }` | Server error |

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-03-27T10:00:00.000Z"
}
```

### POST /csp-report

Receives Content Security Policy violation reports. Logs the violation and returns `204 No Content`.

### Error Handling

- **404** - Unmatched `/api/*` routes return `{ success: false, error: "Not found: METHOD /api/path" }`
- **400** - Malformed JSON body returns `{ success: false, error: "Malformed JSON in request body." }`
- **413** - Payload too large (>1MB) returns `{ success: false, error: "Request body too large." }`
- **500** - Unhandled errors return generic message in production, detailed message in development

---

## Authentication Flow

### Frontend (Supabase Client)

1. **Login/Signup** - User enters credentials in the auth overlay. The Supabase JS client handles `signInWithPassword()` or `signUp()`.
2. **Session Management** - On successful auth, the user object is stored in memory. The Supabase client automatically manages JWT refresh.
3. **Auth State Listener** - `onAuthStateChange()` listens for `SIGNED_OUT` and `TOKEN_REFRESHED` events to handle session expiry across tabs.
4. **Logout** - Calls `supabase.auth.signOut()`, clears all `oneasy_*` keys from localStorage, and reloads the page.
5. **Token Retrieval** - `getAccessToken()` fetches the current JWT from the active session for backend API calls.

### Backend (JWT Verification)

1. The `verifyAuth` middleware extracts the Bearer token from the `Authorization` header.
2. The token is verified via `supabaseAdmin.auth.getUser(token)` which calls Supabase's auth server.
3. On success, `req.user` is populated with `{ id, email }`.
4. On failure, a `401` response is returned and the failed attempt is logged to the audit trail.

### Frontend CRUD (RLS-Protected)

All offer CRUD operations (create, read, update, delete) are performed **directly from the frontend** using the Supabase client initialized with the **anon key**. This ensures all operations go through Row Level Security policies - users can only access their own data. The backend admin client is never used for CRUD operations to prevent accidental RLS bypass.

---

## Security Measures

| Measure | Implementation |
|---------|---------------|
| **Helmet.js** | Content Security Policy (CSP), HSTS (1 year, includeSubDomains, preload), X-Frame-Options via `frameAncestors: ['none']` |
| **CSP Directives** | `default-src 'self'`, script/style/font sources whitelisted for CDN and Google Fonts, `connect-src` restricted to Supabase domain |
| **Permissions-Policy** | Camera, microphone, geolocation, payment, USB, magnetometer, gyroscope, accelerometer all disabled |
| **CORS** | Origin whitelist: production Vercel domain only in production; localhost variants added in development |
| **Rate Limiting** | General: 100 req/15min per IP. Document generation: 10 req/hour per IP. Standard headers enabled. |
| **HTTPS Enforcement** | HTTP-to-HTTPS redirect in production via `x-forwarded-proto` check |
| **Input Validation** | Zod schemas with `.strip()` to remove unrecognized fields. UUID validation on `_offerId` to prevent path traversal. |
| **Ownership Verification** | Before uploading to storage, the backend verifies the offer belongs to the authenticated user |
| **XSS Prevention** | `escapeHTML()` function sanitizes all user content before innerHTML insertion |
| **HTML Escaping** | All dynamic content in sidebar, history cards, modals, and review grid is escaped |
| **JWT Authentication** | Server-side token verification via Supabase `auth.getUser()` |
| **Environment Fail-Fast** | Missing env vars cause immediate crash with clear error message |
| **Audit Trail** | All generate and auth-failure events are logged with user ID, action, and metadata |
| **Sensitive Data** | `.env` files are gitignored. Logout clears all app data from localStorage. |
| **Body Size Limit** | Express JSON parser limited to 1MB |

---

## Frontend Details

### Pages

1. **Auth Overlay** (`#authOverlay`) - Split-panel login/signup screen with tabbed forms, feature highlights, and error display.
2. **Generator Page** (`#generatorPage`) - 6-step form wizard with progress bar, step tabs, and form validation.
3. **History Page** (`#historyPage`) - Grid of offer cards with actions (download, re-generate, edit, duplicate, view details, delete).
4. **Detail Modal** (`#detailModal`) - Accessible modal dialog for viewing offer details with focus trap and escape-to-close.

### Form Steps

| Step | Title | Fields |
|------|-------|--------|
| 0 | Company Information | Organization Name*, Entity Type*, CIN, Office Address*, Signatory Name*, Signatory Designation*, First-Aid Location. Company Profile load/save/delete. |
| 1 | Employee Information | Salutation*, Full Name*, Address, Designation*, Employee ID, Reporting Manager, Attendance System |
| 2 | Compensation | Annual CTC* (with INR-to-words display and auto-calculated salary breakdown preview) |
| 3 | Employment Terms | Offer Date*, Offer Validity*, Joining Date*, Probation Period*, Working Days*, Work Start/End Time*, Break Duration* |
| 4 | Policies | Monthly Leave, Carry Forward Days, Notice Period*, Absconding Threshold |
| 5 | Review & Generate | Summary cards (Company, Employee, Compensation), Generate DOCX button, Save as PDF button |

### JavaScript Modules

| Module | Responsibility |
|--------|---------------|
| `main.js` | App initialization, auth integration, step navigation, form validation, auto-save (localStorage + server), sidebar draft management, offer CRUD (via Supabase RLS client), document generation API call, history page rendering, modal management, company profile handling, hash routing, mobile menu |
| `auth.js` | Supabase client initialization, login, signup, logout (with localStorage cleanup), session check, access token retrieval, auth state change listener |
| `config.js` | API URL (`/generate`), Supabase URL and anon key constants |
| `salary.js` | `buildBreakdown(ctc)` function mirroring backend logic, `onCTCChange()` handler for real-time salary table updates |
| `utils.js` | `toWords(n)` (Indian number system: Lakh, Crore), `fmtINR(n)` (Indian number formatting), `v(id)` (get trimmed input value), `fmtDate(iso)`, `fmtTime(t)`, `showAlert(type, msg)` (toast notifications), `escapeHTML(str)` |

### CSS Architecture

| File | Purpose |
|------|---------|
| `variables.css` | Design tokens: color palette (Slate-based), spacing scale (4px base), font sizes, border radius, shadows, transitions |
| `layout.css` | App shell grid layout (sidebar + content area), responsive breakpoints, sidebar styling |
| `components.css` | All component styles: auth overlay, form wizard, step tabs, buttons, cards, modals, toasts, history grid, salary table |
| `main.css` | Import aggregator that loads all CSS files in order |

### Auto-Save Behavior

1. **localStorage** - Every input change saves the complete form state to `oneasy_draft_{userId}` in localStorage.
2. **Server sync** - Changes are debounced (800ms) and auto-saved to the Supabase `offers` table. If no record exists, a new one is created; otherwise, the existing record is updated.
3. **Skip condition** - Auto-save is skipped if no meaningful data has been entered (no offer ID, name is "Untitled", and org/designation are empty).
4. **Sidebar refresh** - After server save, the sidebar drafts list is refreshed (debounced at 3000ms).

---

## Backend Details

### Middleware Stack (in order)

1. **Trust Proxy** - Enabled in production for accurate IP detection behind Vercel
2. **HTTPS Redirect** - Redirects HTTP to HTTPS in production
3. **Request Logger** - Assigns 8-char hex correlation ID (`req.id`) and logs request completion with method, URL, status, and duration
4. **Helmet** - Security headers (CSP, HSTS, X-Content-Type-Options, etc.)
5. **Permissions-Policy** - Restricts browser API access
6. **CORS** - Origin whitelist with credentials support and `Content-Disposition` exposed
7. **General Rate Limiter** - 100 requests per 15 minutes per IP
8. **JSON Body Parser** - 1MB limit
9. **Static File Server** - Serves `frontend/` with 1-day cache (production) and no-cache for HTML

### Supabase Clients

| Client | Key Used | Purpose |
|--------|----------|---------|
| `supabase` (public) | Anon key | Operations that respect RLS (not currently used on backend) |
| `supabaseAdmin` (admin) | Service role key | JWT verification, audit log inserts, storage uploads, offer ownership checks |

### Logging

The structured logger (`utils/logger.js`) supports four levels: `debug`, `info`, `warn`, `error`.

- **Production:** Single-line JSON output (`{"ts":"...","level":"info","msg":"..."}`) for log aggregator compatibility. Minimum level: `info`.
- **Development:** Readable format (`[HH:mm:ss.SSS] INFO  message {meta}`) for terminal debugging. Minimum level: `debug`.
- **Correlation IDs:** Every request gets a unique 8-character hex ID (`req.id`) that propagates through all log entries for that request.

### Error Handling

The global error handler catches:
- CORS rejections (403)
- Malformed JSON (400)
- Payload too large (413)
- Unmatched API routes (404)
- Unhandled exceptions (500, with stack traces hidden in production)

### Graceful Shutdown

In development mode, the server listens for `SIGTERM` and `SIGINT` signals. On receipt:
1. Logs the signal
2. Closes the HTTP server (stops accepting new connections)
3. Waits up to 10 seconds for existing connections to finish
4. Forces exit if connections don't close within the timeout

---

## Document Generation Engine

The document generator (`backend/docGenerator/`) uses the `docx` library to build a Word document programmatically.

### Process Flow

1. `generateDoc(formData)` is called with the validated form payload
2. `buildContext(formData)` pre-computes shared values: CTC in words, salary breakdown, formatted dates/times, work schedule strings
3. Four section builders are called, each receiving raw data and the context object:
   - `getOfferLetter(d, ctx)` - Returns array of docx Paragraph/Table elements
   - `getAppointmentLetter(d, ctx)` - Returns array of docx elements
   - `getAnnexureA(d, ctx)` - Returns array with salary table
   - `getAnnexureB(d, ctx)` - Returns array with 16 policy sections
4. All sections are combined into a single `Document` with shared header, footer, and page properties
5. `Packer.toBuffer(doc)` serializes the document to a Buffer

### Builder Modules

| Module | Exports | Description |
|--------|---------|-------------|
| `helpers.js` | `run()`, `p()`, `blank()`, `pageBreak()`, `docTitle()`, `labelValue()`, `clauseHead()`, `subClause()`, `body()`, `singleBorder()`, `allBorders()`, `noBorders()` | Low-level builders for TextRun, Paragraph, and border configurations |
| `tables.js` | `sigTable()`, `salaryTable()` | Signature block table (2-column, no borders) and salary breakdown table (3-column with header row and total row highlighting) |
| `headerFooter.js` | `makeHeader()`, `makeFooter()` | Document header (org name centered, bold 14pt + CIN italic 9pt) and footer (Page X of Y centered) |
| `numberUtils.js` | `formatINR()`, `toWords()`, `buildBreakdown()`, `formatDate()`, `formatTime()` | Number formatting, Indian number-to-words conversion, salary breakdown computation, date/time formatting |
| `constants.js` | Page dimensions, colors, numbering config, salary percentages | Centralized configuration values |

---

## Salary Breakdown Logic

The salary breakdown follows a standard Indian CTC structure. Given an Annual CTC, the system computes:

| Component | Allocation |
|-----------|-----------|
| Basic Pay | 50.00% of monthly CTC |
| House Rent Allowance (HRA) | 18.80% of monthly CTC |
| Conveyance Allowance | 4.70% of monthly CTC |
| Medical Allowance | 2.82% of monthly CTC |
| Children Education | 0.94% of monthly CTC |
| Children Hostel Allowance | 0.94% of monthly CTC |
| Special Allowance | 4.70% of monthly CTC |
| Leave Travel Allowance (LTA) | 4.70% of monthly CTC |
| Employer's Contribution to PF | 12% of Basic Pay |
| Differential Allowance | Balancing figure (ensures monthly total = monthly CTC exactly) |

**Annual calculation:** Each component's annual figure is `monthly * 12`, except Differential Allowance which is `CTC - sum_of_all_other_annual_components` to ensure the annual total matches the input CTC exactly.

> **Note:** The breakdown logic exists in two places: `backend/docGenerator/numberUtils.js` (canonical source, used for document generation) and `frontend/js/salary.js` (UI preview). Both must be kept in sync.

---

## Database Schema

### `offers` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK -> auth.users) | Owner user, cascades on delete |
| `emp_name` | TEXT | Employee name |
| `designation` | TEXT | Job title |
| `annual_ctc` | NUMERIC | Annual CTC amount |
| `payload` | JSONB | Complete form data snapshot |
| `doc_url` | TEXT | Storage path of generated DOCX |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

### `profiles` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK, FK -> auth.users) | User ID |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `full_name` | TEXT | User's full name |
| `avatar_url` | TEXT | Profile picture URL |
| `role` | TEXT | User role (default: 'user', can be 'admin') |

### `audit_logs` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK -> auth.users) | Acting user |
| `action` | TEXT | Action performed (e.g., 'generate_document', 'auth_failed') |
| `resource` | TEXT | Resource type/ID (e.g., 'offer_letter', 'auth') |
| `details` | JSONB | Additional metadata |
| `created_at` | TIMESTAMPTZ | Timestamp |

### `company_profiles` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK -> auth.users) | Owner user, cascades on delete |
| `profile_name` | TEXT | Display name for the profile |
| `org_name` | TEXT | Organization name |
| `entity_type` | TEXT | Company/Proprietorship/Partnership/LLP/Firm |
| `cin` | TEXT | CIN/Registration number |
| `office_address` | TEXT | Registered address |
| `signatory_name` | TEXT | Authorized signatory |
| `signatory_desig` | TEXT | Signatory designation |
| `first_aid` | TEXT | First-aid location (default: 'HR Room') |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

---

## Testing

### Test Framework

- **Jest 30** with `node` test environment
- **Supertest 7** for HTTP integration tests
- Tests located in `backend/__tests__/`
- Configured via `jest.config.js`: 10-second timeout, verbose output

### Test Suites

| File | What It Tests |
|------|--------------|
| `numberUtils.test.js` | `formatINR()`, `toWords()`, `buildBreakdown()`, `formatDate()`, `formatTime()` |
| `helpers.test.js` | Paragraph, TextRun, and border builder functions |
| `constants.test.js` | Page dimensions, color values, salary percentages |
| `validation.test.js` | Zod schema validation: required fields, optional defaults, CTC transformation, cross-field date validation, field stripping |
| `auth.test.js` | JWT verification middleware: missing header, invalid token, expired token, successful auth |
| `audit.test.js` | Audit log insertion, error handling (never throws) |
| `logger.test.js` | Log level filtering, output format (JSON vs readable), request logger middleware |
| `cors.test.js` | Origin whitelist, blocked origins, same-origin requests |
| `server.integration.test.js` | Health endpoint, 404 handling, CORS headers |
| `generateDoc.integration.test.js` | End-to-end document generation with sample data |

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Standalone Generation Test

```bash
node test-gen.js
```

Generates a `test.docx` file using dummy data without requiring a running server or database connection. Useful for verifying the document generation engine in isolation.

---

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node backend/server.js` | Start the production server |
| `dev` | `nodemon backend/server.js` | Start with auto-restart on file changes |
| `test` | `jest --forceExit --detectOpenHandles` | Run all test suites |
| `test:watch` | `jest --watch --forceExit --detectOpenHandles` | Run tests in watch mode |
| `audit` | `npm audit --omit=dev` | Check for security vulnerabilities (production deps) |
| `audit:fix` | `npm audit fix --omit=dev` | Auto-fix security vulnerabilities |

---

## Document Specifications

| Property | Value |
|----------|-------|
| Page size | A4 (11906 x 16838 DXA) |
| Top margin | 1440 DXA (1 inch) |
| Bottom margin | 1440 DXA (1 inch) |
| Left margin | 1440 DXA (1 inch) |
| Right margin | 1700 DXA (~1.18 inches) |
| Content width | 8766 DXA |
| Header | Organization name (centered, bold, 14pt) + CIN (centered, italic, 9pt) |
| Footer | "Page X of Y" (centered, 9pt) |
| Body font | Calibri 11pt, black (#000000) |
| Title font | Calibri 18pt, bold, underlined |
| Salary table header | Navy background (#1F3864), white text, bold, 10pt |
| Salary table total row | Light grey background (#D9D9D9), bold, 10pt |
| Color palette | Black (#000000), Navy (#1F3864), Gray (#595959), Light Gray (#D9D9D9), White (#FFFFFF) |

---

## Dependencies

### Production

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.100.0 | Supabase client for database, auth, and storage |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing middleware |
| `docx` | ^8.5.0 | Word document generation |
| `dotenv` | ^17.3.1 | Environment variable loading |
| `express` | ^4.18.2 | HTTP server framework |
| `express-rate-limit` | ^8.3.1 | Rate limiting middleware |
| `helmet` | ^8.1.0 | Security headers middleware |
| `zod` | ^4.3.6 | Schema validation library |

### Development

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.3.0 | Testing framework |
| `nodemon` | ^3.0.1 | Auto-restart on file changes |
| `supertest` | ^7.2.2 | HTTP assertion library for integration tests |

---

Built by **OnEasy**
