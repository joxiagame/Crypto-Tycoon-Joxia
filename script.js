/* ==========================================================================
   CRYPTO TYCOON — Joxia (v3)
   Trading crypto + matières premières avec courbes lisses et réalistes
   (processus à momentum, cycles de tendance, événements de marché en rampe).
   3 onglets :
     • Marché  — trading + portefeuille avec P&L en direct
     • Achats  — objets de luxe (maison, montres, tableaux…) AUCUN revenu
     • Business— entreprises à créer/nommer/gérer, revenu passif croissant
   Stack : Vanilla JS, zéro dépendance (hors Firebase pour le classement).
   ========================================================================== */
(function () {
    'use strict';

    /* ================= CONFIGURATION ================= */
    const FEE = 0.001;            // 0,1 % de frais par transaction
    const START_CASH = 10;        // liquidité de départ (€)
    const TICK_MS = 1000;         // 1 tick = 1 seconde de jeu (à 1×)
    const MAX_TICKS = 21600;      // historique max en mémoire (6 h)
    const PREFILL = 21600;        // ticks pré-simulés au premier lancement
    const STORE_TICKS = 900;      // ticks sauvegardés dans localStorage (15 min)
    const VISIBLE = 60;           // bougies affichées sur le graphique
    const MOM_K = 0.004;          // vitesse de retour à la moyenne du momentum
    const SAVE_KEY = 'crypto-tycoon-save-v4';
    const OLD_SAVE_KEYS = ['crypto-tycoon-save-v3'];   // ancienne version → badge « Pionnier »
    // Nouvelle échelle (rangs jusqu'à 1 000 Md€) : nouveau classement, l'ancien CRYPTO est archivé.
    const FIREBASE_PATH = 'games/CRYPTO_V2/scores';

    // Actifs tradables : cryptos + matières premières.
    //  base      : prix de départ (€)
    //  vol       : volatilité / seconde (bruit rapide)
    //  biasMag   : amplitude de la tendance de fond (drift cible)
    //  momNoise  : bruit de momentum (onde lente)
    //  meme      : plus volatile, événements amplifiés
    const ASSETS = [
        // — Crypto —
        { id: 'BTC',    name: 'Bitcoin',        sym: 'BTC',  icon: '₿',   cat: 'crypto',  color: '#f7931a', base: 64000,   vol: 0.00012, biasMag: 0.000020, momNoise: 0.0000040, meme: false },
        { id: 'ETH',    name: 'Ethereum',       sym: 'ETH',  icon: 'Ξ',   cat: 'crypto',  color: '#627eea', base: 3300,    vol: 0.00018, biasMag: 0.000030, momNoise: 0.0000060, meme: false },
        { id: 'SOL',    name: 'Solana',         sym: 'SOL',  icon: '◎',   cat: 'crypto',  color: '#9945ff', base: 145,     vol: 0.00030, biasMag: 0.000050, momNoise: 0.0000100, meme: false },
        { id: 'BNB',    name: 'BNB',            sym: 'BNB',  icon: '◆',   cat: 'crypto',  color: '#f0b90b', base: 590,     vol: 0.00020, biasMag: 0.000035, momNoise: 0.0000070, meme: false },
        { id: 'XRP',    name: 'XRP',            sym: 'XRP',  icon: '✕',   cat: 'crypto',  color: '#00a3e0', base: 0.55,    vol: 0.00026, biasMag: 0.000045, momNoise: 0.0000090, meme: false },
        { id: 'ADA',    name: 'Cardano',        sym: 'ADA',  icon: '₳',   cat: 'crypto',  color: '#2a6df4', base: 0.42,    vol: 0.00024, biasMag: 0.000040, momNoise: 0.0000080, meme: false },
        { id: 'DOGE',   name: 'Dogecoin',       sym: 'DOGE', icon: 'Ð',   cat: 'crypto',  color: '#c2a633', base: 0.16,    vol: 0.00045, biasMag: 0.000070, momNoise: 0.0000140, meme: true  },
        { id: 'PEPE',   name: 'Pepe',           sym: 'PEPE', icon: '🐸',  cat: 'crypto',  color: '#3ddc84', base: 0.000011, vol: 0.00080, biasMag: 0.000120, momNoise: 0.0000240, meme: true  },
        // — Matières premières —
        { id: 'OR',     name: 'Or',             sym: 'OR',   icon: '🥇',  cat: 'matiere', color: '#f6b73c', base: 2300,    vol: 0.00003, biasMag: 0.000005, momNoise: 0.0000010, meme: false },
        { id: 'BRENT',  name: 'Pétrole Brent',  sym: 'BRENT', icon: '🛢️', cat: 'matiere', color: '#5c6b7d', base: 78,      vol: 0.00008, biasMag: 0.000013, momNoise: 0.0000025, meme: false },
        { id: 'ARGENT', name: 'Argent',         sym: 'AG',   icon: '🥈',  cat: 'matiere', color: '#c0c7cf', base: 27,      vol: 0.00007, biasMag: 0.000011, momNoise: 0.0000022, meme: false },
        { id: 'CUIVRE', name: 'Cuivre',         sym: 'CU',   icon: '🟠',  cat: 'matiere', color: '#e07a3f', base: 8.5,     vol: 0.00007, biasMag: 0.000010, momNoise: 0.0000020, meme: false },
        { id: 'GAZ',    name: 'Gaz naturel',    sym: 'GAZ',  icon: '🔥',  cat: 'matiere', color: '#f5a623', base: 2.4,     vol: 0.00015, biasMag: 0.000022, momNoise: 0.0000045, meme: false },
        { id: 'BLE',    name: 'Blé',            sym: 'BLE',  icon: '🌾',  cat: 'matiere', color: '#e6c94d', base: 230,     vol: 0.00005, biasMag: 0.000008, momNoise: 0.0000015, meme: false },
        { id: 'CAFE',   name: 'Café',           sym: 'CAFE', icon: '☕',   cat: 'matiere', color: '#b5835a', base: 2.2,     vol: 0.00009, biasMag: 0.000014, momNoise: 0.0000030, meme: false },
    ];

    // Objets de luxe : AUCUN revenu (pur prestige / progression).
    const LUXURY = [
        { id: 'smartphone', name: 'Smartphone',        img: 'assets/smartphone.jpg', cost: 20,        cat: 'Tech' },
        { id: 'velo',       name: 'Vélo électrique',   img: 'assets/velo.jpg',       cost: 80,        cat: 'Véhicule' },
        { id: 'moto',       name: 'Moto',              img: 'assets/moto.jpg',       cost: 300,       cat: 'Véhicule' },
        { id: 'montre',     name: 'Montre de luxe',    img: 'assets/montre.jpg',     cost: 500,       cat: 'Mode' },
        { id: 'voiture',    name: 'Voiture citadine',  img: 'assets/voiture.jpg',    cost: 1500,      cat: 'Véhicule' },
        { id: 'vetements',  name: 'Vêtements de luxe', img: 'assets/vetements.jpg',  cost: 2000,      cat: 'Mode' },
        { id: 'suv',        name: 'SUV',               img: 'assets/suv.jpg',        cost: 8000,      cat: 'Véhicule' },
        { id: 'sac',        name: 'Sac de luxe',       img: 'assets/sac.jpg',        cost: 8000,      cat: 'Mode' },
        { id: 'bijoux',     name: 'Bijoux',            img: 'assets/bijoux.jpg',     cost: 25000,     cat: 'Mode' },
        { id: 'appart',     name: 'Appartement',       img: 'assets/appart.jpg',     cost: 30000,     cat: 'Immobilier' },
        { id: 'sport',      name: 'Voiture de sport',  img: 'assets/sport.jpg',      cost: 120000,    cat: 'Véhicule' },
        { id: 'maison',     name: 'Maison',            img: 'assets/maison.jpg',     cost: 350000,    cat: 'Immobilier' },
        { id: 'tableau',    name: 'Tableau de maître', img: 'assets/tableau.jpg',    cost: 400000,    cat: 'Art' },
        { id: 'vins',       name: 'Cave à vins',       img: 'assets/vins.jpg',       cost: 600000,    cat: 'Art' },
        { id: 'villa',      name: 'Villa',             img: 'assets/villa.jpg',      cost: 1000000,   cat: 'Immobilier' },
        { id: 'helico',     name: 'Hélicoptère',       img: 'assets/helico.jpg',     cost: 2500000,   cat: 'Véhicule' },
        { id: 'manoir',     name: 'Manoir',            img: 'assets/manoir.jpg',     cost: 8000000,   cat: 'Immobilier' },
        { id: 'yacht',      name: 'Yacht',             img: 'assets/yacht.jpg',      cost: 20000000,  cat: 'Immobilier' },
    ];

    // Types de business : revenu passif (income/s) × niveau × paliers.
    //  lvl : niveau joueur requis. Rentabilité de plus en plus lente (10 min → plusieurs heures),
    //  calibrée par simulation : ~5 h pour 1 M€, ~12 h pour 50 M€, ~120 h pour 1 000 Md€ sans trader.
    const BUSINESS_TYPES = [
        { id: 'limonade',   name: 'Stand de limonade', img: 'assets/limonade.jpg',  cost: 30,     income: 0.05,  lvl: 1 },
        { id: 'foodtruck',  name: 'Food truck',        img: 'assets/foodtruck.jpg', cost: 800,    income: 0.6,   lvl: 2 },
        { id: 'laverie',    name: 'Laverie',           img: 'assets/laverie.jpg',   cost: 5000,   income: 2.5,   lvl: 4 },
        { id: 'pizzeria',   name: 'Pizzeria',          img: 'assets/pizzeria.jpg',  cost: 25000,  income: 9,     lvl: 7 },
        { id: 'boutique',   name: 'Boutique en ligne', img: 'assets/boutique.jpg',  cost: 80000,  income: 22,    lvl: 10 },
        { id: 'club',       name: 'Boîte de nuit',     img: 'assets/club.jpg',      cost: 250000, income: 50,    lvl: 14 },
        { id: 'startup',    name: 'Startup tech',      img: 'assets/startup.jpg',   cost: 1e6,    income: 140,   lvl: 18 },
        { id: 'banque',     name: 'Banque',            img: 'assets/banque.jpg',    cost: 3e7,    income: 2500,  lvl: 25 },
        { id: 'datacenter', name: 'Data center',       emoji: '🖥️',                 cost: 5e8,    income: 30000, lvl: 35 },
        { id: 'exchange',   name: 'Plateforme crypto', emoji: '🏛️',                 cost: 1e10,   income: 450000, lvl: 48 },
        { id: 'fonds',      name: 'Fonds souverain',   emoji: '🌍',                 cost: 3e11,   income: 1e7,   lvl: 60 },
    ];
    const BIZ_CREATE_GROWTH = 1.5;   // chaque exemplaire du même type coûte ×1,5
    const BIZ_UP_GROWTH = 1.15;      // chaque niveau d'amélioration coûte ×1,15
    const BIZ_MAX_LEVEL = 100;
    const BIZ_MILESTONES = [[10, 2], [25, 2], [50, 2], [100, 3]];   // paliers : revenu ×2 / ×3

    // Anciens rangs (v3) : servent seulement à attribuer le badge « Pionnier ».
    const OLD_RANKS = [
        { min: 0,          emoji: '💼', name: 'Débutant' },
        { min: 50,         emoji: '📈', name: 'Trader' },
        { min: 200,        emoji: '🐬', name: 'Dauphin' },
        { min: 1000,       emoji: '🦈', name: 'Requin' },
        { min: 5000,       emoji: '🐋', name: 'Baleine' },
        { min: 20000,      emoji: '💎', name: 'Investisseur' },
        { min: 100000,     emoji: '💰', name: 'Millionnaire' },
        { min: 500000,     emoji: '👑', name: 'Magnat' },
        { min: 2000000,    emoji: '🚀', name: 'Légende' },
        { min: 10000000,   emoji: '🏦', name: 'Tycoon' },
        { min: 50000000,   emoji: '🌕', name: 'Crypto King' },
    ];

    /* ===== Carrière : niveaux, rangs (ligues) et succès ===== */
    const MAX_LEVEL = 100;
    // XP pour passer du niveau L à L+1 : 25 × L^1,15 (≈ 230 000 XP au total pour le niveau 100)
    const xpForLevel = L => Math.round(25 * Math.pow(L, 1.15));

    // Rangs : fortune RECORD + niveau + une condition. Un rang acquis n'est jamais perdu.
    const RANKS = [
        { emoji: '🥉', name: 'Bronze I',     nw: 0,      lvl: 1 },
        { emoji: '🥉', name: 'Bronze II',    nw: 100,    lvl: 2 },
        { emoji: '🥉', name: 'Bronze III',   nw: 500,    lvl: 3,  req: ['wins', 3] },
        { emoji: '🥈', name: 'Argent I',     nw: 2500,   lvl: 5,  req: ['biz', 1] },
        { emoji: '🥈', name: 'Argent II',    nw: 1e4,    lvl: 7,  req: ['wins', 15] },
        { emoji: '🥈', name: 'Argent III',   nw: 4e4,    lvl: 9,  req: ['biz', 3] },
        { emoji: '🥇', name: 'Or I',         nw: 1.5e5,  lvl: 12, req: ['wins', 40] },
        { emoji: '🥇', name: 'Or II',        nw: 5e5,    lvl: 15, req: ['bizLevel', 10] },
        { emoji: '🥇', name: 'Or III',       nw: 1.5e6,  lvl: 18, req: ['lux', 5] },
        { emoji: '💠', name: 'Platine I',    nw: 5e6,    lvl: 22, req: ['wins', 100] },
        { emoji: '💠', name: 'Platine II',   nw: 1.5e7,  lvl: 26, req: ['ach', 10] },
        { emoji: '💠', name: 'Platine III',  nw: 5e7,    lvl: 30, req: ['bizLevel', 25] },
        { emoji: '💎', name: 'Diamant I',    nw: 1.5e8,  lvl: 35, req: ['wins', 250] },
        { emoji: '💎', name: 'Diamant II',   nw: 5e8,    lvl: 40, req: ['ach', 20] },
        { emoji: '💎', name: 'Diamant III',  nw: 1.5e9,  lvl: 46, req: ['lux', 12] },
        { emoji: '🏆', name: 'Maître',       nw: 1e10,   lvl: 55, req: ['wins', 600] },
        { emoji: '👑', name: 'Grand Maître', nw: 1e11,   lvl: 68, req: ['ach', 35] },
        { emoji: '🌕', name: 'Légende',      nw: 1e12,   lvl: 85, req: ['lux', 18] },
    ];

    // Succès : t(c, st) = condition vérifiée régulièrement ; ceux sans t sont débloqués par un événement.
    const ACHIEVEMENTS = [
        // — Trading —
        { id: 'first_buy',   icon: '🛒', name: 'Premier pas',          desc: 'Acheter ton premier actif.', xp: 50,    t: (c, st) => st.buys >= 1 },
        { id: 'first_win',   icon: '💵', name: 'Premier profit',       desc: 'Clôturer un trade gagnant.', xp: 100,   t: (c, st) => st.wins >= 1 },
        { id: 'wins_10',     icon: '📈', name: 'Trader du dimanche',   desc: '10 trades gagnants.',        xp: 250,   t: (c, st) => st.wins >= 10 },
        { id: 'wins_100',    icon: '📊', name: 'Day trader',           desc: '100 trades gagnants.',       xp: 1000,  t: (c, st) => st.wins >= 100 },
        { id: 'wins_500',    icon: '🐺', name: 'Loup de Wall Street',  desc: '500 trades gagnants.',       xp: 4000,  t: (c, st) => st.wins >= 500 },
        { id: 'wins_1000',   icon: '🤖', name: 'Machine à profits',    desc: '1 000 trades gagnants.',     xp: 8000,  t: (c, st) => st.wins >= 1000 },
        { id: 'streak_5',    icon: '🔥', name: 'Main chaude',          desc: '5 trades gagnants d\'affilée.', xp: 400, t: (c, st) => st.bestStreak >= 5 },
        { id: 'streak_15',   icon: '☄️', name: 'Intouchable',          desc: '15 trades gagnants d\'affilée.', xp: 2500, t: (c, st) => st.bestStreak >= 15 },
        { id: 'trade_50',    icon: '🎯', name: 'Coup de maître',       desc: 'Un trade à +50 % ou plus.',  xp: 800 },
        { id: 'trade_x10',   icon: '🌙', name: 'To the moon',          desc: 'Un trade ×10 (+900 %).',     xp: 5000, secret: true },
        { id: 'paper_hands', icon: '🧻', name: 'Mains de papier',      desc: 'Revendre à -50 % ou pire.',  xp: 150,  secret: true },
        { id: 'news_trader', icon: '📰', name: 'Sur la news',          desc: 'Revendre en profit un actif moins de 2 min après une news haussière.', xp: 600, secret: true },
        { id: 'diversified', icon: '🧺', name: 'Diversifié',           desc: 'Détenir 5 actifs en même temps.', xp: 300, t: () => Object.keys(state.holdings).length >= 5 },
        { id: 'all_crypto',  icon: '🪙', name: 'Collectionneur crypto', desc: 'Détenir les 8 cryptos en même temps.', xp: 1500, t: () => ASSETS.filter(a => a.cat === 'crypto').every(a => state.holdings[a.id]) },
        { id: 'all_matiere', icon: '⛏️', name: 'Matières premières',   desc: 'Détenir les 7 matières en même temps.', xp: 1500, t: () => ASSETS.filter(a => a.cat === 'matiere').every(a => state.holdings[a.id]) },
        { id: 'volume_1m',   icon: '💱', name: 'Gros volume',          desc: '1 M€ échangés au total.',    xp: 800,   t: (c, st) => st.volume >= 1e6 },
        { id: 'volume_1b',   icon: '🏦', name: 'Teneur de marché',     desc: '1 Md€ échangés au total.',   xp: 6000,  t: (c, st) => st.volume >= 1e9 },
        { id: 'meme_lord',   icon: '🐸', name: 'Roi des memes',        desc: '100 K€ de profits sur DOGE et PEPE.', xp: 2000, t: (c, st) => st.memeProfit >= 1e5 },
        // — Fortune (record) —
        { id: 'nw_1k',   icon: '💶', name: 'Premier millier',    desc: 'Fortune de 1 000 €.',       xp: 150,   t: c => c.peakNW >= 1e3 },
        { id: 'nw_100k', icon: '💰', name: 'Belle cagnotte',     desc: 'Fortune de 100 K€.',        xp: 600,   t: c => c.peakNW >= 1e5 },
        { id: 'nw_1m',   icon: '🤑', name: 'Millionnaire',       desc: 'Fortune de 1 M€.',          xp: 1500,  t: c => c.peakNW >= 1e6 },
        { id: 'nw_100m', icon: '🛥️', name: 'Très très riche',    desc: 'Fortune de 100 M€.',        xp: 4000,  t: c => c.peakNW >= 1e8 },
        { id: 'nw_1b',   icon: '🏰', name: 'Milliardaire',       desc: 'Fortune de 1 Md€.',         xp: 8000,  t: c => c.peakNW >= 1e9 },
        { id: 'nw_1t',   icon: '🌌', name: 'Trillionnaire',      desc: 'Fortune de 1 000 Md€.',     xp: 25000, t: c => c.peakNW >= 1e12 },
        { id: 'cash_1m', icon: '🧦', name: 'Bas de laine',       desc: 'Avoir 1 M€ en liquide.',    xp: 600,   t: () => state.cash >= 1e6, secret: true },
        // — Business —
        { id: 'biz_1',      icon: '🍋', name: 'Entrepreneur',        desc: 'Créer ton premier business.', xp: 150,  t: (c, st) => st.bizCreated >= 1 },
        { id: 'biz_5',      icon: '🏪', name: 'Serial entrepreneur', desc: 'Posséder 5 business.',        xp: 500,  t: () => state.businesses.length >= 5 },
        { id: 'biz_20',     icon: '🏢', name: 'Holding',             desc: 'Posséder 20 business.',       xp: 3000, t: () => state.businesses.length >= 20 },
        { id: 'biz_lvl10',  icon: '⚙️', name: 'Bien rodé',           desc: 'Un business au niveau 10.',   xp: 400,  t: () => maxBizLevel() >= 10 },
        { id: 'biz_lvl25',  icon: '🔧', name: 'Optimisé',            desc: 'Un business au niveau 25.',   xp: 1500, t: () => maxBizLevel() >= 25 },
        { id: 'biz_lvl50',  icon: '🏭', name: 'Industriel',          desc: 'Un business au niveau 50.',   xp: 5000, t: () => maxBizLevel() >= 50 },
        { id: 'biz_lvl100', icon: '🗿', name: 'Empire',              desc: 'Un business au niveau 100.',  xp: 15000, t: () => maxBizLevel() >= 100 },
        { id: 'inc_100',    icon: '💧', name: 'Rentier',             desc: '100 €/s de revenu passif.',   xp: 800,  t: () => passiveIncome() >= 100 },
        { id: 'inc_10k',    icon: '🌊', name: 'Pluie d\'or',          desc: '10 K€/s de revenu passif.',   xp: 3000, t: () => passiveIncome() >= 1e4 },
        { id: 'inc_1m',     icon: '🌋', name: 'Geyser de cash',      desc: '1 M€/s de revenu passif.',    xp: 10000, t: () => passiveIncome() >= 1e6 },
        { id: 'all_types',  icon: '🧩', name: 'Conglomérat',         desc: 'Un business de chaque type.', xp: 12000, t: () => BUSINESS_TYPES.every(bt => state.businesses.some(b => b.type === bt.id)) },
        { id: 'branding',   icon: '✏️', name: 'Nom de marque',       desc: 'Renommer un business.',       xp: 50 },
        // — Luxe —
        { id: 'lux_1',   icon: '📱', name: 'Premier caprice',     desc: 'Acheter un objet de luxe.',     xp: 100,  t: () => Object.keys(state.luxury).length >= 1 },
        { id: 'lux_5',   icon: '⌚', name: 'La belle vie',        desc: 'Posséder 5 objets de luxe.',    xp: 600,  t: () => Object.keys(state.luxury).length >= 5 },
        { id: 'lux_all', icon: '🖼️', name: 'Collection complète', desc: 'Posséder tous les objets de luxe.', xp: 8000, t: () => Object.keys(state.luxury).length >= LUXURY.length },
        { id: 'yacht',   icon: '🛳️', name: 'Capitaine',           desc: 'Acheter le yacht.',             xp: 2000, t: () => !!state.luxury.yacht },
        // — Niveaux & rangs —
        { id: 'lvl_10',  icon: '⭐', name: 'Niveau 10',  desc: 'Atteindre le niveau 10.',  xp: 300,  t: c => c.level >= 10 },
        { id: 'lvl_25',  icon: '🌟', name: 'Niveau 25',  desc: 'Atteindre le niveau 25.',  xp: 1200, t: c => c.level >= 25 },
        { id: 'lvl_50',  icon: '✨', name: 'Niveau 50',  desc: 'Atteindre le niveau 50.',  xp: 4000, t: c => c.level >= 50 },
        { id: 'lvl_75',  icon: '💫', name: 'Niveau 75',  desc: 'Atteindre le niveau 75.',  xp: 8000, t: c => c.level >= 75 },
        { id: 'lvl_100', icon: '🌠', name: 'Niveau 100', desc: 'Atteindre le niveau maximum.', xp: 0, t: c => c.level >= 100 },
        { id: 'rank_or',      icon: '🥇', name: 'Ligue Or',       desc: 'Atteindre le rang Or I.',      xp: 600,  t: c => c.rankIdx >= 6 },
        { id: 'rank_platine', icon: '💠', name: 'Ligue Platine',  desc: 'Atteindre le rang Platine I.', xp: 2000, t: c => c.rankIdx >= 9 },
        { id: 'rank_diamant', icon: '💎', name: 'Ligue Diamant',  desc: 'Atteindre le rang Diamant I.', xp: 5000, t: c => c.rankIdx >= 12 },
        { id: 'rank_maitre',  icon: '🏆', name: 'Maître',         desc: 'Atteindre le rang Maître.',    xp: 10000, t: c => c.rankIdx >= 15 },
        { id: 'rank_legende', icon: '🌕', name: 'Légende',        desc: 'Atteindre le rang Légende.',   xp: 0,    t: c => c.rankIdx >= 17 },
        // — Assiduité —
        { id: 'play_1h',  icon: '⏱️', name: 'Accro',    desc: '1 h de jeu.',  xp: 300,  t: (c, st) => st.playSeconds >= 3600 },
        { id: 'play_10h', icon: '🕰️', name: 'Vétéran',  desc: '10 h de jeu.', xp: 2500, t: (c, st) => st.playSeconds >= 36000 },
        { id: 'pioneer',  icon: '🧭', name: 'Pionnier', desc: 'A joué à la première version de Crypto Tycoon.', xp: 500, secret: true },
    ];
    const ACH_MAP = {}; ACHIEVEMENTS.forEach(a => ACH_MAP[a.id] = a);

    const TIMEFRAMES = [
        { s: 15,  label: '15s' },
        { s: 30,  label: '30s' },
        { s: 60,  label: '1m'  },
        { s: 300, label: '5m'  },
        { s: 900, label: '15m' },
    ];

    const ASSET_MAP = {}; ASSETS.forEach(c => ASSET_MAP[c.id] = c);
    const LUXURY_MAP = {}; LUXURY.forEach(i => LUXURY_MAP[i.id] = i);
    const BTYPE_MAP = {}; BUSINESS_TYPES.forEach(i => BTYPE_MAP[i.id] = i);

    /* ================= ÉTAT ================= */
    let state = {
        cash: START_CASH,
        holdings: {},   // id -> { qty, avg }
        luxury: {},     // itemId -> true
        businesses: [], // [{ uid, type, name, level, invested }]
        gameTime: 0,
        career: freshCareer(),
    };
    function freshCareer() {
        return {
            xp: 0, level: 1, peakNW: START_CASH, rankIdx: 0, ach: {}, pioneer: null,
            stats: { buys: 0, sells: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, volume: 0,
                     bizCreated: 0, bizUpgrades: 0, luxBought: 0, memeProfit: 0, playSeconds: 0 },
        };
    }
    let lastNews = null;   // { id, up, t } : dernière news (succès « Sur la news »)
    const coins = {};   // id -> { price, momentum, bias, nextBiasAt, volBase, ticks[] }
    let currentAsset = 'BTC';
    let activeView = 'market';
    let timeframe = 30;
    let speed = 1;
    let chartMode = 'candle';
    let action = 'buy';
    let assetFilter = 'all';
    let nextEventAt = 0;
    let hover = null;
    let lastLayout = null;
    let db = null;
    let player = 'Invité';

    // Modal (création / renommage d'un business)
    let modalMode = 'create';   // 'create' | 'rename'
    let modalType = null;
    let modalUid = null;

    const el = id => document.getElementById(id);

    /* ================= OUTILS ================= */
    function randn() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));
    }

    function fmtMoney(n) {
        const neg = n < 0, a = Math.abs(n); let s;
        if (a >= 1e9)      s = (a / 1e9).toFixed(2) + 'B';
        else if (a >= 1e6) s = (a / 1e6).toFixed(2) + 'M';
        else if (a >= 1e4) s = (a / 1e3).toFixed(1) + 'K';
        else               s = a.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        return (neg ? '-' : '') + '€' + s;
    }
    function fmtPrice(n) {
        const a = Math.abs(n);
        if (a >= 1e4)    return fmtMoney(n);
        if (a >= 1000)   return '€' + n.toFixed(0);
        if (a >= 1)      return '€' + n.toFixed(2);
        if (a >= 0.01)   return '€' + n.toFixed(4);
        if (a >= 0.0001) return '€' + n.toFixed(6);
        return '€' + n.toExponential(2);
    }
    function fmtQty(n) {
        const a = Math.abs(n);
        if (a >= 1000)   return n.toFixed(0);
        if (a >= 1)      return n.toFixed(2);
        if (a >= 0.001)  return n.toFixed(4);
        return n.toExponential(2);
    }
    function fmtPct(n) { return (n >= 0 ? '+' : '') + (n * 100).toFixed(2) + '%'; }
    function humanize(s) {
        s = Math.max(0, Math.round(s));
        if (s < 60) return s + 's';
        if (s < 3600) return Math.floor(s / 60) + 'm';
        if (s < 86400) return Math.floor(s / 3600) + 'h';
        return Math.floor(s / 86400) + 'j';
    }
    function catLabel(cat) {
        return cat === 'crypto' ? 'Crypto' : 'Matière';
    }

    /* ================= SIMULATION DE PRIX (lisse) ================= */
    function initAsset(c) {
        return {
            price: c.base,
            momentum: (Math.random() * 2 - 1) * c.biasMag,
            bias: (Math.random() * 2 - 1) * c.biasMag,
            nextBiasAt: 300 + Math.random() * 360,
            volBase: 200 + Math.random() * 400,
            ticks: [],
        };
    }

    // Avance d'une seconde : momentum (onde lente, retour à la moyenne vers
    // `bias`) + bruit rapide. La courbe évolue en douceur, jamais d'un coup.
    function stepAsset(a, cfg, t) {
        if (t >= a.nextBiasAt) {
            a.bias = (Math.random() * 2 - 1) * cfg.biasMag;
            a.nextBiasAt = t + 300 + Math.random() * 360;
        }
        a.momentum += (a.bias - a.momentum) * MOM_K + randn() * cfg.momNoise;
        const o = a.price;
        const price = o * Math.exp(a.momentum + cfg.vol * randn());
        a.price = price;
        const h = Math.max(o, price) * (1 + Math.random() * 0.0004);
        const l = Math.min(o, price) * (1 - Math.random() * 0.0004);
        const v = a.volBase * Math.exp(randn() * 0.5);
        a.ticks.push({ o, h, l, c: price, v, t });
        if (a.ticks.length > MAX_TICKS) a.ticks.shift();
    }

    // Événement de marché : un choc de momentum (rampe sur ~2-3 min), jamais
    // un saut vertical — la news accompagne la montée/descente.
    function maybeEvent() {
        if (gameTime() < nextEventAt) return;
        const a = coins[pick(Object.keys(coins))];
        const cfg = ASSET_MAP[a.assetId];
        const up = Math.random() < 0.5;
        let logMove = 0.04 + Math.random() * 0.16;         // ≈ 4 à 20 %
        if (cfg.meme) logMove = 0.08 + Math.random() * 0.35; // meme : 8 à 43 %
        a.momentum += (up ? 1 : -1) * logMove * MOM_K;
        lastNews = { id: a.assetId, up, t: gameTime() };
        pushNews(cfg, up, logMove);
        nextEventAt = gameTime() + 60 + Math.random() * 120;
    }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function pushNews(cfg, up, logMove) {
        const pct = Math.round(logMove * 100) + '%';
        const ups = [
            `🚀 ${cfg.sym} grimpe fortement (+${pct}) : les investisseurs s'emballent.`,
            `📈 ${cfg.sym} en pleine ascension : +${pct} après une annonce surprise.`,
            `🔥 ${cfg.sym} s'envole (+${pct}) — la hype est lancée !`,
        ];
        const downs = [
            `💥 ${cfg.sym} glisse vers le bas (-${pct}) : les ventes s'accélèrent.`,
            `📉 ${cfg.sym} en recul (-${pct}) après des prises de bénéfices.`,
            `⚠️ ${cfg.sym} perd du terrain (-${pct}) — les traders dégagent.`,
        ];
        el('newsIcon').textContent = up ? '🚀' : '💥';
        el('newsText').textContent = up ? pick(ups) : pick(downs);
    }

    // Agrège les ticks 1 s en bougies de durée `tf`
    function getCandles(id, tf) {
        const ticks = coins[id].ticks;
        const out = [];
        for (let i = 0; i < ticks.length; i += tf) {
            const slice = ticks.slice(i, i + tf);
            if (!slice.length) continue;
            let o = slice[0].o, h = slice[0].h, l = slice[0].l, v = 0;
            const c = slice[slice.length - 1].c;
            for (let k = 0; k < slice.length; k++) {
                if (slice[k].h > h) h = slice[k].h;
                if (slice[k].l < l) l = slice[k].l;
                v += slice[k].v;
            }
            out.push({ o, h, l, c, v, t: slice[0].t });
        }
        return out;
    }

    /* ================= ÉCONOMIE ================= */
    // Valeur nette = liquide + positions + valeur de revente des business (50 % de l'investi).
    function netWorth() {
        let v = state.cash;
        for (const id in state.holdings) v += state.holdings[id].qty * coins[id].price;
        for (const b of state.businesses) v += bizSellValue(b);
        return v;
    }
    function passiveIncome() {
        let s = 0;
        for (const b of state.businesses) s += bizIncome(b);
        return s;
    }
    // Bonus de carrière : +1 % de revenu passif par niveau au-delà du premier.
    function levelBonus() { return 1 + 0.01 * (state.career.level - 1); }
    function milestoneMult(L) { let m = 1; for (const [l, x] of BIZ_MILESTONES) if (L >= l) m *= x; return m; }
    function bizIncomeAt(bt, L) { return bt.income * L * milestoneMult(L) * levelBonus(); }
    function bizIncome(b) { return bizIncomeAt(BTYPE_MAP[b.type], b.level); }
    function bizUpgradeCost(b) { return BTYPE_MAP[b.type].cost * Math.pow(BIZ_UP_GROWTH, b.level); }
    function bizCreateCost(type) {
        const n = state.businesses.filter(b => b.type === type).length;
        return BTYPE_MAP[type].cost * Math.pow(BIZ_CREATE_GROWTH, n);
    }
    function bizSellValue(b) { return Math.round(b.invested * 0.5); }
    function maxBizLevel() { return state.businesses.reduce((m, b) => Math.max(m, b.level), 0); }
    function oldRankFor(nw) {
        let r = OLD_RANKS[0];
        for (const rk of OLD_RANKS) if (nw >= rk.min) r = rk;
        return r;
    }
    function bizImg(bt, alt) {
        return bt.img ? `<img src="${bt.img}" alt="${escapeHtml(alt)}" loading="lazy">`
                      : `<div class="item-emoji" aria-hidden="true">${bt.emoji}</div>`;
    }
    function gameTime() { return state.gameTime; }

    function buy() {
        const amt = parseFloat(el('amountInput').value) || 0;
        if (amt <= 0) return toast('Entre un montant valide.', 'bad');
        if (amt > state.cash + 1e-9) return toast('Liquide insuffisant.', 'bad');
        const c = coins[currentAsset];
        const qty = (amt * (1 - FEE)) / c.price;
        const h = state.holdings[currentAsset] || { qty: 0, avg: 0 };
        const newQty = h.qty + qty;
        const newAvg = (h.qty * h.avg + amt) / newQty;
        state.holdings[currentAsset] = { qty: newQty, avg: newAvg };
        state.cash -= amt;
        const st = state.career.stats;
        st.buys++; st.volume += amt;
        toast(`Acheté ${fmtQty(qty)} ${currentAsset} pour ${fmtMoney(amt)}`, 'good');
        afterTrade();
    }
    function sell() {
        const h = state.holdings[currentAsset];
        if (!h || h.qty <= 0) return toast(`Tu ne détiens pas de ${currentAsset}.`, 'bad');
        const amt = parseFloat(el('amountInput').value) || 0;
        if (amt <= 0) return toast('Entre un montant valide.', 'bad');
        const c = coins[currentAsset];
        const maxValue = h.qty * c.price;
        const sellValue = Math.min(amt, maxValue);
        const qty = sellValue / c.price;
        const proceeds = sellValue * (1 - FEE);
        state.cash += proceeds;
        const newQty = h.qty - qty;
        if (newQty < 1e-12) delete state.holdings[currentAsset];
        else state.holdings[currentAsset] = { qty: newQty, avg: h.avg };
        toast(`Vendu ${fmtQty(qty)} ${currentAsset} pour ${fmtMoney(proceeds)}`, 'good');
        recordSale(currentAsset, qty * h.avg, proceeds);
        afterTrade();
    }
    function afterTrade() {
        checkAchievements();
        refreshPortfolio(); refreshTradePanel(); refreshHeader(); save();
    }
    // Bilan d'une vente : statistiques, XP et succès de trading.
    // Anti-farm : un trade ne compte (XP, gagnant/perdant) que s'il pèse ≥ 0,5 % de la fortune.
    function recordSale(id, cost, proceeds) {
        const st = state.career.stats;
        st.sells++; st.volume += proceeds;
        const profit = proceeds - cost, pct = cost > 0 ? profit / cost : 0;
        if (proceeds < Math.max(1, netWorth() * 0.005)) return;
        if (profit > 0) {
            st.wins++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak);
            if (ASSET_MAP[id].meme) st.memeProfit += profit;
            gainXp(8 + 3 * Math.log2(1 + profit));
            if (pct >= 0.5) unlock('trade_50');
            if (pct >= 9) unlock('trade_x10');
            if (lastNews && lastNews.id === id && lastNews.up && gameTime() - lastNews.t <= 120) unlock('news_trader');
        } else {
            st.losses++; st.streak = 0;
            gainXp(2);
            if (pct <= -0.5) unlock('paper_hands');
        }
    }

    /* ================= ACHATS (luxe, aucun revenu) ================= */
    function buyLuxury(id) {
        const it = LUXURY_MAP[id];
        if (state.luxury[id]) return;
        if (state.cash < it.cost) return toast(`Pas assez de liquide pour « ${it.name} ».`, 'bad');
        state.cash -= it.cost;
        state.luxury[id] = true;
        state.career.stats.luxBought++;
        gainXp(10 + 5 * Math.log2(it.cost));
        toast(`🛍️ ${it.name} acheté !`, 'good');
        checkAchievements();
        refreshLuxury(); refreshHeader(); save();
    }
    function buildLuxury() {
        const grid = el('luxuryGrid'); grid.innerHTML = '';
        LUXURY.forEach(it => {
            const card = document.createElement('div');
            card.className = 'item-card'; card.dataset.item = it.id;
            card.innerHTML = `<div class="item-img"><img src="${it.img}" alt="${it.name}" loading="lazy"><span class="item-cat">${it.cat}</span></div>
                <div class="item-body">
                    <span class="item-name">${it.name}</span>
                    <div class="item-meta"><span class="im-cost">${fmtMoney(it.cost)}</span><span class="im-income im-none">Aucun revenu</span></div>
                    <button class="item-buy">Acheter</button>
                </div>`;
            card.querySelector('.item-buy').onclick = () => buyLuxury(it.id);
            grid.appendChild(card);
        });
        refreshLuxury();
    }
    function refreshLuxury() {
        document.querySelectorAll('#luxuryGrid .item-card').forEach(card => {
            const it = LUXURY_MAP[card.dataset.item];
            const owned = !!state.luxury[it.id];
            card.classList.toggle('owned', owned);
            const btn = card.querySelector('.item-buy');
            if (owned) {
                if (!card.querySelector('.item-owned-badge')) {
                    const b = document.createElement('span');
                    b.className = 'item-owned-badge'; b.textContent = '✓';
                    card.querySelector('.item-img').appendChild(b);
                }
                btn.textContent = 'Possédé'; btn.disabled = true;
            } else {
                const bd = card.querySelector('.item-owned-badge'); if (bd) bd.remove();
                btn.textContent = 'Acheter'; btn.disabled = state.cash < it.cost;
            }
        });
        const count = Object.keys(state.luxury).length;
        const val = Object.keys(state.luxury).reduce((s, id) => s + (LUXURY_MAP[id] ? LUXURY_MAP[id].cost : 0), 0);
        el('achatsOwned').textContent = count;
        el('achatsValue').textContent = fmtMoney(val);
        el('ownedCount').textContent = count;
    }

    /* ================= BUSINESS (revenu passif + gestion) ================= */
    function createBusiness(type, name) {
        const bt = BTYPE_MAP[type];
        if (state.career.level < bt.lvl) return toast(`🔒 ${bt.name} : niveau ${bt.lvl} requis.`, 'bad');
        const cost = bizCreateCost(type);
        if (state.cash < cost) return toast('Liquide insuffisant.', 'bad');
        const finalName = (name || '').trim() || bt.name;
        state.cash -= cost;
        state.businesses.push({
            uid: 'b' + Date.now() + Math.floor(Math.random() * 1000),
            type, name: finalName, level: 1, invested: cost,
        });
        state.career.stats.bizCreated++;
        gainXp(10 + 4 * Math.log2(cost));
        toast(`💼 « ${finalName} » créé ! +${fmtMoney(bizIncomeAt(bt, 1))}/s`, 'good');
        checkAchievements();
        refreshBusiness(); refreshHeader(); save();
    }
    function upgradeBusiness(uid) {
        const b = state.businesses.find(x => x.uid === uid);
        if (!b) return;
        if (b.level >= BIZ_MAX_LEVEL) return toast('Niveau maximum atteint.', 'bad');
        const cost = bizUpgradeCost(b);
        if (state.cash < cost) return toast('Liquide insuffisant pour améliorer.', 'bad');
        const before = bizIncome(b);
        state.cash -= cost;
        b.level++;
        b.invested += cost;
        state.career.stats.bizUpgrades++;
        gainXp(3 + 2 * Math.log2(cost));
        const ms = BIZ_MILESTONES.find(([l]) => l === b.level);
        toast(ms ? `🎉 ${b.name} → niveau ${b.level} : palier atteint, revenu ×${ms[1]} !`
                 : `⬆️ ${b.name} → niveau ${b.level} (+${fmtMoney(bizIncome(b) - before)}/s)`, 'good');
        checkAchievements();
        refreshBusiness(); refreshHeader(); save();
    }
    function renameBusiness(uid, name) {
        const b = state.businesses.find(x => x.uid === uid);
        if (!b) return;
        const finalName = (name || '').trim();
        if (finalName) b.name = finalName;
        toast(`✏️ Renommé en « ${b.name} »`, 'good');
        unlock('branding');
        refreshBusiness(); save();
    }
    function sellBusiness(uid) {
        const b = state.businesses.find(x => x.uid === uid);
        if (!b) return;
        const val = bizSellValue(b);
        state.cash += val;
        state.businesses = state.businesses.filter(x => x.uid !== uid);
        toast(`💰 « ${b.name} » revendu pour ${fmtMoney(val)}`, 'good');
        refreshBusiness(); refreshHeader(); save();
    }

    function buildBizTypes() {
        const grid = el('bizTypesGrid'); grid.innerHTML = '';
        BUSINESS_TYPES.forEach(bt => {
            const card = document.createElement('div');
            card.className = 'item-card biz-type-card'; card.dataset.type = bt.id;
            card.innerHTML = `<div class="item-img">${bizImg(bt, bt.name)}<span class="item-cat">Business</span></div>
                <div class="item-body">
                    <span class="item-name">${bt.name}</span>
                    <div class="item-meta"><span class="im-cost"></span><span class="im-income"></span></div>
                    <button class="item-buy">Créer</button>
                </div>`;
            card.onclick = () => {
                if (state.career.level < bt.lvl) return toast(`🔒 ${bt.name} : débloqué au niveau ${bt.lvl}.`, 'bad');
                openCreateModal(bt.id);
            };
            grid.appendChild(card);
        });
        refreshBizTypes();
    }
    // Coûts (croissants avec le nombre d'exemplaires) et verrous de niveau des types de business.
    function refreshBizTypes() {
        document.querySelectorAll('#bizTypesGrid .biz-type-card').forEach(card => {
            const bt = BTYPE_MAP[card.dataset.type];
            const locked = state.career.level < bt.lvl;
            card.classList.toggle('locked', locked);
            card.querySelector('.im-cost').textContent = fmtMoney(bizCreateCost(bt.id));
            card.querySelector('.im-income').textContent = '+' + fmtMoney(bizIncomeAt(bt, 1)) + '/s';
            card.querySelector('.item-buy').textContent = locked ? `🔒 Niveau ${bt.lvl}` : 'Créer';
        });
    }
    function buildMyBiz() {
        const grid = el('myBizGrid'); grid.innerHTML = '';
        state.businesses.forEach(b => {
            const bt = BTYPE_MAP[b.type];
            const card = document.createElement('div');
            card.className = 'item-card biz-card'; card.dataset.uid = b.uid;
            const maxed = b.level >= BIZ_MAX_LEVEL;
            const next = BIZ_MILESTONES.find(([l]) => l > b.level);
            card.innerHTML = `<div class="item-img">${bizImg(bt, b.name)}<span class="item-cat">Business</span></div>
                <div class="item-body">
                    <span class="item-name">${escapeHtml(b.name)}</span>
                    <span class="biz-type-name">${bt.name}</span>
                    <span class="biz-level">Niveau ${b.level}${next ? ` · palier ×${next[1]} au niv. ${next[0]}` : ''}</span>
                    <div class="item-meta"><span class="im-income">+${fmtMoney(bizIncome(b))}/s</span></div>
                    <div class="biz-actions">
                        <button class="biz-btn up" data-act="up">${maxed ? '🏁 Niveau max' : `⬆️ Améliorer (${fmtMoney(bizUpgradeCost(b))})`}</button>
                        <button class="biz-btn" data-act="rename">✏️ Renommer</button>
                        <button class="biz-btn sell full" data-act="sell">💰 Revendre (${fmtMoney(bizSellValue(b))})</button>
                    </div>
                </div>`;
            const upBtn = card.querySelector('[data-act="up"]');
            upBtn.disabled = maxed || state.cash < bizUpgradeCost(b);
            upBtn.onclick = () => upgradeBusiness(b.uid);
            card.querySelector('[data-act="rename"]').onclick = () => openRenameModal(b.uid);
            card.querySelector('[data-act="sell"]').onclick = () => sellBusiness(b.uid);
            grid.appendChild(card);
        });
    }
    function refreshBusiness() {
        buildMyBiz();
        refreshBizTypes();
        el('myBizEmpty').style.display = state.businesses.length ? 'none' : 'block';
        el('bizIncome').textContent = fmtMoney(passiveIncome()) + '/s';
        el('bizCount').textContent = state.businesses.length;
        el('businessCount').textContent = state.businesses.length;
        el('income').textContent = fmtMoney(passiveIncome()) + '/s';
    }

    /* ================= MODAL (création / renommage) ================= */
    function openCreateModal(type) {
        modalMode = 'create'; modalType = type; modalUid = null;
        const bt = BTYPE_MAP[type];
        setModalImg(bt);
        el('bizModalTitle').textContent = 'Créer un business';
        el('bizModalDesc').textContent = `${bt.name} — démarre à ${fmtMoney(bizIncomeAt(bt, 1))}/s. Donne un nom à ton entreprise !`;
        el('bizModalCost').textContent = fmtMoney(bizCreateCost(type));
        el('bizModalIncome').textContent = fmtMoney(bizIncomeAt(bt, 1));
        el('bizNameInput').value = '';
        el('bizNameInput').placeholder = bt.name;
        el('bizModalConfirm').textContent = 'Créer';
        el('bizModalConfirm').disabled = state.cash < bizCreateCost(type);
        el('bizModal').classList.add('show');
        el('bizNameInput').focus();
    }
    function openRenameModal(uid) {
        const b = state.businesses.find(x => x.uid === uid);
        if (!b) return;
        modalMode = 'rename'; modalType = b.type; modalUid = uid;
        const bt = BTYPE_MAP[b.type];
        setModalImg(bt);
        el('bizModalTitle').textContent = 'Renommer le business';
        el('bizModalDesc').textContent = `${bt.name} — niveau ${b.level}, ${fmtMoney(bizIncome(b))}/s.`;
        el('bizModalCost').textContent = fmtMoney(bizUpgradeCost(b));
        el('bizModalIncome').textContent = fmtMoney(bizIncome(b));
        el('bizNameInput').value = b.name;
        el('bizModalConfirm').textContent = 'Renommer';
        el('bizModalConfirm').disabled = false;
        el('bizModal').classList.add('show');
        el('bizNameInput').focus();
    }
    function closeModal() { el('bizModal').classList.remove('show'); }
    function setModalImg(bt) {
        const img = el('bizModalImg');
        img.style.display = bt.img ? '' : 'none';
        if (bt.img) img.src = bt.img;
        let em = img.parentNode.querySelector('.item-emoji');
        if (!bt.img) {
            if (!em) { em = document.createElement('div'); em.className = 'item-emoji'; img.parentNode.appendChild(em); }
            em.textContent = bt.emoji;
        } else if (em) em.remove();
    }

    /* ================= RENDU ================= */
    function refreshHeader() {
        const nw = netWorth();
        el('cash').textContent = fmtMoney(state.cash);
        el('netWorth').textContent = fmtMoney(nw);
        el('income').textContent = fmtMoney(passiveIncome()) + '/s';
        const rk = RANKS[state.career.rankIdx];
        el('rankBadge').textContent = rk.emoji + ' ' + rk.name;
        el('playerName').textContent = player;
        refreshCareerHeader();
    }

    /* ================= CARRIÈRE : XP, NIVEAUX, RANGS, SUCCÈS ================= */
    function gainXp(n) {
        const c = state.career;
        n = Math.round(n);
        if (c.level >= MAX_LEVEL || n <= 0) return;
        c.xp += n;
        let up = false;
        while (c.level < MAX_LEVEL && c.xp >= xpForLevel(c.level)) { c.xp -= xpForLevel(c.level); c.level++; up = true; }
        if (c.level >= MAX_LEVEL) c.xp = 0;
        if (up) {
            const unlocked = BUSINESS_TYPES.filter(bt => bt.lvl === c.level).map(bt => bt.name);
            celebrate(`⭐ Niveau ${c.level} ! Revenu passif +${c.level - 1} %` + (unlocked.length ? ` · Débloqué : ${unlocked.join(', ')}` : ''), 'level');
            refreshBizTypes();
        }
        refreshCareerHeader();
    }
    function unlock(id) {
        const c = state.career, a = ACH_MAP[id];
        if (!a || c.ach[id]) return;
        c.ach[id] = Date.now();
        celebrate(`${a.icon} Succès : ${a.name}` + (a.xp ? ` (+${a.xp} XP)` : ''), 'ach');
        gainXp(a.xp);
        if (activeView === 'progress') refreshProgress();
    }
    // Vérifie les succès « à condition » et les rangs (après une action et toutes les 2 s).
    function checkAchievements() {
        const c = state.career;
        for (const a of ACHIEVEMENTS) if (a.t && !c.ach[a.id] && a.t(c, c.stats)) unlock(a.id);
        updateRank();
    }
    const REQ = {
        wins:     { label: n => `${n} trades gagnants`, val: () => state.career.stats.wins },
        biz:      { label: n => `${n} business`, val: () => state.businesses.length },
        bizLevel: { label: n => `Un business niveau ${n}`, val: () => maxBizLevel() },
        lux:      { label: n => n >= LUXURY.length ? 'Tous les objets de luxe' : `${n} objets de luxe`, val: () => Object.keys(state.luxury).length },
        ach:      { label: n => `${n} succès`, val: () => Object.keys(state.career.ach).length },
    };
    function rankChecks(r) {
        const c = state.career;
        const list = [
            { label: `Fortune record ${fmtMoney(r.nw)}`, ok: c.peakNW >= r.nw, cur: fmtMoney(c.peakNW) },
            { label: `Niveau ${r.lvl}`, ok: c.level >= r.lvl, cur: 'niv. ' + c.level },
        ];
        if (r.req) {
            const q = REQ[r.req[0]], v = q.val();
            list.push({ label: q.label(r.req[1]), ok: v >= r.req[1], cur: String(v) });
        }
        return list;
    }
    function updateRank() {
        const c = state.career;
        let moved = false;
        while (c.rankIdx < RANKS.length - 1 && rankChecks(RANKS[c.rankIdx + 1]).every(x => x.ok)) {
            c.rankIdx++; moved = true;
            const r = RANKS[c.rankIdx];
            celebrate(`${r.emoji} Nouveau rang : ${r.name} !`, 'rank');
            gainXp(50 * c.rankIdx);
        }
        if (moved) { refreshHeader(); save(); if (activeView === 'progress') refreshProgress(); }
    }
    function refreshCareerHeader() {
        const c = state.career;
        const need = xpForLevel(c.level);
        el('levelNum').textContent = 'Niv. ' + c.level;
        el('levelFill').style.width = (c.level >= MAX_LEVEL ? 100 : Math.min(100, c.xp / need * 100)) + '%';
        el('levelChip').title = c.level >= MAX_LEVEL ? 'Niveau maximum' : `${c.xp} / ${need} XP`;
        el('achCount').textContent = Object.keys(c.ach).length;
    }

    /* ----- Célébrations (niveau, rang, succès) : file de bulles en haut à droite ----- */
    function celebrate(msg, kind) {
        const box = el('celebrate');
        const d = document.createElement('div');
        d.className = 'celebrate-item ' + (kind || '');
        d.textContent = msg;
        box.appendChild(d);
        while (box.children.length > 4) box.firstChild.remove();
        requestAnimationFrame(() => d.classList.add('show'));
        setTimeout(() => { d.classList.remove('show'); setTimeout(() => d.remove(), 400); }, 4200);
    }

    /* ----- Onglet Progression ----- */
    let achFilter = 'all';
    function refreshProgress() {
        const c = state.career, st = c.stats;
        const need = xpForLevel(c.level);
        el('plLevel').textContent = c.level;
        el('plRing').style.setProperty('--p', c.level >= MAX_LEVEL ? 100 : Math.round(c.xp / need * 100));
        const rk = RANKS[c.rankIdx];
        el('progRank').textContent = rk.emoji + ' ' + rk.name;
        el('xpFill').style.width = (c.level >= MAX_LEVEL ? 100 : Math.min(100, c.xp / need * 100)) + '%';
        el('xpText').textContent = c.level >= MAX_LEVEL ? 'Niveau maximum atteint 🌠' : `${c.xp.toLocaleString('fr-FR')} / ${need.toLocaleString('fr-FR')} XP vers le niveau ${c.level + 1}`;
        el('progBonus').textContent = `Bonus de carrière : +${c.level - 1} % de revenu passif · Fortune record : ${fmtMoney(c.peakNW)}`;
        const pb = el('pioneerBadge');
        pb.hidden = !c.pioneer;
        if (c.pioneer) pb.textContent = `🧭 Pionnier — ancien rang ${c.pioneer.emoji} ${c.pioneer.name}`;

        // prochain rang : conditions à remplir
        const nx = RANKS[c.rankIdx + 1];
        el('progNext').innerHTML = nx
            ? `<div class="pn-title">Prochain rang : <b>${nx.emoji} ${nx.name}</b></div>` +
              rankChecks(nx).map(x => `<div class="pn-req ${x.ok ? 'ok' : ''}"><span>${x.ok ? '✅' : '⬜'} ${escapeHtml(x.label)}</span><em>${escapeHtml(x.cur)}</em></div>`).join('')
            : '<div class="pn-title">🌕 Rang maximum atteint. Respect.</div>';

        el('rankLadder').innerHTML = RANKS.map((r, i) =>
            `<div class="rank-step ${i < c.rankIdx ? 'done' : i === c.rankIdx ? 'current' : 'todo'}" title="${escapeHtml(r.name)} — fortune ${fmtMoney(r.nw)}, niveau ${r.lvl}">
                <span class="rs-emoji">${r.emoji}</span><span class="rs-name">${r.name}</span><span class="rs-min">${fmtMoney(r.nw)}</span></div>`).join('');

        const winrate = st.wins + st.losses ? Math.round(st.wins / (st.wins + st.losses) * 100) + ' %' : '—';
        const stats = [
            ['Trades gagnants', st.wins], ['Trades perdants', st.losses], ['Taux de réussite', winrate],
            ['Meilleure série', st.bestStreak], ['Volume échangé', fmtMoney(st.volume)], ['Business créés', st.bizCreated],
            ['Améliorations', st.bizUpgrades], ['Objets de luxe', Object.keys(state.luxury).length], ['Temps de jeu', humanize(st.playSeconds)],
        ];
        el('statGrid').innerHTML = stats.map(([k, v]) => `<div class="stat-box"><span>${k}</span><b>${v}</b></div>`).join('');

        const got = Object.keys(c.ach).length;
        el('achProgress').textContent = `${got} / ${ACHIEVEMENTS.length}`;
        el('achGrid').innerHTML = ACHIEVEMENTS.filter(a => achFilter === 'all' || (achFilter === 'got') === !!c.ach[a.id]).map(a => {
            const ok = !!c.ach[a.id], hide = a.secret && !ok;
            return `<div class="ach-card ${ok ? 'got' : ''}">
                <span class="ach-icon">${hide ? '❔' : a.icon}</span>
                <div class="ach-body"><b>${hide ? 'Succès secret' : escapeHtml(a.name)}</b><span>${hide ? '???' : escapeHtml(a.desc)}</span></div>
                <em class="ach-xp">${a.xp ? '+' + a.xp + ' XP' : ''}</em></div>`;
        }).join('') || '<div class="portfolio-empty">Rien ici pour l\'instant.</div>';
    }

    function buildAssetList() {
        const wrap = el('assetList'); wrap.innerHTML = '';
        ASSETS.forEach(a => {
            const row = document.createElement('button');
            row.className = 'asset-row'; row.dataset.id = a.id;
            row.innerHTML = `<span class="ar-icon" style="background:${a.color}22;color:${a.color}">${a.icon}</span>
                <span class="ar-main"><span class="ar-top"><span class="ar-sym">${a.sym}</span><span class="ar-tag">${catLabel(a.cat)}</span></span><span class="ar-name">${a.name}</span></span>
                <span class="ar-right"><span class="ar-price"></span><span class="ar-chg"></span></span>`;
            row.onclick = () => {
                currentAsset = a.id;
                refreshAssetList(); refreshTradePanel(); setAction(action); drawChart();
            };
            wrap.appendChild(row);
        });
    }
    function refreshAssetList() {
        document.querySelectorAll('.asset-row').forEach(row => {
            const id = row.dataset.id, c = coins[id], cfg = ASSET_MAP[id];
            row.classList.toggle('active', id === currentAsset);
            row.style.display = (assetFilter === 'all' || cfg.cat === assetFilter) ? '' : 'none';
            row.querySelector('.ar-price').textContent = fmtPrice(c.price);
            const ref = c.ticks.length ? c.ticks[0].c : c.price;
            const chg = (c.price - ref) / ref;
            const e = row.querySelector('.ar-chg');
            e.textContent = fmtPct(chg);
            e.className = 'ar-chg ' + (chg >= 0 ? 'c-up' : 'c-down');
        });
    }

    function buildTimeframes() {
        const wrap = el('timeframes'); wrap.innerHTML = '';
        TIMEFRAMES.forEach(tf => {
            const b = document.createElement('button');
            b.className = 'tf-btn'; b.textContent = tf.label; b.dataset.tf = tf.s;
            b.onclick = () => {
                timeframe = tf.s;
                wrap.querySelectorAll('.tf-btn').forEach(x => x.classList.toggle('active', x === b));
                drawChart();
            };
            if (tf.s === timeframe) b.classList.add('active');
            wrap.appendChild(b);
        });
    }

    function refreshTradePanel() {
        const co = ASSET_MAP[currentAsset], c = coins[currentAsset];
        el('tradePrice').textContent = fmtPrice(c.price);
        const h = state.holdings[currentAsset];
        el('tradeHoldings').textContent = h ? fmtQty(h.qty) + ' ' + co.sym : '0';
        updateEstimate();
        refreshPosition();
    }
    function updateEstimate() {
        const co = ASSET_MAP[currentAsset], c = coins[currentAsset];
        const amt = parseFloat(el('amountInput').value) || 0;
        if (action === 'buy') {
            el('estimateText').textContent = amt > 0 ? `≈ ${fmtQty(amt * (1 - FEE) / c.price)} ${co.sym}` : '≈ 0';
        } else {
            const h = state.holdings[currentAsset];
            const maxVal = h ? h.qty * c.price : 0;
            el('estimateText').textContent = amt > 0 ? `≈ ${fmtMoney(Math.min(amt, maxVal))}` : '≈ 0';
        }
    }
    // P&L en direct de la position courante : si tu vends maintenant,
    // tu es en bénéfice ou en perte ?
    function refreshPosition() {
        const box = el('tpPosition');
        const co = ASSET_MAP[currentAsset];
        const h = state.holdings[currentAsset];
        if (!h || h.qty <= 0) {
            box.innerHTML = `<span class="pos-line">Aucune position sur <b>${co.sym}</b> — achète pour suivre ton P&L en direct.</span>`;
            return;
        }
        const c = coins[currentAsset];
        const value = h.qty * c.price;
        const cost = h.qty * h.avg;
        const pl = value - cost;
        const plPct = h.avg ? (c.price - h.avg) / h.avg : 0;
        const up = pl > 0, down = pl < 0;
        box.innerHTML = `<span class="pos-line">📌 <b>${co.sym}</b> : ${fmtQty(h.qty)} · moy. ${fmtPrice(h.avg)} · valeur ${fmtMoney(value)}</span>
            <span class="pos-pl ${up ? 'up' : (down ? 'down' : 'flat')}">${up ? '▲ Bénéfice' : (down ? '▼ Perte' : '≈ Équilibre')} si tu vends : ${fmtMoney(pl)} (${fmtPct(plPct)})</span>`;
    }
    function setAction(a) {
        action = a;
        document.querySelectorAll('.action-btn').forEach(b => b.classList.toggle('active', b.dataset.action === a));
        const tb = el('tradeBtn');
        tb.textContent = (a === 'buy' ? 'Acheter ' : 'Vendre ') + ASSET_MAP[currentAsset].sym;
        tb.className = 'trade-btn ' + (a === 'buy' ? 'buy' : 'sell');
        updateEstimate();
    }

    function refreshPortfolio() {
        const body = el('portfolioBody'), empty = el('portfolioEmpty');
        const ids = Object.keys(state.holdings);
        if (!ids.length) {
            body.innerHTML = ''; empty.style.display = 'block';
            el('portfolioTotal').textContent = ''; el('portfolioTotal').className = 'port-total flat';
            return;
        }
        empty.style.display = 'none';
        body.innerHTML = ids.map(id => {
            const h = state.holdings[id], c = coins[id], co = ASSET_MAP[id];
            const value = h.qty * c.price;
            const pl = value - h.qty * h.avg;
            const plPct = h.avg ? (c.price - h.avg) / h.avg : 0;
            const cls = pl >= 0 ? 'c-up' : 'c-down';
            return `<tr>
                <td><span class="p-asset"><span class="ar-icon" style="background:${co.color}22;color:${co.color}">${co.icon}</span><b>${co.name}</b> <small>${co.sym}</small></span></td>
                <td class="num">${fmtQty(h.qty)}</td>
                <td class="num">${fmtPrice(h.avg)}</td>
                <td class="num">${fmtMoney(value)}</td>
                <td class="num ${cls}">${fmtMoney(pl)} (${fmtPct(plPct)})</td>
            </tr>`;
        }).join('');
        refreshPortfolioTotal();
    }
    function refreshPortfolioTotal() {
        const ids = Object.keys(state.holdings);
        const box = el('portfolioTotal');
        if (!ids.length) { box.textContent = ''; box.className = 'port-total flat'; return; }
        let cost = 0, value = 0;
        for (const id of ids) {
            const h = state.holdings[id];
            cost += h.qty * h.avg;
            value += h.qty * coins[id].price;
        }
        const pl = value - cost;
        const pct = cost ? pl / cost : 0;
        box.textContent = `P&L total : ${fmtMoney(pl)} (${fmtPct(pct)})`;
        box.className = 'port-total ' + (pl > 0 ? 'up' : (pl < 0 ? 'down' : 'flat'));
    }

    /* ================= GRAPHIQUE (canvas) ================= */
    function drawChart() {
        const canvas = el('chart');
        const wrap = canvas.parentElement;
        const rect = wrap.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const W = Math.max(1, rect.width), H = Math.max(1, rect.height);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        const c = coins[currentAsset], co = ASSET_MAP[currentAsset];
        const candles = getCandles(currentAsset, timeframe).slice(-VISIBLE);

        el('chartCoinName').textContent = co.name + ' (' + co.sym + ')';
        el('priceBig').textContent = fmtPrice(c.price);
        const ref = c.ticks.length ? c.ticks[0].c : c.price;
        const chg = (c.price - ref) / ref;
        const chgEl = el('changePct');
        chgEl.textContent = fmtPct(chg);
        chgEl.className = 'price-change ' + (chg >= 0 ? 'c-up' : 'c-down');

        if (!candles.length) { lastLayout = null; return; }

        const padL = 8, padR = 64, padT = 6, timeH = 18, volH = 26;
        const priceTop = padT;
        const priceBottom = H - timeH - volH - 6;
        const volTop = priceBottom + 6, volBottom = volTop + volH;

        let min = Infinity, max = -Infinity, maxVol = 0;
        for (const k of candles) { if (k.l < min) min = k.l; if (k.h > max) max = k.h; if (k.v > maxVol) maxVol = k.v; }
        if (c.price < min) min = c.price; if (c.price > max) max = c.price;
        const span = (max - min) || 1; min -= span * 0.06; max += span * 0.06;
        const yOf = p => priceTop + (max - p) / (max - min) * (priceBottom - priceTop);

        ctx.strokeStyle = 'rgba(133,147,165,.10)';
        ctx.fillStyle = '#5c6b7d';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const p = min + (max - min) * i / 5, y = yOf(p);
            ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
            ctx.fillText(fmtPrice(p), W - padR + 6, y);
        }

        const space = (W - padL - padR) / candles.length;
        const cw = Math.max(1, Math.min(14, space * 0.68));
        const xAt = i => padL + i * space + space / 2;

        const volScale = maxVol ? (volBottom - volTop) / maxVol : 0;
        for (let i = 0; i < candles.length; i++) {
            const k = candles[i], up = k.c >= k.o;
            ctx.fillStyle = up ? 'rgba(22,199,132,.25)' : 'rgba(234,57,67,.25)';
            ctx.fillRect(xAt(i) - cw / 2, volBottom - Math.max(1, k.v * volScale), cw, Math.max(1, k.v * volScale));
        }

        if (chartMode === 'line') {
            ctx.beginPath();
            candles.forEach((k, i) => { const x = xAt(i), y = yOf(k.c); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
            ctx.strokeStyle = '#f6b73c'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke();
            const g = ctx.createLinearGradient(0, priceTop, 0, priceBottom);
            g.addColorStop(0, 'rgba(246,183,60,.18)'); g.addColorStop(1, 'rgba(246,183,60,0)');
            ctx.lineTo(xAt(candles.length - 1), priceBottom); ctx.lineTo(xAt(0), priceBottom); ctx.closePath();
            ctx.fillStyle = g; ctx.fill();
            const lx = xAt(candles.length - 1), ly = yOf(candles[candles.length - 1].c);
            ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fillStyle = '#f6b73c'; ctx.fill();
        } else {
            for (let i = 0; i < candles.length; i++) {
                const k = candles[i], x = xAt(i), up = k.c >= k.o;
                const col = up ? '#16c784' : '#ea3943';
                ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(x, yOf(k.h)); ctx.lineTo(x, yOf(k.l)); ctx.stroke();
                const yo = yOf(Math.max(k.o, k.c)), yc = yOf(Math.min(k.o, k.c));
                ctx.fillRect(x - cw / 2, yo, cw, Math.max(1, yc - yo));
            }
        }

        ctx.strokeStyle = 'rgba(246,183,60,.5)'; ctx.setLineDash([4, 4]);
        const cy = yOf(c.price);
        ctx.beginPath(); ctx.moveTo(padL, cy); ctx.lineTo(W - padR, cy); ctx.stroke();
        ctx.setLineDash([]);
        const tag = fmtPrice(c.price);
        ctx.font = '10px JetBrains Mono, monospace';
        const tw = ctx.measureText(tag).width;
        ctx.fillStyle = '#f6b73c'; ctx.fillRect(W - padR - tw - 12, cy - 9, tw + 8, 18);
        ctx.fillStyle = '#1a1206'; ctx.fillText(tag, W - padR - tw - 8, cy);

        ctx.fillStyle = '#5c6b7d'; ctx.textAlign = 'center';
        const tcount = Math.min(5, candles.length);
        for (let n = 0; n < tcount; n++) {
            const i = Math.floor(n * (candles.length - 1) / Math.max(1, tcount - 1));
            ctx.fillText(humanize(gameTime() - candles[i].t), xAt(i), H - 9);
        }

        if (hover != null && hover >= 0 && hover < candles.length) {
            const hx = xAt(hover);
            ctx.strokeStyle = 'rgba(231,238,246,.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(hx, priceTop); ctx.lineTo(hx, priceBottom); ctx.stroke();
            ctx.setLineDash([]);
        }

        lastLayout = { candles, space, padL, padR, W, H };
    }

    function onChartMove(e) {
        if (!lastLayout) return;
        const rect = el('chart').getBoundingClientRect();
        const x = e.clientX - rect.left;
        const L = lastLayout;
        if (x < L.padL || x > L.W - L.padR) { hover = null; el('chartTip').style.display = 'none'; drawChart(); return; }
        const i = Math.min(L.candles.length - 1, Math.max(0, Math.floor((x - L.padL) / L.space)));
        if (i !== hover) { hover = i; showTip(e, L, i); drawChart(); }
        else showTip(e, L, i);
    }
    function onChartLeave() { hover = null; el('chartTip').style.display = 'none'; drawChart(); }
    function showTip(e, L, i) {
        const k = L.candles[i], tip = el('chartTip');
        const cls = k.c >= k.o ? 'tt-up' : 'tt-down';
        tip.innerHTML = `<div class="tt-time">il y a ${humanize(gameTime() - k.t)}</div>
            <div>O <span class="${cls}">${fmtPrice(k.o)}</span></div>
            <div>H <span class="${cls}">${fmtPrice(k.h)}</span></div>
            <div>L <span class="${cls}">${fmtPrice(k.l)}</span></div>
            <div>C <span class="${cls}">${fmtPrice(k.c)}</span></div>`;
        tip.style.display = 'block';
        const rect = el('chart').getBoundingClientRect();
        let tx = e.clientX - rect.left + 14, ty = e.clientY - rect.top + 8;
        if (tx + 150 > rect.width) tx = e.clientX - rect.left - 164;
        if (ty + 120 > rect.height) ty = rect.height - 125;
        tip.style.left = tx + 'px'; tip.style.top = ty + 'px';
    }

    /* ================= SAUVEGARDE ================= */
    function save() {
        try {
            const data = {
                cash: state.cash, holdings: state.holdings,
                luxury: state.luxury, businesses: state.businesses,
                gameTime: state.gameTime, career: state.career, coins: {},
            };
            for (const id in coins) {
                const c = coins[id];
                data.coins[id] = { price: c.price, momentum: c.momentum, bias: c.bias, nextBiasAt: c.nextBiasAt, ticks: c.ticks.slice(-STORE_TICKS) };
            }
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        } catch (e) { /* stockage plein ou indisponible : ignorer */ }
    }
    function load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            const d = JSON.parse(raw);
            state.cash = d.cash; state.holdings = d.holdings || {};
            state.luxury = d.luxury || {}; state.businesses = d.businesses || [];
            state.gameTime = d.gameTime || 0;
            const fc = freshCareer();
            state.career = Object.assign(fc, d.career || {});
            state.career.stats = Object.assign(fc.stats, (d.career && d.career.stats) || {});
            for (const id in d.coins) {
                const c = coins[id]; if (!c) continue;
                const s = d.coins[id];
                c.price = s.price; c.momentum = s.momentum; c.bias = s.bias; c.nextBiasAt = s.nextBiasAt; c.ticks = s.ticks || [];
            }
            return true;
        } catch (e) { return false; }
    }

    // Ancienne version (v3) : tout le monde repart de 10 €, avec le badge « Pionnier »
    // et l'ancien rang atteint (calculé sur l'ancienne valeur nette : liquide + positions).
    function migrateOldSave() {
        for (const k of OLD_SAVE_KEYS) {
            try {
                const raw = localStorage.getItem(k);
                if (!raw) continue;
                const d = JSON.parse(raw);
                let nw = Number(d.cash) || 0;
                for (const id in d.holdings || {}) {
                    const p = d.coins && d.coins[id] ? Number(d.coins[id].price) : (ASSET_MAP[id] ? ASSET_MAP[id].base : 0);
                    nw += (Number(d.holdings[id].qty) || 0) * (p || 0);
                }
                const r = oldRankFor(nw);
                state.career.pioneer = { name: r.name, emoji: r.emoji, nw: Math.round(nw) };
                return true;
            } catch (e) { /* ancienne sauvegarde illisible : on l'ignore */ }
        }
        return false;
    }

    /* ================= FIREBASE (classement hub) ================= */
    function initFirebase() {
        try {
            if (typeof firebase === 'undefined') return;
            if (!firebase.apps.length) {
                firebase.initializeApp({
                    apiKey: "AIzaSyCPecKQH6DURfYitjY4bXMeW0URLrcNnsI",
                    authDomain: "joxiahub-2928b.firebaseapp.com",
                    projectId: "joxiahub-2928b",
                    storageBucket: "joxiahub-2928b.firebasestorage.app",
                    messagingSenderId: "303698595695",
                    appId: "1:303698595695:web:5c99c2cb2a9ea88e36a29a",
                    databaseURL: "https://joxiahub-2928b-default-rtdb.europe-west1.firebasedatabase.app"
                });
            }
            db = firebase.database();
        } catch (e) { db = null; }
    }
    function saveScore() {
        if (!db || player === 'Invité') return;
        // score = fortune record (ne baisse pas lors d'un krach)
        const score = Math.round(Math.max(state.career.peakNW, netWorth()));
        if (score <= 0) return;
        db.ref(FIREBASE_PATH).orderByChild('name').equalTo(player).once('value', snap => {
            let key = null, old = 0;
            snap.forEach(ch => { key = ch.key; old = ch.val().score || 0; });
            if (key && score > old) db.ref(FIREBASE_PATH + '/' + key).update({ score: score, date: Date.now() });
            else if (!key) db.ref(FIREBASE_PATH).push({ name: player, score: score, date: Date.now() });
        }, () => {});
    }

    /* ================= BOUCLE DE JEU ================= */
    let timer = null;
    function startLoop() {
        if (timer) clearInterval(timer);
        timer = setInterval(tick, TICK_MS / speed);
    }
    function tick() {
        for (const id in coins) stepAsset(coins[id], ASSET_MAP[id], state.gameTime);
        state.gameTime++;
        maybeEvent();
        // ×2/×4/×8 accélère le marché, pas le revenu passif ni le temps de jeu (sinon tout se finit en 20 min)
        state.cash += passiveIncome() / speed;
        state.career.stats.playSeconds += 1 / speed;
        const nw = netWorth();
        if (nw > state.career.peakNW) state.career.peakNW = nw;
        refreshHeader(); refreshAssetList(); refreshTradePanel(); refreshPortfolio(); drawChart();
    }

    /* ================= TOAST ================= */
    function toast(msg, kind) {
        const t = el('toast');
        t.textContent = msg;
        t.className = 'toast show ' + (kind || '');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => t.classList.remove('show'), 2600);
    }

    /* ================= INITIALISATION ================= */
    function init() {
        const urlParams = new URLSearchParams(location.search);
        player = (urlParams.get('player') || '').trim() || 'Invité';

        ASSETS.forEach(c => { coins[c.id] = initAsset(c); coins[c.id].assetId = c.id; });

        let migrated = false;
        if (!load()) {
            for (let i = 0; i < PREFILL; i++) { for (const id in coins) stepAsset(coins[id], ASSET_MAP[id], state.gameTime); state.gameTime++; }
            migrated = migrateOldSave();
        }

        buildAssetList();
        buildTimeframes();
        buildLuxury();
        buildBizTypes();

        // Onglets
        document.querySelectorAll('.tab').forEach(t => {
            t.onclick = () => {
                document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
                document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + t.dataset.view));
                activeView = t.dataset.view;
                if (t.dataset.view === 'achats') refreshLuxury();
                if (t.dataset.view === 'business') refreshBusiness();
                if (t.dataset.view === 'progress') refreshProgress();
            };
        });
        el('rankBadge').onclick = el('levelChip').onclick = () => document.querySelector('.tab[data-view="progress"]').click();
        document.querySelectorAll('#achFilter .cf-btn').forEach(b => {
            b.onclick = () => {
                achFilter = b.dataset.f;
                document.querySelectorAll('#achFilter .cf-btn').forEach(x => x.classList.toggle('active', x === b));
                refreshProgress();
            };
        });
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.onclick = () => {
                speed = parseInt(b.dataset.speed, 10);
                document.querySelectorAll('.speed-btn').forEach(x => x.classList.toggle('active', x === b));
                startLoop();
            };
        });
        document.querySelectorAll('.mode-btn').forEach(b => {
            b.onclick = () => {
                chartMode = b.dataset.mode;
                document.querySelectorAll('.mode-btn').forEach(x => x.classList.toggle('active', x === b));
                drawChart();
            };
        });
        document.querySelectorAll('#assetFilter .cf-btn').forEach(b => {
            b.onclick = () => {
                assetFilter = b.dataset.cat;
                document.querySelectorAll('#assetFilter .cf-btn').forEach(x => x.classList.toggle('active', x === b));
                refreshAssetList();
            };
        });
        document.querySelectorAll('.action-btn').forEach(b => {
            b.onclick = () => setAction(b.dataset.action);
        });
        document.querySelectorAll('.quick').forEach(q => {
            q.onclick = () => {
                const pct = parseInt(q.dataset.pct, 10) / 100;
                const c = coins[currentAsset];
                if (action === 'buy') el('amountInput').value = Math.floor(state.cash * pct * 100) / 100;
                else { const h = state.holdings[currentAsset]; el('amountInput').value = Math.floor((h ? h.qty * c.price : 0) * pct * 100) / 100; }
                updateEstimate();
            };
        });
        el('amountInput').addEventListener('input', updateEstimate);
        el('tradeBtn').onclick = () => { action === 'buy' ? buy() : sell(); };
        const cv = el('chart');
        cv.addEventListener('mousemove', onChartMove);
        cv.addEventListener('mouseleave', onChartLeave);
        window.addEventListener('resize', drawChart);

        // Modal
        el('bizModalClose').onclick = closeModal;
        el('bizModal').addEventListener('click', e => { if (e.target === el('bizModal')) closeModal(); });
        el('bizModalConfirm').onclick = () => {
            const name = el('bizNameInput').value.trim();
            if (modalMode === 'create') {
                if (state.cash < bizCreateCost(modalType)) return toast('Liquide insuffisant.', 'bad');
                createBusiness(modalType, name);
            } else {
                renameBusiness(modalUid, name);
            }
            closeModal();
        };

        initFirebase();

        setAction('buy');
        refreshHeader(); refreshAssetList(); refreshTradePanel(); refreshPortfolio();
        refreshLuxury(); refreshBusiness();
        drawChart();
        startLoop();

        if (migrated) {
            unlock('pioneer');
            const pi = state.career.pioneer;
            celebrate(`🆕 Nouvelle version : tout le monde repart de 10 €. Badge Pionnier (ancien rang ${pi.emoji} ${pi.name}) !`, 'rank');
            save();
        }
        checkAchievements();
        setInterval(checkAchievements, 2000);
        setInterval(save, 15000);
        setInterval(saveScore, 30000);
        window.addEventListener('beforeunload', () => { save(); saveScore(); });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
