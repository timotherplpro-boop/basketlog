"use client";
// Jeu « Bats le modèle » : choix des vainqueurs, résultats du joueur face au modèle, partage du score.
// Les choix sont gardés dans le navigateur (toujours) et, pour un membre connecté, enregistrés sur le serveur
// (/api/defi) pour le classement de la semaine.
import { useEffect, useMemo, useRef, useState } from "react";
import { openAuth } from "../lib/auth-client";
import { scoreByDay } from "../lib/defi-score";

const KEY = "bl-defi-v1";
const readLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; } };
const writeLocal = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };

const LABELS = {
  fr: {
    saved: "Choix enregistrés ✔", savedLocal: "Choix gardés sur cet appareil ✔", closed: "Ce match a déjà commencé : choix fermé.",
    lastTitle: (d) => `Ton score (${d})`, you: "Toi", model: "Modèle", won: "🏆 Tu as battu le modèle !", tie: "🤝 Égalité avec le modèle.", lost: "🤖 Le modèle gagne cette fois. Revanche ce soir ?",
    weekLine: (me, m, n) => `Cette semaine : toi ${me}/${n}, le modèle ${m}/${n}.`, share: "Partager mon score", copied: "Lien copié !",
    shareText: (me, m, n) => me > m ? `J'ai battu le modèle Basketlog : ${me} bons choix sur ${n}, contre ${m} pour lui. À toi de jouer :` : `${me} bons choix sur ${n} contre le modèle Basketlog (${m}). Tu fais mieux ?`,
    pickTitle: "Tes choix", none: "Pas de match à choisir pour le moment. Reviens avant les prochains matchs.",
    pickHelp: (c, n) => `Touche l'équipe qui va gagner. ${c} sur ${n} choisi${c > 1 ? "s" : ""}. Tu peux changer d'avis jusqu'au coup d'envoi.`,
    modelPick: "Le modèle :", against: "contre le modèle 🔥",
    loginWhy: "Crée un compte gratuit pour garder tes choix sur tous tes appareils et entrer dans le classement de la semaine.", loginBtn: "Créer mon compte gratuit",
  },
  en: {
    saved: "Picks saved ✔", savedLocal: "Picks saved on this device ✔", closed: "That game has started: picks are closed.",
    lastTitle: (d) => `Your score (${d})`, you: "You", model: "Model", won: "🏆 You beat the model!", tie: "🤝 Tied with the model.", lost: "🤖 The model wins this time. Rematch tonight?",
    weekLine: (me, m, n) => `This week: you ${me}/${n}, the model ${m}/${n}.`, share: "Share my score", copied: "Link copied!",
    shareText: (me, m, n) => me > m ? `I beat the Basketlog model: ${me} of ${n} right, vs ${m} for the model. Your turn:` : `${me} of ${n} right vs the Basketlog model (${m}). Can you do better?`,
    pickTitle: "Your picks", none: "No games to pick right now. Come back before the next games.",
    pickHelp: (c, n) => `Tap the team you think will win. ${c} of ${n} picked. You can change your mind until tip-off.`,
    modelPick: "Model:", against: "against the model 🔥",
    loginWhy: "Create a free account to keep your picks on every device and join this week's leaderboard.", loginBtn: "Create my free account",
  },
  es: {
    saved: "Elecciones guardadas ✔", savedLocal: "Elecciones guardadas en este dispositivo ✔", closed: "Ese partido ya empezó: elección cerrada.",
    lastTitle: (d) => `Tu resultado (${d})`, you: "Tú", model: "Modelo", won: "🏆 ¡Le ganaste al modelo!", tie: "🤝 Empate con el modelo.", lost: "🤖 Esta vez gana el modelo. ¿Revancha esta noche?",
    weekLine: (me, m, n) => `Esta semana: tú ${me}/${n}, el modelo ${m}/${n}.`, share: "Compartir mi resultado", copied: "¡Enlace copiado!",
    shareText: (me, m, n) => me > m ? `Le gané al modelo de Basketlog: ${me} aciertos de ${n}, contra ${m} del modelo. Te toca:` : `${me} aciertos de ${n} contra el modelo de Basketlog (${m}). ¿Lo haces mejor?`,
    pickTitle: "Tus elecciones", none: "No hay partidos para elegir por ahora. Vuelve antes de los próximos partidos.",
    pickHelp: (c, n) => `Toca el equipo que crees que ganará. ${c} de ${n} elegidos. Puedes cambiar de opinión hasta el inicio.`,
    modelPick: "El modelo:", against: "contra el modelo 🔥",
    loginWhy: "Crea una cuenta gratis para guardar tus elecciones en todos tus dispositivos y entrar en la clasificación de la semana.", loginBtn: "Crear mi cuenta gratis",
  },
  pt: {
    saved: "Escolhas salvas ✔", savedLocal: "Escolhas salvas neste aparelho ✔", closed: "Esse jogo já começou: escolha fechada.",
    lastTitle: (d) => `Seu resultado (${d})`, you: "Você", model: "Modelo", won: "🏆 Você venceu o modelo!", tie: "🤝 Empate com o modelo.", lost: "🤖 Desta vez o modelo venceu. Revanche hoje?",
    weekLine: (me, m, n) => `Nesta semana: você ${me}/${n}, o modelo ${m}/${n}.`, share: "Compartilhar meu resultado", copied: "Link copiado!",
    shareText: (me, m, n) => me > m ? `Venci o modelo do Basketlog: ${me} acertos de ${n}, contra ${m} do modelo. Sua vez:` : `${me} acertos de ${n} contra o modelo do Basketlog (${m}). Você faz melhor?`,
    pickTitle: "Suas escolhas", none: "Nenhum jogo para escolher agora. Volte antes dos próximos jogos.",
    pickHelp: (c, n) => `Toque no time que vai vencer. ${c} de ${n} escolhidos. Você pode mudar até o início do jogo.`,
    modelPick: "O modelo:", against: "contra o modelo 🔥",
    loginWhy: "Crie uma conta grátis para guardar suas escolhas em todos os aparelhos e entrar no ranking da semana.", loginBtn: "Criar minha conta grátis",
  },
};

export default function DefiGame({ games, results, serverPicks, logged, dbReady, week, dayLabels, shareBase, lang }) {
  const t = LABELS[lang] || LABELS.fr;
  const [picks, setPicks] = useState(() => Object.fromEntries((serverPicks || []).map((x) => [x.g, x])));
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const queue = useRef(new Map());
  const timer = useRef(null);

  const send = (list) => {
    if (!logged || !dbReady || !list.length) { if (list.length) setStatus(t.savedLocal); return; }
    fetch("/api/defi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ picks: list.map(({ g, p }) => ({ g, p })) }) })
      .then((r) => r.json().catch(() => ({})))
      .then((j) => setStatus(j?.ok ? t.saved : j?.reason === "closed" ? t.closed : t.savedLocal))
      .catch(() => setStatus(t.savedLocal));
  };

  // Au chargement : choix gardés dans ce navigateur (les 3 dernières semaines), fusionnés avec ceux du serveur.
  // Un membre connecté envoie au serveur les choix faits avant de se connecter (matchs encore à venir seulement).
  useEffect(() => {
    const local = readLocal();
    const limit = new Date(Date.now() - 21 * 864e5).toISOString().slice(0, 10).replace(/-/g, "");
    for (const k of Object.keys(local)) if (!local[k]?.d || local[k].d < limit) delete local[k];
    const server = Object.fromEntries((serverPicks || []).map((x) => [x.g, x]));
    const merged = { ...local, ...server };
    writeLocal(merged);
    setPicks(merged);
    const open = new Set(games.map((g) => g.g));
    const toSync = Object.values(local).filter((x) => open.has(x.g) && (!server[x.g] || server[x.g].p !== x.p));
    if (logged && dbReady && toSync.length) send(toSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (g, team) => {
    const x = { g: g.g, d: g.d, p: team, m: g.m };
    setPicks((prev) => { const next = { ...prev, [g.g]: x }; writeLocal(next); return next; });
    queue.current.set(g.g, x);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { const list = [...queue.current.values()]; queue.current.clear(); send(list); }, 500);
  };

  const all = Object.values(picks);
  const days = useMemo(() => scoreByDay(all, results).filter((x) => x.n > 0), [picks, results]); // eslint-disable-line react-hooks/exhaustive-deps
  const last = days[0] || null;
  const weekScore = useMemo(() => days.filter((x) => x.d >= week.from && x.d <= week.to).reduce((a, x) => ({ n: a.n + x.n, me: a.me + x.me, model: a.model + x.model }), { n: 0, me: 0, model: 0 }), [days, week]);
  const chosen = games.filter((g) => picks[g.g]).length;

  const share = async () => {
    if (!last) return;
    const url = `${shareBase}?s=${last.me}-${last.model}-${last.n}`;
    const text = t.shareText(last.me, last.model, last.n);
    try {
      if (navigator.share) { await navigator.share({ text, url }); return; }
    } catch { return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <div className="defi">
      {last && (
        <section className="card block defi-score">
          <h2>{t.lastTitle(dayLabels[last.d] || last.d)}</h2>
          <p className="defi-big"><b>{t.you} {last.me}/{last.n}</b> · {t.model} {last.model}/{last.n}</p>
          <p className="defi-verdict">{last.me > last.model ? t.won : last.me === last.model ? t.tie : t.lost}</p>
          {weekScore.n > last.n && <p className="narr">{t.weekLine(weekScore.me, weekScore.model, weekScore.n)}</p>}
          <button type="button" className="btn-solid defi-share" onClick={share}>{copied ? t.copied : t.share}</button>
        </section>
      )}

      <section className="card block">
        <h2>{t.pickTitle}</h2>
        {!games.length ? <p className="empty">{t.none}</p> : (
          <>
            <p className="narr">{t.pickHelp(chosen, games.length)}</p>
            <div className="defi-list">
              {games.map((g) => {
                const mine = picks[g.g]?.p;
                const against = mine && mine !== g.m;
                return (
                  <div key={g.g} className="defi-game">
                    <div className="defi-when">{g.when}</div>
                    <div className="defi-teams">
                      {[g.away, g.home].map((tm) => (
                        <button key={tm.id} type="button" className={`defi-team${mine === tm.id ? " on" : ""}`} aria-pressed={mine === tm.id} onClick={() => choose(g, tm.id)}>
                          {tm.logo ? <img src={tm.logo} alt="" width="28" height="28" /> : null}
                          <span>{tm.short}</span>
                        </button>
                      ))}
                    </div>
                    <div className="defi-model">{t.modelPick} <b>{g.mShort} {g.mPct}</b>{against ? <span className="defi-against"> · {t.against}</span> : null}</div>
                  </div>
                );
              })}
            </div>
            {status ? <p className="defi-status">{status}</p> : null}
          </>
        )}
        {!logged && (
          <div className="defi-login">
            <p>{t.loginWhy}</p>
            <button type="button" className="btn-solid" onClick={() => openAuth({ mode: "inscription", source: "defi" })}>{t.loginBtn}</button>
          </div>
        )}
      </section>
    </div>
  );
}
