import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE, decodeSession } from "../../../lib/pro";
import { dbRpc } from "../../../lib/roles";
import { getL } from "../../../lib/lang-server";
import InviteClaim from "../../../components/InviteClaim";
import AuthButton from "../../../components/AuthButton";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return {
    title: L.t("Invitation créateur – Basketlog", "Creator invitation – Basketlog", "Invitación de creador – Basketlog", "Convite de criador – Basketlog"),
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
      ? L.t("Ton accès admin Basketlog", "Your Basketlog admin access", "Tu acceso de administrador de Basketlog", "Seu acesso de administrador do Basketlog")
      : L.t("Ton accès créateur Basketlog", "Your Basketlog creator access", "Tu acceso de creador de Basketlog", "Seu acesso de criador do Basketlog");
    text = admin
      ? L.t("Tu es invité comme admin : toute l'application, la relecture des avis et les invitations des créateurs.", "You're invited as an admin: the whole app, review moderation and creator invitations.", "Estás invitado como administrador: toda la aplicación, la revisión de opiniones y las invitaciones de creadores.", "Você foi convidado como administrador: todo o aplicativo, a revisão de avaliações e os convites de criadores.")
      : L.t("Tu es invité à découvrir Basketlog en accès complet, offert : toutes les analyses NBA et EuroLeague, sans limite, pour préparer tes vidéos.", "You're invited to try Basketlog with full access, free: every NBA and EuroLeague analysis, unlimited, to prepare your videos.", "Estás invitado a descubrir Basketlog con acceso completo y gratuito: todos los análisis de la NBA y la Euroliga, sin límite, para preparar tus vídeos.", "Você foi convidado a conhecer o Basketlog com acesso completo e gratuito: todas as análises da NBA e da Euroliga, sem limite, para preparar seus vídeos.");
    actions = s?.uid ? (
      <>
        <p className="invite-who">{L.t("Connecté en tant que", "Logged in as", "Conectado como", "Conectado como")} <b>{s.name || L.t("ton compte", "your account", "tu cuenta", "sua conta")}</b></p>
        <InviteClaim code={code} admin={admin} />
      </>
    ) : (
      <>
        <ol className="invite-steps">
          <li>{L.t("Crée ton compte gratuit (Google ou e-mail), ou connecte-toi si tu en as déjà un.", "Create your free account (Google or email), or log in if you already have one.", "Crea tu cuenta gratuita (Google o correo), o inicia sesión si ya tienes una.", "Crie sua conta grátis (Google ou e-mail), ou entre se já tiver uma.")}</li>
          <li>{L.t("Tu reviens sur cette page : active ton accès en un clic.", "You'll come back to this page: activate your access in one click.", "Volverás a esta página: activa tu acceso con un clic.", "Você voltará a esta página: ative seu acesso com um clique.")}</li>
        </ol>
        <AuthButton mode="inscription" source="invitation" next={L.href(`/invitation/${code}`)} className="btn-solid">{L.t("Créer mon compte gratuit", "Create my free account", "Crear mi cuenta gratuita", "Criar minha conta grátis")}</AuthButton>
        <AuthButton mode="connexion" source="invitation" next={L.href(`/invitation/${code}`)} className="comp-more">{L.t("J'ai déjà un compte : me connecter", "I already have an account: log in", "Ya tengo una cuenta: iniciar sesión", "Já tenho conta: entrar")} →</AuthButton>
        <a href={`/api/whop/login?next=${here}`} className="comp-more invite-whop">{L.t("Compte Whop ? Me connecter avec Whop", "Whop account? Log in with Whop", "¿Cuenta de Whop? Iniciar sesión con Whop", "Conta da Whop? Entrar com a Whop")} →</a>
      </>
    );
  } else if (mine) {
    title = L.t("Ton accès est déjà activé", "Your access is already active", "Tu acceso ya está activado", "Seu acesso já está ativado");
    text = L.t("Toute l'application est ouverte sur ton compte.", "The whole app is unlocked on your account.", "Toda la aplicación está abierta en tu cuenta.", "Todo o aplicativo está liberado na sua conta.");
    actions = <Link href={L.href("/app")} className="btn-solid">{L.t("Ouvrir Basketlog", "Open Basketlog", "Abrir Basketlog", "Abrir o Basketlog")}</Link>;
  } else {
    title = {
      utilisee: L.t("Ce lien a déjà été utilisé", "This link has already been used", "Este enlace ya se ha usado", "Este link já foi usado"),
      expiree: L.t("Ce lien a expiré", "This link has expired", "Este enlace ha caducado", "Este link expirou"),
      erreur: L.t("Invitation momentanément indisponible", "Invitation temporarily unavailable", "Invitación no disponible por ahora", "Convite indisponível no momento"),
    }[info.raison] || L.t("Lien d'invitation introuvable", "Invitation link not found", "Enlace de invitación no encontrado", "Link de convite não encontrado");
    text = info.raison === "erreur"
      ? L.t("Réessaie dans quelques minutes.", "Please try again in a few minutes.", "Inténtalo de nuevo en unos minutos.", "Tente novamente em alguns minutos.")
      : L.t("Demande un nouveau lien à Basketlog : contact@basketlog-app.com", "Ask Basketlog for a new link: contact@basketlog-app.com", "Pide un nuevo enlace a Basketlog: contact@basketlog-app.com", "Peça um novo link ao Basketlog: contact@basketlog-app.com");
    actions = <Link href={L.href("/")} className="comp-more">{L.t("Découvrir Basketlog", "Discover Basketlog", "Descubrir Basketlog", "Conhecer o Basketlog")} →</Link>;
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
