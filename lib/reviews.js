// Avis Basketlog stockés dans Supabase (table basketlog_avis, protégée par RLS).
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

const headers = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" });

// Avis validés uniquement (la base refuse de renvoyer les autres).
export async function getReviews(limit = 30) {
  if (!URL_ || !KEY) return { list: [], count: 0, avg: null };
  try {
    const res = await fetch(
      `${URL_}/rest/v1/basketlog_avis?select=id,created_at,prenom,profil,note,texte&approuve=eq.true&order=created_at.desc&limit=${limit}`,
      { headers: { ...headers(), Prefer: "count=exact" }, next: { revalidate: 60, tags: ["avis"] } }
    );
    if (!res.ok) return { list: [], count: 0, avg: null };
    const list = await res.json();
    const count = Number((res.headers.get("content-range") || "").split("/")[1]) || list.length;
    const avg = list.length ? list.reduce((s, r) => s + r.note, 0) / list.length : null;
    return { list, count, avg };
  } catch {
    return { list: [], count: 0, avg: null };
  }
}

export async function addReview({ prenom, profil, note, texte }) {
  if (!URL_ || !KEY) return { ok: false, error: "Service d'avis indisponible." };
  const res = await fetch(`${URL_}/rest/v1/basketlog_avis`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=minimal" },
    body: JSON.stringify({ prenom, profil: profil || null, note, texte }),
    cache: "no-store",
  });
  return res.ok ? { ok: true } : { ok: false, error: "Impossible d'enregistrer ton avis pour le moment." };
}
