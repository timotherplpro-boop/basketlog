import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { actuFromBluesky, actuId, actuList, actuShortUrls, actuParagraphs, actuStats, actuScore, actuDescription, actuDay, parseActuId } from "../../../lib/actu";
import { SITE } from "../../../lib/site";
import { mk } from "../../../lib/i18n";
import { withBrand } from "../../../lib/seo";
import JsonLd from "../../../components/JsonLd";
import Crumbs from "../../../components/Crumbs";
import ContestNote from "../../../components/ContestNote";

// Article « actu du jour » indexable (27/11/2026) : /actu/<identifiant du post Bluesky>-<titre>. Sans base de données :
// le post Bluesky du compte garde le jeton signé (lib/actu.js, lecture en cache 24 h). Mauvais titre dans l'adresse :
// redirection définitive vers la bonne ; post supprimé ou jeton invalide : 404. Articles en français seulement.
const FR = mk("fr");

async function load(params) {
  const { id: raw } = await params;
  let id = String(raw || "");
  try {
    id = decodeURIComponent(id);
  } catch {}
  const p = parseActuId(id);
  if (!p) return null;
  const got = await actuFromBluesky(p.rkey);
  if (!got) return null;
  return { ...got, rkey: p.rkey, id, want: actuId(p.rkey, got.a.t), urls: actuShortUrls(p.rkey, got.a.t) };
}

export async function generateMetadata({ params }) {
  const got = await load(params);
  if (!got) return { title: "Actu introuvable – Basketlog", robots: { index: false, follow: true } };
  const { a, urls: u } = got;
  const description = actuDescription(a);
  return {
    title: withBrand(a.t),
    description,
    alternates: { canonical: u.page },
    // « max-image-preview: large » : condition pour apparaître en grand dans Google Discover.
    robots: { index: true, follow: true, "max-image-preview": "large", googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    openGraph: { title: a.t, description, url: u.page, type: "article", publishedTime: got.at || undefined, siteName: "Basketlog", locale: "fr_FR", images: [{ url: u.og, width: 1200, height: 630, alt: a.t }] },
    twitter: { card: "summary_large_image", site: "@Basketlog", title: a.t, description, images: [u.og] },
  };
}

export default async function ActuArticle({ params }) {
  const got = await load(params);
  if (!got) notFound();
  if (got.id !== got.want) permanentRedirect(`/actu/${got.want}`);
  const { a, urls: u, rkey } = got;
  const stats = actuStats(a.n);
  const score = actuScore(a.m);
  const others = (await actuList()).filter((x) => x.rkey !== rkey).slice(0, 4);
  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.t,
    description: actuDescription(a),
    image: [u.og, u.portrait],
    datePublished: got.at,
    dateModified: got.at,
    inLanguage: "fr-FR",
    url: u.page,
    mainEntityOfPage: { "@type": "WebPage", "@id": u.page },
    author: { "@type": "Organization", name: "Basketlog", url: SITE },
    publisher: { "@type": "Organization", "@id": `${SITE}/#organisation`, name: "Basketlog", url: SITE, logo: { "@type": "ImageObject", url: `${SITE}/icons/icon-512.png`, width: 512, height: 512 } },
  };
  return (
    <main className="app-page actu-page">
      <JsonLd data={ld} />
      <Crumbs L={FR} items={[["Accueil", "/"], ["Actu NBA", "/actu"], [a.t, `/actu/${got.want}`]]} />
      <article>
        <p className="actu-kicker"><Link href="/actu">Actu NBA</Link>{a.l && a.l.toLowerCase() !== "actu nba" ? ` · ${a.l}` : ""} · <time dateTime={got.at}>{actuDay(got.at)}</time></p>
        <h1>{a.t}</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={u.portrait} alt={a.t} width="1080" height="1350" className="actu-visuel" fetchPriority="high" />
        {actuParagraphs(a.x).map((p, i) => <p key={i}>{p}</p>)}
        {(stats.length > 0 || score) && (
          <section className="actu-faits" aria-label="Les chiffres">
            {a.w && <p className="actu-qui">{a.w}</p>}
            {stats.length > 0 && (
              <ul className="actu-stats">
                {stats.map((s, i) => <li key={i}>{s.v && <strong>{s.v}</strong>} {s.l}</li>)}
              </ul>
            )}
            {score && <p className="actu-score">{score.a} <strong>{score.sa}</strong> – <strong>{score.sb}</strong> {score.b}</p>}
          </section>
        )}
        <div className="actu-cta">
          <p><Link href="/app/matchs" className="btn-solid">Voir les probabilités des matchs de ce soir (gratuit)</Link></p>
          <p><Link href="/pro">Basketlog Pro : l&apos;analyse complète de chaque match, essai de 3 jours à 1 €, puis 9,99 €/mois →</Link></p>
          <ContestNote L={FR} />
        </div>
        {others.length > 0 && (
          <section className="actu-autres">
            <h2>À lire aussi</h2>
            <ul>
              {others.map((x) => <li key={x.rkey}><Link href={x.path}>{x.a.t}</Link> <span>· {actuDay(x.at)}</span></li>)}
            </ul>
            <p><Link href="/actu">Toute l&apos;actu NBA →</Link></p>
          </section>
        )}
      </article>
    </main>
  );
}
