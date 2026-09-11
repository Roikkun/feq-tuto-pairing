// Factions jouables de Warhammer 40,000 (10e édition), utilisées uniquement
// pour habiller les joueurs de démonstration. Aucune donnée n'est sauvegardée :
// une nouvelle répartition est tirée à chaque chargement de la page.
const FACTIONS = [
  { name: "Space Marines" },
  { name: "Adeptus Custodes" },
  { name: "Adepta Sororitas" },
  { name: "Astra Militarum" },
  { name: "Adeptus Mechanicus" },
  { name: "Grey Knights" },
  { name: "Imperial Knights" },
  { name: "Death Guard" },
  { name: "Thousand Sons" },
  { name: "World Eaters" },
  { name: "Emperor's Children" },
  { name: "Chaos Space Marines" },
  { name: "Chaos Knights" },
  { name: "Chaos Daemons" },
  { name: "Orks" },
  { name: "Aeldari" },
  { name: "Drukhari" },
  { name: "Necrons" },
  { name: "Tyranids" },
  { name: "T'au Empire" },
  { name: "Genestealer Cults" },
  { name: "Leagues of Votann" },
];

// Mélange une copie du tableau sans jamais persister le résultat.
function shuffledFactions() {
  return shuffleArray(FACTIONS);
}

// Convertit un nom de faction en identifiant de fichier ("T'au Empire" ->
// "tau-empire"), pour retrouver son image de fond par convention de nommage.
function factionSlug(name) {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function factionImagePath(faction) {
  return `assets/factions/${factionSlug(faction.name)}.jpg`;
}
