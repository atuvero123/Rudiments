const API_VERSION = 'c3.1.1';
const GEMINI_MODEL = 'gemini-3.8-flash';
const SYSTEM_PROMPT = "You are Rudiment, a personal drumming coach and curriculum designer for a self-taught, self-motivated drummer. Meet the student exactly where they are, never let them skip foundational understanding, and always give an achievable next step.\n\nCORE RULES:\n1. The deterministic canonical curriculum is authoritative. Do not introduce unrelated weak skills as required work.\n2. Start new skills slow, relaxed, and clean before increasing tempo.\n3. Treat levels per strand, not as one global ability.\n4. Every technical answer should include tempo, meter/subdivision where relevant, and practical musical application.\n5. Musical application matters: groove, song form, dynamics, fills, transitions, and deliberate restraint.\n6. Be encouraging, direct, structured, and specific.\n";

function readBody(req) {
  if (req && req.body && typeof req.body === 'object') return req.body;
  if (req && typeof req.body === 'string' && req.body.trim()) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

async function callGemini({ contents, systemInstruction, temperature = 0.7 }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    const error = new Error('Gemini is not configured. Add GEMINI_API_KEY in Vercel Project Settings → Environment Variables, then redeploy.');
    error.status = 503;
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }

  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(GEMINI_MODEL) + ':generateContent';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        contents,
        generationConfig: { temperature },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    const error = new Error(err && err.name === 'AbortError' ? 'Gemini request timed out. Please try again.' : 'Could not reach Gemini from the serverless function.');
    error.status = 502;
    error.code = err && err.name === 'AbortError' ? 'AI_TIMEOUT' : 'AI_NETWORK_ERROR';
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; }
  catch {
    const error = new Error('Gemini returned an unreadable response (' + response.status + ').');
    error.status = 502;
    error.code = 'AI_BAD_RESPONSE';
    throw error;
  }

  if (!response.ok) {
    const error = new Error((data && data.error && data.error.message) || ('Gemini request failed (' + response.status + ').'));
    error.status = response.status >= 400 && response.status < 600 ? response.status : 502;
    error.code = (data && data.error && data.error.status) || 'GEMINI_REQUEST_FAILED';
    throw error;
  }

  const text = ((data && data.candidates) || [])
    .flatMap((candidate) => (candidate && candidate.content && candidate.content.parts) || [])
    .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  if (!text) {
    const error = new Error('Gemini responded without text. Please try again.');
    error.status = 502;
    error.code = 'AI_EMPTY_RESPONSE';
    throw error;
  }
  return text;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Rudiment-API-Version', API_VERSION);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.', apiVersion: API_VERSION });
  }

  try {
    const { messages, currentTrackLevels, learnerProfile, skillsSummary } = readBody(req);
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages payload.', apiVersion: API_VERSION });
    }

    let contextSupplement = '';
    if (currentTrackLevels && typeof currentTrackLevels === 'object') {
      contextSupplement += '\n\nCURRENT STUDENT TRACK LEVELS:\n' + JSON.stringify(currentTrackLevels, null, 2);
    }
    if (learnerProfile && typeof learnerProfile === 'object') {
      contextSupplement += '\n\nLEARNER PROFILE & PRACTICE CONTEXT:\n' + JSON.stringify(learnerProfile, null, 2);
    }
    if (skillsSummary && typeof skillsSummary === 'object') {
      contextSupplement += '\n\nGRANULAR SKILLS BREAKDOWN:\n' + JSON.stringify(skillsSummary, null, 2);
    }

    const contents = messages.map((m) => ({
      role: m && m.role === 'user' ? 'user' : 'model',
      parts: [{ text: String((m && m.content) || '') }],
    }));

    const reply = await callGemini({
      contents,
      systemInstruction: SYSTEM_PROMPT + contextSupplement,
      temperature: 0.7,
    });

    return res.status(200).json({ apiVersion: API_VERSION, reply });
  } catch (err) {
    console.error('Chat API Error:', err);
    const status = Number.isFinite(err && err.status) ? err.status : 500;
    return res.status(status).json({
      error: (err && err.message) || 'An unexpected server error occurred.',
      code: (err && err.code) || 'SERVER_ERROR',
      apiVersion: API_VERSION,
    });
  }
}
