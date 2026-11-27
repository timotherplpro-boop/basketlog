// Articles de l'actu du jour (27/11/2026) : adresse propre /actu/<identifiant du post Bluesky>-<titre>, découpage de
// l'identifiant, adresses courtes de ?actu=1, lecture du flux Bluesky, stats et score de l'article.
// lib/actu.js lit sa clé de signature au chargement : chargé ici avec une clé de test, puis l'environnement est rétabli.
export async function actuTests({ ok, ko, eq }) {
  console.log("Actu du jour : articles");
  const prev = process.env.SESSION_SECRET;
  if (!prev) process.env.SESSION_SECRET = "cle-de-test-actu";
  const m = await import("../lib/actu.js");
  if (prev === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = prev;
  const check = (name, cond, why) => (cond ? ok(name) : ko(name, why));
  const { actuSlug, actuId, actuPath, parseActuId, actuShortUrls, actuItems, actuDate, actuStats, actuScore, actuScoreText, actuDescription, actuParagraphs, actuToken, readActu, ACTU_BSKY_DID } = m;

  // --- Titre -> adresse
  const t = "Wembanyama : 44 points, mais les Spurs tombent à Portland";
  eq("slug : minuscules, sans accents ni ponctuation", actuSlug(t), "wembanyama-44-points-mais-les-spurs-tombent-a-portland");
  eq("slug : ligatures et apostrophes", actuSlug("Œuvre d’art : le cœur de Gobert, l'âme des Wolves"), "oeuvre-d-art-le-coeur-de-gobert-l-ame-des-wolves");
  eq("slug : guillemets, émojis et signes retirés", actuSlug("🔥 « Doncic » : 50 % aux tirs !!"), "doncic-50-aux-tirs");
  const full = "victor-wembanyama-signe-une-nouvelle-performance-historique-avec-quarante-quatre-points-et-seize-rebonds-face-aux-blazers";
  const long = actuSlug("Victor Wembanyama signe une nouvelle performance historique avec quarante-quatre points et seize rebonds face aux Blazers");
  check("slug : 80 signes au plus, coupé entre deux mots", long.length <= 80 && long.length > 60 && full.startsWith(long) && full[long.length] === "-", long);
  eq("slug : titre vide ou sans lettre", [actuSlug(""), actuSlug("🏀🏀"), actuSlug(null)], ["", "", ""]);
  eq("identifiant : <rkey>-<slug>", actuId("3n3bs5ep3km2s", t), "3n3bs5ep3km2s-wembanyama-44-points-mais-les-spurs-tombent-a-portland");
  eq("identifiant sans slug : le rkey seul", [actuId("3n3bs5ep3km2s", "🏀"), actuPath("3n3bs5ep3km2s", "")], ["3n3bs5ep3km2s", "/actu/3n3bs5ep3km2s"]);

  // --- Adresse -> identifiant Bluesky
  eq("découpage : rkey et slug", parseActuId("3n3bs5ep3km2s-wembanyama-44-points"), { rkey: "3n3bs5ep3km2s", slug: "wembanyama-44-points" });
  eq("découpage : rkey seul", parseActuId("3n3bs5ep3km2s"), { rkey: "3n3bs5ep3km2s", slug: "" });
  eq("découpage : mauvais titre gardé tel quel (redirection ensuite)", parseActuId("3n3bs5ep3km2s-Ancien-Titre"), { rkey: "3n3bs5ep3km2s", slug: "Ancien-Titre" });
  eq("découpage : adresses refusées", [parseActuId(""), parseActuId("og"), parseActuId("abc-def"), parseActuId("3N3BS5EP3KM2S-x"), parseActuId("../3n3bs5ep3km2s"), parseActuId("-3n3bs5ep3km2s"), parseActuId(undefined)], [null, null, null, null, null, null, null]);
  const id = actuId("3n3bs5ep3km2s", t);
  eq("aller-retour titre -> adresse -> rkey", parseActuId(id)?.rkey, "3n3bs5ep3km2s");

  // --- Adresses courtes de ?actu=1 : short.page = adresse propre
  const s = actuShortUrls("3n3bs5ep3km2s", t);
  eq("short.page : adresse propre de l'article", s.page, `https://basketlog-app.com/actu/${id}`);
  eq("short : visuels toujours par ?b=", [s.og, s.portrait, s.thumb], ["og", "portrait", "thumb"].map((f) => `https://basketlog-app.com/actu/og?b=3n3bs5ep3km2s&f=${f}`));

  // --- Date de publication : date du jeton, avec l'heure du post Bluesky le même jour
  eq("date : heure du post le même jour", actuDate({ d: "2026-11-27" }, "2026-11-27T09:12:34.567Z"), "2026-11-27T09:12:34.567Z");
  eq("date : jour du jeton sinon", [actuDate({ d: "2026-11-27" }, "2026-11-29T09:00:00Z"), actuDate({ d: "2026-11-27" }, undefined), actuDate({ d: "2026-11-27" }, "pas une date")], ["2026-11-27", "2026-11-27", "2026-11-27"]);

  // --- Flux Bluesky -> articles (lecteur de jeton simulé)
  const fake = (k) => (k === "bon" ? { t, x: "", d: "2026-11-27" } : null);
  const post = (rkey, uri, extra = {}) => ({ post: { uri: `at://${ACTU_BSKY_DID}/app.bsky.feed.post/${rkey}`, author: { did: ACTU_BSKY_DID }, record: { createdAt: "2026-11-27T10:00:00.000Z", embed: { external: { uri } } } }, ...extra });
  const feed = [
    post("3n3bs5ep3km2s", "https://basketlog-app.com/actu?k=bon"),
    post("3n3bs5ep3km2s", "https://basketlog-app.com/actu?k=bon"), // doublon
    post("3n3aaaaaaaaa2", "https://basketlog-app.com/app/matchs"), // post du jour sans actu
    post("3n3bbbbbbbbb2", "https://basketlog-app.com/actu?k=faux"), // jeton invalide
    post("3n3ccccccccc2", "https://exemple.com/actu?k=bon"), // autre site
    post("3n3ddddddddd2", "https://basketlog-app.com/actu?k=bon", { reason: { $type: "app.bsky.feed.defs#reasonRepost" } }), // repartage
    { post: { uri: "at://x/app.bsky.feed.post/3n3eeeeeeeee2", record: { text: "sans carte" } } },
    null,
  ];
  eq("flux : seuls les vrais articles, sans doublon", actuItems(feed, fake).map((x) => [x.rkey, x.path, x.at]), [["3n3bs5ep3km2s", `/actu/${id}`, "2026-11-27T10:00:00.000Z"]]);
  eq("flux : réponse vide ou inattendue", [actuItems(undefined, fake), actuItems({}, fake)], [[], []]);

  // --- Jeton réel dans la carte (adresse encodée comme dans les posts)
  try {
    const k = actuToken({ t, x: "Le Français a tout tenté.", n: "44 POINTS|16 REBONDS", m: "Spurs|111|116|Blazers", d: "2026-11-27" });
    const card = `https://basketlog-app.com/actu?k=${encodeURIComponent(k)}`;
    const got = actuItems([post("3n3bs5ep3km2s", card)]);
    eq("flux : jeton signé lu depuis la carte Bluesky", [got.length, got[0]?.a?.t, got[0]?.path], [1, t, `/actu/${id}`]);
    eq("jeton : falsifié refusé", readActu(k.replace(/^./, (c) => (c === "e" ? "f" : "e"))), null);
  } catch (e) {
    ko("jeton de test", e.message);
  }

  // --- Contenu de l'article
  eq("stats : nombre et libellé", actuStats("44 POINTS|16 REBONDS| 55 % AUX TIRS |10/12 LANCERS"), [{ v: "44", l: "points" }, { v: "16", l: "rebonds" }, { v: "55 %", l: "aux tirs" }, { v: "10/12", l: "lancers" }]);
  eq("stats : sans nombre ou vide", [actuStats("TRIPLE-DOUBLE"), actuStats(""), actuStats(undefined)], [[{ v: "", l: "TRIPLE-DOUBLE" }], [], []]);
  eq("score : « A|111|116|B »", [actuScore("Spurs|111|116|Blazers"), actuScoreText("Spurs|111|116|Blazers")], [{ a: "Spurs", sa: "111", sb: "116", b: "Blazers" }, "Spurs 111 – 116 Blazers"]);
  eq("score : forme invalide", [actuScore("Spurs|111|Blazers"), actuScore("Spurs|a|b|Blazers"), actuScore("")], [null, null, null]);
  eq("paragraphes", actuParagraphs("Un.\n\nDeux.\nTrois.\n"), ["Un.", "Deux.", "Trois."]);
  const d1 = actuDescription({ t, x: "Mot ".repeat(60) });
  check("description : 160 signes au plus, coupée entre deux mots", d1.length <= 160 && /Mot…$/.test(d1), d1);
  eq("description : sans texte, faite des chiffres", actuDescription({ t, w: "Victor Wembanyama", n: "44 POINTS|16 REBONDS", m: "Spurs|111|116|Blazers" }), "Victor Wembanyama · 44 points, 16 rebonds · Spurs 111 – 116 Blazers. L'actu NBA du jour sur Basketlog.");
}
