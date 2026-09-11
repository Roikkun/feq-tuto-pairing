// Factions jouables de Warhammer 40,000 (10e édition), utilisées uniquement
// pour habiller les joueurs de démonstration. Aucune donnée n'est sauvegardée :
// une nouvelle répartition est tirée à chaque chargement de la page.
const FACTIONS = [
  { name: "Space Marines", allegiance: "imperium" },
  { name: "Adeptus Custodes", allegiance: "imperium" },
  { name: "Adepta Sororitas", allegiance: "imperium" },
  { name: "Astra Militarum", allegiance: "imperium" },
  { name: "Adeptus Mechanicus", allegiance: "imperium" },
  { name: "Grey Knights", allegiance: "imperium" },
  { name: "Imperial Knights", allegiance: "imperium" },
  { name: "Agents of the Imperium", allegiance: "imperium" },
  { name: "Death Guard", allegiance: "chaos" },
  { name: "Thousand Sons", allegiance: "chaos" },
  { name: "World Eaters", allegiance: "chaos" },
  { name: "Emperor's Children", allegiance: "chaos" },
  { name: "Chaos Space Marines", allegiance: "chaos" },
  { name: "Chaos Knights", allegiance: "chaos" },
  { name: "Chaos Daemons", allegiance: "chaos" },
  { name: "Orks", allegiance: "xenos" },
  { name: "Aeldari", allegiance: "xenos" },
  { name: "Drukhari", allegiance: "xenos" },
  { name: "Harlequins", allegiance: "xenos" },
  { name: "Necrons", allegiance: "xenos" },
  { name: "Tyranids", allegiance: "xenos" },
  { name: "T'au Empire", allegiance: "xenos" },
  { name: "Genestealer Cults", allegiance: "xenos" },
  { name: "Leagues of Votann", allegiance: "xenos" },
];

// Mélange une copie du tableau (Fisher-Yates) sans jamais persister le résultat.
function shuffledFactions() {
  const pool = [...FACTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}
