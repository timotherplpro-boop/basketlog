// Avis Basketlog stockés dans Supabase (table basketlog_avis, protégée par RLS).
import { unstable_cache } from "next/cache";
import { localizeReviews, translateRaw } from "./translate";

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

const headers = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" });

// Traductions mises en cache 7 jours (un texte donné n'est traduit qu'une fois par langue). translateRaw lève une
// erreur en cas d'échec : un échec n'est donc jamais mis en cache et sera retenté à la visite suivante.
const translate = unstable_cache((text, from, to) => translateRaw(text, from, to), ["bl-avis-traduction-v1"], { revalidate: 7 * 24 * 3600, tags: ["avis-trad"] });

// Avis validés uniquement (la base refuse de renvoyer les autres). `lang` : langue de la page (fr, en, es) ; les avis
// écrits dans une autre langue sont traduits automatiquement (texte d'origine conservé dans `orig`).
export async function getReviews(limit = 30, lang = "fr") {
  if (!URL_ || !KEY) return { list: [], count: 0, avg: null };
  try {
    const res = await fetch(
      `${URL_}/rest/v1/basketlog_avis?select=id,created_at,prenom,profil,note,texte,photo_url,lien,verif&approuve=eq.true&order=created_at.desc&limit=${limit}`,
      { headers: { ...headers(), Prefer: "count=exact" }, next: { revalidate: 60, tags: ["avis"] } }
    );
    if (!res.ok) return { list: [], count: 0, avg: null };
    const list = await res.json();
    const count = Number((res.headers.get("content-range") || "").split("/")[1]) || list.length;
    // Note moyenne sur TOUS les avis validés, pas seulement les derniers affichés.
    let notes = list.map((r) => r.note);
    if (count > list.length) {
      const all = await fetch(`${URL_}/rest/v1/basketlog_avis?select=note&approuve=eq.true&limit=10000`, { headers: headers(), next: { revalidate: 60, tags: ["avis"] } });
      if (all.ok) notes = (await all.json()).map((r) => r.note);
    }
    const avg = notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : null;
    return { list: await localizeReviews(list, lang, translate).catch(() => list), count, avg };
  } catch {
    return { list: [], count: 0, avg: null };
  }
}

// Dépôt d'un avis par un abonné payant (vérifié par /api/avis), un seul par compte. La base n'accepte aucun dépôt
// direct : seule la fonction basketlog_add_avis, protégée par la clé serveur, peut en ajouter (formule payante exigée).
const SECRET = process.env.BASKETLOG_DB_KEY;

export async function addReview({ uid = null, formule = null, prenom, profil, note, texte }) {
  if (!URL_ || !KEY || !SECRET) return { ok: false };
  try {
    const res = await fetch(`${URL_}/rest/v1/rpc/basketlog_add_avis`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ p_key: SECRET, p_uid: uid || null, p_formule: uid ? formule || null : null, p_prenom: prenom, p_profil: profil || null, p_note: note, p_texte: texte }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false };
    const j = await res.json();
    return j?.ok ? { ok: true } : { ok: false, reason: j?.reason || null };
  } catch {
    return { ok: false };
  }
}
