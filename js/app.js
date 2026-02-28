// ============================================================
//  app.js  —  SPA router, UI renderer, event handlers
// ============================================================

// ── Helpers ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const fmt = v => {
    const cur = (DB.loadData().settings.currency) || '€';
    return `${cur}${Number(v || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtDate = d => d ? new Date(d).toLocaleDateString('it-IT') : '—';

function showToast(msg, type = 'success') {
    const tc = $('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${msg}`;
    tc.appendChild(t);
    setTimeout(() => {
        t.style.animation = 'toastOut .3s ease forwards';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

// ── Utente corrente (locale al dispositivo) ─────────────────
function getCurrentUser() {
    const idx = parseInt(localStorage.getItem('finanze_current_user') || '0', 10);
    const data = DB.loadData();
    if (idx === 1) return data.settings.user1 || 'Emanuele';
    if (idx === 2) return data.settings.user2 || 'Elena';
    return 'Comune';
}

function setCurrentUser(idx) {
    localStorage.setItem('finanze_current_user', String(idx));
    const data = DB.loadData();
    const name = idx === 1 ? (data.settings.user1 || 'Emanuele') : (data.settings.user2 || 'Elena');
    // Aggiorna stile pulsanti sidebar
    ['cu-btn-1', 'cu-btn-2'].forEach((id, i) => {
        const btn = $(id);
        if (!btn) return;
        btn.className = 'btn btn-sm ' + (i + 1 === idx ? 'btn-primary' : 'btn-outline');
        btn.style.flex = '1';
        btn.style.fontSize = '12px';
    });
    showToast(`👤 Ciao ${name}! I tuoi inserimenti saranno taggati automaticamente.`);
}

function initCurrentUserUI() {
    const idx = parseInt(localStorage.getItem('finanze_current_user') || '0', 10);
    if (idx > 0) setCurrentUser(idx);
}

// ── Router ───────────────────────────────────────────────────
const routes = {
    dashboard: renderDashboard,
    costifissi: renderCostiFissi,
    finanziamenti: renderFinanziamenti,
    entrate: renderEntrate,
    transazioni: renderTransazioni,
    impostazioni: renderImpostazioni,
};

let currentPage = 'dashboard';

function navigate(page) {
    if (!routes[page]) page = 'dashboard';
    currentPage = page;

    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(el => {
        el.classList.toggle('active', el.id === `page-${page}`);
    });

    routes[page]();
}

// ── Dashboard ────────────────────────────────────────────────
function renderDashboard() {
    const data = DB.loadData();
    const entrate = DB.calcTotaleEntrateMensili();
    const uscite = DB.calcTotaleCostiMensili();
    const saldo = DB.calcSaldo();

    // CC Reali
    const cc1 = parseFloat(data.settings.ccUser1) || 0;
    const cc2 = parseFloat(data.settings.ccUser2) || 0;
    const cctot = cc1 + cc2;

    // Nomi CC
    const n1 = data.settings.user1 || 'Emanuele';
    const n2 = data.settings.user2 || 'Elena';

    $('cc-name-1').textContent = `Saldo CC ${n1}`;
    $('cc-name-2').textContent = `Saldo CC ${n2}`;

    $('kpi-cc1').textContent = fmt(cc1);
    $('kpi-cc2').textContent = fmt(cc2);
    $('kpi-cc-tot').textContent = fmt(cctot);

    // KPI
    $('kpi-entrate').textContent = fmt(entrate);
    $('kpi-uscite').textContent = fmt(uscite);
    $('kpi-saldo').textContent = fmt(saldo);

    const saldoCard = $('kpi-saldo-card');
    saldoCard.classList.toggle('negative', saldo < 0);
    $('kpi-saldo').className = `kpi-value ${saldo >= 0 ? 'positive' : 'negative'}`;

    // Alert
    const alert = $('dash-alert');
    if (saldo < 0) {
        alert.classList.add('show');
        alert.querySelector('span').textContent =
            `⚠️  Attenzione: le uscite superano le entrate di ${fmt(Math.abs(saldo))} questo mese!`;
    } else {
        alert.classList.remove('show');
    }

    // Rate finanziamenti attivi
    const rateTot = data.finanziamenti.filter(f => f.rateRimanenti > 0)
        .reduce((s, f) => s + (parseFloat(f.rata) || 0), 0);
    $('kpi-rate').textContent = fmt(rateTot);

    // ── Spese del mese corrente (da Transazioni) ─────────────
    const meseCorrente = new Date().toISOString().slice(0, 7); // YYYY-MM
    const txMese = DB.getAll('transazioni').filter(t =>
        t.tipo !== 'entrata' && t.data && t.data.startsWith(meseCorrente)
    );
    const totTxMese = txMese.reduce((s, t) => s + (parseFloat(t.importo) || 0), 0);
    const disponibile = saldo - totTxMese;

    const kpiTxMese = $('kpi-tx-mese');
    const kpiDisp = $('kpi-disponibile');
    const kpiTxLabel = $('kpi-tx-mese-label');
    if (kpiTxMese) {
        kpiTxMese.textContent = fmt(totTxMese);
    }
    if (kpiTxLabel) {
        const mesiNomi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        const m = new Date().getMonth();
        kpiTxLabel.textContent = `${txMese.length} transazioni — ${mesiNomi[m]} ${new Date().getFullYear()}`;
    }
    if (kpiDisp) {
        kpiDisp.textContent = fmt(disponibile);
        kpiDisp.style.color = disponibile >= 0 ? 'var(--success)' : 'var(--pink)';
    }

    // Grafici
    Charts.renderDonutChart('donut-chart');
    Charts.renderBarChart('bar-chart');

    // Prossime scadenze (bollette fisse)
    const fissi = data.costifissi.slice(0, 5);
    const listEl = $('scadenze-list');
    if (fissi.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>Nessuna voce registrata</p></div>';
    } else {
        listEl.innerHTML = fissi.map(c => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:13px;font-weight:600;">${esc(c.nome)}</div>
          <div style="font-size:11px;color:var(--text-dim);">${esc(c.categoria)}</div>
        </div>
        <div style="font-size:14px;font-weight:700;color:var(--accent-light);">${fmt(c.importo)}</div>
      </div>
    `).join('');
    }
}

// ── Modale Aggiorna Saldi CC ─────────────────────────────────
function openCcModal() {
    const data = DB.loadData();
    $('lbl-quick-cc1').textContent = `Saldo C/C ${data.settings.user1 || 'Emanuele'} (€)`;
    $('lbl-quick-cc2').textContent = `Saldo C/C ${data.settings.user2 || 'Elena'} (€)`;
    $('quick-cc1').value = data.settings.ccUser1 || '';
    $('quick-cc2').value = data.settings.ccUser2 || '';
    openModal('cc-modal');
}

function saveQuickCc() {
    DB.saveSettings({
        ccUser1: parseFloat($('quick-cc1').value) || 0,
        ccUser2: parseFloat($('quick-cc2').value) || 0
    });
    closeModal('cc-modal');
    showToast('Saldi aggiornati con successo!');
    renderDashboard();
}

// ── Costi Fissi ──────────────────────────────────────────────
let cfEditId = null;

function renderCostiFissi() {
    const items = DB.getAll('costifissi');
    const search = ($('cf-search')?.value || '').toLowerCase();
    const filter = $('cf-filter')?.value || '';
    let filtered = items.filter(c => {
        const matchSearch = !search || c.nome.toLowerCase().includes(search) || (c.categoria || '').toLowerCase().includes(search);
        const matchFilter = !filter || c.categoria === filter;
        return matchSearch && matchFilter;
    });

    const tbody = $('cf-tbody');
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">💳</div><p>Nessun costo fisso. Aggiungi il primo!</p></div></td></tr>`;
    } else {
        tbody.innerHTML = filtered.map(c => `
      <tr>
        <td><strong>${esc(c.nome)}</strong></td>
        <td><span class="badge ${catBadge(c.categoria)}">${esc(c.categoria || '—')}</span></td>
        <td style="font-weight:700;color:var(--accent-light);">${fmt(c.importo)}</td>
        <td style="color:var(--text-muted);">${esc(c.frequenza || 'Mensile')}</td>
        <td style="color:var(--text-dim);font-size:12px;">${esc(c.note || '—')}</td>
        <td>
          <div class="td-actions">
            <button class="btn btn-outline btn-sm btn-icon" onclick="cfEdit('${c.id}')" title="Modifica">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="cfDelete('${c.id}')" title="Elimina">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
    }

    // Totale
    const tot = filtered.reduce((s, c) => s + (parseFloat(c.importo) || 0), 0);
    $('cf-total').textContent = fmt(tot);
}

function cfEdit(id) {
    const item = DB.getAll('costifissi').find(c => c.id === id);
    if (!item) return;
    cfEditId = id;
    $('cf-modal-title').textContent = 'Modifica Costo Fisso';
    $('cf-nome').value = item.nome || '';
    $('cf-categoria').value = item.categoria || 'Bollette';
    $('cf-importo').value = item.importo || '';
    $('cf-frequenza').value = item.frequenza || 'Mensile';
    $('cf-note').value = item.note || '';
    openModal('cf-modal');
}

function cfDelete(id) {
    if (!confirm('Eliminare questo costo fisso?')) return;
    DB.deleteItem('costifissi', id);
    showToast('Costo eliminato');
    renderCostiFissi();
}

function cfSave() {
    const nome = $('cf-nome').value.trim();
    const importo = parseFloat($('cf-importo').value);
    if (!nome || isNaN(importo)) { showToast('Nome e importo sono obbligatori', 'error'); return; }
    const item = {
        nome,
        categoria: $('cf-categoria').value,
        importo,
        frequenza: $('cf-frequenza').value,
        note: $('cf-note').value.trim(),
    };
    if (cfEditId) {
        DB.updateItem('costifissi', cfEditId, item);
        showToast('Costo fisso aggiornato');
        cfEditId = null;
    } else {
        DB.addItem('costifissi', item);
        showToast('Costo fisso aggiunto');
    }
    closeModal('cf-modal');
    renderCostiFissi();
}

// ── Finanziamenti ────────────────────────────────────────────
let finEditId = null;

function renderFinanziamenti() {
    const items = DB.getAll('finanziamenti');
    const search = ($('fin-search')?.value || '').toLowerCase();
    const filtered = items.filter(f => !search || f.nome.toLowerCase().includes(search));

    const tbody = $('fin-tbody');
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📊</div><p>Nessun finanziamento. Aggiungine uno!</p></div></td></tr>`;
    } else {
        tbody.innerHTML = filtered.map(f => {
            const totRate = parseInt(f.rateTotali) || 1;
            const rimanenti = parseInt(f.rateRimanenti) || 0;
            const pagate = totRate - rimanenti;
            const perc = Math.min(100, Math.round((pagate / totRate) * 100));
            // Usa capitaleResiduo salvato, oppure prova a leggerlo dalle Note,
            // altrimenti calcola rata × rate rimanenti
            let residuo;
            if (f.capitaleResiduo) {
                residuo = parseFloat(f.capitaleResiduo);
            } else {
                const noteNum = (f.note || '').match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+,\d+)/g);
                if (noteNum) {
                    const parsed = parseFloat(noteNum[noteNum.length - 1].replace(/\./g, '').replace(',', '.'));
                    residuo = isNaN(parsed) ? (parseFloat(f.rata) || 0) * rimanenti : parsed;
                } else {
                    residuo = (parseFloat(f.rata) || 0) * rimanenti;
                }
            }
            const status = rimanenti <= 0
                ? '<span class="badge badge-green">Concluso ✓</span>'
                : rimanenti <= 3
                    ? '<span class="badge badge-orange">In scadenza</span>'
                    : '<span class="badge badge-indigo">Attivo</span>';
            return `
        <tr>
          <td><strong>${esc(f.nome)}</strong><div style="font-size:11px;color:var(--text-dim);">${esc(f.istituto || '')}</div></td>
          <td>${status}</td>
          <td style="color:var(--accent-light);font-weight:700;">${fmt(f.rata)}<div style="font-size:11px;color:var(--text-dim);">/mese</div></td>
          <td>
            <div class="progress-wrap">
              <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${perc}%"></div></div>
              <span class="progress-label">${pagate}/${totRate}</span>
            </div>
          </td>
          <td style="color:var(--text-muted);">${rimanenti} rate<div style="font-size:11px;color:var(--text-dim);">${fmt(residuo)} residuo</div></td>
          <td style="font-size:12px;color:var(--text-dim);">${f.dataFine ? fmtDate(f.dataFine) : '—'}</td>
          <td>
            <div class="td-actions">
              <button class="btn btn-outline btn-sm btn-icon" onclick="finEdit('${f.id}')" title="Modifica">✏️</button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="finDelete('${f.id}')" title="Elimina">🗑️</button>
            </div>
          </td>
        </tr>
      `;
        }).join('');
    }

    const totRate = filtered.filter(f => f.rateRimanenti > 0)
        .reduce((s, f) => s + (parseFloat(f.rata) || 0), 0);
    $('fin-total').textContent = fmt(totRate);
}

function finEdit(id) {
    const item = DB.getAll('finanziamenti').find(f => f.id === id);
    if (!item) return;
    finEditId = id;
    $('fin-modal-title').textContent = 'Modifica Finanziamento';
    $('fin-nome').value = item.nome || '';
    $('fin-istituto').value = item.istituto || '';
    $('fin-rata').value = item.rata || '';
    $('fin-rate-tot').value = item.rateTotali || '';
    $('fin-rate-rim').value = item.rateRimanenti || '';
    $('fin-data-fine').value = item.dataFine || '';
    $('fin-capitale-residuo').value = item.capitaleResiduo || '';
    $('fin-note').value = item.note || '';
    openModal('fin-modal');
}

function finDelete(id) {
    if (!confirm('Eliminare questo finanziamento?')) return;
    DB.deleteItem('finanziamenti', id);
    showToast('Finanziamento eliminato');
    renderFinanziamenti();
}

function finSave() {
    const nome = $('fin-nome').value.trim();
    const rata = parseFloat($('fin-rata').value);
    const rateTotali = parseInt($('fin-rate-tot').value);
    const rateRimanenti = parseInt($('fin-rate-rim').value);
    if (!nome || isNaN(rata) || isNaN(rateTotali) || isNaN(rateRimanenti)) {
        showToast('Compila tutti i campi obbligatori', 'error'); return;
    }
    const item = {
        nome, rata, rateTotali, rateRimanenti,
        istituto: $('fin-istituto').value.trim(),
        dataFine: $('fin-data-fine').value,
        capitaleResiduo: parseFloat($('fin-capitale-residuo').value) || null,
        note: $('fin-note').value.trim(),
    };
    if (finEditId) {
        DB.updateItem('finanziamenti', finEditId, item);
        showToast('Finanziamento aggiornato');
        finEditId = null;
    } else {
        DB.addItem('finanziamenti', item);
        showToast('Finanziamento aggiunto');
    }
    closeModal('fin-modal');
    renderFinanziamenti();
}

// ── Entrate ──────────────────────────────────────────────────
let entEditId = null;

function renderEntrate() {
    const items = DB.getAll('entrate');
    const tbody = $('ent-tbody');
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">💼</div><p>Nessuna entrata registrata.</p></div></td></tr>`;
    } else {
        tbody.innerHTML = items.map(e => `
      <tr>
        <td><strong>${esc(e.descrizione)}</strong></td>
        <td><span class="badge ${entBadge(e.tipo)}">${esc(e.tipo || '—')}</span></td>
        <td><span class="badge badge-gray">${esc(e.persona || '—')}</span></td>
        <td style="color:var(--success);font-weight:700;">${fmt(e.importo)}</td>
        <td>
          <div class="td-actions">
            <button class="btn btn-outline btn-sm btn-icon" onclick="entEdit('${e.id}')">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="entDelete('${e.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
    }
    const tot = items.reduce((s, e) => s + (parseFloat(e.importo) || 0), 0);
    $('ent-total').textContent = fmt(tot);

    // Aggiorna select persona
    const data = DB.loadData();
    ['ent-persona'].forEach(sid => {
        const sel = $(sid);
        if (!sel) return;
        sel.innerHTML = `<option value="${esc(data.settings.user1)}">${esc(data.settings.user1)}</option>
                     <option value="${esc(data.settings.user2)}">${esc(data.settings.user2)}</option>
                     <option value="Comune">Comune</option>`;
    });
}

function entEdit(id) {
    const item = DB.getAll('entrate').find(e => e.id === id);
    if (!item) return;
    entEditId = id;
    $('ent-modal-title').textContent = 'Modifica Entrata';
    $('ent-descrizione').value = item.descrizione || '';
    $('ent-tipo').value = item.tipo || 'Stipendio';
    $('ent-importo').value = item.importo || '';
    $('ent-persona').value = item.persona || '';
    $('ent-note').value = item.note || '';
    openModal('ent-modal');
}

function entDelete(id) {
    if (!confirm('Eliminare questa entrata?')) return;
    DB.deleteItem('entrate', id);
    showToast('Entrata eliminata');
    renderEntrate();
}

function entSave() {
    const descrizione = $('ent-descrizione').value.trim();
    const importo = parseFloat($('ent-importo').value);
    if (!descrizione || isNaN(importo)) { showToast('Descrizione e importo sono obbligatori', 'error'); return; }
    const item = {
        descrizione, importo,
        tipo: $('ent-tipo').value,
        persona: $('ent-persona').value,
        note: $('ent-note').value.trim(),
    };
    if (entEditId) {
        DB.updateItem('entrate', entEditId, item);
        showToast('Entrata aggiornata');
        entEditId = null;
    } else {
        DB.addItem('entrate', item);
        showToast('Entrata aggiunta');
    }
    closeModal('ent-modal');
    renderEntrate();
}

// ── Transazioni ──────────────────────────────────────────────
let txEditId = null;
let txSelected = new Set();
let txGroupMode = false;
let viewMine = { tx: false, ent: false }; // false = vedi tutti, true = solo miei

function toggleViewMine(section) {
    viewMine[section] = !viewMine[section];
    const cu = getCurrentUser();
    const isFiltered = viewMine[section] && cu !== 'Comune';
    const btnId = section + '-toggle-view-btn';
    const labelId = section + '-view-label';
    const btn = $(btnId);
    const lbl = $(labelId);
    if (btn) {
        btn.textContent = isFiltered ? '👥 Mostra tutto' : '👤 Solo miei';
        btn.className = isFiltered ? 'btn btn-primary' : 'btn btn-outline';
        btn.style.fontSize = '12px';
    }
    if (lbl) lbl.textContent = isFiltered
        ? `Visualizzazione: solo ${cu}`
        : (section === 'tx' ? 'Tutti i movimenti extra registrati' : 'Stipendi e tutti gli altri redditi');
    if (section === 'tx') renderTransazioni();
    else renderEntrate();
}

function txUpdateBulkBar() {
    const btn = $('tx-delete-selected-btn');
    const cnt = $('tx-selected-count');
    if (btn) btn.style.display = txSelected.size > 0 ? '' : 'none';
    if (cnt) cnt.textContent = txSelected.size;
}

function txDeleteSelected() {
    if (txSelected.size === 0) return;
    if (!confirm(`Eliminare ${txSelected.size} transazioni selezionate?`)) return;
    txSelected.forEach(id => DB.deleteItem('transazioni', id));
    showToast(`${txSelected.size} transazioni eliminate`);
    txSelected.clear();
    renderTransazioni();
}

function renderTransazioni() {
    const items = DB.getAll('transazioni');
    const search = ($('tx-search')?.value || '').toLowerCase();
    const filterTipo = $('tx-filter-tipo')?.value || '';
    const filterMese = $('tx-filter-mese')?.value || '';
    const data = DB.loadData();

    let filtered = items.filter(t => {
        const ms = !search || t.descrizione.toLowerCase().includes(search) || (t.categoria || '').toLowerCase().includes(search);
        const mt = !filterTipo || t.tipo === filterTipo;
        const mm = !filterMese || (t.data && t.data.startsWith(filterMese));
        // Filtro per utente corrente se "solo miei" attivo
        const cu = getCurrentUser();
        const mp = !viewMine.tx || cu === 'Comune' || (t.persona || '') === cu;
        return ms && mt && mm && mp;
    });

    // Sort by date desc
    filtered.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

    const tbody = $('tx-tbody');
    const tfoot = $('tx-tfoot');
    const chartWrap = $('tx-chart-wrap');
    const tableWrap = $('tx-table-wrap');

    if (txGroupMode) {
        // ── Modalità GRAFICO PER CATEGORIA ─────────────────────
        tableWrap.style.display = 'none';
        chartWrap.style.display = 'block';

        // Aggrega per categoria
        const groups = {};
        filtered.forEach(t => {
            const cat = t.categoria || 'Altro';
            if (!groups[cat]) groups[cat] = { cat, count: 0, total: 0 };
            groups[cat].count++;
            groups[cat].total += parseFloat(t.importo) || 0;
        });
        const sorted = Object.values(groups).sort((a, b) => b.total - a.total);

        const palette = [
            '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
            '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316',
        ];

        // Distruggi il vecchio grafico se esiste
        if (window.txCatChart instanceof Chart) window.txCatChart.destroy();

        const ctx = $('tx-cat-chart').getContext('2d');
        window.txCatChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(g => g.cat),
                datasets: [{
                    label: 'Spesa (€)',
                    data: sorted.map(g => g.total),
                    backgroundColor: sorted.map((_, i) => palette[i % palette.length] + 'cc'),
                    borderColor: sorted.map((_, i) => palette[i % palette.length]),
                    borderWidth: 2,
                    borderRadius: 10,
                    borderSkipped: false,
                    // Effetto "3D" con shadow via plugin
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` €${ctx.parsed.y.toLocaleString('it-IT', { minimumFractionDigits: 2 })} (${sorted[ctx.dataIndex].count} operazioni)`
                        }
                    },
                    title: {
                        display: true,
                        text: `Spese per categoria — ${filtered.length} transazioni`,
                        color: '#a5b4fc',
                        font: { size: 13, weight: 'bold' },
                        padding: { bottom: 16 }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#c4c4f0', font: { size: 12 } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: {
                            color: '#c4c4f0',
                            callback: v => '€' + v.toLocaleString('it-IT')
                        }
                    }
                },
                // Simula profondità 3D con animazione
                animation: { duration: 600, easing: 'easeOutQuart' }
            },
            plugins: [{
                id: 'barShadow',
                beforeDatasetsDraw(chart) {
                    const ctx2 = chart.ctx;
                    ctx2.save();
                    ctx2.shadowColor = 'rgba(99,102,241,0.4)';
                    ctx2.shadowBlur = 12;
                    ctx2.shadowOffsetX = 4;
                    ctx2.shadowOffsetY = 6;
                }
            }]
        });

    } else {
        // ── Modalità NORMALE ────────────────────────────────────
        if (window.txCatChart instanceof Chart) { window.txCatChart.destroy(); window.txCatChart = null; }
        tableWrap.style.display = '';
        chartWrap.style.display = 'none';

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div><p>Nessuna transazione trovata.</p></div></td></tr>`;
            tfoot.innerHTML = '';
        } else {
            tbody.innerHTML = filtered.map(t => {
                const isEnt = t.tipo === 'entrata';
                const checked = txSelected.has(t.id) ? 'checked' : '';
                return `
        <tr>
          <td><input type="checkbox" class="tx-chk" data-id="${t.id}" ${checked} onchange="txOnCheck(this)" /></td>
          <td style="font-size:12px;color:var(--text-dim);">${fmtDate(t.data)}</td>
          <td><strong>${esc(t.descrizione)}</strong><br/><span class="badge ${catBadge(t.categoria)}" style="margin-top:3px;display:inline-block;">${esc(t.categoria || '—')}</span></td>
          <td><span class="badge badge-gray">${esc(t.persona || '—')}</span></td>
          <td><span class="badge ${isEnt ? 'badge-green' : 'badge-pink'}">${isEnt ? '↑ Entrata' : '↓ Uscita'}</span></td>
          <td style="font-weight:700;color:${isEnt ? 'var(--success)' : 'var(--pink)'};">${isEnt ? '+' : '-'}${fmt(t.importo)}</td>
          <td>
            <div class="td-actions">
              <button class="btn btn-outline btn-sm btn-icon" onclick="txDuplicate('${t.id}')" title="Duplica">📋</button>
              <button class="btn btn-outline btn-sm btn-icon" onclick="txEdit('${t.id}')">✏️</button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="txDelete('${t.id}')" title="Elimina">🗑️</button>
            </div>
          </td>
        </tr>`;
            }).join('');

            // ── Subtotale dinamico nel piè di pagina ───────────
            const totUscite = filtered.filter(t => t.tipo !== 'entrata').reduce((s, t) => s + (parseFloat(t.importo) || 0), 0);
            const totEntrate = filtered.filter(t => t.tipo === 'entrata').reduce((s, t) => s + (parseFloat(t.importo) || 0), 0);
            const netto = totEntrate - totUscite;
            tfoot.innerHTML = `
              <tr class="total-row" style="border-top:2px solid var(--border);">
                <td colspan="4" style="font-size:12px;color:var(--text-dim);">
                  Subtotale: <strong>${filtered.length}</strong> transazioni visibili
                </td>
                <td style="color:var(--success);font-weight:700;">+${fmt(totEntrate)}</td>
                <td style="color:var(--pink);font-weight:700;">-${fmt(totUscite)}</td>
                <td style="font-weight:700;color:${netto >= 0 ? 'var(--success)' : 'var(--pink)'};">
                  ${netto >= 0 ? '+' : ''}${fmt(netto)}
                </td>
              </tr>`;
        }
        txUpdateBulkBar();
    }

    // Update persona in modal
    ['tx-persona'].forEach(sid => {
        const sel = $(sid);
        if (!sel) return;
        sel.innerHTML = `<option value="${esc(data.settings.user1)}">${esc(data.settings.user1)}</option>
                     <option value="${esc(data.settings.user2)}">${esc(data.settings.user2)}</option>
                     <option value="Comune">Comune</option>`;
    });

    // Update months filter
    const months = [...new Set(items.map(t => (t.data || '').slice(0, 7)).filter(Boolean))].sort().reverse();
    const sel = $('tx-filter-mese');
    if (sel) {
        const cur = sel.value;
        sel.innerHTML = '<option value="">Tutti i mesi</option>' +
            months.map(m => `<option value="${m}" ${m === cur ? 'selected' : ''}>${m}</option>`).join('');
    }
}

function txOnCheck(cb) {
    const id = cb.dataset.id;
    if (cb.checked) txSelected.add(id);
    else txSelected.delete(id);
    // Sync select-all
    const all = document.querySelectorAll('.tx-chk');
    const allChk = $('tx-select-all');
    if (allChk) allChk.checked = all.length > 0 && [...all].every(c => c.checked);
    txUpdateBulkBar();
}

function txEdit(id) {
    const item = DB.getAll('transazioni').find(t => t.id === id);
    if (!item) return;
    txEditId = id;
    $('tx-modal-title').textContent = 'Modifica Transazione';
    $('tx-descrizione').value = item.descrizione || '';
    $('tx-categoria').value = item.categoria || 'Altro';
    $('tx-tipo').value = item.tipo || 'uscita';
    $('tx-importo').value = item.importo || '';
    $('tx-data').value = item.data || '';
    $('tx-persona').value = item.persona || '';
    $('tx-note').value = item.note || '';
    openModal('tx-modal');
}

function txDuplicate(id) {
    const item = DB.getAll('transazioni').find(t => t.id === id);
    if (!item) return;
    txEditId = null;
    $('tx-modal-title').textContent = 'Duplica Transazione';
    $('tx-descrizione').value = item.descrizione || '';
    $('tx-categoria').value = item.categoria || 'Altro';
    $('tx-tipo').value = item.tipo || 'uscita';
    $('tx-importo').value = item.importo || '';
    $('tx-data').value = new Date().toISOString().slice(0, 10); // data odierna
    $('tx-persona').value = item.persona || '';
    $('tx-note').value = item.note || '';
    openModal('tx-modal');
}

function txDelete(id) {
    if (!confirm('Eliminare questa transazione?')) return;
    DB.deleteItem('transazioni', id);
    showToast('Transazione eliminata');
    renderTransazioni();
}

function txSave() {
    const descrizione = $('tx-descrizione').value.trim();
    const importo = parseFloat($('tx-importo').value);
    if (!descrizione || isNaN(importo)) { showToast('Descrizione e importo sono obbligatori', 'error'); return; }
    const item = {
        descrizione, importo,
        categoria: $('tx-categoria').value,
        tipo: $('tx-tipo').value,
        data: $('tx-data').value,
        persona: $('tx-persona').value,
        note: $('tx-note').value.trim(),
    };
    if (txEditId) {
        DB.updateItem('transazioni', txEditId, item);
        showToast('Transazione aggiornata');
        txEditId = null;
    } else {
        DB.addItem('transazioni', item);
        showToast('Transazione aggiunta');
    }
    closeModal('tx-modal');
    renderTransazioni();
}

function exportCSV() {
    const items = DB.getAll('transazioni');
    if (items.length === 0) { showToast('Nessuna transazione da esportare', 'error'); return; }
    const headers = ['Data', 'Descrizione', 'Categoria', 'Persona', 'Tipo', 'Importo', 'Note'];
    const rows = items.map(t => [
        t.data || '', t.descrizione, t.categoria || '', t.persona || '',
        t.tipo, t.importo, t.note || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transazioni_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV esportato!');
}

function importExcel(file) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

            if (rows.length === 0) { showToast('File Excel vuoto', 'error'); return; }

            // Trova le colonne (case-insensitive)
            const keys = Object.keys(rows[0]);
            const find = names => keys.find(k => names.some(n => k.trim().toUpperCase() === n));

            const colEur = find(['EUR', 'IMPORTO', 'AMOUNT', 'VALORE']);
            const colCat = find(['CATEGORIA', 'CATEGORY', 'CAT']);
            const colDesc = find(['DESCRIZIONE', 'DESCRIPTION', 'DESC', 'NOME']);
            const colData = find(['DATA OPERAZIONE', 'DATAOPERAZIONE', 'DATA', 'DATE', 'DATA VALUTA', 'DATAVALUTA', 'DATA CONTABILE', 'DATACONTABILE'])
                || keys[0]; // fallback: usa la colonna A (prima colonna)

            if (!colEur) { showToast('Colonna EUR non trovata nel file', 'error'); return; }

            const today = new Date().toISOString().slice(0, 10);
            let imported = 0, skipped = 0;

            rows.forEach(row => {
                const rawImporto = row[colEur];
                const importo = parseFloat(String(rawImporto).replace(',', '.'));
                if (isNaN(importo) || importo === 0) { skipped++; return; }

                // Data
                let data = today;
                if (colData && row[colData]) {
                    const d = row[colData];
                    if (d instanceof Date) {
                        data = d.toISOString().slice(0, 10);
                    } else {
                        const parsed = new Date(d);
                        if (!isNaN(parsed)) data = parsed.toISOString().slice(0, 10);
                    }
                }

                const categoria = colCat ? String(row[colCat]).trim() || 'Altro' : 'Altro';
                const descrizione = colDesc ? String(row[colDesc]).trim() || categoria : categoria;

                DB.addItem('transazioni', {
                    descrizione,
                    importo: Math.abs(importo),
                    tipo: 'uscita',
                    categoria,
                    data,
                    persona: 'Comune',
                    note: '',
                });
                imported++;
            });

            showToast(`✅ ${imported} transazioni importate${skipped ? ` (${skipped} righe saltate)` : ''}`);
            renderTransazioni();
        } catch (err) {
            console.error(err);
            showToast('Errore nella lettura del file Excel', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

// ── Impostazioni ─────────────────────────────────────────────
function renderImpostazioni() {
    const data = DB.loadData();
    $('set-user1').value = data.settings.user1 || '';
    $('set-user2').value = data.settings.user2 || '';
    $('set-currency').value = data.settings.currency || '€';

    const c1 = $('set-cc1'); if (c1) c1.value = data.settings.ccUser1 || '';
    const c2 = $('set-cc2'); if (c2) c2.value = data.settings.ccUser2 || '';

    const l1 = $('lbl-set-cc1'); if (l1) l1.textContent = `Saldo C/C ${data.settings.user1 || 'Utente 1'} (€)`;
    const l2 = $('lbl-set-cc2'); if (l2) l2.textContent = `Saldo C/C ${data.settings.user2 || 'Utente 2'} (€)`;
}

function saveImpostazioni() {
    DB.saveSettings({
        user1: $('set-user1').value.trim() || 'Tu',
        user2: $('set-user2').value.trim() || 'Lei',
        currency: $('set-currency').value || '€',
        ccUser1: parseFloat($('set-cc1')?.value) || 0,
        ccUser2: parseFloat($('set-cc2')?.value) || 0,
    });
    updateSidebarUsers();
    showToast('Impostazioni salvate!');
}

function updateSidebarUsers() {
    const data = DB.loadData();
    const u1 = $('sidebar-user1');
    const u2 = $('sidebar-user2');
    if (u1) { u1.textContent = data.settings.user1[0]?.toUpperCase() || 'T'; u1.title = data.settings.user1; }
    if (u2) { u2.textContent = data.settings.user2[0]?.toUpperCase() || 'L'; u2.title = data.settings.user2; }
    const lbl = $('sidebar-users-label');
    if (lbl) lbl.textContent = `${data.settings.user1} & ${data.settings.user2}`;
}

// Aggiorna entrambi i badge Firebase (sidebar + settings)
function syncFirebaseBadges(connected) {
    const cls = `file-badge ${connected ? 'connected' : 'disconnected'}`;
    const txt = connected ? '● Online' : '○ Offline';
    const b1 = $('fb-status-badge'), b2 = $('fb-status-badge-settings');
    if (b1) { b1.className = cls; b1.textContent = txt; }
    if (b2) { b2.className = cls; b2.textContent = txt; }
}

// ── Utility ──────────────────────────────────────────────────
function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function catBadge(cat) {
    const map = {
        'Mutuo': 'badge-pink',
        'Bollette': 'badge-indigo',
        'Abbonamenti': 'badge-orange',
        'Finanziamenti': 'badge-green',
        'Spesa': 'badge-indigo',
        'Stipendio': 'badge-green',
        'Freelance': 'badge-orange',
        'Altro': 'badge-gray',
    };
    return map[cat] || 'badge-gray';
}

function entBadge(tipo) {
    const map = {
        'Stipendio': 'badge-green',
        'Freelance': 'badge-orange',
        'Affitto percepito': 'badge-indigo',
        'Altro': 'badge-gray',
    };
    return map[tipo] || 'badge-gray';
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Nav clicks
    document.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', () => {
            navigate(el.dataset.page);
            // chiudi sidebar su mobile
            const sb = document.querySelector('.sidebar');
            const bd = document.querySelector('.sidebar-backdrop');
            sb.classList.remove('open');
            bd.classList.remove('open');
        });
    });

    // Mobile hamburger
    const ham = $('hamburger');
    const sb = document.querySelector('.sidebar');
    const bd = document.querySelector('.sidebar-backdrop');
    if (ham) {
        ham.addEventListener('click', () => {
            sb.classList.toggle('open');
            bd.classList.toggle('open');
        });
    }
    if (bd) bd.addEventListener('click', () => { sb.classList.remove('open'); bd.classList.remove('open'); });

    // Costi Fissi
    $('cf-add-btn')?.addEventListener('click', () => {
        cfEditId = null;
        $('cf-modal-title').textContent = 'Nuovo Costo Fisso';
        $('cf-form').reset();
        openModal('cf-modal');
    });
    $('cf-save-btn')?.addEventListener('click', cfSave);
    $('cf-cancel-btn')?.addEventListener('click', () => { closeModal('cf-modal'); cfEditId = null; });
    $('cf-search')?.addEventListener('input', renderCostiFissi);
    $('cf-filter')?.addEventListener('change', renderCostiFissi);

    // Finanziamenti
    $('fin-add-btn')?.addEventListener('click', () => {
        finEditId = null;
        $('fin-modal-title').textContent = 'Nuovo Finanziamento';
        $('fin-form').reset();
        openModal('fin-modal');
    });
    $('fin-save-btn')?.addEventListener('click', finSave);
    $('fin-cancel-btn')?.addEventListener('click', () => { closeModal('fin-modal'); finEditId = null; });
    $('fin-search')?.addEventListener('input', renderFinanziamenti);

    // Entrate
    $('ent-add-btn')?.addEventListener('click', () => {
        entEditId = null;
        $('ent-modal-title').textContent = 'Nuova Entrata';
        $('ent-form').reset();
        renderEntrate(); // init persona options
        const ep = $('ent-persona'); if (ep) ep.value = getCurrentUser();
        openModal('ent-modal');
    });
    $('ent-save-btn')?.addEventListener('click', entSave);
    $('ent-cancel-btn')?.addEventListener('click', () => { closeModal('ent-modal'); entEditId = null; });

    // Transazioni
    $('tx-add-btn')?.addEventListener('click', () => {
        txEditId = null;
        $('tx-modal-title').textContent = 'Nuova Transazione';
        $('tx-form').reset();
        $('tx-data').value = new Date().toISOString().slice(0, 10);
        renderTransazioni(); // init persona
        const tp = $('tx-persona'); if (tp) tp.value = getCurrentUser();
        openModal('tx-modal');
    });
    $('tx-save-btn')?.addEventListener('click', txSave);
    $('tx-cancel-btn')?.addEventListener('click', () => { closeModal('tx-modal'); txEditId = null; });
    $('tx-search')?.addEventListener('input', renderTransazioni);
    $('tx-filter-tipo')?.addEventListener('change', renderTransazioni);
    $('tx-filter-mese')?.addEventListener('change', renderTransazioni);
    $('tx-export-csv')?.addEventListener('click', exportCSV);
    $('tx-import-excel-btn')?.addEventListener('click', () => $('tx-import-excel-file').click());
    $('tx-import-excel-file')?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) { importExcel(file); e.target.value = ''; }
    });
    // New transaction buttons
    $('tx-group-btn')?.addEventListener('click', () => {
        txGroupMode = !txGroupMode;
        $('tx-group-btn').classList.toggle('active', txGroupMode);
        renderTransazioni();
    });
    $('tx-select-all')?.addEventListener('change', e => {
        if (e.target.checked) {
            // Seleziona TUTTE le transazioni nel database
            DB.getAll('transazioni').forEach(t => txSelected.add(t.id));
            document.querySelectorAll('.tx-chk').forEach(cb => { cb.checked = true; });
        } else {
            txSelected.clear();
            document.querySelectorAll('.tx-chk').forEach(cb => { cb.checked = false; });
        }
        txUpdateBulkBar();
    });
    $('tx-delete-selected-btn')?.addEventListener('click', txDeleteSelected);
    $('tx-delete-all-btn')?.addEventListener('click', () => {
        const all = DB.getAll('transazioni');
        if (all.length === 0) { showToast('Nessuna transazione da eliminare', 'error'); return; }
        if (!confirm(`Eliminare TUTTE le ${all.length} transazioni? Questa azione non è reversibile.`)) return;
        all.forEach(t => DB.deleteItem('transazioni', t.id));
        txSelected.clear();
        showToast(`Tutte le transazioni eliminate`);
        renderTransazioni();
    });


    // Impostazioni
    $('set-save-btn')?.addEventListener('click', saveImpostazioni);
    $('set-export-btn')?.addEventListener('click', () => { DB.exportJSON(); showToast('Dati esportati!'); });
    $('set-import-file')?.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            await DB.importJSON(file);
            showToast('Dati importati con successo!');
            navigate(currentPage);
            updateSidebarUsers();
        } catch {
            showToast('Errore durante l\'importazione', 'error');
        }
        e.target.value = '';
    });
    $('set-reset-btn')?.addEventListener('click', () => {
        if (!confirm('Sei sicuro? Tutti i dati verranno eliminati definitivamente!')) return;
        DB.resetData();
        showToast('Dati azzerati');
        navigate('dashboard');
        updateSidebarUsers();
    });

    // ── Firebase realtime listener ────────────────────────────
    DB.startRealtimeListener((newData) => {
        // Dati aggiornati da Firebase (es. l'altra persona ha fatto una modifica)
        syncFirebaseBadges(true);
        updateSidebarUsers();
        navigate(currentPage); // ri-renderizza la pagina corrente con i nuovi dati
    });

    // Sidebar users update
    updateSidebarUsers();
    initCurrentUserUI();

    // Default page
    navigate('dashboard');

    // months filter now populated dynamically inside renderTransazioni()
});
