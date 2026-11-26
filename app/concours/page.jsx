import Link from "next/link";
import { cookies } from "next/headers";
// Participation réservée aux abonnés Pro ou Lifetime : le bouton mène à la page des formules.
import { LEGAL } from "../../lib/legal";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";
import { COOKIE, decodeSession } from "../../lib/pro";
import { CONCOURS, concoursOuvert } from "../../lib/concours";
import { GAMEPAD_SVG, JERSEY_SVG } from "../../lib/concours-art";

// Jeu de Noël 2026 (décision de Tim, 26/11/2026 ; ouvert au monde entier à sa demande, 18 h 36 ; achat de l'abonnement Pro obligatoire à sa demande, 20 h 43, risque légal hors de France signalé) : présentation, bouton de
// participation et règlement complet en français, anglais et espagnol. Exclus : Brésil, Italie et Québec (tirage promotionnel
// soumis à autorisation ou enregistrement préalable) et pays sous sanctions internationales. La page portugaise (surtout
// lue au Brésil) n'est pas indexée et le règlement y est en anglais.
const C = {
  fr: {
    metaTitle: "Jeu de Noël : 1 PS5 et 1 maillot de Wembanyama à gagner – Basketlog",
    metaDesc: "Abonne-toi à Basketlog Pro (9,99 €/mois) avant le 19 décembre 2026 pour tenter de gagner une PS5 ou un maillot de Victor Wembanyama. Tirage au sort le 20 décembre.",
    badge: "Jeu de Noël", label: "À gagner", head: "1 PS5", subA: "+ 1 maillot de", c1: "Console PS5", c2: "Maillot de Wemby",
    date: "Tirage au sort le 20 décembre 2026",
    intro: "Pour participer, il faut être abonné à Basketlog Pro (9,99 €/mois) ou Lifetime, avec un abonnement payé et actif le 19 décembre 2026 à 23 h 59 (heure de Paris). Déjà Pro ? Tu participes automatiquement.",
    cta: "Passer Pro et participer", already: "Déjà Pro ? Connecte-toi : tu participes déjà.",
    member: "✅ Tu participes : ton abonnement Pro t'inscrit au tirage du 20 décembre.", memberLink: "Voir les matchs de ce soir", memberFree: "Ton compte est gratuit : passe Pro pour participer au tirage du 20 décembre.",
    closed: "Les inscriptions sont closes. Les gagnants du tirage du 20 décembre sont prévenus par e-mail.",
    small: "Achat de l'abonnement Pro obligatoire (9,99 €/mois) · Ouvert aux personnes majeures du monde entier, sauf exceptions du règlement · Une seule chance par personne.",
    stepsTitle: "Comment participer",
    steps: [["Passe Pro", "9,99 €/mois, en quelques clics. Déjà Pro ou Lifetime ? Rien à faire."], ["C'est tout", "Ton abonnement t'inscrit tout seul au tirage. Chaque abonné a une seule chance."], ["Tirage le 20 décembre", "Deux gagnants sont tirés au sort et prévenus par e-mail le jour même."]],
    rulesTitle: "Règlement du jeu", rulesToggle: "Lire le règlement complet",
  },
  en: {
    metaTitle: "Christmas giveaway: win a PS5 and a Victor Wembanyama jersey – Basketlog",
    metaDesc: "Subscribe to Basketlog Pro (€9.99/month) by December 19, 2026 for a chance to win a PS5 or a Victor Wembanyama jersey. Winners drawn on December 20.",
    badge: "Christmas giveaway", label: "Win", head: "A PS5", subA: "+ a jersey of", c1: "PS5 console", c2: "Wemby jersey",
    date: "Winners drawn on December 20, 2026",
    intro: "To enter, you need a paid, active Basketlog Pro (€9.99/month) or Lifetime subscription on December 19, 2026 at 11:59 p.m. Paris time (5:59 p.m. ET). Already Pro? You're in automatically.",
    cta: "Go Pro and enter", already: "Already Pro? Log in: you're already in.",
    member: "✅ You're in: your Pro subscription enters you in the December 20 drawing.", memberLink: "See tonight's games", memberFree: "Your account is free: go Pro to enter the December 20 drawing.",
    closed: "Entries are closed. Winners of the December 20 drawing are notified by email.",
    small: "Purchase of a Pro subscription required (€9.99/month) · Open to adults worldwide, with the exceptions listed in the rules · One chance per person.",
    stepsTitle: "How to enter",
    steps: [["Go Pro", "€9.99/month, in a few clicks. Already Pro or Lifetime? Nothing to do."], ["That's it", "Your subscription enters you automatically. Every subscriber gets one chance."], ["Drawing on December 20", "Two winners are drawn at random and notified by email the same day."]],
    rulesTitle: "Official rules", rulesToggle: "Read the official rules",
  },
  es: {
    metaTitle: "Sorteo de Navidad: gana una PS5 y una camiseta de Wembanyama – Basketlog",
    metaDesc: "Suscríbete a Basketlog Pro (9,99 €/mes) antes del 19 de diciembre de 2026 para ganar una PS5 o una camiseta de Victor Wembanyama. Sorteo el 20 de diciembre.",
    badge: "Sorteo de Navidad", label: "Sorteamos", head: "1 PS5", subA: "+ 1 camiseta de", c1: "Consola PS5", c2: "Camiseta de Wemby",
    date: "Sorteo el 20 de diciembre de 2026",
    intro: "Para participar, necesitas una suscripción a Basketlog Pro (9,99 €/mes) o Lifetime, pagada y activa el 19 de diciembre de 2026 a las 23:59 (hora de Madrid). ¿Ya eres Pro? Participas automáticamente.",
    cta: "Hacerme Pro y participar", already: "¿Ya eres Pro? Inicia sesión: ya participas.",
    member: "✅ Participas: tu suscripción Pro te inscribe en el sorteo del 20 de diciembre.", memberLink: "Ver los partidos de esta noche", memberFree: "Tu cuenta es gratuita: hazte Pro para participar en el sorteo del 20 de diciembre.",
    closed: "La participación está cerrada. Los ganadores del sorteo del 20 de diciembre reciben un correo.",
    small: "Compra de la suscripción Pro obligatoria (9,99 €/mes) · Abierto a mayores de edad de todo el mundo, salvo las excepciones de las bases · Una sola oportunidad por persona.",
    stepsTitle: "Cómo participar",
    steps: [["Hazte Pro", "9,99 €/mes, en pocos clics. ¿Ya eres Pro o Lifetime? No tienes que hacer nada."], ["Ya está", "Tu suscripción te inscribe sola en el sorteo. Cada suscriptor tiene una sola oportunidad."], ["Sorteo el 20 de diciembre", "Se eligen dos ganadores al azar y se les avisa por correo el mismo día."]],
    rulesTitle: "Bases legales", rulesToggle: "Leer las bases legales",
  },
};
// Portugais : surtout lu au Brésil, exclu du jeu ; règlement en anglais.
C.pt = {
  ...C.en,
  metaTitle: "Sorteio de Natal da Basketlog: um PS5 e uma camisa de Wembanyama",
  metaDesc: "Sorteio de Natal da Basketlog (um PS5 e uma camisa de Victor Wembanyama) para assinantes Pro, aberto no mundo todo, exceto no Brasil, na Itália e no Québec.",
  badge: "Sorteio de Natal", label: "Prêmios", head: "Um PS5", subA: "+ uma camisa de", c1: "Console PS5", c2: "Camisa do Wemby",
  date: "Sorteio em 20 de dezembro de 2026",
  intro: "Para participar, é preciso ter uma assinatura Basketlog Pro (9,99 €/mês) ou Lifetime paga e ativa em 19 de dezembro de 2026. O sorteio é aberto a maiores de idade no mundo todo, exceto no Brasil, onde esse tipo de sorteio exige autorização prévia do governo.",
  cta: "Virar Pro e participar", already: "Já é Pro? Entre na sua conta: você já participa.",
  member: "✅ Sua assinatura Pro está inscrita no sorteio de 20 de dezembro (exceto residentes no Brasil).", memberLink: "Ver os jogos desta noite", memberFree: "Sua conta é gratuita: vire Pro para participar do sorteio de 20 de dezembro (exceto residentes no Brasil).",
  closed: "As inscrições estão encerradas.",
  small: "Compra da assinatura Pro obrigatória · Aberto no mundo todo, exceto Brasil, Itália, Québec e países sob sanções · Uma única chance por pessoa.",
  stepsTitle: "Como funciona",
  steps: [["Vire Pro", "9,99 €/mês, em poucos cliques. Já é Pro ou Lifetime? Nada a fazer."], ["Pronto", "Sua assinatura entra sozinha no sorteio. Cada assinante tem uma única chance."], ["Sorteio em 20 de dezembro", "Dois ganhadores são sorteados e avisados por e-mail no mesmo dia."]],
  rulesTitle: "Regulamento oficial (em inglês)", rulesToggle: "Ler o regulamento oficial",
};

// Règlement : [titre, paragraphes]. e = éditeur du site (lib/legal.js), mail = lien vers l'adresse de contact.
function rules(lang, e, mail, privacy) {
  if (lang === "fr") return [
    ["Organisateur", [<>Basketlog ({LEGAL.url}), {e.adresse}, SIRET {e.siret}, contact : {mail} (« l&apos;Organisateur »), organise un jeu avec obligation d&apos;achat, réservé aux abonnés Basketlog Pro et Lifetime, intitulé « Jeu de Noël Basketlog » (« le Jeu »).</>]],
    ["Durée", ["Le Jeu est ouvert du 26 novembre 2026 au 19 décembre 2026 à 23 h 59 (heure de Paris). Le tirage au sort a lieu le 20 décembre 2026."]],
    ["Qui peut participer et comment", [
      "Le Jeu est ouvert à toute personne physique majeure (18 ans révolus, ou l'âge de la majorité de son pays ou État de résidence s'il est plus élevé), quel que soit son pays de résidence, à l'exception : des résidents du Brésil, d'Italie et de la province de Québec, où ce type de jeu demande une autorisation ou un enregistrement préalable ; des résidents de Cuba, d'Iran, de Corée du Nord, de Syrie, de Russie, de Biélorussie et des territoires occupés d'Ukraine, soumis à des sanctions internationales ; de l'Organisateur et des membres de son foyer. Le Jeu est nul là où la loi l'interdit. Un gagnant résidant au Canada doit répondre correctement à une question d'arithmétique avant de recevoir son lot.",
      <>Pour participer, il faut détenir un compte Basketlog avec un abonnement Pro (9,99 € par mois) ou un accès Lifetime, payé et actif le 19 décembre 2026 à 23 h 59 (heure de Paris) ; la seule période d&apos;essai ne suffit pas. Les abonnés Pro et Lifetime participent automatiquement. Un abonné qui ne souhaite pas participer peut le signaler à {mail}.</>,
      "Une seule participation par personne : un même participant ne peut gagner qu'un lot, même avec plusieurs comptes ou abonnements. Les comptes créés en série, avec des adresses jetables ou de façon automatisée sont exclus. Chaque abonné a une seule chance, quelle que soit sa formule (Pro ou Lifetime) ou la date de son abonnement.",
    ]],
    ["Lots", [
      "Lot n° 1 : une console PlayStation 5, édition standard (valeur commerciale indicative en France : 649,99 € TTC).",
      "Lot n° 2 : un maillot NBA Swingman de Victor Wembanyama (San Antonio Spurs), taille au choix du gagnant parmi celles disponibles (valeur commerciale indicative en France : 104,99 € TTC).",
      "Chaque lot est commandé auprès d'un vendeur du pays du gagnant, dans le modèle qui y est vendu, ou expédié depuis la France. Les lots ne peuvent être ni échangés ni remboursés en espèces ; s'il est impossible de fournir ou de livrer un lot dans le pays du gagnant, l'Organisateur le remplace par un lot ou un bon d'achat de valeur équivalente. Les éventuels droits de douane, impôts et taxes liés au lot dans le pays du gagnant sont à sa charge.",
    ]],
    ["Tirage au sort", ["Le 20 décembre 2026, l'Organisateur tire au sort, de façon aléatoire, deux gagnants parmi les comptes qui remplissent les conditions : le premier gagne le lot n° 1, le second le lot n° 2. Deux suppléants sont tirés de la même façon, dans le même ordre. Les chances de gagner dépendent du nombre de participations valables."]],
    ["Information des gagnants et remise des lots", [
      "Les gagnants sont prévenus le 20 décembre 2026 par e-mail, à l'adresse de leur compte Basketlog. Ils ont 7 jours pour répondre en donnant leurs nom et prénom, une adresse postale dans un pays éligible et, pour le maillot, la taille choisie. Une pièce d'identité peut être demandée pour vérifier l'âge et le lieu de résidence.",
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
    ["Organizador", [<>Basketlog ({LEGAL.url}), {e.adresse}, SIRET {e.siret}, contacto: {mail} (el «Organizador»), organiza un sorteo con obligación de compra, reservado a los suscriptores de Basketlog Pro y Lifetime, llamado «Sorteo de Navidad de Basketlog» (el «Sorteo»).</>]],
    ["Duración", ["El Sorteo está abierto del 26 de noviembre de 2026 al 19 de diciembre de 2026 a las 23:59 (hora de Madrid). El sorteo se realiza el 20 de diciembre de 2026."]],
    ["Quién puede participar y cómo", [
      "El Sorteo está abierto en todo el mundo a toda persona física mayor de edad (18 años, o la mayoría de edad de su país o estado de residencia si es superior), salvo: los residentes en Brasil, Italia y la provincia de Quebec, donde este tipo de sorteo requiere una autorización o un registro previo; los residentes en Cuba, Irán, Corea del Norte, Siria, Rusia, Bielorrusia y los territorios ocupados de Ucrania, sujetos a sanciones internacionales; y el Organizador y los miembros de su hogar. El Sorteo es nulo donde la ley lo prohíba. Un ganador residente en Canadá debe responder correctamente a una pregunta de cálculo antes de recibir su premio.",
      <>Para participar, hay que tener una cuenta de Basketlog con una suscripción Pro (9,99 € al mes) o un acceso Lifetime, pagado y activo el 19 de diciembre de 2026 a las 23:59 (hora de Madrid); el periodo de prueba por sí solo no basta. Los suscriptores Pro y Lifetime participan automáticamente. Quien no desee participar puede indicarlo en {mail}.</>,
      "Una sola participación por persona: un mismo participante solo puede ganar un premio, aunque tenga varias cuentas o suscripciones. Quedan excluidas las cuentas creadas en serie, con direcciones desechables o de forma automatizada. Cada suscriptor tiene una sola oportunidad, sea cual sea su fórmula (Pro o Lifetime) o la fecha de su suscripción.",
    ]],
    ["Premios", [
      "Premio 1: una consola PlayStation 5, edición estándar (valor comercial orientativo en Francia: 649,99 € IVA incluido).",
      "Premio 2: una camiseta NBA Swingman de Victor Wembanyama (San Antonio Spurs), talla a elegir por el ganador entre las disponibles (valor comercial orientativo en Francia: 104,99 € IVA incluido).",
      "Cada premio se compra a un vendedor del país del ganador, en el modelo que se vende allí, o se envía desde Francia. Los premios no se pueden cambiar ni canjear por dinero; si no fuera posible entregar un premio en el país del ganador, el Organizador lo sustituirá por otro premio o una tarjeta regalo de valor equivalente. Los derechos de aduana e impuestos que correspondan al premio en el país del ganador corren a su cargo.",
    ]],
    ["Sorteo", ["El 20 de diciembre de 2026, el Organizador elegirá al azar a dos ganadores entre las cuentas que cumplan las condiciones: el primero gana el premio 1 y el segundo, el premio 2. Se eligen también dos suplentes, de la misma forma y en el mismo orden. Las posibilidades de ganar dependen del número de participaciones válidas."]],
    ["Comunicación a los ganadores y entrega", [
      "Los ganadores reciben un correo el 20 de diciembre de 2026 en la dirección de su cuenta de Basketlog. Tienen 7 días para responder indicando su nombre y apellidos, una dirección postal en un país admitido y, para la camiseta, la talla elegida. Se puede pedir un documento de identidad para comprobar la edad y el lugar de residencia.",
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
    ["Sponsor", [<>Basketlog ({LEGAL.url}), {e.adresse}, SIRET {e.siret}, contact: {mail} (the “Sponsor”), runs a giveaway reserved for paying Basketlog Pro and Lifetime subscribers, called “Basketlog Christmas Giveaway” (the “Giveaway”). A purchase is required to enter.</>]],
    ["Entry period", ["The Giveaway runs from November 26, 2026 to December 19, 2026 at 11:59 p.m. Paris time (5:59 p.m. ET). The drawing takes place on December 20, 2026."]],
    ["Eligibility and how to enter", [
      "Open worldwide to individuals who are 18 or older (or the age of majority in their country or state of residence, if higher), except: residents of Brazil, Italy and the province of Quebec, where this type of giveaway requires prior authorization or registration; residents of Cuba, Iran, North Korea, Syria, Russia, Belarus and the occupied territories of Ukraine, which are subject to international sanctions; and the Sponsor and members of the Sponsor's household. Void where prohibited. A winner residing in Canada must correctly answer a mathematical skill-testing question before receiving a prize.",
      <>To enter, hold a Basketlog account with a paid, active Pro subscription (€9.99 per month) or Lifetime access on December 19, 2026 at 11:59 p.m. Paris time; a trial period alone does not qualify. Pro and Lifetime subscribers are entered automatically. A subscriber who does not wish to take part can say so at {mail}.</>,
      "Limit one entry per person: a participant can win only one prize, even with several accounts or subscriptions. Accounts created in bulk, with disposable addresses or by automated means are excluded. Each subscriber gets one chance, whatever the plan (Pro or Lifetime) or subscription date.",
    ]],
    ["Prizes", [
      "First prize: one PlayStation 5 console, standard edition (approximate retail value in France: €649.99).",
      "Second prize: one NBA Swingman jersey of Victor Wembanyama (San Antonio Spurs), size chosen by the winner among available sizes (approximate retail value in France: €104.99).",
      "Each prize is ordered from a retailer in the winner's country, in the model sold there, or shipped from France. Prizes cannot be exchanged or redeemed for cash; if a prize cannot be provided or delivered in the winner's country, the Sponsor will substitute a prize or gift card of equivalent value. Any customs duties and taxes on a prize in the winner's country are the winner's sole responsibility.",
    ]],
    ["Drawing", ["On December 20, 2026, the Sponsor will randomly select two winners among eligible accounts: the first wins the first prize, the second wins the second prize. Two alternates are drawn the same way, in the same order. Odds of winning depend on the number of eligible entries received."]],
    ["Winner notification and prize delivery", [
      "Winners are notified on December 20, 2026 by email, at their Basketlog account address. They have 7 days to reply with their full name, a postal address in an eligible country and, for the jersey, their size. Proof of identity may be requested to verify age and residence.",
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
  const session = decodeSession((await cookies()).get(COOKIE)?.value);
  const member = !!session?.uid;
  const pro = member && ["pro", "lifetime"].includes(session?.tier);
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
        ) : pro ? (
          <p className="concours-ok">{T.member} <Link href={L.href("/app/matchs")}>{T.memberLink}</Link></p>
        ) : (
          <div className="concours-cta">
            <Link href={L.href("/pro")} className="btn-solid concours-btn">{T.cta}</Link>
            <p>{member ? T.memberFree : T.already}</p>
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
          {!L.fr && !L.es && <p className="concours-caps">PURCHASE REQUIRED: A PAID BASKETLOG PRO OR LIFETIME SUBSCRIPTION IS NEEDED TO ENTER. VOID WHERE PROHIBITED.</p>}
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
