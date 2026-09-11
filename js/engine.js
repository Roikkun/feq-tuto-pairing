// Moteur du système de pairing (Warhammer 40,000 Teams Event Companion, p.2).
// Modélise fidèlement les 3 modules décrits par les règles :
//   - Initial Skirmish : 3 joueurs -> 2 matchs, 1 "Attaquant refusé" reporté au module suivant
//   - Main Engagement  : 3 joueurs -> 3 matchs (les 2 Attaquants refusés s'affrontent), 0 reste
//   - Champion System  : 1 joueur restant de chaque équipe s'affronte directement
//
// Combinaisons utilisées ici (on se concentre sur 6 et 8 joueurs) :
//   6 joueurs : Initial Skirmish -> Main Engagement -> Champion System
//   8 joueurs : Initial Skirmish x2 -> Main Engagement -> Champion System

function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function makeRoster(size, prefix, factionPool) {
  const roster = [];
  for (let i = 0; i < size; i++) {
    roster.push({
      id: `${prefix}-${i}`,
      name: `${prefix === "team" ? "Joueur" : "Adversaire"} ${i + 1}`,
      faction: factionPool[i],
      side: prefix,
    });
  }
  return roster;
}

function buildRosters(size) {
  return {
    team: makeRoster(size, "team", shuffledFactions()),
    opp: makeRoster(size, "opp", shuffledFactions()),
  };
}

// Traite un module de 3 joueurs par équipe (Initial Skirmish ou Main Engagement).
// `withRefusedMatch` distingue Main Engagement (true) d'Initial Skirmish (false).
function* runModule(moduleTitle, teamPool, oppPool, withRefusedMatch) {
  const teamDefender = yield {
    type: "choose-defender",
    module: moduleTitle,
    pool: teamPool,
    requiresChoice: true,
  };
  const oppDefender = randomPick(oppPool);

  yield {
    type: "reveal-defenders",
    module: moduleTitle,
    teamDefender,
    oppDefender,
    requiresChoice: false,
  };

  const teamAttackers = teamPool.filter((p) => p.id !== teamDefender.id);
  const oppAttackers = oppPool.filter((p) => p.id !== oppDefender.id);

  yield {
    type: "show-attackers",
    module: moduleTitle,
    teamAttackers,
    oppAttackers,
    requiresChoice: false,
  };

  const teamChoice = yield {
    type: "choose-target",
    module: moduleTitle,
    defender: teamDefender,
    options: oppAttackers,
    requiresChoice: true,
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
    };
    matches.push({ module: moduleTitle, playerA: teamRefused, playerB: oppRefused });
    return { matches, teamLeftover: null, oppLeftover: null };
  }

  return { matches, teamLeftover: teamRefused, oppLeftover: oppRefused };
}

// Générateur principal : produit la séquence d'étapes du round complet pour
// une taille d'équipe donnée (6 ou 8), et retourne la liste finale des matchs.
function* runRound(teamSize, rosters) {
  const { team, opp } = rosters;
  const matches = [];

  if (teamSize === 6) {
    const skirmish = yield* runModule(
      "Initial Skirmish",
      team.slice(0, 3),
      opp.slice(0, 3),
      false
    );
    matches.push(...skirmish.matches);

    const engagement = yield* runModule(
      "Main Engagement",
      team.slice(3, 6),
      opp.slice(3, 6),
      true
    );
    matches.push(...engagement.matches);

    yield {
      type: "champion-match",
      module: "Champion System",
      playerA: skirmish.teamLeftover,
      playerB: skirmish.oppLeftover,
      requiresChoice: false,
    };
    matches.push({
      module: "Champion System",
      playerA: skirmish.teamLeftover,
      playerB: skirmish.oppLeftover,
    });

    return matches;
  }

  if (teamSize === 8) {
    const skirmish1 = yield* runModule(
      "Initial Skirmish #1",
      team.slice(0, 3),
      opp.slice(0, 3),
      false
    );
    matches.push(...skirmish1.matches);

    const skirmish2 = yield* runModule(
      "Initial Skirmish #2",
      team.slice(3, 6),
      opp.slice(3, 6),
      false
    );
    matches.push(...skirmish2.matches);

    const engagement = yield* runModule(
      "Main Engagement",
      [...team.slice(6, 8), skirmish1.teamLeftover],
      [...opp.slice(6, 8), skirmish1.oppLeftover],
      true
    );
    matches.push(...engagement.matches);

    yield {
      type: "champion-match",
      module: "Champion System",
      playerA: skirmish2.teamLeftover,
      playerB: skirmish2.oppLeftover,
      requiresChoice: false,
    };
    matches.push({
      module: "Champion System",
      playerA: skirmish2.teamLeftover,
      playerB: skirmish2.oppLeftover,
    });

    return matches;
  }

  throw new Error(`Taille d'équipe non gérée par ce tutoriel : ${teamSize}`);
}
