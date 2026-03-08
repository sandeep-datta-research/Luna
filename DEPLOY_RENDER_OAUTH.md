# Render Backend + Google OAuth Setup (Luna)

## 1) Deploy backend on Render

1. Open Render Dashboard -> New -> Blueprint.
2. Connect your GitHub repo: `sandeep-datta-research/Luna`.
3. Render will detect `render.yaml` at repo root.
4. Click **Apply** and fill secret env vars when prompted:
   - `MONGODB_URI`
   - `GOOGLE_CLIENT_ID`
   - `GROQ_API_KEY`
   - `OPENROUTER_API_KEY`
   - `NVIDIA_API_KEY`
   - `GEMINI_API_KEY`
5. Wait for deploy, then verify:
   - `https://<your-render-service>.onrender.com/health`

## 2) Connect frontend (GitHub Pages) to backend

1. GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret.
2. Add:
   - `VITE_API_URL` = `https://<your-render-service>.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID` = your Google OAuth Web Client ID
3. Re-run workflow: Actions -> `Deploy Luna to GitHub Pages` -> Run workflow.

## 3) Google OAuth (fix origin_mismatch)

In Google Cloud Console:
1. Google Auth Platform -> Clients -> your Web client.
2. In **Authorized JavaScript origins**, add:
   - `https://sandeep-datta-research.github.io`
   - `http://localhost:5173`
   - `http://localhost:5174`
3. Save.

Notes:
- For your current GIS button flow, `Authorized JavaScript origins` is the critical setting.
- Keep `GOOGLE_CLIENT_ID` same in backend env and frontend `VITE_GOOGLE_CLIENT_ID` secret.

## 4) Final test

1. Open `https://sandeep-datta-research.github.io/Luna/`
2. Sign in with Google.
3. Send a chat message and verify backend reply.
4. Verify history loads/saves.
