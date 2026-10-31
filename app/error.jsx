"use client";
// Erreur temporaire (ex. source de données injoignable) : message clair et bouton pour réessayer, dans la langue de la page.
import { startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function Error({ reset }) {
  const router = useRouter();
  const path = usePathname() || "";
  const lang = /^\/en(\/|$)/.test(path) ? "en" : /^\/es(\/|$)/.test(path) ? "es" : "fr";
  const t = (fr, en, es) => (lang === "en" ? en : lang === "es" ? es : fr);
  return (
    <main className="app-page" style={{ minHeight: "60vh", display: "grid", placeItems: "center", textAlign: "center", padding: "48px 16px" }}>
      <div style={{ maxWidth: 460 }}>
        <h1 style={{ fontSize: 26, marginBottom: 10 }}>{t("Données momentanément indisponibles", "Data temporarily unavailable", "Datos no disponibles por el momento")}</h1>
        <p className="team-rec" style={{ marginBottom: 22 }}>
          {t("Cette page n'a pas pu se charger : une de nos sources de données ne répond pas pour l'instant. Réessaie dans un instant.", "This page couldn't load: one of our data sources isn't responding right now. Please try again in a moment.", "Esta página no se ha podido cargar: una de nuestras fuentes de datos no responde por ahora. Vuelve a intentarlo en un momento.")}
        </p>
        <button type="button" className="btn-solid" onClick={() => startTransition(() => { router.refresh(); reset(); })}>{t("Réessayer", "Try again", "Reintentar")}</button>
      </div>
    </main>
  );
}
