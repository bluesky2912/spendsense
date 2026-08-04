/* ============================================================
   utils.js — SpendSense Premium AI
   Pure helpers: formatting, date math, aggregations,
   auto-detect, anomaly, XSS safety.
   ============================================================ */

/* ── ID generation (avoids Date.now() collisions on rapid adds) ── */
function genId() {
  return Date.now() + Math.random();
}

/* ── Formatting ── */
function fmt(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function fmtShort(n) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)   return '₹' + (n / 1000).toFixed(1) + 'k';
  return fmt(n);
}

/* ── Dates ── */
function parseDate(dateStr) {
  return new Date(dateStr + 'T12:00:00');
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(mk) {
  const [y, m] = mk.split('-');
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

/* ── Aggregations ── */
function getMonthlyTotal(arr, date) {
  const d = date || new Date();
  const y = d.getFullYear(), m = d.getMonth();
  return arr
    .filter(e => { const dd = parseDate(e.date); return dd.getFullYear() === y && dd.getMonth() === m; })
    .reduce((s, e) => s + e.amount, 0);
}

function getMonthlyIncome(arr, date) {
  const d = date || new Date();
  const y = d.getFullYear(), m = d.getMonth();
  return arr
    .filter(e => { const dd = parseDate(e.date); return dd.getFullYear() === y && dd.getMonth() === m; })
    .reduce((s, e) => s + e.amount, 0);
}

function getWeeklyTotal(arr) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  cutoff.setHours(0, 0, 0, 0);
  return arr.filter(e => parseDate(e.date) >= cutoff).reduce((s, e) => s + e.amount, 0);
}

function getTodayTotal(arr) {
  return arr.filter(e => e.date === todayStr()).reduce((s, e) => s + e.amount, 0);
}

function getTopCategory(arr) {
  if (!arr.length) return null;
  const cats = {};
  arr.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
  return Object.entries(cats).sort((a, b) => b[1] - a[1])[0] || null;
}

function getCategoryBreakdown(arr) {
  const cats = {};
  arr.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
  return cats;
}

function getDailyLast7(arr) {
  const daily = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    daily[dateKey(d)] = 0;
  }
  arr.forEach(e => { if (e.date in daily) daily[e.date] += e.amount; });
  return Object.entries(daily).map(([date, total]) => ({
    label: parseDate(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
    total,
    date,
  }));
}

function getLast30Days(arr) {
  const daily = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    daily[dateKey(d)] = 0;
  }
  arr.forEach(e => { if (e.date in daily) daily[e.date] += e.amount; });
  return Object.entries(daily).map(([date, total]) => ({ date, total }));
}

function getWeekendVsWeekday(arr) {
  let wendTotal = 0, wendCount = 0, wdayTotal = 0, wdayCount = 0;
  arr.forEach(e => {
    const dow = parseDate(e.date).getDay();
    if (dow === 0 || dow === 6) { wendTotal += e.amount; wendCount++; }
    else                        { wdayTotal += e.amount; wdayCount++; }
  });
  return {
    wendAvg:    wendCount ? wendTotal / wendCount : 0,
    wdayAvg:    wdayCount ? wdayTotal / wdayCount : 0,
    hasWeekend: wendCount > 0,
    hasWeekday: wdayCount > 0,
  };
}

/* ── FIXED: streak used to reset to 0 every day until an expense was
   logged "today", and it broke identically on i===0 vs any other gap
   (the branches were dead-duplicate code). Now: if today has no entry
   yet, we simply start counting from yesterday instead of zeroing out. ── */
function getSpendingStreak(arr) {
  if (!arr.length) return 0;
  const dates = new Set(arr.map(e => e.date));
  let streak = 0;
  const cur = new Date();

  if (!dates.has(dateKey(cur))) {
    cur.setDate(cur.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const key = dateKey(cur);
    if (!dates.has(key)) break;
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

/* ── FIXED: previously only broke once `streak > 0`, so any spent day
   encountered *before* the streak started accumulating was silently
   skipped instead of ending the streak — this let it report a
   no-spend streak from days before a spend that happened more recently. ── */
function getNoSpendStreak(arr) {
  const dates = new Set(arr.map(e => e.date));
  let streak = 0;
  const cur = new Date();

  // Skip today if no expense logged yet — the day isn't over.
  if (!dates.has(dateKey(cur))) {
    cur.setDate(cur.getDate() - 1);
  }

  for (let i = 0; i < 30; i++) {
    const k = dateKey(cur);
    if (dates.has(k)) break;
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

function getMaxExpense(arr) {
  return arr.reduce((max, e) => (!max || e.amount > max.amount) ? e : max, null);
}

function getAvgDailySpend(arr) {
  if (!arr.length) return 0;
  const dates = new Set(arr.map(e => e.date));
  return arr.reduce((s, e) => s + e.amount, 0) / dates.size;
}

/* ── Anomaly detection ── */
function getAnomalyExpense(arr) {
  if (arr.length < 5) return null;
  const avg = arr.reduce((s, e) => s + e.amount, 0) / arr.length;
  const std = Math.sqrt(arr.reduce((s, e) => s + (e.amount - avg) ** 2, 0) / arr.length);
  const recent = arr[arr.length - 1];
  if (recent && recent.amount > avg + 2.5 * std) {
    return { expense: recent, avg, multiplier: Math.round(recent.amount / avg) };
  }
  return null;
}

/* ── Smart category auto-detect ── */
function detectCategory(name) {
  const n = name.toLowerCase();
  for (const [cat, kws] of Object.entries(CAT_KEYWORDS)) {
    if (kws.some(k => n.includes(k))) return cat;
  }
  return null;
}

/* ── Animated counters ──
   Smoothly tweens a number displayed in `el` from `from` to `to`,
   re-formatting it every frame with `formatter`. Cancels any
   in-flight animation on the same element first so rapid updates
   (e.g. typing a budget) don't stack and jitter. ── */
function animateValue(el, from, to, duration = 700, formatter = fmt) {
  if (!el) return;
  if (el._animFrame) cancelAnimationFrame(el._animFrame);
  if (!isFinite(from)) from = 0;
  if (!isFinite(to))   to   = 0;

  if (Math.abs(to - from) < 0.5) { el.textContent = formatter(to); return; }

  const start = performance.now();
  const ease  = t => 1 - Math.pow(1 - t, 3); // easeOutCubic

  function step(now) {
    const p   = Math.min((now - start) / duration, 1);
    const val = from + (to - from) * ease(p);
    el.textContent = formatter(val);
    if (p < 1) el._animFrame = requestAnimationFrame(step);
    else       el._animFrame = null;
  }
  el._animFrame = requestAnimationFrame(step);
}

/* ── Digit scramble reveal — rapidly flickers random digits then
   locks them in left-to-right, like a slot machine settling.
   Non-digit characters (₹, commas) appear immediately. ── */
function scrambleText(el, finalText, duration = 900) {
  if (!el) return;
  if (el._scrambleFrame) cancelAnimationFrame(el._scrambleFrame);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = finalText;
    return;
  }

  const digits = '0123456789';
  const target = String(finalText).split('');
  const start  = performance.now();
  const step_  = duration / Math.max(target.length, 1);

  function frame(now) {
    const elapsed = now - start;
    let out  = '';
    let done = true;

    target.forEach((ch, i) => {
      const lockAt = i * step_ * 0.55 + duration * 0.35;
      if (!/[0-9]/.test(ch) || elapsed > lockAt) {
        out += ch;
      } else {
        out += digits[Math.floor(Math.random() * 10)];
        done = false;
      }
    });

    el.textContent = out;
    if (!done) el._scrambleFrame = requestAnimationFrame(frame);
    else        el._scrambleFrame = null;
  }
  el._scrambleFrame = requestAnimationFrame(frame);
}

/* ── XSS safety ── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}