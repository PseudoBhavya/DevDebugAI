/**
 * Gemini API client.
 *
 * Supports two key formats from Google AI Studio:
 *  - Classic API keys   (AIzaSy...)  → sent as ?key= query param
 *  - OAuth tokens       (AQ....)     → sent as Bearer Authorization header
 */

const MODEL = 'gemini-2.0-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

interface GeminiRequestBody {
  system_instruction?: { parts: { text: string }[] };
  contents: { role: string; parts: { text: string }[] }[];
  generationConfig?: { maxOutputTokens: number };
}

export async function callGemini(userMsg: string, systemMsg: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in .env.local');

  // AQ. prefix = OAuth bearer token. AIzaSy prefix = classic API key.
  const isOAuthToken = apiKey.startsWith('AQ.');

  const url = isOAuthToken ? BASE_URL : `${BASE_URL}?key=${apiKey}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isOAuthToken) headers['Authorization'] = `Bearer ${apiKey}`;

  const body: GeminiRequestBody = {
    system_instruction: { parts: [{ text: systemMsg }] },
    contents: [{ role: 'user', parts: [{ text: userMsg }] }],
    generationConfig: { maxOutputTokens: 1024 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}
