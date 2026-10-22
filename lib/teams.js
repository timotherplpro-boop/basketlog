// Les 30 franchises NBA (identifiants ESPN). Sert à la recherche, au duel et aux logos.
const RAW = [
  ["1", "ATL", "Atlanta Hawks", "Hawks", "E"],
  ["2", "BOS", "Boston Celtics", "Celtics", "E"],
  ["17", "BKN", "Brooklyn Nets", "Nets", "E"],
  ["30", "CHA", "Charlotte Hornets", "Hornets", "E"],
  ["4", "CHI", "Chicago Bulls", "Bulls", "E"],
  ["5", "CLE", "Cleveland Cavaliers", "Cavaliers", "E"],
  ["6", "DAL", "Dallas Mavericks", "Mavericks", "W"],
  ["7", "DEN", "Denver Nuggets", "Nuggets", "W"],
  ["8", "DET", "Detroit Pistons", "Pistons", "E"],
  ["9", "GS", "Golden State Warriors", "Warriors", "W"],
  ["10", "HOU", "Houston Rockets", "Rockets", "W"],
  ["11", "IND", "Indiana Pacers", "Pacers", "E"],
  ["12", "LAC", "LA Clippers", "Clippers", "W"],
  ["13", "LAL", "Los Angeles Lakers", "Lakers", "W"],
  ["29", "MEM", "Memphis Grizzlies", "Grizzlies", "W"],
  ["14", "MIA", "Miami Heat", "Heat", "E"],
  ["15", "MIL", "Milwaukee Bucks", "Bucks", "E"],
  ["16", "MIN", "Minnesota Timberwolves", "Timberwolves", "W"],
  ["3", "NO", "New Orleans Pelicans", "Pelicans", "W"],
  ["18", "NY", "New York Knicks", "Knicks", "E"],
  ["25", "OKC", "Oklahoma City Thunder", "Thunder", "W"],
  ["19", "ORL", "Orlando Magic", "Magic", "E"],
  ["20", "PHI", "Philadelphia 76ers", "76ers", "E"],
  ["21", "PHX", "Phoenix Suns", "Suns", "W"],
  ["22", "POR", "Portland Trail Blazers", "Trail Blazers", "W"],
  ["23", "SAC", "Sacramento Kings", "Kings", "W"],
  ["24", "SA", "San Antonio Spurs", "Spurs", "W"],
  ["28", "TOR", "Toronto Raptors", "Raptors", "E"],
  ["26", "UTAH", "Utah Jazz", "Jazz", "W"],
  ["27", "WSH", "Washington Wizards", "Wizards", "E"],
];

export const logoUrl = (abbr) => `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${abbr.toLowerCase()}.png`;

export const TEAMS = RAW.map(([id, abbr, name, short, conf]) => ({ id, abbr, name, short, conf, logo: logoUrl(abbr) }));

export const teamById = (id) => TEAMS.find((t) => t.id === String(id)) || null;
