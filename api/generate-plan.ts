import {
  RUDIMENT_SYSTEM_PROMPT,
  generateGeminiText,
  getRequestBody,
  methodNotAllowed,
  sendApiError,
} from '../serverlib/rudiment';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const { durationMinutes, targetTrack, currentLevel, specificFocus } = getRequestBody(req);
    const prompt = `Create a detailed, step-by-step ${durationMinutes || 30}-minute drumming practice plan for the "${targetTrack || 'Rudiments'}" skill track at the "${currentLevel || 'Beginner'}" level. ${specificFocus ? `Specific focus: ${specificFocus}` : ''}. Keep the plan curriculum-aware and include musical application rather than disconnected random skills.`;
    const plan = await generateGeminiText({ contents: prompt, systemInstruction: RUDIMENT_SYSTEM_PROMPT, temperature: 0.7 });
    return res.status(200).json({ apiVersion: 'c3.0', plan });
  } catch (error) {
    return sendApiError(res, 'Generate Plan API Error', error);
  }
}
