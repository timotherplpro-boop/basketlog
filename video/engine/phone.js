// Écrans « téléphone » des vidéos : fiche match (vue visiteur : partie gratuite puis analyse verrouillée)
// et liste des matchs du jour, reconstruites à partir des données du jour avec les classes CSS du site.
(function () {
  const BADGE = { UTAH: "UTA" };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tb = (abbr) => `<i class="tb">${esc(BADGE[abbr] || abbr || "")}</i>`;
  const FONTS = ["inter/latin-400", "inter/latin-500", "inter/latin-600", "inter/latin-700", "inter/latin-800", "jetbrains-mono/latin-500", "jetbrains-mono/latin-700", "tilt-warp/latin-400"]
    .map((f) => `<link rel="stylesheet" href="fonts/${f}.css">`).join("");
  const HEAD = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${FONTS}`
    + `<link rel="stylesheet" href="globals.css"><link rel="stylesheet" href="phone.css"></head><body><div class="shell">`
    + `<header class="sb-top"><a class="logo"><span class="ball"></span> Basketlog</a><button class="burger"><i></i><i></i></button></header><div class="shell-main">`;
  const FOOT = `</div></div></body></html>`;
  const pnum = (s) => parseFloat(String(s || "").replace(",", ".")) || 0;

  function matchHTML(g) {
    const pA = pnum(g.probs?.[0]?.v), pH = pnum(g.probs?.[1]?.v);
    const side = (t, id) => `<a class="team" id="${id}">${tb(t.abbr)}<div class="team-name">${esc(t.name)}</div><div class="team-rec mono"><span>${esc(t.record)}</span><span class="sep"> · </span><span>${esc(t.side)}</span></div></a>`;
    const fside = (f) => `<div class="ar-fside">${tb(f.abbr)}<div><b>${esc(f.name)}</b><small>${esc(f.label)}</small></div></div>`;
    const fteam = (c) => `<div class="ar-team"><div class="ar-tname">${tb(c.abbr)}${esc(c.name)}</div><div>Forme&nbsp;: <span class="ar-chips">${esc(c.chips)}</span></div><div>V-D&nbsp;: ${esc(c.vd)}</div></div>`;
    const ghost = (w) => `<div class="card block ghost"><div class="gl ${w[0]}"></div><div class="gl"></div><div class="gl ${w[1]}"></div><div class="gl ${w[2]}"></div></div>`;
    return HEAD + `<main class="app-page">
<a class="back">← Retour</a>
<h1 class="match-title">${esc(g.title)}<span>${esc(g.subtitle)}</span></h1>
<div class="card match-hero" id="hero"><div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:20px;flex-wrap:wrap"><span class="tag">${esc(g.tag)}</span><span class="team-rec">${esc(g.venue)}</span></div>
<div class="match-teams">${side(g.away, "t-away")}<div class="proj"><div class="label">Score projeté</div><div class="score">${esc(g.proj)}</div></div>${side(g.home, "t-home")}</div>
<div style="margin-top:26px"><div class="probbar"><div style="width:${pA}%;background:#6f675f"></div><div style="width:${pH}%;background:var(--orange)"></div></div><div class="prob-labels mono"><span><strong>${esc(g.probs?.[0]?.v)}</strong><small>${esc(g.probs?.[0]?.l)}</small></span><span><strong>${esc(g.probs?.[1]?.v)}</strong><small>${esc(g.probs?.[1]?.l)}</small></span></div></div></div>
<section class="panel ar">
<div class="ar-card"><div class="ar-h"><h2>📊 Forme récente</h2><small>5 derniers matchs (saison en cours)</small></div><div class="ar-fsides">${(g.form || []).map(fside).join("")}</div><button class="ar-ftoggle">Voir la forme à domicile et à l'extérieur</button></div>
<div class="ar-teams">${(g.chips || []).map(fteam).join("")}</div>
<div class="ar-sec"><h3>🔍 Résumé rapide</h3><p>${esc(g.resume)}</p><small class="ar-note">Généré par le modèle Basketlog à partir des résultats, des stats et de l'infirmerie.</small></div>
<div class="ar-sec"><h3>📌 Scénario n° 1</h3><div class="ar-box"><p>${esc(g.scenario1)}</p></div></div>
<div class="ar-sec"><h3>🎯 Confiance du modèle</h3><div class="ar-box ar-conf"><div class="ar-cbar"><i style="width:${esc(g.confW || "62%")}"></i></div><b>${esc(g.conf)}</b><small>Niveau de confiance basé sur l'écart entre les deux équipes et le nombre de matchs déjà joués cette saison.</small></div></div>
<div class="gated locked ar-locked" id="gate">
<div class="ar-sec ar-lockhead"><h3>📈 Probabilités exactes</h3></div>
<div class="gate-content">${ghost(["w40", "", "w70"])}<div class="grid2">${ghost(["w60", "", "w40"])}${ghost(["w50", "w70", ""])}</div>${ghost(["w40", "w60", ""])}${ghost(["w50", "w70", ""])}</div>
<div class="gate-overlay"><div class="gate-box"><h3>Tu n'as accès qu'à 30 % de l'analyse</h3><div class="gate-meter"><i style="width:30%"></i></div>
<p>L'analyse complète contient les probabilités exactes, l'argumentation du modèle, tous les scénarios, les stats comparées et l'infirmerie. Elle est incluse dans Pro et Lifetime ; Starter donne 1 analyse réduite par jour.</p>
<a class="btn-solid">🔓 Débloquer l'analyse complète</a><a class="gate-login">Déjà abonné ? Se connecter</a></div></div>
</div>
</section>
<p class="disclaimer">Probabilités estimées par le modèle Basketlog à partir des données publiques disponibles. Elles ne constituent ni une certitude ni un conseil de pari.</p>
</main>` + FOOT;
  }

  function listHTML(day) {
    const row = (r) => {
      const [a, h] = r.teams;
      const m = String(r.when || "").match(/^(\d\d\/\d\d)(\d\d:\d\d)$/);
      const id = (String(r.href || "").match(/match\/(\d+)/) || [])[1] || "";
      return `<a class="up-row" data-id="${esc(id)}"><div class="when">${esc(m ? m[1] : "")}<b>${esc(m ? m[2] : r.when)}</b></div><div class="m"><span class="t"><span class="${a.fav ? "fav" : ""}">${esc(a.name)}</span>${tb(a.abbr)}</span><span class="vs">@</span><span class="t">${tb(h.abbr)}<span class="${h.fav ? "fav" : ""}">${esc(h.name)}</span></span></div><span class="p">${esc(r.p)}</span></a>`;
    };
    return HEAD + `<main class="app-page"><div class="app-head"><h1>${esc(day.head || "Matchs NBA de ce soir")}</h1><p>${esc(day.headSub || "")}</p></div>`
      + `<div style="display:flex;justify-content:center;gap:8px;margin-top:18px"><a class="btn-white">← Veille</a><a class="btn-white">Lendemain →</a></div>`
      + `<div class="panel up-list"><div>${(day.rows || []).map(row).join("")}</div></div></main>` + FOOT;
  }

  window.PHONE = { matchHTML, listHTML };
})();
