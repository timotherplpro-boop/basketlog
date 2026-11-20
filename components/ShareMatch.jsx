"use client";
// Partage d'une fiche de match (20/11/2026, idée validée par Tim) : WhatsApp avec un message prêt, et le partage du téléphone
// (ou la copie du lien sur ordinateur). Chaque partage amène des amis sur la fiche ; l'adresse porte utm_source pour le suivi.
import { useState } from "react";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";

export default function ShareMatch({ text, url, matchId, league }) {
  const L = useL();
  const [copied, setCopied] = useState(false);
  const withSource = (src) => `${url}${url.includes("?") ? "&" : "?"}utm_source=${src}&utm_medium=partage`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} 👉 ${withSource("whatsapp")}`)}`;
  const props = { match_id: matchId, ligue: league };

  const other = async () => {
    const link = withSource("partage");
    try {
      if (navigator.share) {
        await navigator.share({ text, url: link });
        track("Partage match", { ...props, canal: "natif" });
        return;
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(`${text} 👉 ${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      track("Partage match", { ...props, canal: "copie" });
    } catch {}
  };

  return (
    <div className="share-match">
      <a href={wa} target="_blank" rel="noopener noreferrer" className="share-wa" onClick={() => track("Partage match", { ...props, canal: "whatsapp" })}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" /></svg>
        {L.t("Partager sur WhatsApp", "Share on WhatsApp", "Compartir en WhatsApp", "Compartilhar no WhatsApp")}
      </a>
      <button type="button" className="share-other" onClick={other}>
        {copied ? L.t("Lien copié ✓", "Link copied ✓", "Enlace copiado ✓", "Link copiado ✓") : L.t("Partager", "Share", "Compartir", "Compartilhar")}
      </button>
    </div>
  );
}
