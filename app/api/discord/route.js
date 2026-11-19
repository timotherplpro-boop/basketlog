import { NextResponse, after } from "next/server";
import { verifyDiscord, discordLang, findTeam, teamChoices, tonightMessage, teamMessage } from "../../../lib/discord";
import { analyzeDay, upcomingAnalyses } from "../../../lib/data";
import { nbaToday } from "../../../lib/espn";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Point d'entrée des interactions Discord (« Interactions Endpoint URL » de l'application Discord).
// Variables : DISCORD_PUBLIC_KEY (clé publique de l'application, pas secrète). Sans elle, la route répond 503.
// Discord attend une réponse en 3 secondes : on répond « en cours » (type 5), puis le message arrive par le webhook
// de l'interaction (aucune clé de bot nécessaire pour ça).
const json = (b, s = 200) => NextResponse.json(b, { status: s });

export async function POST(req) {
  const pk = process.env.DISCORD_PUBLIC_KEY;
  if (!pk) return json({ error: "not configured" }, 503);
  const raw = await req.text();
  if (!verifyDiscord(pk, req.headers.get("x-signature-ed25519"), req.headers.get("x-signature-timestamp"), raw)) return json({ error: "bad signature" }, 401);
  let i;
  try { i = JSON.parse(raw); } catch { return json({ error: "bad body" }, 400); }

  if (i.type === 1) return json({ type: 1 }); // PING de Discord
  const opt = (i.data?.options || []).find((o) => o.name === "team");

  if (i.type === 4) return json({ type: 8, data: { choices: teamChoices(opt?.value) } }); // saisie semi-automatique

  if (i.type === 2 && i.data?.name === "basketlog") {
    const lang = discordLang(i.locale);
    const appId = i.application_id, token = i.token;
    after(async () => {
      let msg;
      try {
        if (opt?.value) {
          const team = findTeam(opt.value);
          let game = null;
          if (team) {
            const up = await upcomingAnalyses(10);
            game = up.find((x) => String(x.home.id) === team.id || String(x.away.id) === team.id) || null;
          }
          msg = teamMessage(team, game, lang);
        } else {
          const d = nbaToday();
          const games = (await analyzeDay(d)).analyses
            .filter((a) => a.game.state !== "post" && !a.game.postponed && a.pHome != null)
            .sort((x, y) => new Date(x.game.date) - new Date(y.game.date))
            .map((a) => ({ id: a.game.id, d, date: a.game.date, home: a.game.home, away: a.game.away, pHome: a.pHome }));
          msg = tonightMessage(games, lang);
        }
      } catch (e) {
        console.warn(`[discord] ${e.message}`);
        msg = { content: lang === "fr" ? "Données indisponibles pour le moment, réessaie dans un instant." : "Data unavailable right now, try again in a moment." };
      }
      await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...msg, allowed_mentions: { parse: [] } }),
        signal: AbortSignal.timeout(8000),
      }).catch((e) => console.warn(`[discord] réponse : ${e.message}`));
    });
    return json({ type: 5 });
  }
  return json({ type: 4, data: { content: "?" } });
}
