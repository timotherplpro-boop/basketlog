import { ImageResponse } from "next/og";

// Image de partage en anglais et en espagnol (la française est app/opengraph-image.jsx).
const TXT = {
  en: { l1: "Predict every game", l2: "before it", l3: "starts.", sub: "NBA · EuroLeague · Probabilities, stats and scenarios" },
  es: { l1: "Predice cada partido", l2: "antes de que", l3: "empiece.", sub: "NBA · Euroliga · Probabilidades, estadísticas y escenarios" },
};

export async function GET(req) {
  const lang = new URL(req.url).searchParams.get("lang") === "es" ? "es" : "en";
  const t = TXT[lang];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", background: "radial-gradient(circle at 78% 40%, #3a1a06 0%, #040817 58%)", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 800 }}>
          <div style={{ width: 54, height: 54, borderRadius: 999, background: "linear-gradient(135deg, #ffa24d, #c2410c)", display: "flex" }} />
          Basketlog
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, fontSize: 82, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2, color: "#ffe0c7" }}>
          <div style={{ display: "flex" }}>{t.l1}</div>
          <div style={{ display: "flex" }}>
            <span>{t.l2}</span>
            <span style={{ color: "#ff7a1a", marginLeft: 22 }}>{t.l3}</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 30, color: "rgba(255,255,255,.75)" }}>{t.sub}</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } }
  );
}
