# C3.1.1 Deployment Conflict Fix

Observed Vercel build failure:
`Two or more files have conflicting paths or names. The path api/chat.js conflicts with api/chat.ts.`

Cause: GitHub retained legacy TypeScript functions from C3 while the C3.1 additive upload added new JavaScript functions. Vercel maps both extensions to the same route.

Permanent cleanup: delete these legacy files from GitHub:
- api/chat.ts
- api/health.ts
- api/generate-plan.ts
- api/checkpoint-assessment.ts

Keep:
- api/chat.js
- api/health.js
- api/generate-plan.js
- api/checkpoint-assessment.js

Safeguard added: `.vercelignore` explicitly excludes the legacy `.ts` endpoints and old shared server files if they remain present in the repository.

API version bumped to `c3.1.1` for deployment verification.
