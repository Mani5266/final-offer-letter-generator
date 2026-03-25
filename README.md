# OnEasy — AI-Powered Offer Letter Generator

> **Legally compliant** · **Instant DOCX** · **AI-assisted**

OnEasy generates professionally structured Offer & Appointment Letters as DOCX files, with auto-calculated salary breakdowns, a full Code of Conduct, and AI-powered form assistance — all from a modern, step-by-step web interface.

---

## ✨ Features

- **Multi-step Form** — Guided 6-step wizard: Company → Employee → Compensation → Employment → Policies → Review & Generate
- **AI Chat Assistant** — Real-time guidance via Gemini AI while filling the form
- **Auto Salary Breakdown** — Enter Annual CTC and get a full Indian payroll structure (Annexure A)
- **Generation History** — View, re-generate, and manage all previously generated offer letters
- **Secure Authentication** — Supabase-powered login/signup with Row Level Security
- **Auto-save Drafts** — Form state persists across page refreshes via localStorage
- **Instant DOCX Download** — A4-formatted document matching professional template standards

## 📄 Generated Document Structure

| Section | Contents |
|---------|----------|
| Offer Letter | All 22 fields mapped, validity clause, joining details |
| Appointment Letter | 11 clauses with sub-clauses covering employment terms |
| Annexure A | Auto-calculated salary breakdown table |
| Annexure B | Full Code of Conduct (16 sections) |

## 🏗️ Project Structure

```
oneasy/
├── frontend/
│   ├── index.html              ← Main UI (auth, form wizard, history page)
│   ├── css/
│   │   ├── variables.css       ← Design tokens (colors, shadows, radii)
│   │   ├── layout.css          ← Header + grid layout
│   │   ├── components.css      ← All component styles
│   │   └── main.css            ← CSS imports
│   └── js/
│       ├── main.js             ← App entry: auth, navigation, CRUD, generation
│       ├── auth.js             ← Supabase authentication (login/signup/logout)
│       ├── config.js           ← API URL + Supabase keys
│       ├── ai.js               ← Gemini AI chat integration
│       ├── salary.js           ← CTC → salary breakdown calculator
│       └── utils.js            ← Formatters (date, time, currency, words)
├── backend/
│   ├── server.js               ← Express server (API + static file serving)
│   ├── .env                    ← Environment variables (not committed)
│   ├── .env.example            ← Template for environment setup
│   ├── docGenerator/           ← DOCX builder (exact A4 template match)
│   ├── middleware/             ← Auth middleware
│   └── utils/                  ← Supabase client
├── database/
│   └── supabase_setup.sql      ← SQL schema (offers, profiles, audit_logs)
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Setup & Run

### Prerequisites
- **Node.js** v18+
- **Supabase** project (free tier works)
- **Gemini API key** (optional, for AI chat)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` and fill in:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key        # optional
```

### 3. Set up the database
Run the contents of `database/supabase_setup.sql` in your Supabase SQL Editor. This creates:
- `offers` table — stores generated offer letter data per user
- `profiles` table — extended user profiles
- `audit_logs` table — action logging
- Row Level Security policies for all tables

### 4. Start the server
```bash
npm start
```
Open **http://localhost:3002** in your browser.

### Development mode (auto-restart)
```bash
npm run dev
```

## 🔐 Authentication

- Uses **Supabase Auth** (email/password) on the frontend
- Backend validates via `x-user-id` header
- All offer data is scoped per user with Supabase RLS policies

## 🤖 AI Chat

The sidebar AI assistant uses **Google Gemini 1.5 Flash** to help users fill forms correctly. The API key is stored server-side and proxied through `/api/chat` — never exposed to the client.

Get a free key at: https://aistudio.google.com/apikey

## 📐 Document Specs

| Property | Value |
|----------|-------|
| Page size | A4 (11906 × 16838 DXA) |
| Margins | Top/Bottom 1440, Left 1440, Right 1700 DXA |
| Header | Org name (bold, 14pt) + CIN |
| Footer | Page X of Y (centered) |
| Body font | Calibri 11pt |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS, Modular ES Modules |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| AI | Google Gemini 1.5 Flash |
| Document | docx.js (server-side DOCX generation) |
| Fonts | Inter + Outfit (Google Fonts) |

---

Built with ❤️ by **OnEasy**
