import { cookies } from "next/headers";
import { COOKIE, decodeSession, aiReady, usageKey } from "../lib/pro";
import { getL } from "../lib/lang-server";
import { getUsage } from "../lib/usage";
import AppShell from "./AppShell";
import SiteFooter from "./SiteFooter";

// Espace membre façon Visifoot : pour un compte connecté, les pages /app et /pro s'affichent avec la barre latérale.
export default async function MemberArea({ children }) {
  const s = decodeSession((await cookies()).get(COOKIE)?.value);
  if (!s?.uid) return children;
  const [L, usage] = await Promise.all([getL(), getUsage(usageKey(s))]);
  const session = { name: s.name || "", tier: s.tier === "gratuit" ? "compte" : s.tier || "compte", role: s.role || null, used: usage?.used ?? 0 };
  return (
    <AppShell session={session} ai={aiReady()}>
      {children}
      <SiteFooter L={L} compact />
    </AppShell>
  );
}
