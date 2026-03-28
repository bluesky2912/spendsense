/* ============================================================
   components/dashboard.js
   Renders: stat cards, budget progress bar, insight chips.
   Reads from global `expenses`, `budget`, `savageMode`.
   ============================================================ */

/* ── Category config (emoji + colors) ─────────────────────── */
const CAT = {
  Food:          { emoji: '🍔', color: '#f97316', bg: '#f9731620' },
  Transport:     { emoji: '🚗', color: '#3b82f6', bg: '#3b82f620' },
  Shopping:      { emoji: '🛍', color: '#a855f7', bg: '#a855f720' },
  Entertainment: { emoji: '🎬', color: '#ec4899', bg: '#ec489920' },
  Health:        { emoji: '💊', color: '#22d3a5', bg: '#22d3a520' },
  Bills:         { emoji: '💡', color: '#fbbf24', bg: '#fbbf2420' },
  Education:     { emoji: '📚', color: '#60a5fa', bg: '#60a5fa20' },
  Travel:        { emoji: '✈️', color: '#34d399', bg: '#34d39920' },
  Random:        { emoji: '🎲', color: '#f43f5e', bg: '#f43f5e20' },
  Other:         { emoji: '📌', color: '#94a3b8', bg: '#94a3b820' },
};

/* ── Savage mode roast lines ───────────────────────────────── */
const SAVAGE_LINES = {
  Food: [
    "You stress-eating or just living your best fried life? 🍟",
    "Bro that's not food money, that's therapy for your taste buds 😭",
    "Gordon Ramsay could feed a village with what you spent. Disgusting.",
  ],
  Shopping: [
    "Sir this is not a shopping spree, this is a cry for help. 🛍️💀",
    "Amazon should name a warehouse after you at this rate.",
    "Your wallet just filed for emotional distress.",
  ],
  Entertainment: [
    "You don't *watch* content, you *fund* it. There's a difference.",
    "Netflix, Prime, Disney+ AND going out? Humble yourself.",
    "Entertainment budget: ∞. Savings account: 🦗",
  ],
  Random: [
    "₹ on 'Random'? Your therapist would have a field day 💀",
    "Chaotic spending detected. Financial discipline has LEFT THE CHAT.",
    "Random charges: the silent killer of every budget ever made.",
  ],
  Transport: [
    "You do know buses exist right? Just checking.",
    "Uber charges and we're just... not going to talk about it?",
    "At this rate you could've bought a bicycle in February.",
  ],
  default: [
    "Budget exceeded. Your ancestors are disappointed 👴",
    "Financial discipline has left the chat. 💀",
    "This is not a budget, this is a suggestion that you ignored.",
  ],
};

/**
 * Pick a random savage line for a given category.
 * @param {string} category
 * @returns {string}
 */
function getSavageLine(category) {
  const lines = SAVAGE_LINES[category] || SAVAGE_LINES.default;
  return lines[Math.floor(Math.random() * lines.length)];
}

/* ── Stat Cards ────────────────────────────────────────────── */

/**
 * Refresh all four stat cards at the top of the dashboard.
 */
function updateStats() {
  const weekly  = getWeeklyTotal(expenses);
  const monthly = getMonthlyTotal(expenses);
  const today   = getTodayTotal(expenses);
  const top     = getTopCategory(expenses);

  document.getElementById('weeklyTotal').textContent  = fmt(weekly);
  document.getElementById('monthlyTotal').textContent = fmt(monthly);
  document.getElementById('totalCount').textContent   = expenses.length;
  document.getElementById('todaySpend').textContent   = `Today: ${fmt(today)}`;

  const weekPct = budget.weekly
    ? Math.round((weekly / budget.weekly) * 100)
    : 0;

  const weekDeltaEl = document.getElementById('weeklyDelta');
  weekDeltaEl.textContent  = budget.weekly ? `${weekPct}% of weekly budget` : '—';
  weekDeltaEl.className    = 'stat-delta ' + (weekPct > 90 ? 'down' : weekPct > 60 ? '' : 'up');

  if (top) {
    document.getElementById('topCat').textContent       = `${CAT[top[0]]?.emoji || '📌'} ${top[0]}`;
    document.getElementById('topCatAmount').textContent = fmt(top[1]);
  } else {
    document.getElementById('topCat').textContent       = '—';
    document.getElementById('topCatAmount').textContent = '—';
  }
}

/* ── Budget Progress Bar ───────────────────────────────────── */

/**
 * Refresh the budget progress bar and warning message.
 */
function updateBudget() {
  const monthly = getMonthlyTotal(expenses);
  const real    = budget.monthly ? (monthly / budget.monthly) * 100 : 0;
  const pct     = Math.min(real, 100);

  document.getElementById('budgetPct').textContent = budget.monthly
    ? `${fmt(monthly)} / ${fmt(budget.monthly)} (${Math.round(real)}%)`
    : 'No budget set';

  const fill = document.getElementById('budgetFill');
  fill.style.width = pct + '%';
  fill.className   = 'budget-fill';
  if      (real >= 100) fill.classList.add('over');
  else if (real >= 80)  fill.classList.add('danger');
  else if (real >= 60)  fill.classList.add('warning');

  const warn = document.getElementById('budgetWarning');
  warn.className = 'budget-warning';

  if (real >= 100) {
    warn.className   = 'budget-warning show danger';
    warn.textContent = savageMode
      ? `💀 Budget DEMOLISHED. You spent ${fmt(monthly - budget.monthly)} extra. Gg no re.`
      : `🚨 Budget exceeded! You're ${fmt(monthly - budget.monthly)} over limit.`;
  } else if (real >= 80) {
    warn.className   = 'budget-warning show danger';
    warn.textContent = savageMode
      ? `😈 ${Math.round(real)}% budget used. Final form unlocked. Help yourself.`
      : `⚠️ ${Math.round(real)}% of monthly budget used. Slow down!`;
  } else if (real >= 60) {
    warn.className   = 'budget-warning show warn';
    warn.textContent = savageMode
      ? `🤔 ${Math.round(real)}% gone. Your future self is shaking.`
      : `🟡 ${Math.round(real)}% of monthly budget used. Stay mindful.`;
  } else {
    warn.textContent = '';
  }
}

/* ── Insight Chips ─────────────────────────────────────────── */

/**
 * Generate and render behavioural insight chips.
 */
function updateInsights() {
  const strip = document.getElementById('insightsStrip');

  if (expenses.length === 0) {
    strip.innerHTML = '<div class="insight-chip">💡 Add expenses to see insights</div>';
    return;
  }

  const insights = [];
  const cats     = getCategoryBreakdown(expenses);
  const sorted   = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const monthly  = getMonthlyTotal(expenses);

  // 1. Top category
  if (sorted[0]) {
    const [cat, amt] = sorted[0];
    insights.push(
      savageMode
        ? `${CAT[cat]?.emoji} You blew ${fmt(amt)} on ${cat}. Classic.`
        : `${CAT[cat]?.emoji} You spend most on ${cat} — ${fmt(amt)} this month`
    );
  }

  // 2. Weekend vs weekday spike
  const { wendAvg, wdayAvg, weekendItems, weekdayItems } = getWeekendVsWeekday(expenses);
  if (weekendItems.length > 0 && weekdayItems.length > 0 && wendAvg > wdayAvg * 1.5) {
    insights.push(
      savageMode
        ? `📈 Spending spikes on weekends. You party like nobody's watching the bank account.`
        : `📈 Spending spikes on weekends — avg ${fmt(Math.round(wendAvg))} vs ${fmt(Math.round(wdayAvg))} weekdays`
    );
  }

  // 3. Random category callout
  if (cats['Random'] > 0) {
    insights.push(
      savageMode
        ? `🎲 ${fmt(cats['Random'])} on 'Random'? Bestie what IS that 💀`
        : `🎲 ${fmt(cats['Random'])} spent in 'Random' category this month`
    );
  }

  // 4. Spending streak
  const streak = getSpendingStreak(expenses);
  if (streak >= 3) {
    insights.push(
      savageMode
        ? `🔥 ${streak}-day spending streak. Consistency, but make it ruinous.`
        : `🔥 ${streak}-day spending streak! You're consistently tracking.`
    );
  }

  // 5. Biggest single expense
  const maxExp = getMaxExpense(expenses);
  if (maxExp && maxExp.amount > 0) {
    insights.push(
      savageMode
        ? `💸 Biggest splurge: ${fmt(maxExp.amount)} on "${maxExp.name}". Bold move.`
        : `💸 Biggest single expense: ${fmt(maxExp.amount)} on "${maxExp.name}"`
    );
  }

  // 6. Budget health (if under 40%)
  if (budget.monthly && monthly > 0) {
    const pct = Math.round((monthly / budget.monthly) * 100);
    if (pct < 40) {
      insights.push(
        savageMode
          ? `👍 Only ${pct}% of budget used. Plot twist: you're not broke yet.`
          : `✅ Great! Only ${pct}% of your monthly budget used so far`
      );
    }
  }

  strip.innerHTML = insights
    .map((ins, i) => `<div class="insight-chip" style="animation-delay:${i * 0.05}s">${ins}</div>`)
    .join('');
}
