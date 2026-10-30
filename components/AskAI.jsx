"use client";
// Questions personnelles à l'IA (comme Visifoot) : Pro 1 question par jour, Lifetime illimitées.
// L'IA répond à partir des données de l'analyse du match ; aucune réponse n'est conservée.
import { useState } from "react";
import Link from "next/link";
import { useL } from "./LangProvider";
import { track } from "../lib/analytics";

export default function AskAI({ target, tier, limit = null, used = 0 }) {
  const L = useL();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [thread, setThread] = useState([]);
  const [count, setCount] = useState(used || 0);
  const left = limit == null ? Infinity : Math.max(0, limit - count);

  const suggestions = L.t(
    ["Pourquoi ce favori ?", "Le match peut-il être serré ?", "Qu'est-ce qui peut faire basculer le match ?"],
    ["Why is this team favored?", "Could this be a close game?", "What could swing this game?"],
    ["¿Por qué este favorito?", "¿Puede ser un partido igualado?", "¿Qué puede cambiar el partido?"]
  );

  const send = async (e) => {
    e.preventDefault();
    const question = q.trim();
    if (question.length < 3 || busy || left <= 0) return;
    setBusy(true);
    setErr(null);
    track("Question IA posée", { ligue: target.league, formule: tier });
    try {
      const r = await fetch("/api/pro/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, question, lang: L.lang }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.answer) {
        setThread((t) => [...t, { q: question, a: j.answer }]);
        setQ("");
        if (j.used != null) setCount(j.used);
      } else if (j.error === "limite") {
        setCount(j.used ?? limit ?? count);
        setErr(tier === "pro"
          ? L.t("Ta question du jour est déjà utilisée. Lifetime rend les questions illimitées.", "Today's question is already used. Lifetime makes questions unlimited.", "Ya has usado tu pregunta de hoy. Lifetime hace las preguntas ilimitadas.")
          : L.t("Tu as atteint la limite d'usage raisonnable pour aujourd'hui. Reviens demain.", "You've reached today's fair-use limit. Come back tomorrow.", "Has alcanzado el límite de uso razonable de hoy. Vuelve mañana."));
      } else if (j.error === "connexion") {
        setErr(L.t("Connecte-toi pour poser ta question.", "Log in to ask your question.", "Inicia sesión para hacer tu pregunta."));
      } else if (j.error === "formule") {
        setErr(L.t("Les questions à l'IA sont incluses dans Pro et Lifetime.", "AI questions come with Pro and Lifetime.", "Las preguntas a la IA están incluidas en Pro y Lifetime."));
      } else {
        setErr(L.t("L'IA ne peut pas répondre pour le moment. Réessaie dans un instant.", "The AI can't answer right now. Please try again in a moment.", "La IA no puede responder ahora mismo. Vuelve a intentarlo en un momento."));
      }
    } catch {
      setErr(L.t("Connexion impossible. Réessaie dans un instant.", "Connection failed. Please try again in a moment.", "No hay conexión. Vuelve a intentarlo en un momento."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card block ask">
      <h2>💬 {L.t("Questions personnelles à l'IA", "Personal questions to the AI", "Preguntas personales a la IA")}</h2>
      <p className="ask-sub">{L.t("Pose ta question sur ce match : l'IA te répond à partir des données de l'analyse.", "Ask anything about this game: the AI answers from the analysis data.", "Pregunta lo que quieras sobre este partido: la IA responde a partir de los datos del análisis.")}</p>
      <div className="ask-quota">{limit == null
        ? L.t("Questions illimitées", "Unlimited questions", "Preguntas ilimitadas")
        : L.t(`${Math.min(count, limit)}/${limit} question aujourd'hui`, `${Math.min(count, limit)}/${limit} question today`, `${Math.min(count, limit)}/${limit} pregunta hoy`)}</div>

      {thread.map((t, i) => (
        <div className="ask-turn" key={i}>
          <div className="ask-q">{t.q}</div>
          <div className="ask-a">{t.a}</div>
        </div>
      ))}

      {left > 0 ? (
        <form className="ask-form" onSubmit={send}>
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder={L.t("Ex. : l'absence d'un titulaire change-t-elle le pronostic ?", "E.g. does a starter's absence change the prediction?", "Ej.: ¿la baja de un titular cambia el pronóstico?")}
            aria-label={L.t("Ta question", "Your question", "Tu pregunta")}
          />
          {!thread.length && (
            <div className="ask-chips">
              {suggestions.map((s) => <button type="button" key={s} onClick={() => setQ(s)}>{s}</button>)}
            </div>
          )}
          <button className="btn-solid" disabled={busy || q.trim().length < 3}>
            {busy ? <><span className="an-spin" aria-hidden />{L.t("L'IA réfléchit…", "The AI is thinking…", "La IA está pensando…")}</> : L.t("Demander à l'IA", "Ask the AI", "Preguntar a la IA")}
          </button>
        </form>
      ) : (
        <div className="ask-limit">
          {L.t("Ta question du jour est utilisée : reviens demain, ou passe à ", "Today's question is used: come back tomorrow, or switch to ", "Ya has usado tu pregunta de hoy: vuelve mañana o pásate a ")}
          <Link href={L.href("/pro")}>Lifetime</Link>
          {L.t(" pour des questions illimitées.", " for unlimited questions.", " para preguntas ilimitadas.")}
        </div>
      )}
      {err && <p className="ask-err" role="alert">{err}</p>}
      <small className="ask-note">{L.t("Réponses rédigées par l'IA à partir des données Basketlog. Ce ne sont pas des conseils de pari.", "Answers written by the AI from Basketlog data. They are not betting advice.", "Respuestas redactadas por la IA a partir de los datos de Basketlog. No son consejos de apuestas.")}</small>
    </div>
  );
}
