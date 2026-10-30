// Questions personnelles à l'IA (Pro et Lifetime) : l'IA répond à la question d'un abonné sur un match,
// uniquement à partir des données de l'analyse Basketlog. Aucun conseil de pari.
import { GATEWAY_MODEL, aiProvider } from "./pro";

const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);
const pc = (p) => (Number.isFinite(p) ? Math.round(p * 1000) / 10 : null);

function side(s) {
  if (!s) return null;
  return {
    equipe: s.team?.name || null,
    bilan_saison: s.cur ? `${s.cur.wins}-${s.cur.losses}` : null,
    points_marques_par_match: r1(s.ppg),
    points_encaisses_par_match: r1(s.oppg),
    ecart_moyen_par_match: r1(s.diff),
    serie_en_cours: s.cur?.streak || null,
    dix_derniers_matchs: s.cur?.last10 || null,
    bilan_a_domicile: s.cur?.home || null,
    bilan_a_l_exterieur: s.cur?.road || null,
    saison_passee: s.prev ? `${s.prev.wins}-${s.prev.losses}` : null,
    absents: (s.inj?.out || []).map((i) => i.player),
    incertains: (s.inj?.doubtful || []).map((i) => i.player),
    a_joue_la_veille: typeof s.b2b === "boolean" ? s.b2b : null,
  };
}

export function matchContext(a, league) {
  const g = a.game;
  const played = g.state !== "pre" && g.home.score != null;
  return {
    competition: league === "EL" ? "EuroLeague" : "NBA",
    domicile: g.home.name,
    exterieur: g.away.name,
    date: g.date || "match hypothétique, pas de rencontre prévue",
    statut: g.state === "post" ? "terminé" : g.state === "in" ? "en cours" : "à venir",
    score: played ? `${g.home.short} ${g.home.score} - ${g.away.score} ${g.away.short}` : null,
    probabilite_de_victoire: { [g.home.name]: `${pc(a.pHome)} %`, [g.away.name]: `${pc(a.pAway)} %` },
    score_projete: `${g.home.short} ${Math.round(a.homePts)} - ${Math.round(a.awayPts)} ${g.away.short}`,
    total_projete: Math.round(a.total),
    ecart_projete_pour_le_domicile: r1(a.margin),
    confiance_du_modele: a.confidence,
    scenarios: (a.scenarios || []).map((s) => `${s.label} : ${pc(s.p)} %`),
    facteurs: (a.factors || []).map((f) => `${f.label} : ${f.value > 0 ? "+" : ""}${r1(f.value)} pt pour ${g.home.short} (${f.detail})`),
    equipes: [side(a.home), side(a.away)],
  };
}

// IA qui répond : Anthropic en direct si une clé existe, sinon Vercel AI Gateway (jeton OIDC du déploiement,
// transmis par la requête, ou clé AI Gateway).
async function complete(system, user, oidc) {
  const provider = aiProvider();
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: 450, system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) throw new Error(`réponse ${res.status} ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return (data.content || []).map((c) => c.text || "").join("").trim();
  }
  if (provider === "gateway") {
    const token = process.env.AI_GATEWAY_API_KEY || oidc || process.env.VERCEL_OIDC_TOKEN;
    if (!token) throw new Error("jeton AI Gateway absent");
    const res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({ model: GATEWAY_MODEL, max_tokens: 450, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
    if (!res.ok) throw new Error(`réponse ${res.status} ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return (data.choices?.[0]?.message?.content || "").trim();
  }
  return "";
}

export async function askAI(a, league, question, lang = "fr", oidc = null) {
  if (!aiProvider()) return null;
  const langue = lang === "en" ? "anglais" : lang === "es" ? "espagnol d'Espagne, en tutoyant" : "français, en tutoyant";
  const system = [
    `Tu es l'assistant d'analyse de Basketlog, un site d'analyse statistique de matchs de basket (NBA et EuroLeague).`,
    `Tu réponds à la question personnelle d'un abonné sur un match, en ${langue}, en 2 à 6 phrases claires, sans titre ni liste.`,
    `Appuie-toi uniquement sur les données du match fournies : n'invente aucun chiffre, joueur, blessure ou résultat absent de ces données. Si l'information manque, dis-le simplement.`,
    `Les probabilités sont des estimations du modèle, jamais des certitudes.`,
    `Ne donne aucun conseil de pari, aucune cote ni aucune mise, et n'incite jamais à parier : si on te le demande, rappelle que Basketlog est un outil d'analyse, pas un site de paris.`,
    `Si la question ne porte pas sur ce match ou sur le basket, réponds poliment que tu ne réponds qu'aux questions sur ce match.`,
  ].join("\n");
  try {
    const user = `Données du match (JSON) :\n${JSON.stringify(matchContext(a, league))}\n\nQuestion de l'abonné : ${question}`;
    return (await complete(system, user, oidc)) || null;
  } catch (e) {
    console.warn(`[ia] indisponible (${e.message})`);
    return null;
  }
}
