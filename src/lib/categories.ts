/**
 * Source unique des catégories du site.
 *
 * Le fichier `src/content/categories.json` porte le nom affiché (en français),
 * le slug d'URL (en anglais, figé pour ne pas casser les liens déjà
 * indexés) et la description SEO de la catégorie. Toutes les pages qui
 * listent ou présentent une catégorie lisent ce fichier : il n'existe pas
 * de deuxième liste de catégories dans le code.
 */
import raw from "../content/categories.json";

export interface CategoryDef {
  slug: string;
  name: string;
  description: string;
}

export const categories: CategoryDef[] = raw as CategoryDef[];

/** URL publique d'une catégorie. */
export function categoryUrl(slug: string): string {
  return `/category/${slug}/`;
}

/** Définition d'une catégorie à partir de son slug (undefined si inconnu). */
export function getCategory(slug: string): CategoryDef | undefined {
  return categories.find((c) => c.slug === slug);
}

/**
 * Nom affiché d'une catégorie : le nom du fichier de référence, ou le slug
 * en repli (catégorie orpheline issue d'un ancien article).
 */
export function categoryName(slug: string): string {
  return getCategory(slug)?.name ?? slug;
}
