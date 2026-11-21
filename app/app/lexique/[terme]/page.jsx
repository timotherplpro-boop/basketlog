import Link from "next/link";
import { notFound } from "next/navigation";
import AppTabs from "../../../../components/AppTabs";
import Crumbs from "../../../../components/Crumbs";
import JsonLd from "../../../../components/JsonLd";
import { pageMeta } from "../../../../lib/seo";
import { getL } from "../../../../lib/lang-server";
import { TERMS, termOf, tr } from "../../../../lib/glossary";
import { SITE } from "../../../../lib/site";

export const dynamic = "force-dynamic";

const LINKS = {
  "/app/matchs": ["Pronostics NBA du soir", "Tonight's NBA predictions", "Pronósticos NBA de hoy", "Palpites NBA de hoje"],
  "/app/power-rankings": ["Power ranking NBA", "NBA power rankings", "Power ranking NBA", "Power ranking NBA"],
  "/app/simulation": ["Chances de playoffs et de play-in", "Playoff and play-in chances", "Opciones de playoffs y play-in", "Chances de playoffs e play-in"],
  "/app/back-to-back": ["Back-to-back NBA ce soir", "NBA back-to-backs tonight", "Back-to-back NBA hoy", "Back-to-back na NBA hoje"],
  "/app/calendrier-restant": ["Calendrier restant des 30 équipes", "Remaining schedule for all 30 teams", "Calendario restante de los 30 equipos", "Calendário restante dos 30 times"],
  "/app/draft": ["Loterie de la draft 2027 : chances de chaque équipe", "2027 draft lottery odds", "Lotería del draft 2027", "Loteria do draft 2027"],
  "/methode": ["La méthode Basketlog", "The Basketlog method", "El método de Basketlog", "A metodologia do Basketlog"],
  "/app/bilan": ["Bilan public des pronostics", "Public prediction track record", "Balance público de pronósticos", "Desempenho público dos palpites"],
};
const q = (x, L) => L.t(`${tr(x.t, "fr")} : c'est quoi au basket ?`, `What is ${tr(x.t, "en").toLowerCase()} in basketball?`, `¿Qué es ${tr(x.t, "es").toLowerCase()} en baloncesto?`, `O que é ${tr(x.t, "pt").toLowerCase()} no basquete?`);

export async function generateMetadata({ params }) {
  const { terme } = await params;
  const L = await getL();
  const x = termOf(terme);
  if (!x) return {};
  const name = tr(x.t, L.lang);
  return pageMeta({
    title: L.t(`${name} : définition simple (basket NBA)`, `${name}: simple definition (NBA basketball)`, `${name}: definición sencilla (baloncesto NBA)`, `${name}: definição simples (basquete NBA)`),
    description: tr(x.d, L.lang).slice(0, 155).replace(/\s\S*$/, "") + "…",
    path: `/app/lexique/${x.slug}`,
    L,
  });
}

export default async function TermPage({ params }) {
  const { terme } = await params;
  const L = await getL();
  const x = termOf(terme);
  if (!x) notFound();
  const name = tr(x.t, L.lang);
  const others = TERMS.filter((o) => o.slug !== x.slug);
  const url = `${SITE}${L.href(`/app/lexique/${x.slug}`)}`;
  return (
    <main className="app-page prose-page">
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Lexique", "Glossary", "Glosario", "Glossário"), "/app/lexique"], [name, `/app/lexique/${x.slug}`]]} />
      <AppTabs active="" />
      <div className="app-head"><h1>{name}</h1></div>
      <div className="card block">
        <p className="narr">{tr(x.d, L.lang)}</p>
        {LINKS[x.link] && <p className="narr"><Link href={L.href(x.link)}>{tr(LINKS[x.link], L.lang)} →</Link></p>}
      </div>
      <p className="team-rec">{L.t("Autres mots : ", "More terms: ", "Otros términos: ", "Outros termos: ")}{others.map((o, i) => <span key={o.slug}>{i ? " · " : ""}<Link href={L.href(`/app/lexique/${o.slug}`)}>{tr(o.t, L.lang)}</Link></span>)}</p>
      <JsonLd data={[
        { "@context": "https://schema.org", "@type": "DefinedTerm", name, description: tr(x.d, L.lang), url, inDefinedTermSet: `${SITE}${L.href("/app/lexique")}` },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: q(x, L), acceptedAnswer: { "@type": "Answer", text: tr(x.d, L.lang) } }] },
      ]} />
    </main>
  );
}
