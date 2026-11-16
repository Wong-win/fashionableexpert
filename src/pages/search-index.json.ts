import { getCollection } from "astro:content";

/**
 * Index de recherche statique.
 *
 * Le site étant entièrement statique, la recherche est exécutée côté client
 * à partir de ce fichier : le paramètre `?q=` n'est pas résolu à la
 * construction, contrairement à un rendu serveur.
 */
export async function GET() {
  const all = await getCollection("articles");
  const index = all
    .map((p) => ({
      u: `/${p.data.year}/${p.data.month}/${p.data.day}/${p.data.postSlug}/`,
      t: p.data.title,
      e: (p.data.excerpt || "").slice(0, 220),
      c: (p.data.categories || []).join(", "),
    }))
    .sort((a, b) => a.t.localeCompare(b.t, "fr"));
  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
