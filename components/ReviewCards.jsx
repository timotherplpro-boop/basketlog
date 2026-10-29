import ReviewForm from "./ReviewForm";
import { mk } from "../lib/i18n";

const COLORS = ["#ff7a1a", "#7c5cff", "#22c55e", "#0ea5e9", "#e11d48", "#eab308"];
const color = (s) => COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

function SocialIcon({ url, L }) {
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
  const label = host.includes("instagram") ? "Instagram" : host.includes("tiktok") ? "TikTok" : host.includes("x.com") || host.includes("twitter") ? "X" : L.t("Profil", "Profile");
  const path =
    label === "Instagram" ? <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2.2" /><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2.2" /><circle cx="17.3" cy="6.7" r="1.3" fill="currentColor" /></>
    : label === "TikTok" ? <path d="M14 3v11.2a3.3 3.3 0 1 1-3.3-3.3V8a6.2 6.2 0 1 0 6.2 6.2V8.6a7 7 0 0 0 4 1.3V7a4 4 0 0 1-4-4z" fill="currentColor" />
    : label === "X" ? <path d="M4 4l6.6 8.8L4.3 20h2.2l5.2-5.9 4.4 5.9H20l-6.9-9.2L19 4h-2.2l-4.8 5.4L8 4z" fill="currentColor" />
    : <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />;
  return (
    <a className="social" href={url} target="_blank" rel="noopener noreferrer nofollow" aria-label={L.en ? `${label} profile` : `Profil ${label}`}>
      <svg viewBox="0 0 24 24" aria-hidden>{path}</svg>
    </a>
  );
}

// Cartes d'avis en colonnes décalées, façon Visifoot (avis réels et validés uniquement).
export default function ReviewCards({ reviews, max = 9, more = true, L = mk("fr") }) {
  const list = reviews.slice(0, max);
  if (!list.length) {
    return (
      <div className="cards-empty reveal">
        <div className="ce-stars">★★★★★</div>
        <h3>{L.t("Aucun avis pour l'instant", "No reviews yet")}</h3>
        <p>{L.t("Basketlog vient d'ouvrir. Teste une analyse et sois le premier à donner ton avis : il apparaîtra ici.", "Basketlog just launched. Try an analysis and be the first to leave a review: it will show up here.")}</p>
        <ReviewForm label={L.t("Donner le premier avis", "Write the first review")} className="btn-solid" />
      </div>
    );
  }
  const long = list.length > 6;
  return (
    <div className="cards-wrap">
      <div className={`cards masonry ${long ? "clip" : ""}`}>
        {list.map((r, i) => (
          <article key={r.id} className="vcard reveal" style={{ "--d": `${(i % 3) * 120}ms` }}>
            <p>{r.texte}</p>
            <div className="who">
              {r.photo_url
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img className="avatar" src={r.photo_url} alt="" loading="lazy" />
                : <span className="initial" style={{ background: color(r.prenom) }} aria-hidden>{r.prenom.charAt(0).toUpperCase()}</span>}
              <span className="id"><small>{r.prenom}</small><b>{r.profil || L.t("Utilisateur Basketlog", "Basketlog user")}</b></span>
              {r.lien && <SocialIcon url={r.lien} L={L} />}
            </div>
          </article>
        ))}
      </div>
      {long && <div className="cards-mask" />}
      <div className={long ? "cards-more" : "cards-more static"}>
        {more && reviews.length > 6 ? <a href={L.href("/avis")} className="btn-white">{L.t("Voir tous", "See all")}</a> : null}
        <ReviewForm />
      </div>
    </div>
  );
}
