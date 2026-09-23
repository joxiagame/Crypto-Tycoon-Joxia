# Crypto Tycoon — Joxia

Jeu de trading **crypto + matières premières** avec courbes lisses et réalistes, intégré à l'écosystème **JOXIA Gaming Hub** (`joxiagame`).

## Stack
- HTML5 / Vanilla JS / CSS3 (zéro dépendance, aucun build)
- Graphique **canvas** : bougies japonaises + ligne + volume, crosshair interactif
- Simulation de prix : **processus à momentum** (onde lente + bruit rapide + retour à la moyenne) → courbes qui évoluent en douceur, jamais d'un coup
- Images des propriétés/business générées en local via **ComfyUI + SDXL** (RTX 5070)
- LocalStorage (progression + historique sauvegardés)
- Firebase Realtime Database (valeur nette envoyée au classement du hub)

## Concept
1. **Trade** — commence avec **10 €** et fais fructifier ta mise sur **15 actifs** : 8 cryptos (BTC, ETH, SOL, BNB, XRP, ADA, DOGE, PEPE) + 7 matières premières (or, pétrole, argent, cuivre, gaz naturel, blé, café). Frais de 0,1 %, timeframes 15s → 15m (défaut **30s**), vitesse ×1 → ×8. Ton **P&L s'affiche en direct** : tu vois en permanence si vendre maintenant serait un bénéfice ou une perte.
2. **Achats** — des **objets de luxe** (montres, vêtements, sacs, bijoux, tableaux, voitures, maisons, villa, yacht…) avec de **vraies images** IA. Ces achats **ne rapportent aucun revenu** : c'est du prestige pur.
3. **Business** — crée et **nomme** tes entreprises (stand de limonade → banque), améliore leur **niveau**, renomme-les ou revends-les. Chaque business rapporte un **revenu passif** (`€/s`) qui grandit à chaque amélioration.
4. **Grimpe** — ta valeur nette détermine ton rang, de 💼 Débutant à 🌕 Crypto King.

## Structure
- `index.html` / `style.css` / `script.js` — le jeu (vanilla)
- `assets/*.jpg` — 26 images 512×512 (18 objets de luxe + 8 business), générées par IA locale

## Contrôles
- Filtrer les actifs (Tout / Crypto / Matières), sélectionner un actif, choisir un timeframe, acheter/vendre (montant en €, boutons 25/50/75/Max).
- Survole le graphique pour voir OHLC d'une bougie.

## Intégration hub
Le hub `Joxia-Games` ouvre `https://joxiagame.github.io/Crypto-Tycoon-Joxia/?player=<pseudo>` après connexion. Le pseudo est affiché et la **valeur nette** est envoyée à `games/CRYPTO/scores` pour alimenter le classement « TOP JOXIA ».

## Déploiement
Public via GitHub Pages sur le dépôt `Crypto-Tycoon-Joxia`.
