// Petits utilitaires partagés (aucune dépendance, aucune donnée persistée).

function shuffleArray(list) {
  const pool = [...list];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Tire `count` éléments distincts de `list`, sans les retirer de `list`.
function randomPickN(list, count) {
  return shuffleArray(list).slice(0, count);
}

function removeById(list, player) {
  const idx = list.findIndex((p) => p.id === player.id);
  if (idx !== -1) list.splice(idx, 1);
}
