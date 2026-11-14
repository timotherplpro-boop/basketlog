import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";
import { SITE } from "../../lib/site";
import { WIDGET_HEIGHT, embedCode } from "../../lib/widget";
import CopyCode from "../../components/CopyCode";

// Page « Widget » : aperçu et code à copier pour les sites et blogs basket qui veulent afficher les probabilités NBA du soir.
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Widget gratuit : probabilités NBA du soir pour votre site – Basketlog", "Free widget: tonight's NBA win probabilities for your website – Basketlog", "Widget gratis: probabilidades NBA de hoy para tu web – Basketlog"),
    description: L.t(
      "Affichez gratuitement sur votre site ou blog les probabilités de victoire de chaque match NBA du soir, mises à jour automatiquement. Un copier-coller suffit.",
      "Show the win probability of every NBA game tonight on your website or blog, for free and updated automatically. Just copy and paste.",
      "Muestra gratis en tu web o blog la probabilidad de victoria de cada partido de la NBA de hoy, actualizada automáticamente. Basta con copiar y pegar."
    ),
    path: "/widget",
    L,
  });
}

export default async function WidgetPage() {
  const L = await getL();
  const lang = L.en ? "en" : L.es ? "es" : "fr";
  const variants = [
    ["auto", L.t("Thème automatique (clair ou sombre selon le visiteur)", "Automatic theme (light or dark, following the visitor)", "Tema automático (claro u oscuro según el visitante)")],
    ["light", L.t("Toujours clair", "Always light", "Siempre claro")],
    ["dark", L.t("Toujours sombre", "Always dark", "Siempre oscuro")],
  ];
  const copy = L.t("Copier le code", "Copy code", "Copiar código");
  const done = L.t("Copié !", "Copied!", "¡Copiado!");
  return (
    <main className="app-page prose-page">
      <div className="app-head">
        <h1>{L.t("Widget gratuit : les probabilités NBA du soir sur votre site", "Free widget: tonight's NBA win probabilities on your site", "Widget gratis: las probabilidades NBA de hoy en tu web")}</h1>
        <p>{L.t(
          "Chaque match NBA du jour avec la probabilité de victoire de chaque équipe, mise à jour automatiquement. Gratuit, sans inscription, sans publicité.",
          "Every NBA game of the day with each team's win probability, updated automatically. Free, no sign-up, no ads.",
          "Cada partido de la NBA del día con la probabilidad de victoria de cada equipo, actualizada automáticamente. Gratis, sin registro y sin publicidad."
        )}</p>
      </div>

      <div className="card block">
        <h2>{L.t("Aperçu", "Preview", "Vista previa")}</h2>
        <iframe src={`/api/widget?lang=${lang}`} title={L.t("Aperçu du widget", "Widget preview", "Vista previa del widget")} width="100%" height={WIDGET_HEIGHT} style={{ border: 0, maxWidth: 420 }} loading="lazy" />
      </div>

      <div className="card block">
        <h2>{L.t("Le code à coller", "The code to paste", "El código para pegar")}</h2>
        <p className="narr">{L.t(
          "Collez ce code dans un bloc HTML de votre page (WordPress : bloc « HTML personnalisé »). Le widget prend la largeur disponible, jusqu'à 420 pixels.",
          "Paste this code into an HTML block on your page (WordPress: “Custom HTML” block). The widget fills the available width, up to 420 pixels.",
          "Pega este código en un bloque HTML de tu página (WordPress: bloque «HTML personalizado»). El widget ocupa el ancho disponible, hasta 420 píxeles."
        )}</p>
        {variants.map(([theme, label]) => (
          <div key={theme}>
            <h3>{label}</h3>
            <CopyCode code={embedCode(SITE, lang, theme)} label={copy} done={done} />
          </div>
        ))}
        <p className="narr">{L.t(
          "Autres langues : remplacez lang=fr par lang=en (anglais) ou lang=es (espagnol) dans l'adresse.",
          "Other languages: replace lang=en with lang=fr (French) or lang=es (Spanish) in the address.",
          "Otros idiomas: cambia lang=es por lang=en (inglés) o lang=fr (francés) en la dirección."
        )}</p>
      </div>

      <div className="card block">
        <h2>{L.t("Bon à savoir", "Good to know", "Para saber")}</h2>
        <ul className="narr">
          <li>{L.t("Les probabilités viennent du modèle statistique de Basketlog, dont les résultats sont publics.", "Probabilities come from Basketlog's statistical model, whose results are public.", "Las probabilidades vienen del modelo estadístico de Basketlog, cuyos resultados son públicos.")}</li>
          <li>{L.t("Quand tous les matchs du jour sont finis, le widget montre ceux du lendemain.", "Once all of today's games are over, the widget shows tomorrow's.", "Cuando terminan todos los partidos del día, el widget muestra los del día siguiente.")}</li>
          <li>{L.t("Aucun cookie et aucun outil de mesure d'audience dans le widget.", "No cookies and no analytics inside the widget.", "Sin cookies ni herramientas de analítica dentro del widget.")}</li>
        </ul>
      </div>
    </main>
  );
}
