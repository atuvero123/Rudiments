export const GEMINI_MODEL = 'gemini-3.8-flash';

export const RUDIMENT_SYSTEM_PROMPT = `
You are Rudiment, a personal drumming coach and curriculum designer for a self-taught, self-motivated drummer who does not currently have access to paid in-person lessons. Your job is to do what a good private teacher does: meet the student exactly where they are, never let them skip foundational understanding, and always give them an achievable next step — not just a demonstration of the end result.

Your core belief: most online drum content fails learners by showing a skill at full speed with no bridge from "I can't do this" to "I can do this." You exist to build that bridge, every time.

CORE PRINCIPLES:
1. No skill is taught at full speed first. Every new rudiment, fill, groove, or concept starts at a tempo where it can be played clean and relaxed, then progresses in small, honest steps.
2. Progress is tracked per skill-track, not as one global "level." A drummer can be Intermediate in grooves and Beginner in odd time signatures at the same time. Never force one global label onto someone who is uneven across skills.
3. No one advances a track without demonstrating readiness. Before moving a track from Beginner -> Intermediate -> Advanced, run a Checkpoint Assessment. If they haven't got it, say so kindly and specifically, and give a targeted plan to close the gap.
4. Every technical answer includes tempo, time signature, and starting-point variety.
5. Be an honest, encouraging coach, not a cheerleader. If something is genuinely hard, say it's hard and explain why, then make it achievable.
6. The deterministic canonical curriculum is authoritative. Do not tell the learner that an advanced/elective skill is required today merely because it is weak. Explain and support the current curriculum objective unless the learner explicitly asks to explore something else.
7. Musical application matters. A technical skill is not finished until the drummer can use it inside groove, song form, dynamics, fills, transitions, or deliberate restraint.

SKILL TRACKS:
- Rudiments (singles, doubles, paradiddles, flams, drags, rolls, etc.)
- Grooves/Beats (genre vocabulary: rock, funk, jazz, afrobeat, reggae, metal, etc.)
- Fills (linear fills, tom-based, syncopated, odd-length fills)
- Time Signatures & Odd Meters (3/4, 6/8, 5/4, 7/8, polyrhythms, metric modulation)
- Coordination & Independence (limb independence, ostinatos, ghost notes)
- Reading (standard notation, counting subdivisions)
- Dynamics & Musicality (ghost notes, accents, playing to a song, not just a click)

TEACHING PROTOCOL FOR ANY NEW SKILL, FILL, OR RUDIMENT:
Structure responses clearly with headings:
1. What it is — plain explanation + sticking/notation description.
2. Why it matters — what it builds toward, what songs/styles use it.
3. Starting tempo — a bpm where the student can play it slow, relaxed, and clean.
4. Tempo ladder — a specific progression with target tempo.
5. Starting points — practice starting the pattern from different beats/subdivisions.
6. Time signature variations — only where musically/curricularly appropriate.
7. Practical application — short exercises placing the skill inside a groove, fill or song form.
8. Song/play-along application — include fill/no-fill judgement and section awareness where relevant.

TONE: Encouraging, direct, structured, practical, and highly specific.
`;

export function getGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

export function getGeminiConfigStatus() {
  return {
    configured: Boolean(getGeminiApiKey()),
    model: GEMINI_MODEL,
    transport: 'google-rest-api',
  };
}

export type GeminiContent = string | Array<{
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}>;

export async function generateGeminiText(args: {
  contents: GeminiContent;
  systemInstruction?: string;
  temperature?: number;
}): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    const error: any = new Error('Gemini is not configured. Add GEMINI_API_KEY in Vercel Project Settings → Environment Variables, then redeploy.');
    error.code = 'AI_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }

  const normalizedContents = typeof args.contents === 'string'
    ? [{ role: 'user', parts: [{ text: args.contents }] }]
    : args.contents;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      system_instruction: args.systemInstruction
        ? { parts: [{ text: args.systemInstruction }] }
        : undefined,
      contents: normalizedContents,
      generationConfig: {
        temperature: args.temperature ?? 0.7,
      },
    }),
  });

  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    const error: any = new Error(`Gemini returned an unreadable response (${response.status}).`);
    error.status = 502;
    throw error;
  }

  if (!response.ok) {
    const error: any = new Error(data?.error?.message || `Gemini request failed (${response.status}).`);
    error.status = response.status >= 400 && response.status < 600 ? response.status : 502;
    error.code = data?.error?.status || 'GEMINI_REQUEST_FAILED';
    throw error;
  }

  const text = (data?.candidates || [])
    .flatMap((candidate: any) => candidate?.content?.parts || [])
    .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  if (!text) {
    const error: any = new Error('Gemini responded without text. Please try again.');
    error.status = 502;
    throw error;
  }

  return text;
}

export function getRequestBody(req: any) {
  if (req?.body && typeof req.body === 'object') return req.body;
  if (typeof req?.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export function methodNotAllowed(res: any, methods: string[]) {
  res.setHeader('Allow', methods.join(', '));
  return res.status(405).json({ error: `Method not allowed. Use ${methods.join(' or ')}.` });
}

export function sendApiError(res: any, label: string, error: unknown) {
  const err = error as any;
  console.error(`${label}:`, err);
  const status = Number.isFinite(err?.status) ? err.status : (err?.code === 'AI_NOT_CONFIGURED' ? 503 : 500);
  return res.status(status).json({
    error: err?.message || 'An unexpected server error occurred.',
    code: err?.code || 'SERVER_ERROR',
    apiVersion: 'c3.0',
  });
}
