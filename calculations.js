/* ============================================================
   utils/storage.js
   Handles all localStorage read / write operations
   ============================================================ */

const Storage = {
  /**
   * Load expenses array from localStorage.
   * Returns an empty array if nothing is stored yet.
   */
  getExpenses() {
    return JSON.parse(localStorage.getItem('ss_expenses') || '[]');
  },

  /**
   * Persist the full expenses array to localStorage.
   * @param {Array} expenses
   */
  saveExpenses(expenses) {
    localStorage.setItem('ss_expenses', JSON.stringify(expenses));
  },

  /**
   * Load budget object from localStorage.
   * Falls back to sensible defaults (₹20 000 monthly, ₹5 000 weekly).
   */
  getBudget() {
    return JSON.parse(
      localStorage.getItem('ss_budget') ||
      '{"monthly":20000,"weekly":5000}'
    );
  },

  /**
   * Persist the budget object to localStorage.
   * @param {{ monthly: number, weekly: number }} budget
   */
  saveBudget(budget) {
    localStorage.setItem('ss_budget', JSON.stringify(budget));
  },

  /**
   * Wipe all SpendSense data from localStorage.
   */
  clearAll() {
    localStorage.removeItem('ss_expenses');
    localStorage.removeItem('ss_budget');
  },
};
