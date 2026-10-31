// Appels aux sources externes (ESPN, EuroLeague) : deuxième essai après une erreur réseau, un délai dépassé
// ou une erreur 5xx / 429, puis les dernières données reçues gardées en secours (6 h) si la source reste injoignable.
// Évite qu'une coupure passagère d'ESPN affiche une page d'erreur.
const LAST = new Map();
const MAX_AGE = 6 * 3600e3;
const MAX_ENTRIES = 400;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function remember(url, json) {
  LAST.delete(url);
  LAST.set(url, { json, t: Date.now() });
  if (LAST.size > MAX_ENTRIES) LAST.delete(LAST.keys().next().value); // la plus ancienne
}

export async function fetchJSON(url, init = {}, { tries = 2, timeout = 8000 } = {}) {
  let err = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) });
      if (res.ok) {
        const json = await res.json();
        remember(url, json);
        return json;
      }
      err = Object.assign(new Error(`HTTP ${res.status} ${url}`), { status: res.status });
      if (res.status < 500 && res.status !== 429) break; // 404 & co : inutile de réessayer
    } catch (e) {
      err = e;
    }
    if (i < tries - 1) await sleep(400 * (i + 1));
  }
  const last = LAST.get(url);
  if (last && Date.now() - last.t < MAX_AGE) return last.json;
  throw err || new Error(`fetch ${url}`);
}
