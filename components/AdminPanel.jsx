"use client";
import { useEffect, useState } from "react";

const DAY = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });
const STAMP = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const day = (iso) => { try { return DAY.format(new Date(iso)); } catch { return ""; } };
const stamp = (iso) => { try { return STAMP.format(new Date(iso)); } catch { return ""; } };
const inviteUrl = (code) => `${typeof location !== "undefined" ? location.origin : "https://basketlog-app.com"}/invitation/${code}`;

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

// Ce que contient chaque formule : mêmes lignes que la page des formules (components/ProPlans.jsx) et les CGU.
// À mettre à jour en même temps qu'elles si une offre change.
const FORMULES = [
  { id: null, name: "Visiteur", price: "Gratuit, sans compte", lines: ["Probabilités de victoire et chiffres clés de chaque match", "Aperçu de chaque analyse : forme récente, résumé rapide, scénario n°1, confiance du modèle", "Classements, fiches équipes et bilan du modèle"] },
  { id: "compte", name: "Compte gratuit", price: "0 €", lines: ["Tout ce que voit un visiteur", "Aucune analyse complète (0 par jour), comme Visifoot", "Compte Whop : e-mail, Google ou Apple"] },
  { id: "starter", name: "Starter", price: "10 € par mois", lines: ["1 analyse par jour", "Analyse réduite : probabilités exactes et stats clés", "Sans engagement, résiliable depuis Whop"] },
  { id: "pro", name: "Pro", price: "19 € par mois", lines: ["Analyses complètes illimitées", "Scénarios probables détaillés et analyse statistique", "Actualités en temps réel", "Sans engagement, résiliable depuis Whop"] },
  { id: "lifetime", name: "Lifetime", price: "99 € une seule fois", lines: ["Tout ce qu'offre Pro, à vie", "Plus aucun paiement mensuel", "Priorité sur les nouveautés"] },
];

const Check = ({ ok, children }) => (
  <li className={ok ? "ok" : "ko"}><span aria-hidden>{ok ? "✓" : "✕"}</span>{children}</li>
);

// Espace admin : avis à relire (publier, retirer, supprimer), formules et aperçu client, comptes créateurs et admins,
// liens d'invitation, état du back-office.
export default function AdminPanel({ initial, me, preview = null, health = null }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(initial ? "" : "Impossible de charger les données. Réessaie.");
  const [confirm, setConfirm] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(""), 4000); // une suppression se confirme dans les 4 secondes
    return () => clearTimeout(t);
  }, [confirm]);

  async function act(action, payload = {}, key = action) {
    setBusy(key);
    setError("");
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
      const j = await res.json().catch(() => ({}));
      if (!j.ok) { setError(j.error || "Une erreur est survenue."); return null; }
      setData(j.data);
      return j;
    } catch {
      setError("Connexion impossible, réessaie.");
      return null;
    } finally {
      setBusy("");
      setConfirm("");
    }
  }

  const twoStep = (key, run) => (confirm === key ? run() : setConfirm(key));

  async function invite(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const j = await act("inviter", { note: f.get("note"), role: f.get("role") }, "inviter");
    if (j?.code) {
      const url = inviteUrl(j.code);
      setLink(url);
      e.target.reset?.();
      if (await copyText(url)) setCopied("new");
    }
  }

  async function copy(text, key) {
    if (await copyText(text)) { setCopied(key); setTimeout(() => setCopied(""), 2500); }
  }

  // Voir le site comme un client de cette formule (null : redevenir admin).
  async function view(tier) {
    setBusy(`v-${tier}`);
    setError("");
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "apercu", tier }) });
      const j = await res.json().catch(() => ({}));
      if (!j.ok) { setError(j.error || "Aperçu impossible pour le moment."); setBusy(""); return; }
      try { sessionStorage.removeItem("bl_tier_reload"); } catch {}
      window.location.href = tier ? "/app/matchs" : "/app/admin";
    } catch {
      setError("Connexion impossible, réessaie.");
      setBusy("");
    }
  }

  if (!data) {
    return (
      <section className="panel adm">
        <p className="adm-err">{error}</p>
        <button type="button" className="adm-btn primary" onClick={() => act("lister")} disabled={!!busy}>Réessayer</button>
      </section>
    );
  }

  const pending = data.avis.filter((a) => !a.approuve).length;

  return (
    <>
      {error && <p className="adm-err" role="alert">{error}</p>}

      <section className="panel adm" aria-labelledby="adm-avis">
        <div className="adm-head">
          <h2 id="adm-avis">Avis</h2>
          <span className={`adm-count ${pending ? "on" : ""}`}>{pending ? `${pending} en attente` : "Rien à relire"}</span>
        </div>
        <p className="adm-help">Un avis n&apos;apparaît sur le site qu&apos;une fois publié. Il faut un compte, gratuit ou abonné, pour en déposer, un par compte.</p>
        {!data.avis.length ? (
          <p className="adm-empty">Aucun avis pour l&apos;instant.</p>
        ) : (
          <ul className="adm-list">
            {data.avis.map((a) => (
              <li key={a.id} className={`adm-avis ${a.approuve ? "pub" : "wait"}`}>
                <div className="adm-meta">
                  <b>{a.prenom}</b>
                  {a.profil && <span>{a.profil}</span>}
                  <span className="adm-stars" aria-label={`${a.note} étoile${a.note > 1 ? "s" : ""} sur 5`}>{"★".repeat(a.note)}<i>{"★".repeat(5 - a.note)}</i></span>
                </div>
                <p className="adm-text">{a.texte}</p>
                <div className="adm-foot">
                  <span className={`adm-tag ${a.approuve ? "ok" : "wait"}`}>{a.approuve ? "Publié" : "En attente"}</span>
                  <span className={`adm-tag ${a.compte ? "ok" : ""}`}>{a.compte ? ({ compte: "Compte gratuit", starter: "Abonné Starter", pro: "Abonné Pro", lifetime: "Abonné Lifetime" }[a.formule] || "Compte vérifié") : "Sans compte (ancien formulaire)"}</span>
                  <span className="adm-date">{stamp(a.created_at)}</span>
                  <span className="adm-actions">
                    {a.approuve ? (
                      <button type="button" className="adm-btn" disabled={!!busy} onClick={() => act("avis_retirer", { id: a.id }, `r-${a.id}`)}>Retirer du site</button>
                    ) : (
                      <button type="button" className="adm-btn primary" disabled={!!busy} onClick={() => act("avis_publier", { id: a.id }, `p-${a.id}`)}>Publier</button>
                    )}
                    <button type="button" className={`adm-btn danger ${confirm === `d-${a.id}` ? "armed" : ""}`} disabled={!!busy} onClick={() => twoStep(`d-${a.id}`, () => act("avis_supprimer", { id: a.id }, `d-${a.id}`))}>
                      {confirm === `d-${a.id}` ? "Confirmer la suppression" : "Supprimer"}
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel adm" id="formules" aria-labelledby="adm-formules">
        <div className="adm-head">
          <h2 id="adm-formules">Formules et accès</h2>
          {preview && <span className="adm-count on">Aperçu en cours : {FORMULES.find((f) => f.id === preview)?.name || preview}</span>}
        </div>
        <p className="adm-help">
          Ce que chaque client obtient réellement. « Voir comme ce client » ouvre le site avec exactement ses droits ; une barre en bas
          de l&apos;écran te permet de revenir en admin. Les analyses lancées pendant un aperçu sont comptées à part, sans toucher à ton compte.
        </p>
        <div className="adm-plans">
          {FORMULES.map((f) => (
            <article key={f.name} className={`adm-plan ${preview && preview === f.id ? "on" : ""}`}>
              <div className="adm-plan-top"><b>{f.name}</b><span>{f.price}</span></div>
              <ul>{f.lines.map((l) => <li key={l}>{l}</li>)}</ul>
              <div className="adm-plan-foot">
                {f.id ? (
                  <button type="button" className="adm-btn primary" disabled={!!busy} onClick={() => view(f.id)}>{busy === `v-${f.id}` ? "Ouverture…" : "Voir comme ce client"}</button>
                ) : (
                  <span className="adm-note">Pour la vue visiteur : ouvre le site dans une fenêtre de navigation privée.</span>
                )}
                {health?.checkout?.[f.id] && <a className="adm-link-out" href={health.checkout[f.id]} target="_blank" rel="noopener noreferrer">{f.id === "compte" ? "Page d'inscription Whop" : "Page de paiement Whop"} ↗</a>}
              </div>
            </article>
          ))}
        </div>
        {preview && <button type="button" className="adm-btn" disabled={!!busy} onClick={() => view(null)}>Quitter l&apos;aperçu</button>}
        {!health?.ai && <p className="adm-help">Les questions à l&apos;IA (Pro : 1 par jour, Lifetime : illimitées) restent cachées partout tant que l&apos;IA n&apos;est pas branchée.</p>}
      </section>

      <section className="panel adm" aria-labelledby="adm-acces">
        <div className="adm-head"><h2 id="adm-acces">Créateurs et admins</h2></div>
        <p className="adm-help">
          Crée un lien et envoie-le à ton créateur. Il se connecte (ou crée son compte gratuit), puis active son accès : il voit toute l&apos;application,
          comme un abonné Lifetime, sans payer. Un créateur ne peut ni relire les avis ni en laisser. Chaque lien ne sert qu&apos;une fois et expire après 30 jours.
        </p>
        <form className="adm-invite" onSubmit={invite}>
          <label><span>Nom du créateur</span><input name="note" maxLength={80} placeholder="Ex : @tipoff_off" autoComplete="off" /></label>
          <label><span>Accès</span>
            <select name="role" defaultValue="createur">
              <option value="createur">Créateur : toute l&apos;application</option>
              <option value="admin">Admin : application, avis et invitations</option>
            </select>
          </label>
          <button type="submit" className="adm-btn primary" disabled={!!busy}>{busy === "inviter" ? "Création…" : "Créer le lien"}</button>
        </form>
        {link && (
          <div className="adm-link">
            <code>{link}</code>
            <button type="button" className="adm-btn" onClick={() => copy(link, "new")}>{copied === "new" ? "Copié" : "Copier"}</button>
          </div>
        )}

        {data.invitations.length > 0 && (
          <>
            <h3>Liens pas encore utilisés</h3>
            <ul className="adm-rows">
              {data.invitations.map((i) => (
                <li key={i.code}>
                  <span><b>{i.note || "Sans nom"}</b> · {i.role === "admin" ? "Admin" : "Créateur"} · expire le {day(i.expire_le)}</span>
                  <span className="adm-actions">
                    <button type="button" className="adm-btn" onClick={() => copy(inviteUrl(i.code), i.code)}>{copied === i.code ? "Copié" : "Copier le lien"}</button>
                    <button type="button" className="adm-btn danger" disabled={!!busy} onClick={() => act("annuler_invitation", { code: i.code }, `a-${i.code}`)}>Annuler</button>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3>Comptes avec accès</h3>
        <ul className="adm-rows">
          {data.roles.map((r) => (
            <li key={r.uid}>
              <span><b>{r.nom || r.uid}</b>{r.note ? ` · ${r.note}` : ""} · {r.role === "admin" ? "Admin" : "Créateur"} · depuis le {day(r.ajoute_le)}</span>
              {r.uid === me ? (
                <span className="adm-tag ok">Toi</span>
              ) : (
                <button type="button" className={`adm-btn danger ${confirm === `x-${r.uid}` ? "armed" : ""}`} disabled={!!busy} onClick={() => twoStep(`x-${r.uid}`, () => act("retirer_acces", { uid: r.uid }, `x-${r.uid}`))}>
                  {confirm === `x-${r.uid}` ? "Confirmer" : "Retirer l'accès"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {health && (
        <section className="panel adm" aria-labelledby="adm-etat">
          <div className="adm-head"><h2 id="adm-etat">État du back-office</h2></div>
          <ul className="adm-checks">
            <Check ok={health.login}>Connexion « Se connecter avec Whop » configurée</Check>
            <Check ok={health.products.starter && health.products.pro && health.products.lifetime}>Produits Starter, Pro et Lifetime reliés au site</Check>
            <Check ok={!!health.seen && health.seen !== "erreur"}>
              {health.seen && health.seen !== "erreur"
                ? <>Vérification d&apos;abonnement chez Whop : ton compte est vu en <b>{FORMULES.find((f) => f.id === health.seen)?.name || health.seen}</b></>
                : "Vérification d'abonnement chez Whop : pas de réponse"}
            </Check>
            <Check ok={health.db}>Base de données (avis, analyses, accès) joignable</Check>
            <li className="na"><span aria-hidden>–</span>IA : {health.ai ? "branchée" : "désactivée volontairement, jusqu'aux premiers revenus"}</li>
          </ul>
          <p className="adm-help">
            Clients, paiements et virements : <a className="adm-link-out" href="https://whop.com/dashboard/biz_pE2L6siofBGnW6/" target="_blank" rel="noopener noreferrer">tableau de bord Whop ↗</a>
          </p>
        </section>
      )}
    </>
  );
}
