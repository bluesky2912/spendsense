/* ============================================================
   dashboard.js — SpendSense Premium AI
   Hero amount, stat pills, budget ring, streak, insights ticker,
   heatmap, spending forecast, anomaly alert.
   ============================================================ */

/* ── Hero ── */
function updateHero() {
  const monthly = getMonthlyTotal(expenses);
  document.getElementById('heroAmount').textContent = fmt(monthly);

  const real = budget.monthly ? (monthly / budget.monthly) * 100 : 0;
  const pct  = Math.min(real, 100);

  // SVG ring: circumference = 2π×85 ≈ 534
  const ring   = document.getElementById('ringFill');
  const pctTxt = document.getElementById('ringPct');
  ring.style.strokeDashoffset = 534 - (pct / 100) * 534;
  pctTxt.textContent = Math.round(real) + '%';

  if      (real >= 100) ring.style.stroke = '#ff3860';
  else if (real >= 80)  ring.style.stroke = '#ff8c42';
  else if (real >= 60)  ring.style.stroke = '#ffd166';
  else                  ring.style.stroke = '#6c63ff';

  const meta = document.getElementById('heroMeta');
  if (!expenses.length) {
    meta.textContent = 'Start adding expenses below';
  } else if (real >= 100) {
    meta.textContent = savageMode
      ? `💀 ${fmt(monthly - budget.monthly)} over budget. You went FERAL.`
      : `🚨 ${fmt(monthly - budget.monthly)} over your monthly budget`;
  } else if (budget.monthly) {
    meta.textContent = `${fmt(budget.monthly - monthly)} remaining of ${fmt(budget.monthly)} budget`;
  } else {
    meta.textContent = `${expenses.length} expense${expenses.length !== 1 ? 's' : ''} tracked`;
  }
}

/* ── Stat Pills ── */
function updateStats() {
  const weekly  = getWeeklyTotal(expenses);
  const today   = getTodayTotal(expenses);
  const top     = getTopCategory(expenses);
  const monthly = getMonthlyTotal(expenses);
  const left    = budget.monthly ? Math.max(0, budget.monthly - monthly) : 0;

  document.getElementById('weeklyTotal').textContent = fmt(weekly);
  document.getElementById('todayTotal').textContent  = fmt(today);
  document.getElementById('totalCount').textContent  = `${expenses.length} entries total`;

  // Weekly delta
  const weekEl = document.getElementById('weeklyDelta');
  if (budget.weekly) {
    const pct = Math.round((weekly / budget.weekly) * 100);
    weekEl.textContent = `${pct}% of weekly budget`;
    weekEl.className   = 'stat-pill-delta ' + (pct > 90 ? 'down' : pct > 60 ? '' : 'up');
  } else {
    weekEl.textContent = 'No weekly budget set';
    weekEl.className   = 'stat-pill-delta';
  }

  // Top category
  if (top) {
    document.getElementById('topCatIcon').textContent   = CAT[top[0]]?.emoji || '🏆';
    document.getElementById('topCat').textContent       = top[0];
    document.getElementById('topCatAmount').textContent = fmt(top[1]) + ' spent';
  } else {
    document.getElementById('topCatIcon').textContent   = '🏆';
    document.getElementById('topCat').textContent       = '—';
    document.getElementById('topCatAmount').textContent = '—';
  }

  // Budget left
  document.getElementById('budgetLeft').textContent = budget.monthly ? fmt(left) : '—';
  const leftDelta = document.getElementById('budgetLeftDelta');
  if (budget.monthly && monthly > 0) {
    const now      = new Date();
    const daysLeft = Math.ceil(
      (new Date(now.getFullYear(), now.getMonth() + 1, 1) - now) / 86400000
    );
    leftDelta.textContent = `~${fmt(Math.round(left / Math.max(daysLeft, 1)))} per day left`;
    leftDelta.className   = 'stat-pill-delta' + (left <= 0 ? ' down' : ' up');
  } else {
    leftDelta.textContent = budget.monthly ? 'Set a budget first' : 'No budget set';
    leftDelta.className   = 'stat-pill-delta';
  }
}

/* ── Streak badge ── */
function updateStreak() {
  const streak = getSpendingStreak(expenses);
  document.getElementById('streakCount').textContent = streak;
  document.getElementById('streakBadge').style.opacity = streak > 0 ? '1' : '0.4';
}

/* ── Insights Ticker ── */
function updateInsights() {
  const inner = document.getElementById('tickerInner');
  if (!expenses.length) {
    inner.innerHTML = '<span class="ticker-chip">Add expenses to unlock insights</span><span class="ticker-chip">Add expenses to unlock insights</span>';
    return;
  }

  const chips   = [];
  const cats    = getCategoryBreakdown(expenses);
  const sorted  = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const monthly = getMonthlyTotal(expenses);
  const avg     = getAvgDailySpend(expenses);

  if (sorted[0]) {
    const [cat, amt] = sorted[0];
    chips.push(savageMode
      ? `${CAT[cat]?.emoji} You blew ${fmt(amt)} on ${cat} this month. Classic.`
      : `${CAT[cat]?.emoji} Top category: ${cat} — ${fmt(amt)} this month`);
  }

  const streak = getSpendingStreak(expenses);
  if (streak >= 3) chips.push(savageMode
    ? `🔥 ${streak}-day tracking streak. Consistent. Chaotically, but consistent.`
    : `🔥 ${streak}-day tracking streak — keep it up!`);

  const maxExp = getMaxExpense(expenses);
  if (maxExp) chips.push(`💸 Biggest single expense: ${fmt(maxExp.amount)} — "${escapeHtml(maxExp.name)}"`);

  if (avg > 0) chips.push(`📊 Average daily spend: ${fmt(Math.round(avg))}`);

  // Forecast insight
  const now = new Date();
  const day = now.getDate();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (monthly > 0) chips.push(`📡 Projected month-end: ${fmt(Math.round(monthly / day * dim))}`);

  if (budget.monthly && monthly > 0) {
    const p = Math.round((monthly / budget.monthly) * 100);
    if (p < 40) chips.push(savageMode
      ? `👀 Only ${p}% of budget used. Plot twist: you ARE financially stable?`
      : `✅ Great! Only ${p}% of monthly budget used so far`);
  }

  // Duplicate for seamless scroll loop
  const html = [...chips, ...chips].map(c => `<span class="ticker-chip">${c}</span>`).join('');
  inner.innerHTML = html;
  inner.style.animationDuration = Math.max(15, chips.length * 6) + 's';
}

/* ── Heatmap (last 30 days) ── */
function updateHeatmap() {
  const heatmap = document.getElementById('heatmap');
  const data    = getLast30Days(expenses);
  const amounts = data.map(d => d.total);
  const max     = Math.max(...amounts, 1);

  heatmap.innerHTML = data.map(({ date, total }) => {
    const level = total === 0 ? 0
                : total < max * 0.25 ? 1
                : total < max * 0.5  ? 2
                : total < max * 0.75 ? 3 : 4;
    const d     = parseDate(date);
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const tip   = total > 0 ? `${label}: ${fmt(total)}` : label;
    return `<div class="heat-cell" data-level="${level}" data-tip="${escapeHtml(tip)}" title="${escapeHtml(tip)}"></div>`;
  }).join('');
}

/* ── Spending Forecast ── */
function updateForecast() {
  const fb = document.getElementById('forecastBar');
  if (expenses.length < 3) { fb.style.display = 'none'; return; }

  const now        = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthly    = getMonthlyTotal(expenses);
  const projected  = Math.round((monthly / dayOfMonth) * daysInMonth);

  fb.style.display = 'flex';
  document.getElementById('forecastText').textContent = 'At current pace, you\'ll spend this month:';

  const fv = document.getElementById('forecastValue');
  fv.textContent = fmt(projected);
  if      (budget.monthly && projected > budget.monthly)       fv.style.color = 'var(--red)';
  else if (budget.monthly && projected > budget.monthly * 0.8) fv.style.color = 'var(--orange)';
  else                                                          fv.style.color = 'var(--yellow)';
}

/* ── Anomaly Alert ── */
function checkAnomaly() {
  const result = getAnomalyExpense(expenses);
  if (!result) return;

  const { expense: e, multiplier } = result;
  const el = document.getElementById('anomalyAlert');
  document.getElementById('anomalyText').textContent =
    `Unusually large expense: ${fmt(e.amount)} on "${escapeHtml(e.name)}" — that's ${multiplier}× your average spend`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 8000);
}

/* ── Smart auto-detect category ── */
function autoDetectCategory(val) {
  const hint = document.getElementById('autoDetectHint');
  if (!val || val.length < 3) { hint.textContent = ''; return; }
  const cat = detectCategory(val);
  if (cat) {
    hint.textContent = `✨ Auto-detected: ${CAT[cat].emoji} ${cat}`;
    selectCatByName(cat);
  } else {
    hint.textContent = '';
  }
}
