import Link from "next/link";
import AppTabs from "../../../components/AppTabs";
import HistoryList from "../../../components/HistoryList";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { memberSession, getHistory } from "../../../lib/usage";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Historique de tes analyses – Basketlog", "Your analysis history – Basketlog", "Historial de tus análisis – Basketlog"),
    description: L.t("Les analyses de matchs que tu as lancées sur Basketlog.", "The game analyses you have run on Basketlog.", "Los análisis de partidos que has realizado en Basketlog."),
    path: "/app/historique",
    noindex: true,
    L,
  });
}

export default async function HistoriquePage() {
  const L = await getL();
  const m = await memberSession();
  const list = m ? await getHistory(m.uid) : null;
  const next = encodeURIComponent(L.href("/app/historique"));

  return (
    <main className="app-page">
      <AppTabs />
      <div className="app-head">
        <h1>{L.t("Historique", "History", "Historial")}</h1>
        <p>{L.t("Les analyses complètes que tu as lancées", "The full analyses you have run", "Los análisis completos que has realizado")}</p>
        <p className="note">{L.t("Liées à ton compte : tu les retrouves sur tous tes appareils.", "Linked to your account: you'll find them on all your devices.", "Vinculados a tu cuenta: los encontrarás en todos tus dispositivos.")}</p>
      </div>
      {!m ? (
        <div className="panel hist-empty">
          <b>{L.t("Connecte-toi pour retrouver tes analyses", "Log in to find your analyses", "Inicia sesión para encontrar tus análisis")}</b>
          <p>{L.t("Avec un compte gratuit, tu lances 1 analyse complète par jour et tu la retrouves ici.", "With a free account, you run 1 full analysis a day and find it here.", "Con una cuenta gratis, lanzas 1 análisis completo al día y lo encuentras aquí.")}</p>
          <a href={`/api/whop/signup?next=${next}`} className="btn-solid">{L.t("Créer mon compte gratuit", "Create my free account", "Crear mi cuenta gratis")}</a>
          <a href={`/api/whop/login?next=${next}`} className="comp-more">{L.t("Déjà un compte ? Se connecter", "Already have an account? Log in", "¿Ya tienes cuenta? Inicia sesión")} →</a>
        </div>
      ) : list === null ? (
        <div className="panel hist-empty"><p>{L.t("Historique momentanément indisponible. Réessaie dans quelques minutes.", "History temporarily unavailable. Please try again in a few minutes.", "Historial no disponible por el momento. Vuelve a intentarlo en unos minutos.")}</p></div>
      ) : !list.length ? (
        <div className="panel hist-empty">
          <b>{L.t("Aucune analyse pour l'instant", "No analyses yet", "Todavía no hay análisis")}</b>
          <p>{L.t("Lance l'analyse complète d'un match : elle apparaîtra ici pour que tu la retrouves facilement.", "Run a game's full analysis: it will show up here so you can find it again easily.", "Lanza el análisis completo de un partido: aparecerá aquí para que lo encuentres fácilmente.")}</p>
          <Link href={L.href("/app")} className="btn-solid">{L.t("Analyser un match", "Analyze a game", "Analizar un partido")}</Link>
          <Link href={L.href("/app/matchs")} className="comp-more">{L.t("Voir les matchs du jour", "See today's games", "Ver los partidos de hoy")} →</Link>
        </div>
      ) : (
        <HistoryList list={list} L={L} />
      )}
    </main>
  );
}
