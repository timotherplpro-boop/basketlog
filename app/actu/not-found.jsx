import Link from "next/link";

// Article d'actu introuvable (post Bluesky supprimé ou adresse incomplète) : message propre aux actus, au lieu de celui des matchs.
export async function generateMetadata() {
  return { title: "Article introuvable – Basketlog", robots: { index: false, follow: true } };
}

export default function ActuNotFound() {
  return (
    <main className="nf">
      <h1 className="t-hero">Air <span className="accent">ball.</span></h1>
      <p className="lead" style={{ margin: "24px auto 30px", maxWidth: 460 }}>Cet article n&apos;existe plus, ou son adresse est incomplète.</p>
      <Link href="/actu" className="btn-ball"><span className="ball" aria-hidden /><span className="pill">Voir les actus NBA</span></Link>
    </main>
  );
}
