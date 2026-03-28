/* ============================================================
   app.js  —  SpendSense main controller
   Owns global state, wires up user actions, and coordinates
   all component updates.
   ============================================================ */

/* ── Global State ──────────────────────────────────────────── */
let expenses   = Storage.getExpenses();
let budget     = Storage.getBudget();
let savageMode = false;

/* ── Initialisation ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  /* Default date input to today */
  document.getElementById('expDate').value = new Date().toISOString().split('T')[0];

  /* Pre-fill saved budget values */
  document.getElementById('monthlyBudget').value = budget.monthly;
  document.getElementById('weeklyBudget').value  = budget.weekly;

  update();
});

/* ── Master Update ─────────────────────────────────────────── */

/**
 * Re-render every part of the UI from current state.
 * Call this after any data mutation.
 */
function update() {
  updateStats();
  updateBudget();
  updateInsights();
  renderList();
  renderCharts();
}

/* ── Add Expense ───────────────────────────────────────────── */

/**
 * Read the add-expense form, validate, push to state, and persist.
 */
function addExpense() {
  const name     = document.getElementById('expName').value.trim();
  const amount   = parseFloat(document.getElementById('expAmount').value);
  const category = document.getElementById('expCategory').value;
  const date     = document.getElementById('expDate').value;

  /* Validation */
  if (!name)               { showToast('⚠️ Add a description!');      return; }
  if (!amount || amount <= 0) { showToast('⚠️ Enter a valid amount!'); return; }
  if (!date)               { showToast('⚠️ Pick a date!');            return; }

  const expense = { id: Date.now(), name, amount, category, date };
  expenses.unshift(expense);
  Storage.saveExpenses(expenses);
  update();

  /* Reset form fields */
  document.getElementById('expName').value   = '';
  document.getElementById('expAmount').value = '';

  /* Feedback toast */
  if (savageMode) {
    showToast(`😈 ${getSavageLine(category)}`, true);
  } else {
    showToast(`✅ Added ${fmt(amount)} for ${name}`);
  }
}

/* ── Budget Settings ───────────────────────────────────────── */

/**
 * Read budget inputs, persist, and refresh budget UI.
 */
function saveBudget() {
  budget.monthly = parseFloat(document.getElementById('monthlyBudget').value) || 20000;
  budget.weekly  = parseFloat(document.getElementById('weeklyBudget').value)  || 5000;
  Storage.saveBudget(budget);
  update();
  showToast('💾 Budget saved!');
}

/* ── Savage Mode Toggle ────────────────────────────────────── */

/**
 * Toggle savage mode on/off and refresh insight-dependent UI.
 */
function toggleSavage() {
  savageMode = !savageMode;

  const toggle = document.getElementById('savageToggle');
  const label  = document.getElementById('savageLabel');

  toggle.classList.toggle('active', savageMode);
  label.textContent = savageMode ? 'Savage: ON 🔥' : 'Savage Mode';

  if (savageMode) showToast('😈 Savage mode activated. No mercy.', true);

  updateInsights();
  updateBudget();
}

/* ── Clear All Data ────────────────────────────────────────── */

/**
 * Prompt the user, then wipe all stored data and reset UI.
 */
function clearAll() {
  if (!confirm('Delete all expense data? This cannot be undone.')) return;
  expenses = [];
  Storage.saveExpenses(expenses);
  update();
  showToast('🗑 All data cleared');
}

/* ── Toast Notification ────────────────────────────────────── */

/**
 * Display a temporary toast message at the bottom-right of the screen.
 * @param {string}  msg     Message text
 * @param {boolean} savage  True → apply red savage styling
 */
function showToast(msg, savage = false) {
  const container = document.getElementById('toastContainer');
  const toast     = document.createElement('div');
  toast.className = 'toast' + (savage ? ' savage' : '');
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ── Keyboard Shortcuts ────────────────────────────────────── */
document.addEventListener('keydown', e => {
  /* Press Enter while focused on the description field → add expense */
  if (e.key === 'Enter' && document.getElementById('expName') === document.activeElement) {
    addExpense();
  }
});
