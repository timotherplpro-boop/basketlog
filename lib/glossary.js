// Lexique du basket et des probabilités (/app/lexique/[terme]) : questions pédagogiques peu disputées dans Google
// (« c'est quoi le net rating », « qué es el play-in », « what is a back-to-back in the NBA »).
// Chaque terme : titre et définition en 4 langues, lien vers la page du site qui s'en sert.
export const TERMS = [
  {
    slug: "probabilite-de-victoire",
    t: ["Probabilité de victoire", "Win probability", "Probabilidad de victoria", "Probabilidade de vitória"],
    d: [
      "La probabilité de victoire est la part de chances qu'une équipe gagne un match, de 0 à 100 %. À 70 %, l'équipe devrait gagner environ 7 matchs sur 10 dans cette situation, et en perdre 3 : un favori à 70 % qui perd n'est pas une erreur du modèle. Basketlog la calcule pour chaque match NBA et EuroLeague à partir de l'écart de points attendu, de l'avantage du terrain, de la fatigue et des absences.",
      "Win probability is a team's chance of winning a game, from 0 to 100%. At 70%, the team should win about 7 games out of 10 in that spot and lose 3, so a 70% favorite losing is not a model error. Basketlog computes it for every NBA and EuroLeague game from the expected point margin, home court, fatigue and injuries.",
      "La probabilidad de victoria es la proporción de opciones de que un equipo gane un partido, de 0 a 100 %. Con un 70 %, el equipo debería ganar unos 7 partidos de cada 10 en esa situación y perder 3: que un favorito al 70 % pierda no es un error del modelo. Basketlog la calcula para cada partido de la NBA y la Euroliga a partir de la diferencia de puntos esperada, la ventaja de jugar en casa, el cansancio y las bajas.",
      "A probabilidade de vitória é a chance de um time vencer um jogo, de 0 a 100 %. Com 70 %, o time deve vencer cerca de 7 jogos em 10 nessa situação e perder 3: um favorito com 70 % que perde não é um erro do modelo. O Basketlog calcula essa chance para cada jogo da NBA e da Euroliga a partir do saldo de pontos esperado, da vantagem de jogar em casa, do cansaço e dos desfalques.",
    ],
    link: "/app/matchs",
  },
  {
    slug: "net-rating",
    t: ["Net rating", "Net rating", "Net rating", "Net rating"],
    d: [
      "Le net rating est l'écart entre les points marqués et les points encaissés par une équipe sur 100 possessions. Un net rating de +5 veut dire que l'équipe marque 5 points de plus que ses adversaires toutes les 100 possessions. Ramené aux possessions, il compare mieux les équipes rapides et les équipes lentes que le simple écart par match. C'est l'un des meilleurs indicateurs du vrai niveau d'une équipe.",
      "Net rating is the difference between the points a team scores and allows per 100 possessions. A +5 net rating means the team outscores opponents by 5 points every 100 possessions. Because it is per possession, it compares fast and slow teams more fairly than the raw per-game margin. It is one of the best indicators of a team's true level.",
      "El net rating es la diferencia entre los puntos que anota y recibe un equipo cada 100 posesiones. Un net rating de +5 significa que el equipo supera a sus rivales por 5 puntos cada 100 posesiones. Al medirse por posesión, compara mejor a los equipos rápidos y lentos que la simple diferencia por partido. Es uno de los mejores indicadores del nivel real de un equipo.",
      "O net rating é a diferença entre os pontos que um time marca e sofre a cada 100 posses de bola. Um net rating de +5 quer dizer que o time supera os adversários por 5 pontos a cada 100 posses. Por ser medido por posse, compara melhor times rápidos e lentos do que o saldo por jogo. É um dos melhores indicadores do nível real de um time.",
    ],
    link: "/app/power-rankings",
  },
  {
    slug: "ecart-de-points",
    t: ["Écart de points (point differential)", "Point differential", "Diferencia de puntos", "Saldo de pontos"],
    d: [
      "L'écart de points est la différence moyenne, par match, entre les points marqués et les points encaissés. Il prédit mieux les résultats futurs que le bilan victoires-défaites, car il dépend moins des fins de match serrées. Une équipe à 10-6 avec un écart de +7 est souvent plus forte qu'une équipe à 12-4 avec un écart de +2. C'est la base de la force des équipes dans le modèle Basketlog.",
      "Point differential is the average per-game gap between points scored and points allowed. It predicts future results better than the win-loss record, because it depends less on close finishes. A 10-6 team at +7 is often stronger than a 12-4 team at +2. It is the basis of team strength in the Basketlog model.",
      "La diferencia de puntos es la media, por partido, entre los puntos anotados y recibidos. Predice mejor los resultados futuros que el balance de victorias y derrotas, porque depende menos de los finales ajustados. Un equipo con 10-6 y +7 suele ser más fuerte que uno con 12-4 y +2. Es la base de la fuerza de los equipos en el modelo de Basketlog.",
      "O saldo de pontos é a média, por jogo, da diferença entre pontos marcados e sofridos. Ele prevê melhor os resultados futuros do que a campanha de vitórias e derrotas, porque depende menos de finais apertados. Um time com 10-6 e +7 costuma ser mais forte que um com 12-4 e +2. É a base da força dos times no modelo do Basketlog.",
    ],
    link: "/app/power-rankings",
  },
  {
    slug: "play-in",
    t: ["Play-in", "Play-in tournament", "Play-in", "Play-in"],
    d: [
      "Le play-in est un mini-tournoi entre les équipes classées de la 7e à la 10e place de chaque conférence, avant les playoffs. Le 7e reçoit le 8e : le vainqueur est qualifié en 7e position. Le 9e reçoit le 10e : le perdant est éliminé. Le perdant de 7-8 reçoit ensuite le vainqueur de 9-10 pour la 8e et dernière place. Seuls les 6 premiers sont qualifiés directement.",
      "The play-in tournament is a mini-tournament between the teams seeded 7th to 10th in each conference, before the playoffs. No. 7 hosts No. 8 and the winner takes the 7 seed. No. 9 hosts No. 10 and the loser is out. The 7-8 loser then hosts the 9-10 winner for the eighth and final spot. Only the top 6 qualify directly.",
      "El play-in es un minitorneo entre los equipos clasificados del 7.º al 10.º puesto de cada conferencia, antes de los playoffs. El 7.º recibe al 8.º: el ganador se clasifica como 7.º. El 9.º recibe al 10.º: el perdedor queda eliminado. El perdedor del 7-8 recibe después al ganador del 9-10 por la 8.ª y última plaza. Solo los 6 primeros se clasifican directamente.",
      "O play-in é um mini-torneio entre os times classificados do 7º ao 10º lugar de cada conferência, antes dos playoffs. O 7º recebe o 8º: o vencedor se classifica em 7º. O 9º recebe o 10º: o perdedor é eliminado. O perdedor do 7-8 recebe depois o vencedor do 9-10 pela 8ª e última vaga. Só os 6 primeiros se classificam direto.",
    ],
    link: "/app/simulation",
  },
  {
    slug: "back-to-back",
    t: ["Back-to-back", "Back-to-back", "Back-to-back", "Back-to-back"],
    d: [
      "Un back-to-back, ce sont deux matchs joués deux soirs de suite par la même équipe, souvent avec un voyage entre les deux. Le deuxième soir, les joueurs sont plus fatigués et les équipes reposent parfois leurs stars. En moyenne, une équipe perd un peu plus souvent le deuxième soir : le modèle Basketlog lui retire environ 1,6 point.",
      "A back-to-back is two games played on consecutive nights by the same team, often with travel in between. On the second night players are more tired and teams sometimes rest their stars. On average a team loses a bit more often on the second night, so the Basketlog model takes about 1.6 points off.",
      "Un back-to-back son dos partidos jugados en dos noches seguidas por el mismo equipo, a menudo con un viaje entre ambos. La segunda noche los jugadores están más cansados y a veces los equipos dan descanso a sus estrellas. De media, un equipo pierde algo más a menudo la segunda noche: el modelo de Basketlog le resta unos 1,6 puntos.",
      "Um back-to-back são dois jogos disputados em duas noites seguidas pelo mesmo time, muitas vezes com viagem entre eles. Na segunda noite os jogadores estão mais cansados e os times às vezes poupam as estrelas. Em média, um time perde um pouco mais na segunda noite: o modelo do Basketlog tira cerca de 1,6 ponto.",
    ],
    link: "/app/back-to-back",
  },
  {
    slug: "difficulte-du-calendrier",
    t: ["Difficulté du calendrier", "Strength of schedule", "Dificultad del calendario", "Dificuldade do calendário"],
    d: [
      "La difficulté du calendrier mesure la force moyenne des adversaires d'une équipe. Deux équipes au même bilan ne se valent pas si l'une a affronté les meilleures équipes et l'autre les plus faibles. Le calendrier restant aide aussi à prévoir la fin de saison : une équipe qui doit encore jouer beaucoup de cadors gagnera moins de matchs que son niveau ne le laisse penser.",
      "Strength of schedule measures the average strength of a team's opponents. Two teams with the same record are not equal if one faced the best teams and the other the weakest. The remaining schedule also helps forecast the end of the season: a team that still has many strong opponents will win fewer games than its level suggests.",
      "La dificultad del calendario mide la fuerza media de los rivales de un equipo. Dos equipos con el mismo balance no son iguales si uno se enfrentó a los mejores y el otro a los más débiles. El calendario restante también ayuda a prever el final de la temporada: un equipo al que le quedan muchos rivales fuertes ganará menos partidos de lo que indica su nivel.",
      "A dificuldade do calendário mede a força média dos adversários de um time. Dois times com a mesma campanha não se equivalem se um enfrentou os melhores e o outro os mais fracos. O calendário restante também ajuda a prever o fim da temporada: um time que ainda tem muitos adversários fortes vai vencer menos jogos do que o seu nível indica.",
    ],
    link: "/app/calendrier-restant",
  },
  {
    slug: "loterie-de-la-draft",
    t: ["Loterie de la draft", "Draft lottery", "Lotería del draft", "Loteria do draft"],
    d: [
      "La loterie de la draft fixe l'ordre des premiers choix de la draft NBA entre les équipes non qualifiées pour les playoffs. Depuis la draft 2027, la NBA applique le système 3-2-1 : 16 équipes, 3, 2 ou 1 boule selon leur classement, et les 3 plus mauvais bilans n'ont plus que 2 boules pour décourager les défaites volontaires.",
      "The draft lottery sets the order of the top NBA draft picks among the teams that miss the playoffs. Starting with the 2027 draft, the NBA uses the 3-2-1 system: 16 teams, 3, 2 or 1 ball depending on their finish, and the 3 worst records only get 2 balls to discourage tanking.",
      "La lotería del draft fija el orden de las primeras elecciones del draft NBA entre los equipos que no llegan a playoffs. Desde el draft 2027, la NBA aplica el sistema 3-2-1: 16 equipos, 3, 2 o 1 bola según su clasificación, y los 3 peores balances solo tienen 2 bolas para desanimar las derrotas a propósito.",
      "A loteria do draft define a ordem das primeiras escolhas do draft da NBA entre os times fora dos playoffs. A partir do draft 2027, a NBA usa o sistema 3-2-1: 16 times, 3, 2 ou 1 bola conforme a classificação, e as 3 piores campanhas só têm 2 bolas para desestimular derrotas de propósito.",
    ],
    link: "/app/draft",
  },
  {
    slug: "avantage-du-terrain",
    t: ["Avantage du terrain", "Home-court advantage", "Ventaja de campo", "Vantagem de jogar em casa"],
    d: [
      "L'avantage du terrain est le bonus d'une équipe qui joue à domicile : son public, l'absence de voyage, ses habitudes. En NBA, il vaut aujourd'hui environ 2 à 3 points par match, moins qu'il y a vingt ans. Le modèle Basketlog compte 2,3 points pour l'équipe qui reçoit.",
      "Home-court advantage is the boost a team gets from playing at home: its crowd, no travel, familiar surroundings. In today's NBA it is worth about 2 to 3 points per game, less than twenty years ago. The Basketlog model gives the home team 2.3 points.",
      "La ventaja de campo es el plus de un equipo que juega en casa: su público, no viajar, sus costumbres. En la NBA actual vale unos 2 o 3 puntos por partido, menos que hace veinte años. El modelo de Basketlog da 2,3 puntos al equipo local.",
      "A vantagem de jogar em casa é o bônus de um time que joga no seu ginásio: a torcida, a falta de viagem, os hábitos. Na NBA de hoje vale cerca de 2 a 3 pontos por jogo, menos do que há vinte anos. O modelo do Basketlog dá 2,3 pontos ao time da casa.",
    ],
    link: "/methode",
  },
  {
    slug: "calibration",
    t: ["Calibration d'un modèle", "Model calibration", "Calibración de un modelo", "Calibração de um modelo"],
    d: [
      "Un modèle est bien calibré quand ses probabilités se vérifient : les équipes annoncées à 70 % gagnent environ 70 % du temps, celles à 60 % environ 60 % du temps. C'est le vrai test d'un modèle de prévision, plus que le simple taux de réussite. Basketlog publie sa calibration match par match, ratés compris.",
      "A model is well calibrated when its probabilities hold up: teams given 70% win about 70% of the time, teams at 60% about 60% of the time. That is the real test of a forecasting model, more than its raw hit rate. Basketlog publishes its calibration game by game, misses included.",
      "Un modelo está bien calibrado cuando sus probabilidades se cumplen: los equipos con un 70 % ganan alrededor del 70 % de las veces, los del 60 % alrededor del 60 %. Es la verdadera prueba de un modelo de predicción, más que el simple porcentaje de acierto. Basketlog publica su calibración partido a partido, fallos incluidos.",
      "Um modelo é bem calibrado quando as probabilidades se confirmam: os times com 70 % vencem cerca de 70 % das vezes, os com 60 % cerca de 60 %. É o verdadeiro teste de um modelo de previsão, mais do que a simples taxa de acerto. O Basketlog publica sua calibração jogo a jogo, erros incluídos.",
    ],
    link: "/app/bilan",
  },
];

const IDX = { fr: 0, en: 1, es: 2, pt: 3 };
export const termOf = (slug) => TERMS.find((x) => x.slug === slug) || null;
export const tr = (arr, lang) => arr[IDX[lang] ?? 0];
