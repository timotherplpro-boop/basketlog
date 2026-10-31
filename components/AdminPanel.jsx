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

// Espace admin : avis à relire (publier, retirer, supprimer), comptes créateurs et admins, liens d'invitation.
export default function AdminPanel({ initial, me }) {
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
        <p className="adm-help">Un avis n&apos;apparaît sur le site qu&apos;une fois publié. Seuls les abonnés peuvent en déposer, un par compte.</p>
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
                  <span className={`adm-tag ${a.abonne ? "ok" : ""}`}>{a.abonne ? "Abonné vérifié" : "Sans compte (ancien formulaire)"}</span>
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
    </>
  );
}
