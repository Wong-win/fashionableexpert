/**
 * Formatage des textes affichés (extraits, meta descriptions).
 */

/**
 * Tronque un texte sur une frontière de mot, sans couper au milieu d'un
 * mot et sans ajouter de points de suspension inutiles.
 */
export function truncate(text: string | undefined, max: number): string {
  const clean = (text || "").trim().replace(/\s+/g, " ");
  if (!clean) return "";
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  // Si le dernier mot commence trop tard, on coupe tel quel plutôt que de
  // perdre la moitié du mot.
  const base = sp > max * 0.6 ? cut.slice(0, sp) : cut;
  return base.trimEnd() + "…";
}

/**
 * Meta description : 155 caractères maximum (au-delà, Google tronque).
 */
export function metaDescription(text: string | undefined, max = 155): string {
  return truncate(text, max);
}

/**
 * Description d'une page de catégorie : le texte de référence de la
 * catégorie, complété par le nombre d'articles publiés si la longueur
 * totale reste dans la limite de 155 caractères.
 */
export function categoryDescription(description: string, count: number, max = 155): string {
  const suffix = ` ${count} article${count > 1 ? "s" : ""} publié${count > 1 ? "s" : ""} sur ce thème.`;
  if (description.length + suffix.length <= max) return `${description}${suffix}`;
  return truncate(description, max);
}
