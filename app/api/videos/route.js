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
// ?lang=en : mêmes données en anglais (textes de la version /en du site, heures de New York), pour les vidéos US.
// « facts » : séries, bilans domicile/extérieur et back-to-back en clair, pour ne pas les relire dans le résumé.
const pct = (p, L) => (L.en ? `${Math.round(p * 100)}%` : `${Math.round(p * 100)} %`);
// Série en cours toujours en W/L (« V3 » / « D2 » côté données françaises).
const wlStreak = (x) => (x ? String(x).trim().replace(/^V/, "W").replace(/^D/, "L") : null);
const vd = (l) => `${l.filter((x) => x.res === "W").length}-${l.filter((x) => x.res !== "W").length}`;
const dec1 = (x, L) => (L.en ? x.toFixed(1) : x.toFixed(1).replace(".", ","));

export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const today = nbaToday();
  const d = isValidDate(sp.get("d")) ? sp.get("d") : today;
  const L = mk(sp.get("lang") === "en" ? "en" : "fr");
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
      rows: (side.inj?.out || []).map((i) => ({ name: i.player || i.name || L.t("Joueur", "Player"), info: [i.pos, i.ppg != null ? `${dec1(i.ppg, L)} pts` : null].filter(Boolean).join(" · "), status: L.t("Absent", "Out") })),
    });
    return {
      id: String(g.id), d, state: g.state, start: g.date,
      title: L.t(`Pronostic ${g.away.short} – ${g.home.short}`, `${g.away.short} vs ${g.home.short} prediction`),
      subtitle: `NBA · ${dayLong(g.date, L)}`,
      tag: `${parisDay(g.date, L)} · ${parisTime(g.date, L)}`,
      venue: [g.venue, g.broadcast].filter(Boolean).join(" · "),
      away: { abbr: g.away.abbr, name: g.away.name, record: g.away.record || "0-0", side: L.t("extérieur", "away") },
      home: { abbr: g.home.abbr, name: g.home.name, record: g.home.record || "0-0", side: L.t("domicile", "home") },
      proj: `${Math.round(a.awayPts)}-${Math.round(a.homePts)}`,
      probs: [{ v: pct(a.pAway, L), l: L.t(`victoire ${g.away.abbr}`, `${g.away.abbr} win`) }, { v: pct(a.pHome, L), l: L.t(`victoire ${g.home.abbr}`, `${g.home.abbr} win`) }],
      form: [{ abbr: g.home.abbr, name: g.home.name, label: formLabel(fh, L) }, { abbr: g.away.abbr, name: g.away.name, label: formLabel(fa, L) }],
      chips: [{ abbr: g.home.abbr, name: g.home.name, chips: chips(fh), vd: vd(fh) }, { abbr: g.away.abbr, name: g.away.name, chips: chips(fa), vd: vd(fa) }],
      resume: briefSummary(a, "NBA", L),
      scenario1: scenarioOne(a, "NBA", L),
      conf: confText(conf, L), confW: conf === "Très élevée" ? "96%" : conf === "Élevée" ? "88%" : conf === "Moyenne" ? "62%" : "34%",
      sure: conf === "Très élevée",
      injuries: [inj(aw, g.away), inj(h, g.home)],
      facts: {
        away: { streak: wlStreak(aw.cur?.streak), split: aw.cur?.road && aw.cur.road !== "0-0" ? aw.cur.road : null, b2b: !!aw.b2b },
        home: { streak: wlStreak(h.cur?.streak), split: h.cur?.home && h.cur.home !== "0-0" ? h.cur.home : null, b2b: !!h.b2b },
      },
    };
  });
  const rows = list.map((a) => {
    const g = a.game, favHome = a.pHome >= 0.5, fav = favHome ? g.home : g.away;
    const dt = new Date(g.date);
    const dm = new Intl.DateTimeFormat(L.locale, { timeZone: L.tz, day: "2-digit", month: "2-digit" }).format(dt);
    return {
      href: `/app/match/${g.id}?d=${d}`, when: `${dm}${parisTime(g.date, L)}`, p: `${fav.abbr} ${pct(Math.max(a.pHome, a.pAway), L)}`,
      teams: [{ name: g.away.short, abbr: g.away.abbr, fav: !favHome }, { name: g.home.short, abbr: g.home.abbr, fav: favHome }],
    };
  });
  const dl = dayLong(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T12:00:00Z`, L);
  const label = d === today ? L.t("de ce soir", "tonight") : d === shiftDate(today, 1) ? L.t("de demain", "tomorrow") : L.t(`du ${dl}`, `on ${dl}`);
  const rec = (await recP)?.nba;
  const sureRec = rec ? { n: rec.n, ok: rec.ok, since: `${rec.since - 1}-${String(rec.since).slice(2)}` } : null;
  return NextResponse.json(
    { d, lang: L.lang, generatedAt: new Date().toISOString(), head: L.t(`Matchs NBA ${label}`, `NBA games ${label}`),
      headSub: L.t(`${list.length} matchs NBA · heures de Paris`, `${list.length} NBA games · Eastern Time`), rows, games, sureRecord: sureRec },
    { headers: { "Cache-Control": "no-store" } }
  );
}
