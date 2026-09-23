/* ==========================================================================
   CRYPTO TYCOON — Joxia (v2)
   Trading crypto + matières premières avec courbes lisses et réalistes
   (processus à momentum, cycles de tendance, événements de marché en rampe),
   progression « patrimoine » (propriétés + business → revenu passif).
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
    const SAVE_KEY = 'crypto-tycoon-save-v2';
    const FIREBASE_PATH = 'games/CRYPTO/scores';

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

    // Patrimoine : propriétés + business (image réelle, coût, revenu passif / s)
    const ITEMS = [
        // — Propriétés —
        { id: 'smartphone', cat: 'propriete', img: 'assets/smartphone.jpg', name: 'Smartphone',        cost: 20,        income: 0.02 },
        { id: 'velo',       cat: 'propriete', img: 'assets/velo.jpg',       name: 'Vélo électrique',   cost: 80,        income: 0.08 },
        { id: 'moto',       cat: 'propriete', img: 'assets/moto.jpg',       name: 'Moto',              cost: 300,       income: 0.30 },
        { id: 'voiture',    cat: 'propriete', img: 'assets/voiture.jpg',    name: 'Voiture citadine',  cost: 1500,      income: 1.5 },
        { id: 'suv',        cat: 'propriete', img: 'assets/suv.jpg',        name: 'SUV',               cost: 8000,      income: 8 },
        { id: 'appart',     cat: 'propriete', img: 'assets/appart.jpg',     name: 'Appartement',       cost: 30000,     income: 30 },
        { id: 'sport',      cat: 'propriete', img: 'assets/sport.jpg',      name: 'Voiture de sport',  cost: 120000,    income: 120 },
        { id: 'maison',     cat: 'propriete', img: 'assets/maison.jpg',     name: 'Maison',            cost: 350000,    income: 350 },
        { id: 'villa',      cat: 'propriete', img: 'assets/villa.jpg',      name: 'Villa',             cost: 1000000,   income: 1000 },
        { id: 'helico',     cat: 'propriete', img: 'assets/helico.jpg',     name: 'Hélicoptère',       cost: 2500000,   income: 2500 },
        { id: 'manoir',     cat: 'propriete', img: 'assets/manoir.jpg',     name: 'Manoir',            cost: 8000000,   income: 8000 },
        { id: 'yacht',      cat: 'propriete', img: 'assets/yacht.jpg',      name: 'Yacht',             cost: 20000000,  income: 20000 },
        // — Business —
        { id: 'limonade',   cat: 'business',  img: 'assets/limonade.jpg',   name: 'Stand de limonade', cost: 30,        income: 0.05 },
        { id: 'foodtruck',  cat: 'business',  img: 'assets/foodtruck.jpg',  name: 'Food truck',        cost: 800,       income: 0.9 },
        { id: 'laverie',    cat: 'business',  img: 'assets/laverie.jpg',    name: 'Laverie',           cost: 5000,      income: 5 },
        { id: 'pizzeria',   cat: 'business',  img: 'assets/pizzeria.jpg',   name: 'Pizzeria',          cost: 25000,     income: 28 },
        { id: 'boutique',   cat: 'business',  img: 'assets/boutique.jpg',   name: 'Boutique en ligne', cost: 80000,     income: 90 },
        { id: 'club',       cat: 'business',  img: 'assets/club.jpg',       name: 'Boîte de nuit',     cost: 250000,    income: 280 },
        { id: 'startup',    cat: 'business',  img: 'assets/startup.jpg',    name: 'Startup tech',      cost: 1000000,   income: 1100 },
        { id: 'banque',     cat: 'business',  img: 'assets/banque.jpg',     name: 'Banque',            cost: 30000000,  income: 33000 },
    ];

    const RANKS = [
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

    const TIMEFRAMES = [
        { s: 15,  label: '15s' },
        { s: 30,  label: '30s' },
        { s: 60,  label: '1m'  },
        { s: 300, label: '5m'  },
        { s: 900, label: '15m' },
    ];

    const ASSET_MAP = {}; ASSETS.forEach(c => ASSET_MAP[c.id] = c);
    const ITEM_MAP = {}; ITEMS.forEach(i => ITEM_MAP[i.id] = i);

    /* ================= ÉTAT ================= */
    let state = {
        cash: START_CASH,
        holdings: {},   // id -> { qty, avg }
        owned: {},      // itemId -> true
        gameTime: 0,
    };
    const coins = {};   // id -> { price, momentum, bias, nextBiasAt, volBase, ticks[] }
    let currentAsset = 'BTC';
    let timeframe = 30;
    let speed = 1;
    let chartMode = 'candle';
    let action = 'buy';
    let assetFilter = 'all';
    let shopFilter = 'all';
    let nextEventAt = 0;
    let hover = null;
    let lastLayout = null;
    let db = null;
    let player = 'Invité';

    const el = id => document.getElementById(id);

    /* ================= OUTILS ================= */
    function randn() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
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
        return cat === 'crypto' ? 'Crypto'
            : cat === 'matiere' ? 'Matière'
            : cat === 'propriete' ? 'Propriété' : 'Business';
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
    function netWorth() {
        let v = state.cash;
        for (const id in state.holdings) v += state.holdings[id].qty * coins[id].price;
        return v;
    }
    function passiveIncome() {
        let s = 0;
        for (const id in state.owned) { const it = ITEM_MAP[id]; if (it) s += it.income; }
        return s;
    }
    function rankFor(nw) {
        let r = RANKS[0];
        for (const rk of RANKS) if (nw >= rk.min) r = rk;
        return r;
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
        afterTrade();
    }
    function buyItem(id) {
        const it = ITEM_MAP[id];
        if (state.owned[id]) return;
        if (state.cash < it.cost) return toast(`Pas assez de liquide pour « ${it.name} ».`, 'bad');
        state.cash -= it.cost;
        state.owned[id] = true;
        toast(`${it.name} acheté ! +${fmtMoney(it.income)}/s`, 'good');
        refreshShop(); refreshHeader(); save();
    }
    function afterTrade() {
        refreshPortfolio(); refreshTradePanel(); refreshHeader(); save();
    }

    /* ================= RENDU ================= */
    function refreshHeader() {
        const nw = netWorth();
        el('cash').textContent = fmtMoney(state.cash);
        el('netWorth').textContent = fmtMoney(nw);
        el('income').textContent = fmtMoney(passiveIncome()) + '/s';
        const rk = rankFor(nw);
        el('rankBadge').textContent = rk.emoji + ' ' + rk.name;
        el('playerName').textContent = player;
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
        if (!ids.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
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
    }

    function buildShop() {
        const grid = el('shopGrid'); grid.innerHTML = '';
        ITEMS.forEach(it => {
            const card = document.createElement('div');
            card.className = 'item-card'; card.dataset.item = it.id;
            card.innerHTML = `<div class="item-img"><img src="${it.img}" alt="${it.name}" loading="lazy"><span class="item-cat">${catLabel(it.cat)}</span></div>
                <div class="item-body">
                    <span class="item-name">${it.name}</span>
                    <div class="item-meta"><span class="im-cost">${fmtMoney(it.cost)}</span><span class="im-income">+${fmtMoney(it.income)}/s</span></div>
                    <button class="item-buy">Acheter</button>
                </div>`;
            card.querySelector('.item-buy').onclick = () => buyItem(it.id);
            grid.appendChild(card);
        });
        refreshShop();
    }
    function refreshShop() {
        document.querySelectorAll('.item-card').forEach(card => {
            const it = ITEM_MAP[card.dataset.item];
            const owned = !!state.owned[it.id];
            card.style.display = (shopFilter === 'all' || it.cat === shopFilter) ? '' : 'none';
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
        el('lsIncome').textContent = fmtMoney(passiveIncome()) + '/s';
        el('lsOwned').textContent = Object.keys(state.owned).length;
        el('ownedCount').textContent = Object.keys(state.owned).length;
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
            const data = { cash: state.cash, holdings: state.holdings, owned: state.owned, gameTime: state.gameTime, coins: {} };
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
            state.cash = d.cash; state.holdings = d.holdings || {}; state.owned = d.owned || {}; state.gameTime = d.gameTime || 0;
            for (const id in d.coins) {
                const c = coins[id]; if (!c) continue;
                const s = d.coins[id];
                c.price = s.price; c.momentum = s.momentum; c.bias = s.bias; c.nextBiasAt = s.nextBiasAt; c.ticks = s.ticks || [];
            }
            return true;
        } catch (e) { return false; }
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
        const score = Math.round(netWorth());
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
        state.cash += passiveIncome();
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

        if (!load()) {
            for (let i = 0; i < PREFILL; i++) { for (const id in coins) stepAsset(coins[id], ASSET_MAP[id], state.gameTime); state.gameTime++; }
        }

        buildAssetList();
        buildTimeframes();
        buildShop();

        document.querySelectorAll('.tab').forEach(t => {
            t.onclick = () => {
                document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
                document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + t.dataset.view));
                if (t.dataset.view === 'lifestyle') refreshShop();
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
        document.querySelectorAll('#shopFilter .cf-btn').forEach(b => {
            b.onclick = () => {
                shopFilter = b.dataset.cat;
                document.querySelectorAll('#shopFilter .cf-btn').forEach(x => x.classList.toggle('active', x === b));
                refreshShop();
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

        initFirebase();

        setAction('buy');
        refreshHeader(); refreshAssetList(); refreshTradePanel(); refreshPortfolio();
        drawChart();
        startLoop();

        setInterval(save, 15000);
        setInterval(saveScore, 30000);
        window.addEventListener('beforeunload', () => { save(); saveScore(); });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
