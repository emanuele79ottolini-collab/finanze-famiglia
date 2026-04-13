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
    settings: { user1: 'Emanuele', user2: 'Elena', currency: '€', ccUser1: 0, ccUser2: 0 },
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
    db.ref(ROOT).set(fbData)
        .then(() => setStatus('online'))
        .catch(e => {
            console.warn('Firebase write error:', e);
            setStatus('offline');
            if (typeof showToast === 'function') showToast('⚠️ ERRORE SALVATAGGIO CLOUD. Dato salvato solo sul tuo dispositivo. Firebase è disabilitato.', 'error');
        });
}

// ── Scrivi solo una collezione su Firebase (evita sovrascritture) ─
function saveCollection(collection, arr) {
    const data = loadData();
    data[collection] = arr;
    writeCache(data);
    db.ref(`${ROOT}/${collection}`).set(arrToObj(arr))
        .then(() => setStatus('online'))
        .catch(e => {
            console.warn('Firebase write error:', e);
            setStatus('offline');
            if (typeof showToast === 'function') showToast('⚠️ ERRORE SALVATAGGIO CLOUD. Dato salvato solo sul tuo dispositivo. Firebase è disabilitato.', 'error');
        });
}

function saveSettings(settings) {
    const data = loadData();
    data.settings = { ...data.settings, ...settings };
    writeCache(data);
    db.ref(`${ROOT}/settings`).update(settings)
        .then(() => setStatus('online'))
        .catch(e => {
            console.warn('Firebase write error:', e);
            setStatus('offline');
            if (typeof showToast === 'function') showToast('⚠️ ERRORE SALVATAGGIO CLOUD. Dato salvato solo sul tuo dispositivo. Firebase è disabilitato.', 'error');
        });
}

// ── Listener realtime — aggiorna UI quando l'altro utente modifica ──
let _realtimeCallback = null;
let _fbUnsubscribe = null;
let _fbReady = false;
let _fbReadyCallbacks = [];

function onFirebaseReady(cb) {
    if (_fbReady) { cb(); return; }
    _fbReadyCallbacks.push(cb);
}

function startRealtimeListener(onDataChange) {
    _realtimeCallback = onDataChange;
    if (_fbUnsubscribe) { _fbUnsubscribe(); }

    const ref = db.ref(ROOT);
    const handler = ref.on('value', snapshot => {
        const val = snapshot.val();
        setStatus('online');

        if (val) {
            const merged = {
                settings: { ...defaultData.settings, ...val.settings },
                costifissi: objToArr(val.costifissi),
                finanziamenti: objToArr(val.finanziamenti),
                entrate: objToArr(val.entrate),
                transazioni: objToArr(val.transazioni),
            };
            writeCache(merged);
        } else {
            // FIREBASE È VUOTO (NUOVO DB PULITO) -> PUSH DEI DATI LOCALI (Emanuele)
            const local = loadData();
            const hasData = local.transazioni.length > 0 || local.costifissi.length > 0 || local.finanziamenti.length > 0 || local.entrate.length > 0;
            if (hasData) {
                console.log('Nuovo DB rilevato: sincronizzo i dati locali di Emanuele verso il cloud...');
                saveData(local); // Push to Firebase
                if (typeof showToast === 'function') setTimeout(() => showToast('✅ I tuoi dati locali sono stati caricati sul nuovo Cloud!', 'success'), 1500);
            }
        }

        // Prima volta: sblocca il render iniziale
        if (!_fbReady) {
            _fbReady = true;
            _fbReadyCallbacks.forEach(cb => cb());
            _fbReadyCallbacks = [];
        }

        if (_realtimeCallback) _realtimeCallback();
    }, err => {
        console.warn('Firebase read error:', err);
        setStatus('offline');

        // MOSTRA ERRORE ESPLICITO
        if (typeof showToast === 'function') {
            showToast('⚠️ ERRORE FIREBASE: Il database è disabilitato o non raggiungibile. Usa Esporta/Importa JSON per allineare i dati temporaneamente.', 'error');
        }

        // Anche in caso di errore, sblocca il render con dati locali
        if (!_fbReady) {
            _fbReady = true;
            _fbReadyCallbacks.forEach(cb => cb());
            _fbReadyCallbacks = [];
        }
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
    writeCache(data);
    db.ref(`${ROOT}/${collection}/${item.id}`).set(item)
        .then(() => setStatus('online'))
        .catch(e => { console.warn('Firebase write error:', e); setStatus('offline'); if (typeof showToast === 'function') showToast('⚠️ ERRORE SALVATAGGIO CLOUD. Lato server disabilitato.', 'error'); });
    return item;
}

function updateItem(collection, id, updates) {
    const data = loadData();
    const idx = data[collection].findIndex(i => i.id === id);
    if (idx !== -1) {
        data[collection][idx] = { ...data[collection][idx], ...updates, updatedAt: new Date().toISOString() };
        writeCache(data);
        db.ref(`${ROOT}/${collection}/${id}`).update({ ...updates, updatedAt: data[collection][idx].updatedAt })
            .then(() => setStatus('online'))
            .catch(e => { console.warn('Firebase write error:', e); setStatus('offline'); if (typeof showToast === 'function') showToast('⚠️ ERRORE SALVATAGGIO CLOUD. Lato server disabilitato.', 'error'); });
    }
}

function deleteItem(collection, id) {
    const data = loadData();
    data[collection] = data[collection].filter(i => i.id !== id);
    writeCache(data);
    db.ref(`${ROOT}/${collection}/${id}`).remove()
        .then(() => setStatus('online'))
        .catch(e => { console.warn('Firebase write error:', e); setStatus('offline'); });
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

// ── Esporta API ──────────────────────────────────────────────
window.DB = {
    loadData, saveData,
    addItem, updateItem, deleteItem, getAll,
    calcTotaleCostiMensili, calcTotaleEntrateMensili, calcSaldo,
    calcDistribuzioneCosti, calcStorico6Mesi,
    exportJSON, importJSON, resetData, saveSettings,
    startRealtimeListener, stopRealtimeListener, setStatus, onFirebaseReady,
};
