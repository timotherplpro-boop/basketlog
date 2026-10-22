import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Basketlog – Prédis chaque match NBA avant l'entre-deux",
  description:
    "Analyses NBA : probabilités de victoire, score projeté, absences, back-to-back et scénarios pour chaque match du jour.",
  openGraph: {
    title: "Basketlog – Prédis chaque match NBA avant l'entre-deux",
    description: "Probabilités, score projeté et scénarios pour chaque match NBA.",
    type: "website",
  },
};

export const viewport = { themeColor: "#071318", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <nav className="nav">
          <div className="nav-in">
            <Link href="/" className="logo">
              <span className="logo-ball" aria-hidden /> Basketlog
            </Link>
            <div className="nav-right">
              <Link href="/#tarifs" className="nav-link hide-sm">Tarifs</Link>
              <Link href="/app" className="nav-connect">
                <svg viewBox="0 0 24 24" aria-hidden><path d="M4 6l6 6-6 6M12 6l6 6-6 6" /></svg>
                Matchs du jour
              </Link>
            </div>
          </div>
        </nav>
        {children}
        <footer>
          <div className="wrap foot">
            <div className="logo small"><span className="logo-ball" aria-hidden /> Basketlog</div>
            <div>Analyses statistiques, pas un service de paris. Les probabilités sont des estimations, jamais des certitudes.</div>
            <div>Données : flux publics NBA · © {new Date().getFullYear()} Basketlog</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
