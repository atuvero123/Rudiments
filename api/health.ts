import { GEMINI_MODEL, getGeminiConfigStatus, methodNotAllowed } from '../serverlib/rudiment';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const ai = getGeminiConfigStatus();
  return res.status(200).json({
    status: 'ok',
    service: 'Rudiment Drum Coach AI',
    runtime: 'vercel-serverless',
    apiVersion: 'c3.0',
    aiConfigured: ai.configured,
    model: GEMINI_MODEL,
    transport: ai.transport,
  });
}
