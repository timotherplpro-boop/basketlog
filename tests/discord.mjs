// Bot Discord : signature Ed25519, recherche d'équipe, messages.
import crypto from "node:crypto";
import { verifyDiscord, discordLang, findTeam, teamChoices, tonightMessage, teamMessage, DISCORD_COMMANDS } from "../lib/discord.js";

export async function discordTests({ ok, ko, eq }) {
  console.log("Bot Discord");
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pkHex = publicKey.export({ format: "der", type: "spki" }).subarray(12).toString("hex");
  const body = JSON.stringify({ type: 1 }), stamp = "1700000000";
  const sig = crypto.sign(null, Buffer.from(stamp + body), privateKey).toString("hex");
  eq("discord : signature valide acceptée, modifiée refusée", [verifyDiscord(pkHex, sig, stamp, body), verifyDiscord(pkHex, sig, stamp, body + " "), verifyDiscord(pkHex, "00", stamp, body), verifyDiscord("", sig, stamp, body)], [true, false, false, false]);
  eq("discord : langue", [discordLang("fr"), discordLang("es-419"), discordLang("pt-BR"), discordLang("en-US"), discordLang("de")], ["fr", "es", "pt", "en", "en"]);
  eq("discord : équipes", [findTeam("lakers")?.short, findTeam("LAL")?.short, findTeam("sixers")?.short, findTeam("golden state")?.short, findTeam("zzz")], ["Lakers", "Lakers", "76ers", "Warriors", null]);
  eq("discord : choix (25 max, filtrés)", [teamChoices("").length, teamChoices("los").some((c) => c.value === "Lakers"), teamChoices("bos").map((c) => c.value)], [25, true, ["Celtics"]]);
  const lal = findTeam("lakers"), sac = findTeam("kings");
  const g = { id: "1", d: "20261120", date: "2026-11-21T03:00:00Z", home: lal, away: sac, pHome: 0.88 };
  const tm = teamMessage(lal, g, "en");
  eq("discord : prochain match d'une équipe", [tm.embeds[0].title, tm.embeds[0].description.includes("**Lakers 88%**"), tm.embeds[0].url.startsWith("https://basketlog-app.com/en/nba/kings-vs-lakers-2026-11-20?utm_source=discord")], ["Kings @ Lakers", true, true]);
  const tn = tonightMessage([g], "fr");
  eq("discord : matchs du soir FR", [tn.embeds[0].title, tn.embeds[0].description.includes("**Lakers 88 %**"), tn.embeds[0].description.includes("<t:")], ["Probabilités NBA du soir", true, true]);
  eq("discord : équipe inconnue / aucun match", [teamMessage(null, null, "es").content.startsWith("Equipo no encontrado"), teamMessage(lal, null, "en").content], [true, "No Lakers game in the next 10 days."]);
  const all = JSON.stringify([tm, tn, DISCORD_COMMANDS]);
  if (/\bbet|odds|pari|apuesta/i.test(all)) ko("discord : vocabulaire", all.slice(0, 200)); else ok("discord : vocabulaire");
}
