// Lecture partagée gardée en mémoire : une seule lecture (chez Whop, par exemple) sert toutes les demandes pendant `fresh` ms,
// et les demandes simultanées attendent la même lecture au lieu d'en lancer chacune une. C'est ce qui garde la consommation du
// serveur et le nombre d'appels à Whop constants, que 1 ou 50 créateurs ouvrent leur page. Aucune dépendance (tests sous Node).
//  - fresh : durée pendant laquelle la dernière lecture est renvoyée telle quelle ;
//  - retry : après un échec, on ne relance pas la lecture avant ce délai (évite de marteler un service en panne) ;
//  - stale : si la lecture échoue, la dernière lecture réussie de moins de `stale` ms est renvoyée, marquée { stale: true }.
// Résultat : { ...valeur, at } (at : heure de la lecture, en ms), ou une erreur quand rien de récent n'est disponible.
export function sharedReader({ fetcher, fresh = 60e3, retry = 10e3, stale = 15 * 60e3, now = Date.now } = {}) {
  let good = null; // { at, value }
  let bad = null; // { at, error }
  let inflight = null;
  const age = (x) => now() - x.at;
  const fallback = (error) => {
    if (good && age(good) < stale) return { ...good.value, at: good.at, stale: true };
    throw error;
  };
  async function read() {
    if (good && age(good) < fresh) return { ...good.value, at: good.at };
    if (bad && age(bad) < retry) return fallback(bad.error);
    if (!inflight) {
      inflight = Promise.resolve()
        .then(fetcher)
        .then(
          (value) => { good = { at: now(), value }; bad = null; return value; },
          (error) => { bad = { at: now(), error }; throw error; }
        )
        .finally(() => { inflight = null; });
    }
    try {
      await inflight;
      return { ...good.value, at: good.at };
    } catch (e) {
      return fallback(e);
    }
  }
  read.reset = () => { good = null; bad = null; inflight = null; };
  return read;
}
