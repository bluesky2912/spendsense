/* ============================================================
   analytics.js — SpendSense Premium AI
   Month-over-month comparison, category budget bars,
   monthly report card, no-spend challenge grid.
   ============================================================ */

/* ── Month-over-Month ── */
function updateMoM() {
  const el     = document.getElementById('momBars');
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push({
      key:   monthKey(d),
      label: monthLabel(monthKey(d)),
      total: getMonthlyTotal(expenses, d),
    });
  }

  const hasData = months.some(m => m.total > 0);
  if (!hasData) {
    el.innerHTML = '<div style="font-size:12px; color:var(--text2); text-align:center; padding:20px">Add expenses across multiple months to see comparisons</div>';
    return;
  }

  const max = Math.max(...months.map(m => m.total), 1);
  let html   = '';

  for (let i = 0; i < months.length; i++) {
    const m    = months[i];
    const prev = months[i - 1];
    const pct  = Math.round((m.total / max) * 100);
    const delta = prev && prev.total > 0
      ? Math.round(((m.total - prev.total) / prev.total) * 100)
      : null;

    const color     = delta === null ? 'var(--accent)' : delta > 0 ? 'var(--red)' : delta < 0 ? 'var(--green)' : 'var(--accent)';
    const deltaStr  = delta === null ? '' : delta > 0 ? `▲ ${delta}%` : `▼ ${Math.abs(delta)}%`;

    html += `
      <div class="mom-bar-item">
        <div class="mom-label">${m.label}</div>
        <div class="mom-bar">
          <div class="mom-fill" style="width:${pct}%; background:${color}"></div>
        </div>
        <div class="mom-val" style="color:${color}">
          ${m.total ? fmtShort(m.total) : '—'}
          <span style="font-size:9px; color:var(--text2)">${deltaStr}</span>
        </div>
      </div>`;
  }

  el.innerHTML = html;
}

/* ── Category Budget Inputs ── */
function renderCatBudgetInputs() {
  const el = document.getElementById('catBudgetInputs');
  el.innerHTML = Object.keys(CAT).map(cat => `
    <div>
      <label class="field-label">${CAT[cat].emoji} ${cat}</label>
      <input type="number" class="field-input" style="font-size:13px; min-height:36px"
        id="cb_${cat}" value="${catBudgets[cat] || ''}" placeholder="No limit" />
    </div>`).join('');
}

function saveCatBudgets() {
  Object.keys(CAT).forEach(cat => {
    const v = parseFloat(document.getElementById('cb_' + cat)?.value);
    if (v > 0) catBudgets[cat] = v;
    else       delete catBudgets[cat];
  });
  Storage.saveCatBudgets(catBudgets);
  renderCatBudgetBars();
  showToast('💾 Category budgets saved!', 'success');
}

/* ── Category Budget Progress Bars ── */
function renderCatBudgetBars() {
  const el      = document.getElementById('catBudgetList');
  const cats    = getCategoryBreakdown(expenses);
  const tracked = Object.keys(catBudgets);

  if (!tracked.length) {
    el.innerHTML = '<div style="font-size:12px; color:var(--text2)">No category limits set above</div>';
    return;
  }

  el.innerHTML = tracked.map(cat => {
    const spent = cats[cat] || 0;
    const limit = catBudgets[cat];
    const pct   = Math.min(100, Math.round((spent / limit) * 100));
    const color = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--orange)' : 'var(--accent)';

    return `
      <div class="cat-budget-item">
        <div class="cat-budget-header">
          <span class="cat-budget-name">${CAT[cat]?.emoji || ''} ${cat}</span>
          <span class="cat-budget-amount">${fmt(spent)} / ${fmt(limit)}</span>
        </div>
        <div class="cat-budget-bar">
          <div class="cat-budget-fill" style="width:${pct}%; background:${color}"></div>
        </div>
      </div>`;
  }).join('');
}

/* ── Monthly Report Card ── */
function updateReportCard() {
  const el = document.getElementById('reportCard');
  if (!expenses.length) {
    el.innerHTML = '<div style="font-size:12px; color:var(--text2); text-align:center; padding:20px">Add expenses to generate your report card</div>';
    return;
  }

  const monthly    = getMonthlyTotal(expenses);
  const budgetPct  = budget.monthly ? (monthly / budget.monthly) * 100 : 50;
  const streak     = getSpendingStreak(expenses);
  const avg        = getAvgDailySpend(expenses);
  const cats       = getCategoryBreakdown(expenses);
  const random     = cats['Random'] || 0;

  let score = 100;
  if      (budgetPct > 100) score -= 30;
  else if (budgetPct > 80)  score -= 15;
  else if (budgetPct > 60)  score -= 5;
  if (streak < 3)            score -= 10;
  if (random > monthly * 0.2) score -= 10;

  const grade      = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D';
  const gradeClass = { A: 'grade-A', B: 'grade-B', C: 'grade-C', D: 'grade-D' }[grade];

  const budgetColor = budgetPct > 100 ? 'var(--red)' : budgetPct > 80 ? 'var(--orange)' : 'var(--green)';

  el.innerHTML = `
    <div class="report-grade ${gradeClass}">${grade}</div>
    <div style="text-align:center; font-size:12px; color:var(--text2); margin-bottom:10px">Score: ${score}/100</div>
    <div class="report-items">
      <div class="report-item"><span class="report-key">Monthly spend</span><span class="report-val">${fmt(monthly)}</span></div>
      <div class="report-item"><span class="report-key">Budget usage</span><span class="report-val" style="color:${budgetColor}">${Math.round(budgetPct)}%</span></div>
      <div class="report-item"><span class="report-key">Tracking streak</span><span class="report-val">${streak} days</span></div>
      <div class="report-item"><span class="report-key">Avg daily spend</span><span class="report-val">${fmt(Math.round(avg))}</span></div>
      <div class="report-item"><span class="report-key">Random spending</span><span class="report-val">${fmt(random)}</span></div>
    </div>`;
}

/* ── No-Spend Challenge ── */
function updateNoSpendChallenge() {
  const now    = new Date();
  const dim    = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dates  = new Set(expenses.map(e => e.date));

  let noSpendDays = 0, spentDays = 0;
  let html = '';

  for (let i = 1; i <= Math.min(dim, 28); i++) {
    const d       = new Date(now.getFullYear(), now.getMonth(), i);
    const k       = dateKey(d);
    const isToday = k === todayStr();
    const isFuture = d > now;

    let cls = 'challenge-day future';
    if (!isFuture) {
      if (dates.has(k)) { cls = 'challenge-day spent';    spentDays++;   }
      else              { cls = 'challenge-day no-spend';  noSpendDays++; }
    }
    if (isToday) cls += ' today';

    html += `<div class="${cls}" title="${k}">${i}</div>`;
  }

  document.getElementById('challengeGrid').innerHTML = html;
  document.getElementById('challengeMeta').textContent =
    `${noSpendDays} zero-spend days • ${spentDays} days with expenses`;

  const streak = getNoSpendStreak(expenses);
  document.getElementById('noSpendStreak').textContent = streak > 0
    ? `🌿 Current no-spend streak: ${streak} day${streak !== 1 ? 's' : ''}! Keep it up!`
    : 'Log zero-spend days to build your streak';
}
