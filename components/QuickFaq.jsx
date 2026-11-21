import JsonLd from "./JsonLd";

// Bloc « questions fréquentes » des pages de données, avec le balisage FAQPage (réponses directes dans Google).
export default function QuickFaq({ L, items, title }) {
  const list = (items || []).filter((x) => x && x.q && x.a);
  if (!list.length) return null;
  return (
    <section className="card block match-faq">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: list.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }} />
      <h2>{title || L.t("Questions fréquentes", "FAQ", "Preguntas frecuentes", "Perguntas frequentes")}</h2>
      {list.map((x) => <div key={x.q} className="mfaq-item"><h3>{x.q}</h3><p>{x.a}</p></div>)}
    </section>
  );
}
