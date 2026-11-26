import Link from "next/link";
import { readActu, actuUrls } from "../../lib/actu";
import { CONCOURS, concoursOuvert } from "../../lib/concours";

// Page de l'actu du jour (lien des posts X et LinkedIn, dont l'aperçu montre le visuel). Non indexée : le contenu vient
// d'un jeton signé (lib/actu.js), pas d'une page éditoriale du site.
export async function generateMetadata({ searchParams }) {
  const k = ((await searchParams) || {}).k;
  const a = readActu(k);
  if (!a) return { title: "Basketlog", robots: { index: false, follow: true } };
  const u = actuUrls(k);
  const desc = a.x.replace(/\s+/g, " ").slice(0, 200);
  return {
    title: `${a.t} – Basketlog`,
    description: desc,
    robots: { index: false, follow: true },
    alternates: { canonical: u.page },
    openGraph: { title: a.t, description: desc, url: u.page, type: "article", siteName: "Basketlog", locale: "fr_FR", images: [{ url: u.og, width: 1200, height: 630, alt: a.t }] },
    twitter: { card: "summary_large_image", site: "@Basketlog", title: a.t, description: desc, images: [u.og] },
  };
}

export default async function ActuPage({ searchParams }) {
  const k = ((await searchParams) || {}).k;
  const a = readActu(k);
  if (!a) {
    return (
      <main className="app-page actu-page">
        <p>Cette actu n&apos;est plus disponible.</p>
        <p><Link href="/app/matchs" className="btn-solid">Voir les probabilités des matchs de ce soir</Link></p>
      </main>
    );
  }
  const u = actuUrls(k);
  return (
    <main className="app-page actu-page">
      <article>
        <img src={u.portrait} alt={a.t} width="540" height="675" className="actu-visuel" />
        <h1>{a.t}</h1>
        {a.x.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        <p><Link href="/app/matchs" className="btn-solid">Voir les probabilités des matchs de ce soir</Link></p>
        {concoursOuvert() && <p className="contest-note"><Link href={CONCOURS.path}>🎄 Jeu de Noël : 1 PS5 + 1 maillot de Victor Wembanyama à gagner avec Basketlog Pro →</Link></p>}
      </article>
    </main>
  );
}
