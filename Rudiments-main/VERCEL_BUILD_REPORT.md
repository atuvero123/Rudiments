# C2 Vercel Conversion Report

## Deployment architecture

- Frontend: React + Vite, built with `npm run build` to `dist/`.
- Backend: Vercel Node serverless functions.
- AI secret: `GEMINI_API_KEY` is read only on the serverless side.
- No always-running Express process is required.

## Serverless API routes

- `GET /api/health`
- `POST /api/chat`
- `POST /api/generate-plan`
- `POST /api/checkpoint-assessment`

Shared Gemini setup and coaching prompt live in `serverlib/rudiment.ts` so the API routes do not duplicate server logic.

## Build changes

- Replaced the Express production-server build with Vite-only build.
- Removed Express/dotenv/esbuild/tsx dependencies that are no longer needed for Vercel deployment.
- Added `vercel.json` with Vite output and function settings.
- Updated `vite.config.ts` to use an ESM-safe project directory calculation.
- Added safe `.env.example` and Vercel deployment instructions.
- Preserved relative frontend API calls, so the client still calls `/api/chat` without environment-specific URLs.

## Validation performed

- Confirmed no Express runtime references remain in deployable source.
- Confirmed all four Vercel API function files exist and share the server-only Gemini helper.
- Confirmed frontend `/api/chat` reference remains compatible with the serverless route.
- TypeScript parse/type pass showed no project-specific diagnostics after excluding missing-package diagnostics caused by the execution environment being unable to complete `npm install`.
- `npm install` could not be completed in this container because dependency installation timed out; Vercel will perform the normal dependency install during deployment.

## Required Vercel environment variable

`GEMINI_API_KEY`

Do not commit the real key to GitHub.
