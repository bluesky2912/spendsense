/* ============================================================
   affordability.js — SpendSense "Can I Afford This?" Feature
   Real-time cash flow & obligation calculation, breakdown sheet,
   decision verdicts (Safe / Caution / Not recommended),
   and one-tap goal/expense actions.
   ============================================================ */

const Affordability = {
  /* Calculate full financial breakdown for a proposed purchase */
  calculate(amount, itemName, category) {
    const purchaseAmount = Math.max(0, parseFloat(amount) || 0);
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - dayOfMonth);

    // 1. Current effective balance
    const monthlyIncome = getMonthlyIncome(incomes);
    const monthlySpent = getMonthlyTotal(expenses);
    const monthlyBudget = budget.monthly || 20000;

    let currentBalance = 0;
    if (monthlyIncome > 0) {
      currentBalance = Math.max(0, monthlyIncome - monthlySpent);
    } else {
      currentBalance = Math.max(0, monthlyBudget - monthlySpent);
    }

    // 2. Upcoming obligations (recurring due this month + estimated baseline essentials)
    let upcomingRecurring = 0;
    if (typeof recurringList !== 'undefined' && recurringList.length) {
      recurringList.forEach(r => {
        // Approximate remaining recurring this month
        upcomingRecurring += (r.amount || 0);
      });
    }

    // Baseline daily run-rate for essentials
    const dailyAvg = getAvgDailySpend(expenses) || (monthlyBudget / 30);
    const projectedEssentialRunRate = Math.round(dailyAvg * (daysRemaining / 2));
    const upcomingExpenses = Math.round(upcomingRecurring + projectedEssentialRunRate);

    // 3. Active savings goals allocation
    let savingsGoalAllocation = 0;
    if (typeof goals !== 'undefined' && goals.length) {
      const activeGoals = goals.filter(g => (g.saved || 0) < (g.target || 0));
      activeGoals.forEach(g => {
        const remaining = g.target - g.saved;
        savingsGoalAllocation += Math.round(Math.min(remaining, g.target * 0.25));
      });
    }
    if (savingsGoalAllocation === 0) {
      // Standard recommended 15% savings reserve
      savingsGoalAllocation = Math.round(Math.max(monthlyIncome, monthlyBudget) * 0.15);
    }

    // 4. Safe to spend
    const safeToSpend = Math.max(0, currentBalance - upcomingExpenses - savingsGoalAllocation);

    // 5. Remaining buffer after proposed purchase
    const remainingAfterPurchase = safeToSpend - purchaseAmount;
    const cashDeficit = (currentBalance - upcomingExpenses) - purchaseAmount;

    // 6. Verdict determination
    let verdict = 'safe'; // 'safe' | 'caution' | 'danger'
    let verdictTitle = 'Safe to buy';
    let verdictMessage = 'This purchase won’t interfere with your current budget or savings target.';
    let verdictIcon = '🟢';

    if (purchaseAmount <= 0) {
      verdict = 'safe';
      verdictTitle = 'Enter an amount';
      verdictMessage = 'Type a price above to check if you can comfortably afford it.';
      verdictIcon = '💭';
    } else if (remainingAfterPurchase >= 0) {
      verdict = 'safe';
      verdictTitle = 'Safe to purchase';
      verdictMessage = 'You can comfortably afford this without risking upcoming bills or savings goals.';
      verdictIcon = '🟢';
    } else if (cashDeficit >= 0) {
      verdict = 'caution';
      verdictTitle = 'Tight — Proceed with caution';
      const goalRisk = Math.abs(remainingAfterPurchase);
      verdictMessage = `You have the raw cash, but this will eat ${fmt(goalRisk)} into your monthly savings target.`;
      verdictIcon = '🟡';
    } else {
      verdict = 'danger';
      verdictTitle = 'Not recommended right now';
      const shortfall = Math.abs(cashDeficit);
      verdictMessage = `This would put you ${fmt(shortfall)} over budget and jeopardize your upcoming commitments.`;
      verdictIcon = '🔴';
    }

    // Recommendations & Payoff timeline
    const weeksToSave = Math.ceil(purchaseAmount / Math.max(500, (safeToSpend / 4) || 1000));
    const dailySavingNeeded = Math.round(purchaseAmount / 30);

    return {
      itemName: itemName || 'This item',
      purchaseAmount,
      currentBalance,
      upcomingExpenses,
      savingsGoalAllocation,
      safeToSpend,
      remainingAfterPurchase,
      cashDeficit,
      verdict,
      verdictTitle,
      verdictMessage,
      verdictIcon,
      weeksToSave: Math.max(1, weeksToSave),
      dailySavingNeeded,
      category: category || autoDetectCategoryName(itemName || ''),
    };
  },

  /* Render the Affordability Calculator modal / view */
  renderModal() {
    const amountInput = document.getElementById('affordAmount');
    const nameInput = document.getElementById('affordName');
    const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    const name = nameInput ? nameInput.value.trim() : '';

    const result = this.calculate(amount, name);
    const sheetEl = document.getElementById('affordResultSheet');
    if (!sheetEl) return;

    if (!amount || amount <= 0) {
      sheetEl.innerHTML = `
        <div class="afford-empty-state">
          <div class="afford-empty-icon">💡</div>
          <div class="afford-empty-title">Instant Affordability Engine</div>
          <div class="afford-empty-desc">Enter any purchase you're contemplating to see the exact impact on your cash balance, upcoming bills, and savings.</div>
          <div class="afford-quick-samples">
            <button type="button" class="afford-sample-btn" onclick="Affordability.fillSample(8000, 'Sony Headphones', 'Shopping')">🎧 ₹8,000 Headphones</button>
            <button type="button" class="afford-sample-btn" onclick="Affordability.fillSample(3200, 'Weekend Dinner & Drinks', 'Food')">🍔 ₹3,200 Dinner</button>
            <button type="button" class="afford-sample-btn" onclick="Affordability.fillSample(45000, 'MacBook Air M2', 'Shopping')">💻 ₹45,000 Laptop</button>
          </div>
        </div>
      `;
      return;
    }

    const verdictClass = `afford-verdict-${result.verdict}`;
    const remColor = result.remainingAfterPurchase >= 0 ? 'var(--green)' : 'var(--red)';

    sheetEl.innerHTML = `
      <div class="afford-card ${verdictClass}">
        <!-- Verdict Banner -->
        <div class="afford-verdict-header">
          <span class="afford-verdict-icon">${result.verdictIcon}</span>
          <div>
            <div class="afford-verdict-title">${result.verdictTitle}</div>
            <div class="afford-verdict-sub">${result.verdictMessage}</div>
          </div>
        </div>

        <!-- Financial Breakdown Sheet -->
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

        <!-- Action Row -->
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
  },

  fillSample(amount, name, category) {
    const amountInput = document.getElementById('affordAmount');
    const nameInput = document.getElementById('affordName');
    if (amountInput) amountInput.value = amount;
    if (nameInput) nameInput.value = name;
    this.renderModal();
  },

  logAsExpense(amount, name, category) {
    if (!amount || amount <= 0) return;
    const cat = category || 'Shopping';

    const exp = {
      id: genId(),
      name: name || 'Purchase',
      amount,
      category: cat,
      date: todayStr(),
    };

    expenses.push(exp);
    Storage.saveExpenses(expenses);
    update();
    checkAchievements();
    checkAnomaly();

    this.hideModal();
    showToast(`✅ Added ${fmt(amount)} for "${exp.name}"!`, 'success');
    fireConfetti();
  },

  createSavingsGoal(amount, name) {
    this.hideModal();
    showGoalForm();
    const nameEl = document.getElementById('goalName');
    const targetEl = document.getElementById('goalTarget');
    if (nameEl) nameEl.value = name || 'Savings Goal';
    if (targetEl) targetEl.value = amount || 1000;
  },

  showModal(initialAmount, initialName) {
    const modal = document.getElementById('affordModal');
    if (!modal) return;
    if (initialAmount) {
      const amtEl = document.getElementById('affordAmount');
      if (amtEl) amtEl.value = initialAmount;
    }
    if (initialName) {
      const nameEl = document.getElementById('affordName');
      if (nameEl) nameEl.value = initialName;
    }
    modal.classList.add('show');
    this.renderModal();
    setTimeout(() => {
      const input = document.getElementById('affordAmount');
      if (input && !input.value) input.focus();
    }, 100);
  },

  hideModal() {
    const modal = document.getElementById('affordModal');
    if (modal) modal.classList.remove('show');
  },
};

/* Quick helper to infer category name from text */
function autoDetectCategoryName(text) {
  if (!text) return 'Shopping';
  const lower = text.toLowerCase();
  for (const [cat, words] of Object.entries(CAT_KEYWORDS)) {
    if (words.some(w => lower.includes(w))) return cat;
  }
  return 'Shopping';
}
