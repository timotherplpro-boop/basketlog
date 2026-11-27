"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent } from "../lib/consent";
import { useL } from "./LangProvider";

// Bannière cookies : « Refuser » et « Accepter » au même niveau, rien n'est déposé avant le choix.
export default function CookieBanner() {
  const L = useL();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!getConsent()) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener("bl-consent-open", reopen);
    return () => window.removeEventListener("bl-consent-open", reopen);
  }, []);
  if (!open) return null;
  const choose = (v) => { setConsent(v); setOpen(false); };
  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label={L.t("Choix des cookies", "Cookie choice", "Elección de cookies", "Escolha de cookies")}>
      <p>
        {L.t(
          <><b>Cookies</b> — Avec ton accord, Basketlog mesure l&apos;audience (Amplitude) pour améliorer le site, et retient le lien de l&apos;ami qui t&apos;a invité (parrainage). Aucune publicité, aucune revente. Les cookies nécessaires (connexion à ton compte) ne demandent pas d&apos;accord. </>,
          <><b>Cookies</b> — With your consent, Basketlog measures traffic (Amplitude) to improve the site, and remembers the link of the friend who invited you (referrals). No ads, no data resale. Necessary cookies (logging in to your account) don&apos;t require consent. </>,
          <><b>Cookies</b> — Con tu consentimiento, Basketlog mide la audiencia (Amplitude) para mejorar el sitio, y recuerda el enlace del amigo que te invitó (invitaciones). Sin publicidad y sin venta de datos. Las cookies necesarias (inicio de sesión) no requieren consentimiento. </>, <><b>Cookies</b> — Com o seu consentimento, o Basketlog mede a audiência (Amplitude) para melhorar o site, e guarda o link do amigo que convidou você (indicações). Sem publicidade e sem venda de dados. Os cookies necessários (login) não exigem consentimento. </>
        )}
        <Link href={L.href("/cookies")}>{L.t("En savoir plus", "Learn more", "Más información", "Saiba mais")}</Link>
      </p>
      <div className="cookie-actions">
        <button type="button" className="cookie-btn" onClick={() => choose(false)}>{L.t("Refuser", "Decline", "Rechazar", "Recusar")}</button>
        <button type="button" className="cookie-btn" onClick={() => choose(true)}>{L.t("Accepter", "Accept", "Aceptar", "Aceitar")}</button>
      </div>
    </div>
  );
}
