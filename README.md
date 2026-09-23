# Crypto Tycoon — Joxia

Jeu de trading crypto avec **courbes simulées réalistes** (marche aléatoire + cycles de tendance + événements de marché), intégré à l'écosystème **JOXIA Gaming Hub** (`joxiagame`).

## Stack
- HTML5 / Vanilla JS / CSS3 (zéro dépendance, aucun build)
- Graphique **canvas** : bougies japonaises + ligne + volume, crosshair interactif
- Simulation de prix : GBM (marche aléatoire géométrique) par crypto, tendances qui s'inversent, pumps/dumps aléatoires
- LocalStorage (progression + historique sauvegardés)
- Firebase Realtime Database (valeur nette envoyée au classement du hub)

## Concept
1. **Trade** — achète bas, vends haut sur 8 cryptos (BTC, ETH, SOL, BNB, XRP, ADA, DOGE, PEPE). Frais de 0,1 %. Timeframes 15s → 15m, vitesse ×1 → ×8.
2. **Progresse** — plus tu gagnes, plus tu peux acheter de **maisons, voitures, yachts, jets…** dans l'onglet « 🏠 Propriétés ».
3. **Empoche** — chaque propriété rapporte un **revenu passif** (`$/s`) qui s'ajoute à ta liquidité et alimente tes trades.
4. **Grimpe** — ta valeur nette détermine ton rang, de 💼 Débutant à 🌕 Crypto King.

## Contrôles
- Sélectionner une crypto, choisir un timeframe, acheter/vendre (montant en $, boutons 25/50/75/Max).
- Survole le graphique pour voir OHLC d'une bougie.

## Intégration hub
Le hub `Joxia-Games` ouvre `https://joxiagame.github.io/Crypto-Tycoon-Joxia/?player=<pseudo>` après connexion. Le pseudo est affiché et la **valeur nette** est envoyée à `games/CRYPTO/scores` pour alimenter le classement « TOP JOXIA ».

## Déploiement
Public via GitHub Pages sur le dépôt `Crypto-Tycoon-Joxia`.
