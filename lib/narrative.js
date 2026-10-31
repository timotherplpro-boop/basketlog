// Génère le récit d'avant-match. Si une IA est branchée (clé Anthropic ou Vercel AI Gateway), elle rédige le texte
// à partir des chiffres du modèle ; sinon un rédacteur à base de règles prend le relais.
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { fmt, pct } from "./model";
import { GATEWAY_MODEL, aiProvider } from "./pro";
import { complete } from "./llm";
import { deFr } from "./i18n";

function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

export function ruleNarrative(a, L) {
  if (L?.en) return ruleNarrativeEn(a);
  if (L?.es) return ruleNarrativeEs(a);
  const { home: h, away: aw, fav, dog } = a;
  const seed = Number(String(a.id).replace(/\D/g, "")) || 7;
  const favP = Math.max(a.pHome, a.pAway);
  const spread = Math.abs(a.margin);
  // NBA : « les Lakers » (pluriel) · EuroLeague : « Real Madrid » (nom du club, singulier).
  const nba = a.league !== "EL";
  const T = (s) => (nba ? `les ${s.team.short}` : s.team.short);
  const Tc = (s) => { const x = T(s); return x.charAt(0).toUpperCase() + x.slice(1); };
  const de = (s) => (nba ? `des ${s.team.short}` : deFr(s.team.short));
  const v = (pl, sg) => (nba ? pl : sg);
  const dec = (x) => x.toFixed(1).replace(".", ",");
  const sg = (x) => fmt(x).replace(".", ",");
  const lines = [];

  const intro =
    favP > 0.72
      ? pick([
          `${Tc(fav)} ${v("partent", "part")} avec une vraie longueur d'avance.`,
          `Sur le papier, ${T(fav)} ${v("dominent", "domine")} nettement ce duel.`,
        ], seed)
      : favP > 0.58
      ? pick([
          `${Tc(fav)} ${v("sont favoris", "est favori")}, sans que l'écart soit écrasant.`,
          `Léger avantage pour ${T(fav)}, mais ${T(dog)} ${v("ont", "a")} les armes pour accrocher.`,
        ], seed)
      : pick([
          `Match très ouvert : le modèle ne sépare presque pas les deux équipes.`,
          `Pile ou face, ou presque : rien ne détache vraiment l'un des deux camps.`,
        ], seed);
  lines.push(intro);

  lines.push(
    `Le modèle projette ${h.team.short} ${Math.round(a.homePts)} – ${Math.round(a.awayPts)} ${aw.team.short}, soit environ ${dec(spread)} points d'écart en faveur ${de(fav)} et un total autour de ${Math.round(a.total)} points.`
  );

  const [hi, lo, std] = a.league === "EL" ? [172, 156, "au rythme habituel de l'EuroLeague"] : [232, 220, "au rythme NBA standard"];
  const pace = a.total > hi ? "rythmé et offensif" : a.total < lo ? "plus fermé, à scores contenus" : std;
  lines.push(`On s'attend à un match ${pace}.`);

  if (h.b2b || aw.b2b) {
    const both = h.b2b && aw.b2b;
    const t = [h.b2b && T(h), aw.b2b && T(aw)].filter(Boolean).join(" et ");
    const x = t.charAt(0).toUpperCase() + t.slice(1);
    lines.push(`${x} ${both || nba ? "ont" : "a"} joué la veille : la fatigue pèse souvent dans le dernier quart-temps.`);
  }
  const injLines = [h, aw]
    .filter((s) => s.inj.out.length)
    .map((s) => `${Tc(s)} ${v("doivent", "doit")} composer sans ${s.inj.out.slice(0, 2).map((i) => i.player).join(" ni ")}${s.inj.out.length > 2 ? ` (et ${s.inj.out.length - 2} autre${s.inj.out.length > 3 ? "s" : ""})` : ""}`);
  if (injLines.length) lines.push(injLines.join(". ") + ".");

  if (a.minSample < 5)
    lines.push(`Début de saison : les chiffres s'appuient encore beaucoup sur l'exercice précédent, la confiance reste prudente.`);

  const keys = [];
  if (Math.abs(h.diff - aw.diff) > 4) keys.push(`L'écart de niveau global (${sg(h.diff)} contre ${sg(aw.diff)} pts/match) est le facteur principal.`);
  keys.push(`${Tc(dog)} ${v("doivent", "doit")} gagner la bataille du rythme pour rester dans le match.`);
  if (h.ppg > aw.ppg + 3) keys.push(`L'attaque ${de(h)} (${dec(h.ppg)} pts/match) est la plus productive des deux.`);
  else if (aw.ppg > h.ppg + 3) keys.push(`L'attaque ${de(aw)} (${dec(aw.ppg)} pts/match) est la plus productive des deux.`);
  if (h.oppg < aw.oppg - 3) keys.push(`La défense ${de(h)} encaisse nettement moins (${dec(h.oppg)} pts/match).`);
  else if (aw.oppg < h.oppg - 3) keys.push(`La défense ${de(aw)} encaisse nettement moins (${dec(aw.oppg)} pts/match).`);

  return { text: lines.join(" "), keys: keys.slice(0, 4), source: "rules", verdict: `${fav.team.short} ${pct(favP)}` };
}

// Jeton OIDC de la requête en cours (Vercel AI Gateway), absent hors requête.
async function requestOidc() {
  try { return (await headers()).get("x-vercel-oidc-token"); } catch { return null; }
}

export async function aiNarrative(a, L) {
  const fallback = ruleNarrative(a, L);
  const provider = aiProvider();
  if (!provider) return fallback;
  const lang = L?.en ? "en" : L?.es ? "es" : "fr";
  const payload = {
    competition: a.league === "EL" ? "EuroLeague" : "NBA",
    domicile: a.home.team.name,
    exterieur: a.away.team.name,
    proba_domicile: Math.round(a.pHome * 100),
    score_projete: `${Math.round(a.homePts)}-${Math.round(a.awayPts)}`,
    total_projete: Math.round(a.total),
    facteurs: a.factors.map((f) => `${f.label}: ${fmt(f.value)} (${f.detail})`),
    absents_domicile: a.home.inj.out.map((i) => i.player),
    absents_exterieur: a.away.inj.out.map((i) => i.player),
    back_to_back: { domicile: a.home.b2b, exterieur: a.away.b2b },
    debut_de_saison: a.minSample < 5,
  };
  const oidc = await requestOidc();
  // Une rédaction par match, par langue et par état des données : le crédit IA n'est dépensé que si un chiffre change.
  const write = unstable_cache(async (json, lg) => {
    const langue = lg === "en" ? "en anglais" : lg === "es" ? "en espagnol (Espagne, tutoiement)" : "en français";
    const raw = await complete({
      user: `Tu es analyste basket. Rédige ${langue} une analyse d'avant-match de 90 à 130 mots, ton direct et vivant, sans inventer de chiffres ni de joueurs absents de ces données. Ne donne aucun conseil de pari. Réponds uniquement en JSON {"text": "...", "keys": ["3 clés du match, une phrase chacune"]}.\nDonnées : ${json}`,
      maxTokens: 500,
      oidc,
      timeout: 9000,
    });
    const out = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    if (!out.text) throw new Error("réponse sans texte");
    return { text: String(out.text), keys: (Array.isArray(out.keys) ? out.keys : []).slice(0, 4).map(String) };
  }, ["recit-ia-v1", provider, provider === "gateway" ? GATEWAY_MODEL : process.env.ANTHROPIC_MODEL || ""], { revalidate: 86400 });
  try {
    return { ...(await write(JSON.stringify(payload), lang)), source: "ai", verdict: fallback.verdict };
  } catch (e) {
    console.warn(`[ia] argumentation indisponible (${e.message})`);
    return fallback;
  }
}

// Version anglaise du rédacteur à base de règles.
function ruleNarrativeEn(a) {
  const { home: h, away: aw, fav, dog } = a;
  const seed = Number(String(a.id).replace(/\D/g, "")) || 7;
  const favP = Math.max(a.pHome, a.pAway);
  const spread = Math.abs(a.margin);
  // NBA: "the Knicks" (plural nickname) · EuroLeague: "Real Madrid" (club name).
  const nba = a.league !== "EL";
  const T = (s) => (nba ? `the ${s.team.short}` : s.team.short);
  const Tc = (s) => { const x = T(s); return x.charAt(0).toUpperCase() + x.slice(1); };
  const poss = (s) => { const x = Tc(s); return /s$/.test(x) ? `${x}'` : `${x}'s`; };
  const v = (pl, sg) => (nba ? pl : sg);
  const lines = [];
  const intro =
    favP > 0.72
      ? pick([`${Tc(fav)} ${v("start", "starts")} with a clear edge.`, `On paper, ${T(fav)} ${v("dominate", "dominates")} this matchup.`], seed)
      : favP > 0.58
      ? pick([`${Tc(fav)} ${v("are", "is")} favored, but the gap isn't huge.`, `Slight edge to ${T(fav)}, but ${T(dog)} ${v("have", "has")} what it takes to keep it close.`], seed)
      : pick([`A wide-open game: the model barely separates the two teams.`, `Close to a coin flip: nothing really sets either side apart.`], seed);
  lines.push(intro);
  lines.push(`The model projects ${h.team.short} ${Math.round(a.homePts)} – ${Math.round(a.awayPts)} ${aw.team.short}, a margin of about ${spread.toFixed(1)} points in favor of ${T(fav)} and a total around ${Math.round(a.total)} points.`);
  const [hi, lo, std] = a.league === "EL" ? [172, 156, "at a typical EuroLeague pace"] : [232, 220, "at a standard NBA pace"];
  lines.push(a.total > hi ? "Expect a fast-paced, high-scoring game." : a.total < lo ? "Expect a tighter, lower-scoring game." : `Expect a game ${std}.`);
  if (h.b2b || aw.b2b) {
    const t = [h.b2b && T(h), aw.b2b && T(aw)].filter(Boolean).join(" and ");
    lines.push(`${t.charAt(0).toUpperCase() + t.slice(1)} played yesterday: fatigue often shows in the fourth quarter.`);
  }
  const injLines = [h, aw]
    .filter((s) => s.inj.out.length)
    .map((s) => `${Tc(s)} will be without ${s.inj.out.slice(0, 2).map((i) => i.player).join(" or ")}${s.inj.out.length > 2 ? ` (and ${s.inj.out.length - 2} other${s.inj.out.length > 3 ? "s" : ""})` : ""}`);
  if (injLines.length) lines.push(injLines.join(". ") + ".");
  if (a.minSample < 5) lines.push(`Early season: the numbers still lean heavily on last season, so confidence stays cautious.`);
  const keys = [];
  if (Math.abs(h.diff - aw.diff) > 4) keys.push(`The overall strength gap (${fmt(h.diff)} vs ${fmt(aw.diff)} pts/game) is the main factor.`);
  keys.push(`${Tc(dog)} ${v("need", "needs")} to win the pace battle to stay in the game.`);
  if (h.ppg > aw.ppg + 3) keys.push(`${poss(h)} offense (${h.ppg.toFixed(1)} pts/game) is the more productive of the two.`);
  else if (aw.ppg > h.ppg + 3) keys.push(`${poss(aw)} offense (${aw.ppg.toFixed(1)} pts/game) is the more productive of the two.`);
  if (h.oppg < aw.oppg - 3) keys.push(`${poss(h)} defense allows clearly fewer points (${h.oppg.toFixed(1)} pts/game).`);
  else if (aw.oppg < h.oppg - 3) keys.push(`${poss(aw)} defense allows clearly fewer points (${aw.oppg.toFixed(1)} pts/game).`);
  return { text: lines.join(" "), keys: keys.slice(0, 4), source: "rules", verdict: `${fav.team.short} ${pct(favP)}` };
}

function ruleNarrativeEs(a) {
  const { home: h, away: aw, fav, dog } = a;
  const seed = Number(String(a.id).replace(/\D/g, "")) || 7;
  const favP = Math.max(a.pHome, a.pAway);
  const spread = Math.abs(a.margin);
  // NBA : « los Knicks » (plural) · Euroliga : « Real Madrid » (nombre del club, singular).
  const nba = a.league !== "EL";
  const T = (s) => (nba ? `los ${s.team.short}` : s.team.short);
  const Tc = (s) => { const x = T(s); return x.charAt(0).toUpperCase() + x.slice(1); };
  const v = (pl, sg) => (nba ? pl : sg);
  const dec = (x) => x.toFixed(1).replace(".", ",");
  const lines = [];
  const intro =
    favP > 0.72
      ? pick([`${Tc(fav)} ${v("parten", "parte")} con una clara ventaja.`, `Sobre el papel, ${T(fav)} ${v("dominan", "domina")} claramente este duelo.`], seed)
      : favP > 0.58
      ? pick([`${Tc(fav)} ${v("son los favoritos", "es el favorito")}, aunque la diferencia no es abrumadora.`, `Ligera ventaja para ${T(fav)}, pero ${T(dog)} ${v("tienen", "tiene")} armas para plantar cara.`], seed)
      : pick([`Partido muy abierto: el modelo apenas separa a los dos equipos.`, `Casi a cara o cruz: nada distingue de verdad a uno de los dos bandos.`], seed);
  lines.push(intro);
  lines.push(`El modelo proyecta ${h.team.short} ${Math.round(a.homePts)} – ${Math.round(a.awayPts)} ${aw.team.short}, es decir, unos ${dec(spread)} puntos de diferencia a favor de ${T(fav)} y un total en torno a ${Math.round(a.total)} puntos.`);
  const [hi, lo, std] = a.league === "EL" ? [172, 156, "al ritmo habitual de la Euroliga"] : [232, 220, "a un ritmo NBA estándar"];
  lines.push(a.total > hi ? "Se espera un partido rápido y ofensivo." : a.total < lo ? "Se espera un partido más cerrado, con marcadores contenidos." : `Se espera un partido ${std}.`);
  if (h.b2b || aw.b2b) {
    const both = h.b2b && aw.b2b;
    const t = [h.b2b && T(h), aw.b2b && T(aw)].filter(Boolean).join(" y ");
    lines.push(`${t.charAt(0).toUpperCase() + t.slice(1)} ${both || nba ? "jugaron" : "jugó"} ayer: el cansancio suele notarse en el último cuarto.`);
  }
  const injLines = [h, aw]
    .filter((s) => s.inj.out.length)
    .map((s) => `${Tc(s)} no ${v("podrán", "podrá")} contar con ${s.inj.out.slice(0, 2).map((i) => i.player).join(" ni con ")}${s.inj.out.length > 2 ? ` (ni con ${s.inj.out.length - 2} jugador${s.inj.out.length > 3 ? "es" : ""} más)` : ""}`);
  if (injLines.length) lines.push(injLines.join(". ") + ".");
  if (a.minSample < 5) lines.push(`Principio de temporada: las cifras aún se apoyan mucho en la temporada anterior, así que la confianza sigue siendo prudente.`);
  const keys = [];
  if (Math.abs(h.diff - aw.diff) > 4) keys.push(`La diferencia de nivel global (${fmt(h.diff).replace(".", ",")} frente a ${fmt(aw.diff).replace(".", ",")} pts/partido) es el factor principal.`);
  keys.push(`${Tc(dog)} ${v("necesitan", "necesita")} ganar la batalla del ritmo para seguir en el partido.`);
  if (h.ppg > aw.ppg + 3) keys.push(`El ataque de ${T(h)} (${dec(h.ppg)} pts/partido) es el más productivo de los dos.`);
  else if (aw.ppg > h.ppg + 3) keys.push(`El ataque de ${T(aw)} (${dec(aw.ppg)} pts/partido) es el más productivo de los dos.`);
  if (h.oppg < aw.oppg - 3) keys.push(`La defensa de ${T(h)} encaja claramente menos (${dec(h.oppg)} pts/partido).`);
  else if (aw.oppg < h.oppg - 3) keys.push(`La defensa de ${T(aw)} encaja claramente menos (${dec(aw.oppg)} pts/partido).`);
  return { text: lines.join(" "), keys: keys.slice(0, 4), source: "rules", verdict: `${fav.team.short} ${pct(favP)}` };
}
