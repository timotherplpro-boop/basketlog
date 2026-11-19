import { NextResponse } from "next/server";
import { COOKIE, currentSession } from "../../../../lib/pro";
import { DISCORD_COMMANDS } from "../../../../lib/discord";

export const dynamic = "force-dynamic";

// Enregistre (ou met à jour) la commande /basketlog chez Discord. Réservé à un compte admin connecté.
// Variables : DISCORD_APP_ID (identifiant de l'application) et DISCORD_BOT_TOKEN (secret, posé par Tim dans Vercel).
// ?dry=1 : montre la commande sans rien envoyer.
export async function GET(req) {
  const { session } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (session?.role !== "admin") return NextResponse.json({ error: "interdit" }, { status: 401 });
  const app = process.env.DISCORD_APP_ID, tok = process.env.DISCORD_BOT_TOKEN;
  const installUrl = app ? `https://discord.com/oauth2/authorize?client_id=${app}&scope=applications.commands` : null;
  if (new URL(req.url).searchParams.get("dry") === "1" || !app || !tok) {
    return NextResponse.json({ ok: !!(app && tok), dry: true, missing: [!app && "DISCORD_APP_ID", !tok && "DISCORD_BOT_TOKEN", !process.env.DISCORD_PUBLIC_KEY && "DISCORD_PUBLIC_KEY"].filter(Boolean), commands: DISCORD_COMMANDS, installUrl });
  }
  const r = await fetch(`https://discord.com/api/v10/applications/${app}/commands`, {
    method: "PUT",
    headers: { Authorization: `Bot ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify(DISCORD_COMMANDS),
    signal: AbortSignal.timeout(10000),
  }).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));
  const body = await r.text();
  return NextResponse.json({ ok: r.ok, status: r.status, discord: body.slice(0, 2000), installUrl });
}
