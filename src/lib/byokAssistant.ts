import type { CopilotReply } from './localCopilot';

const SETTINGS_KEY = 'fingent-byok-settings';
const MODEL = 'gemini-2.5-flash';

export type ByokSettings = { enabled: boolean; apiKey: string };
export type ByokIntentClass =
  | 'TRANSACTION_RECORDING'
  | 'INVESTMENT_RECORDING'
  | 'TRANSFER_RECORDING'
  | 'RECORD_CREATION'
  | 'NAVIGATION'
  | 'GENERAL_WORKFLOW';

export function getByokSettings(): ByokSettings {
  try {
    // A BYOK key is never written to the app database or a persistent browser store.
    // Closing the browser session clears it.
    const parsed = JSON.parse(sessionStorage.getItem(SETTINGS_KEY) || '{}');
    return { enabled: Boolean(parsed.enabled), apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '' };
  } catch {
    return { enabled: false, apiKey: '' };
  }
}

export function saveByokSettings(settings: ByokSettings) {
  sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** This classification happens locally and intentionally exposes no chat data. */
export function getByokIntentClass(reply: CopilotReply): ByokIntentClass {
  if (reply.transaction) return 'TRANSACTION_RECORDING';
  if (reply.investment) return 'INVESTMENT_RECORDING';
  if (reply.transfer) return 'TRANSFER_RECORDING';
  if (reply.operation) return 'RECORD_CREATION';
  if (reply.navigateNow) return 'NAVIGATION';
  return 'GENERAL_WORKFLOW';
}

export function createByokEnvelope(reply: CopilotReply) {
  return 'Intent class: ' + getByokIntentClass(reply) + '.';
}

/**
 * The only dynamic value in this prompt is one of six fixed intent classes.
 * Never append chat text, chat history, fields, placeholders, IDs, or records here.
 */
export function createByokPrompt(reply: CopilotReply) {
  return [
    'You are FinGent\'s optional BYOK workflow assistant.',
    'Privacy boundary: you receive exactly one generic intent class generated locally. You never receive the original chat message, chat history, names, account labels, categories, dates, amounts, balances, notes, client details, device information, or financial records.',
    'Do not ask for, infer, repeat, or mention private data. Give a concise, generic workflow tip only. All writes require the user\'s explicit confirmation inside FinGent.',
    createByokEnvelope(reply)
  ].join('\n');
}

/**
 * Deterministic commands are fully handled on-device. Optional BYOK is reserved
 * for genuinely unrecognised general requests, and still receives no chat data.
 */
export function shouldUseByokGuidance(reply: CopilotReply) {
  return !reply.transaction && !reply.investment && !reply.transfer && !reply.operation && !reply.navigateNow && !reply.actions?.length;
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
  await callGemini(apiKey, 'Reply with exactly: FinGent BYOK connected. Do not use or request any client information.');
}

export async function getByokGuidance(reply: CopilotReply) {
  const settings = getByokSettings();
  if (!settings.enabled || !settings.apiKey) return null;
  return callGemini(settings.apiKey, createByokPrompt(reply));
}
