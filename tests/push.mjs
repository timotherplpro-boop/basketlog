// Notifications du soir (web push) : texte du jour et contrôle des abonnements reçus.
import { pushMessage, cleanSubscription, PUSH_LANGS } from "../lib/push-text.js";

export async function pushTests({ ok, ko, eq }) {
  console.log("Notifications du soir");
  const picks = [
    { league: "NBA", home: "Hawks", away: "Hornets", pHome: 0.742 },
    { league: "NBA", home: "Lakers", away: "Jazz", pHome: 0.9 },
    { league: "EL", home: "Real Madrid", away: "Olympiacos", pHome: 0.35 },
  ];
  const fr = pushMessage(picks, "fr");
  eq("Texte FR", fr.body, "2 matchs NBA et 1 d'EuroLeague. Plus gros favori : Lakers (90 %). Toutes les probabilités →");
  eq("Titre FR", fr.title, "🏀 Les matchs de cette nuit");
  eq("Lien FR", fr.url, "/app/matchs?utm_source=push&utm_medium=notification");
  const en = pushMessage(picks, "en");
  eq("Texte EN", en.body, "2 NBA games and 1 EuroLeague tonight. Biggest favorite: Lakers (90%). See every win probability →");
  eq("Lien EN", en.url, "/en/app/matchs?utm_source=push&utm_medium=notification");
  const one = pushMessage([picks[2]], "es");
  eq("Une seule rencontre, favori à l'extérieur", one.body, "1 partido de la Euroliga. Mayor favorito: Olympiacos (65 %). Todas las probabilidades →");
  eq("Aucun match : pas de notification", pushMessage([], "fr"), null);
  const all = PUSH_LANGS.map((l) => pushMessage(picks, l));
  const words = /\b(pari|paris|cote|cotes|mise|bet|bets|odds|apuesta|apuestas|aposta|apostas|IA|AI)\b/i;
  if (all.every((m) => m && !words.test(`${m.title} ${m.body}`) && m.body.length < 140)) ok("Quatre langues, courtes, sans vocabulaire de paris ni « IA »");
  else ko("Quatre langues", JSON.stringify(all));

  const keys = { p256dh: "B".repeat(87), auth: "a".repeat(22) };
  if (cleanSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/abcdefghij123", keys })) ok("Abonnement Chrome accepté"); else ko("Chrome", "refusé");
  if (cleanSubscription({ endpoint: "https://web.push.apple.com/QGabcdefghijklmn", keys })) ok("Abonnement Safari accepté"); else ko("Safari", "refusé");
  const bad = [
    { endpoint: "https://evil.example.com/push/abcdefghijklmnop", keys },
    { endpoint: "http://fcm.googleapis.com/fcm/send/abcdefghij123", keys },
    { endpoint: "https://fcm.googleapis.com:8443/fcm/send/abcdefghij", keys },
    { endpoint: "https://fcm.googleapis.com/fcm/send/abcdefghij123", keys: { p256dh: "x", auth: "y" } },
    { endpoint: "https://fcm.googleapis.com.evil.com/abcdefghij123", keys },
    null,
  ];
  if (bad.every((b) => cleanSubscription(b) === null)) ok("Adresses d'envoi étrangères ou clés invalides refusées");
  else ko("Refus", JSON.stringify(bad.map((b) => !!cleanSubscription(b))));
}
