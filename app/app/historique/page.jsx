import Link from "next/link";
import AuthButton from "../../../components/AuthButton";
import AppTabs from "../../../components/AppTabs";
import HistoryList from "../../../components/HistoryList";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { memberSession, getHistory } from "../../../lib/usage";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Historique de tes analyses – Basketlog", "Your analysis history – Basketlog", "Historial de tus análisis – Basketlog", "Histórico das suas análises – Basketlog"),
    description: L.t("Les analyses de matchs que tu as lancées sur Basketlog.", "The game analyses you have run on Basketlog.", "Los análisis de partidos que has realizado en Basketlog.", "As análises de jogos que você fez no Basketlog."),
    path: "/app/historique",
    noindex: true,
    L,
  });
}

export default async function HistoriquePage() {
  const L = await getL();
  const m = await memberSession();
  const list = m ? await getHistory(m.uid) : null;

  return (
    <main className="app-page">
      <AppTabs />
      <div className="app-head">
        <h1>{L.t("Historique", "History", "Historial", "Histórico")}</h1>
        <p>{L.t("Les analyses complètes que tu as lancées", "The full analyses you have run", "Los análisis completos que has realizado", "As análises completas que você fez")}</p>
        <p className="note">{L.t("Liées à ton compte : tu les retrouves sur tous tes appareils.", "Linked to your account: you'll find them on all your devices.", "Vinculados a tu cuenta: los encontrarás en todos tus dispositivos.", "Vinculadas à sua conta: você as encontra em todos os seus dispositivos.")}</p>
      </div>
      {!m ? (
        <div className="panel hist-empty">
          <b>{L.t("Connecte-toi pour retrouver tes analyses", "Log in to find your analyses", "Inicia sesión para encontrar tus análisis", "Faça login para encontrar suas análises")}</b>
          <p>{L.t("Les analyses complètes que tu lances (1 offerte avec le compte gratuit, illimitées avec Pro ou Lifetime) s'affichent ici, sur tous tes appareils.", "The full analyses you run (1 free with a free account, unlimited with Pro or Lifetime) show up here, on all your devices.", "Los análisis completos que lanzas (1 de regalo con la cuenta gratis, ilimitados con Pro o Lifetime) aparecen aquí, en todos tus dispositivos.", "As análises completas que você abre (1 de presente com a conta grátis, ilimitadas com Pro ou Lifetime) aparecem aqui, em todos os seus dispositivos.")}</p>
          <Link href={L.href("/pro")} className="btn-solid">{L.t("Voir les formules", "See the plans", "Ver los planes", "Ver os planos")}</Link>
          <AuthButton mode="connexion" source="historique" next={L.href("/app/historique")} className="comp-more">{L.t("Déjà un compte ? Se connecter", "Already have an account? Log in", "¿Ya tienes cuenta? Inicia sesión", "Já tem conta? Entre")} →</AuthButton>
        </div>
      ) : list === null ? (
        <div className="panel hist-empty"><p>{L.t("Historique momentanément indisponible. Réessaie dans quelques minutes.", "History temporarily unavailable. Please try again in a few minutes.", "Historial no disponible por el momento. Vuelve a intentarlo en unos minutos.", "Histórico indisponível no momento. Tente novamente em alguns minutos.")}</p></div>
      ) : !list.length && m.tier === "compte" ? (
        <div className="panel hist-empty">
          <b>{L.t("Aucune analyse complète pour l'instant", "No full analyses yet", "Todavía no hay análisis completos", "Ainda não há análises completas")}</b>
          <p>{L.t("Ton compte gratuit inclut 1 analyse complète offerte : lance-la sur le match de ton choix, elle s'affichera ici. Avec Pro ou Lifetime, elles sont illimitées.", "Your free account includes 1 free full analysis: run it on any game you like and it will show up here. With Pro or Lifetime, they're unlimited.", "Tu cuenta gratis incluye 1 análisis completo de regalo: lánzalo en el partido que quieras y aparecerá aquí. Con Pro o Lifetime, son ilimitados.", "Sua conta grátis inclui 1 análise completa de presente: abra no jogo que quiser e ela aparecerá aqui. Com Pro ou Lifetime, são ilimitadas.")}</p>
          <Link href={L.href("/app/matchs")} className="btn-solid">🎁 {L.t("Choisir mon match", "Pick my game", "Elegir mi partido", "Escolher meu jogo")}</Link>
          <Link href={L.href("/pro")} className="comp-more">{L.t("Voir les formules", "See the plans", "Ver los planes", "Ver os planos")} →</Link>
        </div>
      ) : !list.length ? (
        <div className="panel hist-empty">
          <b>{L.t("Aucune analyse pour l'instant", "No analyses yet", "Todavía no hay análisis", "Ainda não há análises")}</b>
          <p>{L.t("Lance l'analyse complète d'un match : elle apparaîtra ici pour que tu la retrouves facilement.", "Run a game's full analysis: it will show up here so you can find it again easily.", "Lanza el análisis completo de un partido: aparecerá aquí para que lo encuentres fácilmente.", "Abra a análise completa de um jogo: ela aparecerá aqui para você encontrá-la facilmente.")}</p>
          <Link href={L.href("/app")} className="btn-solid">{L.t("Analyser un match", "Analyze a game", "Analizar un partido", "Analisar um jogo")}</Link>
          <Link href={L.href("/app/matchs")} className="comp-more">{L.t("Voir les matchs du jour", "See today's games", "Ver los partidos de hoy", "Ver os jogos de hoje")} →</Link>
        </div>
      ) : (
        <HistoryList list={list} L={L} />
      )}
    </main>
  );
}
