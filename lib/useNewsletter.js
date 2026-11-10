"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// État de la newsletter du dimanche pour le membre connecté, et de quoi l'inscrire ou le désinscrire. Tout passe par
// /api/compte/newsletter : l'adresse e-mail est lue côté serveur (celle du compte, jamais saisie ici) et seule une version
// masquée (« tim***@gmail.com ») revient à la page.
//   state  null tant que rien n'est lu, sinon :
//          { available: false }                          newsletter fermée, ou pas pour ce compte (aperçu admin, langue pas encore ouverte)
//          { available: true, subscribed: true|false, blocked?, email, confirm?, pending? }
//              confirm : adresse d'un compte Basketlog pas encore prouvée, s'inscrire passe par un e-mail de confirmation ;
//              pending : cet e-mail vient d'être envoyé, l'inscription attend le clic sur son lien (le serveur ne le sait pas : il n'y a
//                        pas de « pending » à la lecture, seulement après une demande faite ici)
//          { available: true, subscribed: null, problem: "down" | "email" }   lecture impossible pour l'instant
//   error  "" | NETWORK | message déjà traduit par le serveur
// subscribe() / unsubscribe() renvoient false en cas d'échec, true en cas de réussite, et "pending" quand l'e-mail de confirmation est parti.
// `enabled` à false : aucune requête (compte non connecté, ou choix déjà fait dans ce navigateur).
export const NETWORK = "network";

export function useNewsletter(lang, enabled = true) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0); // seule la dernière lecture compte (changement de langue, action pendant une lecture)

  const load = useCallback(async () => {
    const mine = ++seq.current;
    let next;
    try {
      const res = await fetch(`/api/compte/newsletter?lang=${encodeURIComponent(lang)}`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      next = res.status === 401 ? { available: false } : res.ok && j?.ok ? j : { available: true, subscribed: null, problem: "down" };
    } catch {
      next = { available: true, subscribed: null, problem: "down" };
    }
    if (mine === seq.current) setState(next);
    return next;
  }, [lang]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const act = useCallback(async (action) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/compte/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, lang }),
        cache: "no-store",
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) {
        seq.current++; // une lecture encore en route ne doit pas écraser ce résultat
        const pending = j.pending === true;
        setState((s) => ({ ...(s || {}), available: true, subscribed: j.subscribed === true, pending, blocked: false, email: j.email || s?.email, problem: undefined }));
        return pending ? "pending" : true;
      }
      if (res.status === 409) setState((s) => ({ ...(s || {}), available: true, subscribed: false, blocked: true }));
      setError(j?.error || NETWORK);
      return false;
    } catch {
      setError(NETWORK);
      return false;
    } finally {
      setBusy(false);
    }
  }, [lang]);

  const subscribe = useCallback(() => act("abonner"), [act]);
  const unsubscribe = useCallback(() => act("desabonner"), [act]);
  return { state, busy, error, setError, reload: load, subscribe, unsubscribe };
}
