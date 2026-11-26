import Link from "next/link";
import { cookies } from "next/headers";
import AuthButton from "../../components/AuthButton";
import { Sec } from "../../components/LegalDoc";
import { LEGAL } from "../../lib/legal";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";
import { COOKIE, decodeSession } from "../../lib/pro";
import { CONCOURS, concoursOuvert } from "../../lib/concours";

// Jeu de Noël 2026 (décision de Tim, 26/11/2026) : présentation, bouton de participation et règlement complet.
// Jeu réservé à la France : page en français pour tout le monde, non indexée en anglais, espagnol et portugais.
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: "Jeu de Noël : 1 PS5 et 1 maillot de Wembanyama à gagner – Basketlog",
    description: "Jeu gratuit et sans obligation d'achat : crée ton compte Basketlog avant le 19 décembre 2026 pour tenter de gagner une PS5 ou un maillot de Victor Wembanyama. Tirage au sort le 20 décembre.",
    path: CONCOURS.path,
    L,
    noindex: !L.fr,
    image: "/api/og/concours",
  });
}

export default async function ConcoursPage() {
  const L = await getL();
  const member = !!decodeSession((await cookies()).get(COOKIE)?.value)?.uid;
  const open = concoursOuvert();
  const e = LEGAL.editeur;
  const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;
  return (
    <main className="app-page prose-page legal concours">
      <section className="card block concours-hero">
        <p className="concours-kicker">Jeu de Noël Basketlog</p>
        <h1>1 PS5 + 1 maillot de Victor Wembanyama à gagner</h1>
        {!L.fr && (
          <p className="concours-lang">
            {L.t("", "This Christmas giveaway is only open to adults living in mainland France. The rules below are in French.", "Este sorteo de Navidad solo está abierto a mayores de edad residentes en la Francia metropolitana. Las bases están en francés.", "Este sorteio de Natal é reservado a maiores de idade residentes na França metropolitana. O regulamento está em francês.")}
          </p>
        )}
        <p>
          Pour participer, il suffit d&apos;avoir un compte Basketlog, gratuit, créé au plus tard le <b>19 décembre 2026 à 23 h 59</b>. Tu as déjà un compte ? Tu participes déjà, abonné ou non. Tirage au sort le <b>20 décembre 2026</b>.
        </p>
        <ul className="concours-lots">
          <li><span className="concours-n">1</span><span>Une console <b>PlayStation 5</b></span></li>
          <li><span className="concours-n">2</span><span>Un <b>maillot de Victor Wembanyama</b> (San Antonio Spurs)</span></li>
        </ul>
        {!open ? (
          <p className="concours-ok">Les inscriptions au jeu sont closes. Les gagnants du tirage du 20 décembre 2026 sont prévenus par e-mail.</p>
        ) : member ? (
          <p className="concours-ok">✅ Tu participes : ton compte Basketlog est inscrit au tirage du 20 décembre. <Link href={L.href("/app/matchs")}>Voir les matchs de ce soir</Link></p>
        ) : (
          <div className="concours-cta">
            <AuthButton mode="inscription" source="concours" className="btn-solid">Créer mon compte gratuit et participer</AuthButton>
            <p className="concours-note">Déjà un compte ? Tu participes automatiquement.</p>
          </div>
        )}
        <p className="concours-small">Gratuit et sans obligation d&apos;achat. Réservé aux personnes majeures résidant en France métropolitaine. Un abonnement payant ne donne aucune chance de plus.</p>
      </section>

      <h2 className="concours-h2">Règlement du jeu</h2>

      <Sec n={1} title="Organisateur">
        <p>{e.nom}, {e.statut}, {e.adresse}, SIRET {e.siret}, éditeur du site Basketlog ({LEGAL.url}) (« l&apos;Organisateur »), organise un jeu gratuit et sans obligation d&apos;achat intitulé « Jeu de Noël Basketlog » (« le Jeu »).</p>
      </Sec>

      <Sec n={2} title="Durée">
        <p>Le Jeu est ouvert du 26 novembre 2026 au 19 décembre 2026 à 23 h 59 (heure de Paris). Le tirage au sort a lieu le 20 décembre 2026.</p>
      </Sec>

      <Sec n={3} title="Qui peut participer et comment">
        <p>Le Jeu est ouvert à toute personne physique majeure résidant en France métropolitaine (Corse comprise), à l&apos;exception de l&apos;Organisateur et des membres de son foyer.</p>
        <p>Pour participer, il faut détenir un compte Basketlog, gratuit ou payant, créé au plus tard le 19 décembre 2026 à 23 h 59 avec une adresse e-mail valide. Les comptes ouverts avant le début du Jeu participent automatiquement. Un membre qui ne souhaite pas participer peut le signaler à {mail}.</p>
        <p>Une seule participation par personne : un même participant ne peut gagner qu&apos;un lot, même avec plusieurs comptes. Les comptes créés en série, avec des adresses jetables ou de façon automatisée sont exclus. Un abonnement payant (Pro ou Lifetime) n&apos;est pas nécessaire et ne donne aucune chance supplémentaire.</p>
      </Sec>

      <Sec n={4} title="Lots">
        <p>Lot n° 1 : une console PlayStation 5, édition standard (valeur commerciale indicative : 649,99 € TTC).</p>
        <p>Lot n° 2 : un maillot NBA Swingman de Victor Wembanyama (San Antonio Spurs), taille au choix du gagnant parmi celles disponibles (valeur commerciale indicative : 104,99 € TTC).</p>
        <p>Les lots ne peuvent être ni échangés ni remboursés en espèces. S&apos;il est impossible de fournir un lot, l&apos;Organisateur le remplace par un lot de valeur égale ou supérieure.</p>
      </Sec>

      <Sec n={5} title="Tirage au sort">
        <p>Le 20 décembre 2026, l&apos;Organisateur tire au sort, de façon aléatoire, deux gagnants parmi les comptes qui remplissent les conditions : le premier gagne le lot n° 1, le second le lot n° 2. Deux suppléants sont tirés de la même façon, dans le même ordre.</p>
      </Sec>

      <Sec n={6} title="Information des gagnants et remise des lots">
        <p>Les gagnants sont prévenus le 20 décembre 2026 par e-mail, à l&apos;adresse de leur compte Basketlog. Ils ont 7 jours pour répondre en donnant leurs nom et prénom, leur adresse postale en France métropolitaine et, pour le maillot, la taille choisie. Une pièce d&apos;identité peut être demandée pour vérifier l&apos;âge et le lieu de résidence.</p>
        <p>Sans réponse dans ce délai, ou si les conditions ne sont pas remplies, le lot revient au suppléant. Les lots sont envoyés gratuitement par la poste ou par transporteur à l&apos;adresse indiquée, dans les 30 jours qui suivent la réponse du gagnant. L&apos;Organisateur ne garantit pas une livraison avant Noël.</p>
        <p>Avec l&apos;accord des gagnants, leur prénom et l&apos;initiale de leur nom peuvent être annoncés sur le site et les réseaux sociaux de Basketlog.</p>
      </Sec>

      <Sec n={7} title="Données personnelles">
        <p>Les données utilisées pour le Jeu (adresse e-mail du compte ; pour les gagnants, nom, prénom et adresse postale) sont traitées par l&apos;Organisateur uniquement pour organiser le tirage et remettre les lots. Celles des gagnants sont supprimées au plus tard 6 mois après la remise du lot. Tu peux exercer tes droits d&apos;accès, de rectification, d&apos;effacement et d&apos;opposition en écrivant à {mail}. Plus de détails dans la <Link href="/confidentialite">politique de confidentialité</Link>.</p>
      </Sec>

      <Sec n={8} title="Réseaux sociaux">
        <p>Le Jeu n&apos;est ni organisé, ni parrainé, ni géré par TikTok, Instagram, Facebook, X, Bluesky ou une autre plateforme, qui ne peuvent en aucun cas être tenues pour responsables.</p>
      </Sec>

      <Sec n={9} title="Fraude, modification et règlement">
        <p>Toute fraude ou tentative de fraude entraîne l&apos;exclusion du participant. L&apos;Organisateur peut écourter, prolonger, modifier ou annuler le Jeu en cas de force majeure ou de fraude ; les participants en sont informés sur cette page.</p>
        <p>Participer au Jeu vaut acceptation du présent règlement, consultable gratuitement sur cette page. Il est soumis au droit français. Pour toute question : {mail}.</p>
      </Sec>
    </main>
  );
}
