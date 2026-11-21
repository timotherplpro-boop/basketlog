"use client";
import { useState } from "react";
import { mk } from "../lib/i18n";

// « Citer cette page » : lien HTML prêt à copier, pour que blogs, forums et journalistes reprennent nos chiffres
// avec un lien vers la source (les liens d'autres sites sont ce qui fait le plus monter une page dans Google).
export default function CiteBox({ url, title, lang = "fr" }) {
  const L = mk(lang);
  const safe = String(title).replace(/[<>"]/g, "");
  const code = `<a href="${url}">${safe}</a> (Basketlog)`;
  const [done, setDone] = useState(false);
  const copy = async (e) => {
    const box = e.currentTarget.closest(".cite-box")?.querySelector("textarea");
    try {
      await navigator.clipboard.writeText(code);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch {
      box?.focus();
      box?.select();
    }
  };
  return (
    <details className="card block cite-box">
      <summary>{L.t("Citer cette page", "Cite this page", "Citar esta página", "Citar esta página")}</summary>
      <p className="note">{L.t(
        "Tu peux reprendre ces chiffres librement sur ton site, ton blog ou un forum, avec un lien vers la source :",
        "Feel free to use these numbers on your site, blog or forum, with a link back to the source:",
        "Puedes usar estas cifras libremente en tu web, blog o foro, con un enlace a la fuente:",
        "Você pode usar esses números livremente no seu site, blog ou fórum, com um link para a fonte:"
      )}</p>
      <textarea readOnly rows={2} value={code} onFocus={(e) => e.target.select()} aria-label={L.t("Lien HTML à copier", "HTML link to copy", "Enlace HTML para copiar", "Link HTML para copiar")} />
      <button type="button" className="btn-solid" onClick={copy}>{done ? L.t("Copié ✓", "Copied ✓", "Copiado ✓", "Copiado ✓") : L.t("Copier le lien", "Copy the link", "Copiar el enlace", "Copiar o link")}</button>
    </details>
  );
}
