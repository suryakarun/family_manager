// netlify/functions/parse-event.js
const fetch = require("node-fetch");

/**
 * Proxy endpoint that forwards a JSON payload to Foundry's function invoke URL.
 * Expects POST JSON: { text, family_id?, timezone?, members? }
 * Returns whatever Foundry returns (JSON or text).
 */
exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const foundryUrl = process.env.FOUNDRY_AI_URL;
  const foundryToken = process.env.FOUNDRY_TOKEN;

  if (!foundryUrl || !foundryToken) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server not configured" }) };
  }

  try {
    const body = JSON.parse(event.body);

    const resp = await fetch(foundryUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${foundryToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const text = await resp.text();

    try {
      const json = JSON.parse(text);
      return { statusCode: resp.status, body: JSON.stringify(json) };
    } catch (e) {
      return { statusCode: resp.status, body: text };
    }
  } catch (err) {
    console.error("Proxy error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "proxy failed", details: String(err) }) };
  }
};
