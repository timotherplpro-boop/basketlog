import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE, decodeSession } from "../../../lib/pro";
import { dbRpc } from "../../../lib/roles";
import { getL } from "../../../lib/lang-server";
import InviteClaim from "../../../components/InviteClaim";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return {
    title: L.t("Invitation créateur – Basketlog", "Creator invitation – Basketlog", "Invitación de creador – Basketlog"),
    robots: { index: false, follow: false },
  };
}

// Lien d'invitation envoyé par l'admin à un créateur : connexion ou compte gratuit, puis activation de l'accès complet.
export default async function InvitationPage({ params }) {
  const { code } = await params;
  const L = await getL();
  const s = decodeSession((await cookies()).get(COOKIE)?.value);
  let info = { valide: false, raison: "inconnue" };
  if (/^[0-9a-f]{20}$/.test(code || "")) {
    try { info = await dbRpc("basketlog_invitation", { p_code: code }); } catch { info = { valide: false, raison: "erreur" }; }
  }
  const here = encodeURIComponent(L.href(`/invitation/${code}`));
  const mine = info.raison === "utilisee" && s?.uid && info.par === s.uid;
  const admin = info.role === "admin";

  let title, text, actions;
  if (info.valide) {
    title = admin
      ? L.t("Ton accès admin Basketlog", "Your Basketlog admin access", "Tu acceso de administrador de Basketlog")
      : L.t("Ton accès créateur Basketlog", "Your Basketlog creator access", "Tu acceso de creador de Basketlog");
    text = admin
      ? L.t("Tu es invité comme admin : toute l'application, la relecture des avis et les invitations des créateurs.", "You're invited as an admin: the whole app, review moderation and creator invitations.", "Estás invitado como administrador: toda la aplicación, la revisión de opiniones y las invitaciones de creadores.")
      : L.t("Tu es invité à découvrir Basketlog en accès complet, offert : toutes les analyses NBA et EuroLeague, sans limite, pour préparer tes vidéos.", "You're invited to try Basketlog with full access, free: every NBA and EuroLeague analysis, unlimited, to prepare your videos.", "Estás invitado a descubrir Basketlog con acceso completo y gratuito: todos los análisis de la NBA y la Euroliga, sin límite, para preparar tus vídeos.");
    actions = s?.uid ? (
      <>
        <p className="invite-who">{L.t("Connecté en tant que", "Logged in as", "Conectado como")} <b>{s.name || L.t("ton compte", "your account", "tu cuenta")}</b></p>
        <InviteClaim code={code} admin={admin} />
      </>
    ) : (
      <>
        <ol className="invite-steps">
          <li>{L.t("Crée ton compte gratuit (e-mail, Google ou Apple), ou connecte-toi si tu en as déjà un.", "Create your free account (email, Google or Apple), or log in if you already have one.", "Crea tu cuenta gratuita (correo, Google o Apple), o inicia sesión si ya tienes una.")}</li>
          <li>{L.t("Tu reviens ici automatiquement : active ton accès en un clic.", "You'll come back here automatically: activate your access in one click.", "Volverás aquí automáticamente: activa tu acceso con un clic.")}</li>
        </ol>
        <a href={`/api/whop/signup?next=${here}`} className="btn-solid">{L.t("Créer mon compte gratuit", "Create my free account", "Crear mi cuenta gratuita")}</a>
        <a href={`/api/whop/login?next=${here}`} className="comp-more">{L.t("J'ai déjà un compte : me connecter", "I already have an account: log in", "Ya tengo una cuenta: iniciar sesión")} →</a>
      </>
    );
  } else if (mine) {
    title = L.t("Ton accès est déjà activé", "Your access is already active", "Tu acceso ya está activado");
    text = L.t("Toute l'application est ouverte sur ton compte.", "The whole app is unlocked on your account.", "Toda la aplicación está abierta en tu cuenta.");
    actions = <Link href={L.href("/app")} className="btn-solid">{L.t("Ouvrir Basketlog", "Open Basketlog", "Abrir Basketlog")}</Link>;
  } else {
    title = {
      utilisee: L.t("Ce lien a déjà été utilisé", "This link has already been used", "Este enlace ya se ha usado"),
      expiree: L.t("Ce lien a expiré", "This link has expired", "Este enlace ha caducado"),
      erreur: L.t("Invitation momentanément indisponible", "Invitation temporarily unavailable", "Invitación no disponible por ahora"),
    }[info.raison] || L.t("Lien d'invitation introuvable", "Invitation link not found", "Enlace de invitación no encontrado");
    text = info.raison === "erreur"
      ? L.t("Réessaie dans quelques minutes.", "Please try again in a few minutes.", "Inténtalo de nuevo en unos minutos.")
      : L.t("Demande un nouveau lien à Basketlog : contact@basketlog-app.com", "Ask Basketlog for a new link: contact@basketlog-app.com", "Pide un nuevo enlace a Basketlog: contact@basketlog-app.com");
    actions = <Link href={L.href("/")} className="comp-more">{L.t("Découvrir Basketlog", "Discover Basketlog", "Descubrir Basketlog")} →</Link>;
  }

  return (
    <main className="invite-page">
      <div className="invite-card">
        <span className="ball big-ball" aria-hidden />
        <h1>{title}</h1>
        <p>{text}</p>
        {actions}
      </div>
    </main>
  );
}
