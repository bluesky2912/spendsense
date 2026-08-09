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
let xp             = 0;
let incomes        = [];
let settlements     = [];

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
  const mood        = document.getElementById('expMood').value;
  const paymentMethod = document.getElementById('expPayment').value;

  /* Validation */
  if (!name)              { showToast('❌ Please enter a description', 'error'); shakeInput('expName');   return; }
  if (!amount || amount <= 0) { showToast('❌ Enter a valid amount', 'error');  shakeInput('expAmount'); return; }
  if (!date)              { showToast('❌ Please select a date', 'error');                               return; }

  /* Build expense object */
  const exp = { id: genId(), name, amount, category, date };
  if (splitWith)   exp.splitWith   = splitWith;
  if (isRecurring) exp.isRecurring = true;
  if (mood)        exp.mood        = mood;
  if (paymentMethod) exp.paymentMethod = paymentMethod;

  /* If recurring, also add to recurring rules */
  if (isRecurring) {
    recurringList.push({ id: genId(), name, amount, category, freq: recurFreq });
    Storage.saveRecurring(recurringList);
    renderRecurring();
  }

  /* Check for a likely accidental duplicate before adding */
  const possibleDup = expenses.find(e =>
    e.amount === amount && e.category === category && e.date === date &&
    e.name.trim().toLowerCase() === name.trim().toLowerCase()
  );

  expenses.push(exp);
  Storage.saveExpenses(expenses);

  /* Reset form fields */
  document.getElementById('expName').value   = '';
  document.getElementById('expAmount').value = '';
  document.getElementById('autoDetectHint').textContent = '';
  resetMoodSelector();
  resetPaymentSelector();

  addXP(5);
  fireCoinBurst();

  /* Toast */
  const msg = savageMode ? getSavageLine(category) : '✅ Expense added!';
  showToast(msg, savageMode ? 'savage' : 'success');

  if (possibleDup) {
    const newId = exp.id;
    setTimeout(() => {
      showToast(`⚠️ Looks like a duplicate of "${possibleDup.name}" you already logged today`, 'error', {
        label: 'Remove it', onClick: () => deleteExpense(newId),
      });
    }, 500);
  }

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
  const emojiEl = document.getElementById('savageEmoji');
  if (emojiEl) emojiEl.textContent = savageMode ? '😈' : '😇';
  update();
  showToast(
    savageMode ? '😈 Savage Mode: ON — no mercy.' : '😇 Savage Mode: OFF — boring.',
    savageMode ? 'savage' : 'default'
  );

  if (savageMode) {
    const appEl = document.querySelector('.app');
    appEl.classList.remove('glitch');
    void appEl.offsetWidth;
    appEl.classList.add('glitch');
    setTimeout(() => appEl.classList.remove('glitch'), 450);
    fireConfetti();
  }
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
  xp            = 0;
  incomes       = [];
  settlements   = [];

  Storage.clearAll();

  document.getElementById('monthlyBudget').value = 20000;
  document.getElementById('weeklyBudget').value  = 5000;
  document.getElementById('savageToggle').classList.remove('active');
  const savageEmojiEl = document.getElementById('savageEmoji');
  if (savageEmojiEl) savageEmojiEl.textContent = '😇';
  const notesEl = document.getElementById('quickNotes');
  if (notesEl) notesEl.value = '';

  update();
  updateLevelBadge();
  renderIncomeList();
  if (typeof chatHistory !== 'undefined') chatHistory = [];
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
      addXP(40);
      setTimeout(() => {
        showToast(`${a.emoji} Achievement: ${a.title} — ${a.desc}`, 'success');
        fireConfetti();
      }, 400);
    }
  });
}

/* ══════════════════════════════════════
   QUICK NOTES — a simple scratchpad, auto-saves as you type, and
   can remind you about it a day later if you never came back to it.
══════════════════════════════════════ */
let notesSaveTimer = null;
const NOTE_REMINDER_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

function initQuickNotes() {
  const el = document.getElementById('quickNotes');
  if (!el) return;
  el.value = Storage.getNotes();
  autoGrowNotes(el);
  updateReminderButtonState();

  el.addEventListener('input', () => {
    autoGrowNotes(el);
    clearTimeout(notesSaveTimer);
    notesSaveTimer = setTimeout(() => {
      Storage.saveNotes(el.value);
      /* New content = restart the reminder countdown */
      Storage.saveNotesMeta({ savedAt: new Date().toISOString(), remindedAt: null });
      flashNotesSaved();
      if (typeof markDailyAction === 'function') markDailyAction('wroteNote');
    }, 600);
  });

  checkNoteReminder();
  setInterval(checkNoteReminder, 15 * 60 * 1000); // re-check every 15 min while the app is open
}

function autoGrowNotes(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 320) + 'px';
}

function flashNotesSaved() {
  const badge = document.getElementById('notesSavedBadge');
  if (!badge) return;
  badge.style.opacity = '1';
  clearTimeout(badge._hideTimer);
  badge._hideTimer = setTimeout(() => { badge.style.opacity = '0'; }, 1400);
}

function enableNoteReminders() {
  if (!('Notification' in window)) {
    showToast('⚠️ Your browser doesn\'t support notifications — you\'ll still get in-app reminders', 'error');
    return;
  }
  Notification.requestPermission().then(perm => {
    updateReminderButtonState();
    if (perm === 'granted') showToast('🔔 Reminders enabled — you\'ll also get a system notification', 'success');
    else if (perm === 'denied') showToast('🔕 Notifications blocked — you\'ll still get in-app reminders when you open the app', 'default');
  });
}

function updateReminderButtonState() {
  const btn = document.getElementById('notesRemindBtn');
  const txt = document.getElementById('notesRemindText');
  if (!btn) return;
  const supported = 'Notification' in window;
  const granted = supported && Notification.permission === 'granted';
  btn.classList.toggle('enabled', granted);
  btn.textContent = granted ? 'Enabled ✓' : 'Enable';
  if (txt) txt.textContent = granted
    ? '🔔 You\'ll be reminded about unfinished notes after a day'
    : '🔔 Get reminded about this note after a day if you haven\'t cleared it';
}

/* Checked on load and every 15 min while the app stays open — this
   is best-effort by nature (a static site can't wake a fully closed
   browser); it catches things the moment the app is next opened, and
   fires a real system notification too if the tab is merely
   backgrounded and permission was granted. */
function checkNoteReminder() {
  const text = Storage.getNotes();
  if (!text || !text.trim()) return;

  const meta = Storage.getNotesMeta();
  if (!meta.savedAt || meta.remindedAt) return;

  const age = Date.now() - new Date(meta.savedAt).getTime();
  if (age < NOTE_REMINDER_DELAY_MS) return;

  const preview = text.trim().slice(0, 80) + (text.trim().length > 80 ? '…' : '');
  showToast(`📌 You wrote a note a while back — still on it? "${preview}"`, 'default', {
    label: 'Got it', onClick: () => {},
  });

  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('📌 SpendSense reminder', { body: preview, icon: 'icon-192.png' }); } catch (e) { /* ignore */ }
  }

  Storage.saveNotesMeta({ ...meta, remindedAt: new Date().toISOString() });
}

/* ══════════════════════════════════════
   HEADER "MORE" MENU (mobile-collapsed utility icons)
══════════════════════════════════════ */
function toggleHeaderMenu(e) {
  if (e) e.stopPropagation();
  const dd  = document.getElementById('headerDropdown');
  const btn = document.querySelector('.more-btn');
  if (!dd || !btn) return;

  const opening = !dd.classList.contains('show');
  if (opening) {
    const r = btn.getBoundingClientRect();
    const ddWidth = Math.min(190, window.innerWidth - 24);
    let left = r.left;
    if (left + ddWidth > window.innerWidth - 12) left = window.innerWidth - ddWidth - 12;
    if (left < 12) left = 12;

    dd.style.position = 'fixed';
    dd.style.left  = left + 'px';
    dd.style.right = 'auto';
    dd.style.top   = (r.bottom + 8) + 'px';
    dd.style.width = ddWidth + 'px';
  }
  dd.classList.toggle('show');
}
function closeHeaderMenu() {
  document.getElementById('headerDropdown')?.classList.remove('show');
}
document.addEventListener('click', e => {
  const dd  = document.getElementById('headerDropdown');
  const btn = document.querySelector('.more-btn');
  if (dd && dd.classList.contains('show') && !dd.contains(e.target) && e.target !== btn) {
    dd.classList.remove('show');
  }
});

/* ══════════════════════════════════════
   TAB SWITCHING
══════════════════════════════════════ */
function switchTab(tab, btn) {
  /* Hide all tab panels */
  ['dashboard', 'ai', 'analytics', 'goals', 'recurring', 'split'].forEach(t => {
    document.getElementById('tab-' + t).style.display = 'none';
  });

  /* Deactivate all nav buttons */
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));

  /* Show selected tab, with a springy entrance */
  const panel = document.getElementById('tab-' + tab);
  panel.style.display = 'block';
  panel.classList.remove('tab-anim');
  void panel.offsetWidth; // force reflow so the animation restarts
  panel.classList.add('tab-anim');

  if (btn) { btn.classList.add('active'); moveNavIndicator(btn); }
  currentTab = tab;

  /* Lazy-render analytics widgets only when tab is visible */
  if (tab === 'analytics') {
    if (typeof markDailyAction === 'function') markDailyAction('visitedAnalytics');
    renderSmartInsights();
    updatePaymentBreakdown();
    updateMoM();
    renderCatBudgetInputs();
    renderCatBudgetBars();
    updateReportCard();
    updateNoSpendChallenge();
    renderWeeklyRecap();
    updateCashflowStats();
    renderCashFlowChart();
  }

  if (tab === 'goals')     renderGoals();
  if (tab === 'recurring') { renderRecurring(); renderRecurringSuggestions(); }
  if (tab === 'split')     renderSplitTab();
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
function showToast(msg, type = 'default', action = null) {
  const container = document.getElementById('toastContainer');
  const t          = document.createElement('div');
  t.className      = `toast toast-${type}`;

  const msgSpan       = document.createElement('span');
  msgSpan.className   = 'toast-msg';
  msgSpan.textContent = msg;
  t.appendChild(msgSpan);

  if (action) {
    const btn = document.createElement('button');
    btn.className   = 'toast-action';
    btn.textContent = action.label;
    btn.onclick = ev => {
      ev.stopPropagation();
      action.onClick();
      t.remove();
    };
    t.appendChild(btn);
  }

  container.appendChild(t);

  /* Cap at 3 visible toasts */
  const toasts = container.querySelectorAll('.toast');
  if (toasts.length > 3) toasts[0].remove();

  setTimeout(() => {
    t.style.transition = 'opacity 0.4s, transform 0.4s';
    t.style.opacity    = '0';
    t.style.transform  = 'translateX(20px)';
    setTimeout(() => t.remove(), 400);
  }, action ? 6000 : 3200);
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
   SETTLE BURST — handshake particles fire when a split is settled
══════════════════════════════════════ */
function fireSettleBurst(originEl) {
  const r = (originEl || document.querySelector('.settle-btn'))?.getBoundingClientRect();
  if (!r) return;
  const originX = r.left + r.width / 2;
  const originY = r.top;
  const emojis = ['🤝', '✨', '💚'];

  for (let i = 0; i < 10; i++) {
    const span = document.createElement('span');
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    span.className = 'coin-particle';
    const dx = (Math.random() - 0.5) * 200;
    const dy = -(Math.random() * 140 + 70);
    span.style.left = originX + 'px';
    span.style.top  = originY + 'px';
    span.style.setProperty('--dx', dx + 'px');
    span.style.setProperty('--dy', dy + 'px');
    document.body.appendChild(span);
    setTimeout(() => span.remove(), 950);
  }
}

/* ══════════════════════════════════════
   COIN BURST — a small satisfying reward every time you log a spend
══════════════════════════════════════ */
function fireCoinBurst() {
  const btn = document.querySelector('.add-btn');
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  const originX = r.left + r.width / 2;
  const originY = r.top;
  const emojis = ['🪙', '💰'];

  for (let i = 0; i < 8; i++) {
    const span = document.createElement('span');
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    span.className = 'coin-particle';
    const dx = (Math.random() - 0.5) * 160;
    const dy = -(Math.random() * 120 + 60);
    span.style.left = originX + 'px';
    span.style.top  = originY + 'px';
    span.style.setProperty('--dx', dx + 'px');
    span.style.setProperty('--dy', dy + 'px');
    document.body.appendChild(span);
    setTimeout(() => span.remove(), 900);
  }
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
   LIQUID NAV INDICATOR — slides/resizes to sit behind the active tab
══════════════════════════════════════ */
function moveNavIndicator(btn) {
  const indicator = document.getElementById('navIndicator');
  if (!indicator || !btn) return;
  indicator.style.width     = btn.offsetWidth + 'px';
  indicator.style.transform = `translateX(${btn.offsetLeft - 4}px)`;
}

window.addEventListener('resize', () => {
  const active = document.querySelector('.nav-tab.active');
  if (active) moveNavIndicator(active);
});

/* ══════════════════════════════════════
   MAGNETIC BUTTONS — primary CTAs gently follow the cursor,
   then spring back on mouseleave. Desktop/mouse only.
══════════════════════════════════════ */
const MAGNETIC_SELECTOR = '.add-btn, .quick-add-main, .save-budget-btn, .ai-send-btn';

function initMagneticButtons() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll(MAGNETIC_SELECTOR).forEach(el => {
    if (el.dataset.magneticBound) return;
    el.dataset.magneticBound = '1';
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width  / 2;
      const y = e.clientY - r.top  - r.height / 2;
      el.style.transform = `translate(${x * 0.22}px, ${y * 0.32}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}

/* ══════════════════════════════════════
   RIPPLE — a little expanding circle from the tap point,
   like a coin dropping in water.
══════════════════════════════════════ */
const RIPPLE_SELECTOR =
  '.add-btn, .save-budget-btn, .danger-btn, .ai-send-btn, .quick-add-main, ' +
  '.nav-tab, .cat-btn, .bulk-del-btn, .add-goal-btn, .settle-btn, .quest-claim-btn';

function initRipple() {
  document.querySelectorAll(RIPPLE_SELECTOR).forEach(el => {
    if (el.dataset.rippleBound) return;
    el.dataset.rippleBound = '1';
    el.classList.add('ripple-surface');
    el.addEventListener('click', e => {
      const r    = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const span = document.createElement('span');
      span.className   = 'ripple-circle';
      span.style.width  = span.style.height = size + 'px';
      span.style.left   = (e.clientX - r.left - size / 2) + 'px';
      span.style.top    = (e.clientY - r.top  - size / 2) + 'px';
      el.appendChild(span);
      setTimeout(() => span.remove(), 650);
    });
  });
}

/* ══════════════════════════════════════
   AMBIENT ORB MOTION — idle drifting + gentle cursor parallax
   for a sense of depth. Skips entirely for reduced-motion users.
══════════════════════════════════════ */
function initOrbMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.orb-blob animate').forEach(a => a.remove());
    return;
  }
  const orbs = Array.from(document.querySelectorAll('.orb'));
  if (!orbs.length) return;

  const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let cx = mx, cy = my, t = 0;

  if (hoverCapable) {
    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  }

  function loop() {
    t  += 0.006;
    cx += (mx - cx) * 0.04;
    cy += (my - cy) * 0.04;
    const dx = (cx - window.innerWidth  / 2) / window.innerWidth;
    const dy = (cy - window.innerHeight / 2) / window.innerHeight;
    const scrollDrift = window.scrollY * 0.05;

    orbs.forEach((orb, i) => {
      const depth = (i + 1) * 16;
      const fx    = Math.sin(t + i * 2)       * 18;
      const fy    = Math.cos(t * 0.8 + i * 2) * 14;
      const scale = 1 + Math.sin(t + i) * 0.04;
      orb.style.transform = `translate(${dx * depth + fx}px, ${dy * depth + fy + scrollDrift}px) scale(${scale})`;
    });
    requestAnimationFrame(loop);
  }
  loop();
}

/* ══════════════════════════════════════
   LIQUID CURSOR TRAIL — a soft gooey blob that trails the real
   cursor (which stays fully visible/usable). Desktop pointer only.
══════════════════════════════════════ */
function initCursorFX() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const layer = document.getElementById('cursorLayer');
  const dot   = document.getElementById('cursorDot');
  const ring  = document.getElementById('cursorRing');
  if (!layer || !dot || !ring) return;
  layer.style.display = 'block';

  let mx = innerWidth / 2, my = innerHeight / 2;
  let dx = mx, dy = my, rx = mx, ry = my;

  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  const hoverSel = 'button, a, input, select, textarea, .cat-btn, .nav-tab, .expense-item, .goal-card, .stat-pill';
  document.addEventListener('mouseover', e => { if (e.target.closest(hoverSel)) ring.classList.add('cursor-hover'); });
  document.addEventListener('mouseout',  e => { if (e.target.closest(hoverSel)) ring.classList.remove('cursor-hover'); });

  function loop() {
    dx += (mx - dx) * 0.35; dy += (my - dy) * 0.35;
    rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
    dot.style.transform  = `translate(${dx - 3}px, ${dy - 3}px)`;
    ring.style.transform = `translate(${rx - 10}px, ${ry - 10}px)`;
    requestAnimationFrame(loop);
  }
  loop();
}

/* ══════════════════════════════════════
   3D TILT + SPOTLIGHT — panels/cards subtly rotate toward the
   cursor with a glow that follows the pointer. Desktop only.
══════════════════════════════════════ */
const TILT_SELECTOR = '.panel, .hero-section, .stat-pill, .goal-card, .challenge-card, .recap-card';

function initTiltCards() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll(TILT_SELECTOR).forEach(card => {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = '1';
    card.classList.add('tilt-card');

    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top)  / r.height;
      const rotateY = (px - 0.5) * 8;
      const rotateX = (0.5 - py) * 8;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      card.style.setProperty('--mx', (px * 100) + '%');
      card.style.setProperty('--my', (py * 100) + '%');
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

/* ══════════════════════════════════════
   INTRO REVEAL — curtain-wipe the loader away once the app is ready
══════════════════════════════════════ */
function dismissIntro() {
  const intro = document.getElementById('introOverlay');
  if (!intro) return;
  intro.classList.add('leaving');
  setTimeout(() => intro.remove(), 850);
}

/* ══════════════════════════════════════
   PARTICLE NETWORK — a light ambient constellation behind the app
   that drifts on its own and gently repels from the cursor.
   Pauses when the tab isn't visible to save battery.
══════════════════════════════════════ */
function initParticleField() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let w, h, particles;
  const small = window.matchMedia('(max-width: 700px)').matches;
  const COUNT = small ? 20 : 52;
  const LINK_DIST = small ? 95 : 125;

  function resize() {
    w = canvas.width  = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  particles = Array.from({ length: COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    r: Math.random() * 1.6 + 0.6,
  }));

  let mx = -9999, my = -9999;
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    window.addEventListener('mouseleave', () => { mx = -9999; my = -9999; });
  }

  let paused = document.hidden;
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!paused) requestAnimationFrame(frame);
  });

  function frame() {
    if (paused) return;
    ctx.clearRect(0, 0, w, h);

    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      const dx = p.x - mx, dy = p.y - my;
      const dist = Math.hypot(dx, dy);
      if (dist < 120) {
        const force = (120 - dist) / 120;
        p.x += (dx / (dist || 1)) * force * 2.2;
        p.y += (dy / (dist || 1)) * force * 2.2;
      }
    });

    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK_DIST) {
          ctx.strokeStyle = `rgba(108,99,255,${(1 - d / LINK_DIST) * 0.16})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = 'rgba(167,139,250,0.55)';
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(frame);
  }
  frame();
}

/* ══════════════════════════════════════
   SCROLL-TRIGGERED REVEAL — panels animate in as they enter the
   viewport (on load AND when switching tabs / scrolling down).
══════════════════════════════════════ */
function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const delay = entry.target.dataset.revealDelay || 0;
      entry.target.style.animationDelay = delay + 'ms';
      entry.target.classList.add('reveal-in');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  const targets = document.querySelectorAll(
    '.panel, .stat-pill, .hero-section, .list-section, .ai-coach-panel'
  );
  targets.forEach((el, i) => {
    el.classList.add('reveal-pending');
    el.dataset.revealDelay = Math.min(i * 55, 480);
    io.observe(el);
  });
}

/* ══════════════════════════════════════
   DAILY ACTION LOG — tiny date-scoped tracker so quests can check
   things like "did you edit anything today" without new arrays.
══════════════════════════════════════ */
function markDailyAction(action) {
  let log = Storage.get('ss_daily_actions');
  if (!log || log.date !== todayStr()) log = { date: todayStr() };
  log[action] = true;
  Storage.set('ss_daily_actions', log);
}
function getDailyAction(action) {
  const log = Storage.get('ss_daily_actions');
  return !!(log && log.date === todayStr() && log[action]);
}

/* ══════════════════════════════════════
   DAILY QUESTS — concrete, small reasons to open the app each day
══════════════════════════════════════ */
function renderQuests() {
  const el = document.getElementById('questList');
  if (!el) return;

  const claims = Storage.getQuestClaims();
  const quests = todaysQuests();
  let doneCount = 0;

  el.innerHTML = quests.map(q => {
    const done = q.check(expenses);
    const claimed = claims.claimed.includes(q.id);
    if (claimed) doneCount++;

    return `
      <div class="quest-item ${done ? 'quest-done' : ''}">
        <div class="quest-icon">${q.icon}</div>
        <div class="quest-body">
          <div class="quest-title">${q.title}</div>
          <div class="quest-desc">${q.desc}</div>
        </div>
        <div class="quest-xp">+${q.xp} XP</div>
        ${claimed
          ? '<span class="quest-claimed">✓ Claimed</span>'
          : done
            ? `<button class="quest-claim-btn" onclick="claimQuest('${q.id}')">Claim</button>`
            : '<span class="quest-locked">🔒</span>'}
      </div>`;
  }).join('');

  const progressEl = document.getElementById('questProgress');
  if (progressEl) progressEl.textContent = `${doneCount}/${quests.length}`;

  if (typeof initRipple === 'function') initRipple();
}

function claimQuest(id) {
  const quest = todaysQuests().find(q => q.id === id);
  if (!quest) return;

  const claims = Storage.getQuestClaims();
  if (claims.claimed.includes(id)) return;

  claims.claimed.push(id);
  Storage.saveQuestClaims(claims);
  addXP(quest.xp);
  fireCoinBurst();
  showToast(`✅ Quest complete: ${quest.title} (+${quest.xp} XP)`, 'success');
  renderQuests();
}

/* ══════════════════════════════════════
   TROPHY CASE — browse every achievement, locked or unlocked
══════════════════════════════════════ */
function showTrophyCase() {
  const el = document.getElementById('trophyList');
  if (el) {
    el.innerHTML = ACHIEVEMENTS.map(a => {
      const got = unlocked.includes(a.id);
      return `
        <div class="trophy-item ${got ? 'trophy-unlocked' : ''}">
          <div class="trophy-icon">${got ? a.emoji : '🔒'}</div>
          <div>
            <div class="trophy-title">${got ? a.title : '???'}</div>
            <div class="trophy-desc">${got ? a.desc : 'Keep tracking to unlock'}</div>
          </div>
        </div>`;
    }).join('');
  }
  document.getElementById('trophyModal').classList.add('show');
}

function hideTrophyCase() {
  document.getElementById('trophyModal').classList.remove('show');
}

/* ══════════════════════════════════════
   SPLIT & SETTLE — turns "split with X" tags into a real IOU ledger.
   Assumes a 50/50 share of any expense tagged with a split partner.
══════════════════════════════════════ */
function getSplitBalances() {
  const owed = {}; // lowercase key -> { display, amount }
  expenses.forEach(e => {
    const raw = (e.splitWith || '').trim();
    if (!raw) return;
    const key = raw.toLowerCase();
    if (!owed[key]) owed[key] = { display: raw, amount: 0 };
    owed[key].amount += e.amount / 2;
  });

  const settled = {}; // lowercase key -> amount already settled
  settlements.forEach(s => {
    const key = s.person.trim().toLowerCase();
    settled[key] = (settled[key] || 0) + s.amount;
  });

  return Object.keys(owed)
    .map(key => ({
      key,
      person:  owed[key].display,
      balance: Math.max(0, owed[key].amount - (settled[key] || 0)),
    }))
    .filter(b => b.balance > 0.5)
    .sort((a, b) => b.balance - a.balance);
}

function renderSplitTab() {
  const el = document.getElementById('splitBalances');
  if (!el) return;

  const balances  = getSplitBalances();
  const totalEl   = document.getElementById('splitTotalOwed');
  const total     = balances.reduce((s, b) => s + b.balance, 0);
  if (totalEl) animateValue(totalEl, parseFloat(totalEl.dataset.val || '0'), total, 600, fmt);
  if (totalEl) totalEl.dataset.val = total;

  if (!balances.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-emoji" style="font-size:36px">🤝</div>
        <p style="font-size:13px">No pending splits.<br />Tag an expense as split to start tracking who owes you.</p>
      </div>`;
  } else {
    el.innerHTML = balances.map(b => `
      <div class="split-balance-card">
        <div class="split-avatar">${escapeHtml(b.person.charAt(0).toUpperCase())}</div>
        <div>
          <div class="split-name">${escapeHtml(b.person)}</div>
          <div class="split-sub">owes you</div>
        </div>
        <div class="split-amount">${fmt(b.balance)}</div>
        <button class="settle-btn" onclick="settleUp('${escapeHtml(b.person)}', ${b.balance})">Settle Up</button>
      </div>`).join('');
  }

  renderSettleHistory();
  if (typeof initRipple === 'function') initRipple();
}

function renderSettleHistory() {
  const el = document.getElementById('settleHistory');
  if (!el) return;
  if (!settlements.length) { el.innerHTML = ''; return; }

  const recent = settlements.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  el.innerHTML = '<div class="heatmap-title" style="margin-top:18px">Settlement History</div>' +
    recent.map(s => `
      <div class="income-row">
        <span class="income-row-icon">🤝</span>
        <span class="income-row-name">${escapeHtml(s.person)}</span>
        <span class="income-row-amt">₹${Math.round(s.amount)}</span>
      </div>`).join('');
}

let settlingPerson = null;

function settleUp(person, suggested) {
  settlingPerson = person;
  document.getElementById('settlePersonLabel').textContent = `Recording a payment from ${person}`;
  document.getElementById('settleAmount').value = Math.round(suggested);
  document.getElementById('settleModal').classList.add('show');
}

function hideSettleModal() {
  document.getElementById('settleModal').classList.remove('show');
  settlingPerson = null;
}

function confirmSettle() {
  if (!settlingPerson) return;
  const amt = parseFloat(document.getElementById('settleAmount').value);
  if (!amt || amt <= 0) { showToast('❌ Enter a valid amount', 'error'); return; }

  settlements.push({ id: genId(), person: settlingPerson, amount: amt, date: todayStr() });
  Storage.saveSettlements(settlements);
  const person = settlingPerson;
  hideSettleModal();

  addXP(10);
  fireConfetti();
  fireSettleBurst();
  renderSplitTab();
  checkAchievements();
  showToast(`🤝 Settled ₹${Math.round(amt)} with ${person}!`, 'success');
}

/* ══════════════════════════════════════
   INCOME TRACKING
══════════════════════════════════════ */
function addIncome() {
  const amount = parseFloat(document.getElementById('incAmount').value);
  const source = document.getElementById('incSource').value;

  if (!amount || amount <= 0) {
    showToast('❌ Enter a valid amount', 'error');
    shakeInput('incAmount');
    return;
  }

  incomes.push({ id: genId(), name: source, amount, source, date: todayStr() });
  Storage.saveIncomes(incomes);
  document.getElementById('incAmount').value = '';

  addXP(5);
  fireCoinBurst();
  update();
  renderIncomeList();
  checkAchievements();
  showToast(`💰 ${fmt(amount)} income logged!`, 'success');
}

function deleteIncome(id) {
  incomes = incomes.filter(i => i.id !== id);
  Storage.saveIncomes(incomes);
  update();
  renderIncomeList();
  showToast('🗑️ Income entry removed', 'default');
}

function renderIncomeList() {
  const el = document.getElementById('incomeList');
  if (!el) return;

  if (!incomes.length) {
    el.innerHTML = '<div style="font-size:11px; color:var(--text2); text-align:center; padding:8px">No income logged yet</div>';
    return;
  }

  const recent = incomes.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  el.innerHTML = recent.map(i => {
    const src = INCOME_SOURCES[i.source] || INCOME_SOURCES.Other;
    return `
      <div class="income-row">
        <span class="income-row-icon">${src.emoji}</span>
        <span class="income-row-name">${escapeHtml(i.name)}</span>
        <span class="income-row-amt">+${fmt(i.amount)}</span>
        <button class="income-del" onclick="deleteIncome(${i.id})" aria-label="Delete income">✕</button>
      </div>`;
  }).join('');
}

/* ══════════════════════════════════════
   XP / LEVEL SYSTEM — turns consistent tracking into visible progress
══════════════════════════════════════ */
function addXP(amount) {
  const before = levelInfo(xp).level;
  xp += amount;
  Storage.saveXP(xp);
  const after = levelInfo(xp).level;
  updateLevelBadge();
  floatXP(amount);

  if (after > before) {
    showLevelUpCinematic(after, levelTitle(after));
  }
}

/* Stop-motion style floating "+N XP" — moves in a handful of
   discrete jumps (steps()) rather than smooth easing, for a chunky
   claymation-esque pop next to the level badge. */
function floatXP(amount) {
  const badge = document.getElementById('levelBadge');
  if (!badge) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const r = badge.getBoundingClientRect();
  const span = document.createElement('span');
  span.className = 'xp-float';
  span.textContent = `+${amount} XP`;
  span.style.left = (r.left + r.width / 2) + 'px';
  span.style.top  = r.top + 'px';
  document.body.appendChild(span);
  setTimeout(() => span.remove(), 950);
}

function showLevelUpCinematic(level, title) {
  const overlay = document.getElementById('levelupOverlay');
  if (!overlay) return;
  document.getElementById('levelupNumber').textContent = `Lv.${level}`;
  document.getElementById('levelupTitle').textContent  = title;
  overlay.classList.add('show');
  fireConfetti();
  document.body.classList.add('flash-pulse');
  setTimeout(() => document.body.classList.remove('flash-pulse'), 650);
  setTimeout(() => overlay.classList.remove('show'), 2400);
}

function updateLevelBadge() {
  const info = levelInfo(xp);
  const numEl  = document.getElementById('levelNum');
  const fillEl = document.getElementById('levelFill');
  const badge  = document.getElementById('levelBadge');
  if (!numEl || !fillEl || !badge) return;
  numEl.textContent = `Lv.${info.level}`;
  fillEl.style.width = info.pct + '%';
  badge.title = `${levelTitle(info.level)} — ${info.into}/${info.span} XP to Lv.${info.level + 1}`;
}

/* ══════════════════════════════════════
   MOOD TAGGING — optional "worth it?" reflection on each expense
══════════════════════════════════════ */
function selectMood(btn) {
  const field = document.getElementById('expMood');
  const mood  = btn.dataset.mood;
  const isSame = field.value === mood;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
  if (isSame) {
    field.value = '';
  } else {
    btn.classList.add('active');
    field.value = mood;
  }
}

function resetMoodSelector() {
  document.getElementById('expMood').value = '';
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
}

/* ══════════════════════════════════════
   PAYMENT METHOD TAGGING — optional, how you paid
══════════════════════════════════════ */
function selectPayment(btn) {
  const field  = document.getElementById('expPayment');
  const method = btn.dataset.method;
  const isSame = field.value === method;
  document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
  if (isSame) {
    field.value = '';
  } else {
    btn.classList.add('active');
    field.value = method;
  }
}

function resetPaymentSelector() {
  document.getElementById('expPayment').value = '';
  document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
}

/* ══════════════════════════════════════
   DAILY NUDGE — a friendly reminder if today has no entries yet
══════════════════════════════════════ */
function checkDailyNudge() {
  const banner = document.getElementById('nudgeBanner');
  if (!banner) return;

  const hasToday        = expenses.some(e => e.date === todayStr());
  const dismissedToday  = Storage.getNudgeDismissed() === todayStr();

  if (expenses.length > 0 && !hasToday && !dismissedToday) {
    const messages = [
      "Haven't logged anything today — keep that streak alive! 🔥",
      "Quiet spending day? Log it (even ₹0) to keep your streak going.",
      "Don't break the chain — add today's expenses when you get a sec.",
    ];
    document.getElementById('nudgeText').textContent = messages[Math.floor(Math.random() * messages.length)];
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

function dismissNudge() {
  Storage.saveNudgeDismissed(todayStr());
  document.getElementById('nudgeBanner').style.display = 'none';
}

/* ══════════════════════════════════════
   BUDGET SUGGESTION — nudges toward a sane budget based on real income
══════════════════════════════════════ */
function renderBudgetSuggestion() {
  const el = document.getElementById('budgetSuggestion');
  if (!el) return;
  if (!incomes.length) { el.style.display = 'none'; return; }

  const monthTotals = {};
  incomes.forEach(i => {
    const d = parseDate(i.date);
    const key = d.getFullYear() + '-' + d.getMonth();
    monthTotals[key] = (monthTotals[key] || 0) + i.amount;
  });
  const totals = Object.values(monthTotals);
  const avgIncome = totals.reduce((s, v) => s + v, 0) / totals.length;
  if (avgIncome <= 0) { el.style.display = 'none'; return; }

  const suggested = Math.round((avgIncome * 0.75) / 100) * 100;
  const current   = budget.monthly || 0;
  const offBy     = current > 0 ? Math.abs(current - suggested) / suggested : 1;

  if (current > 0 && offBy < 0.15) { el.style.display = 'none'; return; }

  el.style.display = 'flex';
  el.innerHTML = `💡 Based on your income, try a budget of <strong>${fmt(suggested)}</strong>
    <button class="suggestion-apply" onclick="applyBudgetSuggestion(${suggested})">Use this</button>`;
}

function applyBudgetSuggestion(amount) {
  document.getElementById('monthlyBudget').value = amount;
  document.getElementById('budgetSuggestion').style.display = 'none';
  showToast('💡 Suggested budget filled in — hit Save to apply', 'default');
}

/* ══════════════════════════════════════
   PWA — offline support + "install app" prompt
══════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* Offline support just won't be available — app still works online */
    });
  });
}

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('installBtn');
  if (btn) btn.style.display = 'flex';
});

function installApp() {
  const btn = document.getElementById('installBtn');
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(choice => {
    if (choice.outcome === 'accepted') showToast('📲 Installed! Find SpendSense on your home screen.', 'success');
    deferredInstallPrompt = null;
    if (btn) btn.style.display = 'none';
  });
}

window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('installBtn');
  if (btn) btn.style.display = 'none';
});

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
  checkDailyNudge();
  renderQuests();
  renderBudgetSuggestion();

  /* Only re-render analytics widgets if that tab is currently visible */
  if (currentTab === 'analytics') {
    renderSmartInsights();
    updatePaymentBreakdown();
    updateMoM();
    renderCatBudgetBars();
    updateReportCard();
    updateNoSpendChallenge();
    renderWeeklyRecap();
    updateCashflowStats();
    renderCashFlowChart();
  }
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
function bootApp() {
  appBooted = true;
  /* Load persisted state */
  expenses      = Storage.getExpenses();
  budget        = Storage.getBudget();
  savageMode    = Storage.getSavageMode();
  unlocked      = Storage.getUnlocked();
  goals         = Storage.getGoals();
  catBudgets    = Storage.getCatBudgets();
  recurringList = Storage.getRecurring();
  lightMode     = Storage.getTheme();
  xp            = Storage.getXP();
  incomes       = Storage.getIncomes();
  settlements   = Storage.getSettlements();

  /* Apply theme */
  if (lightMode) {
    document.body.classList.add('light');
    document.getElementById('themeLabel').textContent = 'Dark';
  }

  /* Savage toggle */
  if (savageMode) {
    document.getElementById('savageToggle').classList.add('active');
    const emojiEl = document.getElementById('savageEmoji');
    if (emojiEl) emojiEl.textContent = '😈';
  }

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
  updateLevelBadge();

  /* Income source dropdown + recent income list */
  const incSourceSel = document.getElementById('incSource');
  if (incSourceSel) {
    incSourceSel.innerHTML = Object.keys(INCOME_SOURCES)
      .map(s => `<option value="${s}">${INCOME_SOURCES[s].emoji} ${s}</option>`).join('');
  }
  renderIncomeList();
  if (typeof loadChatHistory === 'function') loadChatHistory();
  initQuickNotes();

  /* Fun stuff: magnetic buttons, ripple feedback, ambient orb motion */
  initMagneticButtons();
  initRipple();
  initOrbMotion();
  initCursorFX();
  initTiltCards();
  initParticleField();
  initScrollReveal();
  moveNavIndicator(document.querySelector('.nav-tab.active'));

  /* Curtain-wipe the intro loader away now that everything's rendered */
  setTimeout(dismissIntro, 450);
}

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
    hideEditModal();
    hideSettleModal();
    hideTrophyCase();
    if (typeof hideAccountModal === 'function') hideAccountModal();
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
      case '6': e.preventDefault(); switchTab('split',     document.querySelectorAll('.nav-tab')[5]); break;
      case 'e': e.preventDefault(); exportCSV();     break;
      case 's': e.preventDefault(); toggleSavage();  break;
    }
  }
});