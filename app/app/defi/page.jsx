import Link from "next/link";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import Crumbs from "../../../components/Crumbs";
import DefiGame from "../../../components/DefiGame";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { fmtDate, fmtTime, pctOf } from "../../../lib/i18n";
import { nbaToday, shiftDate } from "../../../lib/espn";
import { SITE } from "../../../lib/site";
import { memberSession } from "../../../lib/usage";
import { defiGames, defiResults } from "../../../lib/defi-data";
import { defiConfigured, defiMine, defiRange } from "../../../lib/defi";
import { leaderboard, parseShare, weekBounds } from "../../../lib/defi-score";

// Jeu gratuit « Bats le modèle » : choisir le vainqueur de chaque match NBA avant le coup d'envoi, se comparer au
// favori du modèle Basketlog, classement de la semaine. Aucune mise, aucun gain : un jeu, pas un pari.
export const dynamic = "force-dynamic";
const iso = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T16:00:00Z`;

export async function generateMetadata({ searchParams }) {
  const L = await getL();
  const s = parseShare((await searchParams)?.s);
  const title = s
    ? L.t(`${s.u} bons choix sur ${s.n} contre le modèle Basketlog (${s.m}) : à toi de jouer`, `${s.u} of ${s.n} right vs the Basketlog model (${s.m}): your turn`, `${s.u} aciertos de ${s.n} contra el modelo de Basketlog (${s.m}): te toca`, `${s.u} acertos de ${s.n} contra o modelo do Basketlog (${s.m}): sua vez`)
    : L.t("Bats le modèle : choisis les vainqueurs NBA de ce soir (jeu gratuit)", "Beat the model: pick tonight's NBA winners (free game)", "Gana al modelo: elige los ganadores NBA de esta noche (juego gratis)", "Vença o modelo: escolha os vencedores da NBA de hoje (jogo grátis)");
  const image = s ? `/api/og/defi?${new URLSearchParams({ u: s.u, m: s.m, n: s.n, lang: L.lang })}` : `/api/og/defi?lang=${L.lang}`;
  return pageMeta({
    title,
    description: L.t(
      "Jeu gratuit : choisis le vainqueur de chaque match NBA avant le coup d'envoi et compare-toi au modèle Basketlog. Score chaque matin, classement chaque semaine.",
      "Free game: pick the winner of every NBA game before tip-off and see if you can beat the Basketlog model. Daily score, weekly leaderboard.",
      "Juego gratis: elige el ganador de cada partido NBA antes del inicio y compárate con el modelo de Basketlog. Resultado cada mañana, clasificación cada semana.",
      "Jogo grátis: escolha o vencedor de cada jogo da NBA antes do início e compare-se com o modelo do Basketlog. Resultado toda manhã, ranking toda semana."
    ),
    path: "/app/defi",
    image,
    L,
  });
}

export default async function DefiPage() {
  const L = await getL();
  const today = nbaToday();
  const week = weekBounds(today);
  const from = [shiftDate(today, -8), week.from].sort()[0];
  const me = await memberSession().catch(() => null);
  const dbReady = defiConfigured();
  const [{ games, tomorrow }, results, mine, rows] = await Promise.all([
    defiGames().catch(() => ({ games: [], tomorrow: false })),
    defiResults(from, today).catch(() => ({})),
    me?.uid ? defiMine(me.uid, from, shiftDate(today, 1)) : Promise.resolve(null),
    defiRange(week.from, week.to),
  ]);
  const live = dbReady && rows !== null; // base prête (script lancé) : classement disponible
  const board = live ? leaderboard(rows, results) : [];
  const view = games.map((g) => {
    const fav = g.m === g.home.id ? g.home : g.away;
    const pf = g.m === g.home.id ? g.pHome : 1 - g.pHome;
    return { g: g.g, d: g.d, when: `${fmtDate(L, g.date, { weekday: "short", day: "numeric", month: "short" }).replace(/\.$/, "")} · ${fmtTime(L, g.date)}`, home: g.home, away: g.away, m: g.m, mShort: fav.short, mPct: pctOf(pf, L) };
  });
  const dayLabels = {};
  for (let d = from; d <= today; d = shiftDate(d, 1)) dayLabels[d] = fmtDate(L, iso(d), { weekday: "long", day: "numeric", month: "long" });
  const faq = [
    { q: L.t("Comment jouer à « Bats le modèle » ?", "How does “Beat the model” work?", "¿Cómo se juega a «Gana al modelo»?", "Como funciona o «Vença o modelo»?"),
      a: L.t("Avant chaque match NBA, touche l'équipe qui va gagner selon toi. Le lendemain matin, ton nombre de bons choix est comparé à celui du modèle Basketlog sur les mêmes matchs.", "Before each NBA game, tap the team you think will win. The next morning, your number of correct picks is compared with the Basketlog model's on the same games.", "Antes de cada partido NBA, toca el equipo que crees que ganará. A la mañana siguiente, tus aciertos se comparan con los del modelo de Basketlog en los mismos partidos.", "Antes de cada jogo da NBA, toque no time que você acha que vai vencer. Na manhã seguinte, seus acertos são comparados aos do modelo do Basketlog nos mesmos jogos.") },
    { q: L.t("Est-ce que c'est payant ?", "Does it cost anything?", "¿Cuesta algo?", "É pago?"),
      a: L.t("Non. C'est un jeu gratuit, sans mise et sans gain d'argent. Un compte gratuit permet d'entrer dans le classement de la semaine.", "No. It's a free game with no stakes and no money to win. A free account puts you on the weekly leaderboard.", "No. Es un juego gratis, sin apuestas ni premios en dinero. Una cuenta gratis te mete en la clasificación de la semana.", "Não. É um jogo grátis, sem aposta e sem prêmio em dinheiro. Uma conta grátis coloca você no ranking da semana.") },
    { q: L.t("Le modèle est-il difficile à battre ?", "Is the model hard to beat?", "¿Es difícil ganarle al modelo?", "É difícil vencer o modelo?"),
      a: L.t("Cette saison, son favori gagne environ deux matchs sur trois. Pour le battre, il faut oser aller contre lui sur les bons matchs.", "This season its favorite wins about two games out of three. To beat it, you have to go against it on the right games.", "Esta temporada su favorito gana unos dos de cada tres partidos. Para ganarle, hay que ir contra él en los partidos correctos.", "Nesta temporada, o favorito dele vence cerca de dois em cada três jogos. Para vencê-lo, é preciso ir contra ele nos jogos certos.") },
  ];
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Pronostics NBA de ce soir", "NBA predictions tonight", "Pronósticos NBA de hoy", "Palpites NBA de hoje"), "/app/matchs"], [L.t("Bats le modèle", "Beat the model", "Gana al modelo", "Vença o modelo"), "/app/defi"]]} />
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{L.t("Bats le modèle", "Beat the model", "Gana al modelo", "Vença o modelo")}</h1>
        <p>{L.t(
          `Choisis le vainqueur de chaque match NBA ${tomorrow ? "de demain" : "de ce soir"} avant le coup d'envoi, puis compare-toi au modèle Basketlog. Gratuit, sans mise.`,
          `Pick the winner of every NBA game ${tomorrow ? "tomorrow" : "tonight"} before tip-off, then see if you beat the Basketlog model. Free, no stakes.`,
          `Elige el ganador de cada partido NBA ${tomorrow ? "de mañana" : "de esta noche"} antes del inicio y compárate con el modelo de Basketlog. Gratis, sin apuestas.`,
          `Escolha o vencedor de cada jogo da NBA ${tomorrow ? "de amanhã" : "de hoje"} antes do início e compare-se com o modelo do Basketlog. Grátis, sem aposta.`
        )}</p>
      </div>
      <DefiGame games={view} results={results} serverPicks={mine || []} logged={!!me?.uid} dbReady={live} week={week} dayLabels={dayLabels} shareBase={`${SITE}${L.href("/app/defi")}`} lang={L.lang} />
      <section className="card block">
        <h2>{L.t("Classement de la semaine", "This week's leaderboard", "Clasificación de la semana", "Ranking da semana")}</h2>
        {!live ? <p className="empty">{L.t("Le classement ouvre très bientôt. Tes choix sont déjà gardés.", "The leaderboard opens very soon. Your picks are already saved.", "La clasificación abre muy pronto. Tus elecciones ya están guardadas.", "O ranking abre muito em breve. Suas escolhas já estão salvas.")}</p>
          : !board.length ? <p className="empty">{L.t("Personne n'est encore classé cette semaine. Le premier, c'est peut-être toi.", "Nobody is ranked yet this week. The first could be you.", "Nadie está clasificado todavía esta semana. El primero puedes ser tú.", "Ninguém está no ranking ainda nesta semana. O primeiro pode ser você.")}</p>
          : (
            <div className="tbl-scroll">
              <table className="std-table">
                <thead><tr><th>#</th><th>{L.t("Joueur", "Player", "Jugador", "Jogador")}</th><th>{L.t("Bons choix", "Right", "Aciertos", "Acertos")}</th><th>{L.t("Modèle", "Model", "Modelo", "Modelo")}</th><th>{L.t("Matchs", "Games", "Partidos", "Jogos")}</th></tr></thead>
                <tbody>{board.map((r) => (<tr key={r.rank}><td className="rk">{r.rank}</td><td className="tm">{r.name}</td><td className={r.me > r.model ? "pos" : ""}>{r.me}</td><td>{r.model}</td><td>{r.n}</td></tr>))}</tbody>
              </table>
            </div>
          )}
        <p className="narr" style={{ marginTop: 10 }}>{L.t("Du lundi au dimanche. Ton prénom et l'initiale de ton nom apparaissent dans le classement.", "Monday to Sunday. Your first name and last initial appear on the leaderboard.", "De lunes a domingo. Tu nombre y la inicial de tu apellido aparecen en la clasificación.", "De segunda a domingo. Seu primeiro nome e a inicial do sobrenome aparecem no ranking.")}</p>
      </section>
      <section className="card block match-faq">
        <h2>{L.t("Les règles", "The rules", "Las reglas", "As regras")}</h2>
        {faq.map((f) => (<div key={f.q} className="mfaq-item"><h3>{f.q}</h3><p>{f.a}</p></div>))}
        <p className="mfaq-more"><Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA de ce soir →", "NBA predictions tonight →", "Pronósticos NBA de hoy →", "Palpites NBA de hoje →")}</Link>{" · "}<Link href={L.href("/app/resultats")}>{L.t("Résultats de la nuit →", "Last night's scores →", "Resultados de anoche →", "Resultados de ontem →")}</Link>{" · "}<Link href={L.href("/app/bilan")}>{L.t("Bilan du modèle →", "Model track record →", "Balance del modelo →", "Desempenho do modelo →")}</Link></p>
      </section>
      <p className="disclaimer">{L.t("Jeu gratuit, sans mise ni gain d'argent. Basketlog n'est pas un service de paris.", "Free game, no stakes and no money to win. Basketlog is not a betting service.", "Juego gratis, sin apuestas ni premios en dinero. Basketlog no es un servicio de apuestas.", "Jogo grátis, sem aposta nem prêmio em dinheiro. O Basketlog não é um serviço de apostas.")}</p>
    </main>
  );
}
