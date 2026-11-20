import Link from "next/link";
import AppTabs from "./AppTabs";
import JsonLd from "./JsonLd";
import Crumbs from "./Crumbs";
import PrefSource from "./PrefSource";
import LocalTime from "./LocalTime";
import { pctOf, numOf, fmtDate, fmtTime } from "../lib/i18n";
import { FLAGS, GROUPS, countryName, nationalTitle } from "../lib/nationals.js";
import { SITE } from "../lib/site";

// Page « Les Français en NBA » / « Españoles y latinos en la NBA » : qui joue cette nuit (heure du visiteur, chances
// de victoire de son équipe, statut médical), puis tous les joueurs du pays avec leurs stats et leur prochain match.
const seasonLabel = (s) => `${s - 1}-${String(s).slice(2)}`;

function Logo({ t }) {
  // eslint-disable-next-line @next/next/no-img-element
  return t?.logo ? <img src={t.logo} alt="" /> : null;
}

export function heading(group, L) {
  return group.key === "fr"
    ? L.t("Les Français en NBA", "French players in the NBA", "Franceses en la NBA", "Franceses na NBA")
    : L.t("Espagnols et Latinos en NBA", "Spanish and Latino NBA players", "Españoles y latinos en la NBA", "Espanhóis e latinos na NBA");
}

function faqOf(group, L, rows, season) {
  const by = [...rows].sort((a, b) => (b.ppg || 0) - (a.ppg || 0));
  const s = seasonLabel(season);
  const list = (rs) => rs.map((r) => `${r.name} (${r.team.short})`).join(", ");
  const tzNote = L.t("heure de Paris", "ET", "hora de España", "horário de Brasília");
  const out = [];
  if (group.key === "fr") {
    out.push({
      q: L.t(`Combien de Français jouent en NBA en ${s} ?`, `How many French players are in the NBA in ${s}?`, `¿Cuántos franceses juegan en la NBA en ${s}?`, `Quantos franceses jogam na NBA em ${s}?`),
      a: L.t(`${rows.length} Français ont joué en NBA cette saison : ${list(rows)}.`, `${rows.length} French players have played in the NBA this season: ${list(rows)}.`, `${rows.length} franceses han jugado en la NBA esta temporada: ${list(rows)}.`, `${rows.length} franceses jogaram na NBA nesta temporada: ${list(rows)}.`),
    });
  } else {
    const es = rows.filter((r) => r.cc === "ES"), lat = rows.filter((r) => r.cc !== "ES");
    out.push({
      q: L.t(`Combien d'Espagnols jouent en NBA en ${s} ?`, `How many Spanish players are in the NBA in ${s}?`, `¿Cuántos españoles juegan en la NBA en ${s}?`, `Quantos espanhóis jogam na NBA em ${s}?`),
      a: L.t(`${es.length} Espagnols ont joué en NBA cette saison : ${list(es)}.`, `${es.length} Spanish players have played in the NBA this season: ${list(es)}.`, `${es.length} españoles han jugado en la NBA esta temporada: ${list(es)}.`, `${es.length} espanhóis jogaram na NBA nesta temporada: ${list(es)}.`),
    });
    if (lat.length) {
      const byC = {};
      for (const r of lat) (byC[r.cc] ||= []).push(r);
      const txt = Object.entries(byC).map(([cc, rs]) => `${countryName(cc, L)} : ${rs.map((r) => r.name).join(", ")}`).join(" ; ");
      const txtEn = Object.entries(byC).map(([cc, rs]) => `${countryName(cc, L)}: ${rs.map((r) => r.name).join(", ")}`).join("; ");
      out.push({
        q: L.t("Quels joueurs latino-américains jouent en NBA ?", "Which Latin American players are in the NBA?", "¿Qué latinos juegan en la NBA?", "Quais latinos jogam na NBA?"),
        a: L.t(`${lat.length} cette saison. ${txt}.`, `${lat.length} this season. ${txtEn}.`, `${lat.length} esta temporada. ${txtEn}.`, `${lat.length} nesta temporada. ${txtEn}.`),
      });
    }
  }
  if (by[0] && by[0].ppg != null) {
    const [a, b] = by;
    out.push({
      q: group.key === "fr"
        ? L.t("Quel Français marque le plus en NBA ?", "Who is the top French scorer in the NBA?", "¿Qué francés anota más en la NBA?", "Qual francês faz mais pontos na NBA?")
        : L.t("Qui marque le plus parmi les Espagnols et Latinos ?", "Who is the top Spanish or Latino scorer?", "¿Quién es el máximo anotador español o latino de la NBA?", "Quem é o maior pontuador espanhol ou latino?"),
      a: L.t(`${a.name} (${a.team.short}) avec ${numOf(a.ppg, L)} points par match${b?.ppg != null ? `, devant ${b.name} (${numOf(b.ppg, L)})` : ""}.`,
        `${a.name} (${a.team.short}) with ${numOf(a.ppg, L)} points per game${b?.ppg != null ? `, ahead of ${b.name} (${numOf(b.ppg, L)})` : ""}.`,
        `${a.name} (${a.team.short}) con ${numOf(a.ppg, L)} puntos por partido${b?.ppg != null ? `, por delante de ${b.name} (${numOf(b.ppg, L)})` : ""}.`,
        `${a.name} (${a.team.short}) com ${numOf(a.ppg, L)} pontos por jogo${b?.ppg != null ? `, à frente de ${b.name} (${numOf(b.ppg, L)})` : ""}.`),
    });
  }
  const star = group.key === "fr" ? rows.find((r) => r.name === "Victor Wembanyama") : by[0];
  if (star?.next) {
    const n = star.next;
    const day = fmtDate(L, n.date, { weekday: "long", day: "numeric", month: "long" });
    const t = fmtTime(L, n.date);
    const p = n.p != null ? pctOf(n.p, L) : null;
    out.push({
      q: L.t(`Quand joue ${star.name} ?`, `When does ${star.name} play next?`, `¿Cuándo juega ${star.name}?`, `Quando joga ${star.name}?`),
      a: L.t(`Prochain match des ${star.team.short} : ${n.isHome ? "contre" : "chez"} les ${n.opp.short}, ${day} à ${t} (${tzNote}).${p ? ` Chances de victoire des ${star.team.short} selon le modèle Basketlog : ${p}.` : ""}`,
        `The ${star.team.short} next play ${n.isHome ? "the" : "at the"} ${n.opp.short} on ${day} at ${t} ${tzNote}.${p ? ` Basketlog gives the ${star.team.short} a ${p} chance to win.` : ""}`,
        `Próximo partido de los ${star.team.short}: ${n.isHome ? "contra" : "en casa de"} los ${n.opp.short}, el ${day} a las ${t} (${tzNote}).${p ? ` Probabilidad de victoria de los ${star.team.short} según Basketlog: ${p}.` : ""}`,
        `Próximo jogo do ${star.team.short}: ${n.isHome ? "contra" : "na casa do"} ${n.opp.short}, ${day} às ${t} (${tzNote}).${p ? ` Chance de vitória do ${star.team.short} segundo o Basketlog: ${p}.` : ""}`),
    });
  }
  out.push(group.key === "fr"
    ? {
      q: L.t("À quelle heure voir les Français en NBA depuis la France ?", "What time are NBA games?", "¿A qué hora se juegan los partidos de la NBA?", "Que horas são os jogos da NBA?"),
      a: L.t("La plupart des matchs NBA commencent entre 1 h et 4 h 30 du matin, heure de Paris. Le week-end et les jours fériés américains, quelques matchs se jouent dès la fin d'après-midi ou en soirée. Sur cette page, les horaires s'affichent à l'heure de votre appareil.", "Most NBA games tip off between 7 and 10:30 p.m. ET; weekend and holiday games can start in the afternoon. Times on this page show in your device's time zone.", "La mayoría de los partidos empiezan entre la 1:00 y las 4:30 de la madrugada en España (entre las 18:00 y las 21:30 en Ciudad de México). En esta página, los horarios aparecen a la hora de tu dispositivo.", "A maioria dos jogos começa entre 21h e 0h30, horário de Brasília. Nesta página, os horários aparecem no fuso do seu aparelho."),
    }
    : {
      q: L.t("À quelle heure jouent-ils ?", "What time do they play?", "¿A qué hora juegan los españoles y latinos en la NBA?", "Que horas eles jogam?"),
      a: L.t("La plupart des matchs NBA commencent entre 1 h et 4 h 30 du matin, heure de Paris. Sur cette page, les horaires s'affichent à l'heure de votre appareil.", "Most NBA games tip off between 7 and 10:30 p.m. ET. Times on this page show in your device's time zone.", "La mayoría de los partidos empiezan entre la 1:00 y las 4:30 de la madrugada en España, entre las 18:00 y las 21:30 en Ciudad de México y entre las 20:00 y las 23:30 en Buenos Aires. En esta página, los horarios aparecen a la hora de tu dispositivo.", "A maioria dos jogos começa entre 21h e 0h30, horário de Brasília. Nesta página, os horários aparecem no fuso do seu aparelho."),
    });
  return out;
}

export default function NationalsView({ group, L, data }) {
  const { rows, tonight, season } = data;
  const s = seasonLabel(season);
  const title = heading(group, L);
  const other = GROUPS[group.key === "fr" ? "es" : "fr"];
  const flags = group.key !== "fr";
  const nameCell = (r) => (
    <Link href={L.href(r.path)}>{flags ? `${FLAGS[r.cc] || ""} ` : ""}{r.name}</Link>
  );
  const injTxt = (r) => (r.injury ? (r.injury.out ? L.t("Absent", "Out", "Baja", "Fora") : L.t("Incertain", "Questionable", "En duda", "Em dúvida")) : null);
  const all = [...rows].sort((a, b) => (b.ppg || 0) - (a.ppg || 0));
  const playingTonight = tonight.reduce((n, g) => n + g.teams.reduce((m, t) => m + t.players.length, 0), 0);
  const faq = faqOf(group, L, rows, season);
  const ld = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  const list = rows.length ? {
    "@context": "https://schema.org", "@type": "ItemList", name: nationalTitle(group, L, s),
    itemListElement: all.map((r, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}${L.href(r.path)}`, name: r.name })),
  } : null;
  return (
    <main className="app-page wide">
      <JsonLd data={ld} />
      <JsonLd data={list} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Pronostics NBA", "NBA predictions", "Pronósticos NBA", "Palpites NBA"), "/app/matchs"], [title, group.path]]} />
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{title} {s}</h1>
        <p>{group.key === "fr"
          ? L.t(`${rows.length} Français ont joué en NBA cette saison. ${playingTonight ? `${playingTonight} jouent cette nuit.` : "Aucun ne joue cette nuit."} Horaires à l'heure de votre appareil, chances de victoire du modèle Basketlog.`, `${rows.length} French players have played in the NBA this season. ${playingTonight ? `${playingTonight} play tonight.` : "None play tonight."} Times in your time zone, win probabilities from the Basketlog model.`, `${rows.length} franceses han jugado en la NBA esta temporada. ${playingTonight ? `${playingTonight} juegan esta noche.` : "Ninguno juega esta noche."} Horarios a tu hora, probabilidades del modelo de Basketlog.`, `${rows.length} franceses jogaram na NBA nesta temporada. ${playingTonight ? `${playingTonight} jogam hoje.` : "Nenhum joga hoje."} Horários no seu fuso, chances do modelo do Basketlog.`)
          : L.t(`${rows.length} Espagnols et Latino-Américains ont joué en NBA cette saison. ${playingTonight ? `${playingTonight} jouent cette nuit.` : "Aucun ne joue cette nuit."} Horaires à l'heure de votre appareil.`, `${rows.length} Spanish and Latin American players have played in the NBA this season. ${playingTonight ? `${playingTonight} play tonight.` : "None play tonight."} Times in your time zone.`, `${rows.length} españoles y latinoamericanos han jugado en la NBA esta temporada. ${playingTonight ? `${playingTonight} juegan esta noche.` : "Ninguno juega esta noche."} Horarios a la hora de tu dispositivo (España, México, Argentina…), con la probabilidad de victoria de su equipo.`, `${rows.length} espanhóis e latino-americanos jogaram na NBA nesta temporada. ${playingTonight ? `${playingTonight} jogam hoje.` : "Nenhum joga hoje."} Horários no seu fuso.`)}</p>
      </div>

      <section className="card block">
      <h2>{L.t("Cette nuit", "Tonight", "Esta noche", "Hoje")}</h2>
      {tonight.length ? (
        <div className="tbl-scroll">
          <table className="std-table">
            <thead><tr><th>{L.t("Heure", "Time", "Hora", "Horário")}</th><th>{L.t("Match", "Game", "Partido", "Jogo")}</th><th>{L.t("Joueurs", "Players", "Jugadores", "Jogadores")}</th><th>{L.t("Victoire de son équipe", "Team win chance", "Victoria de su equipo", "Vitória do time")}</th></tr></thead>
            <tbody>
              {tonight.flatMap((g) => g.teams.map((t, i) => (
                <tr key={`${g.id}-${t.team.id}`}>
                  <td>{i === 0 ? (g.live ? L.t("En direct", "Live", "En directo", "Ao vivo") : <LocalTime iso={g.date} lang={L.lang} />) : ""}</td>
                  <td className="tm"><Link href={L.href(g.path)}><span><Logo t={g.away} />{g.away.short} @ <Logo t={g.home} />{g.home.short}</span></Link></td>
                  <td>{t.players.map((r, k) => (<span key={r.id}>{k > 0 ? ", " : ""}{nameCell(r)}{injTxt(r) ? ` (${injTxt(r)})` : ""}</span>))}</td>
                  <td className={t.p != null && t.p >= 0.5 ? "pos" : ""}>{t.p != null ? `${t.team.short} ${pctOf(t.p, L)}` : "–"}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">{group.key === "fr"
          ? L.t("Aucun Français ne joue cette nuit. Leurs prochains matchs sont dans le tableau ci-dessous.", "No French player is in action tonight. Their next games are below.", "Ningún francés juega esta noche. Sus próximos partidos, abajo.", "Nenhum francês joga hoje. Os próximos jogos estão abaixo.")
          : L.t("Aucun Espagnol ni Latino ne joue cette nuit. Leurs prochains matchs sont ci-dessous.", "No Spanish or Latino player is in action tonight. Their next games are below.", "Ningún español ni latino juega esta noche. Sus próximos partidos, abajo.", "Nenhum espanhol ou latino joga hoje. Os próximos jogos estão abaixo.")}</p>
      )}
      </section>

      <section className="card block">
      <h2>{group.key === "fr" ? L.t(`Tous les Français en NBA (${s})`, `All French NBA players (${s})`, `Todos los franceses de la NBA (${s})`, `Todos os franceses da NBA (${s})`) : L.t(`Tous les Espagnols et Latinos en NBA (${s})`, `All Spanish and Latino NBA players (${s})`, `Todos los españoles y latinos de la NBA (${s})`, `Todos os espanhóis e latinos da NBA (${s})`)}</h2>
      {all.length ? (
        <div className="tbl-scroll">
          <table className="std-table">
            <thead><tr><th>{L.t("Joueur", "Player", "Jugador", "Jogador")}</th>{flags && <th>{L.t("Pays", "Country", "País", "País")}</th>}<th>{L.t("Équipe", "Team", "Equipo", "Time")}</th><th>{L.t("MJ", "GP", "PJ", "J")}</th><th>{L.t("Pts", "PTS", "Pts", "Pts")}</th><th>{L.t("Reb", "REB", "Reb", "Reb")}</th><th>{L.t("Pd", "AST", "Ast", "Ast")}</th><th>{L.t("Prochain match", "Next game", "Próximo partido", "Próximo jogo")}</th></tr></thead>
            <tbody>
              {all.map((r) => (
                <tr key={r.id}>
                  <td>{nameCell(r)}{injTxt(r) ? ` · ${injTxt(r)}` : null}</td>
                  {flags && <td>{countryName(r.cc, L)}</td>}
                  <td className="tm"><Link href={L.href(`/app/equipe/${r.team.id}`)}><span><Logo t={r.team} />{r.team.short}</span></Link></td>
                  <td>{r.gp}</td>
                  <td>{numOf(r.ppg, L)}</td>
                  <td>{numOf(r.reb, L)}</td>
                  <td>{numOf(r.ast, L)}</td>
                  <td>{r.next ? (
                    <Link href={L.href(r.next.path)}>
                      {r.next.isHome ? L.t("vs", "vs", "vs", "x") : "@"} {r.next.opp.short} · <LocalTime iso={r.next.date} lang={L.lang} day />{r.next.p != null ? ` · ${pctOf(r.next.p, L)}` : ""}
                    </Link>
                  ) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">{L.t("Les statistiques des joueurs ne sont pas disponibles pour le moment.", "Player stats aren't available right now.", "Las estadísticas de los jugadores no están disponibles ahora.", "As estatísticas dos jogadores não estão disponíveis agora.")}</p>
      )}
      </section>

      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t("L'essentiel", "Quick answers", "Lo esencial", "O essencial")}</h2>
          {faq.map((f) => (<div key={f.q} className="mfaq-item"><h3>{f.q}</h3><p>{f.a}</p></div>))}
          <p className="mfaq-more">
            <Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA de ce soir →", "Tonight's NBA predictions →", "Pronósticos NBA de hoy →", "Palpites NBA de hoje →")}</Link>{" · "}
            <Link href={L.href("/app/blessures")}>{L.t("Blessés du jour →", "Injury report →", "Lesionados de hoy →", "Lesionados de hoje →")}</Link>{" · "}
            <Link href={L.href("/app/power-rankings")}>{L.t("Power ranking →", "Power rankings →", "Power ranking →", "Power ranking →")}</Link>{" · "}
            <Link href={L.href(other.path)}>{heading(other, L)} →</Link>
          </p>
        </section>
      )}
      <p className="disclaimer">{L.t("Probabilités estimées par le modèle statistique Basketlog, jamais une certitude. Statistiques de la saison régulière (ESPN), mises à jour chaque jour.", "Probabilities from the Basketlog statistical model, never a certainty. Regular-season stats (ESPN), updated daily.", "Probabilidades estimadas por el modelo estadístico de Basketlog, nunca una certeza. Estadísticas de temporada regular (ESPN), actualizadas cada día.", "Probabilidades estimadas pelo modelo estatístico do Basketlog, nunca uma certeza. Estatísticas da temporada regular (ESPN), atualizadas todo dia.")}</p>
      <PrefSource L={L} />
    </main>
  );
}
