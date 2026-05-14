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

  /* Theme */
  getTheme()       { return this.get('ss_theme') || false; },
  saveTheme(light) { this.set('ss_theme', light); },

  /* Nuke everything */
  clearAll() {
    [
      'ss_expenses', 'ss_budget', 'ss_savage', 'ss_unlocked',
      'ss_goals', 'ss_catbudgets', 'ss_recurring', 'ss_theme',
    ].forEach(k => localStorage.removeItem(k));
  },
};
