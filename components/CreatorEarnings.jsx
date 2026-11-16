"use client";
// Rubrique « Mes gains » des créateurs (page /app/gains) : combien de personnes ont utilisé son code promo, sur quelle formule
// (Starter, Pro, Lifetime), et ce que cela lui rapporte, en euros et en dollars (jamais convertis).
// Les chiffres viennent de /api/gains (Whop, lu en direct, gardé 60 s côté serveur). Le créateur n'y voit que ses propres codes,
// jamais le nom d'un abonné. La page se rafraîchit toute seule une fois par minute tant qu'elle est visible, au plus AUTO_MAX fois
// de suite sans que le créateur y touche (ménage le serveur), et le bouton « Actualiser » relance la lecture à tout moment.
// Ce que touche le créateur = 40 % du montant HORS TVA. L'écran ne montre que ses GAINS (la commission) : ni ce que les abonnés ont payé, ni le hors TVA
// (le serveur ne les envoie même pas). Seule l'explication du calcul cite un exemple au prix public.
// Un administrateur (ou le mode « voir comme ») reçoit un aperçu avec des chiffres d'exemple (réponse marquée « demo »), sans actualisation.
import { useCallback, useEffect, useRef, useState } from "react";
import { useL } from "./LangProvider";
import { openAuth } from "../lib/auth-client";
import { VAT_RATE, commissionOf, exVat } from "../lib/commission";
import { PRICES } from "../lib/pricing";

const REFRESH_MS = 60e3;
const AUTO_MAX = 20;
const CONTACT = "contact@basketlog-app.com";
const PLAN_ORDER = ["starter", "pro", "lifetime", "other"];

export default function CreatorEarnings() {
  const L = useL();
  const T = L.t;
  const [data, setData] = useState(null); // dernière réponse réussie de GET /api/gains
  const [err, setErr] = useState(null); // { status, msg } : dernière lecture en échec
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false); // actualisation automatique arrêtée (page laissée ouverte longtemps)
  const inflight = useRef(false);
  const left = useRef(AUTO_MAX);
  const lastAt = useRef(0);
  const isDemo = useRef(false); // aperçu avec chiffres d'exemple : rien à actualiser

  const load = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    setBusy(true);
    try {
      const res = await fetch(`/api/gains?lang=${L.lang}`, { cache: "no-store", credentials: "same-origin" });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) {
        setData(j);
        setErr(null);
        if (j.demo) {
          isDemo.current = true;
          left.current = 0;
        }
      } else {
        if (res.status === 401 || res.status === 403) left.current = 0; // inutile de réessayer tant que la session ou le rôle ne change pas
        setErr({ status: res.status, msg: j?.error || T("Impossible de lire tes gains pour le moment, réessaie dans un instant.", "Couldn't load your earnings right now, please try again in a moment.", "No se pudieron cargar tus ganancias por ahora, inténtalo de nuevo en un instante.") });
      }
    } catch {
      setErr({ status: 0, msg: T("Connexion impossible. Vérifie ton réseau puis actualise.", "Can't connect. Check your network, then refresh.", "No hay conexión. Revisa tu red y actualiza.") });
    } finally {
      lastAt.current = Date.now();
      inflight.current = false;
      setBusy(false);
    }
  }, [L.lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
    const tick = () => {
      if (isDemo.current) return;
      if (document.visibilityState !== "visible" || left.current <= 0) {
        if (left.current <= 0 && document.visibilityState === "visible") setPaused(true);
        return;
      }
      left.current -= 1;
      load();
    };
    const id = setInterval(tick, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState !== "visible" || isDemo.current) return;
      if (Date.now() - lastAt.current >= REFRESH_MS) {
        left.current = AUTO_MAX;
        setPaused(false);
        load();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const refresh = () => {
    left.current = AUTO_MAX;
    setPaused(false);
    load();
  };

  // ---------- formats ----------
  const cur = (n, c) => {
    try { return new Intl.NumberFormat(L.locale, { style: "currency", currency: c }).format(n); } catch { return `${n} ${c}`; }
  };
  // Sac d'argent { EUR, USD } -> lignes de texte, euros d'abord. Vide : « 0 € » (« $0.00 » en anglais).
  const lines = (bag) => {
    const keys = Object.keys(bag || {}).filter((k) => bag[k]).sort((a, b) => (a === "EUR" ? -1 : b === "EUR" ? 1 : a.localeCompare(b)));
    return keys.length ? keys.map((k) => cur(bag[k], k)) : [cur(0, L.en ? "USD" : "EUR")];
  };
  const stack = (bag) => lines(bag).map((x) => <b className="earn-line" key={x}>{x}</b>);
  const clock = (ms) => new Intl.DateTimeFormat(L.locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
  const stamp = (ms) => new Intl.DateTimeFormat(L.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
  const monthName = (key) => {
    try { return new Intl.DateTimeFormat(L.locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-15T12:00:00Z`)); } catch { return key; }
  };
  const pct = (n) => (L.en ? `${n}%` : `${n} %`);
  const planName = (k) => ({ starter: "Starter", pro: "Pro", lifetime: "Lifetime", other: T("Autre formule", "Other plan", "Otro plan") })[k] || k;
  const one = (n) => (L.lang === "fr" ? n < 2 : n === 1); // en français, 0 et 1 s'écrivent au singulier
  const people = (n) => `${n} ${one(n) ? T("personne", "person", "persona") : T("personnes", "people", "personas")}`;
  const actives = (n) => `${n} ${one(n) ? T("actif", "active", "activo") : T("actifs", "active", "activos")}`;

  // ---------- états sans chiffres ----------
  if (!data && !err) {
    return <div className="earn"><section className="panel acc-sec"><p className="acc-help" role="status">{T("Chargement de tes gains…", "Loading your earnings…", "Cargando tus ganancias…")}</p></section></div>;
  }
  if (!data && err?.status === 401) {
    return (
      <div className="earn"><section className="panel acc-sec">
        <h2>{T("Connecte-toi pour voir tes gains", "Log in to see your earnings", "Inicia sesión para ver tus ganancias")}</h2>
        <p className="acc-help">{err.msg}</p>
        <button type="button" className="acc-btn primary" onClick={() => openAuth({ mode: "connexion", source: "mes_gains", next: L.href("/app/gains") })}>{T("Se connecter", "Log in", "Iniciar sesión")}</button>
      </section></div>
    );
  }
  if (!data && err?.status === 403) {
    return (
      <div className="earn"><section className="panel acc-sec">
        <h2>{T("Rubrique réservée aux créateurs", "Section reserved for creators", "Sección reservada a los creadores")}</h2>
        <p className="acc-help">{T("Les gains s'affichent sur les comptes créateur Basketlog : chaque créateur a son code promo et touche une commission sur les abonnements pris avec.", "Earnings are shown on Basketlog creator accounts: each creator has a promo code and earns a commission on the subscriptions taken with it.", "Las ganancias se muestran en las cuentas de creador de Basketlog: cada creador tiene su código promocional y gana una comisión por las suscripciones hechas con él.")}</p>
        <p className="acc-help">{T("Tu veux devenir créateur ? Écris-nous à ", "Want to become a creator? Write to us at ", "¿Quieres ser creador? Escríbenos a ")}<a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
      </section></div>
    );
  }
  if (!data) {
    return (
      <div className="earn"><section className="panel acc-sec">
        <div className="adm-err" role="alert">{err.msg}</div>
        <button type="button" className="acc-btn" onClick={refresh} disabled={busy}>{busy ? T("Actualisation…", "Refreshing…", "Actualizando…") : T("Réessayer", "Try again", "Reintentar")}</button>
      </section></div>
    );
  }

  // ---------- chiffres ----------
  const { total, codes, recent } = data;
  const demo = !!data.demo;
  const plans = PLAN_ORDER.filter((k) => total.plans[k]);
  const hasMonthly = Object.keys(total.monthly || {}).length > 0;
  // Exemple chiffré de la règle (prix Starter du moment) : payé -> hors TVA -> ce que touche le créateur.
  const vat = data.vat ?? VAT_RATE;
  const exCur = L.en ? "USD" : "EUR";
  const exPaid = PRICES[exCur]?.starter || 13.99;
  const exHt = exVat(exPaid, vat);
  const exGain = commissionOf(exPaid, data.rate ?? data.ratePct / 100, vat);
  const ofVat = T(`${pct(data.ratePct)} du montant hors TVA`, `${pct(data.ratePct)} of the ex-VAT amount`, `${pct(data.ratePct)} del importe sin IVA`); // précision sous « Ta commission »

  return (
    <div className="earn">
      <section className="panel acc-sec" aria-labelledby="earn-top">
        <div className="earn-bar">
          <h2 id="earn-top">{T("Mes gains en direct", "My earnings, live", "Mis ganancias en directo")}</h2>
          {!demo && (
            <div className="earn-live" aria-live="polite">
              <span className="earn-dot" aria-hidden />
              <span>{T("Mis à jour à ", "Updated at ", "Actualizado a las ")}{clock(data.asOf)}</span>
              <button type="button" className="acc-btn" onClick={refresh} disabled={busy}>{busy ? T("Actualisation…", "Refreshing…", "Actualizando…") : T("Actualiser", "Refresh", "Actualizar")}</button>
            </div>
          )}
        </div>
        {demo && (
          <div className="adm-notice earn-demo" role="status">
            <b>{T("Aperçu avec des chiffres d'exemple.", "Preview with sample figures.", "Vista previa con cifras de ejemplo.")}</b>{" "}
            {T(
              "Ces chiffres sont inventés pour te montrer la page (code « EXEMPLE10 »). Chaque créateur y voit ses vrais chiffres, lus chez Whop toutes les minutes.",
              "These numbers are made up to show you the page (code “EXEMPLE10”). Each creator sees their real figures here, read from Whop every minute.",
              "Estas cifras son inventadas para mostrarte la página (código «EXEMPLE10»). Cada creador ve aquí sus cifras reales, leídas de Whop cada minuto."
            )}
          </div>
        )}
        <p className="acc-help">
          {T(
            `Tu touches ${pct(data.ratePct)} du montant hors TVA de chaque paiement des abonnés venus avec ton code, tant qu'ils restent abonnés. Les chiffres sont lus chez Whop (remboursements déduits) et se mettent à jour toutes les minutes.`,
            `You earn ${pct(data.ratePct)} of the amount excluding VAT of every payment from subscribers who joined with your code, for as long as they stay subscribed. Figures come from Whop (refunds deducted) and refresh every minute.`,
            `Ganas el ${pct(data.ratePct)} del importe sin IVA de cada pago de los suscriptores que llegaron con tu código, mientras sigan suscritos. Las cifras vienen de Whop (con los reembolsos descontados) y se actualizan cada minuto.`
          )}
        </p>
        {err && <div className="adm-err" role="alert">{err.msg}</div>}
        {data.stale && <div className="adm-notice" role="status">{T(`Whop ne répond pas pour l'instant : voici les derniers chiffres connus (${clock(data.asOf)}).`, `Whop isn't responding right now: here are the latest known figures (${clock(data.asOf)}).`, `Whop no responde por ahora: estas son las últimas cifras conocidas (${clock(data.asOf)}).`)}</div>}
        {data.partial && <div className="adm-notice" role="status">{T("La liste des paiements est très longue : les plus anciens peuvent manquer dans ces totaux. Écris-nous si le total te paraît trop bas.", "The payment list is very long: the oldest ones may be missing from these totals. Write to us if the total looks too low.", "La lista de pagos es muy larga: los más antiguos pueden faltar en estos totales. Escríbenos si el total te parece demasiado bajo.")}</div>}
        {paused && <div className="adm-notice" role="status">{T("L'actualisation automatique est en pause (page restée ouverte longtemps). Clique sur « Actualiser » pour la relancer.", "Automatic refresh is paused (the page has been open a long time). Click “Refresh” to resume it.", "La actualización automática está en pausa (la página lleva mucho tiempo abierta). Pulsa «Actualizar» para reanudarla.")}</div>}

        {codes.length > 0 ? (
          <div className="earn-codes">
            {codes.map((c) => (
              <span className="earn-code" key={c.code}>
                <small>{codes.length > 1 ? T("Code", "Code", "Código") : T("Ton code", "Your code", "Tu código")}</small>
                <b>{c.code}</b>
                {c.pct != null && <small>{T(`-${c.pct} % sur le 1er paiement`, `-${c.pct}% on the first payment`, `-${c.pct} % en el primer pago`)}</small>}
              </span>
            ))}
          </div>
        ) : (
          <div className="adm-notice" role="status">{T("Tu n'as pas encore de code promo. Écris-nous à ", "You don't have a promo code yet. Write to us at ", "Todavía no tienes un código promocional. Escríbenos a ")}<a href={`mailto:${CONTACT}`}>{CONTACT}</a>{T(" et on t'en crée un.", " and we'll create one for you.", " y te creamos uno.")}</div>
        )}

        <div className="st-kpis">
          <div className="st-kpi">
            <span>{T("Personnes avec ton code", "People using your code", "Personas con tu código")}</span>
            <strong>{total.people}</strong>
            {total.people > 0 && <small>{T(`dont ${actives(total.active)} aujourd'hui`, `${actives(total.active)} right now`, `${actives(total.active)} ahora`)}</small>}
          </div>
          <div className="st-kpi hero">
            <span>{T("Ce mois-ci", "This month", "Este mes")}</span>
            <strong className="st-money">{stack(total.commission.month)}</strong>
            <small>{monthName(data.months.this)}</small>
          </div>
          <div className="st-kpi">
            <span>{T("Mois dernier", "Last month", "Mes pasado")}</span>
            <strong className="st-money">{stack(total.commission.prev)}</strong>
            <small>{monthName(data.months.prev)}</small>
          </div>
          <div className="st-kpi">
            <span>{T("Depuis le début", "All time", "Desde el inicio")}</span>
            <strong className="st-money">{stack(total.commission.all)}</strong>
            <small>{T("commission cumulée", "total commission", "comisión acumulada")}</small>
          </div>
        </div>

        {total.people === 0 && codes.length > 0 && (
          <p className="acc-help">{T("Personne n'a encore utilisé ton code. Dès qu'un abonné paie avec ton code, il apparaît ici, sans rien à faire de ton côté.", "Nobody has used your code yet. As soon as a subscriber pays with your code, they show up here, with nothing to do on your side.", "Nadie ha usado tu código todavía. En cuanto un suscriptor pague con tu código, aparecerá aquí, sin que tengas que hacer nada.")}</p>
        )}
        {hasMonthly && (
          <p className="earn-monthly">
            {T("Tes abonnés actifs te rapportent environ ", "Your active subscribers bring you about ", "Tus suscriptores activos te aportan unos ")}
            <b className="earn-gain">{lines(total.monthly).join(" + ")}</b>
            {T(" par mois, tant qu'ils restent abonnés (estimation).", " per month, for as long as they stay subscribed (estimate).", " al mes, mientras sigan suscritos (estimación).")}
          </p>
        )}
        <p className="earn-how">
          <b>{T("Comment ton gain est calculé", "How your earnings are calculated", "Cómo se calcula tu ganancia")}</b>
          {T(
            ` : on prend ce que l'abonné a payé, on retire la TVA (${pct(Math.round(vat * 100))}), puis tu touches ${pct(data.ratePct)} du reste. Exemple : un paiement Starter de ${cur(exPaid, exCur)} = ${cur(exHt, exCur)} hors TVA, soit ${cur(exGain, exCur)} pour toi.`,
            `: we take what the subscriber paid, remove the VAT (${pct(Math.round(vat * 100))}), and you get ${pct(data.ratePct)} of what's left. Example: a Starter payment of ${cur(exPaid, exCur)} = ${cur(exHt, exCur)} excluding VAT, so ${cur(exGain, exCur)} for you.`,
            `: tomamos lo que pagó el suscriptor, quitamos el IVA (${pct(Math.round(vat * 100))}) y tú recibes el ${pct(data.ratePct)} del resto. Ejemplo: un pago Starter de ${cur(exPaid, exCur)} = ${cur(exHt, exCur)} sin IVA, es decir ${cur(exGain, exCur)} para ti.`
          )}
        </p>
      </section>

      <section className="panel acc-sec" aria-labelledby="earn-plans">
        <h2 id="earn-plans">{T("Par formule", "By plan", "Por plan")}</h2>
        <p className="acc-help">{T("Combien de personnes ont pris chaque formule avec ton code, et ce que cela te rapporte.", "How many people took each plan with your code, and what it earns you.", "Cuántas personas tomaron cada plan con tu código, y lo que eso te aporta.")}</p>
        <div className="earn-plans">
          {plans.map((k) => {
            const v = total.plans[k];
            return (
              <article className="earn-plan" key={k}>
                <h3>{planName(k)}</h3>
                <b className="earn-big">{v.people}</b>
                <span className="earn-sub">
                  {people(v.people)}
                  {k === "lifetime" ? ` · ${T("paiement unique", "one-time payment", "pago único")}` : v.people > 0 ? ` · ${actives(v.active)}` : ""}
                </span>
                <dl>
                  <div><dt>{T("Ta commission", "Your commission", "Tu comisión")}<small>{ofVat}</small></dt><dd className="earn-gain">{stack(v.commission)}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      {codes.length > 1 && (
        <section className="panel acc-sec" aria-labelledby="earn-codes">
          <h2 id="earn-codes">{T("Par code", "By code", "Por código")}</h2>
          <div className="earn-plans">
            {codes.map((c) => (
              <article className="earn-plan" key={c.code}>
                <h3>{c.code}</h3>
                <b className="earn-big">{c.people}</b>
                <span className="earn-sub">{people(c.people)} · {actives(c.active)}</span>
                <dl>
                  <div><dt>{T("Ta commission", "Your commission", "Tu comisión")}<small>{ofVat}</small></dt><dd className="earn-gain">{stack(c.commission.all)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="panel acc-sec" aria-labelledby="earn-recent">
        <h2 id="earn-recent">{T("Derniers paiements avec ton code", "Latest payments with your code", "Últimos pagos con tu código")}</h2>
        {recent.length > 0 && <p className="acc-help">{T("Pour chaque paiement fait avec ton code : ta commission, en vert.", "For each payment made with your code: your commission, in green.", "Para cada pago hecho con tu código: tu comisión, en verde.")}</p>}
        {recent.length > 0 ? (
          <ul className="earn-list">
            {recent.map((r, i) => (
              <li className="earn-row" key={`${r.at}-${i}`}>
                <span className="earn-when">{stamp(r.at)}</span>
                <span className="earn-what">
                  <b>{planName(r.plan)}</b> · {r.first ? T("1er paiement avec ton code", "first payment with your code", "primer pago con tu código") : T("renouvellement", "renewal", "renovación")}
                  {r.state === "refunded" && <em> · {T("remboursé", "refunded", "reembolsado")}</em>}
                  {r.state === "partial" && <em> · {T("remboursé en partie", "partly refunded", "reembolsado en parte")}</em>}
                </span>
                <span className={r.commission > 0 ? "earn-gain" : "earn-none"}>{r.commission > 0 ? "+" : ""}{cur(r.commission, r.currency)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="acc-help">{T("Aucun paiement pour l'instant. Les paiements faits avec ton code, et leurs renouvellements, s'afficheront ici.", "No payments yet. Payments made with your code, and their renewals, will show up here.", "Todavía no hay pagos. Los pagos hechos con tu código, y sus renovaciones, aparecerán aquí.")}</p>
        )}
        <p className="acc-help">{T("Aucun nom ni e-mail d'abonné n'est affiché : tu vois seulement des chiffres. Une question sur un versement ? Écris-nous à ", "No subscriber name or email is shown: you only see figures. A question about a payout? Write to us at ", "No se muestra ningún nombre ni correo de suscriptores: solo ves cifras. ¿Una duda sobre un pago? Escríbenos a ")}<a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
      </section>
    </div>
  );
}
