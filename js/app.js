// Contrôleur d'interface : consomme le générateur du moteur de pairing
// (js/engine.js) et affiche chaque étape comme un écran de tutoriel.
// Aucune donnée n'est persistée (pas de localStorage, pas de backend) :
// tout l'état vit en mémoire et repart de zéro à chaque rechargement.

const STEP_TOTALS = { 6: 12, 8: 17 };

const state = {
  teamSize: null,
  rosters: null,
  generator: null,
  stepCount: 0,
  matches: [],
};

const root = document.getElementById("app");

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function factionBadge(player) {
  return `<span class="badge badge--${player.faction.allegiance}">${player.faction.name}</span>`;
}

function playerCard(player, { clickable = false, tag = "" } = {}) {
  const card = el(
    "div",
    `player-card player-card--${player.side}${clickable ? " player-card--clickable" : ""}`
  );
  card.innerHTML = `
    ${tag ? `<div class="player-card__tag">${tag}</div>` : ""}
    <div class="player-card__name">${player.name}</div>
    ${factionBadge(player)}
  `;
  return card;
}

function renderIntro() {
  root.innerHTML = "";
  const wrap = el("div", "screen screen--intro");
  wrap.innerHTML = `
    <p class="eyebrow">Warhammer 40,000 — Teams Event</p>
    <h1>Tutoriel du Pairing</h1>
    <p class="lead">
      Avant votre premier tournoi par équipe, découvrez pas à pas comment se
      déroule le <strong>pairing</strong> : la façon dont chaque membre de
      votre équipe se retrouve opposé à un adversaire au début de chaque
      round. Ce tutoriel simule la procédure officielle avec des joueurs et
      des factions fictifs — rien n'est sauvegardé, à chaque lancement les
      factions changent.
    </p>
  `;
  const btn = el("button", "btn btn--primary", "Commencer");
  btn.addEventListener("click", renderChooseSize);
  wrap.appendChild(btn);
  root.appendChild(wrap);
}

function renderChooseSize() {
  root.innerHTML = "";
  const wrap = el("div", "screen screen--choose-size");
  wrap.innerHTML = `
    <p class="eyebrow">Étape 1</p>
    <h2>Quelle taille d'équipe voulez-vous simuler ?</h2>
    <p class="lead">
      La procédure de pairing dépend du nombre de joueurs par équipe.
      Ce tutoriel couvre les deux formats les plus courants en événement.
    </p>
  `;
  const options = el("div", "size-options");
  [6, 8].forEach((size) => {
    const card = el("button", "size-option");
    card.innerHTML = `
      <span class="size-option__number">${size}</span>
      <span class="size-option__label">joueurs par équipe</span>
      <span class="size-option__modules">${
        size === 6
          ? "Initial Skirmish → Main Engagement → Champion System"
          : "Initial Skirmish ×2 → Main Engagement → Champion System"
      }</span>
    `;
    card.addEventListener("click", () => startRound(size));
    options.appendChild(card);
  });
  wrap.appendChild(options);
  root.appendChild(wrap);
}

function startRound(size) {
  state.teamSize = size;
  state.rosters = buildRosters(size);
  renderRoster();
}

function renderRoster() {
  root.innerHTML = "";
  const wrap = el("div", "screen screen--roster");
  wrap.innerHTML = `
    <p class="eyebrow">Étape 2</p>
    <h2>Les deux équipes en présence</h2>
    <p class="lead">
      Chaque joueur a mustered une armée d'une faction différente au sein de
      sa propre équipe. Voici les deux effectifs pour ce round (générés
      aléatoirement) :
    </p>
  `;
  const grid = el("div", "roster-grid");
  const teamCol = el("div", "roster-column");
  teamCol.innerHTML = `<h3 class="roster-column__title roster-column__title--team">Votre équipe</h3>`;
  state.rosters.team.forEach((p) => teamCol.appendChild(playerCard(p)));

  const oppCol = el("div", "roster-column");
  oppCol.innerHTML = `<h3 class="roster-column__title roster-column__title--opp">Équipe adverse</h3>`;
  state.rosters.opp.forEach((p) => oppCol.appendChild(playerCard(p)));

  grid.appendChild(teamCol);
  grid.appendChild(oppCol);
  wrap.appendChild(grid);

  const btn = el("button", "btn btn--primary", "Voir la séquence de pairing");
  btn.addEventListener("click", renderRoadmap);
  wrap.appendChild(btn);
  root.appendChild(wrap);
}

const MODULE_INFO = {
  "Initial Skirmish": "3 joueurs par équipe. Produit 2 duels ; l'Attaquant refusé attend le module suivant.",
  "Initial Skirmish #1": "3 joueurs par équipe. Produit 2 duels ; l'Attaquant refusé rejoint le Main Engagement.",
  "Initial Skirmish #2": "3 joueurs par équipe. Produit 2 duels ; l'Attaquant refusé deviendra Champion.",
  "Main Engagement": "3 joueurs par équipe. Produit 3 duels : les 2 Attaquants refusés s'affrontent aussi.",
  "Champion System": "1 joueur restant par équipe : les deux Champions s'affrontent directement.",
};

function roadmapForSize(size) {
  return size === 6
    ? ["Initial Skirmish", "Main Engagement", "Champion System"]
    : ["Initial Skirmish #1", "Initial Skirmish #2", "Main Engagement", "Champion System"];
}

function renderRoadmap() {
  root.innerHTML = "";
  const wrap = el("div", "screen screen--roadmap");
  wrap.innerHTML = `
    <p class="eyebrow">Étape 3</p>
    <h2>Le round se joue en ${roadmapForSize(state.teamSize).length} modules</h2>
    <p class="lead">Ils se résolvent dans cet ordre :</p>
  `;
  const path = el("div", "roadmap-path");
  roadmapForSize(state.teamSize).forEach((title, i) => {
    const step = el("div", "roadmap-step");
    step.innerHTML = `
      <div class="roadmap-step__index">${i + 1}</div>
      <div class="roadmap-step__body">
        <div class="roadmap-step__title">${title}</div>
        <div class="roadmap-step__desc">${MODULE_INFO[title]}</div>
      </div>
    `;
    path.appendChild(step);
  });
  wrap.appendChild(path);

  const btn = el("button", "btn btn--primary", "Démarrer le round");
  btn.addEventListener("click", beginSimulation);
  wrap.appendChild(btn);
  root.appendChild(wrap);
}

function beginSimulation() {
  state.generator = runRound(state.teamSize, state.rosters);
  state.stepCount = 0;
  advance();
}

function advance(inputValue) {
  const result = state.generator.next(inputValue);
  if (result.done) {
    state.matches = result.value;
    renderRecap();
    return;
  }
  state.stepCount += 1;
  renderStep(result.value);
}

function progressBar() {
  const total = STEP_TOTALS[state.teamSize];
  const pct = Math.min(100, Math.round((state.stepCount / total) * 100));
  return `
    <div class="progress">
      <div class="progress__label">${state.stepCount} / ${total}</div>
      <div class="progress__track"><div class="progress__fill" style="width:${pct}%"></div></div>
    </div>
  `;
}

function stepShell(moduleTitle, subtitle) {
  root.innerHTML = "";
  const wrap = el("div", "screen screen--step");
  wrap.innerHTML = `
    ${progressBar()}
    <p class="eyebrow">${moduleTitle}</p>
    <h2>${subtitle}</h2>
  `;
  root.appendChild(wrap);
  return wrap;
}

function addContinueButton(wrap, label = "Suivant") {
  const btn = el("button", "btn btn--primary", label);
  btn.addEventListener("click", () => advance());
  wrap.appendChild(btn);
}

function duelRow(playerA, playerB, tagA = "", tagB = "") {
  const row = el("div", "duel-row");
  row.appendChild(playerCard(playerA, { tag: tagA }));
  row.appendChild(el("div", "duel-row__vs", "VS"));
  row.appendChild(playerCard(playerB, { tag: tagB }));
  return row;
}

function renderStep(step) {
  switch (step.type) {
    case "choose-defender": {
      const wrap = stepShell(
        step.module,
        "Choisissez secrètement votre Défenseur"
      );
      wrap.appendChild(
        el(
          "p",
          "lead",
          "Le Défenseur est le joueur qui devra ensuite affronter l'un des deux Attaquants adverses. L'équipe adverse fait le même choix, en secret, au même moment."
        )
      );
      const pool = el("div", "player-pool");
      step.pool.forEach((p) => {
        const card = playerCard(p, { clickable: true });
        card.addEventListener("click", () => advance(p));
        pool.appendChild(card);
      });
      wrap.appendChild(pool);
      break;
    }

    case "reveal-defenders": {
      const wrap = stepShell(step.module, "Les Défenseurs sont révélés simultanément");
      wrap.appendChild(duelRow(step.teamDefender, step.oppDefender, "Défenseur", "Défenseur"));
      addContinueButton(wrap);
      break;
    }

    case "show-attackers": {
      const wrap = stepShell(
        step.module,
        "Les joueurs restants deviennent Attaquants"
      );
      wrap.appendChild(
        el(
          "p",
          "lead",
          "Les deux joueurs qui ne sont pas Défenseurs dans ce module sont automatiquement les deux Attaquants de leur équipe."
        )
      );
      const grid = el("div", "roster-grid roster-grid--compact");
      const teamCol = el("div", "roster-column");
      teamCol.innerHTML = `<h3 class="roster-column__title roster-column__title--team">Vos Attaquants</h3>`;
      step.teamAttackers.forEach((p) => teamCol.appendChild(playerCard(p)));
      const oppCol = el("div", "roster-column");
      oppCol.innerHTML = `<h3 class="roster-column__title roster-column__title--opp">Attaquants adverses</h3>`;
      step.oppAttackers.forEach((p) => oppCol.appendChild(playerCard(p)));
      grid.appendChild(teamCol);
      grid.appendChild(oppCol);
      wrap.appendChild(grid);
      addContinueButton(wrap);
      break;
    }

    case "choose-target": {
      const wrap = stepShell(
        step.module,
        "Votre Défenseur choisit son adversaire"
      );
      wrap.appendChild(
        el(
          "p",
          "lead",
          `${step.defender.name} doit choisir secrètement lequel des deux Attaquants adverses il/elle veut affronter. L'équipe adverse fait le même choix de son côté, parmi vos propres Attaquants.`
        )
      );
      const pool = el("div", "player-pool");
      step.options.forEach((p) => {
        const card = playerCard(p, { clickable: true });
        card.addEventListener("click", () => advance(p));
        pool.appendChild(card);
      });
      wrap.appendChild(pool);
      break;
    }

    case "reveal-targets": {
      const wrap = stepShell(step.module, "Les choix sont révélés : 2 duels sont formés");
      wrap.appendChild(duelRow(step.teamDefender, step.teamChoice, "Votre Défenseur", "Attaquant choisi"));
      wrap.appendChild(duelRow(step.oppDefender, step.oppChoice, "Défenseur adverse", "Votre Attaquant choisi"));
      addContinueButton(wrap);
      break;
    }

    case "refused-match": {
      const wrap = stepShell(
        step.module,
        "Les deux Attaquants refusés s'affrontent"
      );
      wrap.appendChild(
        el(
          "p",
          "lead",
          "Comme il s'agit du Main Engagement, les deux Attaquants que personne n'a choisi jouent l'un contre l'autre : cela forme le 3e duel du module."
        )
      );
      wrap.appendChild(duelRow(step.playerA, step.playerB, "Attaquant refusé", "Attaquant refusé"));
      addContinueButton(wrap);
      break;
    }

    case "champion-match": {
      const wrap = stepShell(step.module, "Le duel des Champions");
      wrap.appendChild(
        el(
          "p",
          "lead",
          "Il ne reste plus qu'un joueur par équipe : les Champions s'affrontent directement, sans sélection secrète."
        )
      );
      wrap.appendChild(duelRow(step.playerA, step.playerB, "Champion", "Champion"));
      addContinueButton(wrap, "Voir le récapitulatif du round");
      break;
    }

    default:
      throw new Error(`Étape inconnue : ${step.type}`);
  }
}

function renderRecap() {
  root.innerHTML = "";
  const wrap = el("div", "screen screen--recap");
  wrap.innerHTML = `
    <p class="eyebrow">Round complet</p>
    <h2>Récapitulatif des ${state.matches.length} duels</h2>
    <p class="lead">
      Chaque joueur retrouve désormais le symbole de Force Disposition de son
      adversaire sur sa carte pour connaître sa Primary Mission, et la table
      se met en place. Voici les rencontres formées par le pairing :
    </p>
  `;
  const list = el("div", "recap-list");
  let lastModule = null;
  state.matches.forEach((m) => {
    if (m.module !== lastModule) {
      list.appendChild(el("h3", "recap-list__module", m.module));
      lastModule = m.module;
    }
    list.appendChild(duelRow(m.playerA, m.playerB));
  });
  wrap.appendChild(list);

  const btn = el("button", "btn btn--primary", "Recommencer avec de nouvelles factions");
  btn.addEventListener("click", renderChooseSize);
  wrap.appendChild(btn);
  root.appendChild(wrap);
}

renderIntro();
