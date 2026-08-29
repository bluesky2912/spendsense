/* ============================================================
   personality.js — SpendSense Adaptive Human Personality Engine
   Replaces mechanical financial jargon with warm, contextual,
   relatable copy adapted to the user's spending habits.
   ============================================================ */

const PERSONALITY_MODES = {
  adaptive: {
    id: 'adaptive',
    name: 'Adaptive (Auto-tunes)',
    emoji: '✨',
    desc: 'Learns your spending rhythm and adjusts tone dynamically.',
  },
  friendly: {
    id: 'friendly',
    name: 'Encouraging & Friendly',
    emoji: '😊',
    desc: 'Warm, supportive, and celebrates every financial win.',
  },
  direct: {
    id: 'direct',
    name: 'Direct & Pragmatic',
    emoji: '🎯',
    desc: 'Clear, concise, and focused on pure financial clarity.',
  },
  savage: {
    id: 'savage',
    name: 'Savage & Roast',
    emoji: '😈',
    desc: 'Brutally honest, witty, and roasts unnecessary expenses.',
  },
  zen: {
    id: 'zen',
    name: 'Zen & Minimalist',
    emoji: '🧘',
    desc: 'Calm, low-stress, zero financial anxiety.',
  },
};

const Personality = {
  getMode() {
    return (typeof Storage !== 'undefined' && Storage.getPersonalityMode)
      ? Storage.getPersonalityMode()
      : (localStorage.getItem('ss_personality_mode') || 'adaptive');
  },

  setMode(mode) {
    if (PERSONALITY_MODES[mode]) {
      if (typeof Storage !== 'undefined' && Storage.setPersonalityMode) {
        Storage.setPersonalityMode(mode);
      } else {
        localStorage.setItem('ss_personality_mode', mode);
      }
      if (mode === 'savage') {
        savageMode = true;
        if (typeof Storage !== 'undefined' && Storage.setSavageMode) Storage.setSavageMode(true);
      } else if (savageMode && mode !== 'savage') {
        savageMode = false;
        if (typeof Storage !== 'undefined' && Storage.setSavageMode) Storage.setSavageMode(false);
      }
    }
  },

  /* Detect user habit profile dynamically */
  getHabitProfile(expensesList, budgetObj, incomesList) {
    const list = expensesList || expenses || [];
    const bObj = budgetObj || budget || { monthly: 20000 };
    const incList = incomesList || incomes || [];

    const monthlyTotal = getMonthlyTotal(list);
    const monthlyBudget = bObj.monthly || 0;
    const monthlyIncome = getMonthlyIncome(incList);
    const streak = getSpendingStreak(list);
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthProgress = dayOfMonth / daysInMonth;

    const budgetRatio = monthlyBudget > 0 ? monthlyTotal / monthlyBudget : (monthlyIncome > 0 ? monthlyTotal / monthlyIncome : 0.5);
    const isPacingFast = budgetRatio > (monthProgress + 0.15);
    const isPacingDisciplined = budgetRatio < (monthProgress - 0.1);
    const isUnderBudget = budgetRatio <= 0.85 && monthProgress >= 0.75;
    const isOverBudget = budgetRatio >= 1.0;

    return {
      monthlyTotal,
      monthlyBudget,
      monthlyIncome,
      streak,
      monthProgress,
      budgetRatio,
      isPacingFast,
      isPacingDisciplined,
      isUnderBudget,
      isOverBudget,
      dayOfMonth,
    };
  },

  /* Generate hero commentary that answers "Am I doing okay?" in human language */
  getHeroCommentary(expensesList, budgetObj, incomesList) {
    const profile = this.getHabitProfile(expensesList, budgetObj, incomesList);
    const mode = this.getMode();
    const activeMode = mode === 'adaptive' ? this.resolveAdaptiveMode(profile) : mode;

    const list = expensesList || expenses || [];
    if (!list.length) {
      if (activeMode === 'savage') return "Your wallet is currently in a coma. Add an expense to wake it up. 💀";
      if (activeMode === 'zen') return "A clean slate. Log expenses as they happen.";
      return "No expenses logged yet this month. Ready when you are.";
    }

    if (profile.isOverBudget) {
      const overBy = fmt(profile.monthlyTotal - profile.monthlyBudget);
      switch (activeMode) {
        case 'savage':
          return `💀 ${overBy} over budget. Financial discipline has left the chat.`;
        case 'friendly':
          return `You're ${overBy} over your target, but don't sweat it. Let's finish the month strong together.`;
        case 'zen':
          return `Budget threshold crossed by ${overBy}. Focus on essentials for the remaining days.`;
        case 'direct':
        default:
          return `Over budget by ${overBy}. Discretionary spending pause recommended.`;
      }
    }

    if (profile.isPacingFast) {
      switch (activeMode) {
        case 'savage':
          return "You're spending like payday was 10 minutes ago. Slow down. 🏎️💨";
        case 'friendly':
          return "You're spending a little faster than usual this week. Small tweak to stay comfortable!";
        case 'zen':
          return "Pace is slightly elevated. A gentle pause on extra purchases will balance things.";
        case 'direct':
        default:
          return `Current spending rate is above target pace for day ${profile.dayOfMonth}.`;
      }
    }

    if (profile.isPacingDisciplined || profile.isUnderBudget) {
      switch (activeMode) {
        case 'savage':
          return "Under budget? Who are you and what did you do with the real spender? 👀";
        case 'friendly':
          return "Nice! You're cruising well under your budget limit. Keep this energy! 🌿";
        case 'zen':
          return "Peace of mind. Spending is completely under control.";
        case 'direct':
        default:
          return "Spending velocity is healthy and well within safe limits.";
      }
    }

    if (profile.monthlyBudget) {
      const remaining = fmt(profile.monthlyBudget - profile.monthlyTotal);
      return `${remaining} remaining buffer for the rest of this month.`;
    }

    return "Looking steady. Keep logging to sharpen your financial pulse.";
  },

  /* Determine adaptive mode based on spending state */
  resolveAdaptiveMode(profile) {
    if (profile.isOverBudget || profile.isPacingFast) {
      return 'friendly'; // Be supportive and encouraging when struggling
    }
    if (profile.isUnderBudget) {
      return 'friendly';
    }
    return 'direct';
  },

  /* Generate human toast notifications when adding expenses */
  getExpenseToast(name, category, amount) {
    const mode = this.getMode();
    const emoji = (typeof CAT !== 'undefined' && CAT[category]) ? CAT[category].emoji : '💸';

    if (mode === 'savage' || savageMode) {
      if (typeof getSavageLine === 'function') return getSavageLine(category, amount);
      return `💀 ${fmt(amount)} gone. RIP.`;
    }
    if (mode === 'zen') {
      return `${emoji} ${fmt(amount)} logged. Balance maintained.`;
    }
    if (mode === 'friendly') {
      if (amount > 5000) return `${emoji} Got it! Logged ${fmt(amount)} for ${name}.`;
      return `${emoji} ${name} (${fmt(amount)}) added. Stay mindful!`;
    }
    return `✅ Logged ${fmt(amount)} in ${category}`;
  }
};
