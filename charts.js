/* ============================================================
   components/charts.js
   Initialises and re-renders the Chart.js bar + doughnut charts.
   Reads from global `expenses` and `CAT`.
   ============================================================ */

/* Module-level chart instances so we can destroy before redraw */
let barChart = null;
let pieChart = null;

/* ── Shared Chart.js theme ─────────────────────────────────── */
const CHART_THEME = {
  tooltip: {
    backgroundColor: '#111118',
    borderColor: '#ffffff18',
    borderWidth: 1,
    titleColor: '#8b8ba0',
    bodyColor: '#f0f0ff',
  },
  tickFont: { family: 'JetBrains Mono', size: 11 },
  gridColor: '#ffffff08',
  tickColor: '#5a5a72',
};

/* ── Bar Chart — daily spending ────────────────────────────── */

/**
 * Render (or re-render) the bar chart showing the last 7 days of spend.
 */
function renderBarChart() {
  const daily  = getDailyLast7(expenses);
  const barCtx = document.getElementById('barChart').getContext('2d');

  if (barChart) barChart.destroy();

  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: daily.map(d => d.label),
      datasets: [{
        data:            daily.map(d => d.total),
        backgroundColor: daily.map(d => d.total > 0 ? '#7c6aff40' : '#ffffff08'),
        borderColor:     daily.map(d => d.total > 0 ? '#7c6aff'   : '#ffffff15'),
        borderWidth:     1,
        borderRadius:    6,
        borderSkipped:   false,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...CHART_THEME.tooltip,
          callbacks: {
            label: ctx => fmt(ctx.raw),
          },
        },
      },
      scales: {
        x: {
          grid:  { color: CHART_THEME.gridColor },
          ticks: { color: CHART_THEME.tickColor, font: CHART_THEME.tickFont },
        },
        y: {
          grid:  { color: CHART_THEME.gridColor },
          ticks: {
            color: CHART_THEME.tickColor,
            font:  CHART_THEME.tickFont,
            callback: v =>
              v === 0 ? '₹0' : '₹' + (v >= 1000 ? Math.round(v / 1000) + 'k' : v),
          },
        },
      },
    },
  });
}

/* ── Doughnut Chart — category breakdown ───────────────────── */

/**
 * Render (or re-render) the doughnut chart for category spend split.
 */
function renderPieChart() {
  const cats    = getCategoryBreakdown(expenses);
  const pieCtx  = document.getElementById('pieChart').getContext('2d');

  if (pieChart) pieChart.destroy();

  const catEntries = Object.entries(cats);

  /* Empty-state placeholder doughnut */
  if (catEntries.length === 0) {
    pieChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: ['No data'],
        datasets: [{
          data:            [1],
          backgroundColor: ['#1c1c28'],
          borderColor:     ['#ffffff10'],
          borderWidth:     1,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend:  { display: false },
          tooltip: { enabled: false },
        },
        cutout: '65%',
      },
    });
    return;
  }

  const totalSpend = catEntries.reduce((s, [, v]) => s + v, 0);

  pieChart = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: catEntries.map(([k]) => `${CAT[k]?.emoji || ''} ${k}`),
      datasets: [{
        data:            catEntries.map(([, v]) => v),
        backgroundColor: catEntries.map(([k]) => (CAT[k]?.color || '#94a3b8') + '50'),
        borderColor:     catEntries.map(([k]) =>  CAT[k]?.color || '#94a3b8'),
        borderWidth:     2,
        hoverOffset:     8,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display:  true,
          position: 'right',
          labels: {
            color:    '#8b8ba0',
            font:     { family: 'JetBrains Mono', size: 10 },
            boxWidth: 10,
            padding:  10,
          },
        },
        tooltip: {
          ...CHART_THEME.tooltip,
          callbacks: {
            label: ctx =>
              ` ${fmt(ctx.raw)} (${Math.round((ctx.raw / totalSpend) * 100)}%)`,
          },
        },
      },
      cutout: '60%',
    },
  });
}

/* ── Public API ────────────────────────────────────────────── */

/**
 * Re-render both charts. Called from app.js `update()`.
 */
function renderCharts() {
  renderBarChart();
  renderPieChart();
}
