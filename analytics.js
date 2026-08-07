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

/* ── Payment Method breakdown (this month) ── */
function updatePaymentBreakdown() {
  const el = document.getElementById('paymentBreakdown');
  if (!el) return;

  const now = new Date();
  const monthExp = expenses.filter(e => {
    const d = parseDate(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const tagged = monthExp.filter(e => e.paymentMethod);

  if (!tagged.length) {
    el.innerHTML = '<div style="font-size:12px; color:var(--text2); text-align:center; padding:20px">Tag a payment method on your expenses to see this breakdown</div>';
    return;
  }

  const totals = {};
  tagged.forEach(e => { totals[e.paymentMethod] = (totals[e.paymentMethod] || 0) + e.amount; });
  const total = tagged.reduce((s, e) => s + e.amount, 0);
  const max   = Math.max(...Object.values(totals));

  el.innerHTML = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([method, amt]) => {
    const pct  = Math.round((amt / max) * 100);
    const info = PAYMENT_METHODS[method] || { emoji: '💰', color: '#94a3b8' };
    return `
      <div class="cat-budget-item">
        <div class="cat-budget-header">
          <span class="cat-budget-name">${info.emoji} ${method}</span>
          <span class="cat-budget-amount">${fmt(amt)} (${Math.round((amt / total) * 100)}%)</span>
        </div>
        <div class="cat-budget-bar"><div class="cat-budget-fill" style="width:${pct}%; background:${info.color}"></div></div>
      </div>`;
  }).join('');
}

/* ── Smart Insights (algorithmic, no AI call needed) ── */
function computeSmartInsights() {
  const insights = [];
  const now = new Date();
  const cats = getCategoryBreakdown(expenses);

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevCats = {};
  expenses.forEach(e => {
    const d = parseDate(e.date);
    if (d.getFullYear() === prevMonthDate.getFullYear() && d.getMonth() === prevMonthDate.getMonth()) {
      prevCats[e.category] = (prevCats[e.category] || 0) + e.amount;
    }
  });

  // Biggest category increase vs last month
  let increase = null;
  Object.keys(cats).forEach(cat => {
    const prev = prevCats[cat] || 0;
    if (prev > 200) {
      const pct = Math.round(((cats[cat] - prev) / prev) * 100);
      if (pct > 20 && (!increase || pct > increase.pct)) increase = { cat, pct };
    }
  });
  if (increase) {
    insights.push({ icon: CAT[increase.cat]?.emoji || '📈', type: 'warn', text: `${increase.cat} spending is up ${increase.pct}% vs last month` });
  }

  // Biggest category decrease vs last month
  let decrease = null;
  Object.keys(prevCats).forEach(cat => {
    const cur = cats[cat] || 0;
    const prev = prevCats[cat];
    if (prev > 200) {
      const pct = Math.round(((cur - prev) / prev) * 100);
      if (pct < -20 && (!decrease || pct < decrease.pct)) decrease = { cat, pct };
    }
  });
  if (decrease) {
    insights.push({ icon: CAT[decrease.cat]?.emoji || '📉', type: 'good', text: `${decrease.cat} spending is down ${Math.abs(decrease.pct)}% vs last month — nice` });
  }

  // Weekend vs weekday habits
  const wv = getWeekendVsWeekday(expenses);
  if (wv.hasWeekend && wv.hasWeekday && wv.wdayAvg > 0) {
    const diffPct = Math.round(((wv.wendAvg - wv.wdayAvg) / wv.wdayAvg) * 100);
    if (Math.abs(diffPct) > 20) {
      insights.push({
        icon: '📅',
        type: diffPct > 0 ? 'warn' : 'neutral',
        text: diffPct > 0
          ? `You spend ${diffPct}% more on weekends than weekdays, on average`
          : `You spend ${Math.abs(diffPct)}% less on weekends than weekdays — disciplined`,
      });
    }
  }

  // Category concentration
  const monthly = getMonthlyTotal(expenses);
  const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
  if (topCat && monthly > 0) {
    const share = Math.round((topCat[1] / monthly) * 100);
    if (share > 35) {
      insights.push({ icon: CAT[topCat[0]]?.emoji || '🏆', type: 'neutral', text: `${topCat[0]} alone makes up ${share}% of this month's spending` });
    }
  }

  // Savings rate (only if income is tracked)
  const income = getMonthlyIncome(incomes);
  if (income > 0) {
    const rate = Math.round(((income - monthly) / income) * 100);
    insights.push({
      icon: rate >= 20 ? '💪' : rate >= 0 ? '⚖️' : '🚨',
      type: rate >= 20 ? 'good' : rate >= 0 ? 'neutral' : 'warn',
      text: rate >= 0 ? `You're saving ${rate}% of your income this month` : `You're spending ${Math.abs(rate)}% more than you earned this month`,
    });
  }

  return insights.slice(0, 5);
}

function renderSmartInsights() {
  const el = document.getElementById('smartInsights');
  if (!el) return;
  const insights = computeSmartInsights();

  if (!insights.length) {
    el.innerHTML = '<div style="font-size:12px; color:var(--text2); text-align:center; padding:20px">Keep tracking — patterns will show up here once there\'s enough data</div>';
    return;
  }

  el.innerHTML = insights.map(i => `
    <div class="insight-card insight-${i.type}">
      <span class="insight-icon">${i.icon}</span>
      <span class="insight-text">${i.text}</span>
    </div>`).join('');
}

/* ── Cash Flow (income vs expense) ── */
function updateCashflowStats() {
  const el = document.getElementById('cashflowStats');
  if (!el) return;

  const income = getMonthlyIncome(incomes);
  const spent  = getMonthlyTotal(expenses);
  const net    = income - spent;
  const rate   = income > 0 ? Math.round((net / income) * 100) : null;
  const netColor = net >= 0 ? 'var(--green)' : 'var(--red)';

  el.innerHTML = `
    <div class="report-items">
      <div class="report-item"><span class="report-key">Income this month</span><span class="report-val" style="color:var(--green)">${fmt(income)}</span></div>
      <div class="report-item"><span class="report-key">Expenses this month</span><span class="report-val" style="color:var(--red)">${fmt(spent)}</span></div>
      <div class="report-item"><span class="report-key">Net</span><span class="report-val" style="color:${netColor}">${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}</span></div>
      <div class="report-item"><span class="report-key">Savings rate</span><span class="report-val" style="color:${rate === null ? 'var(--text)' : rate >= 20 ? 'var(--green)' : rate >= 0 ? 'var(--yellow)' : 'var(--red)'}">${rate === null ? '—' : rate + '%'}</span></div>
    </div>`;
}

/* ── Weekly Recap (shareable) ── */
function getWeekExpenses(arr) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6); cutoff.setHours(0, 0, 0, 0);
  return arr.filter(e => parseDate(e.date) >= cutoff);
}

function getPrevWeekTotal(arr) {
  const end = new Date(); end.setDate(end.getDate() - 7);  end.setHours(23, 59, 59, 999);
  const start = new Date(); start.setDate(start.getDate() - 13); start.setHours(0, 0, 0, 0);
  return arr.filter(e => { const d = parseDate(e.date); return d >= start && d <= end; })
             .reduce((s, e) => s + e.amount, 0);
}

function weekRecapData() {
  const weekExp  = getWeekExpenses(expenses);
  const total    = weekExp.reduce((s, e) => s + e.amount, 0);
  const prev     = getPrevWeekTotal(expenses);
  const delta    = prev > 0 ? Math.round(((total - prev) / prev) * 100) : null;
  const cats     = {};
  weekExp.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
  const topCat   = Object.entries(cats).sort((a, b) => b[1] - a[1])[0] || null;
  const streak   = getSpendingStreak(expenses);
  return { weekExp, total, delta, topCat, streak };
}

function recapVerdict({ total, delta }) {
  if (delta === null) return "First week on record — let's build a baseline.";
  if (delta > 15)  return savageMode ? `📈 Up ${delta}% from last week. Living your best (broke) life.` : `📈 Spending is up ${delta}% from last week.`;
  if (delta < -15) return savageMode ? `📉 Down ${Math.abs(delta)}%. Look at you, being responsible.`   : `📉 Nice — spending is down ${Math.abs(delta)}% from last week.`;
  return 'Pretty steady week, spending-wise.';
}

function renderWeeklyRecap() {
  const el = document.getElementById('weeklyRecap');
  if (!el) return;
  const data = weekRecapData();

  if (!data.weekExp.length) {
    el.innerHTML = '<div style="font-size:12px; color:var(--text2); text-align:center; padding:20px">Log a few expenses this week to unlock your recap</div>';
    return;
  }

  el.innerHTML = `
    <div class="recap-card">
      <div class="recap-week-label">This Week</div>
      <div class="recap-total">${fmt(data.total)}</div>
      <div class="recap-verdict">${recapVerdict(data)}</div>
      <div class="recap-stats">
        <div class="recap-stat"><span class="recap-stat-label">Top category</span><span class="recap-stat-val">${data.topCat ? CAT[data.topCat[0]].emoji + ' ' + data.topCat[0] : '—'}</span></div>
        <div class="recap-stat"><span class="recap-stat-label">Streak</span><span class="recap-stat-val">${data.streak} days</span></div>
        <div class="recap-stat"><span class="recap-stat-label">Entries</span><span class="recap-stat-val">${data.weekExp.length}</span></div>
      </div>
    </div>`;

  if (typeof initTiltCards === 'function') initTiltCards();
}

function downloadRecapImage() {
  const data = weekRecapData();
  if (!data.weekExp.length) { showToast('⚠️ Nothing to recap yet this week', 'error'); return; }

  const W = 800, H = 1000;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0e0e1c');
  bg.addColorStop(1, '#1a1440');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  };
  glow(90, 90, 260, 'rgba(108,99,255,0.35)');
  glow(W - 70, H - 110, 240, 'rgba(0,229,160,0.25)');

  ctx.textAlign = 'center';
  ctx.fillStyle = '#9090b0';
  ctx.font = '600 22px sans-serif';
  ctx.fillText('SPENDSENSE · WEEKLY RECAP', W / 2, 100);

  ctx.fillStyle = '#f0f0ff';
  ctx.font = '800 88px sans-serif';
  ctx.fillText(fmt(data.total), W / 2, 260);

  ctx.fillStyle = '#a78bfa';
  ctx.font = '500 26px sans-serif';
  const deltaText = data.delta === null ? 'First week tracked'
    : data.delta > 0 ? `▲ ${data.delta}% vs last week`
    : data.delta < 0 ? `▼ ${Math.abs(data.delta)}% vs last week`
    : 'Same as last week';
  ctx.fillText(deltaText, W / 2, 310);

  const stats = [
    ['Top category',       data.topCat ? `${CAT[data.topCat[0]].emoji} ${data.topCat[0]}` : '—'],
    ['Tracking streak',    `${data.streak} days`],
    ['Entries this week',  `${data.weekExp.length}`],
  ];
  let y = 440;
  stats.forEach(([label, val]) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6e6e90';
    ctx.font = '500 24px sans-serif';
    ctx.fillText(label.toUpperCase(), 80, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f0f0ff';
    ctx.font = '700 28px sans-serif';
    ctx.fillText(val, W - 80, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(80, y + 26); ctx.lineTo(W - 80, y + 26); ctx.stroke();
    y += 90;
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#6e6e90';
  ctx.font = '500 20px sans-serif';
  ctx.fillText('💸 SpendSense', W / 2, H - 60);

  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url, download: `spendsense_recap_${todayStr()}.png`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📸 Recap card downloaded!', 'success');
  });
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