// Appel au modèle d'IA, partagé par les questions des abonnés et l'argumentation des analyses.
// Anthropic en direct si une clé existe, sinon Vercel AI Gateway avec le jeton OIDC du déploiement (ou une clé AI Gateway).
import { GATEWAY_MODEL, aiProvider } from "./pro";

let pausedUntil = 0; // après un refus (crédit épuisé, limite de débit), l'IA est laissée de côté 2 minutes

export async function complete({ system = "", user, maxTokens = 450, oidc = null, timeout = 25000 }) {
  const provider = aiProvider();
  if (!provider) throw new Error("IA non configurée");
  if (Date.now() < pausedUntil) throw new Error("IA en pause après un refus");
  let res;
  if (provider === "anthropic") {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: maxTokens, ...(system ? { system } : {}), messages: [{ role: "user", content: user }] }),
    });
  } else {
    const token = process.env.AI_GATEWAY_API_KEY || oidc || process.env.VERCEL_OIDC_TOKEN;
    if (!token) throw new Error("jeton AI Gateway absent");
    res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
      body: JSON.stringify({ model: GATEWAY_MODEL, max_tokens: maxTokens, messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: user }] }),
    });
  }
  if (!res.ok) {
    if ([401, 402, 403, 429].includes(res.status)) pausedUntil = Date.now() + 2 * 60e3;
    throw new Error(`réponse ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const text = provider === "anthropic"
    ? (data.content || []).map((c) => c.text || "").join("")
    : data.choices?.[0]?.message?.content || "";
  return text.trim();
}
