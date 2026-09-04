# Rudiment Drum Coach — Vercel Deployment

This package is Vercel-native. The React/Vite frontend builds to `dist/`, while AI endpoints are implemented as Vercel serverless functions under `api/`.

## Deploy through GitHub + Vercel

1. Extract this ZIP and upload the complete project contents to your GitHub repository root.
2. In Vercel, import the repository as a new project (or point your existing project to this repository).
3. Vercel should detect **Vite** automatically.
4. Keep these settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: default (`npm install`)
5. In **Project Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = your Gemini API key
   Add it for Production and Preview if you want Coach Chat to work in both.
6. Deploy.

## After deployment

Open `/api/health` on your deployed domain. It should return JSON with `status: "ok"` and `runtime: "vercel-serverless"`.

Then test the app in this order:

1. Today loads.
2. Path loads and current curriculum state is preserved.
3. Practice Quarter-Note Pulse opens the C2 teaching flow.
4. Count / Watch / Follow / Play / Evaluate work.
5. Coach Chat returns a response (this confirms the Gemini environment variable and `/api/chat` function work).

## Important

- Do not put the real Gemini key into `.env.example` or commit it to GitHub.
- `legacy/server.express.ts` is retained only as historical reference. Vercel does not use it.
- The deployed frontend calls the same relative URLs (`/api/chat`, etc.), so no frontend API URL changes are required.
