import type { CopilotReply } from './localCopilot';

const SETTINGS_KEY = 'fingent-byok-settings';
const MODEL = 'gemini-2.5-flash';

export type ByokSettings = { enabled: boolean; apiKey: string };

export function getByokSettings(): ByokSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { enabled: Boolean(parsed.enabled), apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '' };
  } catch {
    return { enabled: false, apiKey: '' };
  }
}

export function saveByokSettings(settings: ByokSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function createByokEnvelope(reply: CopilotReply) {
  if (reply.transaction) return reply.transaction.redactedCommand;
  if (reply.investment) return reply.investment.redactedCommand;
  if (reply.transfer) return reply.transfer.redactedCommand;
  if (reply.operation) return reply.operation.redactedCommand;
  if (reply.navigateNow) return 'Action: NAVIGATE to [' + reply.navigateNow.toUpperCase() + '].';
  return 'Action: Provide general FinGent workflow guidance. No client data, names, amounts, balances, or raw user text is available.';
}

async function callGemini(apiKey: string, prompt: string) {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent?key=' + encodeURIComponent(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 220 }
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || 'The Gemini API key could not be verified.');
  const text = body?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('').trim();
  if (!text) throw new Error('Gemini returned no text.');
  return text;
}

export async function testByokKey(apiKey: string) {
  await callGemini(apiKey, 'Reply with exactly: FinGent BYOK connected.');
}

export async function getByokGuidance(reply: CopilotReply) {
  const settings = getByokSettings();
  if (!settings.enabled || !settings.apiKey) return null;
  const prompt = [
    'You are FinGent’s optional BYOK workflow assistant.',
    'The app only supplies a tokenized intent envelope. Do not request, infer, or mention account names, balances, amounts, client details, or financial recommendations.',
    'Give a concise, practical workflow explanation for the intent. The user must explicitly confirm all writes locally.',
    'Tokenized intent: ' + createByokEnvelope(reply)
  ].join('\n');
  return callGemini(settings.apiKey, prompt);
}
