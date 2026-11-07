import Link from "next/link";

// Onglets de l'espace admin : gestion (avis, formules, créateurs) et statistiques.
export default function AdminNav({ active = "gestion" }) {
  return (
    <nav className="st-nav" aria-label="Espace admin">
      <Link href="/app/admin" className={active === "gestion" ? "on" : ""} aria-current={active === "gestion" ? "page" : undefined}>Gestion</Link>
      <Link href="/app/admin/stats" className={active === "stats" ? "on" : ""} aria-current={active === "stats" ? "page" : undefined}>Statistiques</Link>
    </nav>
  );
}
