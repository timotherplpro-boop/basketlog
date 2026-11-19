// Page des formules : un vrai exemple d'analyse complète (match NBA à venir, calcul d'avant-match du modèle),
// pour que le visiteur voie ce qu'il achète. Aucun appel à l'IA (pas de coût) : seulement le modèle.
import { analyzeDay } from "../lib/data";
import { nbaToday, shiftDate } from "../lib/espn";
import AnalysisResult from "./AnalysisResult";

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
  return (
    <section className="pro-sample" id="exemple">
      <div className="pill-tag">{L.t("Exemple réel", "Real example", "Ejemplo real", "Exemplo real")}</div>
      <h2 className="t-80" style={{ fontSize: "clamp(28px,4vw,40px)" }}>{L.t("Voici ce que tu débloques", "Here's what you unlock", "Esto es lo que desbloqueas", "Veja o que você desbloqueia")}</h2>
      <p className="lead">{L.t(
        "L'analyse complète d'un vrai match à venir, telle que la voient les abonnés Pro. Rien n'est caché : elle est offerte ici pour ce seul match.",
        "The full analysis of a real upcoming game, exactly as Pro members see it. Nothing hidden: it's free here for this one game.",
        "El análisis completo de un partido real que se jugará pronto, tal como lo ven los suscriptores Pro. Sin nada oculto: aquí es gratis solo para este partido.",
        "A análise completa de um jogo real que vai acontecer, como os assinantes Pro a veem. Sem nada escondido: aqui ela é grátis só para este jogo."
      )}</p>

      <div className="ps-card">
        <AnalysisResult a={a} L={L} mode="analyzer" preview />
        <div className="ps-cta">
          <a href="#plans" className="btn-solid">🔓 {L.t("Débloquer tous les matchs", "Unlock every game", "Desbloquear todos los partidos", "Desbloquear todos os jogos")}</a>
        </div>
      </div>
    </section>
  );
}

