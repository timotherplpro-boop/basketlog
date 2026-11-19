import Link from "next/link";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import Crumbs from "../../../components/Crumbs";
import PrefSource from "../../../components/PrefSource";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { fmtDate } from "../../../lib/i18n";
import { analyzeDay } from "../../../lib/data";
import { nbaToday, shiftDate } from "../../../lib/espn";
import { nbaPath } from "../../../lib/slug";
import { probTxt } from "../../../lib/probtxt";

// « Résultats NBA cette nuit », « resultados NBA anoche », « resultados da NBA ontem », « NBA scores last night » :
// scores de la veille, et pour chaque match le favori du modèle avant le coup d'envoi (réussi ou manqué).
export const dynamic = "force-dynamic";
const iso = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T16:00:00Z`;

export async function generateMetadata() {
  const L = await getL();
  const d = fmtDate(L, iso(shiftDate(nbaToday(), -1)), { day: "numeric", month: "short" }).replace(/\.$/, "");
  return pageMeta({
    title: L.t(`Résultats NBA de la nuit (${d}) : tous les scores et nos pronostics`, `NBA scores last night (${d}): every result and our predictions`, `Resultados NBA de anoche (${d}): todos los marcadores y nuestros pronósticos`, `Resultados da NBA ontem (${d}): todos os placares e nossos palpites`),
    description: L.t("Tous les résultats NBA de la nuit avec le score final, et pour chaque match le favori annoncé par le modèle Basketlog avant le coup d'envoi : réussi ou manqué.", "Every NBA result from last night with the final score, plus the favorite the Basketlog model picked before tip-off for each game: right or wrong.", "Todos los resultados NBA de anoche con el marcador final y, para cada partido, el favorito que el modelo de Basketlog anunció antes del inicio: acierto o fallo.", "Todos os resultados da NBA de ontem com o placar final e, para cada jogo, o favorito apontado pelo modelo do Basketlog antes do início: acerto ou erro."),
    path: "/app/resultats",
    L,
  });
}

export default async function ResultsPage() {
  const L = await getL();
  const date = shiftDate(nbaToday(), -1);
  let analyses = [];
  try { analyses = (await analyzeDay(date)).analyses; } catch {}
  const done = analyses.filter((a) => a.game.state === "post" && !a.game.postponed && a.game.home.score != null && a.game.home.score !== a.game.away.score).sort((x, y) => new Date(x.game.date) - new Date(y.game.date));
  const rows = done.map((a) => {
    const g = a.game;
    const winner = g.home.score > g.away.score ? g.home : g.away;
    const fav = a.pHome >= 0.5 ? g.home : g.away;
    return { a, g, winner, fav, pf: Math.max(a.pHome, a.pAway), ok: winner.id === fav.id };
  });
  const ok = rows.filter((r) => r.ok).length;
  const d = fmtDate(L, iso(date), { weekday: "long", day: "numeric", month: "long" });
  const upset = rows.filter((r) => !r.ok).sort((x, y) => y.pf - x.pf)[0];
  const big = [...rows].sort((x, y) => Math.abs(y.g.home.score - y.g.away.score) - Math.abs(x.g.home.score - x.g.away.score))[0];
  const sc = (r) => `${r.g.away.short} ${r.g.away.score} – ${r.g.home.score} ${r.g.home.short}`;
  const faq = rows.length ? [
    {
      q: L.t("Quels sont les résultats NBA de cette nuit ?", "What were the NBA scores last night?", "¿Cuáles fueron los resultados NBA de anoche?", "Quais foram os resultados da NBA ontem?"),
      a: rows.map(sc).join(" ; ") + ".",
    },
    {
      q: L.t("Le modèle Basketlog avait-il vu juste ?", "Did the Basketlog model get it right?", "¿Acertó el modelo de Basketlog?", "O modelo do Basketlog acertou?"),
      a: L.t(`Le favori du modèle a gagné ${ok} match${ok > 1 ? "s" : ""} sur ${rows.length}.${upset ? ` Plus grosse surprise : ${upset.winner.short} contre ${upset.fav.short}, favori à ${probTxt(upset.pf, L)}.` : ""}`, `The model's favorite won ${ok} of ${rows.length} games.${upset ? ` Biggest upset: the ${upset.winner.short} over the ${upset.fav.short}, who were ${probTxt(upset.pf, L)} favorites.` : ""}`, `El favorito del modelo ganó ${ok} de ${rows.length} partidos.${upset ? ` Mayor sorpresa: ${upset.winner.short} ante ${upset.fav.short}, favoritos al ${probTxt(upset.pf, L)}.` : ""}`, `O favorito do modelo venceu ${ok} de ${rows.length} jogos.${upset ? ` Maior surpresa: ${upset.winner.short} sobre ${upset.fav.short}, favorito com ${probTxt(upset.pf, L)}.` : ""}`),
    },
    ...(big ? [{
      q: L.t("Quel a été le plus gros écart de la nuit ?", "What was the biggest blowout last night?", "¿Cuál fue la mayor paliza de anoche?", "Qual foi a maior goleada de ontem?"),
      a: `${sc(big)}.`,
    }] : []),
  ] : [];
  const ld = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Pronostics NBA de ce soir", "NBA predictions tonight", "Pronósticos NBA de hoy", "Palpites NBA de hoje"), "/app/matchs"], [L.t("Résultats NBA", "NBA scores", "Resultados NBA", "Resultados da NBA"), "/app/resultats"]]} />
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{L.t("Résultats NBA de la nuit", "NBA scores last night", "Resultados NBA de anoche", "Resultados da NBA de ontem")}</h1>
        <p>{L.t(`Matchs du ${d}.`, `Games of ${d}.`, `Partidos del ${d}.`, `Jogos de ${d}.`)}{rows.length ? L.t(` Pronostics du modèle : ${ok} réussi${ok > 1 ? "s" : ""} sur ${rows.length}.`, ` Model picks: ${ok} of ${rows.length} right.`, ` Pronósticos del modelo: ${ok} aciertos de ${rows.length}.`, ` Palpites do modelo: ${ok} acertos de ${rows.length}.`) : ""}</p>
      </div>
      {rows.length ? (
        <div className="card block tbl-scroll">
          <table className="std-table">
            <thead><tr><th>{L.t("Match", "Game", "Partido", "Jogo")}</th><th>{L.t("Score", "Score", "Marcador", "Placar")}</th><th>{L.t("Favori avant le match", "Pre-game favorite", "Favorito previo", "Favorito antes do jogo")}</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.g.id}>
                  <td className="tm"><Link href={L.href(nbaPath(r.g, date))}>{r.g.away.short} @ {r.g.home.short}</Link></td>
                  <td><b>{r.g.away.score}-{r.g.home.score}</b></td>
                  <td className={r.ok ? "pos" : "neg"}>{r.ok ? "✅" : "❌"} {r.fav.short} {probTxt(r.pf, L)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">{L.t("Pas de match NBA terminé hier.", "No completed NBA games yesterday.", "No hubo partidos NBA terminados ayer.", "Nenhum jogo da NBA encerrado ontem.")}</p>
      )}
      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t("Résultats NBA : l'essentiel", "NBA scores: quick answers", "Resultados NBA: lo esencial", "Resultados da NBA: o essencial")}</h2>
          {faq.map((f) => (<div key={f.q} className="mfaq-item"><h3>{f.q}</h3><p>{f.a}</p></div>))}
          <p className="mfaq-more"><Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA de ce soir →", "NBA predictions tonight →", "Pronósticos NBA de hoy →", "Palpites NBA de hoje →")}</Link>{" · "}<Link href={L.href("/app/classement")}>{L.t("Classement NBA →", "NBA standings →", "Clasificación NBA →", "Classificação NBA →")}</Link>{" · "}<Link href={L.href("/app/bilan")}>{L.t("Bilan complet du modèle →", "Full model track record →", "Balance completo del modelo →", "Desempenho completo do modelo →")}</Link></p>
        </section>
      )}
      <p className="disclaimer">{L.t("Favori recalculé avec les seuls résultats connus avant le match. Une probabilité n'est jamais une certitude.", "Favorite recomputed using only results known before the game. A probability is never a certainty.", "Favorito recalculado solo con los resultados conocidos antes del partido. Una probabilidad nunca es una certeza.", "Favorito recalculado só com os resultados conhecidos antes do jogo. Uma probabilidade nunca é uma certeza.")}</p>
      <PrefSource L={L} />
    </main>
  );
}
