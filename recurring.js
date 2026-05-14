/* ============================================================
   recurring.js — SpendSense Premium AI
   Recurring expense rendering, deletion, and auto-processing.
   ============================================================ */

/* ── Render recurring list ── */
function renderRecurring() {
  const el = document.getElementById('recurringList');

  if (!recurringList.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-emoji" style="font-size:36px">🔄</div>
        <p style="font-size:13px">No recurring expenses.<br />Add one via the expense form.</p>
      </div>`;
    return;
  }

  el.innerHTML = recurringList.map(r => {
    const cat = CAT[r.category] || CAT.Other;
    return `
      <div class="expense-item">
        <div class="cat-badge" style="background:${cat.bg}">${cat.emoji}</div>
        <div class="expense-info">
          <div class="expense-name">${escapeHtml(r.name)}</div>
          <div class="expense-meta">
            <span class="expense-badge badge-recur">🔄 ${r.freq}</span>
            <span>${escapeHtml(r.category)}</span>
          </div>
        </div>
        <div class="expense-right">
          <div class="expense-amount" style="color:${cat.color}">${fmt(r.amount)}</div>
          <button class="delete-btn" style="opacity:1"
            onclick="deleteRecurring(${r.id})" title="Remove recurring" aria-label="Remove recurring">✕</button>
        </div>
      </div>`;
  }).join('');
}

/* ── Delete a recurring rule ── */
function deleteRecurring(id) {
  recurringList = recurringList.filter(r => r.id !== id);
  Storage.saveRecurring(recurringList);
  renderRecurring();
  showToast('🗑️ Recurring expense removed', 'default');
}

/* ── Should this recurring rule fire today? ── */
function shouldAddToday(r) {
  const today    = new Date();
  const todayKey = todayStr();

  // Don't double-add on the same day
  const alreadyAdded = expenses.some(e => e.date === todayKey && e.name === r.name && e.isRecurAuto);
  if (alreadyAdded) return false;

  if (r.freq === 'daily')                              return true;
  if (r.freq === 'monthly'  && today.getDate() === 1)  return true;
  if (r.freq === 'weekly'   && today.getDay()  === 1)  return true;

  return false;
}

/* ── Process all recurring rules on app load ── */
function processRecurring() {
  let added = 0;

  recurringList.forEach(r => {
    if (shouldAddToday(r)) {
      expenses.push({
        id:          Date.now() + Math.random(),
        name:        r.name,
        amount:      r.amount,
        category:    r.category,
        date:        todayStr(),
        isRecurring: true,
        isRecurAuto: true,
      });
      added++;
    }
  });

  if (added > 0) {
    Storage.saveExpenses(expenses);
    showToast(`🔄 ${added} recurring expense${added !== 1 ? 's' : ''} auto-added`, 'default');
  }
}

/* ── Toggle split field ── */
function toggleSplit() {
  const checked = document.getElementById('splitToggle').checked;
  document.getElementById('splitWith').style.display = checked ? 'block' : 'none';
}

/* ── Toggle recur frequency dropdown ── */
function toggleRecur() {
  const checked = document.getElementById('recurToggle').checked;
  document.getElementById('recurFreq').classList.toggle('show', checked);
}
