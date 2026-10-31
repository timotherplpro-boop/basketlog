// Comparaison chiffrée de deux équipes, barre par barre (extérieur à gauche, domicile à droite).
export default function StatCompare({ away, home, rows, L }) {
  const valid = rows.filter((r) => r.a != null && r.h != null && !isNaN(r.a) && !isNaN(r.h));
  if (!valid.length) return null;
  return (
    <div className="scmp">
      <div className="scmp-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span>{away.logo && <img src={away.logo} alt="" />}{away.abbr}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span>{home.abbr}{home.logo && <img src={home.logo} alt="" />}</span>
      </div>
      {valid.map((r, i) => {
        const max = Math.max(Math.abs(r.a), Math.abs(r.h)) || 1;
        const aBetter = r.low ? r.a < r.h : r.a > r.h;
        const hBetter = r.low ? r.h < r.a : r.h > r.a;
        const f = r.fmt || ((v) => (L && !L.en ? v.toFixed(1).replace(".", ",") : v.toFixed(1)));
        return (
          <div className="scmp-row" key={r.label} style={{ "--i": i }}>
            <b className={aBetter ? "win" : ""}>{f(r.a)}</b>
            <div className="scmp-bars">
              <span className="lbl">{r.label}</span>
              <div className="bars">
                <div className="bar l"><i className={aBetter ? "win" : ""} style={{ width: `${(Math.abs(r.a) / max) * 100}%` }} /></div>
                <div className="bar r"><i className={hBetter ? "win" : ""} style={{ width: `${(Math.abs(r.h) / max) * 100}%` }} /></div>
              </div>
            </div>
            <b className={hBetter ? "win" : ""}>{f(r.h)}</b>
          </div>
        );
      })}
    </div>
  );
}
