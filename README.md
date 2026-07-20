<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Security-Hardened-10B981?style=for-the-badge&logo=shieldsdotio&logoColor=white" alt="Security Hardened" />
</p>

# 🛡️ Secure Flow — Assessment Sandbox

A **production-grade, security-hardened** full-stack web application built to demonstrate and validate a complete **Signup → Login → Upload → Approval** workflow. Designed as a hands-on assessment sandbox where every security boundary—from authentication to file delivery—is intentionally tested, broken, and fortified.

> **This is not a toy prototype.** Every line is written with the mindset of a senior engineer shipping to production: input validation with boundary checks, timing-safe authentication, IDOR-proof authorization, and zero-trust file serving.

---

## ⚡ Quick Start: How to Run

Get the application running locally in less than a minute:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Application**:
   Open **two terminal windows** (one for the backend and one for the frontend):
   * **Terminal 1 (Backend API)**:
     ```bash
     npm run server
     ```
     *(Runs on `http://localhost:5000`)*
   * **Terminal 2 (Frontend Dev)**:
     ```bash
     npm run dev
     ```
     *(Runs on `http://localhost:5173`)*

---

## 📋 Table of Contents

- [⚡ Quick Start](#-quick-start-how-to-run)
- [How It Works](#-how-it-works)
- [Architecture](#-architecture)
- [Tools & Tech Stack](#-tools--tech-stack)
- [Security Features](#-security-features-13-vulnerabilities-audited--resolved)
- [Rate Limiting](#-rate-limiting)
- [Boundary Value Validation](#-boundary-value-validation)
- [Advantages](#-advantages)
- [Use Cases](#-use-cases)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## 🔄 How It Works

The application implements a **6-step user workflow** with security checks at every transition:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│  1. Sign Up  │ ──► │  2. Log In   │ ──► │  3. Dashboard   │
└─────────────┘     └─────────────┘     └────────┬────────┘
                                                  │
                    ┌─────────────────┐           │
                    │ 6. View File    │ ◄─── Approved?
                    │ (Auth + Owner)  │           │
                    └─────────────────┘    ┌──────┴────────┐
                                           │ 4. Upload File │
                                           └──────┬────────┘
                                                   │
                                           ┌───────┴───────┐
                                           │ 5. Admin       │
                                           │    Approval    │
                                           └───────────────┘
```

| Step | What Happens | Security Layer |
|------|-------------|----------------|
| **Sign Up** | User registers with username, email, password | Input validation, bcrypt hashing, duplicate check, single-admin enforcement |
| **Log In** | User authenticates and receives a JWT | Rate limiting (5/min), timing-safe comparison, constant-time failure |
| **Dashboard** | User sees their own files only; Admin sees all | Role-based access control, tenant isolation |
| **Upload** | User uploads a document (max 10MB) | File type whitelist, UUID filenames, rate limiting (3/min) |
| **Approval** | Admin approves or rejects pending uploads | Role verification on backend, status enum validation |
| **View File** | User downloads approved files only | Owner check + approval check + path traversal guard + CSP headers |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TS)                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐ │
│  │ Auth View │  │ Upload   │  │ File List │  │  IDOR   │ │
│  │ (Tabs)   │  │ Dropzone │  │ Dashboard │  │ Sandbox │ │
│  └──────────┘  └──────────┘  └───────────┘  └─────────┘ │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP + Bearer Token
┌──────────────────────┴───────────────────────────────────┐
│                    BACKEND (Express.js)                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐ │
│  │ Security      │  │ Auth Routes   │  │ File Routes   │ │
│  │ Middleware     │  │ /signup       │  │ /upload       │ │
│  │ • CORS        │  │ /login        │  │ /files        │ │
│  │ • Rate Limit  │  │ /admin-exists │  │ /files/:id/*  │ │
│  │ • Headers     │  │ /me           │  │               │ │
│  │ • Body Limit  │  └───────────────┘  └───────────────┘ │
│  └───────────────┘                                        │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐ │
│  │ JWT Auth      │  │ bcrypt        │  │ Multer        │ │
│  │ Middleware     │  │ Password Hash │  │ File Filter   │ │
│  └───────────────┘  └───────────────┘  └───────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 🧰 Tools & Tech Stack

### Frontend
| Tool | Version | Purpose |
|------|---------|---------|
| **React** | 19.2 | Component-based UI with hooks |
| **TypeScript** | 6.0 | Type safety and compile-time error catching |
| **Vite** | 8.1 | Lightning-fast dev server and optimized bundler |
| **Lucide React** | 1.25 | Premium SVG icon library |
| **Vanilla CSS** | — | Custom design system with CSS variables, conic-gradient animations |

### Backend
| Tool | Version | Purpose |
|------|---------|---------|
| **Express.js** | 5.2 | HTTP server and REST API routing |
| **jsonwebtoken** | 9.0 | JWT creation, signing, and verification |
| **bcryptjs** | 3.0 | Password hashing with salt (cost factor 10) |
| **multer** | 2.2 | Multipart file upload handling with filtering |
| **express-rate-limit** | 8.6 | IP-based request throttling |
| **cors** | 2.8 | Cross-Origin Resource Sharing configuration |
| **crypto** | built-in | UUID generation for users and files |

### Dev Tooling
| Tool | Purpose |
|------|---------|
| **Oxlint** | Fast, zero-config linting |
| **Git** | Version control |

---

## 🔐 Security Features (13 Vulnerabilities Audited & Resolved)

This application underwent a **full senior-level security audit**. Every vulnerability was identified, documented, and patched:

### Authentication & Authorization
| Feature | Implementation |
|---------|---------------|
| **Password Hashing** | bcrypt with salt rounds = 10 (never stored in plaintext) |
| **JWT Tokens** | 2-hour expiry, env-configurable secret, signed with HS256 |
| **Timing-Safe Login** | Dummy `bcrypt.compare()` on user-not-found to prevent enumeration |
| **Single Admin Enforcement** | Only one admin account can exist; checkbox auto-hides after creation |
| **Role-Based Access Control** | Backend enforces `admin` vs `user` roles on every protected route |
| **IDOR Protection** | File ownership verified server-side; built-in IDOR test sandbox in UI |

### Transport & Headers
| Feature | Implementation |
|---------|---------------|
| **Scoped CORS** | Restricted to `localhost:5173` only (no wildcard) |
| **X-Content-Type-Options** | `nosniff` — prevents MIME-type sniffing |
| **X-Frame-Options** | `DENY` — blocks clickjacking via iframes |
| **X-XSS-Protection** | `1; mode=block` — legacy XSS filter enabled |
| **Referrer-Policy** | `strict-origin-when-cross-origin` |
| **Content-Security-Policy** | Applied on file serve: `default-src 'none'` blocks script execution |

### File Security
| Feature | Implementation |
|---------|---------------|
| **File Type Whitelist** | Only `jpeg, jpg, png, gif, pdf, doc, docx, xls, xlsx, txt, zip` |
| **MIME + Extension Check** | Both client-provided MIME and file extension must match the whitelist |
| **UUID Filenames** | Uploaded files renamed to `crypto.randomUUID()` — prevents collisions and name-based attacks |
| **Path Traversal Guard** | `path.resolve()` + prefix validation ensures file stays within `uploads/` |
| **10MB Size Limit** | Enforced by Multer at the middleware level |
| **Sanitized Content-Disposition** | Filename stripped with `path.basename()` + character whitelist |

### Input Hardening
| Feature | Implementation |
|---------|---------------|
| **JSON Body Limit** | `express.json({ limit: '16kb' })` — prevents payload DoS |
| **Type Validation** | `typeof` checks on all string inputs before processing |
| **UUID Param Validation** | Regex guard on all `:id` route parameters |
| **Health Endpoint** | Returns only `status` and `uptime` — no internal counts leaked |

---

## ⏱️ Rate Limiting

Three tiers of IP-based rate limiting protect against brute force and abuse:

| Tier | Scope | Window | Max Requests | Protects Against |
|------|-------|--------|-------------|-----------------|
| 🔴 **Auth** | `/api/auth/signup`, `/api/auth/login` | 1 minute | 5 | Credential stuffing, brute force |
| 🟠 **Upload** | `/api/upload` | 1 minute | 3 | Storage exhaustion, spam |
| 🟢 **Global** | `/api/*` | 15 minutes | 200 | General DDoS, scraping |

All limiters return `429 Too Many Requests` with a human-readable error message and standard `RateLimit-*` headers.

---

## 📏 Boundary Value Validation

Every user input is validated against strict boundaries to prevent edge-case crashes and exploitation:

| Field | Min | Max | Format | Edge Cases Handled |
|-------|-----|-----|--------|-------------------|
| **Username** | 3 chars | 30 chars | `[a-zA-Z0-9_]` only | Empty, whitespace-only, special chars, SQL/XSS injection strings |
| **Email** | — | 254 chars (RFC 5321) | `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` | Missing `@`, no TLD, absurdly long |
| **Password** | 6 chars | 72 chars | Any | Empty, exactly at boundary (6, 72), bcrypt truncation at 73+ |
| **File Size** | > 0 bytes | 10 MB | Whitelist extensions | Empty file, oversized, double extension (`file.txt.exe`) |
| **File ID** | — | — | UUID v4 regex | Random strings, path traversal (`../`), SQL fragments |
| **Status** | — | — | Enum: `approved, rejected, pending` | Invalid strings, numbers, null, empty |

---

## ✅ Advantages

1. **Zero External Auth Dependencies** — No Firebase, Auth0, or Supabase. The entire auth system is self-contained with JWT + bcrypt, giving you full control and understanding of every security decision.

2. **Defense in Depth** — Security isn't a single layer. This app applies 6+ layers: input validation → rate limiting → authentication → authorization → file filtering → response hardening.

3. **Built-In Security Testing** — The IDOR Sandbox panel lets you actively test authorization boundaries from within the UI, making security tangible and demonstrable.

4. **Production-Grade Patterns** — Timing-safe comparisons, UUID-based resource identifiers, path traversal guards, and Content-Security-Policy headers are patterns used by companies like Stripe, GitHub, and Cloudflare.

5. **Clean Separation of Concerns** — Backend enforces all security rules. Frontend is purely a presentation layer — even if compromised, the backend rejects unauthorized operations.

6. **Assessment-Ready** — Designed to demonstrate understanding of the full software development lifecycle: requirements → implementation → testing → security hardening → deployment.

---

## 🎯 Use Cases

| Use Case | Description |
|----------|-------------|
| **Job Assessment Submission** | Demonstrates full-stack competency with security awareness for technical interviews and coding assessments |
| **Security Training** | Use the IDOR sandbox and rate limiting to teach developers about common web vulnerabilities |
| **Document Approval Workflow** | A lightweight prototype for any organization needing upload → review → approve/reject pipelines |
| **Auth System Reference** | A clean, copy-paste-ready implementation of JWT auth with bcrypt, role-based access, and rate limiting |
| **Frontend Design Reference** | Showcases modern CSS techniques: conic-gradient rotating borders, collapsible transitions, light theme design tokens |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18.0
- **npm** ≥ 9.0

### Installation

```bash
# Clone the repository
git clone https://github.com/Ayush08k/Secure-Flow-Assessment-Sandbox.git
cd Secure-Flow-Assessment-Sandbox

# Install dependencies
npm install
```

### Running the Application

You need **two terminals** — one for the backend API server and one for the frontend dev server:

```bash
# Terminal 1: Start the backend API server
npm run server
# → API running at http://localhost:5000

# Terminal 2: Start the frontend dev server
npm run dev
# → App running at http://localhost:5173
```

### Building for Production

```bash
npm run build
# Output: dist/ directory ready for static hosting
```

---

## 🔑 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Backend API server port |
| `JWT_SECRET` | Auto-generated per session | Set a persistent secret in production. Minimum 32 random characters recommended. |

```bash
# Example: Set via command line
JWT_SECRET=your-super-random-secret-here-min-32-chars node server.js

# Example: Create a .env file (gitignored)
echo JWT_SECRET=your-super-random-secret-here > .env
```

---

## 📁 Project Structure

```
Secure-Flow-Assessment-Sandbox/
├── server.js              # Express API server (auth, upload, file routes)
├── src/
│   ├── App.tsx            # Main React application component
│   ├── index.css          # Complete design system (light theme, animations)
│   ├── main.tsx           # React entry point
│   └── assets/            # Static assets (icons, images)
├── public/                # Public static files
├── uploads/               # User-uploaded files (gitignored)
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
└── .gitignore             # Excludes node_modules, uploads, .env, dist
```

---

## 📄 License

This project is built as an assessment sandbox for educational and demonstration purposes.

---

<p align="center">
  <b>Built with security-first thinking. Hardened by design.</b>
</p>
