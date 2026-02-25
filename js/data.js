// ============================================================
//  data.js — Firebase Realtime Database + localStorage cache
// ============================================================

// ── Firebase Config ──────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyABfgGcZ26cLOO7odeskvOoXDqFFMMqdTI",
    authDomain: "finanze-web.firebaseapp.com",
    databaseURL: "https://finanze-web-default-rtdb.firebaseio.com",
    projectId: "finanze-web",
    storageBucket: "finanze-web.firebasestorage.app",
    messagingSenderId: "1045380800135",
    appId: "1:1045380800135:web:933b946e8fc3fe2373a222"
};

// ── Inizializza Firebase ──────────────────────────────────────
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const ROOT = 'finanze_famigliari';

// ── Cache locale (localStorage) ──────────────────────────────
const CACHE_KEY = 'finanze_cache_v2';

const defaultData = {
    settings: { user1: 'Emanuele', user2: 'Elena', currency: '€' },
    costifissi: [],
    finanziamenti: [],
    entrate: [],
    transazioni: [],
};

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function readCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return deepClone(defaultData);
        const p = JSON.parse(raw);
        return {
            settings: { ...defaultData.settings, ...p.settings },
            costifissi: p.costifissi || [],
            finanziamenti: p.finanziamenti || [],
            entrate: p.entrate || [],
            transazioni: p.transazioni || [],
        };
    } catch { return deepClone(defaultData); }
}

function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { }
}

// loadData — legge dalla cache locale (sempre sincrono)
function loadData() { return readCache(); }

// ── Conversione array ↔ object per Firebase ──────────────────
// Firebase non supporta array nativamente → usiamo oggetti con id come chiave
function arrToObj(arr) {
    const o = {};
    arr.forEach(item => { if (item.id) o[item.id] = item; });
    return o;
}
function objToArr(obj) {
    if (!obj) return [];
    return Object.values(obj).sort((a, b) =>
        (a.createdAt || '') < (b.createdAt || '') ? -1 : 1
    );
}

// ── Scrivi su Firebase ───────────────────────────────────────
function saveData(data) {
    writeCache(data);
    const fbData = {
        settings: data.settings,
        costifissi: arrToObj(data.costifissi),
        finanziamenti: arrToObj(data.finanziamenti),
        entrate: arrToObj(data.entrate),
        transazioni: arrToObj(data.transazioni),
    };
    db.ref(ROOT).set(fbData).catch(e => {
        console.warn('Firebase write error:', e);
        setStatus('offline');
    });
}

// ── Listener realtime — aggiorna UI quando l'altro utente modifica ──
let _realtimeCallback = null;
let _fbUnsubscribe = null;

function startRealtimeListener(onDataChange) {
    _realtimeCallback = onDataChange;
    if (_fbUnsubscribe) { _fbUnsubscribe(); }

    const ref = db.ref(ROOT);
    const handler = ref.on('value', snapshot => {
        const val = snapshot.val();
        setStatus('online');
        if (!val) return;

        const merged = {
            settings: { ...defaultData.settings, ...val.settings },
            costifissi: objToArr(val.costifissi),
            finanziamenti: objToArr(val.finanziamenti),
            entrate: objToArr(val.entrate),
            transazioni: objToArr(val.transazioni),
        };
        writeCache(merged);
        if (_realtimeCallback) _realtimeCallback(merged);
    }, err => {
        console.warn('Firebase read error:', err);
        setStatus('offline');
    });

    _fbUnsubscribe = () => ref.off('value', handler);
}

function stopRealtimeListener() {
    if (_fbUnsubscribe) { _fbUnsubscribe(); _fbUnsubscribe = null; }
}

// ── Status badge ─────────────────────────────────────────────
function setStatus(state) {
    const badge = document.getElementById('fb-status-badge');
    if (!badge) return;
    if (state === 'online') {
        badge.className = 'file-badge connected';
        badge.textContent = '● Online';
    } else {
        badge.className = 'file-badge disconnected';
        badge.textContent = '○ Offline';
    }
}

// ── CRUD generico ────────────────────────────────────────────
function addItem(collection, item) {
    const data = loadData();
    item.id = generateId();
    item.createdAt = new Date().toISOString();
    data[collection].push(item);
    saveData(data);
    return item;
}

function updateItem(collection, id, updates) {
    const data = loadData();
    const idx = data[collection].findIndex(i => i.id === id);
    if (idx !== -1) {
        data[collection][idx] = { ...data[collection][idx], ...updates, updatedAt: new Date().toISOString() };
    }
    saveData(data);
}

function deleteItem(collection, id) {
    const data = loadData();
    data[collection] = data[collection].filter(i => i.id !== id);
    saveData(data);
}

function getAll(collection) { return loadData()[collection]; }

// ── Calcoli aggregati ────────────────────────────────────────
function calcTotaleCostiMensili() {
    const data = loadData();
    const fissi = data.costifissi.reduce((s, c) => s + (parseFloat(c.importo) || 0), 0);
    const rate = data.finanziamenti.reduce((s, f) => f.rateRimanenti > 0 ? s + (parseFloat(f.rata) || 0) : s, 0);
    return fissi + rate;
}
function calcTotaleEntrateMensili() {
    return loadData().entrate.reduce((s, e) => s + (parseFloat(e.importo) || 0), 0);
}
function calcSaldo() { return calcTotaleEntrateMensili() - calcTotaleCostiMensili(); }

function calcDistribuzioneCosti() {
    const data = loadData();
    const g = {};
    data.costifissi.forEach(c => { const k = c.categoria || 'Altro'; g[k] = (g[k] || 0) + (parseFloat(c.importo) || 0); });
    data.finanziamenti.forEach(f => {
        if (f.rateRimanenti > 0) g['Finanziamenti'] = (g['Finanziamenti'] || 0) + (parseFloat(f.rata) || 0);
    });
    return g;
}

function calcStorico6Mesi() {
    const data = loadData();
    const result = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const y = d.getFullYear(), m = d.getMonth();
        const label = d.toLocaleString('it-IT', { month: 'short', year: '2-digit' });
        const filter = (tipo) => data.transazioni
            .filter(t => { const td = new Date(t.data); return td.getFullYear() === y && td.getMonth() === m && t.tipo === tipo; })
            .reduce((s, t) => s + (parseFloat(t.importo) || 0), 0);
        result.push({ label, entrate: filter('entrata'), uscite: filter('uscita') });
    }
    return result;
}

// ── Export / Import JSON ──────────────────────────────────────
function exportJSON() {
    const data = loadData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanze_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const parsed = JSON.parse(e.target.result);
                const merged = {
                    settings: { ...defaultData.settings, ...parsed.settings },
                    costifissi: parsed.costifissi || [],
                    finanziamenti: parsed.finanziamenti || [],
                    entrate: parsed.entrate || [],
                    transazioni: parsed.transazioni || [],
                };
                saveData(merged);
                resolve();
            } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function resetData() { saveData(deepClone(defaultData)); }

function saveSettings(settings) {
    const data = loadData();
    data.settings = { ...data.settings, ...settings };
    saveData(data);
}

// ── Esporta API ──────────────────────────────────────────────
window.DB = {
    loadData, saveData,
    addItem, updateItem, deleteItem, getAll,
    calcTotaleCostiMensili, calcTotaleEntrateMensili, calcSaldo,
    calcDistribuzioneCosti, calcStorico6Mesi,
    exportJSON, importJSON, resetData, saveSettings,
    startRealtimeListener, stopRealtimeListener, setStatus,
};
