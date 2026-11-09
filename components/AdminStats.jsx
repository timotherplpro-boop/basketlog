import Link from "next/link";
import { money } from "../lib/pricing";
import { SOURCES, DEVICES } from "../lib/funnel-steps";
import AdminNav from "./AdminNav";
import AdminAccounts from "./AdminAccounts";

// Page Statistiques de l'admin (données : lib/admin-stats.js). Rendu seul, sans appel réseau.
export const PERIODS = [7, 30, 90];
const PLAN = { starter: "Starter", pro: "Pro", lifetime: "Lifetime" };
const LANG = { fr: "Français", en: "Anglais", es: "Espagnol" };
const DAY = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });
const DAYY = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", year: "numeric" });
const STAMP = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const MONTH = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "long" });
const NUM = new Intl.NumberFormat("fr-FR");

const d = (ms) => { try { return ms ? DAY.format(new Date(ms)) : "–"; } catch { return "–"; } };
const dy = (ms) => { try { return ms ? DAYY.format(new Date(ms)) : "–"; } catch { return "–"; } };
const dayOf = (s) => d(Date.parse(`${s}T12:00:00Z`));
const n = (x) => NUM.format(x || 0);
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : "–");
const monthName = (key) => { try { return MONTH.format(new Date(`${key}-15T12:00:00Z`)); } catch { return key; } };
// Montants par monnaie : « 123,60 € · 26,39 $ » (rien encaissé : « 0 € »).
function cash(bag) {
  const parts = Object.entries(bag || {}).filter(([, v]) => v).map(([cur, v]) => money(v, cur, null));
  return parts.length ? parts.join(" · ") : "0 €";
}

function WhopNote({ fail, what, scope }) {
  if (!fail) return null;
  return (
    <p className="adm-err">
      Whop n&apos;a pas répondu pour {what}{fail.status ? ` (erreur ${fail.status})` : ""}.
      {fail.status === 403 || fail.status === 401 ? <> La clé API du site n&apos;a pas le droit de les lire{scope ? <> : dans Whop, ajoute l&apos;autorisation <code>{scope}</code> à la clé</> : null}.</> : " Réessaie dans un instant."}
    </p>
  );
}

export default function AdminStats({ st }) {
  const days = st.days;
  const k = st.kpi;
  const f = st.funnel;
  const top = f?.steps?.[0]?.n || 0;
  const maxDay = f ? Math.max(1, ...f.days.map((x) => x.visite)) : 1;
  const conv = f && top ? f.steps[f.steps.length - 1].n / top : null;

  return (
    <main className="app-page wide">
      <div className="app-head">
        <h1>Statistiques</h1>
        <p>Abonnés, paiements, codes créateurs et parcours des visiteurs jusqu&apos;au paiement.</p>
      </div>
      <AdminNav active="stats" />

      <div className="st-period" role="tablist" aria-label="Période">
        {PERIODS.map((p) => (
          <Link key={p} href={`/app/admin/stats?p=${p}`} className={p === days ? "on" : ""} role="tab" aria-selected={p === days}>{p} jours</Link>
        ))}
        <span className="st-asof">Du {dayOf(st.sinceDay)} au {dayOf(st.today)} · mis à jour à {STAMP.format(new Date(st.generatedAt)).split(" ").pop()}</span>
      </div>

      {/* ================= EN BREF ================= */}
      <section className="panel adm" aria-labelledby="st-bref">
        <div className="adm-head"><h2 id="st-bref">En bref</h2></div>
        <WhopNote fail={st.whop.memberships} what="les abonnements" />
        <div className="st-kpis">
          <div className="st-kpi hero"><span>Abonnés actifs</span><strong>{n(k.active)}</strong><small>Starter {k.byPlan.starter} · Pro {k.byPlan.pro} · Lifetime {k.byPlan.lifetime}</small></div>
          <div className="st-kpi"><span>Encaissé sur {days} jours</span><strong className="st-money">{st.whop.payments ? "–" : cash(k.revenue)}</strong><small>remboursements déduits</small></div>
          <div className="st-kpi"><span>Revenu mensuel récurrent</span><strong className="st-money">{cash(k.mrr)}</strong><small>abonnements mensuels en cours, hors résiliations prévues</small></div>
          <div className="st-kpi"><span>Nouveaux abonnés</span><strong>{n(k.newSubs)}</strong><small>sur {days} jours</small></div>
          <div className="st-kpi"><span>Résiliations</span><strong>{n(k.cancels)}</strong><small>{k.scheduled ? `+ ${k.scheduled} prévue${k.scheduled > 1 ? "s" : ""} en fin de mois` : "aucune résiliation prévue"}</small></div>
          <div className="st-kpi"><span>Nouveaux comptes Whop</span><strong>{st.whop.members ? "–" : n(k.newMembers)}</strong><small>gratuits et payants, sur {days} jours</small></div>
          <div className="st-kpi"><span>Visite → abonnement</span><strong>{conv == null ? "–" : `${(conv * 100).toFixed(1).replace(".", ",")} %`}</strong><small>{f && top ? `${n(f.steps[f.steps.length - 1].n)} abonné${f.steps[f.steps.length - 1].n > 1 ? "s" : ""} pour ${n(top)} visites` : "parcours pas encore mesuré"}</small></div>
          <div className="st-kpi"><span>Analyses complètes ouvertes</span><strong>{st.db.usage ? "–" : n(k.analyses)}</strong><small>par les comptes, sur {days} jours</small></div>
        </div>
      </section>

      {/* ================= COMPTES BASKETLOG ================= */}
      <section className="panel adm" aria-labelledby="st-comptes">
        <div className="adm-head">
          <h2 id="st-comptes">Comptes Basketlog</h2>
          {st.comptes && <span className="adm-count">{n(st.comptes.total)} au total</span>}
        </div>
        {!st.comptes ? (
          <p className="adm-help">Les comptes par e-mail et Google ne sont pas encore activés dans la base (script <code>supabase/comptes.sql</code>), ou la base ne répond pas.</p>
        ) : (
          <>
            <div className="st-kpis">
              <div className="st-kpi hero"><span>Comptes créés</span><strong>{n(st.comptes.total)}</strong><small>{n(st.comptes.periode)} sur {days} jours</small></div>
              <div className="st-kpi"><span>Avec Google</span><strong>{n(st.comptes.google)}</strong><small>{pct(st.comptes.google, st.comptes.total)} des comptes</small></div>
              <div className="st-kpi"><span>Acceptent les e-mails</span><strong>{n(st.comptes.marketing)}</strong><small>{pct(st.comptes.marketing, st.comptes.total)} des comptes</small></div>
              <div className="st-kpi"><span>Abonnement relié</span><strong>{n(st.comptes.relies)}</strong><small>compte Whop relié après paiement</small></div>
            </div>
            <AdminAccounts comptes={st.comptes} />
          </>
        )}
      </section>

      {/* ================= PARCOURS ================= */}
      <section className="panel adm" aria-labelledby="st-parcours">
        <div className="adm-head">
          <h2 id="st-parcours">Où le client s&apos;arrête avant de payer</h2>
          {f && <span className="adm-count">compté depuis le {dayOf(f.startDay)}</span>}
        </div>
        {!f ? (
          <p className="adm-help">Les compteurs du parcours ne sont pas encore activés dans la base. Dès que le script Supabase est lancé, chaque étape apparaît ici.</p>
        ) : (
          <>
            {f.worst && f.worst.lost > 0 && (
              <p className="st-alert">
                C&apos;est ici que tu perds le plus de monde : <b>{Math.round(f.worst.lost * 100)} %</b> des visiteurs arrivés à « {f.worst.from.label} »
                ne vont pas jusqu&apos;à « {f.worst.to.label} ».
              </p>
            )}
            <ol className="st-funnel">
              {f.steps.map((x, i) => {
                const prev = i ? f.steps[i - 1].n : null;
                const lost = prev != null ? Math.max(0, prev - x.n) : 0;
                const bad = f.worst && f.worst.to.id === x.id;
                return (
                  <li key={x.id} className={bad ? "bad" : ""}>
                    {i > 0 && <span className="st-drop">{lost ? `− ${n(lost)} (${pct(lost, prev)})` : "personne de perdu"}</span>}
                    <div className="st-step">
                      <div className="st-label"><b>{i + 1}. {x.label}</b><small>{x.hint}</small></div>
                      <div className="st-bar" aria-hidden><i style={{ width: `${top ? Math.max(1.5, (x.n / top) * 100) : 0}%` }} /></div>
                      <div className="st-num"><b>{n(x.n)}</b><small>{i === 0 ? "visites" : `${pct(x.n, prev)} de l'étape d'avant`}</small></div>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="adm-help">
              À côté : {n(f.side.compte)} compte{f.side.compte > 1 ? "s" : ""} gratuit{f.side.compte > 1 ? "s" : ""} créé{f.side.compte > 1 ? "s" : ""} depuis le site,
              {" "}{n(f.side.retour)} retour{f.side.retour > 1 ? "s" : ""} sur le site juste après un paiement. La dernière étape vient de Whop (nouveaux abonnés depuis le {dayOf(f.from)}).
            </p>

            <h3>Chaque jour</h3>
            <div className="st-days" role="img" aria-label="Visites et clics sur une formule par jour">
              {f.days.map((x) => (
                <div key={x.day} className="st-day" title={`${dayOf(x.day)} : ${x.visite} visites, ${x.fenetre} fenêtres, ${x.clic} clics sur une formule`}>
                  <i style={{ height: `${(x.visite / maxDay) * 100}%` }} />
                  {x.clic > 0 && <em>{x.clic}</em>}
                </div>
              ))}
            </div>
            <p className="st-legend"><span className="sw" /> visites · le chiffre au-dessus d&apos;une barre = clics sur une formule ce jour-là</p>
          </>
        )}
      </section>

      {/* ================= SOURCES ================= */}
      {f && (
        <section className="panel adm" aria-labelledby="st-sources">
          <div className="adm-head"><h2 id="st-sources">D&apos;où viennent les visiteurs</h2></div>
          <p className="adm-help">Même parcours, découpé par source d&apos;arrivée : tu vois quel réseau amène des visiteurs qui vont jusqu&apos;aux formules.</p>
          <div className="st-table-wrap">
            <table className="st-table">
              <thead><tr><th>Source</th><th>Visites</th><th>Analyse</th><th>Fenêtre</th><th>Formules</th><th>Clic formule</th><th>Clic / visite</th></tr></thead>
              <tbody>
                {f.sources.map((r) => (
                  <tr key={r.key}>
                    <td>{SOURCES[r.key] || r.key}</td>
                    <td>{n(r.visite)}</td><td>{n(r.fiche)}</td><td>{n(r.fenetre)}</td><td>{n(r.pro)}</td><td>{n(r.clic)}</td>
                    <td className="st-strong">{pct(r.clic || 0, r.visite || 0)}</td>
                  </tr>
                ))}
                {!f.sources.length && <tr><td colSpan={7} className="st-empty">Pas encore de visite comptée sur cette période.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="st-split">
            {[["Appareil", f.devices, DEVICES], ["Langue du site", f.langs, LANG]].map(([title, list, names]) => (
              <div key={title}>
                <h3>{title}</h3>
                <ul className="st-mini">
                  {list.map((r) => (
                    <li key={r.key}><span>{names[r.key] || r.key}</span><b>{n(r.visite)} visites</b><small>{pct(r.pro || 0, r.visite || 0)} voient les formules · {pct(r.clic || 0, r.visite || 0)} cliquent</small></li>
                  ))}
                  {!list.length && <li className="st-empty">–</li>}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= ABONNÉS ================= */}
      <section className="panel adm" aria-labelledby="st-abonnes">
        <div className="adm-head">
          <h2 id="st-abonnes">Abonnés</h2>
          <span className="adm-count">{n(st.subs.length)} abonnement{st.subs.length > 1 ? "s" : ""} payant{st.subs.length > 1 ? "s" : ""} au total</span>
        </div>
        <WhopNote fail={st.whop.memberships} what="les abonnements" />
        {st.subs.length ? (
          <div className="st-table-wrap">
            <table className="st-table">
              <thead><tr><th>Abonné</th><th>Formule</th><th>Depuis</th><th>Statut</th><th>Code promo</th><th>Analyses ouvertes</th><th>Dernière analyse</th></tr></thead>
              <tbody>
                {st.subs.map((x) => (
                  <tr key={x.id} className={x.live ? "" : "off"}>
                    <td>{x.name}{x.handle && <small> · compte Whop {x.handle}</small>}{x.role && <span className="adm-tag ok st-tag">{x.role === "admin" ? "Toi / admin" : "Créateur"}</span>}</td>
                    <td>{PLAN[x.plan] || x.plan}</td>
                    <td>{dy(x.created)}</td>
                    <td>{x.state}{x.until ? <small> · fin le {dy(x.until)}</small> : null}{x.reason ? <small> · raison : {x.reason}</small> : null}</td>
                    <td>{x.code || "–"}</td>
                    <td>{n(x.analyses)}{x.days ? <small> · {x.days} jour{x.days > 1 ? "s" : ""}</small> : null}</td>
                    <td>{x.last ? dy(Date.parse(x.last)) : "jamais"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !st.whop.memberships && <p className="adm-empty">Pas encore d&apos;abonnement payant.</p>
        )}
        <p className="adm-help">Un abonné qui n&apos;ouvre plus d&apos;analyse risque de résilier : c&apos;est le bon moment pour le relancer.</p>
      </section>

      {/* ================= CODES CRÉATEURS ================= */}
      <section className="panel adm" aria-labelledby="st-codes">
        <div className="adm-head"><h2 id="st-codes">Codes créateurs</h2></div>
        <p className="adm-help">Ce que chaque code promo a rapporté et la commission de 20 % à verser au créateur, mois par mois (paiements encaissés, remboursements déduits).</p>
        <WhopNote fail={st.whop.codes} what="les codes promo" />
        <WhopNote fail={st.whop.payments} what="les paiements" scope="payment:basic:read" />
        {st.creatorCodes.length ? (
          <div className="st-table-wrap">
            <table className="st-table">
              <thead><tr><th>Code</th><th>Réduction</th><th>Utilisations</th><th>Abonnés actifs</th><th>Encaissé sur {days} j</th><th>Commission {monthName(st.monthLabels.thisMonth)}</th><th>Commission {monthName(st.monthLabels.lastMonth)}</th></tr></thead>
              <tbody>
                {st.creatorCodes.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.code}</b>{c.affiliate && <small> · {c.affiliate}</small>}</td>
                    <td>{c.off || "–"}</td>
                    <td>{n(c.uses)}</td>
                    <td>{n(c.subs)}</td>
                    <td>{cash(c.period)}</td>
                    <td className="st-strong">{cash(c.monthCommission)}</td>
                    <td>{cash(c.prevCommission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !st.whop.codes && <p className="adm-empty">Aucun code promo actif pour l&apos;instant.</p>
        )}
      </section>

      {/* ================= PAIEMENTS ================= */}
      <section className="panel adm" aria-labelledby="st-paiements">
        <div className="adm-head"><h2 id="st-paiements">Derniers paiements</h2></div>
        <WhopNote fail={st.whop.payments} what="les paiements" scope="payment:basic:read" />
        {st.recent.length ? (
          <div className="st-table-wrap">
            <table className="st-table">
              <thead><tr><th>Date</th><th>Abonné</th><th>Formule</th><th>Montant</th><th>Code promo</th><th>Statut</th></tr></thead>
              <tbody>
                {st.recent.map((p) => (
                  <tr key={p.id}>
                    <td>{STAMP.format(new Date(p.at))}</td>
                    <td>{p.name}</td>
                    <td>{PLAN[p.plan] || "–"}{p.first ? <small> · 1er paiement</small> : null}</td>
                    <td>{money(p.total, p.currency.toUpperCase(), null)}{p.refunded ? <small> · remboursé {money(p.refunded, p.currency.toUpperCase(), null)}</small> : null}</td>
                    <td>{p.code || "–"}</td>
                    <td>{p.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !st.whop.payments && <p className="adm-empty">Aucun paiement depuis le {dy(Date.parse(`${st.sinceDay}T12:00:00Z`))}.</p>
        )}
      </section>

      <p className="adm-help st-foot">
        Parcours : compté pour tous les visiteurs, sans cookie ni identifiant (un onglet ouvert = une visite) ; l&apos;admin, les créateurs et les abonnés ne comptent pas.
        Abonnements, paiements et codes : Whop, lu en direct{st.whop.partial ? " (lecture plafonnée à 2 000 fiches : les chiffres sont des minimums)" : ""}.
        Détails des paiements et virements : <a className="adm-link-out" href="https://whop.com/dashboard/biz_pE2L6siofBGnW6/" target="_blank" rel="noopener noreferrer">tableau de bord Whop ↗</a>
      </p>
    </main>
  );
}
