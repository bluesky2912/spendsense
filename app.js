/* ============================================================
   app.js — SpendSense Premium AI
   Global state, init, core actions (add/save/clear),
   tab switching, quick-add float, achievements, toast,
   confetti, theme toggle, keyboard shortcuts.
   ============================================================ */

/* ══════════════════════════════════════
   GLOBAL STATE
══════════════════════════════════════ */
let expenses      = [];
let budget        = { monthly: 20000, weekly: 5000 };
let savageMode    = false;
let unlocked      = [];
let goals         = [];
let catBudgets    = {};
let recurringList = [];
let lightMode     = false;

/* Bulk-select state (used by expenseList.js) */
let bulkMode    = false;
let selectedIds = new Set();

/* Active tab */
let currentTab = 'dashboard';

/* Quick-add float state */
let quickOpen = false;

/* ══════════════════════════════════════
   CATEGORY SELECTOR
══════════════════════════════════════ */
function selectCat(btn) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('expCategory').value = btn.dataset.cat;
}

function selectCatByName(catName) {
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === catName);
  });
  document.getElementById('expCategory').value = catName;
}

/* ══════════════════════════════════════
   ADD EXPENSE
══════════════════════════════════════ */
function addExpense() {
  const name      = document.getElementById('expName').value.trim();
  const amount    = parseFloat(document.getElementById('expAmount').value);
  const category  = document.getElementById('expCategory').value;
  const date      = document.getElementById('expDate').value;
  const isRecurring = document.getElementById('recurToggle').checked;
  const recurFreq   = document.getElementById('recurFreq').value;
  const isSplit     = document.getElementById('splitToggle').checked;
  const splitWith   = isSplit ? document.getElementById('splitPerson').value.trim() : '';

  /* Validation */
  if (!name)              { showToast('❌ Please enter a description', 'error'); shakeInput('expName');   return; }
  if (!amount || amount <= 0) { showToast('❌ Enter a valid amount', 'error');  shakeInput('expAmount'); return; }
  if (!date)              { showToast('❌ Please select a date', 'error');                               return; }

  /* Build expense object */
  const exp = { id: Date.now(), name, amount, category, date };
  if (splitWith)   exp.splitWith   = splitWith;
  if (isRecurring) exp.isRecurring = true;

  /* If recurring, also add to recurring rules */
  if (isRecurring) {
    recurringList.push({ id: Date.now() + 1, name, amount, category, freq: recurFreq });
    Storage.saveRecurring(recurringList);
    renderRecurring();
  }

  expenses.push(exp);
  Storage.saveExpenses(expenses);

  /* Reset form fields */
  document.getElementById('expName').value   = '';
  document.getElementById('expAmount').value = '';
  document.getElementById('autoDetectHint').textContent = '';

  /* Toast */
  const msg = savageMode ? getSavageLine(category) : '✅ Expense added!';
  showToast(msg, savageMode ? 'savage' : 'success');

  /* Button bounce */
  const btn = document.querySelector('.add-btn');
  btn.style.transform = 'scale(0.95)';
  setTimeout(() => (btn.style.transform = ''), 150);

  update();
  checkAchievements();
  checkAnomaly();
  updateQuickPills();

  /* Milestone confetti */
  if (expenses.length === 1 || expenses.length % 10 === 0) fireConfetti();
}

/* ══════════════════════════════════════
   BUDGET
══════════════════════════════════════ */
function saveBudget() {
  const m = parseFloat(document.getElementById('monthlyBudget').value);
  const w = parseFloat(document.getElementById('weeklyBudget').value);
  if (m > 0) budget.monthly = m;
  if (w > 0) budget.weekly  = w;
  Storage.saveBudget(budget);
  update();
  showToast('💾 Budget saved!', 'success');
}

/* ══════════════════════════════════════
   SAVAGE MODE
══════════════════════════════════════ */
function toggleSavage() {
  savageMode = !savageMode;
  Storage.setSavageMode(savageMode);
  document.getElementById('savageToggle').classList.toggle('active', savageMode);
  update();
  showToast(
    savageMode ? '😈 Savage Mode: ON — no mercy.' : '😇 Savage Mode: OFF — boring.',
    savageMode ? 'savage' : 'default'
  );
}

/* ══════════════════════════════════════
   CLEAR ALL
══════════════════════════════════════ */
function clearAll() {
  if (!confirm('⚠️ Delete ALL data? This cannot be undone.')) return;

  expenses      = [];
  budget        = { monthly: 20000, weekly: 5000 };
  savageMode    = false;
  unlocked      = [];
  goals         = [];
  catBudgets    = {};
  recurringList = [];

  Storage.clearAll();

  document.getElementById('monthlyBudget').value = 20000;
  document.getElementById('weeklyBudget').value  = 5000;
  document.getElementById('savageToggle').classList.remove('active');

  update();
  showToast('🗑️ All data cleared', 'default');
}

/* ══════════════════════════════════════
   ACHIEVEMENTS
══════════════════════════════════════ */
function checkAchievements() {
  ACHIEVEMENTS.forEach(a => {
    if (!unlocked.includes(a.id) && a.check(expenses, budget)) {
      unlocked.push(a.id);
      Storage.saveUnlocked(unlocked);
      setTimeout(() => {
        showToast(`${a.emoji} Achievement: ${a.title} — ${a.desc}`, 'success');
        fireConfetti();
      }, 400);
    }
  });
}

/* ══════════════════════════════════════
   TAB SWITCHING
══════════════════════════════════════ */
function switchTab(tab, btn) {
  /* Hide all tab panels */
  ['dashboard', 'ai', 'analytics', 'goals', 'recurring'].forEach(t => {
    document.getElementById('tab-' + t).style.display = 'none';
  });

  /* Deactivate all nav buttons */
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));

  /* Show selected tab */
  document.getElementById('tab-' + tab).style.display = 'block';
  if (btn) btn.classList.add('active');
  currentTab = tab;

  /* Lazy-render analytics widgets only when tab is visible */
  if (tab === 'analytics') {
    updateMoM();
    renderCatBudgetInputs();
    renderCatBudgetBars();
    updateReportCard();
    updateNoSpendChallenge();
  }

  if (tab === 'goals')     renderGoals();
  if (tab === 'recurring') renderRecurring();
}

/* ══════════════════════════════════════
   QUICK-ADD FLOAT BUTTON
══════════════════════════════════════ */
function toggleQuickAdd() {
  quickOpen = !quickOpen;
  document.getElementById('quickPills').classList.toggle('open', quickOpen);
  document.getElementById('quickAddBtn').textContent = quickOpen ? '×' : '+';
}

function updateQuickPills() {
  const el       = document.getElementById('quickPills');
  const lastCats = [...new Set(expenses.slice(-10).map(e => e.category))].slice(0, 3);
  if (!lastCats.length) return;

  el.innerHTML = lastCats.map(cat => `
    <button class="quick-pill" onclick="quickAddCat('${cat}')">
      ${CAT[cat]?.emoji || ''} ${cat}
    </button>`).join('');
}

function quickAddCat(cat) {
  selectCatByName(cat);

  /* Close the pill tray */
  quickOpen = false;
  document.getElementById('quickPills').classList.remove('open');
  document.getElementById('quickAddBtn').textContent = '+';

  /* Switch to dashboard so user can fill amount */
  switchTab('dashboard', document.querySelector('.nav-tab'));

  /* Focus the amount field */
  document.getElementById('expAmount').focus();

  showToast(`${CAT[cat]?.emoji} ${cat} selected — enter the amount`, 'default');
}

/* ══════════════════════════════════════
   THEME TOGGLE
══════════════════════════════════════ */
function toggleTheme() {
  lightMode = !lightMode;
  document.body.classList.toggle('light', lightMode);
  Storage.saveTheme(lightMode);

  const btn   = document.querySelector('.theme-btn');
  const label = document.getElementById('themeLabel');

  if (lightMode) {
    btn.childNodes[0].textContent = '🌙 ';
    label.textContent = 'Dark';
  } else {
    btn.childNodes[0].textContent = '☀️ ';
    label.textContent = 'Light';
  }
}

/* ══════════════════════════════════════
   KEYBOARD SHORTCUTS MODAL
══════════════════════════════════════ */
function showShortcuts() { document.getElementById('shortcutsModal').classList.add('show'); }
function hideShortcuts() { document.getElementById('shortcutsModal').classList.remove('show'); }

/* ══════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════ */
function showToast(msg, type = 'default') {
  const container = document.getElementById('toastContainer');
  const t         = document.createElement('div');
  t.className     = `toast toast-${type}`;
  t.textContent   = msg;
  container.appendChild(t);

  /* Cap at 3 visible toasts */
  const toasts = container.querySelectorAll('.toast');
  if (toasts.length > 3) toasts[0].remove();

  setTimeout(() => {
    t.style.transition = 'opacity 0.4s, transform 0.4s';
    t.style.opacity    = '0';
    t.style.transform  = 'translateX(20px)';
    setTimeout(() => t.remove(), 400);
  }, 3200);
}

/* ══════════════════════════════════════
   SHAKE INVALID INPUT
══════════════════════════════════════ */
function shakeInput(id) {
  const el = document.getElementById(id);
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shakeField 0.4s ease';
  setTimeout(() => (el.style.animation = ''), 400);
}

/* ══════════════════════════════════════
   CONFETTI
══════════════════════════════════════ */
function fireConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = ['#6c63ff', '#a78bfa', '#00e5a0', '#ff6b9d', '#ffd166', '#ff8c42'];

  const particles = Array.from({ length: 120 }, () => ({
    x:    Math.random() * canvas.width,
    y:    -10,
    r:    Math.random() * 8 + 4,
    d:    Math.random() * 80 + 40,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    tilt: Math.random() * 10 - 10,
    tiltAngle:          0,
    tiltAngleIncrement: Math.random() * 0.07 + 0.05,
  }));

  let frame;
  let tick = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.tiltAngle += p.tiltAngleIncrement;
      p.y         += Math.cos(tick / 20 + p.d) * 1.5 + 2;
      p.tilt       = Math.sin(p.tiltAngle) * 12;

      ctx.beginPath();
      ctx.lineWidth   = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();
    });

    tick++;
    if (tick < 180) {
      frame = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  cancelAnimationFrame(frame);
  tick = 0;
  draw();
}

/* ══════════════════════════════════════
   MASTER UPDATE — called after every data change
══════════════════════════════════════ */
function update() {
  updateHero();
  updateStats();
  updateStreak();
  updateInsights();
  updateHeatmap();
  updateForecast();
  renderCharts();
  renderList();

  /* Only re-render analytics widgets if that tab is currently visible */
  if (currentTab === 'analytics') {
    updateMoM();
    renderCatBudgetBars();
    updateReportCard();
    updateNoSpendChallenge();
  }
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
window.addEventListener('load', () => {
  /* Load persisted state */
  expenses      = Storage.getExpenses();
  budget        = Storage.getBudget();
  savageMode    = Storage.getSavageMode();
  unlocked      = Storage.getUnlocked();
  goals         = Storage.getGoals();
  catBudgets    = Storage.getCatBudgets();
  recurringList = Storage.getRecurring();
  lightMode     = Storage.getTheme();

  /* Apply theme */
  if (lightMode) {
    document.body.classList.add('light');
    document.getElementById('themeLabel').textContent = 'Dark';
  }

  /* Savage toggle */
  if (savageMode) document.getElementById('savageToggle').classList.add('active');

  /* Pre-fill budget inputs */
  document.getElementById('monthlyBudget').value = budget.monthly;
  document.getElementById('weeklyBudget').value  = budget.weekly;

  /* Default date to today */
  document.getElementById('expDate').value = todayStr();

  /* Inject shake keyframe */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shakeField {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-8px); }
      40%      { transform: translateX(8px); }
      60%      { transform: translateX(-5px); }
      80%      { transform: translateX(5px); }
    }`;
  document.head.appendChild(style);

  /* Auto-add any due recurring expenses */
  processRecurring();

  /* First render */
  update();
  updateQuickPills();

  /* Staggered entrance animation for cards */
  document.querySelectorAll('.stat-pill, .panel, .list-section').forEach((el, i) => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(20px)';
    setTimeout(() => {
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      el.style.opacity    = '1';
      el.style.transform  = 'translateY(0)';
    }, 100 + i * 60);
  });
});

/* ══════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════ */
document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName;

  /* '?' opens shortcuts modal from anywhere except inputs */
  if (e.key === '?' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
    showShortcuts();
    return;
  }

  /* Escape closes any open modal */
  if (e.key === 'Escape') {
    hideShortcuts();
    hideGoalModal();
    hideSMSModal();
    return;
  }

  /* Ctrl / Cmd + Enter → add expense */
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    addExpense();
    return;
  }

  /* Alt shortcuts */
  if (e.altKey) {
    switch (e.key) {
      case 'n': e.preventDefault(); document.getElementById('expName').focus();   break;
      case 'a': e.preventDefault(); document.getElementById('expAmount').focus(); break;
      case 'c': e.preventDefault(); switchTab('ai',        document.querySelectorAll('.nav-tab')[1]); break;
      case '1': e.preventDefault(); switchTab('dashboard', document.querySelectorAll('.nav-tab')[0]); break;
      case '2': e.preventDefault(); switchTab('ai',        document.querySelectorAll('.nav-tab')[1]); break;
      case '3': e.preventDefault(); switchTab('analytics', document.querySelectorAll('.nav-tab')[2]); break;
      case '4': e.preventDefault(); switchTab('goals',     document.querySelectorAll('.nav-tab')[3]); break;
      case '5': e.preventDefault(); switchTab('recurring', document.querySelectorAll('.nav-tab')[4]); break;
      case 'e': e.preventDefault(); exportCSV();     break;
      case 's': e.preventDefault(); toggleSavage();  break;
    }
  }
});
