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
    const { track, currentLevel, targetLevel } = getRequestBody(req);
    const ai = getGeminiClient();

    const prompt = `Design a Checkpoint Assessment to test whether the student is ready to advance in the "${track || 'Rudiments'}" skill track from ${currentLevel || 'Beginner'} to ${targetLevel || 'Intermediate'}.
Provide:
1. 3-4 specific self-check assessment criteria with concrete BPMs and durations.
2. 2 practical drum tests (e.g. play X pattern cleanly for 1 minute at Y bpm without rushing).
3. Clear indicators of failure vs passing.
4. Next steps if they pass or fail.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: RUDIMENT_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    return res.status(200).json({ assessment: response.text || '' });
  } catch (error) {
    return sendApiError(res, 'Checkpoint API Error', error);
  }
}
