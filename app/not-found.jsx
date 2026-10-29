import Link from "next/link";
import { getL } from "../lib/lang-server";

export default async function NotFound() {
  const L = await getL();
  return (
    <main className="nf">
      <h1 className="t-hero">Air <span className="accent">ball.</span></h1>
      <p className="lead" style={{ margin: "24px auto 30px", maxWidth: 460 }}>{L.t("Ce match est introuvable ou n'est plus au programme.", "This game can't be found or is no longer scheduled.")}</p>
      <Link href={L.href("/app")} className="btn-ball"><span className="ball" aria-hidden /><span className="pill">{L.t("Analyser un match", "Analyze a game")}</span></Link>
    </main>
  );
}
