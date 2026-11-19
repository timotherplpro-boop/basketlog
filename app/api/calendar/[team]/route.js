// Calendrier d'une équipe NBA à ajouter au téléphone (format iCalendar) : un événement par match à venir, avec la
// probabilité de victoire du modèle Basketlog et le lien vers le pronostic. Abonnement possible (webcal://), mis à jour
// toutes les heures. Paramètre lang=fr|en|es|pt pour la langue des textes.
import { teamById, TEAMS } from "../../../../lib/teams";
import { getTeamSchedule, getStandings, seasonForDate, nbaToday, nbaDateOf } from "../../../../lib/espn";
import { teamStrength, phi, MODEL } from "../../../../lib/model";
import { nbaPath } from "../../../../lib/slug";
import { mk } from "../../../../lib/i18n";
import { SITE } from "../../../../lib/site";

export const revalidate = 3600;

const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const stamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
// Lignes de plus de 75 octets repliées (norme iCalendar).
const fold = (line) => {
  const out = [];
  let cur = "";
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 74) { out.push(cur); cur = " "; }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
};

export async function GET(req, { params }) {
  const raw = String((await params).team || "").replace(/\.ics$/i, "");
  const team = teamById(raw) || TEAMS.find((t) => t.abbr.toLowerCase() === raw.toLowerCase());
  if (!team) return new Response("Not found", { status: 404 });
  const q = new URL(req.url).searchParams.get("lang");
  const L = mk(["fr", "en", "es", "pt"].includes(q) ? q : "fr");
  const season = seasonForDate(nbaToday());
  const [sched, cur, prev] = await Promise.all([getTeamSchedule(team.id).catch(() => []), getStandings(season).catch(() => ({})), getStandings(season - 1).catch(() => ({}))]);
  const s = (id) => teamStrength(cur[id] || null, prev[id] || null);
  const now = Date.now();
  const games = sched.filter((g) => g.state === "pre" && !g.postponed && new Date(g.date).getTime() > now - 3 * 3600e3);
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Basketlog//NBA calendar//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(L.t(`${team.name} – matchs et pronostics`, `${team.name} – schedule and predictions`, `${team.name} – partidos y pronósticos`, `${team.name} – jogos e palpites`))}`,
    "X-PUBLISHED-TTL:PT6H", "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
  ];
  for (const g of games) {
    const home = g.home.id === team.id;
    const opp = home ? g.away : g.home;
    const pHome = phi((s(g.home.id) - s(g.away.id) + MODEL.HOME_COURT) / MODEL.MARGIN_SD);
    const p = Math.round((home ? pHome : 1 - pHome) * 100);
    const url = `${SITE}${L.href(nbaPath(g, nbaDateOf(g.date)))}`;
    const start = new Date(g.date);
    const end = new Date(start.getTime() + 2.5 * 3600e3);
    const title = L.t(`${team.short} ${home ? "vs" : "@"} ${opp.short} (${p} % de victoire)`, `${team.short} ${home ? "vs" : "@"} ${opp.short} (${p}% win chance)`, `${team.short} ${home ? "vs" : "@"} ${opp.short} (${p} % de victoria)`, `${team.short} ${home ? "x" : "@"} ${opp.short} (${p} % de vitória)`);
    const desc = L.t(`Probabilité de victoire des ${team.short} selon le modèle Basketlog : ${p} %. Pronostic complet : ${url}`, `${team.short} win probability from the Basketlog model: ${p}%. Full prediction: ${url}`, `Probabilidad de victoria de los ${team.short} según el modelo de Basketlog: ${p} %. Pronóstico completo: ${url}`, `Probabilidade de vitória do ${team.short} segundo o modelo do Basketlog: ${p} %. Palpite completo: ${url}`);
    lines.push("BEGIN:VEVENT", `UID:${g.id}-${team.id}@basketlog-app.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(desc)}`, `URL:${url}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `inline; filename="${team.abbr.toLowerCase()}-basketlog.ics"`, "Cache-Control": "public, max-age=0, s-maxage=3600" },
  });
}
