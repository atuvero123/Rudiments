import {
  RUDIMENT_SYSTEM_PROMPT,
  generateGeminiText,
  getRequestBody,
  methodNotAllowed,
  sendApiError,
} from '../serverlib/rudiment';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Rudiment-API-Version', 'c3.0');
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const { messages, currentTrackLevels, learnerProfile, skillsSummary } = getRequestBody(req);
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages payload.', apiVersion: 'c3.0' });
    }

    let contextSupplement = '';
    if (currentTrackLevels && typeof currentTrackLevels === 'object') {
      contextSupplement += `\n\nCURRENT STUDENT TRACK LEVELS:\n${JSON.stringify(currentTrackLevels, null, 2)}`;
    }
    if (learnerProfile && typeof learnerProfile === 'object') {
      contextSupplement += `\n\nLEARNER PROFILE & PRACTICE CONTEXT:\n- Equipment: ${learnerProfile.equipment || 'Both'}\n- Practice Time: ${learnerProfile.typicalPracticeTime || '60–120 min'}\n- Priority: ${learnerProfile.practicePriority || 'Balanced'}\n- Responsibilities: ${learnerProfile.musicalResponsibilities || 'Worship drummer'}\n- Genres: ${Array.isArray(learnerProfile.mainGenres) ? learnerProfile.mainGenres.join(', ') : ''}\n- Goals: ${Array.isArray(learnerProfile.personalGoals) ? learnerProfile.personalGoals.join('; ') : ''}`;
    }
    if (skillsSummary && typeof skillsSummary === 'object') {
      contextSupplement += `\n\nGRANULAR SKILLS BREAKDOWN:\n${JSON.stringify(skillsSummary, null, 2)}`;
    }

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: String(m.content || '') }],
    }));

    const reply = await generateGeminiText({
      contents,
      systemInstruction: RUDIMENT_SYSTEM_PROMPT + contextSupplement,
      temperature: 0.7,
    });

    return res.status(200).json({ apiVersion: 'c3.0', reply });
  } catch (error) {
    return sendApiError(res, 'Chat API Error', error);
  }
}
