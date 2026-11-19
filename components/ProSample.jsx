// Page des formules : un vrai exemple d'analyse complète (match NBA à venir, calcul d'avant-match du modèle),
// pour que le visiteur voie ce qu'il achète. Aucun appel à l'IA (pas de coût) : seulement le modèle.
import { analyzeDay } from "../lib/data";
import { nbaToday, shiftDate } from "../lib/espn";
import { factorText, scenarioText, confText } from "../lib/matchtext";
import { fmt } from "../lib/model";
import { fmtDate } from "../lib/i18n";
import { TeamLogo } from "./ui";

const pctL = (p, L, d = 0) => `${(p * 100).toFixed(d).replace(".", L.en ? "." : ",")}${L.en ? "%" : " %"}`;
const num = (v, L, d = 1) => v.toFixed(d).replace(".", L.en ? "." : ",");
const sgn = (v, L) => (L.en ? fmt(v) : fmt(v).replace(".", ","));

const within = (p, ms) => Promise.race([Promise.resolve(p).catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);

// Match d'exemple : le prochain match pas encore commencé (aujourd'hui, sinon demain), celui où le modèle est le plus affirmé
// (confiance la plus haute), pour que l'exemple soit parlant.
async function sampleGame() {
  const today = nbaToday();
  for (const d of [today, shiftDate(today, 1)]) {
    const r = await within(analyzeDay(d), 4500);
    const list = (r?.analyses || []).filter((a) => a?.game?.state === "pre" && !a.game.hypothetical && a.factors?.length);
    if (list.length) return list.sort((x, y) => Math.abs(y.margin) - Math.abs(x.margin))[0];
  }
  return null;
}

export default async function ProSample({ L }) {
  const a = await sampleGame();
  if (!a) return null;
  const g = a.game, h = a.home, aw = a.away;
  const when = g.date ? fmtDate(L, g.date, { weekday: "long", day: "numeric", month: "long", hour: L.en ? "numeric" : "2-digit", minute: "2-digit" }) : null;
  const scen = (a.allScenarios || a.scenarios || []).slice(0, 5);
  const inj = [aw, h].map((s) => ({ t: s.team, l: [...(s.inj?.out || []), ...(s.inj?.doubtful || [])].slice(0, 3) }));

  return (
    <section className="pro-sample" id="exemple">
      <div className="pill-tag">{L.t("Exemple réel", "Real example", "Ejemplo real", "Exemplo real")}</div>
      <h2 className="t-80" style={{ fontSize: "clamp(28px,4vw,40px)" }}>{L.t("Voici ce que tu débloques", "Here's what you unlock", "Esto es lo que desbloqueas", "Veja o que você desbloqueia")}</h2>
      <p className="lead">{L.t(
        "L'analyse complète d'un vrai match à venir, telle que la voient les abonnés Pro. Elle est offerte ici pour ce seul match.",
        "The full analysis of a real upcoming game, exactly as Pro members see it. It's free here for this one game.",
        "El análisis completo de un partido real que se jugará pronto, tal como lo ven los suscriptores Pro. Aquí es gratis solo para este partido.",
        "A análise completa de um jogo real que vai acontecer, como os assinantes Pro a veem. Aqui ela é grátis só para este jogo."
      )}</p>

      <div className="ps-card">
        <div className="ps-head">
          <TeamLogo team={g.away} size={36} />
          <b>{g.away.name} <em>@</em> {g.home.name}</b>
          <TeamLogo team={g.home} size={36} />
        </div>
        {when && <small className="ps-when">📅 {when}</small>}

        <div className="ar-sec">
          <h3>📈 {L.t("Probabilités exactes", "Exact probabilities", "Probabilidades exactas", "Probabilidades exatas")}</h3>
          <div className="ar-box ar-probs">
            <div><span>{L.t("Victoire", "Win", "Victoria", "Vitória")} {g.away.short}</span><b>{pctL(a.pAway, L, 1)}</b></div>
            <div><span>{L.t("Victoire", "Win", "Victoria", "Vitória")} {g.home.short}</span><b>{pctL(a.pHome, L, 1)}</b></div>
            <div><span>{L.t("Score projeté", "Projected score", "Marcador proyectado", "Placar projetado")}</span><b>{g.away.abbr} {Math.round(a.awayPts)} - {Math.round(a.homePts)} {g.home.abbr}</b></div>
            <div><span>{L.t("Total projeté", "Projected total", "Total proyectado", "Total projetado")}</span><b>{Math.round(a.total)} pts</b></div>
          </div>
        </div>

        <div className="grid2">
          <div className="card block">
            <h2>⚖️ {L.t("Ce qui fait pencher la balance", "What tips the balance", "Lo que inclina la balanza", "O que faz a balança pender")}</h2>
            <div className="team-rec" style={{ marginBottom: 6 }}>{L.t("En points, positif = avantage", "In points, positive = edge", "En puntos, positivo = ventaja", "Em pontos, positivo = vantagem")} {g.home.short}</div>
            {a.factors.map((f) => { const ft = factorText(f, a, L); return (
              <div className="factor" key={f.label}><div>{ft.label}<small>{ft.detail}</small></div><div className="v mono"><span className={f.value > 0.05 ? "pos" : f.value < -0.05 ? "neg" : ""}>{sgn(f.value, L)}</span></div></div>
            ); })}
          </div>
          <div className="card block">
            <h2>🎲 {L.t("Les scénarios", "The scenarios", "Los escenarios", "Os cenários")}</h2>
            <div className="scen">
              {scen.map((s) => (
                <div className="scen-row" key={s.label}>
                  <div>{scenarioText(s, a, L)}<div className="scen-bar"><div style={{ width: `${Math.round(s.p * 100)}%` }} /></div></div>
                  <div className="mono" style={{ textAlign: "right", fontWeight: 700 }}>{pctL(s.p, L)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid2">
          {inj.map(({ t, l }) => (
            <div className="card block" key={t.id}>
              <h2><TeamLogo team={t} size={22} /> {L.t("Infirmerie", "Injury report", "Parte médico", "Boletim médico")} {t.short}</h2>
              {l.length === 0
                ? <div className="team-rec">{L.t("Aucune absence signalée.", "No injuries reported.", "No hay bajas comunicadas.", "Nenhum desfalque informado.")}</div>
                : <div className="inj">{l.map((i) => <div className="inj-row" key={i.player}><span>{i.player}</span><span className="team-rec">{i.ppg != null ? `${num(i.ppg, L)} ${L.t("pts", "ppg", "pts", "pts")}` : i.pos}</span></div>)}</div>}
            </div>
          ))}
        </div>

        <p className="ps-more">🎯 {L.t("Confiance du modèle :", "Model confidence:", "Confianza del modelo:", "Confiança do modelo:")} <b>{confText(a.confidence, L)}</b></p>
        <p className="ps-more">{L.t(
          "Avec Pro, tu as aussi l'argumentation du modèle, les stats comparées, les joueurs à suivre et les actualités en temps réel, sur tous les matchs, chaque soir.",
          "With Pro you also get the model's reasoning, the stat comparison, players to watch and real-time news, on every game, every night.",
          "Con Pro también tienes la argumentación del modelo, las estadísticas comparadas, los jugadores a seguir y las noticias en tiempo real, en todos los partidos, cada noche.",
          "Com o Pro você também tem a argumentação do modelo, as estatísticas comparadas, os jogadores para acompanhar e as notícias em tempo real, em todos os jogos, todas as noites."
        )}</p>
        <a href="#plans" className="btn-solid">🔓 {L.t("Débloquer tous les matchs", "Unlock every game", "Desbloquear todos los partidos", "Desbloquear todos os jogos")}</a>
      </div>
    </section>
  );
}

