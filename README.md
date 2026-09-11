# Tutoriel Pairing — Warhammer 40,000 Teams Event

Tutoriel interactif, gratuit et sans installation, pour apprendre comment se
déroule le **pairing** dans un tournoi par équipe (Teams Event) de
Warhammer 40,000 — la procédure qui détermine quel joueur affronte quel
adversaire à chaque round.

Ce n'est pas un outil d'appariement pour de vrais événements : c'est une
simulation pédagogique destinée aux nouvelles équipes qui découvrent la
mécanique avant leur premier tournoi.

## Ce que couvre le tutoriel

Basé sur le *Warhammer 40,000 Teams Event Companion* (section Pairing System),
pour des équipes de **6** et **8** joueurs :

- **Initial Skirmish** — 3 joueurs par équipe, 2 duels formés, 1 Attaquant refusé reporté au module suivant
- **Main Engagement** — 3 joueurs par équipe, 3 duels formés (les 2 Attaquants refusés s'affrontent aussi)
- **Champion System** — le dernier joueur de chaque équipe s'affronte directement

## Confidentialité

Aucune donnée n'est collectée ni sauvegardée : tout tourne dans le navigateur,
en mémoire. Les noms de joueurs et les factions assignées sont générés
aléatoirement à chaque chargement de la page.

## Développement local

Site 100% statique (HTML/CSS/JS vanilla, aucune dépendance, aucun build).
Pour le tester en local avec un serveur simple :

```bash
python -m http.server 4173
```

Puis ouvrir `http://localhost:4173`.

## Déploiement

Hébergé via GitHub Pages directement depuis la branche `main`.
