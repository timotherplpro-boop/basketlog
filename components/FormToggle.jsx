"use client";
import { useState } from "react";
import { useL } from "./LangProvider";

// « Forme récente » façon Visifoot : forme globale, ou bilan à domicile / à l'extérieur d'un clic.
export default function FormToggle({ home, away, splits }) {
  const L = useL();
  const [loc, setLoc] = useState(false);
  const Side = ({ t, label, split }) => (
    <div className="ar-fside">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {t.logo ? <img src={t.logo} alt="" /> : <span className="ph" />}
      <div>
        <b>{t.name}</b>
        <small>{loc ? split : label}</small>
      </div>
    </div>
  );
  return (
    <>
      <div className="ar-fsides">
        <Side t={home.team} label={home.label} split={L.t(`À domicile : ${splits.home || "–"}`, `At home: ${splits.home || "–"}`, `En casa: ${splits.home || "–"}`)} />
        <Side t={away.team} label={away.label} split={L.t(`À l'extérieur : ${splits.away || "–"}`, `On the road: ${splits.away || "–"}`, `Fuera: ${splits.away || "–"}`)} />
      </div>
      {(splits.home || splits.away) && (
        <button type="button" className="ar-ftoggle" onClick={() => setLoc(!loc)}>
          {loc
            ? L.t("Voir la forme globale", "See overall form", "Ver la forma global")
            : L.t("Voir la forme à domicile et à l'extérieur", "See home and road form", "Ver la forma en casa y fuera")}
        </button>
      )}
    </>
  );
}
