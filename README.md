# Luna

Luna is a full-stack AI chat app with a Vite/React frontend and an Express backend. It includes multi-provider model routing, account auth, conversation history, onboarding memory, pricing and upgrade flows, public feedback, and an admin dashboard.

## Current Scope

- AI chat with standard and streaming responses
- Conversation history and session recovery
- Google sign-in and local password auth
- Profile management and onboarding memory
- Pricing page and manual Pro upgrade requests
- Public feedback submission and featured feedback display
- Admin dashboard for users, upgrade requests, announcements, referrals, feedback, and pricing settings
- MongoDB or file-backed persistence, with optional Supabase-backed user memory

## Stack

- Frontend: React 19, Vite, Tailwind CSS, Framer Motion, React Router
- Backend: Express, Axios, MongoDB
- Integrations: Google auth, Supabase, OpenRouter, Groq, Gemini, NVIDIA, Z.AI, Hugging Face
- Deploy targets currently present in repo: GitHub Pages, Vercel config, Render backend

## Repo Layout

```text
src/                  Frontend app
server/               Express backend and persistence adapters
.github/workflows/    CI and deploy workflows
public/               Static assets
```

## Local Development

Install frontend dependencies:

```bash
npm ci
```

Install backend dependencies:

```bash
cd server
npm ci
```

Run the frontend:

```bash
npm run dev
```

Run the backend:

```bash
cd server
npm start
```

Default local ports:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5112` via Vite proxy or direct API access

## Scripts

Frontend root:

- `npm run dev` starts Vite
- `npm run build` builds the frontend
- `npm run lint` runs ESLint
- `npm run preview` previews the production build
- `npm run start` runs `server/server.js` from the repo root

Backend in `server/`:

- `npm start` runs the Express API

## Core Environment Variables

Backend:

- `CORS_ALLOWED_ORIGINS` or `FRONTEND_URL`
- `LUNA_ADMIN_EMAILS`
- `LUNA_DB_MODE`
- `MONGODB_URI`
- `MONGODB_DB`
- `GOOGLE_CLIENT_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `NVIDIA_API_KEY`
- `GEMINI_API_KEY`
- `ZAI_API_KEY`
- `HUGGINGFACE_API_KEY`

Frontend:

- `VITE_API_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Minimum production setup after the recent security hardening:

- set `LUNA_ADMIN_EMAILS`
- set one of `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`, `APP_URL`, or `SITE_URL`
- set `VITE_API_URL` if frontend and backend are on different origins

## API Surface

Main backend areas currently exposed:

- `/api/auth/*`
- `/api/profile`
- `/api/onboarding*`
- `/api/history*`
- `/api/luna` and `/api/luna/stream`
- `/api/feedback*`
- `/api/payments/*`
- `/api/admin/*`
- `/api/providers/status`
- `/health`

## Deployment Notes

- GitHub Actions PR CI is in [.github/workflows/ci.yml](/root/Luna/.github/workflows/ci.yml)
- GitHub Pages deploy workflow is in [.github/workflows/deploy-pages.yml](/root/Luna/.github/workflows/deploy-pages.yml)
- Backend Render config is in [render.yaml](/root/Luna/render.yaml)
- Vercel frontend config is in [vercel.json](/root/Luna/vercel.json)

The repo currently supports multiple deployment paths, but the platform strategy is still being simplified.

## Status

Luna is beyond MVP stage in features, but the codebase still needs structural cleanup in a few areas:

- `server/server.js` is still too large and should be split into modules
- deployment assumptions are still mixed across Pages, Vercel, and Render
- test coverage is still light

## License

No license file is currently included in the repo.
