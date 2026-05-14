/* ============================================================
   goals.js — SpendSense Premium AI
   Savings goals: add, progress tracking, delete, confetti on completion.
   ============================================================ */

/* ── Show / hide goal modal ── */
function showGoalForm()  { document.getElementById('goalModal').classList.add('show'); }
function hideGoalModal() { document.getElementById('goalModal').classList.remove('show'); }

/* ── Add a new goal ── */
function addGoal() {
  const name     = document.getElementById('goalName').value.trim();
  const target   = parseFloat(document.getElementById('goalTarget').value);
  const saved    = parseFloat(document.getElementById('goalSaved').value) || 0;
  const deadline = document.getElementById('goalDeadline').value;

  if (!name || !target || target <= 0) {
    showToast('❌ Fill in goal name and target amount', 'error');
    return;
  }

  goals.push({ id: Date.now(), name, target, saved, deadline });
  Storage.saveGoals(goals);

  // Clear form
  ['goalName', 'goalTarget', 'goalSaved', 'goalDeadline'].forEach(id => {
    document.getElementById(id).value = '';
  });

  hideGoalModal();
  renderGoals();
  showToast('🎯 Goal added!', 'success');
}

/* ── Add savings to an existing goal ── */
function addToGoal(id) {
  const g = goals.find(x => x.id === id);
  if (!g) return;

  const v = parseFloat(document.getElementById('gs_' + id)?.value);
  if (!v || v <= 0) { showToast('❌ Enter a valid amount', 'error'); return; }

  g.saved = Math.min(g.target, g.saved + v);
  Storage.saveGoals(goals);
  renderGoals();
  showToast(`💰 ${fmt(v)} added to "${g.name}"!`, 'success');

  if (g.saved >= g.target) {
    fireConfetti();
    setTimeout(() => showToast(`🎉 Goal "${g.name}" complete! You did it!`, 'success'), 300);
  }
}

/* ── Delete a goal ── */
function deleteGoal(id) {
  goals = goals.filter(g => g.id !== id);
  Storage.saveGoals(goals);
  renderGoals();
  showToast('🗑️ Goal removed', 'default');
}

/* ── Render goals grid ── */
function renderGoals() {
  const el = document.getElementById('goalsGrid');

  if (!goals.length) {
    el.innerHTML = '<div style="font-size:12px; color:var(--text2); text-align:center; padding:20px">No goals yet — add your first savings goal!</div>';
    return;
  }

  el.innerHTML = goals.map(g => {
    const pct       = Math.min(100, Math.round((g.saved / g.target) * 100));
    const remaining = g.target - g.saved;
    const deadline  = g.deadline
      ? `By ${parseDate(g.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}`
      : null;

    return `
      <div class="goal-card">
        <div class="goal-header">
          <span class="goal-name">${escapeHtml(g.name)}</span>
          <span class="goal-pct">${pct}%</span>
        </div>
        <div class="goal-bar">
          <div class="goal-fill" style="width:${pct}%"></div>
        </div>
        <div class="goal-meta">
          <span>${fmt(g.saved)} / ${fmt(g.target)}</span>
          <span style="color:var(--accent)">${fmt(remaining)} to go</span>
          ${deadline ? `<span class="goal-deadline">⏰ ${deadline}</span>` : ''}
        </div>
        <div style="margin-top:8px; display:flex; gap:6px">
          <input type="number" placeholder="Add savings ₹" class="field-input"
            style="font-size:12px; min-height:32px; flex:1" id="gs_${g.id}" />
          <button onclick="addToGoal(${g.id})"
            style="padding:0 12px; background:var(--accent); border:none; border-radius:8px; color:#fff; font-size:12px; cursor:pointer">
            +
          </button>
          <button onclick="deleteGoal(${g.id})"
            style="padding:0 12px; background:transparent; border:1px solid var(--border); border-radius:8px; color:var(--red); font-size:12px; cursor:pointer">
            ×
          </button>
        </div>
      </div>`;
  }).join('');
}
