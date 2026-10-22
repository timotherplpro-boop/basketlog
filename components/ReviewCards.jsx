import ReviewForm from "./ReviewForm";

const COLORS = ["#ff7a1a", "#7c5cff", "#22c55e", "#0ea5e9", "#e11d48", "#eab308"];
const color = (s) => COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

function Stars({ n }) {
  return <span className="rstars" aria-label={`${n} sur 5`}>{"★★★★★".slice(0, n)}<i>{"★★★★★".slice(n)}</i></span>;
}

// Cartes d'avis façon Visifoot (avis réels et validés uniquement).
export default function ReviewCards({ reviews, max = 9, more = true }) {
  const list = reviews.slice(0, max);
  if (!list.length) {
    return (
      <div className="cards-empty reveal">
        <div className="ce-stars">★★★★★</div>
        <h3>Aucun avis pour l&apos;instant</h3>
        <p>Basketlog vient d&apos;ouvrir. Teste une analyse et sois le premier à donner ton avis : il apparaîtra ici.</p>
        <ReviewForm label="Donner le premier avis" className="btn-solid" />
      </div>
    );
  }
  return (
    <div className="cards-wrap">
      <div className="cards">
        {list.map((r, i) => (
          <article key={r.id} className="vcard reveal" style={{ "--d": `${(i % 3) * 120}ms` }}>
            <div>
              <Stars n={r.note} />
              <p>{r.texte}</p>
            </div>
            <div className="who">
              <span className="initial" style={{ background: color(r.prenom) }} aria-hidden>{r.prenom.charAt(0).toUpperCase()}</span>
              <span><small>{r.prenom}</small><b>{r.profil || "Utilisateur Basketlog"}</b></span>
            </div>
          </article>
        ))}
      </div>
      {list.length > 3 && <div className="cards-mask" />}
      <div className={list.length > 3 ? "cards-more" : "cards-more static"}>
        {more && reviews.length > max ? <a href="/avis" className="btn-white">Voir tous</a> : null}
        <ReviewForm />
      </div>
    </div>
  );
}
