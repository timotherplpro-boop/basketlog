// Informations légales de Basketlog : une seule source pour toutes les pages légales.
// Éditeur de Basketlog (entreprise individuelle de Timothé Ramplou).

export const LEGAL = {
  updated: "29 octobre 2026",
  updatedEn: "October 29, 2026",
  updatedEs: "29 de octubre de 2026",
  site: "Basketlog",
  url: "https://basketlog-app.com",
  editeur: {
    nom: "Timothé Ramplou",
    statut: "entrepreneur individuel (micro-entreprise)",
    adresse: "14 rue d’Aubuisson, 31000 Toulouse, France",
    siren: "925 107 740",
    siret: "925 107 740 00019",
    registre: "Registre national des entreprises (RNE)",
    tva: "TVA non applicable, article 293 B du Code général des impôts",
  },
  email: "contact@basketlog-app.com", // boîte Zoho Mail (offre gratuite, centre de données UE)
  directeur: "Timothé Ramplou",
  hebergeur: {
    nom: "Vercel Inc.",
    adresse: "440 North Barranca Avenue, Suite 4133, Covina, CA 91723, États-Unis",
    tel: "+1 951 383 6898",
    site: "https://vercel.com",
  },
  base: {
    nom: "Supabase Pte. Ltd.",
    detail: "données hébergées dans la région AWS de Paris (eu-west-3)",
    site: "https://supabase.com",
  },
  paiement: {
    nom: "Whop, Inc.",
    adresse: "300 Kent Avenue #401, Brooklyn, NY 11249, États-Unis",
    site: "https://whop.com",
    confidentialite: "https://whop.com/privacy",
    commandes: "https://whop.com/@me/settings/orders/",
  },
  audience: {
    nom: "Amplitude, Inc.",
    detail: "centre de données de l’Union européenne",
    site: "https://amplitude.com",
  },
  mediateur: {
    nom: "CM2C — Centre de la Médiation de la Consommation de Conciliateurs de Justice",
    adresse: "49 rue de Ponthieu, 75008 Paris",
    site: "https://www.cm2c.net",
  },
  jeu: { nom: "Joueurs Info Service", tel: "09 74 75 13 13", site: "https://www.joueurs-info-service.fr" },
};

export const LEGAL_PAGES = [
  ["/mentions-legales", "Mentions légales"],
  ["/cgu", "CGU"],
  ["/cgv", "CGV"],
  ["/confidentialite", "Confidentialité"],
  ["/cookies", "Cookies"],
];
