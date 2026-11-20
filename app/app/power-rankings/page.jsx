import Link from "next/link";
import { powerRankings } from "../../../lib/data";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { SITE } from "../../../lib/site";

export const dynamic = "force-dynamic";

// Recherche US très fréquente : « nba power rankings ». Classement par la force mesurée par le modèle Basketlog
// (écart de points attendu face à une équipe moyenne), recalculé chaque jour.
const monthYear = (L) => new Intl.DateTimeFormat(L.locale, { month: "long", year: "numeric", timeZone: L.tz }).format(new Date());

export async function generateMetadata() {
  const L = await getL();
  const my = monthYear(L);
  return pageMeta({
    title: L.t(`Power ranking NBA (${my}) : les 30 équipes classées par le modèle`, `NBA power rankings (${my}): all 30 teams ranked by our model`, `Power ranking NBA (${my}): los 30 equipos según nuestro modelo`, `Power ranking NBA (${my}): os 30 times segundo nosso modelo`),
    description: L.t(
      "Les 30 équipes NBA classées par leur vraie force selon le modèle Basketlog : écart de points attendu face à une équipe moyenne et chances de la battre. Mis à jour chaque jour.",
      "All 30 NBA teams ranked by true strength according to the Basketlog model: expected point margin against an average team and the chance to beat it. Updated daily.",
      "Los 30 equipos de la NBA ordenados por su fuerza real según el modelo de Basketlog: diferencia de puntos esperada ante un equipo medio y probabilidad de ganarle. Actualizado cada día.", "Os 30 times da NBA ordenados pela força real segundo o modelo do Basketlog: saldo de pontos esperado contra um time médio e probabilidade de vencê-lo. Atualizado todo dia."
    ),
    path: "/app/power-rankings",
    L,
  });
}

export default async function PowerRankingsPage() {
  const L = await getL();
  const rows = await powerRankings();
  const num = (x) => `${x > 0 ? "+" : ""}${L.en ? x.toFixed(1) : x.toFixed(1).replace(".", ",")}`;
  const pc = (p) => (L.en ? `${Math.round(p * 100)}%` : `${Math.round(p * 100)} %`);
  const mv = (m) => (m == null ? "–" : m > 0 ? `▲ ${m}` : m < 0 ? `▼ ${-m}` : "=");
  const moved = rows.filter((r) => r.move != null);
  const up = [...moved].sort((a, b) => b.move - a.move)[0];
  const down = [...moved].sort((a, b) => a.move - b.move)[0];
  return (
    <main className="app-page wide">
      <AppTabs active="classement" />
      <div className="app-head">
        <h1>{L.t("Power ranking NBA", "NBA power rankings", "Power ranking NBA", "Power ranking NBA")}</h1>
        <p>{L.t(
          `Les 30 équipes classées par le modèle Basketlog, ${monthYear(L)}. La force est l'écart de points attendu face à une équipe moyenne sur terrain neutre (sans les absences du jour).`,
          `All 30 teams ranked by the Basketlog model, ${monthYear(L)}. Strength is the expected point margin against an average team on a neutral court (before today's injuries).`,
          `Los 30 equipos según el modelo de Basketlog, ${monthYear(L)}. La fuerza es la diferencia de puntos esperada ante un equipo medio en campo neutral (sin las bajas del día).`, `Os 30 times segundo o modelo do Basketlog, ${monthYear(L)}. A força é o saldo de pontos esperado contra um time médio em quadra neutra (sem os desfalques do dia).`
        )}</p>
        {up && down && up.move > 0 && down.move < 0 && (
          <p className="note">{L.t(
            `Sur 7 jours : plus forte hausse pour ${up.team.short} (▲ ${up.move}), plus forte baisse pour ${down.team.short} (▼ ${-down.move}).`,
            `Last 7 days: biggest riser ${up.team.short} (▲ ${up.move}), biggest faller ${down.team.short} (▼ ${-down.move}).`,
            `En 7 días: mayor subida de ${up.team.short} (▲ ${up.move}), mayor caída de ${down.team.short} (▼ ${-down.move}).`,
            `Em 7 dias: maior alta do ${up.team.short} (▲ ${up.move}), maior queda do ${down.team.short} (▼ ${-down.move}).`
          )}</p>
        )}
      </div>
      <div className="panel">
        <table className="std-table">
          <thead><tr><th>#</th><th>{L.t("Équipe", "Team", "Equipo", "Time")}</th><th>{L.t("V-D", "W-L", "V-D", "V-D")}</th><th>{L.t("Force", "Strength", "Fuerza", "Força")}</th><th>{L.t("vs équipe moyenne", "vs average team", "vs equipo medio", "vs time médio")}</th><th title={L.t("Évolution sur 7 jours", "Change over 7 days", "Cambio en 7 días", "Variação em 7 dias")}>{L.t("7 j", "7 days", "7 días", "7 dias")}</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.team.id}>
                <td className="rk">{i + 1}</td>
                <td className="tm">
                  <Link href={L.href(`/app/equipe/${r.team.id}`)}>
                    <span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.team.logo} alt="" />
                      {r.team.short}
                    </span>
                  </Link>
                </td>
                <td>{r.wins}-{r.losses}</td>
                <td className={r.strength > 0 ? "pos" : r.strength < 0 ? "neg" : ""}>{num(r.strength)}</td>
                <td>{pc(r.pAvg)}</td>
                <td className={r.move > 0 ? "pos" : r.move < 0 ? "neg" : ""}>{mv(r.move)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="team-rec">
        {L.t("Comment c'est calculé : ", "How it's calculated: ", "Cómo se calcula: ", "Como é calculado: ")}
        <Link href={L.href("/methode")}>{L.t("la méthode Basketlog", "the Basketlog method", "el método de Basketlog", "a metodologia do Basketlog")}</Link>
        {" · "}
        <Link href={L.href("/app/matchs")}>{L.t("pronostics NBA du soir", "tonight's NBA predictions", "pronósticos NBA de hoy", "palpites NBA de hoje")}</Link>
        {" · "}
        <Link href={L.href("/app/simulation")}>{L.t("chances de playoffs", "playoff odds", "probabilidades de playoffs", "chances de playoffs")}</Link>
        {" · "}
        <Link href={L.href("/app/champion")}>{L.t("favoris au titre", "title favorites", "favoritos al título", "favoritos ao título")}</Link>
        {" · "}
        <Link href={L.href(L.es || L.pt ? "/app/espagnols" : "/app/francais")}>{L.t("les Français en NBA", "French players in the NBA", "españoles y latinos en la NBA", "espanhóis e latinos na NBA")}</Link>
      </p>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "ItemList",
        name: L.t("Power ranking NBA", "NBA power rankings", "Power ranking NBA", "Power ranking NBA"),
        itemListElement: rows.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.team.name, url: `${SITE}${L.href(`/app/equipe/${r.team.id}`)}` })),
      }} />
    </main>
  );
}
