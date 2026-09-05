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
