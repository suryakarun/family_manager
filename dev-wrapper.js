// dev-wrapper.js — quick helper to test AI parse locally (no Docker, no Supabase)
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const MASTER_PROMPT_PARSE_EVENT = `You are a proactive, conversational Family Calendar AI Assistant.

Extract title, date/recurrence, start_time, end_time (default 1 hour), location, attendees (roles like driver), notes, reminders and return ONLY JSON. Example output:
{
  "title": "Volleyball Practice",
  "recurrence": "WEEKLY",
  "day": "Monday",
  "time": "19:00",
  "duration_minutes": 60,
  "attendees": [{"name":"Me","role":"participant"},{"name":"Parents","role":"driver"}],
  "location":"",
  "notes":"Need parents to drive me",
  "reminders":[{"method":"whatsapp","minutes_before":30}],
  "travel_required": true
}
If you cannot extract, return {"raw":"<friendly clarification question>"}
`;

async function parseEventWithAI(userInput, voiceMode = false) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY environment variable not set');

  const payload = {
    model: process.env.AI_MODEL || 'gpt-4o',
    messages: [
      { role: "system", content: MASTER_PROMPT_PARSE_EVENT },
      { role: "user", content: `${voiceMode ? "VOICE_MODE: true\n" : "VOICE_MODE: false\n"}${userInput}` }
    ],
    temperature: 0.1,
    max_tokens: 800,
  };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const raw = await resp.text();
  console.log('--- OpenAI HTTP status:', resp.status, '---');
  console.log('--- Raw response (first 2000 chars) ---\n', raw.slice(0, 2000), '\n--- end raw ---');

  if (!resp.ok) {
    throw new Error(`OpenAI HTTP ${resp.status}: ${raw}`);
  }

  // Try to parse the standard chat/completions response
  let assistantText = raw;
  try {
    const parsedResp = JSON.parse(raw);
    assistantText = parsedResp?.choices?.[0]?.message?.content ?? parsedResp?.output_text ?? raw;
  } catch (e) {
    // raw not JSON — keep as-is
  }

  console.log('--- Assistant text (extracted) ---\n', assistantText, '\n--- end assistant ---');

  // Try to parse JSON inside assistantText
  try {
    const structured = JSON.parse(assistantText);
    console.log('--- Parsed JSON object ---\n', JSON.stringify(structured, null, 2));
    return { parsed: structured, raw: assistantText };
  } catch (e) {
    console.warn('Assistant did not return strict JSON. Returning raw text as parsed.raw');
    return { parsed: { raw: assistantText }, raw: assistantText };
  }
}

// quick runner
(async () => {
  try {
    const q = process.argv.slice(2).join(' ') || 'create volleyball every Monday at 7 PM';
    console.log('Testing parse for:', q);
    const out = await parseEventWithAI(q, false);
    console.log('\n=== FINAL OUTPUT ===\n', JSON.stringify(out, null, 2));
  } catch (err) {
    console.error('Error:', err.message || err);
    console.error(err.stack || '');
  }
})();
