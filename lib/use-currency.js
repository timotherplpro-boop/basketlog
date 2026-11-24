"use client";
// Monnaie d'affichage côté navigateur : la même que celle choisie par le serveur (lib/currency-server.js), transmise par
// la mise en page racine. { cur: "EUR" } ou { cur: "USD", rate } (prix en euros convertis au taux du jour).
import { createContext, useContext } from "react";

const Ctx = createContext({ cur: "EUR" });

export function FxProvider({ fx, children }) {
  return <Ctx.Provider value={fx || { cur: "EUR" }}>{children}</Ctx.Provider>;
}

export function useCurrency() {
  return useContext(Ctx);
}
