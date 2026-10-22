import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "HoopSight – Comprends chaque match NBA avant l'entre-deux",
  description:
    "Analyses NBA par modèle statistique : probabilités de victoire, score projeté, absences, back-to-back et scénarios pour chaque match du jour.",
  openGraph: {
    title: "HoopSight – Analyses NBA avant-match",
    description: "Probabilités, score projeté et scénarios pour chaque match NBA.",
    type: "website",
  },
};

export const viewport = { themeColor: "#0c0b0a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav className="nav">
          <div className="wrap nav-in">
            <Link href="/" className="logo">
              <span className="logo-dot" aria-hidden /> Hoop<b>Sight</b>
            </Link>
            <div className="nav-links">
              <Link href="/#comment" className="hide-sm">Comment ça marche</Link>
              <Link href="/#tarifs" className="hide-sm">Tarifs</Link>
              <Link href="/app" className="btn btn-primary btn-sm">Matchs du jour</Link>
            </div>
          </div>
        </nav>
        {children}
        <footer>
          <div className="wrap">
            <div>© {new Date().getFullYear()} HoopSight · Analyses statistiques, pas un service de paris.</div>
            <div>Données : flux publics NBA (ESPN). Les probabilités sont des estimations, jamais des certitudes.</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
