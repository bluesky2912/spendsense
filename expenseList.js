/* ============================================================
   components/expenseList.js
   Renders the filterable / searchable expense list and
   handles individual item deletion.
   Reads from global `expenses` and `CAT`.
   ============================================================ */

/**
 * Re-render the expense list based on current search + filter values.
 * Called on every data change, search keypress, and filter change.
 */
function renderList() {
  const search    = document.getElementById('searchInput').value.toLowerCase();
  const filterCat = document.getElementById('filterCat').value;
  const list      = document.getElementById('expenseList');

  const filtered = expenses.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search) ||
                        e.category.toLowerCase().includes(search);
    const matchCat    = !filterCat || e.category === filterCat;
    return matchSearch && matchCat;
  });

  if (filtered.length === 0) {
    const icon = expenses.length === 0 ? '🪙' : '🔍';
    const msg  = expenses.length === 0
      ? 'No expenses yet. Add one above.'
      : 'No expenses match your search.';
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <p>${msg}</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(e => buildExpenseItem(e)).join('');
}

/**
 * Build the HTML string for a single expense list item.
 * @param {Object} e  Expense object { id, name, amount, category, date }
 * @returns {string}
 */
function buildExpenseItem(e) {
  const cat     = CAT[e.category] || CAT.Other;
  const d       = new Date(e.date + 'T00:00:00');
  const dateStr = d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: '2-digit',
  });

  return `
    <div class="expense-item">
      <div class="cat-dot" style="background:${cat.bg};">${cat.emoji}</div>
      <div class="expense-info">
        <div class="expense-name">${e.name}</div>
        <div class="expense-meta">${e.category} · ${dateStr}</div>
      </div>
      <div class="expense-amount">${fmt(e.amount)}</div>
      <button class="delete-btn" onclick="deleteExpense(${e.id})" title="Delete">×</button>
    </div>`;
}

/**
 * Delete an expense by ID, persist, and refresh the UI.
 * @param {number} id  The expense's timestamp-based ID
 */
function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  Storage.saveExpenses(expenses);
  update();
  showToast('🗑 Expense removed');
}

/**
 * Export all expenses to a CSV file and trigger a download.
 */
function exportCSV() {
  if (expenses.length === 0) {
    showToast('⚠️ No expenses to export!');
    return;
  }

  const header = 'Date,Name,Category,Amount';
  const rows   = expenses.map(e => `${e.date},"${e.name}",${e.category},${e.amount}`);
  const csv    = [header, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `spendsense_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('📤 Exported to CSV!');
}
