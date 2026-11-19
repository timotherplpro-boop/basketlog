"use client";
// Widget d'une équipe sur la page /widget : choix de l'équipe, aperçu et code à copier.
import { useState } from "react";
import CopyCode from "./CopyCode";
import { TEAM_WIDGET_HEIGHT, teamEmbedCode } from "../lib/widget";

export default function TeamWidgetPicker({ teams, site, lang, label, copy, done, preview }) {
  const [id, setId] = useState(teams.find((t) => t.id === "13")?.id || teams[0]?.id);
  const team = teams.find((t) => t.id === id) || teams[0];
  return (
    <div className="team-widget">
      <label className="tw-pick">
        {label}{" "}
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <iframe key={team.id} src={`/api/widget?lang=${lang}&team=${team.id}`} title={preview} width="100%" height={TEAM_WIDGET_HEIGHT} style={{ border: 0, maxWidth: 420, display: "block", margin: "12px 0" }} loading="lazy" />
      <CopyCode code={teamEmbedCode(site, team, lang, "auto")} label={copy} done={done} />
    </div>
  );
}
