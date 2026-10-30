import AppTabs from "../../../components/AppTabs";
import HistoryList from "../../../components/HistoryList";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Historique de tes analyses – Basketlog", "Your analysis history – Basketlog", "Historial de tus análisis – Basketlog"),
    description: L.t("Les analyses de matchs que tu as consultées sur Basketlog.", "The game analyses you have viewed on Basketlog.", "Los análisis de partidos que has consultado en Basketlog."),
    path: "/app/historique",
    noindex: true,
    L,
  });
}

export default async function HistoriquePage() {
  const L = await getL();
  return (
    <main className="app-page">
      <AppTabs />
      <div className="app-head">
        <h1>{L.t("Historique", "History", "Historial")}</h1>
        <p>{L.t("Les analyses complètes que tu as consultées", "The full analyses you have viewed", "Los análisis completos que has consultado")}</p>
        <p className="note">{L.t("Gardé uniquement dans ce navigateur, jamais envoyé à nos serveurs.", "Kept only in this browser, never sent to our servers.", "Guardado solo en este navegador, nunca se envía a nuestros servidores.")}</p>
      </div>
      <HistoryList />
    </main>
  );
}
