// Forces de Disposition (Warhammer 40,000 Teams Event Companion, p.1).
// Règle : au sein d'une équipe, chaque Force de Disposition doit être
// choisie au moins une fois, et aucune ne peut être choisie plus de deux fois.
const FORCE_DISPOSITIONS = [
  "TAKE AND HOLD",
  "PURGE THE FOE",
  "PRIORITY ASSETS",
  "RECONNAISSANCE",
  "DISRUPTION",
];

// Couleur d'identification propre à chaque Force de Disposition.
const DISPOSITION_COLORS = {
  "TAKE AND HOLD": "#2e6b3e",
  DISRUPTION: "#1a3a5c",
  "PRIORITY ASSETS": "#b8860a",
  RECONNAISSANCE: "#008080",
  "PURGE THE FOE": "#8b1b1b",
};

// Retourne un tableau de `teamSize` Forces de Disposition respectant la règle
// ci-dessus (chacune au moins une fois, jamais plus de deux fois), en ordre
// aléatoire, prêt à être distribué joueur par joueur.
function assignDispositions(teamSize) {
  const extraCount = teamSize - FORCE_DISPOSITIONS.length;
  const duplicated = shuffleArray(FORCE_DISPOSITIONS).slice(0, extraCount);
  return shuffleArray([...FORCE_DISPOSITIONS, ...duplicated]);
}
