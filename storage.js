/* ============================================================
   storage.js — SpendSense Premium AI
   All localStorage read / write operations, with safe fallbacks.
   ============================================================ */

const Storage = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  /* Expenses */
  getExpenses()     { return this.get('ss_expenses')  || []; },
  saveExpenses(arr) { this.set('ss_expenses', arr); },

  /* Income */
  getIncomes()     { return this.get('ss_incomes') || []; },
  saveIncomes(arr) { this.set('ss_incomes', arr); },

  /* Split & Settle */
  getSettlements()     { return this.get('ss_settlements') || []; },
  saveSettlements(arr) { this.set('ss_settlements', arr); },

  /* AI Coach chat history */
  getChatHistory()     { return this.get('ss_chat_history') || []; },
  saveChatHistory(arr) { this.set('ss_chat_history', arr); },

  /* Dismissed "set as recurring?" suggestions */
  getDismissedRecurring()    { return this.get('ss_dismissed_recurring') || []; },
  saveDismissedRecurring(arr){ this.set('ss_dismissed_recurring', arr); },

  /* Budget */
  getBudget()    { return this.get('ss_budget') || { monthly: 20000, weekly: 5000 }; },
  saveBudget(b)  { this.set('ss_budget', b); },

  /* Savage mode */
  getSavageMode()      { return localStorage.getItem('ss_savage') === 'true'; },
  setSavageMode(mode)  { localStorage.setItem('ss_savage', String(mode)); },

  /* Achievements */
  getUnlocked()    { return this.get('ss_unlocked') || []; },
  saveUnlocked(arr){ this.set('ss_unlocked', arr); },

  /* Goals */
  getGoals()     { return this.get('ss_goals')    || []; },
  saveGoals(arr) { this.set('ss_goals', arr); },

  /* Category budgets */
  getCatBudgets()    { return this.get('ss_catbudgets') || {}; },
  saveCatBudgets(obj){ this.set('ss_catbudgets', obj); },

  /* Recurring */
  getRecurring()     { return this.get('ss_recurring') || []; },
  saveRecurring(arr) { this.set('ss_recurring', arr); },

  /* XP / Level */
  getXP()    { return this.get('ss_xp') || 0; },
  saveXP(xp) { this.set('ss_xp', xp); },

  /* Daily nudge dismissal (date string, so it re-appears next day) */
  getNudgeDismissed()   { return this.get('ss_nudge_dismissed') || ''; },
  saveNudgeDismissed(d) { this.set('ss_nudge_dismissed', d); },

  /* Daily quest claims (reset automatically when the date changes) */
  getQuestClaims()   { return this.get('ss_quest_claims') || { date: '', claimed: [] }; },
  saveQuestClaims(o) { this.set('ss_quest_claims', o); },

  /* Theme */
  getTheme()       { return this.get('ss_theme') || false; },
  saveTheme(light) { this.set('ss_theme', light); },

  /* Nuke everything */
  clearAll() {
    [
      'ss_expenses', 'ss_budget', 'ss_savage', 'ss_unlocked',
      'ss_goals', 'ss_catbudgets', 'ss_recurring', 'ss_theme',
      'ss_xp', 'ss_nudge_dismissed', 'ss_incomes', 'ss_settlements', 'ss_quest_claims', 'ss_chat_history',
      'ss_dismissed_recurring',
    ].forEach(k => localStorage.removeItem(k));
  },
};