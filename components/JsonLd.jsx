// Données structurées schema.org, lues par Google et les moteurs de recherche IA.
export default function JsonLd({ data }) {
  if (!data) return null;
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
