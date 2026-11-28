import Link from "next/link";
import { pageMeta } from "../../lib/seo";
import { SITE } from "../../lib/site";
import JsonLd from "../../components/JsonLd";
import Crumbs from "../../components/Crumbs";
import { getL } from "../../lib/lang-server";

// Page « À propos » : qui fait Basketlog, comment, avec quels principes. Demandée par les consignes qualité de Google
// (mise à jour de fond du 10 nov. 2026 : le site a presque disparu des résultats à partir du 13 nov.). Aucune donnée
// calculée ici : la page coûte très peu à Vercel.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("À propos de Basketlog : qui sommes-nous ?", "About Basketlog: who we are", "Sobre Basketlog: quiénes somos", "Sobre o Basketlog: quem somos"),
    description: L.t(
      "Basketlog est un site indépendant de probabilités de victoire NBA et EuroLeague, créé en France par Tim. Méthode publique, bilan vérifié match par match, contact.",
      "Basketlog is an independent site for NBA and EuroLeague win probabilities, built in France by Tim. Public methodology, results checked game by game, contact.",
      "Basketlog es una web independiente de probabilidades de victoria de la NBA y la Euroliga, creada en Francia por Tim. Metodología pública, balance verificado partido a partido, contacto.",
      "O Basketlog é um site independente de probabilidades de vitória da NBA e da Euroliga, criado na França por Tim. Metodologia pública, desempenho verificado jogo a jogo, contato."
    ),
    path: "/a-propos",
    L,
  });
}

export default async function AboutPage() {
  const L = await getL();
  const ld = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: L.t("À propos de Basketlog", "About Basketlog", "Sobre Basketlog", "Sobre o Basketlog"),
    url: `${SITE}${L.href("/a-propos")}`,
    inLanguage: L.hreflang,
    mainEntity: { "@id": `${SITE}/#organisation` },
    isPartOf: { "@id": `${SITE}/#site` },
  };
  const A = ({ href, children }) => <Link href={L.href(href)}>{children}</Link>;
  return (
    <main className="app-page prose-page">
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("À propos", "About", "Sobre nosotros", "Sobre"), "/a-propos"]]} />
      <div className="app-head">
        <h1>{L.t("À propos de Basketlog", "About Basketlog", "Sobre Basketlog", "Sobre o Basketlog")}</h1>
        <p>{L.t("Un site indépendant, fait par un passionné de basket, qui publie ses chiffres et ses erreurs.", "An independent site, made by a basketball fan, that publishes its numbers and its misses.", "Una web independiente, hecha por un apasionado del baloncesto, que publica sus cifras y sus fallos.", "Um site independente, feito por um apaixonado por basquete, que publica seus números e seus erros.")}</p>
      </div>

      <div className="card block">
        <h2>{L.t("Ce que fait Basketlog", "What Basketlog does", "Qué hace Basketlog", "O que o Basketlog faz")}</h2>
        <p className="narr">
          {L.t(
            "Pour chaque match de NBA et d'EuroLeague, Basketlog calcule la probabilité de victoire de chaque équipe et un score projeté, à partir du niveau réel des équipes, de l'avantage du terrain, de la fatigue et des absences. Le site couvre aussi le basket universitaire américain (NCAA), le classement, la course au MVP et la loterie de la draft.",
            "For every NBA and EuroLeague game, Basketlog calculates each team's win probability and a projected score, based on real team strength, home-court advantage, fatigue and injuries. The site also covers college basketball (NCAA), the standings, the MVP race and the draft lottery.",
            "Para cada partido de la NBA y de la Euroliga, Basketlog calcula la probabilidad de victoria de cada equipo y un marcador proyectado, a partir del nivel real de los equipos, la ventaja de jugar en casa, el cansancio y las bajas. La web cubre también el baloncesto universitario (NCAA), la clasificación, la carrera al MVP y la lotería del draft.",
            "Para cada jogo da NBA e da Euroliga, o Basketlog calcula a probabilidade de vitória de cada time e um placar projetado, a partir do nível real dos times, da vantagem de jogar em casa, do cansaço e dos desfalques. O site também cobre o basquete universitário (NCAA), a classificação, a corrida pelo MVP e a loteria do draft."
          )}
        </p>
        <p className="narr"><A href="/app/matchs">{L.t("Les matchs du jour →", "Today's games →", "Los partidos de hoy →", "Os jogos de hoje →")}</A></p>
      </div>

      <div className="card block">
        <h2>{L.t("Qui est derrière", "Who is behind it", "Quién está detrás", "Quem está por trás")}</h2>
        <p className="narr">
          {L.t(
            "Basketlog a été créé à l'automne 2026 par Tim, un passionné de basket installé en France. Il conçoit le modèle, écrit le site et répond lui-même aux messages. Basketlog n'appartient à aucun groupe de médias ni à aucun opérateur de jeux.",
            "Basketlog was launched in autumn 2026 by Tim, a basketball fan based in France. He designs the model, builds the site and answers messages himself. Basketlog is not owned by any media group or gaming operator.",
            "Basketlog nació en otoño de 2026, creado por Tim, un apasionado del baloncesto que vive en Francia. Él diseña el modelo, programa la web y responde personalmente a los mensajes. Basketlog no pertenece a ningún grupo de medios ni a ningún operador de juego.",
            "O Basketlog foi criado no outono europeu de 2026 por Tim, um apaixonado por basquete que mora na França. Ele concebe o modelo, desenvolve o site e responde pessoalmente às mensagens. O Basketlog não pertence a nenhum grupo de mídia nem a nenhum operador de jogos."
          )}
        </p>
      </div>

      <div className="card block">
        <h2>{L.t("Nos principes", "Our principles", "Nuestros principios", "Nossos princípios")}</h2>
        <ul className="narr">
          <li>{L.t("Transparence : la méthode est publique, ", "Transparency: the methodology is public, ", "Transparencia: la metodología es pública, ", "Transparência: a metodologia é pública, ")}<A href="/methode">{L.t("ici", "here", "aquí", "aqui")}</A>.</li>
          <li>{L.t("Vérification : chaque probabilité est comparée au résultat final, réussites et ratés compris, dans le ", "Accountability: every probability is compared with the final result, hits and misses alike, in the ", "Verificación: cada probabilidad se compara con el resultado final, aciertos y fallos incluidos, en el ", "Verificação: cada probabilidade é comparada com o resultado final, acertos e erros incluídos, no ")}<A href="/app/bilan">{L.t("bilan public", "public track record", "balance público", "desempenho público")}</A>.</li>
          <li>{L.t("Gratuité : les probabilités de tous les matchs sont gratuites, avec des ", "Free: probabilities for every game are free, with ", "Gratis: las probabilidades de todos los partidos son gratuitas, con ", "Grátis: as probabilidades de todos os jogos são gratuitas, com ")}<A href="/app/donnees">{L.t("données ouvertes", "open data", "datos abiertos", "dados abertos")}</A>{L.t(". L'offre Pro ajoute les analyses détaillées.", ". The Pro plan adds the detailed analyses.", ". La oferta Pro añade los análisis detallados.", ". O plano Pro acrescenta as análises detalhadas.")}</li>
          <li>{L.t("Indépendance : Basketlog ne propose ni ne recommande aucun site de jeu d'argent. Une probabilité n'est jamais une certitude.", "Independence: Basketlog does not offer or recommend any gambling site. A probability is never a certainty.", "Independencia: Basketlog no ofrece ni recomienda ninguna web de juego. Una probabilidad nunca es una certeza.", "Independência: o Basketlog não oferece nem recomenda nenhum site de apostas. Uma probabilidade nunca é uma certeza.")}</li>
        </ul>
      </div>

      <div className="card block">
        <h2>{L.t("Nous contacter", "Contact us", "Contacto", "Contato")}</h2>
        <p className="narr">
          {L.t("Par e-mail : ", "By email: ", "Por correo: ", "Por e-mail: ")}<b>contact@basketlog-app.com</b>
          {L.t(". Une erreur dans un chiffre ? Écrivez-nous, elle sera corrigée.", ". Spotted a wrong number? Write to us and it will be fixed.", ". ¿Has visto un dato erróneo? Escríbenos y lo corregiremos.", ". Viu um número errado? Escreva para nós e ele será corrigido.")}
        </p>
        <p className="narr">
          <a href="https://www.linkedin.com/company/basketlog" rel="noopener" target="_blank">LinkedIn</a>{" · "}
          <a href="https://bsky.app/profile/basketlog.bsky.social" rel="noopener" target="_blank">Bluesky</a>{" · "}
          <a href="https://x.com/Basketlog" rel="noopener" target="_blank">X</a>{" · "}
          <a href="https://www.youtube.com/@basketlog" rel="noopener" target="_blank">YouTube</a>{" · "}
          <A href="/mentions-legales">{L.t("Mentions légales", "Legal notice", "Aviso legal", "Aviso legal")}</A>
        </p>
      </div>
    </main>
  );
}
