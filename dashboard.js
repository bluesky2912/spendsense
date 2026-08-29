/* ============================================================
   dashboard.js — SpendSense 5-Second 3-Question Dashboard Engine
   Answers:
   1. How much did I spend?
   2. Where did it go?
   3. Am I doing okay?
   ============================================================ */

/* ── Hero Update ── */
function updateHero() {
  const greetEl = document.getElementById('heroGreeting');
  if (greetEl) {
    const h = new Date().getHours();
    greetEl.textContent = h < 12 ? 'Good morning.' : h < 17 ? 'Good afternoon.' : 'Good evening.';
  }

  const monthly = getMonthlyTotal(expenses);
  const heroEl  = document.getElementById('heroAmount');
  if (heroEl) {
    if (parseFloat(heroEl.dataset.val || '0') !== monthly) {
      animateValue(heroEl, parseFloat(heroEl.dataset.val || '0'), monthly, 600, fmt);
    }
    heroEl.dataset.val = monthly;
  }

  // Month-over-Month Delta
  const deltaEl = document.getElementById('heroSpentDelta');
  if (deltaEl) {
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevTotal = getMonthlyTotal(expenses, prevMonthDate);

    if (prevTotal > 0 && monthly > 0) {
      const diff = monthly - prevTotal;
      const pct = Math.round((Math.abs(diff) / prevTotal) * 100);
      if (diff < 0) {
        deltaEl.textContent = `↓ ${fmt(Math.abs(diff))} less than last month (${pct}%)`;
        deltaEl.className = 'hero-spent-delta good';
      } else if (diff > 0) {
        deltaEl.textContent = `↑ ${fmt(diff)} more than last month (+${pct}%)`;
        deltaEl.className = 'hero-spent-delta bad';
      } else {
        deltaEl.textContent = `Same as last month`;
        deltaEl.className = 'hero-spent-delta';
      }
    } else if (budget.monthly) {
      const real = (monthly / budget.monthly) * 100;
      deltaEl.textContent = `${Math.round(real)}% of ${fmt(budget.monthly)} budget`;
      deltaEl.className = 'hero-spent-delta' + (real > 100 ? ' bad' : real > 80 ? ' warn' : ' good');
    } else {
      deltaEl.textContent = `${expenses.length} expense${expenses.length !== 1 ? 's' : ''} tracked`;
      deltaEl.className = 'hero-spent-delta';
    }
  }

  // Human Personality Commentary
  const commentaryEl = document.getElementById('heroCommentary');
  if (commentaryEl) {
    if (typeof Personality !== 'undefined') {
      commentaryEl.textContent = Personality.getHeroCommentary(expenses, budget, incomes);
    } else {
      commentaryEl.textContent = 'Keep logging to sharpen your financial pulse.';
    }
  }

  // Ring Animation
  const real = budget.monthly ? (monthly / budget.monthly) * 100 : 0;
  const pct  = Math.min(real, 100);
  const ring   = document.getElementById('ringFill');
  const pctTxt = document.getElementById('ringPct');
  if (ring && pctTxt) {
    ring.style.strokeDashoffset = 534 - (pct / 100) * 534;
    pctTxt.textContent = Math.round(real) + '%';

    if      (real >= 100) ring.style.stroke = '#e5484d';
    else if (real >= 80)  ring.style.stroke = '#f2994a';
    else if (real >= 60)  ring.style.stroke = '#e8bf5a';
    else                  ring.style.stroke = 'url(#ringGradient)';
  }

  const ringSvg = document.getElementById('heroRingSvg');
  if (ringSvg) {
    ringSvg.classList.remove('ring-danger', 'ring-safe');
    if (expenses.length && budget.monthly) {
      if (real >= 100)                ringSvg.classList.add('ring-danger');
      else if (real > 0 && real < 40) ringSvg.classList.add('ring-safe');
    }
  }

  /* Cash flow line */
  const cashFlowEl = document.getElementById('cashFlowLine');
  if (cashFlowEl) {
    const monthlyIncome = getMonthlyIncome(incomes);
    if (monthlyIncome > 0) {
      const net = monthlyIncome - monthly;
      cashFlowEl.style.display = 'block';
      cashFlowEl.style.color   = net >= 0 ? 'var(--green)' : 'var(--red)';
      cashFlowEl.textContent   = `💰 ${fmt(monthlyIncome)} in · 💸 ${fmt(monthly)} out · ${net >= 0 ? '✅' : '⚠️'} ${fmt(Math.abs(net))} ${net >= 0 ? 'saved' : 'short'} this month`;
    } else {
      cashFlowEl.style.display = 'none';
    }
  }
}

/* ── 4-Pillar Pulse Status Strip ── */
function updatePulseStrip() {
  const monthly = getMonthlyTotal(expenses);
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - dayOfMonth);

  // 1. Spending Trend / Pace
  const projected = dayOfMonth > 0 ? Math.round((monthly / dayOfMonth) * daysInMonth) : 0;
  const paceValEl = document.getElementById('pulseTrendVal');
  const paceSubEl = document.getElementById('pulseTrendSub');
  if (paceValEl && paceSubEl) {
    if (!expenses.length) {
      paceValEl.textContent = 'No Spend Yet';
      paceSubEl.textContent = 'Day ' + dayOfMonth + ' of ' + daysInMonth;
    } else if (budget.monthly && projected > budget.monthly) {
      paceValEl.textContent = 'Elevated Pace';
      paceValEl.style.color = 'var(--red)';
      paceSubEl.textContent = `On track for ~${fmt(projected)}`;
    } else {
      paceValEl.textContent = 'On Track';
      paceValEl.style.color = 'var(--green)';
      paceSubEl.textContent = `Projected ~${fmt(projected)}`;
    }
  }

  // 2. Top Category
  const top = getTopCategory(expenses);
  const topValEl = document.getElementById('pulseTopCatVal');
  const topSubEl = document.getElementById('pulseTopCatSub');
  const topIconEl = document.getElementById('pulseTopCatIcon');
  if (topValEl && topSubEl) {
    if (top) {
      const topPct = monthly > 0 ? Math.round((top[1] / monthly) * 100) : 0;
      topValEl.textContent = top[0];
      topSubEl.textContent = `${fmt(top[1])} (${topPct}%)`;
      if (topIconEl) topIconEl.textContent = CAT[top[0]]?.emoji || '🏆';
    } else {
      topValEl.textContent = '—';
      topSubEl.textContent = 'No expenses';
      if (topIconEl) topIconEl.textContent = '🏆';
    }
  }

  // 3. Budget Progress
  const budgetValEl = document.getElementById('pulseBudgetVal');
  const budgetSubEl = document.getElementById('pulseBudgetSub');
  if (budgetValEl && budgetSubEl) {
    if (budget.monthly) {
      const pct = Math.min(100, Math.round((monthly / budget.monthly) * 100));
      const left = Math.max(0, budget.monthly - monthly);
      budgetValEl.textContent = `${pct}% Used`;
      budgetSubEl.textContent = `${fmt(left)} left (${daysLeft}d)`;
    } else {
      budgetValEl.textContent = 'No Budget';
      budgetSubEl.textContent = 'Set limit in budget tab';
    }
  }

  // 4. Safe-to-Spend
  const safeValEl = document.getElementById('pulseSafeVal');
  const safeSubEl = document.getElementById('pulseSafeSub');
  if (safeValEl && safeSubEl) {
    if (typeof Affordability !== 'undefined') {
      const affordBreakdown = Affordability.calculate(0);
      safeValEl.textContent = fmt(affordBreakdown.safeToSpend);
      safeSubEl.textContent = `${fmt(Math.round(affordBreakdown.safeToSpend / daysLeft))}/day buffer`;
    }
  }
}

/* ── Dashboard Highlight Story ── */
function updateDashboardHighlightStory() {
  const storyEl = document.getElementById('dashHighlightStoryText');
  if (!storyEl) return;

  if (typeof Stories !== 'undefined') {
    const storiesList = Stories.generateStories();
    if (storiesList.length > 0) {
      const topStory = storiesList[0];
      storyEl.innerHTML = `<strong>${escapeHtml(topStory.title)}</strong> ${escapeHtml(topStory.subtitle)} ${escapeHtml(topStory.detail || '')}`;
      return;
    }
  }

  if (!expenses.length) {
    storyEl.textContent = 'Log your first few expenses to unlock smart spending stories and spike alerts.';
  } else {
    storyEl.textContent = `You've logged ${expenses.length} entries. Keep going to reveal category surges and weekend habits!`;
  }
}

/* ── Quick Dashboard Affordability Check ── */
function checkAffordFromDash() {
  const amtInput = document.getElementById('dashAffordInputAmt');
  const nameInput = document.getElementById('dashAffordInputName');
  const amt = amtInput ? parseFloat(amtInput.value) || 0 : 0;
  const name = nameInput ? nameInput.value.trim() : '';

  if (typeof Affordability !== 'undefined') {
    Affordability.showModal(amt > 0 ? amt : 8000, name || 'Proposed purchase');
  }
}

/* ── Dedicated Tab Affordability Calculator ── */
function renderTabAffordability() {
  const amtInput = document.getElementById('tabAffordAmount');
  const nameInput = document.getElementById('tabAffordName');
  const container = document.getElementById('tabAffordResultSheet');
  if (!container || typeof Affordability === 'undefined') return;

  const amt = amtInput ? parseFloat(amtInput.value) || 0 : 0;
  const name = nameInput ? nameInput.value.trim() : '';

  if (amt <= 0) {
    container.innerHTML = `
      <div class="afford-empty-state">
        <div class="afford-empty-icon">💡</div>
        <div class="afford-empty-title">Enter a proposed amount above</div>
        <div class="afford-empty-desc">SpendSense will calculate your exact cash buffer, upcoming bills, and savings goal impact in real time.</div>
        <div class="afford-quick-samples">
          <button type="button" class="afford-sample-btn" onclick="document.getElementById('tabAffordAmount').value=8000; document.getElementById('tabAffordName').value='Sony Headphones'; renderTabAffordability();">🎧 ₹8,000 Headphones</button>
          <button type="button" class="afford-sample-btn" onclick="document.getElementById('tabAffordAmount').value=3200; document.getElementById('tabAffordName').value='Weekend Dinner'; renderTabAffordability();">🍔 ₹3,200 Dinner</button>
          <button type="button" class="afford-sample-btn" onclick="document.getElementById('tabAffordAmount').value=45000; document.getElementById('tabAffordName').value='MacBook Air'; renderTabAffordability();">💻 ₹45,000 Laptop</button>
        </div>
      </div>
    `;
    return;
  }

  const result = Affordability.calculate(amt, name);
  const verdictClass = `afford-verdict-${result.verdict}`;
  const remColor = result.remainingAfterPurchase >= 0 ? 'var(--green)' : 'var(--red)';

  container.innerHTML = `
    <div class="afford-card ${verdictClass}">
      <div class="afford-verdict-header">
        <span class="afford-verdict-icon">${result.verdictIcon}</span>
        <div>
          <div class="afford-verdict-title">${result.verdictTitle}</div>
          <div class="afford-verdict-sub">${result.verdictMessage}</div>
        </div>
      </div>

      <div class="afford-breakdown">
        <div class="afford-row">
          <span class="afford-label">Current effective balance</span>
          <span class="afford-val">${fmt(result.currentBalance)}</span>
        </div>
        <div class="afford-row">
          <span class="afford-label">Upcoming expenses & obligations</span>
          <span class="afford-val" style="color:var(--orange)">−${fmt(result.upcomingExpenses)}</span>
        </div>
        <div class="afford-row">
          <span class="afford-label">Savings goal reserve</span>
          <span class="afford-val" style="color:var(--accent)">−${fmt(result.savingsGoalAllocation)}</span>
        </div>
        <div class="afford-divider"></div>
        <div class="afford-row afford-highlight">
          <span class="afford-label">Safe-to-spend buffer</span>
          <span class="afford-val" style="color:var(--green)">${fmt(result.safeToSpend)}</span>
        </div>
        <div class="afford-row">
          <span class="afford-label">Proposed purchase (${escapeHtml(result.itemName)})</span>
          <span class="afford-val" style="color:var(--text); font-weight:700">−${fmt(result.purchaseAmount)}</span>
        </div>
        <div class="afford-divider"></div>
        <div class="afford-row afford-total-row">
          <span class="afford-label">Remaining after purchase</span>
          <span class="afford-val" style="color:${remColor}; font-size:16px; font-weight:800">
            ${result.remainingAfterPurchase >= 0 ? '+' : '−'}${fmt(Math.abs(result.remainingAfterPurchase))}
          </span>
        </div>
      </div>

      <div class="afford-actions">
        <button class="afford-action-btn primary" onclick="Affordability.logAsExpense(${result.purchaseAmount}, '${escapeHtml(result.itemName).replace(/'/g, "\\'")}', '${result.category}')">
          <span>💸 Log as Expense</span>
        </button>
        <button class="afford-action-btn secondary" onclick="Affordability.createSavingsGoal(${result.purchaseAmount}, '${escapeHtml(result.itemName).replace(/'/g, "\\'")}')">
          <span>🎯 Save for this (~${result.weeksToSave} wks)</span>
        </button>
      </div>
    </div>
  `;
}

/* ── Streak badge ── */
function updateStreak() {
  const streak   = getSpendingStreak(expenses);
  const streakEl = document.getElementById('streakCount');
  if (streakEl) {
    animateValue(streakEl, parseFloat(streakEl.dataset.val || '0'), streak, 500, v => String(Math.round(v)));
    streakEl.dataset.val = streak;
  }
  const badge = document.getElementById('streakBadge');
  if (badge) badge.style.opacity = streak > 0 ? '1' : '0.4';
}

/* ── Heatmap (last 30 days) ── */
function updateHeatmap() {
  const heatmap = document.getElementById('heatmap');
  if (!heatmap) return;
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
  if (!fb) return;
  if (expenses.length < 3) { fb.style.display = 'none'; return; }

  const now        = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthly    = getMonthlyTotal(expenses);
  const projected  = Math.round((monthly / dayOfMonth) * daysInMonth);

  fb.style.display = 'flex';
  document.getElementById('forecastText').textContent = 'At current pace, you\'ll spend this month:';

  const fv = document.getElementById('forecastValue');
  if (fv) {
    fv.textContent = fmt(projected);
    if      (budget.monthly && projected > budget.monthly)       fv.style.color = 'var(--red)';
    else if (budget.monthly && projected > budget.monthly * 0.8) fv.style.color = 'var(--orange)';
    else                                                          fv.style.color = 'var(--yellow)';
  }
}

/* ── Anomaly Alert ── */
function checkAnomaly() {
  const result = getAnomalyExpense(expenses);
  if (!result) return;

  const { expense: e, multiplier } = result;
  const el = document.getElementById('anomalyAlert');
  if (!el) return;
  document.getElementById('anomalyText').textContent =
    `Unusually large expense: ${fmt(e.amount)} on "${escapeHtml(e.name)}" — that's ${multiplier}× your average spend`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 8000);
}

/* ── Smart auto-detect category ── */
function autoDetectCategory(val) {
  const hint = document.getElementById('autoDetectHint');
  if (!hint) return;
  if (!val || val.length < 3) { hint.textContent = ''; return; }
  const cat = detectCategory(val);
  if (cat) {
    hint.textContent = `✨ Auto-detected: ${CAT[cat].emoji} ${cat}`;
    selectCatByName(cat);
  } else {
    hint.textContent = '';
  }
}