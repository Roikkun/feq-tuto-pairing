// Moteur du système de pairing (Warhammer 40,000 Teams Event Companion, p.2).
//
// Modèle : chaque équipe est une "main" de joueurs restants (non encore
// affectés à un duel). À chaque module, un Défenseur puis 2 Attaquants sont
// choisis parmi TOUTE la main restante (pas un sous-groupe figé) :
//   - Initial Skirmish : 2 duels formés, l'Attaquant refusé retourne dans la
//     main de son équipe pour le module suivant.
//   - Main Engagement  : 3 duels formés (les 2 Attaquants refusés
//     s'affrontent aussi) : personne ne retourne dans la main.
//   - Champion System  : le dernier joueur restant de chaque équipe
//     s'affronte directement.
//
// Combinaisons utilisées ici (on se concentre sur 6 et 8 joueurs) :
//   6 joueurs : Initial Skirmish -> Main Engagement -> Champion System
//   8 joueurs : Initial Skirmish x2 -> Main Engagement -> Champion System

function makeRoster(size, side, factionPool, dispositionPool) {
  const roster = [];
  for (let i = 0; i < size; i++) {
    roster.push({
      id: `${side}-${i}`,
      name: `${side === "team" ? "Joueur" : "Adversaire"} ${i + 1}`,
      position: i + 1,
      faction: factionPool[i],
      disposition: dispositionPool[i],
      side,
    });
  }
  return roster;
}

function buildRosters(size) {
  return {
    team: makeRoster(size, "team", shuffledFactions(), assignDispositions(size)),
    opp: makeRoster(size, "opp", shuffledFactions(), assignDispositions(size)),
  };
}

// Traite un module (Initial Skirmish ou Main Engagement) : `teamRemaining` et
// `oppRemaining` sont mutés en place (les joueurs affectés à un duel en sont
// retirés ; l'Attaquant refusé d'un Initial Skirmish y est remis).
function* runModule(moduleTitle, teamRemaining, oppRemaining, withRefusedMatch) {
  const hands = () => ({ teamHand: [...teamRemaining], oppHand: [...oppRemaining] });
  // Accumule les rôles déjà déterminés dans ce module (Défenseurs puis
  // Attaquants), rediffusés dans chaque étape suivante afin que l'interface
  // sache toujours ce qui est déjà connu, sans avoir à le suivre elle-même.
  const known = {};

  const teamDefender = yield {
    type: "choose-defender",
    module: moduleTitle,
    pool: [...teamRemaining],
    requiresChoice: true,
    ...hands(),
    ...known,
  };
  removeById(teamRemaining, teamDefender);
  const oppDefender = randomPick(oppRemaining);
  removeById(oppRemaining, oppDefender);
  known.teamDefender = teamDefender;
  known.oppDefender = oppDefender;

  yield {
    type: "reveal-defenders",
    module: moduleTitle,
    teamDefender,
    oppDefender,
    requiresChoice: false,
    ...hands(),
    ...known,
  };

  const teamAttackers = yield {
    type: "choose-attackers",
    module: moduleTitle,
    pool: [...teamRemaining],
    count: 2,
    requiresChoice: true,
    ...hands(),
    ...known,
  };
  teamAttackers.forEach((p) => removeById(teamRemaining, p));
  const oppAttackers = randomPickN(oppRemaining, 2);
  oppAttackers.forEach((p) => removeById(oppRemaining, p));
  known.teamAttackers = teamAttackers;
  known.oppAttackers = oppAttackers;

  yield {
    type: "reveal-attackers",
    module: moduleTitle,
    teamAttackers,
    oppAttackers,
    requiresChoice: false,
    ...hands(),
    ...known,
  };

  const teamChoice = yield {
    type: "choose-target",
    module: moduleTitle,
    defender: teamDefender,
    options: oppAttackers,
    requiresChoice: true,
    ...hands(),
    ...known,
  };
  const oppChoice = randomPick(teamAttackers);

  yield {
    type: "reveal-targets",
    module: moduleTitle,
    teamDefender,
    teamChoice,
    oppDefender,
    oppChoice,
    requiresChoice: false,
    ...hands(),
    ...known,
  };

  const matches = [
    { module: moduleTitle, playerA: teamDefender, playerB: teamChoice },
    { module: moduleTitle, playerA: oppDefender, playerB: oppChoice },
  ];

  const teamRefused = teamAttackers.find((p) => p.id !== oppChoice.id);
  const oppRefused = oppAttackers.find((p) => p.id !== teamChoice.id);

  if (withRefusedMatch) {
    yield {
      type: "refused-match",
      module: moduleTitle,
      playerA: teamRefused,
      playerB: oppRefused,
      requiresChoice: false,
      ...hands(),
      ...known,
    };
    matches.push({ module: moduleTitle, playerA: teamRefused, playerB: oppRefused });
  } else {
    teamRemaining.push(teamRefused);
    oppRemaining.push(oppRefused);
  }

  return { matches };
}

function moduleListForSize(teamSize) {
  if (teamSize === 6) {
    return [
      { title: "Initial Skirmish", withRefusedMatch: false },
      { title: "Main Engagement", withRefusedMatch: true },
    ];
  }
  if (teamSize === 8) {
    return [
      { title: "Initial Skirmish #1", withRefusedMatch: false },
      { title: "Initial Skirmish #2", withRefusedMatch: false },
      { title: "Main Engagement", withRefusedMatch: true },
    ];
  }
  throw new Error(`Taille d'équipe non gérée par ce tutoriel : ${teamSize}`);
}

// Nombre d'étapes (yields) produites par un module, pour la barre de
// progression : 6 pour un Initial Skirmish, 7 pour un Main Engagement
// (choose-defender, reveal-defenders, choose-attackers, reveal-attackers,
// choose-target, reveal-targets, [refused-match]).
function stepCountForSize(teamSize) {
  const modules = moduleListForSize(teamSize);
  const perModule = modules.reduce((sum, m) => sum + (m.withRefusedMatch ? 7 : 6), 0);
  return perModule + 1; // + Champion System
}

// Générateur principal : produit la séquence d'étapes du round complet pour
// une taille d'équipe donnée (6 ou 8), et retourne la liste finale des matchs.
function* runRound(teamSize, rosters) {
  const teamRemaining = [...rosters.team];
  const oppRemaining = [...rosters.opp];
  const matches = [];

  for (const { title, withRefusedMatch } of moduleListForSize(teamSize)) {
    const result = yield* runModule(title, teamRemaining, oppRemaining, withRefusedMatch);
    matches.push(...result.matches);
  }

  const teamChampion = teamRemaining[0];
  const oppChampion = oppRemaining[0];
  yield {
    type: "champion-match",
    module: "Champion System",
    playerA: teamChampion,
    playerB: oppChampion,
    requiresChoice: false,
    teamHand: [teamChampion],
    oppHand: [oppChampion],
  };
  matches.push({ module: "Champion System", playerA: teamChampion, playerB: oppChampion });

  return matches;
}
