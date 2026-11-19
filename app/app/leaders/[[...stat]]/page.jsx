import Link from "next/link";
import { notFound } from "next/navigation";
import AppTabs from "../../../../components/AppTabs";
import JsonLd from "../../../../components/JsonLd";
import Crumbs from "../../../../components/Crumbs";
import { pageMeta } from "../../../../lib/seo";
import { getL } from "../../../../lib/lang-server";
import { numOf } from "../../../../lib/i18n";
import { getPlayerStats, nbaToday, seasonForDate } from "../../../../lib/espn";
import { teamById } from "../../../../lib/teams";
import { playerPath } from "../../../../lib/slug";
import { SITE } from "../../../../lib/site";

// Classements des meilleurs joueurs NBA de la saison : points, rebonds, passes décisives par match.
// Recherches visées : « meilleurs marqueurs NBA », « máximos anotadores NBA », « cestinhas da NBA », « NBA scoring leaders ».
export const dynamic = "force-dynamic";

const STATS = {
  points: { key: "ppg", path: "/app/leaders", fr: ["Meilleurs marqueurs NBA", "points par match", "marqueur"], en: ["NBA scoring leaders", "points per game", "scorer"], es: ["Máximos anotadores NBA", "puntos por partido", "anotador"], pt: ["Cestinhas da NBA", "pontos por jogo", "cestinha"] },
  rebounds: { key: "reb", path: "/app/leaders/rebounds", fr: ["Meilleurs rebondeurs NBA", "rebonds par match", "rebondeur"], en: ["NBA rebounding leaders", "rebounds per game", "rebounder"], es: ["Máximos reboteadores NBA", "rebotes por partido", "reboteador"], pt: ["Líderes em rebotes da NBA", "rebotes por jogo", "reboteiro"] },
  assists: { key: "ast", path: "/app/leaders/assists", fr: ["Meilleurs passeurs NBA", "passes décisives par match", "passeur"], en: ["NBA assists leaders", "assists per game", "passer"], es: ["Máximos asistentes NBA", "asistencias por partido", "asistente"], pt: ["Líderes em assistências da NBA", "assistências por jogo", "garçom"] },
};
const seasonLabel = () => { const y = seasonForDate(nbaToday()); return `${y - 1}-${String(y).slice(2)}`; };
const pick = (params) => {
  const s = params?.stat?.[0] || "points";
  return params?.stat?.length > 1 ? null : STATS[s] ? s : null;
};
const tx = (L, def, i) => L.t(def.fr[i], def.en[i], def.es[i], def.pt[i]);

async function leaders(key, n = 30) {
  const all = Object.values((await getPlayerStats(seasonForDate(nbaToday()))) || {});
  const maxGp = Math.max(0, ...all.map((p) => p.gp || 0));
  const min = Math.max(3, Math.floor(maxGp * 0.6)); // assez de matchs joués pour figurer au classement
  return all.filter((p) => (p.gp || 0) >= min && p[key] != null).sort((a, b) => b[key] - a[key]).slice(0, n).map((p) => ({ ...p, t: teamById(p.team) }));
}

export async function generateMetadata({ params }) {
  const L = await getL();
  const s = pick(await params);
  if (!s) return {};
  const def = STATS[s];
  const season = seasonLabel();
  let top = [];
  try { top = await leaders(def.key, 3); } catch {}
  const lead = top[0] ? L.t(` ${top[0].name} en tête avec ${numOf(top[0][def.key], L)}.`, ` ${top[0].name} leads with ${numOf(top[0][def.key], L)}.`, ` ${top[0].name} lidera con ${numOf(top[0][def.key], L)}.`, ` ${top[0].name} lidera com ${numOf(top[0][def.key], L)}.`) : "";
  return pageMeta({
    title: L.t(`${def.fr[0]} ${season} : classement à jour`, `${def.en[0]} ${season}: full list (updated daily)`, `${def.es[0]} ${season}: clasificación actualizada`, `${def.pt[0]} ${season}: ranking atualizado`),
    description: L.t(`Le classement des ${def.fr[0].toLowerCase()} de la saison ${season} en ${def.fr[1]}, mis à jour chaque jour.${lead}`, `The ${season} ${def.en[0].replace("NBA ", "")} in ${def.en[1]}, updated daily.${lead}`, `La clasificación de ${def.es[0].toLowerCase()} de la temporada ${season} en ${def.es[1]}, actualizada cada día.${lead}`, `O ranking de ${def.pt[0].toLowerCase()} da temporada ${season} em ${def.pt[1]}, atualizado todo dia.${lead}`),
    path: def.path,
    L,
  });
}

export default async function LeadersPage({ params }) {
  const L = await getL();
  const s = pick(await params);
  if (!s) notFound();
  const def = STATS[s];
  const season = seasonLabel();
  let rows = [];
  try { rows = await leaders(def.key); } catch {}
  const v = (p) => numOf(p[def.key], L);
  const faq = rows.length >= 3 ? [
    {
      q: L.t(`Qui est le meilleur ${def.fr[2]} de la NBA cette saison ?`, `Who is the NBA's leading ${def.en[2]} this season?`, `¿Quién es el máximo ${def.es[2]} de la NBA esta temporada?`, `Quem é o maior ${def.pt[2]} da NBA nesta temporada?`),
      a: L.t(`${rows[0].name}${rows[0].t ? ` (${rows[0].t.short})` : ""} mène la NBA avec ${v(rows[0])} ${def.fr[1]}, devant ${rows[1].name} (${v(rows[1])}) et ${rows[2].name} (${v(rows[2])}).`,
        `${rows[0].name}${rows[0].t ? ` (${rows[0].t.short})` : ""} leads the NBA with ${v(rows[0])} ${def.en[1]}, ahead of ${rows[1].name} (${v(rows[1])}) and ${rows[2].name} (${v(rows[2])}).`,
        `${rows[0].name}${rows[0].t ? ` (${rows[0].t.short})` : ""} lidera la NBA con ${v(rows[0])} ${def.es[1]}, por delante de ${rows[1].name} (${v(rows[1])}) y ${rows[2].name} (${v(rows[2])}).`,
        `${rows[0].name}${rows[0].t ? ` (${rows[0].t.short})` : ""} lidera a NBA com ${v(rows[0])} ${def.pt[1]}, à frente de ${rows[1].name} (${v(rows[1])}) e ${rows[2].name} (${v(rows[2])}).`),
    },
    {
      q: L.t("Qui figure dans ce classement ?", "Who qualifies for this list?", "¿Quién entra en esta clasificación?", "Quem entra neste ranking?"),
      a: L.t("Les joueurs qui ont disputé au moins 60 % des matchs du joueur le plus utilisé de la saison, pour éviter qu'un joueur avec 2 matchs ne fausse le classement.", "Players who have appeared in at least 60% as many games as the season's most-used player, so a player with 2 games doesn't skew the list.", "Los jugadores que han disputado al menos el 60 % de los partidos del jugador más utilizado de la temporada, para que un jugador con 2 partidos no distorsione la clasificación.", "Os jogadores que disputaram pelo menos 60 % dos jogos do jogador mais utilizado da temporada, para que um jogador com 2 jogos não distorça o ranking."),
    },
  ] : [];
  const ld = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  const list = rows.length ? { "@context": "https://schema.org", "@type": "ItemList", name: `${tx(L, def, 0)} ${season}`, itemListElement: rows.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}${L.href(playerPath(p.name))}`, name: p.name })) } : null;
  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <JsonLd data={list} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Classement NBA", "NBA standings", "Clasificación NBA", "Classificação NBA"), "/app/classement"], [tx(L, def, 0), def.path]]} />
      <AppTabs active="classement" />
      <div className="app-head">
        <h1>{tx(L, def, 0)} {season}</h1>
        <p>{L.t(`En ${def.fr[1]}, saison régulière, mis à jour chaque jour.`, `In ${def.en[1]}, regular season, updated daily.`, `En ${def.es[1]}, temporada regular, actualizado cada día.`, `Em ${def.pt[1]}, temporada regular, atualizado todo dia.`)}</p>
        <p className="cup-dates">
          {Object.entries(STATS).map(([k, d]) => (k === s ? <b key={k}>{tx(L, d, 0)}</b> : <Link key={k} href={L.href(d.path)}>{tx(L, d, 0)}</Link>))}
        </p>
      </div>
      {rows.length ? (
        <div className="card block tbl-scroll">
          <table className="std-table">
            <thead><tr><th>#</th><th>{L.t("Joueur", "Player", "Jugador", "Jogador")}</th><th>{L.t("Équipe", "Team", "Equipo", "Time")}</th><th>{L.t("Matchs", "GP", "PJ", "Jogos")}</th><th>{s === "points" ? "PTS" : s === "rebounds" ? "REB" : "AST"}</th></tr></thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.id}>
                  <td className="rk">{i + 1}</td>
                  <td className="tm"><Link href={L.href(playerPath(p.name))}><span>{p.head ? <img src={p.head} alt="" style={{ borderRadius: "50%", objectFit: "cover" }} /> : null}{p.name}</span></Link></td>
                  <td className="tm">{p.t ? <Link href={L.href(`/app/equipe/${p.t.id}`)}>{p.t.short}</Link> : "–"}</td>
                  <td>{p.gp}</td>
                  <td className="pos">{v(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">{L.t("Statistiques indisponibles pour le moment.", "Stats unavailable right now.", "Estadísticas no disponibles por el momento.", "Estatísticas indisponíveis no momento.")}</p>
      )}
      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t(`${def.fr[0]} : l'essentiel`, `${def.en[0]}: quick answers`, `${def.es[0]}: lo esencial`, `${def.pt[0]}: o essencial`)}</h2>
          {faq.map((f) => (<div key={f.q} className="mfaq-item"><h3>{f.q}</h3><p>{f.a}</p></div>))}
          <p className="mfaq-more">
            <Link href={L.href("/app/classement")}>{L.t("Classement NBA →", "NBA standings →", "Clasificación NBA →", "Classificação NBA →")}</Link>{" · "}
            <Link href={L.href("/app/simulation")}>{L.t("Chances de playoffs →", "Playoff odds →", "Probabilidades de playoffs →", "Chances de playoffs →")}</Link>{" · "}
            <Link href={L.href("/app/blessures")}>{L.t("Blessés NBA →", "NBA injury report →", "Lesionados NBA →", "Lesionados NBA →")}</Link>
          </p>
        </section>
      )}
      <p className="disclaimer">{L.t("Statistiques de saison régulière (source : ESPN), mises à jour chaque jour.", "Regular-season stats (source: ESPN), updated daily.", "Estadísticas de temporada regular (fuente: ESPN), actualizadas cada día.", "Estatísticas da temporada regular (fonte: ESPN), atualizadas todo dia.")}</p>
    </main>
  );
}
