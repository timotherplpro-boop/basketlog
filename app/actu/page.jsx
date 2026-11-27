import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { resolveActu, actuFromBluesky, actuPath, actuList, actuDescription, actuDay } from "../../lib/actu";
import { CONCOURS, concoursOuvert } from "../../lib/concours";
import { SITE } from "../../lib/site";
import { mk } from "../../lib/i18n";
import { withBrand } from "../../lib/seo";
import Crumbs from "../../components/Crumbs";
import ContestNote from "../../components/ContestNote";

// Trois cas (27/11/2026) :
// - /actu sans paramètre : page « Actu NBA », indexée, qui liste les derniers articles (flux Bluesky en cache 1 h) ;
// - /actu?b=<identifiant du post Bluesky> : redirection définitive vers l'article /actu/<identifiant>-<titre> ;
// - /actu?k=<jeton signé> : ancienne page de l'actu (lien des cartes Bluesky), toujours non indexée.
const FR = mk("fr");
const INDEX_TITLE = "Actu NBA du jour : performances, records et résultats";
const INDEX_DESC = "Chaque jour, l'actu NBA en bref : la performance qui a marqué la nuit, le score et les chiffres clés. Et les probabilités de victoire gratuites des matchs de ce soir.";
const hasArticle = (sp) => Boolean(sp.k || sp.b);

export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) || {};
  if (!hasArticle(sp)) {
    const top = (await actuList())[0];
    const url = `${SITE}/actu`;
    const img = top ? `${SITE}/actu/og?b=${top.rkey}&f=og` : null;
    return {
      title: withBrand(INDEX_TITLE),
      description: INDEX_DESC,
      alternates: { canonical: url },
      robots: { index: true, follow: true, "max-image-preview": "large", googleBot: { index: true, follow: true, "max-image-preview": "large" } },
      openGraph: { title: INDEX_TITLE, description: INDEX_DESC, url, type: "website", siteName: "Basketlog", locale: "fr_FR", ...(img ? { images: [{ url: img, width: 1200, height: 630, alt: top.a.t }] } : {}) },
      twitter: { card: "summary_large_image", site: "@Basketlog", title: INDEX_TITLE, description: INDEX_DESC, ...(img ? { images: [img] } : {}) },
    };
  }
  const got = await resolveActu(sp);
  if (!got) return { title: "Basketlog", robots: { index: false, follow: true } };
  const { a, urls: u } = got;
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
  const sp = (await searchParams) || {};
  if (!hasArticle(sp)) return <ActuIndex />;
  // Adresse courte des anciens posts (X, Telegram) : vers l'adresse propre de l'article, en une seule redirection.
  if (!sp.k && sp.b) {
    const found = await actuFromBluesky(sp.b);
    if (found) permanentRedirect(actuPath(sp.b, found.a.t));
  }
  const got = await resolveActu(sp);
  const a = got?.a;
  if (!a) {
    return (
      <main className="app-page actu-page">
        <p>Cette actu n&apos;est plus disponible.</p>
        <p><Link href="/actu">Toute l&apos;actu NBA</Link> · <Link href="/app/matchs">Les probabilités des matchs de ce soir</Link></p>
      </main>
    );
  }
  const u = got.urls;
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

// Page « Actu NBA » : l'article le plus récent en grand (son visuel est déjà en cache, partagé sur les réseaux), puis la liste.
async function ActuIndex() {
  const list = await actuList();
  const [top, ...rest] = list;
  return (
    <main className="app-page actu-page">
      <Crumbs L={FR} items={[["Accueil", "/"], ["Actu NBA", "/actu"]]} />
      <div className="actu-wrap">
        <h1>Actu NBA</h1>
        <p>Chaque jour, la performance ou le résultat qui a marqué la nuit NBA, en bref et en chiffres.</p>
        {top ? (
          <>
            <Link href={top.path} className="actu-une">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/actu/og?b=${top.rkey}&f=og`} alt={top.a.t} width="1200" height="630" />
              <span className="actu-kicker"><time dateTime={top.at}>{actuDay(top.at)}</time></span>
              <strong>{top.a.t}</strong>
              <span>{actuDescription(top.a)}</span>
            </Link>
            {rest.length > 0 && (
              <ul className="actu-items">
                {rest.map((x) => (
                  <li key={x.rkey}>
                    <time dateTime={x.at}>{actuDay(x.at)}</time>
                    <Link href={x.path}>{x.a.t}</Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p>Les articles reviennent dans quelques instants.</p>
        )}
        <div className="actu-cta">
          <p><Link href="/app/matchs" className="btn-solid">Voir les probabilités des matchs de ce soir (gratuit)</Link></p>
          <p><Link href="/pro">Basketlog Pro : l&apos;analyse complète de chaque match, essai de 3 jours à 1 €, puis 9,99 €/mois →</Link></p>
          <ContestNote L={FR} />
        </div>
      </div>
    </main>
  );
}
