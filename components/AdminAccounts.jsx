"use client";
// Admin : comptes Basketlog (e-mail ou Google). Liste des derniers comptes et export des adresses : toutes, ou seulement
// celles qui ont accepté de recevoir des e-mails (les seules à utiliser pour un envoi d'analyses ou d'offres).
import { useMemo, useState } from "react";

const DAY = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", year: "numeric" });
const d = (ms) => { try { return ms ? DAY.format(new Date(ms)) : "–"; } catch { return "–"; } };
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function AdminAccounts({ comptes }) {
  const [only, setOnly] = useState(false);
  const [copied, setCopied] = useState("");
  const [shown, setShown] = useState(50);
  const rows = useMemo(() => (only ? comptes.list.filter((c) => c.marketing) : comptes.list), [comptes.list, only]);

  const copy = async () => {
    const text = rows.map((c) => c.email).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`${rows.length} adresse${rows.length > 1 ? "s" : ""} copiée${rows.length > 1 ? "s" : ""}.`);
    } catch {
      setCopied("Copie impossible : sélectionne la liste à la main.");
    }
    setTimeout(() => setCopied(""), 4000);
  };
  const download = () => {
    const head = ["email", "prenom", "langue", "accord_emails", "google", "abonnement_relie", "cree_le", "derniere_connexion"];
    const lines = rows.map((c) => [c.email, c.nom || "", c.langue || "", c.marketing ? "oui" : "non", c.google ? "oui" : "non", c.relie ? "oui" : "non", c.cree ? new Date(c.cree).toISOString() : "", c.vu ? new Date(c.vu).toISOString() : ""].map(csvCell).join(","));
    const blob = new Blob([`﻿${head.join(",")}\n${lines.join("\n")}\n`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `comptes-basketlog${only ? "-accord-emails" : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <>
      <div className="adm-actions st-acc-actions">
        <label className="acc-check"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Seulement les comptes qui acceptent les e-mails ({comptes.marketing})</label>
        <button type="button" className="acc-btn" onClick={copy} disabled={!rows.length}>Copier les adresses ({rows.length})</button>
        <button type="button" className="acc-btn" onClick={download} disabled={!rows.length}>Télécharger (CSV)</button>
        {copied && <span className="adm-help" role="status">{copied}</span>}
      </div>
      {!rows.length ? (
        <p className="adm-help">Aucun compte pour l&apos;instant.</p>
      ) : (
        <div className="st-table-wrap">
          <table className="st-table">
            <thead><tr><th>Adresse e-mail</th><th>Inscription</th><th>Connexion</th><th>Accord e-mails</th><th>Abonnement relié</th><th>Dernière visite</th></tr></thead>
            <tbody>
              {rows.slice(0, shown).map((c) => (
                <tr key={c.email}>
                  <td>{c.email}{c.nom ? <small> · {c.nom}</small> : null}</td>
                  <td>{d(c.cree)}</td>
                  <td>{c.google ? "Google" : "E-mail"}</td>
                  <td>{c.marketing ? "oui" : "non"}</td>
                  <td>{c.relie ? "oui" : "–"}</td>
                  <td>{d(c.vu)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > shown && <button type="button" className="acc-link" onClick={() => setShown(shown + 100)}>Voir plus ({rows.length - shown} autres)</button>}
    </>
  );
}
