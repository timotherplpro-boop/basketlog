// Chiffres réels pour la fenêtre « Tu veux voir l'analyse complète ? » (comme Visifoot) et pour l'accueil :
// réussite du modèle hier (ou sur les 7 derniers jours), nombre de membres ou de matchs analysés.
// Tout vient du bilan public ou de Whop : rien n'est inventé, et « +N » est toujours arrondi vers le bas.
import { nbaPicks, elPicks, lastDays } from "./history";
import { nbaToday, shiftDate, seasonForDate } from "./espn";
import { memberCount } from "./members";

export const MEMBERS_MIN = 100; // le nombre de membres n'est affiché qu'à partir de +100 inscrits
export const plusFloor = (n, step) => Math.floor((n - 1) / step) * step; // « +N » reste strictement inférieur au vrai chiffre
export const memberStep = (n) => (n >= 10000 ? 1000 : n >= 1000 ? 100 : 10);

// La réussite n'est mise en avant que si elle est nette (60 % ou plus) sur un échantillon suffisant.
const GOOD = 0.6;

const within = (p, ms) => Promise.race([Promise.resolve(p).catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);
const parisDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()).replaceAll("-", "");

export async function unlockProof() {
  const season = seasonForDate(nbaToday());
  const [cur, prev, el, members] = await Promise.all([
    within(nbaPicks(season), 1500),
    within(nbaPicks(season - 1), 1500),
    within(elPicks(), 1500),
    within(memberCount(), 1500),
  ]);
  // Matchs terminés (NBA et EuroLeague) : pronostic d'avant-match comparé au vrai vainqueur.
  const all = [...(cur || []), ...(el || [])];
  const today = parisDay();
  const okOf = (l) => l.filter((p) => p.ok).length;
  const yesterday = all.filter((p) => p.d === shiftDate(today, -1));
  const week = lastDays(all, 7, today);
  let hits = null;
  if (yesterday.length >= 3 && okOf(yesterday) / yesterday.length >= GOOD) hits = { span: "day", ok: okOf(yesterday), n: yesterday.length };
  else if (week.length >= 10 && okOf(week) / week.length >= GOOD) hits = { span: "week", ok: okOf(week), n: week.length };

  const m = Number(members) || 0;
  const shown = m > 0 ? plusFloor(m, memberStep(m)) : 0;
  const analysed = plusFloor(Math.max(1301, (cur?.length || 0) + (prev?.length || 0)), 100); // la saison testée compte déjà plus de 1 300 matchs
  return { hits, members: shown >= MEMBERS_MIN ? shown : null, analysed };
}
