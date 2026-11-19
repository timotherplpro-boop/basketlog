// Jeu « Bats le modèle » : semaine, nom public, score, classement, paramètre de partage.
import { displayName, leaderboard, parseShare, scoreByDay, scorePicks, weekBounds } from "../lib/defi-score.js";

export async function defiTests({ ok, ko, eq }) {
  console.log("Jeu « Bats le modèle »");
  eq("défi : semaine du lundi au dimanche", [weekBounds("20261119"), weekBounds("20261123"), weekBounds("20261122")], [{ from: "20261116", to: "20261122" }, { from: "20261123", to: "20261129" }, { from: "20261116", to: "20261122" }]);
  eq("défi : nom public sans adresse", [displayName("Timothé Rapalli"), displayName("tim.dupont84"), displayName("jdoe1987"), displayName("", "bl_1").startsWith("#"), displayName("a@b.com", "x").includes("@")], ["Timothé R.", "Tim", "Jdoe", true, false]);
  const results = { g1: { w: "13" }, g2: { w: "2" }, g3: { w: "5" } };
  const picks = [{ d: "20261118", g: "g1", p: "13", m: "13" }, { d: "20261118", g: "g2", p: "2", m: "1" }, { d: "20261118", g: "g3", p: "6", m: "5" }, { d: "20261119", g: "g4", p: "7", m: "7" }];
  eq("défi : score (joueur, modèle, en attente)", scorePicks(picks, results), { n: 3, me: 2, model: 2, pending: 1 });
  eq("défi : score par jour", scoreByDay(picks, results).map((x) => [x.d, x.n]), [["20261119", 0], ["20261118", 3]]);
  const rows = [
    ...picks.map((x) => ({ ...x, u: "a", n: "Ana Lopez" })),
    { u: "b", n: "Bob", d: "20261118", g: "g1", p: "13", m: "13" }, { u: "b", n: "Bob", d: "20261118", g: "g2", p: "2", m: "1" }, { u: "b", n: "Bob", d: "20261118", g: "g3", p: "5", m: "5" },
    { u: "c", n: "", d: "20261119", g: "g4", p: "7", m: "7" },
  ];
  const lb = leaderboard(rows, results);
  eq("défi : classement (sans identifiant, joueur sans match terminé exclu)", lb.map((r) => [r.rank, r.name, r.me, r.model, r.n, "u" in r]), [[1, "Bob", 3, 2, 3, false], [2, "Ana L.", 2, 2, 3, false]]);
  eq("défi : partage", [parseShare("7-6-10"), parseShare("11-6-10"), parseShare("x"), parseShare("0-0-0")], [{ u: 7, m: 6, n: 10 }, null, null, null]);
}
