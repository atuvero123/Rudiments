# Rudiment Drum Coach C3 — Vercel Deployment

This package is Vercel-native. The React/Vite frontend builds to `dist/`; AI endpoints are Vercel serverless functions under `api/`.

## Deploy through GitHub + Vercel

1. Extract the ZIP and replace/update the complete contents of your GitHub project with this build.
2. Commit/push all files, including the new `src/components/PlayAlongStudio.tsx`, `src/data/playAlongTracks.ts`, and `src/lib/playAlongEngine.ts`.
3. In Vercel, redeploy the latest GitHub commit.
4. Keep:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: default (`npm install`)
5. In Project Settings → Environment Variables add `GEMINI_API_KEY` for Production (and Preview if desired), then redeploy after adding/changing it.

## API test

Open:

`https://YOUR-DOMAIN.vercel.app/api/health`

C3 should return JSON containing:
- `status: "ok"`
- `runtime: "vercel-serverless"`
- `apiVersion: "c3.0"`
- `aiConfigured: true` when the Gemini key is available
- `transport: "google-rest-api"`

If `aiConfigured` is false, add the environment variable and redeploy.

## C3 app test

1. Open Today.
2. In Musical Application, tap the new play-along button.
3. Confirm the recommended current-path track opens.
4. Start Slow 4/4 Ballad at 64 BPM.
5. Test Guided / Reduced / Performance.
6. Test Groove Only and Musical Choice.
7. If fill competencies are not verified, confirm 3+1 / 7+1 / Half-Bar / Beat-4 modes are visibly locked.
8. Let a play-along finish and save its review.
9. Open Songs directly and test all four play-alongs.
10. Test `/api/health`, then Coach Chat.

## Important

The play-alongs are locally generated no-drum practice music. The reference Song Vault does not host or redistribute commercial recordings.
