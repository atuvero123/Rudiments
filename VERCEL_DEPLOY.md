# Rudiment Drum Coach C5 — Vercel Deployment

This package is Vercel-native. The React/Vite frontend builds to `dist/`; AI endpoints are Vercel serverless functions under `api/`.

## Deploy through GitHub + Vercel

1. Extract the ZIP and replace/update the complete contents of your GitHub project with this build.
2. Make sure the `/api` folder contains only:
   - `chat.js`
   - `checkpoint-assessment.js`
   - `generate-plan.js`
   - `health.js`
3. Commit/push the files.
4. In Vercel redeploy the latest GitHub commit.
5. Keep:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: default (`npm install`)
6. Keep `GEMINI_API_KEY` enabled for Production (and Preview if desired).

## API test

Open:

`https://YOUR-DOMAIN.vercel.app/api/health`

Expected C5 fields include:
- `status: "ok"`
- `runtime: "vercel-serverless"`
- `apiVersion: "c5.0"`
- `aiConfigured: true` when the Gemini key is available

## C4 progression validation

1. Open **Today** and note the canonical active competency.
2. Open **Path** and confirm it shows the same active competency.
3. Inspect the new **C4 Advancement Readiness** card.
4. Ordinary practice should build readiness but must not mark the competency Verified.
5. When the readiness card reaches **Ready to Verify**, use **Run Verification**.
6. Complete the full formal BPM/duration test and grade it honestly.
7. A clean pass should immediately move Today/Path to the next canonical competency (or next unit if the unit has completed).
8. A failed test must leave the competency active and create a repair state; it must not advance the curriculum.
9. Confirm Songs/C3.3 mission evidence remains preserved and musical stages remain prerequisite-gated.

See `C4_BUILD_REPORT.md` for the complete implementation report.


## C4.2 teaching-clarity validation

For Quarter-Note Pulse, start a normal practice session and inspect a placement/phrase exercise. The visible **Required Pattern** must remain quarter-note based (for example `R` on a one-beat target or `R R R R` for a full bar). It must not display `R L K` or a sixteenth-note transfer pattern as the current requirement. Any real transfer/orchestration layer is labeled separately and does not replace the Required Pattern.


## C5 placement validation

1. Open **Profile & Progress** and confirm the new **Starting-Level Estimate** control is visible. The estimate is explicitly described as non-certifying.
2. Open **Path**. The top cards should distinguish **Estimated Level** from **Overall Placement**.
3. For an Intermediate estimate with no placement battery completed, Path should offer **Foundation Gate** first, not seven tests at once.
4. Open the placement battery and confirm each test shows tempo, meter/bars and required equipment.
5. Start the first 4/4 anchor and confirm the click is at the stated BPM (not rapid subdivisions). The test cannot be graded before the full timed run completes.
6. Save one test result, close the modal, reopen Path and confirm that anchor remains saved while the remaining tests are still offered.
7. Failed anchors should remain available for retry without deleting passed anchors.
8. Completing all Foundation anchors for an Intermediate estimate should change the next battery to **Intermediate Confirmation** (3 tests).
9. The 6/8 placement anchor should use a two-pulse compound feel.
10. Passing placement anchors may verify their exact canonical competencies, but must not mark unrelated prerequisites or whole units complete.
