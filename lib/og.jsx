import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Image de partage (réseaux sociaux, messageries, page de paiement) dans les trois langues.
// Polices Inter du site (500 et 800) chargées depuis assets/fonts : sans elles, le moteur d'image n'a
// qu'une graisse et le titre perd son gras. Le ballon reprend le logo du site.
const TXT = {
  fr: { l1: "Prédis chaque match", l2: "avant qu'il ne", l3: "commence.", sub: "NBA · EuroLeague · Probabilités, stats et scénarios" },
  en: { l1: "Predict every game", l2: "before it", l3: "starts.", sub: "NBA · EuroLeague · Probabilities, stats and scenarios" },
  es: { l1: "Predice cada partido", l2: "antes de que", l3: "empiece.", sub: "NBA · Euroliga · Probabilidades, estadísticas y escenarios" },
  pt: { l1: "Preveja cada jogo", l2: "antes que ele", l3: "comece.", sub: "NBA · Euroliga · Probabilidades, estatísticas e cenários" },
};

const BALL =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="g" cx="32%" cy="28%" r="78%"><stop offset="0" stop-color="#ffbf8a"/><stop offset=".48" stop-color="#ff7a1a"/><stop offset="1" stop-color="#b8400b"/></radialGradient><clipPath id="c"><circle cx="32" cy="32" r="31"/></clipPath></defs><circle cx="32" cy="32" r="31" fill="url(#g)"/><g clip-path="url(#c)" fill="none" stroke="#1e0a00" stroke-opacity=".75" stroke-width="2.6"><path d="M32 0v64M0 32h64"/><path d="M14 5c10 9 10 45 0 54M50 5c-10 9-10 45 0 54"/></g></svg>`
  ).toString("base64");

let fontsP;
function fonts() {
  fontsP ||= Promise.all(
    ["inter-latin-500-normal.woff", "inter-latin-800-normal.woff"].map((f) => readFile(join(process.cwd(), "assets/fonts", f)))
  )
    .then(([m, b]) => [
      { name: "Inter", data: m, weight: 500, style: "normal" },
      { name: "Inter", data: b, weight: 800, style: "normal" },
    ])
    .catch(() => null); // police absente : l'image reste lisible avec la police par défaut
  return fontsP;
}

export const OG_SIZE = { width: 1200, height: 630 };

export async function ogImage(lang, init = {}) {
  const t = TXT[lang] || TXT.fr;
  const f = await fonts();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", background: "radial-gradient(circle at 78% 40%, #3a1a06 0%, #040817 58%)", color: "#fff", fontFamily: f ? "Inter" : "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 42, fontWeight: 800, letterSpacing: -1, color: "#ff8c3a" }}>
          <img src={BALL} width={56} height={56} alt="" />
          Basketlog
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, fontSize: 84, fontWeight: 800, lineHeight: 1.04, letterSpacing: -3, color: "#ffe0c7" }}>
          <div style={{ display: "flex" }}>{t.l1}</div>
          <div style={{ display: "flex" }}>
            <span>{t.l2}</span>
            <span style={{ color: "#ff7a1a", marginLeft: 19 }}>{t.l3}</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 42, fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,.75)" }}>{t.sub}</div>
      </div>
    ),
    { ...OG_SIZE, ...(f ? { fonts: f } : {}), ...init }
  );
}

// Image de partage d'une fiche de match : les deux équipes, leurs probabilités et le score projeté (ou final).
// Tout vient de l'adresse de l'image (aucun appel de données) ; textes courts et nombres bornés.
const clip = (s, n) => String(s || "").replace(/[^\p{L}\p{N} .'&-]/gu, "").slice(0, n);
export async function matchOgImage(q, init = {}) {
  const f = await fonts();
  const lang = ["es", "fr", "pt"].includes(q.get("lang")) ? q.get("lang") : "en";
  const away = clip(q.get("a"), 22), home = clip(q.get("h"), 22);
  const pa = Math.max(0, Math.min(100, parseInt(q.get("pa"), 10) || 50)), ph = 100 - pa;
  const score = /^\d{2,3}-\d{2,3}$/.test(q.get("s") || "") ? q.get("s") : null;
  const final = q.get("f") === "1";
  const day = clip(q.get("d"), 30);
  const logo = (u) => (/^https:\/\/a\.espncdn\.com\//.test(u || "") ? u : null);
  const la = logo(q.get("la")), lh = logo(q.get("lh"));
  const T = {
    en: { pred: "prediction", win: "win", proj: final ? "Final score" : "Projected score", foot: "Free win probabilities for every NBA game" },
    es: { pred: "pronóstico", win: "victoria", proj: final ? "Resultado final" : "Marcador proyectado", foot: "Probabilidades gratis para cada partido de la NBA" },
    pt: { pred: "palpite", win: "vitória", proj: final ? "Resultado final" : "Placar projetado", foot: "Probabilidades grátis para cada jogo da NBA" },
    fr: { pred: "pronostic", win: "victoire", proj: final ? "Score final" : "Score projeté", foot: "Probabilités gratuites pour chaque match NBA" },
  }[lang];
  const side = (name, p, lg, fav) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 360 }}>
      {lg ? <img src={lg} width={150} height={150} alt="" /> : <div style={{ display: "flex", width: 150, height: 150 }} />}
      <div style={{ display: "flex", marginTop: 14, fontSize: 40, fontWeight: 800, color: "#fff" }}>{name}</div>
      <div style={{ display: "flex", marginTop: 6, fontSize: 64, fontWeight: 800, color: fav ? "#ff7a1a" : "rgba(255,255,255,.55)" }}>{p}%</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "44px 70px", background: "radial-gradient(circle at 50% 30%, #2a1406 0%, #040817 62%)", color: "#fff", fontFamily: f ? "Inter" : "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, fontWeight: 800, color: "#ff8c3a" }}>
            <img src={BALL} width={44} height={44} alt="" />
            Basketlog
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 500, color: "rgba(255,255,255,.7)" }}>{`NBA · ${day}`}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26 }}>
          {side(away, pa, la, pa >= ph)}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: "rgba(255,255,255,.65)" }}>{T.proj}</div>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 800, color: "#ffe0c7" }}>{score || "vs"}</div>
          </div>
          {side(home, ph, lh, ph > pa)}
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 28, fontWeight: 500, color: "rgba(255,255,255,.75)" }}>{`${T.foot} · basketlog-app.com${lang === "fr" ? "" : `/${lang}`}`}</div>
      </div>
    ),
    { ...OG_SIZE, ...(f ? { fonts: f } : {}), ...init }
  );
}

// Image de partage d'un classement de probabilités (chances de titre, de Coupe…) : titre + 5 lignes « équipe – % ».
// Paramètres : h (titre), s (sous-titre), r (« Spurs|21,Celtics|19,… »).
export async function oddsOgImage(q, init = {}) {
  const f = await fonts();
  const h = (q.get("h") || "Basketlog").slice(0, 80);
  const sub = (q.get("s") || "").slice(0, 90);
  const rows = (q.get("r") || "").split(",").map((x) => x.split("|")).filter((x) => x[0]).slice(0, 5).map(([n, p]) => [n.slice(0, 26), Math.max(0, Math.min(100, Number(p) || 0))]);
  const max = Math.max(1, ...rows.map((x) => x[1]));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "48px 70px", background: "radial-gradient(circle at 80% 20%, #2a1406 0%, #040817 62%)", color: "#fff", fontFamily: f ? "Inter" : "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 26, color: "#ff7a1a", fontWeight: 800, letterSpacing: 1 }}>BASKETLOG</div>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 800, marginTop: 10, lineHeight: 1.1 }}>{h}</div>
        {sub ? <div style={{ display: "flex", fontSize: 26, color: "#9aa3b8", marginTop: 8 }}>{sub}</div> : null}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 26, gap: 14 }}>
          {rows.map(([n, p], i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ display: "flex", width: 40, fontSize: 30, color: "#9aa3b8", fontWeight: 800 }}>{i + 1}</div>
              <div style={{ display: "flex", width: 330, fontSize: 34, fontWeight: 800 }}>{n}</div>
              <div style={{ display: "flex", height: 34, width: Math.round((p / max) * 520), background: "#ff7a1a", borderRadius: 8 }} />
              <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>{p < 1 ? "<1" : Math.round(p)}%</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...OG_SIZE, ...(f ? { fonts: f } : {}), ...init }
  );
}

// Image de partage du jeu « Bats le modèle » : sans score, l'affiche du jeu ; avec score (?u=7&m=6&n=10), le duel
// joueur contre modèle. Langue : ?lang=fr|en|es|pt.
const DEFI = {
  fr: { title: "Bats le modèle", sub: "Choisis les vainqueurs NBA de ce soir. Gratuit.", you: "Moi", model: "Modèle Basketlog", won: "J'ai battu le modèle", lost: "Mon score face au modèle", of: (n) => `sur ${n} matchs` },
  en: { title: "Beat the model", sub: "Pick tonight's NBA winners. Free.", you: "Me", model: "Basketlog model", won: "I beat the model", lost: "My score vs the model", of: (n) => `out of ${n} games` },
  es: { title: "Gana al modelo", sub: "Elige los ganadores NBA de esta noche. Gratis.", you: "Yo", model: "Modelo Basketlog", won: "Le gané al modelo", lost: "Mi resultado contra el modelo", of: (n) => `de ${n} partidos` },
  pt: { title: "Vença o modelo", sub: "Escolha os vencedores da NBA de hoje. Grátis.", you: "Eu", model: "Modelo Basketlog", won: "Venci o modelo", lost: "Meu resultado contra o modelo", of: (n) => `de ${n} jogos` },
};
export async function defiOgImage(q, init = {}) {
  const f = await fonts();
  const T = DEFI[q.get("lang")] || DEFI.fr;
  const n = Math.min(30, Math.max(0, parseInt(q.get("n"), 10) || 0));
  const u = Math.min(n, Math.max(0, parseInt(q.get("u"), 10) || 0));
  const m = Math.min(n, Math.max(0, parseInt(q.get("m"), 10) || 0));
  const scored = n > 0;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "52px 70px", background: "radial-gradient(circle at 80% 20%, #2a1406 0%, #040817 62%)", color: "#fff", fontFamily: f ? "Inter" : "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={BALL} width={54} height={54} alt="" />
          <div style={{ display: "flex", fontSize: 30, color: "#ff7a1a", fontWeight: 800, letterSpacing: 1 }}>BASKETLOG</div>
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, marginTop: 26 }}>{scored ? (u > m ? T.won : T.lost) : T.title}</div>
        {scored ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 60, marginTop: 30 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 150, fontWeight: 800, color: u >= m ? "#ff7a1a" : "#fff", lineHeight: 1 }}>{u}</div>
              <div style={{ display: "flex", fontSize: 30, color: "#9aa3b8" }}>{T.you}</div>
            </div>
            <div style={{ display: "flex", fontSize: 90, fontWeight: 800, color: "#9aa3b8", lineHeight: 1.3 }}>–</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 150, fontWeight: 800, color: m > u ? "#ff7a1a" : "#fff", lineHeight: 1 }}>{m}</div>
              <div style={{ display: "flex", fontSize: 30, color: "#9aa3b8" }}>{T.model}</div>
            </div>
            <div style={{ display: "flex", fontSize: 34, color: "#9aa3b8", marginBottom: 42 }}>{T.of(n)}</div>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 38, color: "#9aa3b8", marginTop: 20 }}>{T.sub}</div>
        )}
      </div>
    ),
    { ...OG_SIZE, ...(f ? { fonts: f } : {}), ...init }
  );
}

// Image du jeu de Noël 2026 (page /concours, posts des réseaux) : « og » 1200×630 (aperçu de lien), « portrait »
// 1080×1350 (Instagram, Facebook), « carre » 1080×1080. Aucun logo de marque ni photo : texte, ballon et paquet cadeau dessinés.
const CONCOURS_SIZES = { og: { width: 1200, height: 630 }, portrait: { width: 1080, height: 1350 }, carre: { width: 1080, height: 1080 } };
const giftBox = (s) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: s }}>
    <div style={{ display: "flex", width: s * 0.56, height: s * 0.17, justifyContent: "space-between" }}>
      <div style={{ display: "flex", width: s * 0.25, height: s * 0.17, borderRadius: s * 0.09, border: `${Math.round(s * 0.04)}px solid #ffe0c7` }} />
      <div style={{ display: "flex", width: s * 0.25, height: s * 0.17, borderRadius: s * 0.09, border: `${Math.round(s * 0.04)}px solid #ffe0c7` }} />
    </div>
    <div style={{ display: "flex", justifyContent: "center", width: s * 0.94, height: s * 0.2, borderRadius: s * 0.03, background: "#ff7a1a" }}>
      <div style={{ display: "flex", width: s * 0.13, height: "100%", background: "#ffe0c7" }} />
    </div>
    <div style={{ display: "flex", justifyContent: "center", width: s * 0.84, height: s * 0.6, borderRadius: `0 0 ${Math.round(s * 0.03)}px ${Math.round(s * 0.03)}px`, background: "linear-gradient(180deg, #e8650f 0%, #b8400b 100%)" }}>
      <div style={{ display: "flex", width: s * 0.13, height: "100%", background: "#ffe0c7" }} />
    </div>
  </div>
);
export async function concoursOgImage(format = "og", init = {}) {
  const f = await fonts();
  const fmt = CONCOURS_SIZES[format] ? format : "og";
  const size = CONCOURS_SIZES[fmt];
  const wide = fmt === "og";
  const k = fmt === "portrait" ? 1 : fmt === "carre" ? 0.86 : 0.58;
  const px = (n) => Math.round(n * k);
  const align = wide ? "flex-start" : "center";
  const text = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align, gap: px(34) }}>
      <div style={{ display: "flex", alignItems: "center", gap: px(16), fontSize: px(46), fontWeight: 800, color: "#ff8c3a" }}>
        <img src={BALL} width={px(58)} height={px(58)} alt="" />
        Basketlog
      </div>
      <div style={{ display: "flex", padding: `${px(12)}px ${px(30)}px`, borderRadius: 999, background: "#ff7a1a", color: "#fff", fontSize: px(34), fontWeight: 800, letterSpacing: px(3) }}>JEU DE NOËL</div>
      {fmt === "portrait" ? giftBox(250) : null}
      <div style={{ display: "flex", flexDirection: "column", alignItems: align, lineHeight: 1.02 }}>
        <div style={{ display: "flex", fontSize: px(176), fontWeight: 800, color: "#ffe0c7" }}>1 PS5</div>
        <div style={{ display: "flex", fontSize: px(64), fontWeight: 800, color: "#fff", marginTop: px(8) }}>+ 1 maillot de</div>
        <div style={{ display: "flex", fontSize: px(84), fontWeight: 800, letterSpacing: px(-2), color: "#ff7a1a" }}>Victor Wembanyama</div>
        <div style={{ display: "flex", fontSize: px(64), fontWeight: 800, color: "#fff", marginTop: px(6) }}>à gagner</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: align, gap: px(10) }}>
        <div style={{ display: "flex", fontSize: px(40), fontWeight: 800, color: "#fff" }}>Gratuit : crée ton compte Basketlog</div>
        <div style={{ display: "flex", fontSize: px(40), fontWeight: 500, color: "rgba(255,255,255,.85)" }}>Tirage au sort le 20 décembre</div>
        <div style={{ display: "flex", fontSize: px(40), fontWeight: 800, color: "#ff8c3a" }}>basketlog-app.com/concours</div>
      </div>
      <div style={{ display: "flex", fontSize: px(26), fontWeight: 500, color: "rgba(255,255,255,.6)" }}>Sans obligation d&apos;achat · France métropolitaine · 18 ans et plus</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: wide ? "space-between" : "center", padding: wide ? "0 80px" : "60px", background: "radial-gradient(circle at 50% 32%, #3a1a06 0%, #040817 64%)", color: "#fff", fontFamily: f ? "Inter" : "sans-serif" }}>
        {text}
        {wide ? giftBox(300) : null}
      </div>
    ),
    { ...size, ...(f ? { fonts: f } : {}), ...init }
  );
}
