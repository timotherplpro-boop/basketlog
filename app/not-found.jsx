import Link from "next/link";

export default function NotFound() {
  return (
    <main className="nf">
      <h1 className="t-hero">Air <span className="accent">ball.</span></h1>
      <p className="lead" style={{ margin: "24px auto 30px", maxWidth: 460 }}>Ce match est introuvable ou n&apos;est plus au programme.</p>
      <Link href="/app" className="btn-ball"><span className="ball" aria-hidden /><span className="pill">Analyser un match</span></Link>
    </main>
  );
}
