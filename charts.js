/* ============================================================
   charts.js — SpendSense Premium AI
   Bar (7-day), Doughnut (categories), and Line (6-month trend)
   charts with premium dark theme.
   ============================================================ */

let barChart   = null;
let pieChart   = null;
let trendChart = null;

const CHART_THEME = {
  tooltip: {
    backgroundColor: '#10101e',
    borderColor:     'rgba(108,99,255,0.3)',
    borderWidth:     1,
    titleColor:      '#6e6e90',
    bodyColor:       '#f0f0ff',
    padding:         12,
    cornerRadius:    10,
  },
  gridColor: 'rgba(255,255,255,0.04)',
  tickColor: '#6e6e90',
  tickFont:  { family: 'JetBrains Mono', size: 11 },
};

/* ── Bar Chart — last 7 days ── */
function renderBarChart() {
  const daily = getDailyLast7(expenses);
  const ctx   = document.getElementById('barChart').getContext('2d');
  const max   = Math.max(...daily.map(d => d.total), 1);
  const today = todayStr();

  if (barChart) { barChart.destroy(); barChart = null; }

  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(108,99,255,0.8)');
  gradient.addColorStop(1, 'rgba(108,99,255,0.1)');

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: daily.map(d => d.label),
      datasets: [{
        data: daily.map(d => d.total),
        backgroundColor: daily.map(d => {
          if (d.date === today)         return 'rgba(0,229,160,0.7)';
          if (d.total === max && max > 0) return 'rgba(255,107,157,0.7)';
          return d.total > 0 ? gradient : 'rgba(255,255,255,0.03)';
        }),
        borderColor: daily.map(d => {
          if (d.date === today)         return '#00e5a0';
          if (d.total === max && max > 0) return '#ff6b9d';
          return d.total > 0 ? 'rgba(108,99,255,0.8)' : 'rgba(255,255,255,0.06)';
        }),
        borderWidth:   2,
        borderRadius:  8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: {
        legend:  { display: false },
        tooltip: {
          ...CHART_THEME.tooltip,
          callbacks: {
            label: ctx => {
              const val = fmt(ctx.raw);
              return daily[ctx.dataIndex].date === today ? ` ${val} (today 🟢)` : ` ${val}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid:   { color: CHART_THEME.gridColor, drawBorder: false },
          ticks:  { color: CHART_THEME.tickColor, font: CHART_THEME.tickFont },
          border: { display: false },
        },
        y: {
          grid:   { color: CHART_THEME.gridColor, drawBorder: false },
          border: { display: false },
          ticks:  {
            color:    CHART_THEME.tickColor,
            font:     CHART_THEME.tickFont,
            callback: v => v === 0 ? '₹0' : fmtShort(v),
          },
        },
      },
    },
  });
}

/* ── Pie / Doughnut — category breakdown ── */
function renderPieChart() {
  const cats    = getCategoryBreakdown(expenses);
  const ctx     = document.getElementById('pieChart').getContext('2d');
  const entries = Object.entries(cats).sort((a, b) => b[1] - a[1]);

  if (pieChart) { pieChart.destroy(); pieChart = null; }

  if (!entries.length) {
    pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels:   ['No data'],
        datasets: [{ data: [1], backgroundColor: ['rgba(255,255,255,0.03)'], borderColor: ['rgba(255,255,255,0.06)'], borderWidth: 1 }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        cutout: '70%',
      },
    });
    return;
  }

  const total = entries.reduce((s, [, v]) => s + v, 0);

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels:   entries.map(([k]) => `${CAT[k]?.emoji || ''} ${k}`),
      datasets: [{
        data:                 entries.map(([, v]) => v),
        backgroundColor:      entries.map(([k]) => (CAT[k]?.color || '#94a3b8') + '33'),
        borderColor:          entries.map(([k]) =>  CAT[k]?.color || '#94a3b8'),
        hoverBackgroundColor: entries.map(([k]) => (CAT[k]?.color || '#94a3b8') + '66'),
        borderWidth: 2,
        hoverOffset: 12,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          display:  true,
          position: 'right',
          labels: {
            color:    '#9090b0',
            font:     { family: 'JetBrains Mono', size: 10 },
            boxWidth: 10,
            padding:  12,
            generateLabels: chart => {
              const ds = chart.data.datasets[0];
              return chart.data.labels.map((label, i) => ({
                text:        `${label}  ${Math.round((ds.data[i] / total) * 100)}%`,
                fillStyle:   ds.borderColor[i],
                strokeStyle: ds.borderColor[i],
                hidden:      false,
                index:       i,
              }));
            },
          },
        },
        tooltip: {
          ...CHART_THEME.tooltip,
          callbacks: {
            label: ctx => ` ${fmt(ctx.raw)}  (${Math.round((ctx.raw / total) * 100)}%)`,
          },
        },
      },
      cutout: '65%',
    },
  });
}

/* ── Trend Chart — last 6 months ── */
function renderTrendChart() {
  const ctx = document.getElementById('trendChart').getContext('2d');
  if (trendChart) { trendChart.destroy(); trendChart = null; }

  const months        = [];
  const monthlyTotals = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push(monthLabel(monthKey(d)));
    monthlyTotals.push(getMonthlyTotal(expenses, d));
  }

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels:   months,
      datasets: [{
        label:           'Monthly Spend',
        data:            monthlyTotals,
        borderColor:     '#6c63ff',
        backgroundColor: 'rgba(108,99,255,0.1)',
        borderWidth:     2,
        pointBackgroundColor: '#6c63ff',
        pointRadius:     5,
        tension:         0.3,
        fill:            true,
      }],
    },
    options: {
      responsive: true,
      animation:  { duration: 600 },
      plugins: {
        legend:  { display: false },
        tooltip: {
          ...CHART_THEME.tooltip,
          callbacks: { label: ctx => ` ${fmt(ctx.raw)}` },
        },
      },
      scales: {
        x: {
          grid:   { color: CHART_THEME.gridColor, drawBorder: false },
          ticks:  { color: CHART_THEME.tickColor, font: CHART_THEME.tickFont },
          border: { display: false },
        },
        y: {
          grid:   { color: CHART_THEME.gridColor, drawBorder: false },
          border: { display: false },
          ticks:  {
            color:    CHART_THEME.tickColor,
            font:     CHART_THEME.tickFont,
            callback: v => fmtShort(v),
          },
        },
      },
    },
  });
}

/* ── Render all three ── */
function renderCharts() {
  renderBarChart();
  renderPieChart();
  renderTrendChart();
}

/* ── Tab switcher for chart panel ── */
function switchChart(type, btn) {
  document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('chartBar').classList.toggle('hidden',   type !== 'bar');
  document.getElementById('chartPie').classList.toggle('hidden',   type !== 'pie');
  document.getElementById('chartTrend').classList.toggle('hidden', type !== 'trend');
}
