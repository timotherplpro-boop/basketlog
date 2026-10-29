import Link from "next/link";
import { LEGAL, LEGAL_PAGES } from "../lib/legal";

// Mise en page commune des pages légales : titre, date, navigation entre les documents.
export default function LegalDoc({ title, path, intro, children }) {
  return (
    <main className="app-page prose-page legal">
      <div className="app-head">
        <h1>{title}</h1>
        <p>Dernière mise à jour : {LEGAL.updated}</p>
      </div>
      <nav className="legal-nav" aria-label="Documents légaux">
        {LEGAL_PAGES.map(([href, label]) => (
          <Link key={href} href={href} className={href === path ? "on" : ""} aria-current={href === path ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {intro && <p className="legal-intro">{intro}</p>}
      {children}
      <p className="legal-contact">Une question ? Écris-nous à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>
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
