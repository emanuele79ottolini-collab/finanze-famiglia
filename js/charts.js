// ============================================================
//  charts.js — Gestione grafici con Chart.js
// ============================================================

let donutChart = null;
let barChart = null;

const PALETTE = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];

function renderDonutChart(canvasId) {
    const dist = DB.calcDistribuzioneCosti();
    const labels = Object.keys(dist);
    const values = Object.values(dist);

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (donutChart) { donutChart.destroy(); donutChart = null; }

    if (labels.length === 0) {
        ctx.parentElement.innerHTML = '<p class="chart-empty">Nessun dato da visualizzare</p>';
        return;
    }

    donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: PALETTE.slice(0, labels.length),
                borderColor: '#1e1b4b',
                borderWidth: 3,
                hoverOffset: 12,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#c7d2fe',
                        padding: 16,
                        font: { size: 13, family: 'Inter' },
                        boxWidth: 14,
                        borderRadius: 4,
                    },
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`,
                    },
                    backgroundColor: '#1e1b4b',
                    titleColor: '#e0e7ff',
                    bodyColor: '#c7d2fe',
                    borderColor: '#4f46e5',
                    borderWidth: 1,
                },
            },
        },
    });
}

function renderBarChart(canvasId) {
    const storico = DB.calcStorico6Mesi();
    const labels = storico.map(s => s.label);
    const entrate = storico.map(s => s.entrate);
    const uscite = storico.map(s => s.uscite);

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (barChart) { barChart.destroy(); barChart = null; }

    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Entrate',
                    data: entrate,
                    backgroundColor: 'rgba(99, 102, 241, 0.7)',
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    borderRadius: 8,
                },
                {
                    label: 'Uscite',
                    data: uscite,
                    backgroundColor: 'rgba(236, 72, 153, 0.65)',
                    borderColor: '#ec4899',
                    borderWidth: 2,
                    borderRadius: 8,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#c7d2fe',
                        font: { size: 13, family: 'Inter' },
                        boxWidth: 14,
                        borderRadius: 4,
                    },
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
                    },
                    backgroundColor: '#1e1b4b',
                    titleColor: '#e0e7ff',
                    bodyColor: '#c7d2fe',
                    borderColor: '#4f46e5',
                    borderWidth: 1,
                },
            },
            scales: {
                x: {
                    grid: { color: 'rgba(99,102,241,0.1)' },
                    ticks: { color: '#94a3b8', font: { family: 'Inter' } },
                },
                y: {
                    grid: { color: 'rgba(99,102,241,0.1)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Inter' },
                        callback: v => formatCurrency(v),
                    },
                },
            },
        },
    });
}

function formatCurrency(v) {
    const data = DB.loadData();
    return `${data.settings.currency}${Number(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

window.Charts = { renderDonutChart, renderBarChart };
