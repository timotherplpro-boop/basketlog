"use client";
import { useEffect, useState } from "react";
import { mk, fmtDate, fmtTime } from "../lib/i18n";

// Heure d'un match. Le serveur l'écrit dans le fuseau de la langue (Paris, New York, Madrid, Brasília) ; dans le
// navigateur, si le visiteur est dans un autre fuseau (Mexique, Afrique, Canada…), elle est réécrite à son heure,
// avec la mention « heure locale ». Rien ne change pour un visiteur déjà à l'heure de la langue.
// day : ajoute le jour (« ven. 21 nov. · 02:00 ») ; label : ajoute le fuseau de la langue quand l'heure n'a pas changé.
export default function LocalTime({ iso, lang = "fr", day = false, label = false }) {
  const L = mk(lang);
  const [tz, setTz] = useState(null);
  useEffect(() => {
    try {
      const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!z || z === L.tz) return;
      const f = (zone) => new Intl.DateTimeFormat("en-US", { timeZone: zone, day: "numeric", hour: "numeric", minute: "numeric" }).format(new Date(iso));
      if (f(z) !== f(L.tz)) setTz(z);
    } catch {}
  }, [iso, L.tz]);
  const LL = tz ? { ...L, tz } : L;
  const d = day ? `${fmtDate(LL, iso, { weekday: "short", day: "numeric", month: "short" })} · ` : "";
  const suffix = tz ? ` (${L.t("heure locale", "local time", "hora local", "horário local")})` : label ? ` ${L.tzLabel}` : "";
  return <time dateTime={iso} suppressHydrationWarning>{d}{fmtTime(LL, iso)}{suffix}</time>;
}
