import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BF, BF_PRICES, bfEur, bfLang } from "./black-friday.js";
import { JG_TXT, jgLang } from "./jour-gratuit.js";

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

// Image du jeu de Noël 2026 (page /concours, posts des réseaux), en français, anglais ou espagnol : « og » 1200×630
// (aperçu de lien), « portrait » 1080×1350 (Instagram, Facebook), « carre » 1080×1080. Aucun logo de marque ni photo.
const CONCOURS_SIZES = { og: { width: 1200, height: 630 }, portrait: { width: 1080, height: 1350 }, carre: { width: 1080, height: 1080 } };
const CONCOURS_TXT = {
  fr: { badge: "JEU DE NOËL", label: "À GAGNER", head: "1 PS5", subA: "+ 1 maillot de", c1: "PS5", c2: "Maillot Wemby", date: "Tirage au sort le 20 décembre", cta: "Passe Pro et participe", url: "basketlog-app.com/concours", legal: "Abonnement Pro requis (9,99 €/mois) · Voir règlement · 18 ans et +" },
  en: { badge: "CHRISTMAS GIVEAWAY", label: "WIN", head: "A PS5", subA: "+ a jersey of", c1: "PS5", c2: "Wemby jersey", date: "Winners drawn on December 20", cta: "Go Pro to enter", url: "basketlog-app.com/en/concours", legal: "Pro subscription required (€9.99/mo) · See official rules · 18+" },
  es: { badge: "SORTEO DE NAVIDAD", label: "SORTEAMOS", head: "1 PS5", subA: "+ 1 camiseta de", c1: "PS5", c2: "Camiseta de Wemby", date: "Sorteo el 20 de diciembre", cta: "Hazte Pro y participa", url: "basketlog-app.com/es/concours", legal: "Suscripción Pro obligatoria (9,99 €/mes) · Ver bases · +18" },
};
// Confettis et flocons (positions en % de l'image), placés sur les bords pour ne jamais toucher le texte.
const DECO = {
  tall: {
    confetti: [[3, 13, "#ff7a1a", 20], [6, 30, "#ffd08a", -30], [2, 49, "#ffffff", 45], [5, 76, "#ff7a1a", -15], [3, 93, "#ffd08a", 60], [94, 15, "#ffd08a", 35], [96, 33, "#ff7a1a", -40], [93, 75, "#ffffff", 15], [95, 91, "#ff7a1a", 50], [47, 1.5, "#ffffff", 70]],
    snow: [[7, 21, 6], [2, 38, 4], [8, 61, 5], [4, 85, 6], [95, 24, 6], [91, 45, 4], [97, 60, 6], [92, 83, 5], [22, 2, 4], [76, 2, 5]],
  },
  wide: {
    confetti: [[52, 10, "#ff7a1a", 20], [58, 30, "#ffd08a", -30], [54, 55, "#ffffff", 45], [60, 78, "#ff7a1a", -15], [51, 92, "#ffd08a", 60], [97, 8, "#ffd08a", 35], [98, 50, "#ff7a1a", -40], [1.5, 92, "#ffffff", 15], [30, 95, "#ff7a1a", 50], [22, 2, "#ffd08a", -20]],
    snow: [[56, 18, 5], [61, 44, 4], [53, 70, 6], [59, 88, 5], [2, 22, 4], [97, 30, 5], [97, 72, 5], [45, 4, 4], [40, 96, 4]],
  },
};
let titleFontP;
function titleFont() {
  titleFontP ||= readFile(join(process.cwd(), "assets/fonts", "tilt-warp-latin-400-normal.woff"))
    .then((data) => ({ name: "Tilt Warp", data, weight: 400, style: "normal" }))
    .catch(() => null);
  return titleFontP;
}
const prizeCard = (icon, iw, ih, label, w, h, fs) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: Math.round(h * 0.07), width: w, height: h, borderRadius: Math.round(w * 0.08), border: "2px solid rgba(255,255,255,.14)", backgroundImage: "linear-gradient(160deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,.03) 100%)", boxShadow: "0 24px 60px rgba(0,0,0,.45)" }}>
    <img src={icon} width={iw} height={ih} alt="" />
    <div style={{ display: "flex", fontSize: fs, fontWeight: 800, color: "#fff" }}>{label}</div>
  </div>
);
export async function concoursOgImage(format = "og", init = {}, lang = "fr") {
  const [f, tf] = await Promise.all([fonts(), titleFont()]);
  const { GAMEPAD_SVG, JERSEY_SVG, ARROW_SVG } = await import("./concours-art.js");
  const T = CONCOURS_TXT[lang] || CONCOURS_TXT.en;
  const fmt = CONCOURS_SIZES[format] ? format : "og";
  const size = CONCOURS_SIZES[fmt];
  const wide = fmt === "og";
  const k = fmt === "portrait" ? 1 : fmt === "carre" ? 0.82 : 0.62;
  const px = (n) => Math.round(n * k);
  const title = tf ? "Tilt Warp" : f ? "Inter" : "sans-serif";
  const D = wide ? DECO.wide : DECO.tall;
  const deco = [
    ...D.snow.map(([x, y, r], i) => <div key={`s${i}`} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: px(r * 2), height: px(r * 2), borderRadius: 999, background: "rgba(255,255,255,.55)" }} />),
    ...D.confetti.map(([x, y, c, a], i) => <div key={`c${i}`} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: px(26), height: px(10), borderRadius: px(4), background: c, opacity: 0.85, transform: `rotate(${a}deg)` }} />),
  ];
  const brand = (
    <div style={{ display: "flex", alignItems: "center", gap: px(14), fontSize: px(40), fontWeight: 800, color: "#fff" }}>
      <img src={BALL} width={px(52)} height={px(52)} alt="" />
      Basketlog
    </div>
  );
  const badge = <div style={{ display: "flex", padding: `${px(12)}px ${px(26)}px`, borderRadius: 999, background: "rgba(255,122,26,.16)", border: "2px solid rgba(255,140,58,.7)", color: "#ffb27a", fontSize: px(26), fontWeight: 800, letterSpacing: px(3) }}>{T.badge}</div>;
  const hero = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: wide ? "flex-start" : "center" }}>
      <div style={{ display: "flex", fontSize: px(34), fontWeight: 800, letterSpacing: px(10), color: "#ff8c3a" }}>{T.label}</div>
      <div style={{ display: "flex", fontFamily: title, fontSize: px(200), lineHeight: 1, color: "#fff", textShadow: "0 10px 50px rgba(255,122,26,.55)", marginTop: px(6) }}>{T.head}</div>
      <div style={{ display: "flex", fontSize: px(48), fontWeight: 800, color: "#fff", marginTop: px(10) }}>{T.subA}</div>
      <div style={{ display: "flex", fontFamily: title, fontSize: px(82), lineHeight: 1.05, color: "#ff7a1a" }}>Victor Wembanyama</div>
    </div>
  );
  const cards = (cw, ch) => (
    <div style={{ display: "flex", gap: px(28) }}>
      {prizeCard(GAMEPAD_SVG, Math.round(cw * 0.66), Math.round(cw * 0.66 * 150 / 240), T.c1, cw, ch, px(34))}
      {prizeCard(JERSEY_SVG, Math.round(ch * 0.56 * 200 / 240), Math.round(ch * 0.56), T.c2, cw, ch, px(34))}
    </div>
  );
  const bottom = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: wide ? "flex-start" : "center", gap: px(18) }}>
      <div style={{ display: "flex", alignItems: "center", gap: px(14), fontSize: px(40), fontWeight: 800, color: "#fff" }}>
        <div style={{ display: "flex", width: px(16), height: px(16), borderRadius: 999, background: "#ff7a1a" }} />
        {T.date}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: px(16), padding: `${px(20)}px ${px(40)}px`, borderRadius: 999, backgroundImage: "linear-gradient(90deg, #ff6a00 0%, #ff9a3c 100%)", boxShadow: "0 14px 40px rgba(255,106,0,.45)", fontSize: px(38), fontWeight: 800, color: "#fff" }}>
        {T.cta}
        <img src={ARROW_SVG} width={px(34)} height={px(34)} alt="" />
      </div>
      <div style={{ display: "flex", fontSize: px(34), fontWeight: 800, color: "#ffb27a" }}>{T.url}</div>
      <div style={{ display: "flex", fontSize: px(22), fontWeight: 500, color: "rgba(255,255,255,.55)", marginTop: px(4) }}>{T.legal}</div>
    </div>
  );
  const bg = {
    backgroundColor: "#050b1d",
    backgroundImage: "radial-gradient(circle at 50% 42%, rgba(255,110,20,.38) 0%, rgba(255,110,20,0) 46%), radial-gradient(circle at 88% 6%, rgba(255,190,120,.22) 0%, rgba(255,190,120,0) 32%), linear-gradient(180deg, #0b1636 0%, #050b1d 100%)",
  };
  const body = wide ? (
    <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "space-between", padding: "44px 64px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: px(30) }}>
        <div style={{ display: "flex", alignItems: "center", gap: px(24) }}>{brand}{badge}</div>
        {hero}
        {bottom}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {prizeCard(GAMEPAD_SVG, 250, 156, T.c1, 360, 230, 28)}
        {prizeCard(JERSEY_SVG, 120, 144, T.c2, 360, 230, 28)}
      </div>
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "space-between", padding: `${px(64)}px ${px(64)}px ${px(56)}px` }}>
      <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>{brand}{badge}</div>
      {hero}
      {cards(px(440), px(fmt === "portrait" ? 330 : 280))}
      {bottom}
    </div>
  );
  const fontList = [...(f || []), ...(tf ? [tf] : [])];
  return new ImageResponse(
    (
      <div style={{ position: "relative", display: "flex", width: "100%", height: "100%", color: "#fff", fontFamily: f ? "Inter" : "sans-serif", ...bg }}>
        {deco}
        {body}
      </div>
    ),
    { ...size, ...(fontList.length ? { fonts: fontList } : {}), ...init }
  );
}

// ---------- Actu du jour (visuel quotidien des réseaux, lib/actu.js) ----------
// Image de fond faite par IA (Canva, sans vrais joueurs ni logos), titre de l'actu par-dessus, logo et adresse du site.
// og 1200×630 (aperçu X, LinkedIn), portrait 1080×1350 (Facebook, Instagram, Telegram), thumb 800×420 (carte Bluesky,
// moins d'un Mo). Si l'image source ne répond plus (lien d'export Canva expiré), fond orange et bleu nuit à la place.
const ACTU_SIZES = { og: { width: 1200, height: 630 }, portrait: { width: 1080, height: 1350 }, thumb: { width: 800, height: 420 } };
async function actuBackground(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!r.ok) return null;
    const type = (r.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > 8_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
// Version « stats » (Tim, 26/11 22 h 14 : « c'est pas Wemby ça » → choix « Visuel stats sans joueur ») : quand il n'y a
// pas d'image de fond (i vide), aucun joueur à l'image : couleurs des deux équipes, nom en très grand, stat principale
// géante, autres stats, score, titre. Rien qui puisse passer pour la photo d'un vrai joueur.
const hexRgba = (hex, al) => {
  const h = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return `rgba(255,140,58,${al})`;
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${al})`;
};
function actuStatsImage(a, fmt, f, tf, init) {
  const { width, height } = ACTU_SIZES[fmt];
  const tall = fmt === "portrait";
  const k = fmt === "thumb" ? 0.68 : 1;
  const px = (n) => Math.round(n * k);
  const stats = String(a.n || "").split("|").map((s) => s.trim()).filter(Boolean).slice(0, 3)
    .map((s) => { const m = s.match(/^([+-]?[\d.,]+\s?%?)\s*(.*)$/); return m ? { v: m[1].trim(), u: m[2].trim() } : { v: s, u: "" }; });
  const hero = stats[0];
  const rest = stats.slice(1);
  const sc = String(a.m || "").split("|").map((s) => s.trim());
  const score = sc.length === 4 && sc.every(Boolean) ? sc : null;
  const cols = String(a.c || "").split(",").map((h) => h.trim());
  const ca = /^[0-9a-f]{6}$/i.test(cols[0] || "") ? cols[0] : "ff8c3a";
  const cb = /^[0-9a-f]{6}$/i.test(cols[1] || "") ? cols[1] : "3a7bff";
  const winA = score ? Number(score[1]) >= Number(score[2]) : true;
  const who = String(a.w || "").trim().slice(0, 40);
  const parts = who.split(/\s+/).filter(Boolean);
  const last = (parts.length ? parts[parts.length - 1] : "").toUpperCase();
  const first = parts.slice(0, -1).join(" ").toUpperCase();
  const label = String(a.l || "ACTU NBA").slice(0, 28);
  const title = String(a.t || "");
  const lastMax = tall ? 968 : 560;
  const lastSize = px(Math.min(tall ? 124 : 84, Math.floor(lastMax / Math.max(1, last.length * 0.74))));
  const heroSize = px(tall ? (String(hero?.v || "").length > 3 ? 220 : 300) : (String(hero?.v || "").length > 3 ? 140 : 190));
  const glow = (color, al, size, pos) => <div style={{ position: "absolute", ...pos, width: size, height: size, display: "flex", borderRadius: size, background: `radial-gradient(circle, ${hexRgba(color, al)} 0%, rgba(4,8,23,0) 65%)` }} />;
  const ring = (size, pos, al) => <div style={{ position: "absolute", ...pos, width: size, height: size, display: "flex", borderRadius: size, border: `${px(3)}px solid rgba(255,255,255,${al})` }} />;
  const teamRow = (name, pts, color, win) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: px(14) }}>
      <div style={{ display: "flex", alignItems: "center", gap: px(14) }}>
        <div style={{ display: "flex", width: px(10), height: px(tall ? 48 : 40), borderRadius: 6, background: `#${color}` }} />
        <div style={{ display: "flex", fontSize: px(tall ? 32 : 28), fontWeight: 800, color: win ? "#ffffff" : "#8f98ab", letterSpacing: 1 }}>{name.toUpperCase()}</div>
      </div>
      <div style={{ display: "flex", fontSize: px(tall ? 54 : 46), fontWeight: 800, color: win ? "#ffffff" : "#8f98ab" }}>{pts}</div>
    </div>
  );
  const heroBlock = hero && (
    <div style={{ display: "flex", alignItems: "flex-end", gap: px(tall ? 28 : 20) }}>
      <div style={{ display: "flex", fontSize: heroSize, fontWeight: 800, color: "#ffffff", lineHeight: 0.8, letterSpacing: -6 }}>{hero.v}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: px(tall ? 12 : 8), paddingBottom: px(tall ? 10 : 6) }}>
        {hero.u && <div style={{ display: "flex", fontSize: px(tall ? 46 : 32), fontWeight: 800, color: "#ff8c3a", letterSpacing: px(3) }}>{hero.u.toUpperCase()}</div>}
        {rest.map((r, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "baseline", gap: px(10) }}>
            <div style={{ display: "flex", fontSize: px(tall ? 52 : 36), fontWeight: 800, color: "#ffffff" }}>{r.v}</div>
            <div style={{ display: "flex", fontSize: px(tall ? 28 : 20), fontWeight: 800, color: "#c9d0dd", letterSpacing: px(2) }}>{r.u.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
  const nameBlock = (
    <div style={{ display: "flex", flexDirection: "column", gap: px(4) }}>
      {first && <div style={{ display: "flex", fontSize: px(tall ? 34 : 24), fontWeight: 800, color: "#c9d0dd", letterSpacing: px(6) }}>{first}</div>}
      {last && <div style={{ display: "flex", fontSize: lastSize, fontWeight: 800, color: "#ffffff", lineHeight: 1, letterSpacing: -1 }}>{last}</div>}
    </div>
  );
  const scoreCard = score && (
    <div style={{ display: "flex", flexDirection: "column", gap: px(10), padding: `${px(tall ? 20 : 16)}px ${px(tall ? 28 : 20)}px`, borderRadius: px(22), border: "2px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)" }}>
      <div style={{ display: "flex", fontSize: px(tall ? 20 : 16), fontWeight: 800, color: "#8f98ab", letterSpacing: 3 }}>SCORE FINAL</div>
      {teamRow(score[0], score[1], ca, winA)}
      {teamRow(score[3], score[2], cb, !winA)}
    </div>
  );
  const titleEl = <div style={{ display: "flex", fontFamily: tf ? "Tilt Warp" : "Inter", fontSize: px(tall ? (title.length > 60 ? 50 : 56) : (title.length > 60 ? 30 : 34)), fontWeight: tf ? 400 : 800, lineHeight: 1.1, color: "#ffffff" }}>{title}</div>;
  const top = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: px(14) }}>
        <img src={BALL} width={px(tall ? 54 : 46)} height={px(tall ? 54 : 46)} alt="" />
        <div style={{ display: "flex", fontSize: px(tall ? 38 : 32), fontWeight: 800, color: "#ff8c3a" }}>Basketlog</div>
      </div>
      <div style={{ display: "flex", padding: `${px(8)}px ${px(18)}px`, borderRadius: 999, border: "2px solid rgba(255,140,58,.75)", background: "rgba(4,8,23,.55)", color: "#ffb27a", fontSize: px(tall ? 24 : 20), fontWeight: 800, letterSpacing: 2 }}>{label}</div>
    </div>
  );
  const foot = (
    <div style={{ display: "flex", alignItems: "center", gap: px(14) }}>
      {tall && <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: "#c9d0dd" }}>Probabilités de victoire gratuites chaque soir</div>}
      <div style={{ display: "flex", fontSize: px(tall ? 28 : 24), fontWeight: 800, color: "#ff8c3a" }}>basketlog-app.com</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width, height, background: "#040817", fontFamily: "Inter", overflow: "hidden" }}>
        {glow(ca, 0.58, px(tall ? 1100 : 900), { right: px(tall ? -320 : -240), top: px(tall ? -300 : -380) })}
        {glow(cb, 0.52, px(tall ? 1100 : 900), { left: px(tall ? -380 : -340), bottom: px(tall ? -360 : -460) })}
        {ring(px(tall ? 620 : 520), { right: px(tall ? -240 : -160), top: px(tall ? 330 : 60) }, 0.07)}
        {ring(px(tall ? 1500 : 1200), { left: px(tall ? -980 : -900), top: px(tall ? 620 : 250) }, 0.05)}
        <div style={{ position: "absolute", left: 0, top: px(tall ? 640 : 0), width: tall ? width : px(3), height: tall ? px(3) : height, display: "flex", background: "rgba(255,255,255,.05)", ...(tall ? {} : { left: Math.round(width * 0.56) }) }} />
        {tall ? (
          <div style={{ position: "absolute", left: 56, right: 56, top: 50, bottom: 50, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {top}
            <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
              {nameBlock}
              {heroBlock}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
              {scoreCard}
              {titleEl}
              {foot}
            </div>
          </div>
        ) : (
          <div style={{ position: "absolute", left: px(52), right: px(52), top: px(40), bottom: px(36), display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {top}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: px(40) }}>
              <div style={{ display: "flex", flexDirection: "column", gap: px(22), width: px(560) }}>
                {nameBlock}
                {heroBlock}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: px(16), width: px(470) }}>
                {scoreCard}
                {titleEl}
                {foot}
              </div>
            </div>
          </div>
        )}
      </div>
    ),
    { width, height, fonts: [...(f || []), ...(tf ? [tf] : [])], ...init }
  );
}

// Version 2 (Tim, 26/11 22 h 08 : « des posts plus qualitatifs avec un visuel qui parle du sujet ») : en plus du titre,
// le joueur ou l'équipe du jour (w), 1 à 3 stats en très gros (n : « 44 PTS|16 REB »), le score (m : « Spurs|111|116|Blazers »,
// le vainqueur ressort en blanc) et les couleurs des deux équipes (c : « C4CED4,E03A3E »). Tous facultatifs.
export async function actuOgImage(a, format = "og", init = {}) {
  const fmt = ACTU_SIZES[format] ? format : "og";
  const { width, height } = ACTU_SIZES[fmt];
  if (!a.i && (a.n || a.m || a.w)) {
    const [f0, tf0] = await Promise.all([fonts(), titleFont()]);
    return actuStatsImage(a, fmt, f0, tf0, init);
  }
  const [f, tf, bg] = await Promise.all([fonts(), titleFont(), a.i ? actuBackground(a.i) : null]);
  const tall = fmt === "portrait";
  const k = tall ? 1 : fmt === "thumb" ? 0.68 : 1;
  const px = (n) => Math.round(n * k);
  const title = String(a.t || "");
  const stats = String(a.n || "").split("|").map((s) => s.trim()).filter(Boolean).slice(0, 3)
    .map((s) => { const m = s.match(/^([+-]?[\d.,]+\s?%?)\s*(.*)$/); return m ? { v: m[1].trim(), u: m[2].trim() } : { v: s, u: "" }; });
  const sc = String(a.m || "").split("|").map((s) => s.trim());
  const score = sc.length === 4 && sc.every(Boolean) ? sc : null;
  const [ca, cb] = String(a.c || "").split(",").map((h) => (/^[0-9a-f]{6}$/i.test(h.trim()) ? `#${h.trim()}` : "#ff8c3a"));
  const winA = score ? Number(score[1]) >= Number(score[2]) : true;
  const label = String(a.l || "ACTU NBA").slice(0, 28);
  const who = String(a.w || "").slice(0, 40);
  const rich = !!(stats.length || score || who);
  const titleSize = tall
    ? (rich ? (title.length > 60 ? 50 : 58) : title.length > 70 ? 58 : title.length > 45 ? 68 : 80)
    : px(rich ? (title.length > 60 ? 32 : 38) : title.length > 70 ? 44 : title.length > 45 ? 52 : 60);
  const statSize = tall ? (stats.length > 2 ? 120 : 150) : px(stats.length > 2 ? 74 : 92);
  const team = (name, pts, color, win, right) => (
    <div style={{ display: "flex", alignItems: "center", gap: px(tall ? 16 : 12), flexDirection: right ? "row-reverse" : "row" }}>
      <div style={{ display: "flex", width: px(tall ? 12 : 9), height: px(tall ? 52 : 38), borderRadius: 6, background: color }} />
      <div style={{ display: "flex", fontSize: px(tall ? 32 : 24), fontWeight: 800, color: win ? "#ffffff" : "#8f98ab", letterSpacing: 1 }}>{name.toUpperCase()}</div>
      <div style={{ display: "flex", fontSize: px(tall ? 56 : 40), fontWeight: 800, color: win ? "#ffffff" : "#8f98ab" }}>{pts}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width, height, background: "radial-gradient(circle at 70% 30%, #5a2608 0%, #040817 65%)", fontFamily: "Inter" }}>
        {bg && <img src={bg} width={tall ? width : rich ? Math.round(width * 0.62) : width} height={height} style={{ position: "absolute", right: 0, top: 0, width: tall ? width : rich ? Math.round(width * 0.62) : width, height, objectFit: "cover" }} alt="" />}
        <div style={{ position: "absolute", left: 0, top: 0, width, height, display: "flex", background: tall
          ? (rich ? "linear-gradient(180deg, rgba(4,8,23,.6) 0%, rgba(4,8,23,0) 16%, rgba(4,8,23,0) 30%, rgba(4,8,23,.82) 47%, #040817 62%)" : "linear-gradient(180deg, rgba(4,8,23,.55) 0%, rgba(4,8,23,0) 22%, rgba(4,8,23,0) 42%, rgba(4,8,23,.88) 70%, #040817 100%)")
          : (rich ? "linear-gradient(90deg, #040817 0%, #040817 40%, rgba(4,8,23,.7) 52%, rgba(4,8,23,.05) 75%)" : "linear-gradient(90deg, rgba(4,8,23,.94) 0%, rgba(4,8,23,.78) 48%, rgba(4,8,23,.1) 100%)") }} />
        {bg && <div style={{ position: "absolute", right: px(tall ? 56 : 24), ...(tall ? { top: 600 } : { bottom: px(14) }), display: "flex", fontSize: px(tall ? 18 : 15), fontWeight: 500, color: "rgba(255,255,255,.55)", letterSpacing: 1 }}>Image d'illustration</div>}
        <div style={{ position: "absolute", left: px(tall ? 56 : 52), right: px(tall ? 56 : 52), top: px(tall ? 50 : 40), display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: px(14) }}>
            <img src={BALL} width={px(tall ? 54 : 46)} height={px(tall ? 54 : 46)} alt="" />
            <div style={{ display: "flex", fontSize: px(tall ? 38 : 32), fontWeight: 800, color: "#ff8c3a" }}>Basketlog</div>
          </div>
          {tall && <div style={{ display: "flex", padding: "8px 18px", borderRadius: 999, border: "2px solid rgba(255,140,58,.75)", background: "rgba(4,8,23,.55)", color: "#ffb27a", fontSize: 24, fontWeight: 800, letterSpacing: 2 }}>{label}</div>}
        </div>
        <div style={{ position: "absolute", left: px(tall ? 56 : 52), right: tall ? 56 : Math.round(width * (rich ? 0.44 : 0.42)), bottom: px(tall ? 52 : 36), display: "flex", flexDirection: "column", gap: px(tall ? 22 : 14) }}>
          {!tall && <div style={{ display: "flex", alignSelf: "flex-start", padding: `${px(6)}px ${px(14)}px`, borderRadius: 999, border: "2px solid rgba(255,140,58,.75)", background: "rgba(255,122,26,.18)", color: "#ffb27a", fontSize: px(18), fontWeight: 800, letterSpacing: 2 }}>{label}</div>}
          {who && <div style={{ display: "flex", fontSize: px(tall ? 30 : 22), fontWeight: 800, color: "#ff8c3a", letterSpacing: px(4) }}>{who.toUpperCase()}</div>}
          {stats.length > 0 && (
            <div style={{ display: "flex", gap: px(tall ? 34 : 24), alignItems: "flex-end" }}>
              {stats.map((s, idx) => (
                <div key={idx} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: statSize, fontWeight: 800, color: "#ffffff", lineHeight: 0.92, letterSpacing: -2 }}>{s.v}</div>
                  {s.u && <div style={{ display: "flex", fontSize: px(tall ? 30 : 20), fontWeight: 800, color: "#ffb27a", letterSpacing: px(3), marginTop: px(6) }}>{s.u.toUpperCase()}</div>}
                </div>
              ))}
            </div>
          )}
          {score && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${px(tall ? 18 : 12)}px ${px(tall ? 26 : 18)}px`, borderRadius: px(22), border: "2px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.07)" }}>
              {team(score[0], score[1], ca, winA, false)}
              <div style={{ display: "flex", fontSize: px(tall ? 22 : 16), fontWeight: 800, color: "#8f98ab", letterSpacing: 2 }}>FINAL</div>
              {team(score[3], score[2], cb, !winA, true)}
            </div>
          )}
          <div style={{ display: "flex", fontFamily: tf ? "Tilt Warp" : "Inter", fontSize: titleSize, fontWeight: tf ? 400 : 800, lineHeight: 1.08, color: "#ffffff" }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: px(14) }}>
            {tall && <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: "#c9d0dd" }}>Probabilités de victoire gratuites chaque soir</div>}
            <div style={{ display: "flex", fontSize: px(tall ? 28 : 24), fontWeight: 800, color: "#ff8c3a" }}>basketlog-app.com</div>
          </div>
        </div>
      </div>
    ),
    { width, height, fonts: [...(f || []), ...(tf ? [tf] : [])], ...init }
  );
}

// ---------- Visuel Black Friday (27/11/2026, Tim : « fais le Black Friday ») ----------
// Servi par /bf/og (hors de /api/, que robots.txt ferme aux robots) : ?f=portrait (1080×1350, Instagram, Facebook), carre
// (1080×1080) ou og (1200×630, aperçu de lien X et LinkedIn, og:image de /pro pendant l'offre) ; ?lang=fr (défaut), en, es, pt.
// Fond bleu nuit et orange Basketlog, aucun joueur, aucun visage, aucun logo d'équipe ni de la NBA. Toutes les valeurs de style
// sont des nombres ou des chaînes écrits ici : jamais undefined (le moteur d'image plante sur « reading 'trim' »).
const BF_SIZES = { portrait: { width: 1080, height: 1350 }, carre: { width: 1080, height: 1080 }, og: { width: 1200, height: 630 } };
const ARROW =
  "data:image/svg+xml;base64," +
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24"><path d="M2 12h40M31 3l11 9-11 9" fill="none" stroke="#f97316" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`).toString("base64");
const BF_TXT = {
  fr: { label: "BLACK FRIDAY", sub: "Pro et Lifetime", code: "code", until: "jusqu'au 30/11", life: "Lifetime", first: "1er mois Pro" },
  en: { label: "BLACK FRIDAY", sub: "Pro and Lifetime", code: "code", until: "until Nov 30", life: "Lifetime", first: "Pro 1st month" },
  es: { label: "BLACK FRIDAY", sub: "Pro y Lifetime", code: "código", until: "hasta el 30/11", life: "Lifetime", first: "1.er mes Pro" },
  pt: { label: "BLACK FRIDAY", sub: "Pro e Lifetime", code: "código", until: "até 30/11", life: "Lifetime", first: "1º mês Pro" },
};
export async function bfOgImage(format = "og", init = {}, lang = "fr") {
  const [f, tf] = await Promise.all([fonts(), titleFont()]);
  const l = bfLang(lang);
  const T = BF_TXT[l];
  const fmt = BF_SIZES[format] ? format : "og";
  const { width, height } = BF_SIZES[fmt];
  const wide = fmt === "og";
  const k = fmt === "portrait" ? 1 : fmt === "carre" ? 0.82 : 0.56;
  const px = (n) => Math.round(n * k);
  const title = tf ? "Tilt Warp" : f ? "Inter" : "sans-serif";
  const big = l === "en" ? `-${BF.PCT}%` : `-${BF.PCT} %`;
  const P = BF_PRICES;
  const row = (label, was, now) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: px(16), fontSize: px(34), fontWeight: 500, color: "#c9d1e3" }}>
      <div style={{ display: "flex", fontWeight: 800, color: "#ffffff" }}>{label}</div>
      <div style={{ display: "flex", textDecoration: "line-through", color: "#8f98ab" }}>{bfEur(was, l)}</div>
      <img src={ARROW} width={px(44)} height={px(22)} alt="" />
      <div style={{ display: "flex", fontWeight: 800, color: "#ffffff" }}>{bfEur(now, l)}</div>
    </div>
  );
  const glow = (pos, size, al) => <div style={{ position: "absolute", ...pos, width: size, height: size, display: "flex", borderRadius: size, background: `radial-gradient(circle, rgba(249,115,22,${al}) 0%, rgba(4,8,23,0) 65%)` }} />;
  return new ImageResponse(
    (
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width, height, background: "#040817", color: "#ffffff", fontFamily: f ? "Inter" : "sans-serif" }}>
        {glow({ left: Math.round(width * 0.5 - width * 0.45), top: Math.round(height * 0.5 - width * 0.45) }, Math.round(width * 0.9), 0.38)}
        <div style={{ position: "absolute", top: px(46), left: 0, width, display: "flex", alignItems: "center", justifyContent: "center", gap: px(14), fontSize: px(38), fontWeight: 800 }}>
          <img src={BALL} width={px(50)} height={px(50)} alt="" />
          <div style={{ display: "flex" }}>Basketlog</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: wide ? px(40) : px(20) }}>
          <div style={{ display: "flex", padding: `${px(10)}px ${px(30)}px`, borderRadius: 999, border: `${px(3)}px solid #f97316`, background: "rgba(249,115,22,.16)", color: "#ffb27a", fontSize: px(40), fontWeight: 800, letterSpacing: px(6) }}>{T.label}</div>
          <div style={{ display: "flex", marginTop: px(wide ? 10 : 18), fontFamily: title, fontSize: px(wide ? 330 : 300), lineHeight: 1, color: "#f97316", textShadow: "0 12px 60px rgba(249,115,22,.5)" }}>{big}</div>
          <div style={{ display: "flex", marginTop: px(4), fontSize: px(60), fontWeight: 800 }}>{T.sub}</div>
          <div style={{ display: "flex", alignItems: "center", gap: px(16), marginTop: px(26), padding: `${px(14)}px ${px(34)}px`, borderRadius: px(18), background: "#f97316", color: "#040817", fontSize: px(46), fontWeight: 800 }}>
            <div style={{ display: "flex", fontWeight: 500 }}>{T.code}</div>
            <div style={{ display: "flex", letterSpacing: px(2) }}>{BF.CODE}</div>
          </div>
          <div style={{ display: "flex", marginTop: px(16), fontSize: px(32), fontWeight: 500, color: "#c9d1e3" }}>{T.until}</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: px(10), marginTop: px(wide ? 18 : 32) }}>
            {row(T.life, P.lifetimeWas, P.lifetime)}
            {row(T.first, P.proWas, P.pro)}
          </div>
        </div>
        <div style={{ position: "absolute", bottom: px(40), left: 0, width, display: "flex", justifyContent: "center", fontSize: px(34), fontWeight: 800, color: "#8f98ab" }}>basketlog-app.com</div>
      </div>
    ),
    { width, height, ...(f || tf ? { fonts: [...(f || []), ...(tf ? [tf] : [])] } : {}), ...init }
  );
}

// Visuel du jour gratuit de Basketlog Pro (/offre/og, annonce du 28/11/2026) : mêmes formats et même style que le visuel
// Black Friday. La police de titre n'a peut-être pas les lettres accentuées (« DÍA », « GRÁTIS ») : Inter pour ces mots-là.
export async function jgOgImage(format = "og", init = {}, lang = "fr") {
  const [f, tf] = await Promise.all([fonts(), titleFont()]);
  const T = JG_TXT[jgLang(lang)];
  const fmt = BF_SIZES[format] ? format : "og";
  const { width, height } = BF_SIZES[fmt];
  const wide = fmt === "og";
  const k = fmt === "portrait" ? 1 : fmt === "carre" ? 0.82 : 0.56;
  const px = (n) => Math.round(n * k);
  const fam = (s) => (tf && /^[\x20-\x7E]*$/.test(s) ? "Tilt Warp" : f ? "Inter" : "sans-serif");
  const glow = (pos, size, al) => <div style={{ position: "absolute", ...pos, width: size, height: size, display: "flex", borderRadius: size, background: `radial-gradient(circle, rgba(249,115,22,${al}) 0%, rgba(4,8,23,0) 65%)` }} />;
  return new ImageResponse(
    (
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width, height, background: "#040817", color: "#ffffff", fontFamily: f ? "Inter" : "sans-serif" }}>
        {glow({ left: Math.round(width * 0.5 - width * 0.45), top: Math.round(height * 0.5 - width * 0.45) }, Math.round(width * 0.9), 0.38)}
        <div style={{ position: "absolute", top: px(46), left: 0, width, display: "flex", alignItems: "center", justifyContent: "center", gap: px(14), fontSize: px(38), fontWeight: 800 }}>
          <img src={BALL} width={px(50)} height={px(50)} alt="" />
          <div style={{ display: "flex" }}>Basketlog</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: wide ? px(40) : px(20) }}>
          <div style={{ display: "flex", padding: `${px(10)}px ${px(30)}px`, borderRadius: 999, border: `${px(3)}px solid #f97316`, background: "rgba(249,115,22,.16)", color: "#ffb27a", fontSize: px(40), fontWeight: 800, letterSpacing: px(6) }}>{T.pill}</div>
          <div style={{ display: "flex", marginTop: px(wide ? 8 : 20), fontFamily: fam(T.big1), fontSize: px(230), lineHeight: 1, color: "#f97316", textShadow: "0 12px 60px rgba(249,115,22,.5)" }}>{T.big1}</div>
          <div style={{ display: "flex", marginTop: px(4), fontFamily: fam(T.big2), fontSize: px(170), lineHeight: 1, color: "#ffffff" }}>{T.big2}</div>
          <div style={{ display: "flex", marginTop: px(30), fontSize: px(40), fontWeight: 800, textAlign: "center" }}>{T.sub}</div>
          <div style={{ display: "flex", marginTop: px(26), padding: `${px(14)}px ${px(34)}px`, borderRadius: px(18), background: "#f97316", color: "#040817", fontSize: px(42), fontWeight: 800 }}>{T.then}</div>
          <div style={{ display: "flex", marginTop: px(16), fontSize: px(30), fontWeight: 500, color: "#c9d1e3" }}>{T.note}</div>
        </div>
        <div style={{ position: "absolute", bottom: px(40), left: 0, width, display: "flex", justifyContent: "center", fontSize: px(34), fontWeight: 800, color: "#8f98ab" }}>basketlog-app.com</div>
      </div>
    ),
    { width, height, ...(f || tf ? { fonts: [...(f || []), ...(tf ? [tf] : [])] } : {}), ...init }
  );
}
