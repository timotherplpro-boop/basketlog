"use client";
// Page des formules : bandeau d'un changement de formule en cours (le membre a cliqué « Passer à… » dans Mon compte, puis payé chez Whop).
// Rendu seulement quand le cookie d'intention existe (lu côté serveur par app/pro/page.jsx). À l'ouverture, on vérifie le paiement :
// confirmé, le serveur arrête l'ancien abonnement EN FIN DE PÉRIODE (jamais avant) ; pas encore confirmé, on réessaie quelques fois
// puis le membre relance lui-même. Même logique que dans Mon compte (components/AccountPanel.jsx), via /api/compte.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useL } from "./LangProvider";
import { fmtDate } from "../lib/i18n";
import { patchProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";
import { switchDoneText } from "../lib/switch-text";

const CHECK_TRIES = 6; // vérifications automatiques (une toutes les 4 s)
const CHECK_EVERY_MS = 4000;

export default function SwitchWatch() {
  const L = useL();
  const T = L.t;
  const router = useRouter();
  const [st, setSt] = useState({ phase: "checking" }); // checking | pending | done | error | none
  const tries = useRef(0);
  const timer = useRef(null);
  const running = useRef(false);
  const alive = useRef(true);

  const send = useCallback(async (action) => {
    try {
      const res = await fetch("/api/compte", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, lang: L.lang }), cache: "no-store" });
      const j = await res.json().catch(() => null);
      return { good: res.ok && !!j?.ok, j, status: res.status };
    } catch {
      return { good: false, status: 0, j: { error: T("Connexion impossible, réessaie.", "Couldn't connect, please try again.", "No se ha podido conectar, inténtalo de nuevo.") } };
    }
  }, [L.lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const check = useCallback(async (manual = false) => {
    if (running.current) return;
    running.current = true;
    clearTimeout(timer.current);
    if (manual) tries.current = 0;
    setSt((s) => ({ ...s, phase: "checking" }));
    const { good, j, status } = await send("finaliser");
    running.current = false;
    if (!alive.current) return;
    if (!good) {
      setSt(status === 401 ? { phase: "none" } : { phase: "error", msg: j?.error || T("Une erreur est survenue.", "Something went wrong.", "Se ha producido un error.") });
      return;
    }
    if (j.state === "pending") {
      tries.current += 1;
      setSt({ phase: "pending", tier: j.tier, from: j.from });
      if (tries.current < CHECK_TRIES) timer.current = setTimeout(() => check(), CHECK_EVERY_MS);
      return;
    }
    if (j.state === "done") {
      patchProStatus({ tier: j.tier, perDay: j.perDay }); // « Ta formule actuelle » et la barre latérale suivent tout de suite
      router.refresh();
      track("Changement de formule", { etape: "terminé", de: j.from?.tier, vers: j.to?.tier, source: "page_pro" });
      setSt({ phase: "done", j });
      return;
    }
    setSt({ phase: "none" }); // plus de changement en cours (abandonné, expiré, ancien abonnement déjà terminé)
  }, [send]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    alive.current = true;
    check();
    return () => { alive.current = false; clearTimeout(timer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function abandon() {
    clearTimeout(timer.current);
    const { good, j } = await send("abandonner");
    if (!good) { setSt({ phase: "error", msg: j?.error || T("Une erreur est survenue.", "Something went wrong.", "Se ha producido un error.") }); return; }
    setSt({ phase: "none" });
  }

  if (st.phase === "none") return null;
  const day = (iso) => (iso ? fmtDate(L, iso, { day: "numeric", month: "long", year: "numeric" }) : "");
  const waiting = st.phase === "checking" || st.phase === "pending";
  const checking = st.phase === "checking";
  return (
    <div className={`pro-notice ${st.phase === "done" ? "good" : "warn"} pro-switch`} role="status" aria-live="polite">
      {st.phase === "done" ? (
        <>
          <span>{switchDoneText(T, st.j, day(st.j.from?.periodEnd))}</span>{" "}
          <Link href={L.href("/app/compte")}>{T("Voir mon abonnement", "See my subscription", "Ver mi suscripción")}</Link>
        </>
      ) : (
        <>
          <b>{T("Changement de formule en cours.", "Plan switch in progress.", "Cambio de plan en curso.")}</b>{" "}
          <span>
            {st.phase === "error"
              ? st.msg
              : checking
                ? T("Vérification de ton paiement auprès de Whop…", "Checking your payment with Whop…", "Comprobando tu pago con Whop…")
                : T(
                  "Paiement pas encore confirmé par Whop. Dès qu'il l'est, ton ancien abonnement est arrêté à la fin de sa période (rien n'est arrêté avant). Cela peut prendre quelques instants.",
                  "Payment not yet confirmed by Whop. As soon as it is, your previous subscription is stopped at the end of its period (nothing is stopped before then). This can take a few moments.",
                  "Pago aún no confirmado por Whop. En cuanto lo esté, tu suscripción anterior se detiene al final de su periodo (no se detiene nada antes). Puede tardar unos instantes."
                )}
          </span>
          <span className="pro-switch-actions">
            <button type="button" className="acc-link" disabled={checking} onClick={() => check(true)}>
              {checking ? "…" : st.phase === "error" ? T("Réessayer", "Try again", "Reintentar") : T("Vérifier mon paiement", "Check my payment", "Comprobar mi pago")}
            </button>
            {waiting && <Link href={L.href("/app/compte")}>{T("Voir dans Mon compte", "See in My account", "Ver en Mi cuenta")}</Link>}
            <button type="button" className="acc-link" disabled={checking} onClick={abandon}>{T("Annuler ce changement", "Cancel this switch", "Cancelar este cambio")}</button>
          </span>
        </>
      )}
    </div>
  );
}
