"use client";
import { useEffect, useState } from "react";
import { identifyPro } from "./analytics";

let cache = null;
let pending = null;

// Formule de l'utilisateur (gratuit, mensuel, annuel), demandée une seule fois par visite.
export function useProStatus() {
  const [status, setStatus] = useState(cache);
  useEffect(() => {
    if (cache) return;
    pending ||= fetch("/api/pro/status", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => ({ tier: "gratuit", perDay: 0, connected: false }));
    pending.then((s) => {
      // Formule changée chez Whop (ex. abonnement payé à l'instant) : on recharge une fois pour tout débloquer.
      if (s.changed) {
        try {
          if (sessionStorage.getItem("bl_tier_reload") !== s.tier) {
            sessionStorage.setItem("bl_tier_reload", s.tier);
            window.location.reload();
            return;
          }
        } catch {}
      }
      cache = s;
      if (s.uid) identifyPro(s.uid, s.tier);
      setStatus(s);
    });
  }, []);
  return status;
}
