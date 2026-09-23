/* ==========================================================================
   CRYPTO TYCOON — Joxia
   Jeu de trading crypto avec courbes simulées réalistes (marche aléatoire +
   événements de marché), trading (achat/vente), et progression « patrimoine »
   (maisons, voitures → revenu passif).
   Stack : Vanilla JS, zéro dépendance (hors Firebase pour le classement).
   ========================================================================== */
(function () {
    'use strict';

    /* ================= CONFIGURATION ================= */
    const FEE = 0.001;            // 0.1 % de frais par transaction
    const START_CASH = 10000;     // liquidité de départ
    const TICK_MS = 1000;         // 1 tick = 1 seconde de jeu (à 1×)
    const MAX_TICKS = 3600;       // historique max en mémoire (1 h)
    const PREFILL = 3600;         // ticks pré-simulés au premier lancement
    const STORE_TICKS = 900;      // ticks sauvegardés dans localStorage (15 min)
    const VISIBLE = 60;           // bougies affichées sur le graphique
    const SAVE_KEY = 'crypto-tycoon-save-v1';
    const FIREBASE_PATH = 'games/CRYPTO/scores';

    // Crypto simulées (id, nom, symbole, couleur, prix de départ,
    // volatilité/seconde, amplitude de tendance/seconde, meme-coin)
    const COINS = [
        { id: 'BTC',  name: 'Bitcoin',  sym: 'BTC',  color: '#f7931a', base: 64000,   vol: 0.00035, driftMag: 0.00010, meme: false },
        { id: 'ETH',  name: 'Ethereum', sym: 'ETH',  color: '#627eea', base: 3300,    vol: 0.00055, driftMag: 0.00015, meme: false },
        { id: 'SOL',  name: 'Solana',   sym: 'SOL',  color: '#9945ff', base: 145,     vol: 0.00090, driftMag: 0.00025, meme: false },
        { id: 'BNB',  name: 'BNB',      sym: 'BNB',  color: '#f0b90b', base: 590,     vol: 0.00060, driftMag: 0.00018, meme: false },
        { id: 'XRP',  name: 'XRP',      sym: 'XRP',  color: '#00a3e0', base: 0.55,    vol: 0.00080, driftMag: 0.00022, meme: false },
        { id: 'ADA',  name: 'Cardano',  sym: 'ADA',  color: '#2a6df4', base: 0.42,    vol: 0.00070, driftMag: 0.00020, meme: false },
        { id: 'DOGE', name: 'Dogecoin', sym: 'DOGE', color: '#c2a633', base: 0.16,    vol: 0.00130, driftMag: 0.00035, meme: true  },
        { id: 'PEPE', name: 'Pepe',     sym: 'PEPE', color: '#3ddc84', base: 0.000011, vol: 0.00300, driftMag: 0.00060, meme: true  },
    ];

    // Propriétés / objets de prestige (prix + revenu passif / seconde)
    const ITEMS = [
        { id: 'phone',   emoji: '📱', name: 'Smartphone',        cost: 1000,       income: 0.5,    cat: 'High-tech' },
        { id: 'watch',   emoji: '⌚', name: 'Montre connectée',  cost: 2500,       income: 1.5,    cat: 'High-tech' },
        { id: 'pc',      emoji: '💻', name: 'PC Gamer',          cost: 5000,       income: 3,      cat: 'High-tech' },
        { id: 'trott',   emoji: '🛴', name: 'Trottinette',       cost: 8000,       income: 5,      cat: 'Véhicule' },
        { id: 'moto',    emoji: '🏍️', name: 'Moto',              cost: 15000,      income: 10,     cat: 'Véhicule' },
        { id: 'car',     emoji: '🚗', name: 'Voiture',           cost: 30000,      income: 22,     cat: 'Véhicule' },
        { id: 'suv',     emoji: '🚙', name: 'SUV',               cost: 70000,      income: 55,     cat: 'Véhicule' },
        { id: 'appart',  emoji: '🏠', name: 'Appartement',       cost: 100000,     income: 80,     cat: 'Immobilier' },
        { id: 'sport',   emoji: '🏎️', name: 'Voiture de sport', cost: 200000,     income: 170,    cat: 'Véhicule' },
        { id: 'maison',  emoji: '🏡', name: 'Maison',            cost: 400000,     income: 340,    cat: 'Immobilier' },
        { id: 'villa',   emoji: '🏘️', name: 'Villa',             cost: 1000000,    income: 900,    cat: 'Immobilier' },
        { id: 'helico',  emoji: '🚁', name: 'Hélicoptère',       cost: 1500000,    income: 1400,   cat: 'Véhicule' },
        { id: 'manoir',  emoji: '🏰', name: 'Manoir',            cost: 3000000,    income: 2800,   cat: 'Immobilier' },
        { id: 'yacht',   emoji: '🛥️', name: 'Yacht',             cost: 5000000,    income: 4600,   cat: 'Luxe' },
        { id: 'immeuble',emoji: '🏢', name: 'Immeuble',          cost: 10000000,   income: 9000,   cat: 'Immobilier' },
        { id: 'jet',     emoji: '✈️', name: 'Jet privé',         cost: 25000000,   income: 23000,  cat: 'Luxe' },
        { id: 'ile',     emoji: '🏝️', name: 'Île privée',        cost: 60000000,   income: 55000,  cat: 'Luxe' },
    ];

    const RANKS = [
        { min: 0,          emoji: '💼', name: 'Débutant' },
        { min: 10000,      emoji: '📈', name: 'Trader' },
        { min: 50000,      emoji: '🐬', name: 'Dauphin' },
        { min: 100000,     emoji: '🦈', name: 'Requin' },
        { min: 250000,     emoji: '🐋', name: 'Baleine' },
        { min: 500000,     emoji: '💎', name: 'Investisseur' },
        { min: 1000000,    emoji: '💰', name: 'Millionnaire' },
        { min: 5000000,    emoji: '👑', name: 'Magnat' },
        { min: 10000000,   emoji: '🚀', name: 'Légende' },
        { min: 25000000,   emoji: '🏦', name: 'Tycoon' },
        { min: 100000000,  emoji: '🌕', name: 'Crypto King' },
    ];

    const TIMEFRAMES = [
        { s: 15,  label: '15s' },
        { s: 60,  label: '1m'  },
        { s: 300, label: '5m'  },
        { s: 900, label: '15m' },
    ];

    const COIN_MAP = {}; COINS.forEach(c => COIN_MAP[c.id] = c);
    const ITEM_MAP = {}; ITEMS.forEach(i => ITEM_MAP[i.id] = i);

    /* ================= ÉTAT ================= */
    let state = {
        cash: START_CASH,
        holdings: {},   // id -> { qty, avg } (prix moyen d'achat, frais inclus)
        owned: {},      // itemId -> true
        gameTime: 0,
    };
    const coins = {};   // id -> { price, drift, nextDriftAt, volBase, ticks: [{o,h,l,c,v,t}] }
    let currentCoin = 'BTC';
    let timeframe = 15;
    let speed = 1;
    let chartMode = 'candle';
    let action = 'buy';
    let nextEventAt = 0;
    let hover = null;       // index de bougie survolée (crosshair)
    let lastLayout = null;  // géométrie du dernier rendu (pour le survol)
    let db = null;
    let player = 'Invité';

    const el = id => document.getElementById(id);

    /* ================= OUTILS ================= */
    // Générateur gaussien (Box-Muller)
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
        return (neg ? '-' : '') + '$' + s;
    }
    function fmtPrice(n) {
        const a = Math.abs(n);
        if (a >= 1e4)    return fmtMoney(n);
        if (a >= 1000)   return '$' + n.toFixed(0);
        if (a >= 1)      return '$' + n.toFixed(2);
        if (a >= 0.01)   return '$' + n.toFixed(4);
        if (a >= 0.0001) return '$' + n.toFixed(6);
        return '$' + n.toExponential(2);
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

    /* ================= SIMULATION DE PRIX ================= */
    function initCoin(c) {
        return {
            price: c.base,
            drift: (Math.random() * 2 - 1) * c.driftMag,
            nextDriftAt: 60 + Math.random() * 120,
            volBase: Math.round(2e7 / c.base) + 100,
            ticks: [],
        };
    }

    // Avance d'une seconde la simulation d'une crypto (marche aléatoire avec tendance)
    function stepCoin(c, t) {
        // Changement de tendance périodique (cycles haussiers / baissiers)
        if (t >= c.nextDriftAt) {
            c.drift = (Math.random() * 2 - 1) * COIN_MAP[c.coinId].driftMag;
            c.nextDriftAt = t + 60 + Math.random() * 120;
        }
        const sigma = COIN_MAP[c.coinId].vol;
        const o = c.price;
        const price = o * Math.exp((c.drift - 0.5 * sigma * sigma) + sigma * randn());
        c.price = price;
        // Petite mèche intra-tick pour des bougies réalistes
        const h = Math.max(o, price) * (1 + Math.random() * 0.0008);
        const l = Math.min(o, price) * (1 - Math.random() * 0.0008);
        const v = c.volBase * Math.exp(randn() * 0.6);
        c.ticks.push({ o, h, l, c: price, v, t });
        if (c.ticks.length > MAX_TICKS) c.ticks.shift();
    }

    // Événement de marché ponctuel (pump / dump) + gros titre de news
    function maybeEvent() {
        if (gameTime() < nextEventAt) return;
        const c = coins[pick(Object.keys(coins))];
        const cfg = COIN_MAP[c.coinId];
        const up = Math.random() < 0.5;
        let mag = 0.05 + Math.random() * 0.20;          // 5 à 25 %
        if (cfg.meme) mag = 0.10 + Math.random() * 0.40; // meme : 10 à 50 %
        const jump = (up ? 1 : -1) * mag;
        c.price = Math.max(1e-12, c.price * (1 + jump));
        pushNews(cfg, jump);
        nextEventAt = gameTime() + 25 + Math.random() * 50;
    }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function pushNews(cfg, jump) {
        const pct = Math.abs(jump * 100).toFixed(1) + '%';
        const ups = [
            `🚀 ${cfg.sym} s'envole de +${pct} ! Les investisseurs s'emballent.`,
            `📈 ${cfg.sym} explose : +${pct} après une annonce surprise.`,
            `🔥 ${cfg.sym} grimpe de +${pct} — la hype est lancée !`,
        ];
        const downs = [
            `💥 ${cfg.sym} chute de -${pct} : panique sur le marché.`,
            `📉 ${cfg.sym} plonge de -${pct} après des ventes massives.`,
            `⚠️ ${cfg.sym} perd ${pct} — les traders dégagent.`,
        ];
        el('newsIcon').textContent = jump >= 0 ? '🚀' : '💥';
        el('newsText').textContent = jump >= 0 ? pick(ups) : pick(downs);
    }

    // Agrège les ticks 1 s en bougies de durée `tf`
    function getCandles(coinId, tf) {
        const ticks = coins[coinId].ticks;
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
        const c = coins[currentCoin];
        const qty = (amt * (1 - FEE)) / c.price;
        const h = state.holdings[currentCoin] || { qty: 0, avg: 0 };
        const newQty = h.qty + qty;
        const newAvg = (h.qty * h.avg + amt) / newQty; // coût de revient (frais inclus)
        state.holdings[currentCoin] = { qty: newQty, avg: newAvg };
        state.cash -= amt;
        toast(`Acheté ${fmtQty(qty)} ${currentCoin} pour ${fmtMoney(amt)}`, 'good');
        afterTrade();
    }
    function sell() {
        const h = state.holdings[currentCoin];
        if (!h || h.qty <= 0) return toast(`Tu ne détiens pas de ${currentCoin}.`, 'bad');
        const amt = parseFloat(el('amountInput').value) || 0;
        if (amt <= 0) return toast('Entre un montant valide.', 'bad');
        const c = coins[currentCoin];
        const maxValue = h.qty * c.price;
        const sellValue = Math.min(amt, maxValue);
        const qty = sellValue / c.price;
        const proceeds = sellValue * (1 - FEE);
        state.cash += proceeds;
        const newQty = h.qty - qty;
        if (newQty < 1e-12) delete state.holdings[currentCoin];
        else state.holdings[currentCoin] = { qty: newQty, avg: h.avg };
        toast(`Vendu ${fmtQty(qty)} ${currentCoin} pour ${fmtMoney(proceeds)}`, 'good');
        afterTrade();
    }
    function buyItem(id) {
        const it = ITEM_MAP[id];
        if (state.owned[id]) return;
        if (state.cash < it.cost) return toast(`Pas assez de liquide pour « ${it.name} ».`, 'bad');
        state.cash -= it.cost;
        state.owned[id] = true;
        toast(`${it.emoji} ${it.name} acheté ! +${fmtMoney(it.income)}/s`, 'good');
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

    function buildCoinTabs() {
        const wrap = el('coinTabs'); wrap.innerHTML = '';
        COINS.forEach(co => {
            const b = document.createElement('button');
            b.className = 'coin-tab'; b.dataset.coin = co.id;
            b.innerHTML = `<span class="c-top"><span class="c-dot" style="background:${co.color}"></span><span class="c-sym">${co.sym}</span></span>
                <span class="c-price"></span><span class="c-chg"></span>`;
            b.onclick = () => {
                currentCoin = co.id;
                refreshCoinTabs(); refreshTradePanel(); setAction(action); drawChart();
            };
            wrap.appendChild(b);
        });
    }
    function refreshCoinTabs() {
        document.querySelectorAll('.coin-tab').forEach(b => {
            const id = b.dataset.coin, c = coins[id];
            b.classList.toggle('active', id === currentCoin);
            b.querySelector('.c-price').textContent = fmtPrice(c.price);
            const ref = c.ticks.length ? c.ticks[0].c : c.price;
            const chg = (c.price - ref) / ref;
            const e = b.querySelector('.c-chg');
            e.textContent = fmtPct(chg);
            e.className = 'c-chg ' + (chg >= 0 ? 'c-up' : 'c-down');
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
            wrap.appendChild(b);
        });
        wrap.querySelector('.tf-btn').classList.add('active');
    }

    function refreshTradePanel() {
        const co = COIN_MAP[currentCoin], c = coins[currentCoin];
        el('tradeCoinSym').textContent = co.sym;
        el('tradePrice').textContent = fmtPrice(c.price);
        const h = state.holdings[currentCoin];
        el('tradeHoldings').textContent = h ? fmtQty(h.qty) + ' ' + co.sym : '0';
        updateEstimate();
    }
    function updateEstimate() {
        const co = COIN_MAP[currentCoin], c = coins[currentCoin];
        const amt = parseFloat(el('amountInput').value) || 0;
        if (action === 'buy') {
            el('estimateText').textContent = amt > 0 ? `≈ ${fmtQty(amt * (1 - FEE) / c.price)} ${co.sym}` : '≈ 0';
        } else {
            const h = state.holdings[currentCoin];
            const maxVal = h ? h.qty * c.price : 0;
            el('estimateText').textContent = amt > 0 ? `≈ ${fmtMoney(Math.min(amt, maxVal))}` : '≈ 0';
        }
    }
    function setAction(a) {
        action = a;
        document.querySelectorAll('.action-btn').forEach(b => b.classList.toggle('active', b.dataset.action === a));
        const tb = el('tradeBtn');
        tb.textContent = (a === 'buy' ? 'Acheter ' : 'Vendre ') + COIN_MAP[currentCoin].sym;
        tb.className = 'trade-btn ' + (a === 'buy' ? 'buy' : 'sell');
        updateEstimate();
    }

    function refreshPortfolio() {
        const body = el('portfolioBody'), empty = el('portfolioEmpty');
        const ids = Object.keys(state.holdings);
        if (!ids.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
        empty.style.display = 'none';
        body.innerHTML = ids.map(id => {
            const h = state.holdings[id], c = coins[id], co = COIN_MAP[id];
            const value = h.qty * c.price;
            const pl = value - h.qty * h.avg;
            const plPct = h.avg ? (c.price - h.avg) / h.avg : 0;
            const cls = pl >= 0 ? 'c-up' : 'c-down';
            return `<tr>
                <td><span class="p-asset"><span class="c-dot" style="background:${co.color}"></span><b>${co.name}</b> <small>${co.sym}</small></span></td>
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
            card.innerHTML = `<span class="item-cat">${it.cat}</span><span class="item-emoji">${it.emoji}</span>
                <span class="item-name">${it.name}</span>
                <div class="item-meta"><span class="im-cost">${fmtMoney(it.cost)}</span><span class="im-income">+${fmtMoney(it.income)}/s</span></div>
                <button class="item-buy">Acheter</button>`;
            card.querySelector('.item-buy').onclick = () => buyItem(it.id);
            grid.appendChild(card);
        });
        refreshShop();
    }
    function refreshShop() {
        document.querySelectorAll('.item-card').forEach(card => {
            const it = ITEM_MAP[card.dataset.item];
            const owned = !!state.owned[it.id];
            const btn = card.querySelector('.item-buy');
            card.classList.toggle('owned', owned);
            if (owned) {
                if (!card.querySelector('.item-owned-badge')) {
                    const b = document.createElement('span');
                    b.className = 'item-owned-badge'; b.textContent = '✓ Possédé';
                    card.appendChild(b);
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

        const c = coins[currentCoin], co = COIN_MAP[currentCoin];
        const candles = getCandles(currentCoin, timeframe).slice(-VISIBLE);

        // Méta (nom + prix courant + variation)
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

        // Grille + libellés de prix
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

        // Volume (bandeau bas)
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

        // Prix courant : ligne pointillée + étiquette
        ctx.strokeStyle = 'rgba(246,183,60,.5)'; ctx.setLineDash([4, 4]);
        const cy = yOf(c.price);
        ctx.beginPath(); ctx.moveTo(padL, cy); ctx.lineTo(W - padR, cy); ctx.stroke();
        ctx.setLineDash([]);
        const tag = fmtPrice(c.price);
        ctx.font = '10px JetBrains Mono, monospace';
        const tw = ctx.measureText(tag).width;
        ctx.fillStyle = '#f6b73c'; ctx.fillRect(W - padR - tw - 12, cy - 9, tw + 8, 18);
        ctx.fillStyle = '#1a1206'; ctx.fillText(tag, W - padR - tw - 8, cy);

        // Libellés temporels
        ctx.fillStyle = '#5c6b7d'; ctx.textAlign = 'center';
        const tcount = Math.min(5, candles.length);
        for (let n = 0; n < tcount; n++) {
            const i = Math.floor(n * (candles.length - 1) / Math.max(1, tcount - 1));
            ctx.fillText(humanize(gameTime() - candles[i].t), xAt(i), H - 9);
        }

        // Crosshair (survol)
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
                data.coins[id] = { price: c.price, drift: c.drift, nextDriftAt: c.nextDriftAt, ticks: c.ticks.slice(-STORE_TICKS) };
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
                c.price = s.price; c.drift = s.drift; c.nextDriftAt = s.nextDriftAt; c.ticks = s.ticks || [];
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
    // Le « score » = valeur nette (arrondie). On ne garde que le meilleur.
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
        for (const id in coins) stepCoin(coins[id], state.gameTime);
        state.gameTime++;
        maybeEvent();
        state.cash += passiveIncome();   // revenu passif (par seconde de jeu)
        refreshHeader(); refreshCoinTabs(); refreshTradePanel(); refreshPortfolio(); drawChart();
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
        // Récupère le pseudo transmis par le hub (?player=)
        const urlParams = new URLSearchParams(location.search);
        player = (urlParams.get('player') || '').trim() || 'Invité';

        // Crée les crypto (avec coinId pour retrouver la config)
        COINS.forEach(c => { coins[c.id] = initCoin(c); coins[c.id].coinId = c.id; });

        // Restaure la sauvegarde, sinon pré-simule l'historique
        if (!load()) {
            for (let i = 0; i < PREFILL; i++) { for (const id in coins) stepCoin(coins[id], state.gameTime); state.gameTime++; }
        }

        buildCoinTabs();
        buildTimeframes();
        buildShop();

        // Événements UI
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
        document.querySelectorAll('.action-btn').forEach(b => {
            b.onclick = () => setAction(b.dataset.action);
        });
        document.querySelectorAll('.quick').forEach(q => {
            q.onclick = () => {
                const pct = parseInt(q.dataset.pct, 10) / 100;
                const c = coins[currentCoin];
                if (action === 'buy') el('amountInput').value = Math.floor(state.cash * pct);
                else { const h = state.holdings[currentCoin]; el('amountInput').value = Math.floor((h ? h.qty * c.price : 0) * pct); }
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
        refreshHeader(); refreshCoinTabs(); refreshTradePanel(); refreshPortfolio();
        drawChart();
        startLoop();

        // Sauvegarde périodique + au changement de page
        setInterval(save, 15000);
        setInterval(saveScore, 30000);
        window.addEventListener('beforeunload', () => { save(); saveScore(); });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
