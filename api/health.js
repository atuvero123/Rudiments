export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Rudiment-API-Version', 'c6.1');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      status: 'error',
      error: 'Method not allowed. Use GET.',
      apiVersion: 'c6.1',
    });
  }

  return res.status(200).json({
    status: 'ok',
    service: 'Rudiment Drum Coach AI',
    runtime: 'vercel-serverless',
    apiVersion: 'c6.1',
    aiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    model: 'gemini-3.8-flash',
    fallbackModel: (process.env.GEMINI_FALLBACK_MODEL || '').trim() || null,
    transport: 'google-rest-api',
    retryPolicy: 'busy-response automatic retry x3',
    timestamp: new Date().toISOString(),
  });
}
