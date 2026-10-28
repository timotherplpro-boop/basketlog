import { ImageResponse } from "next/og";

export const alt = "Basketlog : analyse les matchs NBA et EuroLeague avant qu'ils commencent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", background: "radial-gradient(circle at 78% 40%, #3a1a06 0%, #040817 58%)", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 800 }}>
          <div style={{ width: 54, height: 54, borderRadius: 999, background: "linear-gradient(135deg, #ffa24d, #c2410c)", display: "flex" }} />
          Basketlog
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, fontSize: 82, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2, color: "#ffe0c7" }}>
          <div style={{ display: "flex" }}>Prédis chaque match</div>
          <div style={{ display: "flex" }}>
            <span>avant qu&apos;il ne</span>
            <span style={{ color: "#ff7a1a", marginLeft: 22 }}>commence.</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 30, color: "rgba(255,255,255,.75)" }}>
          NBA · EuroLeague · Probabilités, stats et scénarios
        </div>
      </div>
    ),
    size
  );
}
