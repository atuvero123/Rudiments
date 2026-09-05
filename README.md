<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e743513a-aa4f-42e6-8b9f-1f9b4f51ebed

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## C2 direct-development build

This snapshot includes the integrated C2 teaching flow: **Understand → Count → Watch → Follow → Play → Evaluate**, Count & Clap, differentiated drum voices, Sound Check, assistance fading, and independent-play evidence gating. See [`C2_BUILD_REPORT.md`](./C2_BUILD_REPORT.md) for implementation and validation details.

## Vercel deployment

This C2 package has been converted to Vercel-native serverless API routes. See `VERCEL_DEPLOY.md` for the exact deployment steps. The previous Express server is retained only under `legacy/` for reference.


## C3 — Musical Application & Play-Along Engine

C3 adds original no-drum curriculum play-alongs and arrangement coaching. The current canonical competency recommends an appropriate backing track, verified vocabulary determines which variations/fill challenges are available, and Today can launch the current musical application directly. See `C3_BUILD_REPORT.md` and `VERCEL_DEPLOY.md`.

## C3.2 — Musical Development

C3.2 adds a curriculum-gated 4/4 musical-development path on top of the existing original no-drum play-alongs. The pathway develops pulse → backbeat → groove variation → fill phrasing → rudiment application → constrained creativity → full arrangement performance. Today launches the musical-development step associated with the current canonical competency.

Coach Chat also retries temporary Gemini capacity errors automatically and preserves the learner's question for a one-tap retry if the service remains busy.


## C3.3 — Groove Development & Creativity

C3.3 deepens each 4/4 musical-development stage into sequential missions. Groove stages now move from a trusted base pattern into audible variations, controlled A/B switching, learner-created one-element variations, section-based choices, phrase-length fill work, rudiment orchestration, restraint and full-arrangement ownership. Mission evidence is stored separately from canonical curriculum certification; older successful C3.2 application evidence is grandfathered so existing progress is preserved.

## C3.3.1 — Progress Integrity Repair

C3.3.1 corrects legacy C3.2 migration. A successful pre-mission Step completion now preserves musical-application evidence and credits only Mission 1, rather than falsely marking every later C3.3 mission complete. Explicit C3.3 mission attempts are then merged normally, so Mission 2+ must be earned through their own qualifying evidence. Canonical curriculum prerequisites and certification are unchanged.

## C4 — Assessment, Advancement & Daily Coaching Hardening

C4 closes the curriculum loop: ordinary practice builds readiness, but only a completed practical verification at the canonical standard certifies a competency. Today and Path now share the same advancement-readiness state, successful verification automatically moves the canonical path forward, failed verification creates a repair path without deleting progress, and Profile & Progress shows recent formal curriculum advances. See `C4_BUILD_REPORT.md`.


## C4.1 — Pattern & Teaching Clarity

C4.1 separates **what the learner must play now** from later transfer/orchestration ideas. Guided Practice now labels the active sticking as **Required Pattern — Play this now**, counting is explicitly described as how to count that required pattern, and transfer/accent/orchestration material has its own clearly identified layer. The placement generator also now derives timing-foundation patterns from canonical teaching definitions instead of using the old generic R-L-K fill fallback. Quarter-Note Pulse therefore remains quarter notes throughout warm-up, calibration, placement and landing practice.
