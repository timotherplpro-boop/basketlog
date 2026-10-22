import "./globals.css";
import Link from "next/link";
import Nav from "../components/Nav";

export const metadata = {
  title: "Basketlog – Comprends les matchs NBA avant qu'ils commencent",
  description:
    "Analyse les matchs NBA : probabilités de victoire, score projeté, absences, back-to-back et scénarios pour chaque rencontre.",
  openGraph: {
    title: "Basketlog – Comprends les matchs NBA avant qu'ils commencent",
    description: "Probabilités, score projeté et scénarios pour chaque match NBA.",
    type: "website",
  },
};

export const viewport = { themeColor: "#040817", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tilt+Warp&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <Nav />
        {children}
        <footer>
          <div className="foot">
            <Link href="/" className="logo"><span className="ball" aria-hidden /> Basketlog</Link>
            <div>Analyses statistiques, pas un service de paris. Les probabilités sont des estimations, jamais des certitudes.</div>
            <div>Données : flux publics NBA · Photos : Unsplash · © {new Date().getFullYear()} Basketlog</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
