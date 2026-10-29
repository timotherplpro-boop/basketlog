import Link from "next/link";
import { LEGAL, LEGAL_PAGES } from "../lib/legal";
import { mk } from "../lib/i18n";

const LEGAL_EN = { "/mentions-legales": "Legal notice", "/cgu": "Terms of use", "/cgv": "Terms of sale", "/confidentialite": "Privacy", "/cookies": "Cookies" };

// Mise en page commune des pages légales : titre, date, navigation entre les documents.
export default function LegalDoc({ title, path, intro, children, L = mk("fr") }) {
  return (
    <main className="app-page prose-page legal">
      <div className="app-head">
        <h1>{title}</h1>
        <p>{L.en ? `Last updated: ${LEGAL.updatedEn || LEGAL.updated}` : `Dernière mise à jour : ${LEGAL.updated}`}</p>
      </div>
      <nav className="legal-nav" aria-label={L.t("Documents légaux", "Legal documents")}>
        {LEGAL_PAGES.map(([href, label]) => (
          <Link key={href} href={L.href(href)} className={href === path ? "on" : ""} aria-current={href === path ? "page" : undefined}>{L.en ? LEGAL_EN[href] : label}</Link>
        ))}
      </nav>
      {intro && <p className="legal-intro">{intro}</p>}
      {children}
      <p className="legal-contact">{L.t("Une question ? Écris-nous à", "Any questions? Email us at")} <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>
    </main>
  );
}

export function Sec({ n, title, children }) {
  return (
    <section className="card block legal-sec">
      <h2>{n ? `${n}. ` : ""}{title}</h2>
      {children}
    </section>
  );
}
