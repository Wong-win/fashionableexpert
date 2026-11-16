/**
 * Informations légales de l'éditeur — source unique de vérité.
 *
 * Toute modification ici se répercute automatiquement sur :
 *   /mentions-legales/ , /politique-de-confidentialite/ , le bandeau cookies
 *   et le pied de page. Aucun identifiant personnel (numéro de sécurité
 *   sociale, date de naissance) ne doit être ajouté dans ce fichier : ces
 *   informations servent exclusivement aux vérifications KYC des plateformes
 *   d'affiliation.
 *
 * Formulations neutres en genre (« Direction de la publication »,
 * « publication tenue à titre indépendant ») : le genre de la personne qui
 * édite le site n'étant pas connu, il n'apparaît nulle part dans les pages
 * publiques.
 */
export const siteInfo = {
  siteName: "FashionableExpert",
  domain: "fashionableexpert.com",
  origin: "https://www.fashionableexpert.com",

  publisher: {
    name: "Harley Little",
    role: "Publication tenue à titre indépendant",
    legalStatus:
      "Personne physique établie hors Union européenne (Royaume-Uni), qui publie sous sa propre responsabilité.",
    address: {
      line1: "47 Crown St",
      city: "London",
      region: "",
      postalCode: "W3 6FJ",
      country: "Royaume-Uni",
    },
    /**
     * true  → publie l'adresse complète (exigence LCEN : adresse de l'éditeur).
     * false → ne publie que la ville (compromis vie privée / conformité).
     */
    publishFullAddress: true,
    email: "contact@fashionableexpert.com",
    phone: "070 0969 2940",
    directorOfPublication: "Harley Little",
  },

  hosting: {
    name: "Cloudflare, Inc.",
    address: "101 Townsend Street, San Francisco, CA 94107, États-Unis",
    phone: "+1 (650) 319-8930",
    url: "https://www.cloudflare.com",
  },

  /**
   * Régies / réseaux d'affiliation dont dépend le modèle économique du site.
   *
   * Ce site ne contient aujourd'hui ni bannière publicitaire, ni lien
   * d'affiliation : le tableau est vide. Ajouter une entrée ici
   * (Kwanko, Metaffiliation…) met à jour automatiquement les mentions
   * légales, la politique de confidentialité et le bandeau cookies.
   */
  adNetworks: [] as const,

  /**
   * true  → les mentions légales nomment les réseaux d'affiliation utilisés.
   * false → elles n'en nomment aucun ; la liste complète reste dans la
   *         politique de confidentialité, où elle est legally requise
   *         (RGPD art. 13 : identification des tiers déposant des traceurs).
   */
  listAdNetworksInLegalNotices: false,

  analytics: {
    provider: "Google LLC — Google Analytics 4",
    id: "G-SPCRNZBWG3",
  },

  consent: {
    /** Clé de stockage local du choix de l'utilisateur. */
    storageKey: "fe_cookie_consent",
    /**
     * CNIL : le consentement est considéré comme expiré après 6 mois
     * (durée maximale recommandée pour les traceurs exemptés de consentement).
     */
    maxAgeDays: 180,
  },
} as const;

export const publisherAddress = siteInfo.publisher.publishFullAddress
  ? `${siteInfo.publisher.address.line1}, ${siteInfo.publisher.address.city} ${siteInfo.publisher.address.postalCode}, ${siteInfo.publisher.address.country}`
  : `${siteInfo.publisher.address.city} ${siteInfo.publisher.address.postalCode}, ${siteInfo.publisher.address.country}`;

export const publisherAddressHtml = siteInfo.publisher.publishFullAddress
  ? `${siteInfo.publisher.address.line1},<br />${siteInfo.publisher.address.city} ${siteInfo.publisher.address.postalCode}, ${siteInfo.publisher.address.country}`
  : `${siteInfo.publisher.address.city} ${siteInfo.publisher.address.postalCode}, ${siteInfo.publisher.address.country}`;
