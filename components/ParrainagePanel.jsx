"use client";
// « Mon compte » > Parrainage (lib/parrainage.js) : lien personnel à copier ou partager, mois offerts gagnés, et bouton pour
// ajouter un mois en attente (30 jours) à son abonnement Pro. Masqué pour les créateurs partenaires (ils ont leur code promo).
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useL } from "./LangProvider";
import { track } from "../lib/analytics";
import { fmtDate } from "../lib/i18n";

const CONTACT = "contact@basketlog-app.com";

export default function ParrainagePanel() {
  const L = useL();
  const T = L.t;
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [canShare, setCanShare] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/parrainage?lang=${L.lang}`, { cache: "no-store" });
      const j = await r.json().catch(() => null);
      setData(j?.ok ? j : null);
    } catch { setData(null); }
  }, [L.lang]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"); }, []);
  // Arrivée depuis « Inviter un ami » (/app/compte#parrainage) : la section n'existe qu'une fois chargée.
  useEffect(() => {
    if (data?.link && location.hash === "#parrainage") document.getElementById("parrainage")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data?.link]);

  if (!data || data.off || !data.link) return null;

  const rewards = Array.isArray(data.rewards) ? data.rewards : null;
  const pending = rewards ? rewards.filter((r) => r.state === "attente").length : 0;
  const won = rewards ? rewards.length : 0;
  const shareText = T(
    "Je suis les probabilités de victoire des matchs NBA sur Basketlog. Essaie, c'est gratuit chaque soir :",
    "I follow NBA win probabilities on Basketlog. Try it, it's free every night:",
    "Sigo las probabilidades de victoria de la NBA en Basketlog. Pruébalo, es gratis cada noche:",
    "Eu acompanho as probabilidades de vitória da NBA no Basketlog. Experimente, é grátis toda noite:",
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      document.getElementById("par-link")?.select();
    }
    track("Lien de parrainage copié", { via: "copier" });
  }

  async function share() {
    try {
      await navigator.share({ title: "Basketlog", text: shareText, url: data.link });
      track("Lien de parrainage copié", { via: "partage" });
    } catch { /* partage annulé */ }
  }

  async function addMonth() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/parrainage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ajouter" }) });
      const j = await r.json().catch(() => ({}));
      if (j?.ok) {
        const when = j.until ? fmtDate(L, j.until, { day: "numeric", month: "long", year: "numeric" }) : "";
        setMsg({ ok: true, text: when
          ? T(`C'est fait : 30 jours ajoutés à ton abonnement Pro. Ton prochain paiement est repoussé au ${when}.`, `Done: 30 days added to your Pro subscription. Your next payment moves to ${when}.`, `Hecho: 30 días añadidos a tu suscripción Pro. Tu próximo pago pasa al ${when}.`, `Pronto: 30 dias adicionados à sua assinatura Pro. Seu próximo pagamento passa para ${when}.`)
          : T("C'est fait : 30 jours ajoutés à ton abonnement Pro.", "Done: 30 days added to your Pro subscription.", "Hecho: 30 días añadidos a tu suscripción Pro.", "Pronto: 30 dias adicionados à sua assinatura Pro.") });
        track("Mois de parrainage ajouté", {});
        load();
      } else if (j?.error === "sans_pro") {
        setMsg({ ok: false, text: T("Il faut un abonnement Pro en cours pour y ajouter ton mois offert.", "You need an active Pro subscription to add your free month to it.", "Necesitas una suscripción Pro activa para añadirle tu mes gratis.", "Você precisa de uma assinatura Pro ativa para adicionar seu mês grátis.") });
      } else if (j?.error === "trop") {
        setMsg({ ok: false, text: T("Trop d'essais : réessaie dans une heure.", "Too many tries: try again in an hour.", "Demasiados intentos: vuelve a intentarlo en una hora.", "Muitas tentativas: tente novamente em uma hora.") });
      } else {
        setMsg({ ok: false, text: T(`Whop n'a pas pu ajouter ton mois pour l'instant. Réessaie plus tard, ou écris-nous à ${CONTACT}.`, `Whop couldn't add your month right now. Try again later, or write to us at ${CONTACT}.`, `Whop no ha podido añadir tu mes por ahora. Vuelve a intentarlo más tarde o escríbenos a ${CONTACT}.`, `A Whop não conseguiu adicionar seu mês agora. Tente mais tarde ou escreva para ${CONTACT}.`) });
      }
    } catch {
      setMsg({ ok: false, text: T("Connexion impossible. Réessaie dans un instant.", "Connection failed. Try again in a moment.", "Sin conexión. Vuelve a intentarlo en un momento.", "Falha na conexão. Tente novamente em instantes.") });
    }
    setBusy(false);
  }

  return (
    <section className="panel acc-sec" id="parrainage" aria-labelledby="acc-par">
      <h2 id="acc-par">{T("Parrainage : 1 mois de Pro offert", "Referrals: 1 free month of Pro", "Invita a un amigo: 1 mes de Pro gratis", "Indicação: 1 mês de Pro grátis")}</h2>
      <p className="acc-help">{T(
        `Invite tes amis avec ton lien personnel. Quand un ami s'abonne à Basketlog Pro (après son jour gratuit), tu gagnes 1 mois de Pro offert : ${data.days} jours gratuits ajoutés à ton abonnement. Jusqu'à ${data.max} mois offerts par an.`,
        `Invite your friends with your personal link. When a friend subscribes to Basketlog Pro (after their free day), you get 1 free month of Pro: ${data.days} free days added to your subscription. Up to ${data.max} free months a year.`,
        `Invita a tus amigos con tu enlace personal. Cuando un amigo se suscribe a Basketlog Pro (después de su día gratis), ganas 1 mes de Pro gratis: ${data.days} días gratis añadidos a tu suscripción. Hasta ${data.max} meses gratis al año.`,
        `Convide seus amigos com seu link pessoal. Quando um amigo assina o Basketlog Pro (depois do dia grátis), você ganha 1 mês de Pro grátis: ${data.days} dias grátis adicionados à sua assinatura. Até ${data.max} meses grátis por ano.`,
      )}</p>
      {msg && <div className={msg.ok ? "adm-notice ok" : "adm-err"} role={msg.ok ? "status" : "alert"}>{msg.text}</div>}
      <div className="acc-form">
        <label htmlFor="par-link">{T("Ton lien", "Your link", "Tu enlace", "Seu link")}</label>
        <div className="acc-row">
          <input id="par-link" readOnly value={data.link} onFocus={(e) => e.target.select()} spellCheck={false} />
          <button type="button" className="acc-btn primary" onClick={copy}>
            {copied ? T("Lien copié ✓", "Link copied ✓", "Enlace copiado ✓", "Link copiado ✓") : T("Copier le lien", "Copy link", "Copiar el enlace", "Copiar o link")}
          </button>
        </div>
        {canShare && <button type="button" className="acc-link" onClick={share}>{T("Partager…", "Share…", "Compartir…", "Compartilhar…")}</button>}
      </div>
      {rewards && (
        <dl className="acc-facts">
          <div><dt>{T("Mois offerts gagnés", "Free months earned", "Meses gratis ganados", "Meses grátis ganhos")}</dt><dd>{won}{pending > 0 ? T(` (dont ${pending} en attente)`, ` (${pending} waiting)`, ` (${pending} pendiente${pending > 1 ? "s" : ""})`, ` (${pending} pendente${pending > 1 ? "s" : ""})`) : ""}</dd></div>
          {data.year >= data.max && <div><dt>{T("Plafond", "Limit", "Límite", "Limite")}</dt><dd>{T(`${data.max} mois offerts sur les 12 derniers mois : merci !`, `${data.max} free months in the last 12 months: thank you!`, `${data.max} meses gratis en los últimos 12 meses: ¡gracias!`, `${data.max} meses grátis nos últimos 12 meses: obrigado!`)}</dd></div>}
        </dl>
      )}
      {pending > 0 && (data.canAdd ? (
        <button type="button" className="acc-btn primary" disabled={busy} onClick={addMonth}>
          {busy ? T("Ajout…", "Adding…", "Añadiendo…", "Adicionando…") : T(`Ajouter ${data.days} jours à mon abonnement Pro`, `Add ${data.days} days to my Pro subscription`, `Añadir ${data.days} días a mi suscripción Pro`, `Adicionar ${data.days} dias à minha assinatura Pro`)}
        </button>
      ) : (
        <p className="acc-note">
          {T("Ton mois offert s'ajoute à un abonnement Pro : prends l'essai Pro (1 jour gratuit, puis 9,99 €/mois, résiliable à tout moment), puis reviens ici pour ajouter tes 30 jours gratuits avant ton prochain paiement. ", "Your free month is added to a Pro subscription: start the Pro trial (1 free day, then €9.99/month, cancel anytime), then come back here to add your 30 free days before your next payment. ", "Tu mes gratis se añade a una suscripción Pro: empieza la prueba Pro (1 día gratis, luego 9,99 €/mes, cancela cuando quieras) y vuelve aquí para añadir tus 30 días gratis antes de tu próximo pago. ", "Seu mês grátis é adicionado a uma assinatura Pro: comece o teste Pro (1 dia grátis, depois 9,99 €/mês, cancele quando quiser) e volte aqui para adicionar seus 30 dias grátis antes do próximo pagamento. ")}
          <Link href={L.href("/pro")}>{T("Voir Basketlog Pro", "See Basketlog Pro", "Ver Basketlog Pro", "Ver o Basketlog Pro")}</Link>
        </p>
      ))}
      <small className="acc-help">
        {T("Ton ami paie le prix habituel. Pas de mois offert pour ton propre compte ni pour ta propre adresse e-mail, et un seul mois par ami. ", "Your friend pays the usual price. No free month for your own account or your own email address, and one month per friend. ", "Tu amigo paga el precio habitual. No hay mes gratis para tu propia cuenta ni tu propio correo, y un solo mes por amigo. ", "Seu amigo paga o preço normal. Não há mês grátis para sua própria conta nem seu próprio e-mail, e um só mês por amigo. ")}
        <Link href={L.href("/cgv")}>{T("Conditions", "Terms", "Condiciones", "Condições")}</Link>
      </small>
    </section>
  );
}
