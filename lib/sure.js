// « Confiance très élevée » : les pronostics où le modèle donne un favori à 88 % et plus (lib/model.js), mis en avant
// sur l'accueil, dans l'appli et dans les vidéos du matin, avec le bilan réel de ce niveau (sureRecord, lib/history.js).
import { sureRecord } from "./history";
import { elUpcoming } from "./euroleague";
import { nbaDateOf } from "./espn";

export const VERY_HIGH = "Très élevée";

const within = (p, ms) => Promise.race([Promise.resolve(p).catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);
const side = (t) => ({ abbr: t.abbr, short: t.short || t.name, name: t.name, logo: t.logo || null });

// Matchs NBA à venir (liste de upcomingAnalyses) et, si demandé, EuroLeague, au niveau « Très élevée », par date.
// Si l'EuroLeague tarde, on n'attend pas : la NBA s'affiche seule.
export async function surePicks(nbaUpcoming, { el = false, days = 7 } = {}) {
  const nba = (nbaUpcoming || [])
    .filter((g) => !g.live && g.confidence === VERY_HIGH)
    .map((g) => ({
      key: `nba-${g.id}`, league: "NBA", href: `/app/match/${g.id}?d=${g.d}`, date: g.date, d: g.d,
      home: side(g.home), away: side(g.away), pHome: g.pHome, homePts: g.homePts, awayPts: g.awayPts,
    }));
  let euro = [];
  if (el) {
    const u = await within(elUpcoming(days), 1500);
    euro = (u?.list || [])
      .filter(({ a }) => a.confidence === VERY_HIGH && a.game.state === "pre")
      .map(({ g, a }) => ({
        key: `el-${g.id}`, league: "EL", href: `/app/euroleague/match/${g.id}`, date: g.date, d: nbaDateOf(g.date),
        home: side(g.home), away: side(g.away), pHome: a.pHome, homePts: a.homePts, awayPts: a.awayPts,
      }));
  }
  return [...nba, ...euro].sort((x, y) => new Date(x.date) - new Date(y.date));
}

// Bilan de ce niveau, sans bloquer la page si le calcul n'est pas encore en cache.
export const sureRecordSoon = (ms = 1500) => within(sureRecord(), ms);

// Seuils d'affichage du bilan : en dessous, l'échantillon est trop petit pour un pourcentage parlant.
export const RECORD_MIN = 20;
