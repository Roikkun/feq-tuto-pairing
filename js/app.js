// Contrôleur d'interface : consomme le générateur du moteur de pairing
// (js/engine.js) et affiche chaque étape comme un écran de tutoriel.
// Aucune donnée n'est persistée (pas de localStorage, pas de backend) :
// tout l'état vit en mémoire et repart de zéro à chaque rechargement.

const state = {
  teamSize: null,
  rosters: null,
  generator: null,
  stepCount: 0,
  stepTotal: 0,
  matches: [],
  // Duels déjà décidés dans ce round, accumulés au fil des modules pour le
  // récapitulatif affiché en bas de chaque étape.
  recap: [],
};

// Sélection en cours pour l'étape "choisissez 2 Attaquants" (remise à zéro à
// chaque rendu de cette étape).
let pendingAttackers = [];

const root = document.getElementById("app");

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

// Remplace l'écran affiché par `wrap` en animant une glissade : l'ancien
// écran glisse vers la gauche en s'estompant pendant que le nouveau glisse
// depuis la droite, sans le petit saut d'un rechargement brut.
function mount(wrap) {
  const old = root.querySelector(".screen:not(.screen--exit)");
  if (old) {
    old.classList.add("screen--exit");
    old.addEventListener("animationend", () => old.remove(), { once: true });
  }
  wrap.classList.add("screen--enter");
  root.appendChild(wrap);
}

// Remplace le contenu de l'écran courant instantanément, sans glissade :
// utilisé pour les re-rendus internes à une même étape (ex. sélection des
// Attaquants), où seul l'état de sélection change.
function updateInPlace(wrap) {
  const old = root.querySelector(".screen");
  if (old) {
    old.replaceWith(wrap);
  } else {
    root.appendChild(wrap);
  }
}

// --- Carte joueur façon jeu de cartes -------------------------------------
// Haut-gauche : faction. Haut-droite : "J{n}" en bleu (allié) / rouge (adversaire).
// Sous l'en-tête : Force de Disposition.
function playerCard(player, { clickable = false, selected = false, tag = "" } = {}) {
  const classes = [
    "card",
    `card--${player.side}`,
    clickable ? "card--clickable" : "",
    selected ? "card--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const card = el("div", classes);
  card.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url("${factionImagePath(player.faction)}")`;
  card.innerHTML = `
    ${tag ? `<div class="card__tag">${tag}</div>` : ""}
    <span class="card__faction">${player.faction.name}</span>
    <div class="card__bottom">
      <span class="card__disposition" style="background:${DISPOSITION_COLORS[player.disposition]}">${player.disposition}</span>
      <span class="card__position card__position--${player.side}">J${player.position}</span>
    </div>
  `;
  return card;
}

function facedownCard() {
  return el("div", "card card--facedown", `<span class="card__facedown-mark">?</span>`);
}

// --- Écran d'introduction + choix de la taille d'équipe --------------------

let selectedSize = null;

function renderIntro() {
  selectedSize = null;
  renderSizeStep({ showIntro: true, reRender: false });
}

function renderChooseSize() {
  selectedSize = null;
  renderSizeStep({ showIntro: false, reRender: false });
}

function renderSizeStep({ showIntro, reRender }) {
  const wrap = el("div", "screen screen--intro");

  if (showIntro) {
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
      <hr class="divider" />
    `;
  }

  const heading = el("div", null);
  heading.innerHTML = `
    <h2>Quelle taille d'équipe voulez-vous simuler ?</h2>
    <p class="lead">
      La procédure de pairing dépend du nombre de joueurs par équipe.
      Ce tutoriel couvre les deux formats les plus courants en événement.
    </p>
  `;
  wrap.appendChild(heading);

  const options = el("div", "size-options");
  [6, 8].forEach((size) => {
    const card = el("button", `size-option${selectedSize === size ? " size-option--selected" : ""}`);
    card.innerHTML = `
      <span class="size-option__number">${size}</span>
      <span class="size-option__label">joueurs par équipe</span>
      <span class="size-option__modules">${
        size === 6
          ? "Initial Skirmish → Main Engagement → Champion System"
          : "Initial Skirmish ×2 → Main Engagement → Champion System"
      }</span>
    `;
    card.addEventListener("click", () => {
      selectedSize = size;
      renderSizeStep({ showIntro, reRender: true });
    });
    options.appendChild(card);
  });
  wrap.appendChild(options);

  const btn = el("button", "btn btn--primary", "Commencer");
  btn.disabled = selectedSize === null;
  btn.addEventListener("click", () => {
    if (selectedSize !== null) startRound(selectedSize);
  });
  wrap.appendChild(btn);

  if (reRender) {
    updateInPlace(wrap);
  } else {
    mount(wrap);
  }
}

function startRound(size) {
  state.teamSize = size;
  state.rosters = buildRosters(size);
  renderRoster();
}

function renderRoster() {
  const wrap = el("div", "screen screen--roster");
  wrap.innerHTML = `
    <h2>Les deux équipes en présence</h2>
    <p class="lead">
      Chaque joueur a mustered une armée d'une faction différente au sein de
      sa propre équipe, et sélectionné une Force de Disposition (chaque
      Force apparaît au moins une fois par équipe, jamais plus de deux fois).
      Voici les deux effectifs pour ce round (générés aléatoirement) :
    </p>
  `;

  const cols = state.teamSize === 6 ? 3 : 4;

  const teamBlock = el("div", "roster-block");
  teamBlock.appendChild(el("h3", "roster-block__title roster-block__title--team", "Votre équipe"));
  const teamGrid = el("div", `roster-cards cols-${cols}`);
  state.rosters.team.forEach((p) => teamGrid.appendChild(playerCard(p)));
  teamBlock.appendChild(teamGrid);

  const oppBlock = el("div", "roster-block");
  oppBlock.appendChild(el("h3", "roster-block__title roster-block__title--opp", "Équipe adverse"));
  const oppGrid = el("div", `roster-cards cols-${cols}`);
  state.rosters.opp.forEach((p) => oppGrid.appendChild(playerCard(p)));
  oppBlock.appendChild(oppGrid);

  wrap.appendChild(teamBlock);
  wrap.appendChild(oppBlock);

  const btn = el("button", "btn btn--primary", "Voir la séquence de pairing");
  btn.addEventListener("click", renderRoadmap);
  wrap.appendChild(btn);
  mount(wrap);
}

const MODULE_INFO = {
  "Initial Skirmish": "Choisissez un Défenseur puis 2 Attaquants dans votre main. Produit 2 duels ; l'Attaquant refusé revient dans votre main.",
  "Initial Skirmish #1": "Choisissez un Défenseur puis 2 Attaquants dans votre main. Produit 2 duels ; l'Attaquant refusé revient dans votre main.",
  "Initial Skirmish #2": "Choisissez un Défenseur puis 2 Attaquants dans votre main. Produit 2 duels ; l'Attaquant refusé revient dans votre main.",
  "Main Engagement": "Choisissez un Défenseur puis 2 Attaquants dans votre main. Produit 3 duels : les 2 Attaquants refusés s'affrontent aussi.",
  "Champion System": "Il ne reste qu'un joueur par équipe : les deux Champions s'affrontent directement.",
};

// Couleur et icône distinctes par type de module (indépendamment de son
// numéro d'ordre dans le round).
const MODULE_STYLE = {
  skirmish: { color: "#3b82f6", textColor: "#fff", icon: "⚔" },
  engagement: { color: "#c9a227", textColor: "#14140f", icon: "🛡" },
  champion: { color: "#8b5cf6", textColor: "#fff", icon: "👑" },
};

function moduleKind(title) {
  if (title.startsWith("Initial Skirmish")) return "skirmish";
  if (title === "Main Engagement") return "engagement";
  return "champion";
}

function roadmapForSize(size) {
  return size === 6
    ? ["Initial Skirmish", "Main Engagement", "Champion System"]
    : ["Initial Skirmish #1", "Initial Skirmish #2", "Main Engagement", "Champion System"];
}

function renderRoadmap() {
  const wrap = el("div", "screen screen--roadmap");
  wrap.innerHTML = `
    <h2>Le round se joue en ${roadmapForSize(state.teamSize).length} modules</h2>
    <p class="lead">Ils se résolvent dans cet ordre :</p>
  `;
  const modules = roadmapForSize(state.teamSize);
  const path = el("div", "roadmap-path");
  modules.forEach((title, i) => {
    const style = MODULE_STYLE[moduleKind(title)];
    const step = el("div", `roadmap-step${i === modules.length - 1 ? " roadmap-step--last" : ""}`);
    step.innerHTML = `
      <div class="roadmap-step__rail">
        <div class="roadmap-step__index" style="background:${style.color};color:${style.textColor}">${i + 1}</div>
      </div>
      <div class="roadmap-step__body">
        <div class="roadmap-step__title"><span class="roadmap-step__icon">${style.icon}</span>${title}</div>
        <div class="roadmap-step__desc">${MODULE_INFO[title]}</div>
      </div>
    `;
    path.appendChild(step);
  });
  wrap.appendChild(path);

  const btn = el("button", "btn btn--primary", "Démarrer le round");
  btn.addEventListener("click", beginSimulation);
  wrap.appendChild(btn);
  mount(wrap);
}

function beginSimulation() {
  state.generator = runRound(state.teamSize, state.rosters);
  state.stepCount = 0;
  state.stepTotal = stepCountForSize(state.teamSize);
  state.recap = [];
  advance();
}

// Types d'étapes purement informatifs : le moteur les produit pour marquer
// qu'un duel est formé, mais l'interface n'affiche pas d'écran dédié pour
// elles — leur effet (révéler des cartes, ajouter des duels au
// récapitulatif) est immédiatement répercuté sur l'étape interactive
// suivante, comme si la révélation faisait partie du même geste.
const SILENT_STEP_TYPES = new Set([
  "reveal-defenders",
  "reveal-attackers",
  "reveal-targets",
  "refused-match",
  "champion-match",
]);

function recordMatches(step) {
  if (step.type === "reveal-targets") {
    state.recap.push({ module: step.module, playerA: step.teamDefender, playerB: step.teamChoice });
    state.recap.push({ module: step.module, playerA: step.oppDefender, playerB: step.oppChoice });
  } else if (step.type === "refused-match" || step.type === "champion-match") {
    state.recap.push({ module: step.module, playerA: step.playerA, playerB: step.playerB });
  }
}

function advance(inputValue) {
  let result = state.generator.next(inputValue);
  while (!result.done && SILENT_STEP_TYPES.has(result.value.type)) {
    state.stepCount += 1;
    recordMatches(result.value);
    result = state.generator.next();
  }
  if (result.done) {
    state.matches = result.value;
    renderRecap();
    return;
  }
  state.stepCount += 1;
  renderStep(result.value);
}

function duelRow(playerA, playerB, tagA = "", tagB = "") {
  const row = el("div", "duel-row");
  row.appendChild(playerCard(playerA, { tag: tagA }));
  row.appendChild(el("div", "duel-row__vs", "VS"));
  row.appendChild(playerCard(playerB, { tag: tagB }));
  return row;
}

function opponentHandSection(label, count) {
  const wrap = el("div", "hand hand--opp");
  wrap.appendChild(el("div", "hand__label", `${label} (${count} restant${count > 1 ? "s" : ""})`));
  const cardsWrap = el("div", "hand__cards");
  for (let i = 0; i < count; i++) cardsWrap.appendChild(facedownCard());
  wrap.appendChild(cardsWrap);
  return wrap;
}

// --- Plateau (colonne de droite) --------------------------------------------
// Reconstruit uniquement à partir des champs déjà connus de l'étape en cours
// (step.teamDefender, step.teamAttackers, ...), enrichis par le moteur au fil
// du module, plus l'éventuel choix local pas encore transmis au générateur.
// Une carte reste affichée ici tant que son duel n'a pas été validé.

function boardSlot(label, side, status, player) {
  const slot = el("div", "board-slot");
  if (status === "revealed" && player) {
    slot.appendChild(playerCard(player, {}));
  } else {
    const placeholder = el(
      "div",
      `board-placeholder board-placeholder--${side}${status === "locked" ? " board-placeholder--secret" : ""}`
    );
    if (status === "pending") placeholder.textContent = "?";
    slot.appendChild(placeholder);
  }
  slot.appendChild(el("span", `board-slot__label board-slot__label--${side}`, label));
  return slot;
}

function boardGroup(title, slots) {
  const group = el("div", "board__group");
  if (title) group.appendChild(el("div", "board__group-label", title));
  const row = el("div", "board__slots");
  slots.forEach((s) => row.appendChild(s));
  group.appendChild(row);
  return group;
}

// `desc` = { defender: {team:{status,player}, opp:{status,player}},
//            attackers: null | {team:[{status,player}x2], opp:[...]} }
//
// Sans Attaquants (étape du Défenseur) : les deux Défenseurs côte à côte.
// Avec Attaquants (étapes des Attaquants et de la cible) : Défenseur adverse
// en pleine largeur, puis vos Attaquants côte à côte, puis votre Défenseur
// en pleine largeur, puis les Attaquants adverses côte à côte.
function renderBoard(desc) {
  const board = el("div", "board");
  board.appendChild(el("h3", "board__title", "Sur la table"));

  if (!desc.attackers) {
    board.appendChild(
      boardGroup("Défenseurs", [
        boardSlot("Votre Défenseur", "team", desc.defender.team.status, desc.defender.team.player),
        boardSlot("Défenseur adverse", "opp", desc.defender.opp.status, desc.defender.opp.player),
      ])
    );
    return board;
  }

  board.appendChild(
    boardGroup(null, [boardSlot("Défenseur adverse", "opp", desc.defender.opp.status, desc.defender.opp.player)])
  );
  board.appendChild(
    boardGroup(
      null,
      desc.attackers.team.map((s, i) => boardSlot(`Attaquant ${i + 1}`, "team", s.status, s.player))
    )
  );
  board.appendChild(
    boardGroup(null, [boardSlot("Votre Défenseur", "team", desc.defender.team.status, desc.defender.team.player)])
  );
  board.appendChild(
    boardGroup(
      null,
      desc.attackers.opp.map((s, i) => boardSlot(`Attaquant adverse ${i + 1}`, "opp", s.status, s.player))
    )
  );
  return board;
}

// --- Récapitulatif cumulatif (bas d'écran) ----------------------------------
function recapSection() {
  if (!state.recap.length) return null;
  const wrap = el("div", "recap-inline");
  wrap.appendChild(el("h3", "recap-inline__title", `Duels déjà décidés (${state.recap.length})`));
  const list = el("div", "recap-list");
  let lastModule = null;
  state.recap.forEach((m) => {
    if (m.module !== lastModule) {
      list.appendChild(el("h4", "recap-list__module", m.module));
      lastModule = m.module;
    }
    list.appendChild(duelRow(m.playerA, m.playerB));
  });
  wrap.appendChild(list);
  return wrap;
}

// --- Bloc "valider puis révéler" partagé par les 3 étapes de choix ----------
function confirmRow({ locked, hasSelection, lockedLabel, unlockedLabel, lockedNote, unlockedNote, onClick }) {
  const row = el("div", "confirm-row");
  const btn = el("button", "btn btn--primary", locked ? lockedLabel : unlockedLabel);
  btn.disabled = !hasSelection;
  btn.addEventListener("click", onClick);
  row.appendChild(btn);
  row.appendChild(el("p", "confirm-row__note", locked ? lockedNote : unlockedNote));
  return row;
}

// Petite carte de rappel affichée au-dessus des choix possibles, centrée et
// légèrement agrandie : le Défenseur (adverse pour le choix des Attaquants,
// le vôtre pour le choix de la cible) auquel la décision se rapporte.
function referenceCard(player, label) {
  const wrap = el("div", "choice-reference");
  wrap.appendChild(el("div", "hand__label", label));
  wrap.appendChild(playerCard(player, {}));
  return wrap;
}

function pairingShell(step, subtitle) {
  const wrap = el("div", "screen screen--step");
  wrap.innerHTML = `
    <p class="eyebrow">${step.module}</p>
    <h2>${subtitle}</h2>
  `;
  return wrap;
}

function finishPairingScreen(wrap, layout, main, board, isNewStep) {
  layout.appendChild(main);
  layout.appendChild(board);
  wrap.appendChild(layout);
  const recap = recapSection();
  if (recap) wrap.appendChild(recap);
  if (isNewStep) {
    mount(wrap);
  } else {
    updateInPlace(wrap);
  }
}

// --- Étape "choisissez votre Défenseur" -------------------------------------
let selectedDefender = null;
let defenderStepRef = null;
let defenderLocked = false;

function renderChooseDefender(step) {
  const isNewStep = defenderStepRef !== step;
  if (isNewStep) {
    selectedDefender = null;
    defenderLocked = false;
    defenderStepRef = step;
  }

  const wrap = pairingShell(step, "Choisissez secrètement votre Défenseur");
  wrap.appendChild(
    el(
      "p",
      "lead",
      "Choisissez un Défenseur parmi tous les joueurs qu'il vous reste. L'équipe adverse fait le même choix, en secret, au même moment, parmi les joueurs qu'il lui reste."
    )
  );

  const layout = el("div", "split-layout");
  const main = el("div", "split-main");

  const hand = el("div", "hand");
  hand.appendChild(
    el("div", "hand__label", `Votre main (${step.teamHand.length} restant${step.teamHand.length > 1 ? "s" : ""})`)
  );
  const cardsWrap = el("div", "hand__cards hand__cards--grid2");
  step.teamHand.forEach((p) => {
    const selected = !!selectedDefender && selectedDefender.id === p.id;
    const card = playerCard(p, { clickable: !defenderLocked, selected: false });
    if (selected && defenderLocked) card.classList.add("card--locked");
    if (!defenderLocked) {
      // Choisir un joueur vaut aussi validation : un seul clic suffit.
      card.addEventListener("click", () => {
        selectedDefender = p;
        defenderLocked = true;
        renderChooseDefender(step);
      });
    }
    cardsWrap.appendChild(card);
  });
  hand.appendChild(cardsWrap);
  main.appendChild(hand);

  main.appendChild(
    confirmRow({
      locked: defenderLocked,
      hasSelection: !!selectedDefender,
      lockedLabel: "Révéler les choix",
      unlockedLabel: "Révéler les choix",
      lockedNote: "Maintenant que les deux défenseurs ont été choisis, vous pouvez les révéler.",
      unlockedNote:
        "Votre adversaire a déjà sélectionné son défenseur, celui-ci vous sera révélé quand vous aurez choisi le vôtre.",
      onClick: () => {
        if (!selectedDefender) return;
        const chosen = selectedDefender;
        defenderStepRef = null;
        advance(chosen);
      },
    })
  );
  main.appendChild(opponentHandSection("Main adverse", step.oppHand.length - 1));

  const board = renderBoard({
    defender: {
      team: { status: defenderLocked ? "locked" : "pending", player: selectedDefender },
      opp: { status: "locked", player: null },
    },
    attackers: null,
  });

  finishPairingScreen(wrap, layout, main, board, isNewStep);
}

// --- Étape "choisissez 2 Attaquants" -----------------------------------------
let attackersStepRef = null;
let attackersLocked = false;

function renderChooseAttackers(step) {
  const isNewStep = attackersStepRef !== step;
  if (isNewStep) {
    pendingAttackers = [];
    attackersLocked = false;
    attackersStepRef = step;
  }

  const wrap = pairingShell(step, "Choisissez secrètement vos 2 Attaquants");
  wrap.appendChild(
    el(
      "p",
      "lead",
      "Choisissez 2 Attaquants parmi les joueurs qu'il vous reste. Ils affronteront potentiellement le Défenseur adverse. L'équipe adverse choisit également 2 Attaquants de son côté."
    )
  );

  const layout = el("div", "split-layout");
  const main = el("div", "split-main");

  const hand = el("div", "hand");
  hand.appendChild(referenceCard(step.oppDefender, "Défenseur adverse à affronter potentiellement"));
  hand.appendChild(
    el(
      "div",
      "hand__label",
      `Votre main (${step.pool.length} restant${step.pool.length > 1 ? "s" : ""}) — ${pendingAttackers.length}/2 sélectionné${pendingAttackers.length > 1 ? "s" : ""}`
    )
  );
  const cardsWrap = el("div", "hand__cards hand__cards--grid2");
  step.pool.forEach((p) => {
    const selected = pendingAttackers.some((x) => x.id === p.id);
    const card = playerCard(p, { clickable: !attackersLocked, selected: selected && !attackersLocked });
    if (selected && attackersLocked) card.classList.add("card--locked");
    if (!attackersLocked) {
      card.addEventListener("click", () => {
        const idx = pendingAttackers.findIndex((x) => x.id === p.id);
        if (idx !== -1) {
          pendingAttackers.splice(idx, 1);
        } else if (pendingAttackers.length < 2) {
          pendingAttackers.push(p);
        }
        // Choisir le 2e Attaquant vaut aussi validation : pas de clic en plus.
        if (pendingAttackers.length === 2) attackersLocked = true;
        renderChooseAttackers(step);
      });
    }
    cardsWrap.appendChild(card);
  });
  hand.appendChild(cardsWrap);
  main.appendChild(hand);

  main.appendChild(
    confirmRow({
      locked: attackersLocked,
      hasSelection: pendingAttackers.length === 2,
      lockedLabel: "Révéler les choix",
      unlockedLabel: "Révéler les choix",
      lockedNote: "Maintenant que les deux équipes ont choisi leurs Attaquants, vous pouvez les révéler.",
      unlockedNote:
        "Votre adversaire a déjà sélectionné ses 2 Attaquants, ils vous seront révélés quand vous aurez choisi les vôtres.",
      onClick: () => {
        if (!attackersLocked) return;
        const chosen = [...pendingAttackers];
        attackersStepRef = null;
        advance(chosen);
      },
    })
  );
  main.appendChild(opponentHandSection("Main adverse", step.oppHand.length - 2));

  const board = renderBoard({
    defender: {
      team: { status: "revealed", player: step.teamDefender },
      opp: { status: "revealed", player: step.oppDefender },
    },
    attackers: {
      team: [0, 1].map(() => ({ status: attackersLocked ? "locked" : "pending", player: null })),
      opp: [0, 1].map(() => ({ status: "locked", player: null })),
    },
  });

  finishPairingScreen(wrap, layout, main, board, isNewStep);
}

// --- Étape "le Défenseur choisit sa cible" ----------------------------------
let selectedTarget = null;
let targetStepRef = null;
let targetLocked = false;

function renderChooseTarget(step) {
  const isNewStep = targetStepRef !== step;
  if (isNewStep) {
    selectedTarget = null;
    targetLocked = false;
    targetStepRef = step;
  }

  const wrap = pairingShell(step, "Votre Défenseur choisit son adversaire");
  wrap.appendChild(
    el(
      "p",
      "lead",
      `${step.defender.name} doit choisir secrètement lequel des deux Attaquants adverses il/elle veut affronter. L'équipe adverse fait le même choix de son côté, parmi vos propres Attaquants.`
    )
  );

  const layout = el("div", "split-layout");
  const main = el("div", "split-main");

  const hand = el("div", "hand");
  hand.appendChild(referenceCard(step.teamDefender, "Votre Défenseur"));
  hand.appendChild(el("div", "hand__label", "Attaquants adverses"));
  const cardsWrap = el("div", "hand__cards hand__cards--grid2");
  step.options.forEach((p) => {
    const selected = !!selectedTarget && selectedTarget.id === p.id;
    const card = playerCard(p, { clickable: !targetLocked, selected: false });
    if (selected && targetLocked) card.classList.add("card--locked");
    if (!targetLocked) {
      // Choisir la cible vaut aussi validation : un seul clic suffit.
      card.addEventListener("click", () => {
        selectedTarget = p;
        targetLocked = true;
        renderChooseTarget(step);
      });
    }
    cardsWrap.appendChild(card);
  });
  hand.appendChild(cardsWrap);
  main.appendChild(hand);

  main.appendChild(
    confirmRow({
      locked: targetLocked,
      hasSelection: !!selectedTarget,
      lockedLabel: "Révéler les choix",
      unlockedLabel: "Révéler les choix",
      lockedNote: "Maintenant que les deux équipes ont choisi leur cible, vous pouvez révéler les duels.",
      unlockedNote:
        "Votre adversaire a déjà choisi sa cible parmi vos Attaquants, elle vous sera révélée quand vous aurez choisi la vôtre.",
      onClick: () => {
        if (!selectedTarget) return;
        const chosen = selectedTarget;
        targetStepRef = null;
        advance(chosen);
      },
    })
  );
  main.appendChild(opponentHandSection("Main adverse", step.oppHand.length));

  const board = renderBoard({
    defender: {
      team: { status: "revealed", player: step.teamDefender },
      opp: { status: "revealed", player: step.oppDefender },
    },
    attackers: {
      team: step.teamAttackers.map((p) => ({ status: "revealed", player: p })),
      opp: step.oppAttackers.map((p) => ({
        status: targetLocked ? "locked" : "revealed",
        player: targetLocked ? null : p,
      })),
    },
  });
  finishPairingScreen(wrap, layout, main, board, isNewStep);
}

function renderStep(step) {
  switch (step.type) {
    case "choose-defender":
      renderChooseDefender(step);
      break;
    case "choose-attackers":
      renderChooseAttackers(step);
      break;
    case "choose-target":
      renderChooseTarget(step);
      break;
    default:
      throw new Error(`Étape inconnue : ${step.type}`);
  }
}

function renderRecap() {
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
  mount(wrap);
}

renderIntro();
