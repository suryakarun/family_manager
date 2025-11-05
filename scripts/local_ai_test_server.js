// Simple local test parser for ai-event-assistant when Deno or OpenAI are not available.
// Listens on port 3000 and exposes POST /test-parse which accepts JSON body or ?q= query.

const http = require('http');
const url = require('url');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function mockParse(message) {
  const lower = (message || '').toLowerCase();
  if (lower.includes('volleyball') && lower.includes('monday') && lower.includes('7')) {
    return {
      type: 'event',
      message: "Got it! I've scheduled volleyball practice every Monday at 7 PM.",
      event: {
        title: 'Volleyball Practice',
        recurrence: 'WEEKLY',
        day_of_week: 'Monday',
        start_time: '19:00',
        duration_minutes: 60,
        location: null,
        notes: null,
        driving_needed: false,
        attendees: [ { name: 'Me', role: 'participant' } ],
        reminders: [ { method: 'whatsapp', minutes_before: 30 } ]
      },
      suggestions: [ 'Add reminder to bring volleyball gear.' ],
      conversation_id: 'local-mock-' + Date.now()
    };
  }

  // default chat response
  return {
    type: 'chat',
    message: `I understood: "${message}". (local mock response)`,
    conversation_id: 'local-mock-' + Date.now()
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type, authorization',
    });
    return res.end();
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/test-parse') {
    try {
      const bodyText = await readBody(req);
      let message = parsedUrl.query.q || '';
      if (!message && bodyText) {
        try { 
          const obj = JSON.parse(bodyText);
          message = obj.message || obj.q || '';
        } catch (e) {
          // ignore parse error
        }
      }

      if (!message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing message (either ?q= or JSON { message })' }));
      }

      const parsed = mockParse(String(message));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(parsed));
    } catch (err) {
      console.error('Local parser error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: String(err) }));
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Local AI test server listening on http://localhost:${port}`));

