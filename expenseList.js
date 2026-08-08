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

  // FIXED: this average used to be recomputed inside buildExpenseItem()
  // for every single row (O(n²) on render). Compute once, pass it down.
  const avg = expenses.length > 3
    ? expenses.reduce((s, x) => s + x.amount, 0) / expenses.length
    : 0;

  listEl.innerHTML = filtered.map(e => buildExpenseItem(e, avg)).join('');
}

/* ── Build a single expense row ── */
function buildExpenseItem(e, avg = 0) {
  const cat     = CAT[e.category] || CAT.Other;
  const d       = parseDate(e.date);
  const isToday = e.date === todayStr();
  const dateStr = isToday
    ? 'Today'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

  // Anomaly badge
  const isAnomalous = avg > 0 && e.amount > avg * 2.5 && expenses.length > 5;

  const moodEmoji = { happy: '😊', meh: '😐', regret: '😔' };
  const paymentEmoji = { Cash: '💵', Card: '💳', UPI: '📲' };
  const badges = [
    e.isRecurring ? '<span class="expense-badge badge-recur">🔄 recurring</span>' : '',
    e.splitWith   ? `<span class="expense-badge badge-split">🔀 split w/ ${escapeHtml(e.splitWith)}</span>` : '',
    isAnomalous   ? '<span class="expense-badge badge-anomaly">⚠️ large</span>' : '',
    e.mood        ? `<span class="expense-badge badge-mood">${moodEmoji[e.mood]}</span>` : '',
    e.paymentMethod ? `<span class="expense-badge badge-payment">${paymentEmoji[e.paymentMethod]} ${e.paymentMethod}</span>` : '',
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
        <div class="expense-item-actions">
          <button class="edit-btn" onclick="openEditExpense(${e.id})" title="Edit" aria-label="Edit expense">✏️</button>
          <button class="dup-btn" onclick="duplicateExpense(${e.id})" title="Duplicate" aria-label="Duplicate expense">⧉</button>
          <button class="delete-btn" onclick="deleteExpense(${e.id})" title="Delete" aria-label="Delete expense">✕</button>
        </div>
      </div>
    </div>`;
}

/* ── Edit expense ── */
let editingId = null;

function openEditExpense(id) {
  const e = expenses.find(x => x.id === id);
  if (!e) return;
  editingId = id;

  document.getElementById('editName').value   = e.name;
  document.getElementById('editAmount').value = e.amount;
  document.getElementById('editDate').value   = e.date;
  document.getElementById('editPayment').value = e.paymentMethod || '';

  const sel = document.getElementById('editCategory');
  sel.innerHTML = Object.keys(CAT).map(c =>
    `<option value="${c}" ${c === e.category ? 'selected' : ''}>${CAT[c].emoji} ${c}</option>`
  ).join('');

  document.getElementById('editModal').classList.add('show');
}

function hideEditModal() {
  document.getElementById('editModal').classList.remove('show');
  editingId = null;
}

function saveEditExpense() {
  if (editingId == null) return;
  const e = expenses.find(x => x.id === editingId);
  if (!e) return;

  const name     = document.getElementById('editName').value.trim();
  const amount   = parseFloat(document.getElementById('editAmount').value);
  const category = document.getElementById('editCategory').value;
  const date     = document.getElementById('editDate').value;
  const paymentMethod = document.getElementById('editPayment').value;

  if (!name)                  { showToast('❌ Enter a description', 'error');  return; }
  if (!amount || amount <= 0) { showToast('❌ Enter a valid amount', 'error'); return; }
  if (!date)                  { showToast('❌ Select a date', 'error');       return; }

  e.name = name; e.amount = amount; e.category = category; e.date = date;
  if (paymentMethod) e.paymentMethod = paymentMethod;
  else delete e.paymentMethod;
  Storage.saveExpenses(expenses);
  if (typeof markDailyAction === 'function') markDailyAction('edited');
  hideEditModal();
  update();
  showToast('✏️ Expense updated', 'success');
}

/* ── Duplicate expense (same details, dated today) ── */
function duplicateExpense(id) {
  const src = expenses.find(e => e.id === id);
  if (!src) return;
  const copy = { ...src, id: genId(), date: todayStr() };
  delete copy.isRecurAuto;
  expenses.push(copy);
  Storage.saveExpenses(expenses);
  if (typeof markDailyAction === 'function') markDailyAction('duplicated');
  update();
  showToast('⧉ Expense duplicated', 'success');
  checkAchievements();
}

/* ── Undo support (shared by single + bulk delete) ── */
let lastRemoved      = null; // array of { item, index } in ascending index order
let lastRemovedTimer = null;

function stashForUndo(items) {
  lastRemoved = items;
  clearTimeout(lastRemovedTimer);
  lastRemovedTimer = setTimeout(() => { lastRemoved = null; }, 6000);
}

function undoDelete() {
  if (!lastRemoved) return;
  lastRemoved.forEach(({ item, index }) => expenses.splice(index, 0, item));
  const n = lastRemoved.length;
  lastRemoved = null;
  clearTimeout(lastRemovedTimer);
  Storage.saveExpenses(expenses);
  update();
  showToast(`↩️ ${n} expense${n !== 1 ? 's' : ''} restored`, 'success');
}

/* ── Single delete ── */
function deleteExpense(id) {
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return;
  stashForUndo([{ item: expenses[idx], index: idx }]);
  expenses.splice(idx, 1);
  Storage.saveExpenses(expenses);
  update();
  showToast('🗑️ Expense deleted', 'default', { label: 'Undo', onClick: undoDelete });
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

  const removed = [];
  expenses.forEach((e, i) => { if (selectedIds.has(e.id)) removed.push({ item: e, index: i }); });
  stashForUndo(removed);

  const n = selectedIds.size;
  expenses = expenses.filter(e => !selectedIds.has(e.id));
  Storage.saveExpenses(expenses);
  cancelBulk();
  update();
  showToast(`🗑️ ${n} expenses deleted`, 'default', { label: 'Undo', onClick: undoDelete });
}

/* ── CSV Export ── */
// FIXED: splitWith (free-text, user-entered) wasn't escaped, so a name
// containing a comma or quote would corrupt the CSV row layout.
function csvField(val) {
  const s = String(val ?? '');
  return `"${s.replace(/"/g, '""')}"`;
}

function exportCSV() {
  if (!expenses.length) { showToast('⚠️ No expenses to export', 'error'); return; }

  const rows = [
    'Date,Name,Category,Amount,Payment Method,Split With,Recurring',
    ...expenses
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(e =>
        [
          e.date,
          csvField(e.name),
          e.category,
          e.amount,
          e.paymentMethod || '',
          csvField(e.splitWith || ''),
          e.isRecurring ? 'Yes' : 'No',
        ].join(',')
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

// FIXED: previously the merchant regex ran once against the *entire*
// pasted text, so if multiple SMS messages were pasted together every
// parsed transaction got the same (first) merchant name. Now each match's
// merchant is pulled from a window of text right around that specific match.
function extractMerchantNear(text, matchIndex) {
  const windowStart = Math.max(0, matchIndex - 60);
  const windowEnd   = Math.min(text.length, matchIndex + 60);
  const chunk = text.slice(windowStart, windowEnd);
  const merchantMatch = chunk.match(/(?:to|for|at)\s+([A-Za-z0-9 ]+?)(?:\.|,|UPI|Ref|via|\d)/i);
  return merchantMatch ? merchantMatch[1].trim() : 'SMS Import';
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
        const name = extractMerchantNear(text, match.index);
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
    expenses.push({ id: genId(), name: f.name, amount: f.amount, category: f.category, date: todayStr() });
  });

  Storage.saveExpenses(expenses);
  preview.textContent = `✅ Imported ${found.length} transaction${found.length !== 1 ? 's' : ''}. Review in the expense list.`;
  setTimeout(() => hideSMSModal(), 1800);
  update();
  showToast(`📱 ${found.length} transactions imported!`, 'success');
}