import { NextResponse } from "next/server";
import { analyzeDay, nbaRecentForm } from "../../../lib/data";
import { sureRecord } from "../../../lib/history";
import { nbaToday, shiftDate, isValidDate } from "../../../lib/espn";
import { dayLong } from "../../../lib/seo";
import { mk } from "../../../lib/i18n";
import { confText } from "../../../lib/matchtext";
import { formLabel, briefSummary, scenarioOne } from "../../../lib/freepart";
import { parisDay, parisTime } from "../../../components/ui";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Données des vidéos TikTok / Reels du jour (dossier video/ du dépôt) : uniquement ce que montre la partie gratuite
// de chaque fiche match (probabilités, score projeté, forme, résumé, scénario n° 1, confiance), plus les absents.
// Les mêmes fonctions que la fiche match produisent les textes, pour que la vidéo montre exactement le site.
// « sure » : match en confiance « Très élevée » (favori à 88 % et plus) ; « sureRecord » : bilan réel de ce niveau en NBA
// (saison passée + saison en cours, comme la carte « Confiance très élevée » de /app/bilan), montré dans la vidéo « sur ».
const pct = (p) => `${Math.round(p * 100)} %`;
const vd = (l) => `${l.filter((x) => x.res === "W").length}-${l.filter((x) => x.res !== "W").length}`;
const dec1 = (x) => x.toFixed(1).replace(".", ",");

export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const today = nbaToday();
  const d = isValidDate(sp.get("d")) ? sp.get("d") : today;
  const L = mk("fr");
  // Bilan du niveau « Très élevée » : en cache la plupart du temps ; s'il tarde, la vidéo se fait sans lui.
  const recP = Promise.race([sureRecord().catch(() => null), new Promise((r) => setTimeout(() => r(null), 8000))]);
  let day;
  try {
    day = await analyzeDay(d);
  } catch {
    return NextResponse.json({ error: "Données NBA momentanément indisponibles" }, { status: 503 });
  }
  const list = day.analyses.filter((a) => !a.game.hypothetical).sort((x, y) => new Date(x.game.date) - new Date(y.game.date));
  const ids = [...new Set(list.flatMap((a) => [a.home.team.id, a.away.team.id]))];
  const form = ids.length ? await nbaRecentForm(ids, null).catch(() => ({})) : {};
  const games = list.map((a) => {
    const g = a.game, h = a.home, aw = a.away;
    const fh = form[h.team.id] || [], fa = form[aw.team.id] || [];
    const chips = (l) => l.map((x) => (x.res === "W" ? "✅" : "❌")).join("") + (g.state === "pre" ? "⏳" : "");
    const conf = a.confidence;
    const inj = (side, t) => ({
      abbr: t.abbr, team: t.short,
      rows: (side.inj?.out || []).map((i) => ({ name: i.player || i.name || "Joueur", info: [i.pos, i.ppg != null ? `${dec1(i.ppg)} pts` : null].filter(Boolean).join(" · "), status: "Absent" })),
    });
    return {
      id: String(g.id), d, state: g.state, start: g.date,
      title: `Pronostic ${g.away.short} – ${g.home.short}`,
      subtitle: `NBA · ${dayLong(g.date, L)}`,
      tag: `${parisDay(g.date, L)} · ${parisTime(g.date, L)}`,
      venue: [g.venue, g.broadcast].filter(Boolean).join(" · "),
      away: { abbr: g.away.abbr, name: g.away.name, record: g.away.record || "0-0", side: "extérieur" },
      home: { abbr: g.home.abbr, name: g.home.name, record: g.home.record || "0-0", side: "domicile" },
      proj: `${Math.round(a.awayPts)}-${Math.round(a.homePts)}`,
      probs: [{ v: pct(a.pAway), l: `victoire ${g.away.abbr}` }, { v: pct(a.pHome), l: `victoire ${g.home.abbr}` }],
      form: [{ abbr: g.home.abbr, name: g.home.name, label: formLabel(fh, L) }, { abbr: g.away.abbr, name: g.away.name, label: formLabel(fa, L) }],
      chips: [{ abbr: g.home.abbr, name: g.home.name, chips: chips(fh), vd: vd(fh) }, { abbr: g.away.abbr, name: g.away.name, chips: chips(fa), vd: vd(fa) }],
      resume: briefSummary(a, "NBA", L),
      scenario1: scenarioOne(a, "NBA", L),
      conf: confText(conf, L), confW: conf === "Très élevée" ? "96%" : conf === "Élevée" ? "88%" : conf === "Moyenne" ? "62%" : "34%",
      sure: conf === "Très élevée",
      injuries: [inj(aw, g.away), inj(h, g.home)],
    };
  });
  const rows = list.map((a) => {
    const g = a.game, favHome = a.pHome >= 0.5, fav = favHome ? g.home : g.away;
    const dt = new Date(g.date);
    const dm = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" }).format(dt);
    return {
      href: `/app/match/${g.id}?d=${d}`, when: `${dm}${parisTime(g.date, L)}`, p: `${fav.abbr} ${pct(Math.max(a.pHome, a.pAway))}`,
      teams: [{ name: g.away.short, abbr: g.away.abbr, fav: !favHome }, { name: g.home.short, abbr: g.home.abbr, fav: favHome }],
    };
  });
  const label = d === today ? "de ce soir" : d === shiftDate(today, 1) ? "de demain" : `du ${dayLong(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T12:00:00Z`, L)}`;
  const rec = (await recP)?.nba;
  const sureRec = rec ? { n: rec.n, ok: rec.ok, since: `${rec.since - 1}-${String(rec.since).slice(2)}` } : null;
  return NextResponse.json(
    { d, generatedAt: new Date().toISOString(), head: `Matchs NBA ${label}`, headSub: `${list.length} matchs NBA · heures de Paris`, rows, games, sureRecord: sureRec },
    { headers: { "Cache-Control": "no-store" } }
  );
}
