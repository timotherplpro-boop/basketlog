import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";
import { SITE } from "../../lib/site";
import { WIDGET_HEIGHT, embedCode } from "../../lib/widget";
import CopyCode from "../../components/CopyCode";
import TeamWidgetPicker from "../../components/TeamWidgetPicker";
import { TEAMS } from "../../lib/teams";

// Page « Widget » : aperçu et code à copier pour les sites et blogs basket qui veulent afficher les probabilités NBA du soir.
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Widget gratuit : probabilités NBA du soir pour votre site – Basketlog", "Free widget: tonight's NBA win probabilities for your website – Basketlog", "Widget gratis: probabilidades NBA de hoy para tu web – Basketlog", "Widget grátis: probabilidades NBA de hoje para o seu site – Basketlog"),
    description: L.t(
      "Affichez gratuitement sur votre site ou blog les probabilités de victoire de chaque match NBA du soir, mises à jour automatiquement. Un copier-coller suffit.",
      "Show the win probability of every NBA game tonight on your website or blog, for free and updated automatically. Just copy and paste.",
      "Muestra gratis en tu web o blog la probabilidad de victoria de cada partido de la NBA de hoy, actualizada automáticamente. Basta con copiar y pegar.", "Mostre grátis no seu site ou blog a probabilidade de vitória de cada jogo da NBA de hoje, atualizada automaticamente. Basta copiar e colar."
    ),
    path: "/widget",
    L,
  });
}

export default async function WidgetPage() {
  const L = await getL();
  const lang = L.en ? "en" : L.es ? "es" : L.pt ? "pt" : "fr";
  const variants = [
    ["auto", L.t("Thème automatique (clair ou sombre selon le visiteur)", "Automatic theme (light or dark, following the visitor)", "Tema automático (claro u oscuro según el visitante)", "Tema automático (claro ou escuro conforme o visitante)")],
    ["light", L.t("Toujours clair", "Always light", "Siempre claro", "Sempre claro")],
    ["dark", L.t("Toujours sombre", "Always dark", "Siempre oscuro", "Sempre escuro")],
  ];
  const copy = L.t("Copier le code", "Copy code", "Copiar código", "Copiar código");
  const done = L.t("Copié !", "Copied!", "¡Copiado!", "Copiado!");
  return (
    <main className="app-page prose-page">
      <div className="app-head">
        <h1>{L.t("Widget gratuit : les probabilités NBA du soir sur votre site", "Free widget: tonight's NBA win probabilities on your site", "Widget gratis: las probabilidades NBA de hoy en tu web", "Widget grátis: as probabilidades NBA de hoje no seu site")}</h1>
        <p>{L.t(
          "Chaque match NBA du jour avec la probabilité de victoire de chaque équipe, mise à jour automatiquement. Gratuit, sans inscription, sans publicité.",
          "Every NBA game of the day with each team's win probability, updated automatically. Free, no sign-up, no ads.",
          "Cada partido de la NBA del día con la probabilidad de victoria de cada equipo, actualizada automáticamente. Gratis, sin registro y sin publicidad.", "Cada jogo da NBA do dia com a probabilidade de vitória de cada time, atualizada automaticamente. Grátis, sem cadastro e sem publicidade."
        )}</p>
      </div>

      <div className="card block">
        <h2>{L.t("Aperçu", "Preview", "Vista previa", "Prévia")}</h2>
        <iframe src={`/api/widget?lang=${lang}`} title={L.t("Aperçu du widget", "Widget preview", "Vista previa del widget", "Prévia do widget")} width="100%" height={WIDGET_HEIGHT} style={{ border: 0, maxWidth: 420 }} loading="lazy" />
      </div>

      <div className="card block">
        <h2>{L.t("Le code à coller", "The code to paste", "El código para pegar", "O código para colar")}</h2>
        <p className="narr">{L.t(
          "Collez ce code dans un bloc HTML de votre page (WordPress : bloc « HTML personnalisé »). Le widget prend la largeur disponible, jusqu'à 420 pixels.",
          "Paste this code into an HTML block on your page (WordPress: “Custom HTML” block). The widget fills the available width, up to 420 pixels.",
          "Pega este código en un bloque HTML de tu página (WordPress: bloque «HTML personalizado»). El widget ocupa el ancho disponible, hasta 420 píxeles.", "Cole este código em um bloco HTML da sua página (WordPress: bloco «HTML personalizado»). O widget ocupa a largura disponível, até 420 pixels."
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
          "Otros idiomas: cambia lang=es por lang=en (inglés) o lang=fr (francés) en la dirección.", "Outros idiomas: troque lang=pt por lang=en (inglês), lang=es (espanhol) ou lang=fr (francês) no endereço."
        )}</p>
      </div>

      <div className="card block" id="equipe">
        <h2>{L.t("Widget d'une équipe : ses prochains matchs", "Team widget: your team's next games", "Widget de un equipo: sus próximos partidos", "Widget de um time: os próximos jogos")}</h2>
        <p className="narr">{L.t(
          "Pour un blog consacré à une équipe : ses 5 prochains matchs avec sa probabilité de victoire, mis à jour automatiquement. Choisissez l'équipe, puis copiez le code.",
          "For a blog about one team: its next 5 games with its win probability, updated automatically. Pick the team, then copy the code.",
          "Para un blog dedicado a un equipo: sus 5 próximos partidos con su probabilidad de victoria, actualizados automáticamente. Elige el equipo y copia el código.",
          "Para um blog dedicado a um time: os 5 próximos jogos com a chance de vitória, atualizados automaticamente. Escolha o time e copie o código."
        )}</p>
        <TeamWidgetPicker
          teams={[...TEAMS].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ id: t.id, short: t.short, name: t.name }))}
          site={SITE}
          lang={lang}
          label={L.t("Équipe :", "Team:", "Equipo:", "Time:")}
          copy={copy}
          done={done}
          preview={L.t("Aperçu du widget d'équipe", "Team widget preview", "Vista previa del widget de equipo", "Prévia do widget de time")}
        />
      </div>

      <div className="card block">
        <h2>{L.t("Bon à savoir", "Good to know", "Para saber", "Bom saber")}</h2>
        <ul className="narr">
          <li>{L.t("Les probabilités viennent du modèle statistique de Basketlog, dont les résultats sont publics.", "Probabilities come from Basketlog's statistical model, whose results are public.", "Las probabilidades vienen del modelo estadístico de Basketlog, cuyos resultados son públicos.", "As probabilidades vêm do modelo estatístico do Basketlog, cujos resultados são públicos.")}</li>
          <li>{L.t("Quand tous les matchs du jour sont finis, le widget montre ceux du lendemain.", "Once all of today's games are over, the widget shows tomorrow's.", "Cuando terminan todos los partidos del día, el widget muestra los del día siguiente.", "Quando todos os jogos do dia terminam, o widget mostra os do dia seguinte.")}</li>
          <li>{L.t("Aucun cookie et aucun outil de mesure d'audience dans le widget.", "No cookies and no analytics inside the widget.", "Sin cookies ni herramientas de analítica dentro del widget.", "Sem cookies nem ferramentas de análise dentro do widget.")}</li>
        </ul>
      </div>
    </main>
  );
}
