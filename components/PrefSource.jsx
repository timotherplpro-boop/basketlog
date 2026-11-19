// Lien Google « sources préférées » : un lecteur qui ajoute Basketlog voit ses articles en priorité dans les
// « À la une » de Google (https://developers.google.com/search/docs/appearance/preferred-sources). Lien simple, sans script.
export default function PrefSource({ L }) {
  return (
    <p className="pref-src">
      <span>{L.t("Tu veux voir Basketlog en priorité sur Google ?", "Want to see Basketlog first on Google?", "¿Quieres ver Basketlog primero en Google?", "Quer ver o Basketlog primeiro no Google?")}</span>
      <a href="https://www.google.com/preferences/source?q=basketlog-app.com" target="_blank" rel="noopener">
        {L.t("Ajouter Basketlog à mes sources Google →", "Add Basketlog as a preferred source on Google →", "Añadir Basketlog a mis fuentes de Google →", "Adicionar o Basketlog às minhas fontes do Google →")}
      </a>
    </p>
  );
}
