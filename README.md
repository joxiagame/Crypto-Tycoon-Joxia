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
4. **Progresse (v4)** — carrière longue et compétitive :
   - **Niveaux 1 → 100** (XP : trades gagnants, business, luxe, succès ; +1 % de revenu passif par niveau). Les business se débloquent par niveau (Pizzeria niv. 7… Fonds souverain niv. 60).
   - **18 rangs** 🥉 Bronze I → 🌕 Légende : fortune **record** (de 100 € à 1 000 Md€) + niveau + une condition (trades gagnants, business niveau X, objets de luxe, succès). Un rang acquis n'est jamais perdu.
   - **54 succès** (dont des secrets), onglet 🏆 Progression (prochain rang, échelle des rangs, statistiques).
   - **Équilibrage** : amélioration ×1,15 par niveau (paliers ×2 aux niv. 10/25/50, ×3 au niv. 100, max 100), création ×1,5 par exemplaire d'un même type, rentabilité de plus en plus lente. La vitesse ×2…×8 n'accélère que le marché. Simulation (joueur sans trading) : ~5 h pour 1 M€, ~12 h pour 50 M€, ~120 h pour 1 000 Md€.
   - Valeur nette = liquide + positions + valeur de revente des business.
   - Anti-farm : un trade ne compte que s'il pèse ≥ 0,5 % de la fortune.
   - Migration : les sauvegardes v3 repartent de 10 € avec le badge 🧭 **Pionnier** (ancien rang affiché).
5. **Lot B (v5)** — risque et long terme :
   - **Déblocages** : SOL niv. 3, BNB niv. 4, ETH niv. 6, BTC niv. 9 ; Staking niv. 12, Minage niv. 16, Levier niv. 22, Halving niv. 30.
   - **⛏️ Minage** (onglet Rendement) : 7 rigs (Vieux PC → Méga-ferme polaire, ×1,25 par exemplaire), hashrate contre électricité (0,35 €/s par kW, arrêt auto si plus de liquide), difficulté +1 toutes les 4 h de minage, BTC à encaisser (prix de revient = cours du moment).
   - **🔒 Staking** : ETH, SOL, ADA, BNB, XRP bloqués 10 min / 1 h / 6 h (0,3 % / 2 % / 15 % × coefficient de la crypto), restitution automatique.
   - **⚡ Levier** : Long / Short ×2…×10 sur la marge, liquidation à 90 % de perte de marge, frais 0,1 % de la position.
   - **Régimes de marché** (toutes les 20-40 min de marché) : krach (annoncé 1 min avant par des rumeurs), bull run (annoncé), rug pull sur DOGE/PEPE (sans prévenir, -75 à -90 %). Les matières premières sont les valeurs refuges.
   - **🪙 Halving** (prestige) : niveau 30 et 100 M€ de fortune dans la partie → retour à zéro contre des Satoshis (10 × √(fortune record / 100 M€)) : +2 % de revenu passif et de hashrate par Satoshi, capital de départ 10 € + 10 € par Satoshi. Niveau, rang, succès et fortune record conservés.
   - 14 succès de plus (68 au total).

## Structure
- `index.html` / `style.css` / `script.js` — le jeu (vanilla)
- `assets/*.jpg` — 26 images 512×512 (18 objets de luxe + 8 business), générées par IA locale

## Contrôles
- Filtrer les actifs (Tout / Crypto / Matières), sélectionner un actif, choisir un timeframe, acheter/vendre (montant en €, boutons 25/50/75/Max).
- Survole le graphique pour voir OHLC d'une bougie.

## Intégration hub
Le hub `Joxia-Games` ouvre `https://joxiagame.github.io/Crypto-Tycoon-Joxia/?player=<pseudo>` après connexion. Le pseudo est affiché et la **fortune record** est envoyée à `games/CRYPTO_V2/scores` (l'ancien `games/CRYPTO` est archivé et masqué dans le hub).

## Déploiement
Public via GitHub Pages sur le dépôt `Crypto-Tycoon-Joxia`.
