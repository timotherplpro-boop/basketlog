"use client";
// Bouton « Recevoir les matchs du soir » (web push, 20/11/2026). Visible seulement là où les notifications marchent :
// navigateur qui les gère, et sur iPhone/iPad uniquement dans l'appli installée (écran d'accueil). Une notification par
// jour au plus (app/api/cron/push). variant : "card" (page des matchs) ou "link" (barre latérale).
import { useEffect, useState } from "react";
import { track } from "../lib/analytics";
import { isIOS, isStandalone } from "../lib/pwa";
import { useL } from "./LangProvider";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function keyBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const supported = () =>
  !!VAPID && typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window &&
  !(isIOS() && !isStandalone());

const swReady = () => Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error("sw")), 6000))]);

export default function PushOptIn({ variant = "card", source = "matchs" }) {
  const L = useL();
  const [state, setState] = useState("hidden"); // hidden | off | on | busy | denied

  useEffect(() => {
    if (!supported()) return;
    if (Notification.permission === "denied") { setState("denied"); return; }
    swReady().then((reg) => reg.pushManager.getSubscription()).then((s) => setState(s ? "on" : "off")).catch(() => setState("hidden"));
  }, []);

  const enable = async () => {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); track("Notifications refusées", { source }); return; }
      const reg = await swReady();
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) }));
      const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sub: sub.toJSON(), lang: L.lang }) });
      if (!r.ok) throw new Error("save");
      setState("on");
      track("Notifications activées", { source });
    } catch {
      setState("off");
    }
  };

  const disable = async () => {
    setState("busy");
    try {
      const reg = await swReady();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
        await sub.unsubscribe();
      }
      track("Notifications désactivées", { source });
    } catch {}
    setState("off");
  };

  if (state === "hidden" || state === "denied") return null;
  const on = state === "on";
  const label = on
    ? L.t("Notifications du soir activées", "Evening alerts on", "Avisos de la noche activados", "Avisos da noite ativados")
    : L.t("Recevoir les matchs du soir", "Get tonight's games", "Recibir los partidos de la noche", "Receber os jogos da noite");

  if (variant === "link") {
    return (
      <button type="button" className="sb-link push-link" onClick={on ? disable : enable} disabled={state === "busy"} title={on ? L.t("Désactiver", "Turn off", "Desactivar", "Desativar") : undefined}>
        <span aria-hidden>{on ? "🔔" : "🔕"}</span>{label}
      </button>
    );
  }

  return (
    <div className="push-card">
      <div>
        <b>🔔 {label}</b>
        <small>{on
          ? L.t("Une notification par jour avant les matchs. Tu peux l'arrêter ici.", "One alert a day before the games. You can stop it here.", "Un aviso al día antes de los partidos. Puedes pararlo aquí.", "Um aviso por dia antes dos jogos. Você pode parar aqui.")
          : L.t("Une notification par jour avant les matchs : le nombre de matchs et le plus gros favori.", "One alert a day before the games: how many games and the biggest favorite.", "Un aviso al día antes de los partidos: cuántos partidos y el mayor favorito.", "Um aviso por dia antes dos jogos: quantos jogos e o maior favorito.")}</small>
      </div>
      <div className="push-actions">
        <button type="button" className={on ? "push-off" : "btn-solid"} onClick={on ? disable : enable} disabled={state === "busy"}>
          {on ? L.t("Désactiver", "Turn off", "Desactivar", "Desativar") : L.t("Activer", "Turn on", "Activar", "Ativar")}
        </button>
      </div>
    </div>
  );
}
