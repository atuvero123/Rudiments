import {
  RUDIMENT_SYSTEM_PROMPT,
  getGeminiClient,
  getRequestBody,
  methodNotAllowed,
  sendApiError,
} from '../serverlib/rudiment';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const { durationMinutes, targetTrack, currentLevel, specificFocus } = getRequestBody(req);
    const ai = getGeminiClient();

    const prompt = `Create a detailed, step-by-step ${durationMinutes || 30}-minute drumming practice plan for the "${targetTrack || 'Rudiments'}" skill track at the "${currentLevel || 'Beginner'}" level. ${specificFocus ? `Specific focus: ${specificFocus}` : ''}.
Follow the 5-step practice plan structure: Warm-up, Technique Focus (with explicit tempo ladder), Musical Application, Stretch/Challenge, and Cool-down. Output formatted markdown with clear headers, tempos, sticking patterns, and actionable advice.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: RUDIMENT_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    return res.status(200).json({ plan: response.text || '' });
  } catch (error) {
    return sendApiError(res, 'Generate Plan API Error', error);
  }
}
