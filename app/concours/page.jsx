import Link from "next/link";
import { cookies } from "next/headers";
import AuthButton from "../../components/AuthButton";
import { LEGAL } from "../../lib/legal";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";
import { COOKIE, decodeSession } from "../../lib/pro";
import { CONCOURS, concoursOuvert } from "../../lib/concours";
import { GAMEPAD_SVG, JERSEY_SVG } from "../../lib/concours-art";

// Jeu de Noël 2026 (décision de Tim, 26/11/2026 ; ouvert à la France, à l'Espagne et aux États-Unis le soir même) :
// présentation, bouton de participation et règlement complet, en français, anglais et espagnol. La page portugaise
// (Brésil, où un tirage au sort promotionnel demande une autorisation de l'État) explique que le Brésil n'est pas éligible.
const C = {
  fr: {
    metaTitle: "Jeu de Noël : 1 PS5 et 1 maillot de Wembanyama à gagner – Basketlog",
    metaDesc: "Jeu gratuit et sans obligation d'achat : crée ton compte Basketlog avant le 19 décembre 2026 pour tenter de gagner une PS5 ou un maillot de Victor Wembanyama. Tirage au sort le 20 décembre.",
    badge: "Jeu de Noël", label: "À gagner", head: "1 PS5", subA: "+ 1 maillot de", c1: "Console PS5", c2: "Maillot de Wemby",
    date: "Tirage au sort le 20 décembre 2026",
    intro: "Pour participer, il suffit d'avoir un compte Basketlog gratuit, créé au plus tard le 19 décembre 2026 à 23 h 59 (heure de Paris). Déjà inscrit ? Tu participes automatiquement, abonné ou non.",
    cta: "Créer mon compte gratuit et participer", already: "Déjà un compte ? Tu participes déjà.",
    member: "✅ Tu participes : ton compte est inscrit au tirage du 20 décembre.", memberLink: "Voir les matchs de ce soir",
    closed: "Les inscriptions sont closes. Les gagnants du tirage du 20 décembre sont prévenus par e-mail.",
    small: "Gratuit et sans obligation d'achat · Personnes majeures résidant en France métropolitaine, en Espagne (péninsule et Baléares) ou aux États-Unis · Un abonnement ne donne aucune chance de plus.",
    stepsTitle: "Comment participer",
    steps: [["Crée ton compte", "Gratuit, en 30 secondes, avec ton adresse e-mail."], ["C'est tout", "Ton compte est inscrit tout seul au tirage. Abonné ou non, chaque membre a une seule chance."], ["Tirage le 20 décembre", "Deux gagnants sont tirés au sort et prévenus par e-mail le jour même."]],
    rulesTitle: "Règlement du jeu", rulesToggle: "Lire le règlement complet",
  },
  en: {
    metaTitle: "Christmas giveaway: win a PS5 and a Victor Wembanyama jersey – Basketlog",
    metaDesc: "Free giveaway, no purchase necessary: create your Basketlog account by December 19, 2026 for a chance to win a PS5 or a Victor Wembanyama jersey. Winners drawn on December 20.",
    badge: "Christmas giveaway", label: "Win", head: "A PS5", subA: "+ a jersey of", c1: "PS5 console", c2: "Wemby jersey",
    date: "Winners drawn on December 20, 2026",
    intro: "To enter, all you need is a free Basketlog account created by December 19, 2026 at 11:59 p.m. Paris time (5:59 p.m. ET). Already a member? You're in automatically, subscriber or not.",
    cta: "Create my free account and enter", already: "Already have an account? You're already in.",
    member: "✅ You're in: your account is entered in the December 20 drawing.", memberLink: "See tonight's games",
    closed: "Entries are closed. Winners of the December 20 drawing are notified by email.",
    small: "No purchase necessary · Open to adults living in mainland France, Spain (mainland and Balearic Islands) or the United States · A subscription does not increase your chances.",
    stepsTitle: "How to enter",
    steps: [["Create your account", "Free, in 30 seconds, with your email address."], ["That's it", "Your account is entered automatically. Subscriber or not, every member gets one chance."], ["Drawing on December 20", "Two winners are drawn at random and notified by email the same day."]],
    rulesTitle: "Official rules", rulesToggle: "Read the official rules",
  },
  es: {
    metaTitle: "Sorteo de Navidad: gana una PS5 y una camiseta de Wembanyama – Basketlog",
    metaDesc: "Sorteo gratis y sin obligación de compra: crea tu cuenta de Basketlog antes del 19 de diciembre de 2026 para ganar una PS5 o una camiseta de Victor Wembanyama. Sorteo el 20 de diciembre.",
    badge: "Sorteo de Navidad", label: "Sorteamos", head: "1 PS5", subA: "+ 1 camiseta de", c1: "Consola PS5", c2: "Camiseta de Wemby",
    date: "Sorteo el 20 de diciembre de 2026",
    intro: "Para participar, solo necesitas una cuenta gratuita de Basketlog creada como muy tarde el 19 de diciembre de 2026 a las 23:59 (hora de Madrid). ¿Ya tienes cuenta? Participas automáticamente, seas suscriptor o no.",
    cta: "Crear mi cuenta gratis y participar", already: "¿Ya tienes cuenta? Ya participas.",
    member: "✅ Participas: tu cuenta está inscrita en el sorteo del 20 de diciembre.", memberLink: "Ver los partidos de esta noche",
    closed: "La participación está cerrada. Los ganadores del sorteo del 20 de diciembre reciben un correo.",
    small: "Gratis y sin obligación de compra · Mayores de edad residentes en la Francia metropolitana, España (península y Baleares) o Estados Unidos · Una suscripción no da más posibilidades.",
    stepsTitle: "Cómo participar",
    steps: [["Crea tu cuenta", "Gratis, en 30 segundos, con tu correo electrónico."], ["Ya está", "Tu cuenta entra sola en el sorteo. Suscriptor o no, cada miembro tiene una sola oportunidad."], ["Sorteo el 20 de diciembre", "Se eligen dos ganadores al azar y se les avisa por correo el mismo día."]],
    rulesTitle: "Bases legales", rulesToggle: "Leer las bases legales",
  },
};
// Brésil : page d'information seulement (règlement anglais).
C.pt = {
  ...C.en,
  metaTitle: "Sorteio de Natal da Basketlog – não disponível no Brasil",
  metaDesc: "O sorteio de Natal da Basketlog (um PS5 e uma camisa de Victor Wembanyama) é aberto apenas a residentes na França, na Espanha e nos Estados Unidos.",
  badge: "Sorteio de Natal", label: "Prêmios", head: "Um PS5", subA: "+ uma camisa de", c1: "Console PS5", c2: "Camisa do Wemby",
  date: "Sorteio em 20 de dezembro de 2026",
  intro: "Este sorteio é aberto apenas a maiores de idade residentes na França metropolitana, na Espanha (península e Baleares) e nos Estados Unidos. Residentes no Brasil não podem participar.",
  cta: "Criar minha conta grátis", already: "",
  member: "Sua conta Basketlog está ativa. Este sorteio não é aberto a residentes no Brasil.", memberLink: "Ver os jogos desta noite",
  closed: "As inscrições estão encerradas.",
  small: "Sem obrigação de compra · Aberto apenas a residentes na França, na Espanha e nos Estados Unidos.",
  stepsTitle: "Como funciona",
  steps: [["Conta grátis", "Qualquer conta Basketlog criada até 19 de dezembro de 2026 participa (fora do Brasil)."], ["Uma chance por pessoa", "Assinante ou não, cada membro tem uma única chance."], ["Sorteio em 20 de dezembro", "Dois ganhadores são sorteados e avisados por e-mail no mesmo dia."]],
  rulesTitle: "Regulamento oficial (em inglês)", rulesToggle: "Ler o regulamento oficial",
};

// Règlement : [titre, paragraphes]. e = éditeur du site (lib/legal.js), mail = lien vers l'adresse de contact.
function rules(lang, e, mail, privacy) {
  if (lang === "fr") return [
    ["Organisateur", [<>{e.nom}, {e.statut}, {e.adresse}, SIRET {e.siret}, éditeur du site Basketlog ({LEGAL.url}) (« l&apos;Organisateur »), organise un jeu gratuit et sans obligation d&apos;achat intitulé « Jeu de Noël Basketlog » (« le Jeu »).</>]],
    ["Durée", ["Le Jeu est ouvert du 26 novembre 2026 au 19 décembre 2026 à 23 h 59 (heure de Paris). Le tirage au sort a lieu le 20 décembre 2026."]],
    ["Qui peut participer et comment", [
      "Le Jeu est ouvert à toute personne physique majeure (18 ans révolus, ou l'âge de la majorité de son État de résidence s'il est plus élevé) résidant en France métropolitaine (Corse comprise), en Espagne péninsulaire ou aux îles Baléares, ou aux États-Unis (50 États et district de Columbia), à l'exception de l'Organisateur et des membres de son foyer. Le Jeu est nul là où la loi l'interdit.",
      <>Pour participer, il faut détenir un compte Basketlog, gratuit ou payant, créé au plus tard le 19 décembre 2026 à 23 h 59 avec une adresse e-mail valide. Les comptes ouverts avant le début du Jeu participent automatiquement. Un membre qui ne souhaite pas participer peut le signaler à {mail}.</>,
      "Une seule participation par personne : un même participant ne peut gagner qu'un lot, même avec plusieurs comptes. Les comptes créés en série, avec des adresses jetables ou de façon automatisée sont exclus. Un abonnement payant (Pro ou Lifetime) n'est pas nécessaire et ne donne aucune chance supplémentaire.",
    ]],
    ["Lots", [
      "Lot n° 1 : une console PlayStation 5, édition standard (valeur commerciale indicative en France : 649,99 € TTC).",
      "Lot n° 2 : un maillot NBA Swingman de Victor Wembanyama (San Antonio Spurs), taille au choix du gagnant parmi celles disponibles (valeur commerciale indicative en France : 104,99 € TTC).",
      "Chaque lot est fourni dans le modèle vendu dans le pays de résidence du gagnant. Les lots ne peuvent être ni échangés ni remboursés en espèces ; s'il est impossible de fournir un lot, l'Organisateur le remplace par un lot de valeur égale ou supérieure. Les éventuels impôts et taxes liés au lot dans le pays du gagnant sont à sa charge.",
    ]],
    ["Tirage au sort", ["Le 20 décembre 2026, l'Organisateur tire au sort, de façon aléatoire, deux gagnants parmi les comptes qui remplissent les conditions : le premier gagne le lot n° 1, le second le lot n° 2. Deux suppléants sont tirés de la même façon, dans le même ordre. Les chances de gagner dépendent du nombre de participations valables."]],
    ["Information des gagnants et remise des lots", [
      "Les gagnants sont prévenus le 20 décembre 2026 par e-mail, à l'adresse de leur compte Basketlog. Ils ont 7 jours pour répondre en donnant leurs nom et prénom, une adresse postale dans l'une des zones du Jeu et, pour le maillot, la taille choisie. Une pièce d'identité peut être demandée pour vérifier l'âge et le lieu de résidence.",
      "Sans réponse dans ce délai, ou si les conditions ne sont pas remplies, le lot revient au suppléant. Les lots sont envoyés gratuitement à l'adresse indiquée dans les 30 jours qui suivent la réponse du gagnant. L'Organisateur ne garantit pas une livraison avant Noël.",
      "Avec l'accord des gagnants, leur prénom et l'initiale de leur nom peuvent être annoncés sur le site et les réseaux sociaux de Basketlog.",
    ]],
    ["Données personnelles", [<>Les données utilisées pour le Jeu (adresse e-mail du compte ; pour les gagnants, nom, prénom et adresse postale) sont traitées par l&apos;Organisateur uniquement pour organiser le tirage et remettre les lots. Celles des gagnants sont supprimées au plus tard 6 mois après la remise du lot. Tu peux exercer tes droits d&apos;accès, de rectification, d&apos;effacement et d&apos;opposition en écrivant à {mail}. Plus de détails dans la {privacy("politique de confidentialité")}.</>]],
    ["Réseaux sociaux", ["Le Jeu n'est ni organisé, ni parrainé, ni géré par TikTok, Instagram, Facebook, X, Bluesky ou une autre plateforme, qui ne peuvent en aucun cas être tenues pour responsables."]],
    ["Fraude, modification et règlement", [
      "Toute fraude ou tentative de fraude entraîne l'exclusion du participant. L'Organisateur peut écourter, prolonger, modifier ou annuler le Jeu en cas de force majeure ou de fraude ; les participants en sont informés sur cette page.",
      <>Participer au Jeu vaut acceptation du présent règlement, consultable gratuitement sur cette page. Il est soumis au droit français, sans préjudice des règles impératives du pays de résidence du participant. Pour toute question : {mail}.</>,
    ]],
  ];
  if (lang === "es") return [
    ["Organizador", [<>{e.nom}, empresario individual (micro-entreprise francesa), {e.adresse}, SIRET {e.siret}, editor de Basketlog ({LEGAL.url}) (el «Organizador»), organiza un sorteo gratuito y sin obligación de compra llamado «Sorteo de Navidad de Basketlog» (el «Sorteo»).</>]],
    ["Duración", ["El Sorteo está abierto del 26 de noviembre de 2026 al 19 de diciembre de 2026 a las 23:59 (hora de Madrid). El sorteo se realiza el 20 de diciembre de 2026."]],
    ["Quién puede participar y cómo", [
      "El Sorteo está abierto a toda persona física mayor de edad (18 años, o la mayoría de edad de su estado de residencia si es superior) residente en la Francia metropolitana (incluida Córcega), en la España peninsular o en las Islas Baleares, o en Estados Unidos (50 estados y Distrito de Columbia), salvo el Organizador y los miembros de su hogar. El Sorteo es nulo donde la ley lo prohíba.",
      <>Para participar, basta con tener una cuenta de Basketlog, gratuita o de pago, creada como muy tarde el 19 de diciembre de 2026 a las 23:59 con una dirección de correo válida. Las cuentas abiertas antes del inicio del Sorteo participan automáticamente. Quien no desee participar puede indicarlo en {mail}.</>,
      "Una sola participación por persona: un mismo participante solo puede ganar un premio, aunque tenga varias cuentas. Quedan excluidas las cuentas creadas en serie, con direcciones desechables o de forma automatizada. Una suscripción de pago (Pro o Lifetime) no es necesaria y no da más posibilidades.",
    ]],
    ["Premios", [
      "Premio 1: una consola PlayStation 5, edición estándar (valor comercial orientativo en Francia: 649,99 € IVA incluido).",
      "Premio 2: una camiseta NBA Swingman de Victor Wembanyama (San Antonio Spurs), talla a elegir por el ganador entre las disponibles (valor comercial orientativo en Francia: 104,99 € IVA incluido).",
      "Cada premio se entrega en el modelo vendido en el país de residencia del ganador. Los premios no se pueden cambiar ni canjear por dinero; si no fuera posible entregar un premio, el Organizador lo sustituirá por otro de valor igual o superior. Los impuestos que correspondan al premio en el país del ganador corren a su cargo.",
    ]],
    ["Sorteo", ["El 20 de diciembre de 2026, el Organizador elegirá al azar a dos ganadores entre las cuentas que cumplan las condiciones: el primero gana el premio 1 y el segundo, el premio 2. Se eligen también dos suplentes, de la misma forma y en el mismo orden. Las posibilidades de ganar dependen del número de participaciones válidas."]],
    ["Comunicación a los ganadores y entrega", [
      "Los ganadores reciben un correo el 20 de diciembre de 2026 en la dirección de su cuenta de Basketlog. Tienen 7 días para responder indicando su nombre y apellidos, una dirección postal en una de las zonas del Sorteo y, para la camiseta, la talla elegida. Se puede pedir un documento de identidad para comprobar la edad y el lugar de residencia.",
      "Si no responden en ese plazo, o si no cumplen las condiciones, el premio pasa al suplente. Los premios se envían gratis a la dirección indicada en un plazo de 30 días tras la respuesta del ganador. No se garantiza la entrega antes de Navidad.",
      "Con el acuerdo de los ganadores, su nombre y la inicial de su apellido pueden anunciarse en la web y las redes sociales de Basketlog.",
    ]],
    ["Datos personales", [<>Los datos usados para el Sorteo (correo de la cuenta; para los ganadores, nombre, apellidos y dirección postal) los trata el Organizador solo para organizar el sorteo y entregar los premios. Los datos de los ganadores se borran como muy tarde 6 meses después de la entrega. Puedes ejercer tus derechos de acceso, rectificación, supresión y oposición escribiendo a {mail}. Más información en la {privacy("política de privacidad")}.</>]],
    ["Redes sociales", ["El Sorteo no está organizado, patrocinado ni gestionado por TikTok, Instagram, Facebook, X, Bluesky ni ninguna otra plataforma, que no tienen ninguna responsabilidad."]],
    ["Fraude, cambios y bases", [
      "Cualquier fraude o intento de fraude supone la exclusión del participante. El Organizador puede acortar, ampliar, modificar o cancelar el Sorteo en caso de fuerza mayor o fraude, informando en esta página.",
      <>Participar implica aceptar estas bases, disponibles gratis en esta página. Se rigen por el derecho francés, sin perjuicio de las normas imperativas del país de residencia del participante. Para cualquier duda: {mail}.</>,
    ]],
  ];
  return [
    ["Sponsor", [<>{e.nom}, sole trader (French micro-entreprise), {e.adresse}, SIRET {e.siret}, publisher of Basketlog ({LEGAL.url}) (the “Sponsor”), runs a free giveaway called “Basketlog Christmas Giveaway” (the “Giveaway”).</>]],
    ["Entry period", ["The Giveaway runs from November 26, 2026 to December 19, 2026 at 11:59 p.m. Paris time (5:59 p.m. ET). The drawing takes place on December 20, 2026."]],
    ["Eligibility and how to enter", [
      "Open to individuals who are 18 or older (or the age of majority in their state of residence, if higher) and legal residents of mainland France (including Corsica), mainland Spain or the Balearic Islands, or the 50 United States and the District of Columbia, except the Sponsor and members of the Sponsor's household. Void where prohibited.",
      <>To enter, hold a free or paid Basketlog account created no later than December 19, 2026 at 11:59 p.m. Paris time, with a valid email address. Accounts opened before the Giveaway started are entered automatically. A member who does not wish to take part can say so at {mail}.</>,
      "Limit one entry per person: a participant can win only one prize, even with several accounts. Accounts created in bulk, with disposable addresses or by automated means are excluded. A paid subscription (Pro or Lifetime) is not required and does not increase the chances of winning.",
    ]],
    ["Prizes", [
      "First prize: one PlayStation 5 console, standard edition (approximate retail value in France: €649.99).",
      "Second prize: one NBA Swingman jersey of Victor Wembanyama (San Antonio Spurs), size chosen by the winner among available sizes (approximate retail value in France: €104.99).",
      "Each prize is provided in the model sold in the winner's country of residence. Prizes cannot be exchanged or redeemed for cash; if a prize cannot be provided, the Sponsor will substitute a prize of equal or greater value. Any taxes on a prize in the winner's country are the winner's sole responsibility.",
    ]],
    ["Drawing", ["On December 20, 2026, the Sponsor will randomly select two winners among eligible accounts: the first wins the first prize, the second wins the second prize. Two alternates are drawn the same way, in the same order. Odds of winning depend on the number of eligible entries received."]],
    ["Winner notification and prize delivery", [
      "Winners are notified on December 20, 2026 by email, at their Basketlog account address. They have 7 days to reply with their full name, a postal address in an eligible area and, for the jersey, their size. Proof of identity may be requested to verify age and residence.",
      "If a winner does not reply within that time or does not meet these rules, the prize goes to the alternate. Prizes are shipped free of charge to the address provided within 30 days of the winner's reply. Delivery before Christmas is not guaranteed.",
      "With the winners' consent, their first name and last initial may be announced on Basketlog's website and social media.",
    ]],
    ["Personal data", [<>Data used for the Giveaway (account email address; for winners, full name and postal address) are processed by the Sponsor only to run the drawing and deliver the prizes. Winners&apos; data are deleted no later than 6 months after delivery. You can exercise your rights of access, rectification, erasure and objection by writing to {mail}. See the {privacy("privacy policy")}.</>]],
    ["Social media", ["The Giveaway is in no way sponsored, endorsed, administered by, or associated with TikTok, Instagram, Facebook, X, Bluesky or any other platform."]],
    ["Fraud, changes and governing law", [
      "Any fraud or attempted fraud will disqualify the participant. The Sponsor may shorten, extend, modify or cancel the Giveaway in case of force majeure or fraud; participants will be informed on this page.",
      <>Taking part means accepting these rules, available free of charge on this page. They are governed by French law, without prejudice to the mandatory rules of the participant&apos;s country of residence. Questions: {mail}.</>,
    ]],
  ];
}

export async function generateMetadata() {
  const L = await getL();
  const T = C[L.lang] || C.en;
  return pageMeta({
    title: T.metaTitle,
    description: T.metaDesc,
    path: CONCOURS.path,
    L,
    noindex: L.pt,
    image: `/api/og/concours?lang=${L.fr ? "fr" : L.es ? "es" : "en"}`,
  });
}

export default async function ConcoursPage() {
  const L = await getL();
  const T = C[L.lang] || C.en;
  const member = !!decodeSession((await cookies()).get(COOKIE)?.value)?.uid;
  const open = concoursOuvert();
  const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;
  const privacy = (label) => <Link href={L.href("/confidentialite")}>{label}</Link>;
  const R = rules(L.fr ? "fr" : L.es ? "es" : "en", LEGAL.editeur, mail, privacy);
  return (
    <main className="app-page concours">
      <section className="concours-hero">
        <div className="concours-glow" aria-hidden="true" />
        <p className="concours-badge">{T.badge}</p>
        <p className="concours-label">{T.label}</p>
        <h1 className="concours-title">
          <span className="concours-head">{T.head}</span>
          <span className="concours-sub">{T.subA}</span>
          <span className="concours-name">Victor Wembanyama</span>
        </h1>
        <div className="concours-prizes">
          <div className="concours-prize">
            <img src={GAMEPAD_SVG} alt="" width="170" height="106" />
            <span>{T.c1}</span>
          </div>
          <div className="concours-prize">
            <img src={JERSEY_SVG} alt="" width="92" height="110" />
            <span>{T.c2}</span>
          </div>
        </div>
        <p className="concours-date"><span aria-hidden="true" />{T.date}</p>
        <p className="concours-intro">{T.intro}</p>
        {!open ? (
          <p className="concours-ok">{T.closed}</p>
        ) : member ? (
          <p className="concours-ok">{T.member} <Link href={L.href("/app/matchs")}>{T.memberLink}</Link></p>
        ) : (
          <div className="concours-cta">
            <AuthButton mode="inscription" source="concours" className="btn-solid concours-btn">{T.cta}</AuthButton>
            {T.already && <p>{T.already}</p>}
          </div>
        )}
        <p className="concours-small">{T.small}</p>
      </section>

      <section className="concours-steps" aria-label={T.stepsTitle}>
        <h2>{T.stepsTitle}</h2>
        <ol>
          {T.steps.map(([t, d], i) => (
            <li key={t}><span className="concours-step-n">{i + 1}</span><b>{t}</b><span>{d}</span></li>
          ))}
        </ol>
      </section>

      <section className="concours-rules">
        <h2>{T.rulesTitle}</h2>
        <details>
          <summary>{T.rulesToggle}</summary>
          {!L.fr && !L.es && <p className="concours-caps">NO PURCHASE NECESSARY. A PURCHASE OR PAYMENT OF ANY KIND WILL NOT INCREASE YOUR CHANCES OF WINNING. VOID WHERE PROHIBITED.</p>}
          {R.map(([title, paras], i) => (
            <div key={title} className="concours-rule">
              <h3>{i + 1}. {title}</h3>
              {paras.map((p, j) => <p key={j}>{p}</p>)}
            </div>
          ))}
        </details>
      </section>
    </main>
  );
}
