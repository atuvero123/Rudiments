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
    const { track, currentLevel, targetLevel } = getRequestBody(req);
    const prompt = `Design a supportive qualitative Checkpoint Assessment explanation for the "${track || 'Rudiments'}" skill track from ${currentLevel || 'Beginner'} toward ${targetLevel || 'Intermediate'}. The app's deterministic curriculum remains authoritative; provide 3-4 concrete self-check criteria, 2 practical tests, and next steps without claiming to certify the student yourself.`;
    const assessment = await generateGeminiText({ contents: prompt, systemInstruction: RUDIMENT_SYSTEM_PROMPT, temperature: 0.7 });
    return res.status(200).json({ apiVersion: 'c3.0', assessment });
  } catch (error) {
    return sendApiError(res, 'Checkpoint API Error', error);
  }
}
