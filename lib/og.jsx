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
