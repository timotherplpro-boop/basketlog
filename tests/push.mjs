// Notifications du soir (web push) : texte du jour, contrôle des abonnements reçus et invitation de l'appli installée.
// Usage : node tests/push.mjs (lancé aussi par tests/unit.mjs)
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { pushMessage, cleanSubscription, PUSH_LANGS } from "../lib/push-text.js";
import { INVITE_KEY, INVITE_SNOOZE, OPEN_GAP, inviteDue, invitePathOk, markShown, noteOpen, noteSeen, readInvite, snoozeInvite } from "../lib/push-invite.js";

// Stockage du navigateur simulé (localStorage). broken : refuse toute lecture et écriture (navigation privée stricte).
function memStore(broken = false) {
  const m = new Map();
  return {
    getItem: (k) => { if (broken) throw new Error("refusé"); return m.has(k) ? m.get(k) : null; },
    setItem: (k, v) => { if (broken) throw new Error("refusé"); m.set(k, String(v)); },
  };
}

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

  // Invitation aux notifications dans l'appli installée (components/PushInvite.jsx, lib/push-invite.js)
  const t0 = Date.UTC(2026, 10, 27, 18, 0);
  const min = 60e3, day = 864e5;
  const st = memStore();
  eq("1re ouverture : comptée, pas d'invitation", [noteOpen(st, t0).n, inviteDue(readInvite(st), t0)], [1, false]);
  noteOpen(st, t0 + 10 * min); // rechargement ou retour rapide : même ouverture
  noteSeen(st, t0 + 20 * min); // l'appli passe en arrière-plan
  eq("Retour avant 30 min : même ouverture", readInvite(st).n, 1);
  const s2 = noteOpen(st, t0 + 20 * min + OPEN_GAP);
  eq("Retour après 30 min d'absence : 2e ouverture, invitation proposée", [s2.n, inviteDue(s2, t0 + 20 * min + OPEN_GAP)], [2, true]);
  eq("« affichée » une seule fois par ouverture", [markShown(st), markShown(st)], [true, false]);
  const t1 = t0 + 2 * day;
  snoozeInvite(st, t1);
  const s3 = noteOpen(st, t1 + day);
  eq("« Plus tard » : rien le lendemain (3e ouverture)", [s3.n, inviteDue(s3, t1 + day)], [3, false]);
  eq("« Plus tard » : toujours rien à 7 jours moins 1 minute", inviteDue(readInvite(st), t1 + INVITE_SNOOZE - min), false);
  eq("« Plus tard » : invitation de nouveau proposée après 7 jours", inviteDue(readInvite(st), t1 + INVITE_SNOOZE), true);
  eq("Nouvelle ouverture : « affichée » repart", markShown(st), true);
  const skew = memStore();
  noteOpen(skew, t0); noteOpen(skew, t0 + OPEN_GAP);
  snoozeInvite(skew, t0 + 3 * day); // heure du téléphone en avance au moment du « Plus tard »
  eq("« Plus tard » daté dans les 7 jours à venir : respecté", inviteDue(readInvite(skew), t0 + OPEN_GAP), false);
  snoozeInvite(skew, t0 + 400 * day); // horloge très déréglée
  eq("« Plus tard » daté dans plus de 7 jours : ne bloque pas pour toujours", inviteDue(readInvite(skew), t0 + OPEN_GAP), true);
  const bad1 = memStore();
  bad1.setItem(INVITE_KEY, "{pas du json");
  eq("État illisible : on repart de zéro", noteOpen(bad1, t0).n, 1);
  bad1.setItem(INVITE_KEY, JSON.stringify({ n: -4, seen: "x", snooze: null, shown: 2.7 }));
  eq("Valeurs aberrantes nettoyées", readInvite(bad1), { n: 0, seen: 0, snooze: 0, shown: 2 });
  const none = [readInvite(null), noteOpen(null, t0), inviteDue(noteOpen(null, t0), t0), markShown(null), snoozeInvite(null, t0)];
  const locked = memStore(true);
  const lockedRes = [noteOpen(locked, t0), inviteDue(noteOpen(locked, t0 + OPEN_GAP), t0 + OPEN_GAP), markShown(locked)];
  eq("Sans stockage ou stockage refusé : jamais d'invitation, aucune erreur", [none, lockedRes], [[null, null, false, false, null], [null, false, false]]);

  const paths = [["/app/matchs", ""], ["/en/app/matchs", ""], ["/", ""], ["/app", ""], ["/prochains-matchs", ""], ["/app/match/401810", ""], ["/es/app/match/401810", ""],
    ["/nba/lakers-vs-jazz-2026-11-27", ""], ["/app", "?home=lal&away=uta"], ["/pro", ""], ["/en/pro", ""], ["/paiement/retour", ""], ["/app/admin", ""], ["/widget/nba", ""]];
  eq("Pages : liste des matchs oui ; fiche match, analyse, formules, paiement, admin, widget non", paths.map(([p, q]) => invitePathOk(p, q)),
    [true, true, true, true, true, false, false, false, false, false, false, false, false, false]);

  // Textes de la carte : quatre langues, sans « IA » ni vocabulaire de paris.
  const src = readFileSync(new URL("../components/PushInvite.jsx", import.meta.url), "utf8");
  const texts = [...src.matchAll(/L\.t\(((?:"[^"]*",?\s*){4})\)/g)].map((m) => [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]));
  const banned = /\b(pari|paris|parier|cote|cotes|mise|mises|combiné|pronostic|pronostics|bet|bets|betting|odds|parlay|apuesta|apuestas|cuota|aposta|apostas|palpite|palpites|IA|AI)\b/i;
  const flat = texts.flat().join(" | ");
  if (texts.length >= 5 && texts.every((t) => t.length === 4 && t.every((x) => x.trim())) && !banned.test(flat) && flat.includes("Chaque soir, les matchs à ne pas rater")) ok(`Carte d'invitation : ${texts.length} textes en quatre langues, sans « IA » ni vocabulaire de paris`);
  else ko("Textes de la carte d'invitation", flat);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let passed = 0, failed = 0;
  const ok = (name) => { passed++; console.log(`  ok   ${name}`); };
  const ko = (name, why) => { failed++; console.log(`  ÉCHEC ${name} : ${why}`); };
  const eq = (name, got, want) => (JSON.stringify(got) === JSON.stringify(want) ? ok(name) : ko(name, `obtenu ${JSON.stringify(got)}, attendu ${JSON.stringify(want)}`));
  await pushTests({ ok, ko, eq });
  console.log(`\n${passed} réussis, ${failed} en échec`);
  process.exit(failed ? 1 : 0);
}
