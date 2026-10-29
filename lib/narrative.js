// Génère le récit d'avant-match. Si ANTHROPIC_API_KEY est défini, Claude rédige le texte à partir
// des chiffres du modèle ; sinon un rédacteur à base de règles prend le relais.
import { fmt, pct } from "./model";

function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

export function ruleNarrative(a, L) {
  if (L?.en) return ruleNarrativeEn(a);
  const { home: h, away: aw, fav, dog } = a;
  const seed = Number(a.id) || 7;
  const favP = Math.max(a.pHome, a.pAway);
  const spread = Math.abs(a.margin);
  const lines = [];

  const intro =
    favP > 0.72
      ? pick([
          `${fav.team.short} part avec une vraie longueur d'avance.`,
          `Sur le papier, ${fav.team.short} domine nettement ce duel.`,
        ], seed)
      : favP > 0.58
      ? pick([
          `${fav.team.short} est favori, sans que l'écart soit écrasant.`,
          `Léger avantage ${fav.team.short}, mais ${dog.team.short} a les armes pour accrocher.`,
        ], seed)
      : pick([
          `Match très ouvert : le modèle ne sépare presque pas les deux équipes.`,
          `Pile ou face, ou presque : rien ne détache vraiment l'un des deux camps.`,
        ], seed);
  lines.push(intro);

  lines.push(
    `Le modèle projette ${h.team.short} ${Math.round(a.homePts)} – ${Math.round(a.awayPts)} ${aw.team.short}, soit environ ${spread.toFixed(1)} points d'écart en faveur de ${fav.team.short} et un total autour de ${Math.round(a.total)} points.`
  );

  const [hi, lo, std] = a.league === "EL" ? [172, 156, "au rythme habituel de l'EuroLeague"] : [232, 220, "au rythme NBA standard"];
  const pace = a.total > hi ? "rythmé et offensif" : a.total < lo ? "plus fermé, à scores contenus" : std;
  lines.push(`On s'attend à un match ${pace}.`);

  if (h.b2b || aw.b2b) {
    const t = [h.b2b && h.team.short, aw.b2b && aw.team.short].filter(Boolean).join(" et ");
    lines.push(`${t} enchaîne${h.b2b && aw.b2b ? "nt" : ""} après un match hier : la fatigue pèse souvent dans le dernier quart-temps.`);
  }
  const injLines = [h, aw]
    .filter((s) => s.inj.out.length)
    .map((s) => `${s.team.short} doit composer sans ${s.inj.out.slice(0, 2).map((i) => i.player).join(" ni ")}${s.inj.out.length > 2 ? ` (et ${s.inj.out.length - 2} autre${s.inj.out.length > 3 ? "s" : ""})` : ""}`);
  if (injLines.length) lines.push(injLines.join(". ") + ".");

  if (a.minSample < 5)
    lines.push(`Début de saison : les chiffres s'appuient encore beaucoup sur l'exercice précédent, la confiance reste prudente.`);

  const keys = [];
  if (Math.abs(h.diff - aw.diff) > 4) keys.push(`L'écart de niveau global (${fmt(h.diff)} contre ${fmt(aw.diff)} pts/match) est le facteur principal.`);
  keys.push(`${dog.team.short} doit gagner la bataille du rythme pour rester dans le match.`);
  if (h.ppg > aw.ppg + 3) keys.push(`L'attaque de ${h.team.short} (${h.ppg.toFixed(1)} pts/match) est la plus productive des deux.`);
  else if (aw.ppg > h.ppg + 3) keys.push(`L'attaque de ${aw.team.short} (${aw.ppg.toFixed(1)} pts/match) est la plus productive des deux.`);
  if (h.oppg < aw.oppg - 3) keys.push(`La défense de ${h.team.short} encaisse nettement moins (${h.oppg.toFixed(1)} pts/match).`);
  else if (aw.oppg < h.oppg - 3) keys.push(`La défense de ${aw.team.short} encaisse nettement moins (${aw.oppg.toFixed(1)} pts/match).`);

  return { text: lines.join(" "), keys: keys.slice(0, 4), source: "rules", verdict: `${fav.team.short} ${pct(favP)}` };
}

export async function aiNarrative(a, L) {
  const key = process.env.ANTHROPIC_API_KEY;
  const fallback = ruleNarrative(a, L);
  if (!key) return fallback;
  try {
    const payload = {
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
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      next: { revalidate: 1800 },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Tu es analyste NBA. Rédige ${L?.en ? "en anglais" : "en français"} une analyse d'avant-match de 90 à 130 mots, ton direct et vivant, sans inventer de chiffres ni de joueurs absents de ces données. Ne donne aucun conseil de pari. Réponds en JSON {"text": "...", "keys": ["3 clés du match, une phrase chacune"]}.\nDonnées : ${JSON.stringify(payload)}`,
          },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const raw = (data.content || []).map((c) => c.text || "").join("");
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    if (!json.text) return fallback;
    return { text: json.text, keys: (json.keys || []).slice(0, 4), source: "ai", verdict: fallback.verdict };
  } catch {
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
