import Link from "next/link";
import { notFound } from "next/navigation";
import { getL } from "../../../lib/lang-server";
import { pageMeta } from "../../../lib/seo";
import { SITE } from "../../../lib/site";
import { nbaToday } from "../../../lib/espn";
import { pctOf } from "../../../lib/i18n";
import JsonLd from "../../../components/JsonLd";
import Crumbs from "../../../components/Crumbs";
import AppTabs from "../../../components/AppTabs";
import { parseArticleSlug, buildArticle, articleTitle, articlePath, sectionText, sectionHead, gamePath, dayLabel } from "../../../lib/articles";
import PrefSource from "../../../components/PrefSource";

export const dynamic = "force-dynamic";

const pubIso = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T14:00:00Z`;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const L = await getL();
  const date = parseArticleSlug(slug);
  if (!date || date > nbaToday()) return { title: "Basketlog", robots: { index: false } };
  const art = await buildArticle(date, L).catch(() => null);
  const title = articleTitle(L, date);
  const top = art?.picks?.[0]?.a;
  const description = top
    ? L.t(
        `Les matchs NBA à suivre ${dayLabel(L, date, true)} : ${art.picks.map((p) => `${p.a.game.away.short} – ${p.a.game.home.short}`).join(", ")}. Probabilités, scores projetés et absences.`,
        `NBA games to watch on ${dayLabel(L, date, true)}: ${art.picks.map((p) => `${p.a.game.away.short} vs ${p.a.game.home.short}`).join(", ")}. Win probabilities, projected scores and injuries.`,
        `Los partidos de la NBA a seguir el ${dayLabel(L, date, true)}: ${art.picks.map((p) => `${p.a.game.away.short} – ${p.a.game.home.short}`).join(", ")}. Probabilidades, marcadores proyectados y bajas.`, `Os jogos da NBA para acompanhar em ${dayLabel(L, date, true)}: ${art.picks.map((p) => `${p.a.game.away.short} x ${p.a.game.home.short}`).join(", ")}. Probabilidades, placares projetados e desfalques.`)
    : title;
  const m = pageMeta({ title, description, path: articlePath(date), L });
  if (art?.image) {
    const img = { url: art.image, width: 1200, height: 630, alt: title };
    m.openGraph = { ...m.openGraph, type: "article", publishedTime: pubIso(date), images: [img] };
    m.twitter = { ...m.twitter, images: [img.url] };
  }
  if (!top) m.robots = { index: false, follow: true };
  return m;
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const date = parseArticleSlug(slug);
  if (!date || date > nbaToday()) notFound();
  const L = await getL();
  const art = await buildArticle(date, L);
  const title = articleTitle(L, date);
  const url = `${SITE}${L.href(articlePath(date))}`;
  const ld = art.picks.length ? {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    image: [`${SITE}${art.image}`],
    datePublished: pubIso(date),
    dateModified: new Date().toISOString(),
    inLanguage: L.hreflang,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "Basketlog", url: SITE },
    publisher: { "@id": `${SITE}/#organisation` },
  } : null;

  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Articles NBA", "NBA articles", "Artículos NBA", "Artigos NBA"), "/articles"], [title, articlePath(date)]]} />
      <AppTabs active="matchs" />
      <article className="art">
        <p className="note">{L.t("Article du", "Published", "Publicado el", "Publicado em")} {dayLabel(L, date, true)} · Basketlog</p>
        <h1>{title}</h1>
        {art.picks.length === 0 ? (
          <p>{L.t("Pas de match NBA ce jour-là.", "No NBA games that day.", "No hubo partidos de la NBA ese día.", "Não houve jogos da NBA nesse dia.")}</p>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-hero" src={art.image} width="1200" height="630" alt={title} />
            <p className="art-lead">{L.t(
              `${art.games.length} matchs NBA au programme. Voici les trois à suivre selon le modèle Basketlog, avec les probabilités, les scores projetés et les absences connues.`,
              `${art.games.length} NBA games on the schedule. Here are the three to watch according to the Basketlog model, with win probabilities, projected scores and known injuries.`,
              `${art.games.length} partidos de la NBA en el calendario. Estos son los tres a seguir según el modelo de Basketlog, con probabilidades, marcadores proyectados y bajas conocidas.`, `${art.games.length} jogos da NBA no calendário. Estes são os três para acompanhar segundo o modelo do Basketlog, com probabilidades, placares projetados e desfalques conhecidos.`)}</p>
            {art.picks.map(({ a, kind }, i) => (
              <section key={a.game.id} className="card block">
                <h2>{i + 1}. <Link href={L.href(gamePath(a, date))}>{sectionHead(a, L)}</Link></h2>
                {sectionText(a, kind, L).map((t, k) => <p key={k}>{t}</p>)}
                <p className="mfaq-more"><Link href={L.href(gamePath(a, date))}>{L.t("Lire l'analyse du match →", "Read the full game analysis →", "Leer el análisis del partido →", "Ler a análise do jogo →")}</Link></p>
              </section>
            ))}
            <section className="card block">
              <h2>{L.t("Tous les matchs du soir", "Every game tonight", "Todos los partidos de la noche", "Todos os jogos da noite")}</h2>
              <ul className="wk-list">
                {art.games.map((a) => {
                  const f = a.pHome >= 0.5 ? a.game.home : a.game.away;
                  return <li key={a.game.id}><Link href={L.href(gamePath(a, date))}>{sectionHead(a, L)}</Link><span className="mono"> · {f.short} {pctOf(Math.max(a.pHome, a.pAway), L)}</span></li>;
                })}
              </ul>
              <p className="mfaq-more"><Link href={L.href("/app/blessures")}>{L.t("Blessés NBA du jour →", "Today's NBA injury report →", "Lesionados NBA de hoy →", "Lesionados NBA de hoje →")}</Link>{" · "}<Link href={L.href("/app/bilan")}>{L.t("Bilan public du modèle →", "Model track record →", "Balance público del modelo →", "Desempenho público do modelo →")}</Link></p>
            </section>
          </>
        )}
        <p className="disclaimer">{L.t("Probabilités estimées par le modèle statistique Basketlog. Ni certitude, ni conseil de pari.", "Probabilities estimated by the Basketlog statistical model. Neither a certainty nor betting advice.", "Probabilidades estimadas por el modelo estadístico de Basketlog. Ni certeza ni consejo de apuestas.", "Probabilidades estimadas pelo modelo estatístico do Basketlog. Nem certeza nem recomendação de aposta.")}</p>
        <PrefSource L={L} />
      </article>
    </main>
  );
}
