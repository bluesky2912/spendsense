/* ============================================================
   expenseList.js — SpendSense Premium AI
   Renders the filterable / searchable / sortable expense list,
   handles single & bulk deletion, CSV export, and SMS import.
   ============================================================ */

/* ── Render list ── */
function renderList() {
  const search    = document.getElementById('searchInput').value.toLowerCase().trim();
  const filterCat = document.getElementById('filterCat').value;
  const sortBy    = document.getElementById('sortBy').value;
  const listEl    = document.getElementById('expenseList');

  let filtered = expenses.filter(e => {
    const matchSearch = !search ||
      e.name.toLowerCase().includes(search) ||
      e.category.toLowerCase().includes(search);
    const matchCat = !filterCat || e.category === filterCat;
    return matchSearch && matchCat;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'newest')  return b.date.localeCompare(a.date) || b.id - a.id;
    if (sortBy === 'oldest')  return a.date.localeCompare(b.date) || a.id - b.id;
    if (sortBy === 'highest') return b.amount - a.amount;
    if (sortBy === 'lowest')  return a.amount - b.amount;
    return 0;
  });

  if (!filtered.length) {
    const icon = expenses.length === 0 ? '🪙' : '🔍';
    const msg  = expenses.length === 0
      ? 'No expenses yet.<br/>Add your first one above.'
      : 'No expenses match your search.';
    listEl.innerHTML = `<div class="empty-state"><div class="empty-emoji">${icon}</div><p>${msg}</p></div>`;
    return;
  }

  listEl.innerHTML = filtered.map(e => buildExpenseItem(e)).join('');
}

/* ── Build a single expense row ── */
function buildExpenseItem(e) {
  const cat     = CAT[e.category] || CAT.Other;
  const d       = parseDate(e.date);
  const isToday = e.date === todayStr();
  const dateStr = isToday
    ? 'Today'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

  // Anomaly badge
  const avg         = expenses.length > 3 ? expenses.reduce((s, x) => s + x.amount, 0) / expenses.length : 0;
  const isAnomalous = avg > 0 && e.amount > avg * 2.5 && expenses.length > 5;

  const badges = [
    e.isRecurring ? '<span class="expense-badge badge-recur">🔄 recurring</span>' : '',
    e.splitWith   ? `<span class="expense-badge badge-split">🔀 split w/ ${escapeHtml(e.splitWith)}</span>` : '',
    isAnomalous   ? '<span class="expense-badge badge-anomaly">⚠️ large</span>' : '',
  ].filter(Boolean).join('');

  const cb = bulkMode
    ? `<input type="checkbox" class="select-cb" ${selectedIds.has(e.id) ? 'checked' : ''} onchange="toggleSelect(${e.id}, this.checked)" />`
    : '';

  return `
    <div class="expense-item${isAnomalous ? ' anomaly' : ''}${e.splitWith ? ' split-item' : ''}${selectedIds.has(e.id) ? ' selected' : ''}" id="exp_${e.id}">
      ${cb}
      <div class="cat-badge" style="background:${cat.bg}">${cat.emoji}</div>
      <div class="expense-info">
        <div class="expense-name">${escapeHtml(e.name)}</div>
        <div class="expense-meta">
          <span class="expense-cat-tag" style="background:${cat.color}22; color:${cat.color}">${escapeHtml(e.category)}</span>
          <span>${dateStr}</span>
          ${badges}
        </div>
      </div>
      <div class="expense-right">
        <div class="expense-amount" style="color:${cat.color}">${fmt(e.amount)}</div>
        <button class="delete-btn" onclick="deleteExpense(${e.id})" title="Delete" aria-label="Delete expense">✕</button>
      </div>
    </div>`;
}

/* ── Single delete ── */
function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  Storage.saveExpenses(expenses);
  update();
  showToast('🗑️ Expense deleted', 'default');
}

/* ── Bulk mode ── */
function toggleBulkMode() {
  bulkMode = !bulkMode;
  selectedIds.clear();
  document.getElementById('bulkBar').classList.toggle('show', bulkMode);
  renderList();
}

function cancelBulk() {
  bulkMode = false;
  selectedIds.clear();
  document.getElementById('bulkBar').classList.remove('show');
  renderList();
}

function toggleSelect(id, checked) {
  if (checked) selectedIds.add(id); else selectedIds.delete(id);
  document.getElementById('bulkInfo').textContent = `${selectedIds.size} selected`;
  renderList();
}

function bulkDelete() {
  if (!selectedIds.size) { showToast('⚠️ Select some expenses first', 'error'); return; }
  if (!confirm(`Delete ${selectedIds.size} expense${selectedIds.size !== 1 ? 's' : ''}?`)) return;
  expenses = expenses.filter(e => !selectedIds.has(e.id));
  Storage.saveExpenses(expenses);
  cancelBulk();
  update();
  showToast(`🗑️ ${selectedIds.size} expenses deleted`, 'default');
}

/* ── CSV Export ── */
function exportCSV() {
  if (!expenses.length) { showToast('⚠️ No expenses to export', 'error'); return; }

  const rows = [
    'Date,Name,Category,Amount,Split With,Recurring',
    ...expenses
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(e =>
        `${e.date},"${e.name.replace(/"/g, '""')}",${e.category},${e.amount},${e.splitWith || ''},${e.isRecurring ? 'Yes' : 'No'}`
      ),
  ].join('\n');

  const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
  const a   = Object.assign(document.createElement('a'), {
    href:     url,
    download: `spendsense_${todayStr()}.csv`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('📤 Exported to CSV!', 'success');
}

/* ── SMS / UPI import ── */
function importSMS() {
  document.getElementById('smsModal').classList.add('show');
}

function hideSMSModal() {
  document.getElementById('smsModal').classList.remove('show');
}

function parseSMS() {
  const text    = document.getElementById('smsInput').value;
  const preview = document.getElementById('smsPreview');

  // Common UPI / bank SMS patterns for ₹ amounts
  const patterns = [
    /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:debited|deducted|paid|spent)/gi,
    /(?:debited|deducted|paid)\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)/gi,
    /([\d,]+\.?\d*)\s*(?:INR|Rs\.?|₹)?\s*(?:debited|deducted|paid)/gi,
  ];

  const found   = [];
  const amounts = new Set();

  patterns.forEach(p => {
    p.lastIndex = 0;
    let match;
    while ((match = p.exec(text)) !== null) {
      const amt = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amt) && amt > 0 && !amounts.has(amt)) {
        amounts.add(amt);
        // Best-effort merchant detection
        const merchantMatch = text.match(/(?:to|for|at)\s+([A-Za-z0-9 ]+?)(?:\.|,|UPI|Ref|via|\d)/i);
        const name = merchantMatch ? merchantMatch[1].trim() : 'SMS Import';
        const cat  = detectCategory(name) || 'Other';
        found.push({ amount: amt, name, category: cat });
      }
    }
  });

  if (!found.length) {
    preview.textContent = '⚠️ No transaction amounts detected. Make sure you paste actual bank SMS messages.';
    return;
  }

  found.forEach(f => {
    expenses.push({ id: Date.now() + Math.random(), name: f.name, amount: f.amount, category: f.category, date: todayStr() });
  });

  Storage.saveExpenses(expenses);
  preview.textContent = `✅ Imported ${found.length} transaction${found.length !== 1 ? 's' : ''}. Review in the expense list.`;
  setTimeout(() => hideSMSModal(), 1800);
  update();
  showToast(`📱 ${found.length} transactions imported!`, 'success');
}
