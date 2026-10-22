import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap" style={{ padding: "100px 16px", textAlign: "center" }}>
      <h1 style={{ fontSize: 48 }}>Air ball.</h1>
      <p className="lead" style={{ margin: "0 auto 24px" }}>Ce match est introuvable ou n&apos;est plus au programme.</p>
      <Link href="/app" className="btn btn-primary">Retour aux matchs</Link>
    </main>
  );
}
