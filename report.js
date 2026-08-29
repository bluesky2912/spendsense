/* ============================================================
   report.js — SpendSense Monthly Financial Report
   "Your money, decoded."
   Comprehensive end-of-month review, snapshot metrics,
   biggest win, biggest leak, next-month targets, and PNG export.
   ============================================================ */

const MonthlyReport = {
  activeMonthKey: null,

  /* Get list of all available months in dataset */
  getAvailableMonths() {
    const list = expenses || [];
    const keys = new Set();
    const now = new Date();
    keys.add(monthKey(now));

    list.forEach(e => {
      if (e.date) {
        keys.add(monthKey(parseDate(e.date)));
      }
    });

    return Array.from(keys).sort().reverse();
  },

  /* Generate comprehensive decoded data for a specific month */
  generateReportData(targetMonthKey) {
    const mk = targetMonthKey || monthKey(new Date());
    const [yearStr, monthStr] = mk.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const targetDate = new Date(year, monthIndex, 1);

    const monthName = targetDate.toLocaleDateString('en-IN', { month: 'long' });
    const fullTitle = `${monthName} ${year}`;

    // Target month expenses & incomes
    const monthExpenses = (expenses || []).filter(e => {
      const d = parseDate(e.date);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    });
    const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);

    const monthIncomes = (incomes || []).filter(i => {
      const d = parseDate(i.date);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    });
    const totalIncome = monthIncomes.reduce((s, i) => s + i.amount, 0);

    // Previous month comparison
    const prevDate = new Date(year, monthIndex - 1, 1);
    const prevExpenses = (expenses || []).filter(e => {
      const d = parseDate(e.date);
      return d.getFullYear() === prevDate.getFullYear() && d.getMonth() === prevDate.getMonth();
    });
    const prevTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);
    const prevMonthName = prevDate.toLocaleDateString('en-IN', { month: 'long' });

    let deltaVsPrev = null;
    if (prevTotal > 0) {
      deltaVsPrev = Math.round(((totalSpent - prevTotal) / prevTotal) * 100);
    }

    // Category breakdown
    const curCats = {};
    monthExpenses.forEach(e => { curCats[e.category] = (curCats[e.category] || 0) + e.amount; });
    const prevCats = {};
    prevExpenses.forEach(e => { prevCats[e.category] = (prevCats[e.category] || 0) + e.amount; });

    const sortedCats = Object.entries(curCats).sort((a, b) => b[1] - a[1]);
    const topCat = sortedCats.length > 0 ? sortedCats[0] : null;

    // Largest single transaction
    const largestTx = monthExpenses.length > 0
      ? [...monthExpenses].sort((a, b) => b.amount - a.amount)[0]
      : null;

    // Most expensive day
    const dailyTotals = {};
    monthExpenses.forEach(e => { dailyTotals[e.date] = (dailyTotals[e.date] || 0) + e.amount; });
    const mostExpensiveDayEntry = Object.entries(dailyTotals).sort((a, b) => b[1] - a[1])[0] || null;
    let mostExpensiveDayStr = '—';
    if (mostExpensiveDayEntry) {
      const d = parseDate(mostExpensiveDayEntry[0]);
      mostExpensiveDayStr = `${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} (${fmt(mostExpensiveDayEntry[1])})`;
    }

    // Savings & Budget Adherence
    const monthlyBudget = budget.monthly || 20000;
    const youSaved = totalIncome > 0 ? Math.max(0, totalIncome - totalSpent) : Math.max(0, monthlyBudget - totalSpent);
    const budgetAdherence = monthlyBudget > 0
      ? Math.max(0, Math.min(100, Math.round(((monthlyBudget - Math.max(0, totalSpent - monthlyBudget)) / monthlyBudget) * 100)))
      : 85;

    // ──────────────────────────────────────────
    // Your Biggest Win
    // ──────────────────────────────────────────
    let biggestWin = null;
    Object.keys(prevCats).forEach(cat => {
      const prev = prevCats[cat];
      const cur = curCats[cat] || 0;
      if (prev > 400 && cur < prev) {
        const diff = prev - cur;
        if (!biggestWin || diff > biggestWin.diff) {
          biggestWin = { cat, diff, prev, cur, pct: Math.round((diff / prev) * 100) };
        }
      }
    });

    let winText = "You maintained steady control without irregular spending spikes.";
    if (biggestWin) {
      const emoji = CAT[biggestWin.cat]?.emoji || '🎉';
      winText = `You reduced ${emoji} ${biggestWin.cat} expenses by ${fmt(biggestWin.diff)} this month (${biggestWin.pct}% drop).`;
    } else if (deltaVsPrev !== null && deltaVsPrev < 0) {
      winText = `Overall spending dropped by ${Math.abs(deltaVsPrev)}% compared to ${prevMonthName}.`;
    }

    // ──────────────────────────────────────────
    // Your Biggest Leak
    // ──────────────────────────────────────────
    let biggestLeak = null;
    Object.keys(curCats).forEach(cat => {
      const cur = curCats[cat];
      const prev = prevCats[cat] || 0;
      if (cur > 500 && (prev === 0 || cur > prev)) {
        const diff = cur - prev;
        const pct = prev > 0 ? Math.round((diff / prev) * 100) : 100;
        if (!biggestLeak || diff > biggestLeak.diff) {
          biggestLeak = { cat, diff, pct, cur, prev };
        }
      }
    });

    let leakText = "No major spending leaks identified this cycle.";
    if (biggestLeak) {
      const emoji = CAT[biggestLeak.cat]?.emoji || '📈';
      leakText = `${emoji} ${biggestLeak.cat} spending increased by ${biggestLeak.pct}% (+${fmt(biggestLeak.diff)}).`;
    }

    // ──────────────────────────────────────────
    // Next Month Focus Target
    // ──────────────────────────────────────────
    let nextMonthTarget = "Keep building your emergency fund and logging daily.";
    if (topCat) {
      const suggestedTarget = Math.round(topCat[1] * 0.85);
      nextMonthTarget = `Try keeping ${CAT[topCat[0]]?.emoji || ''} ${topCat[0]} spending under ${fmt(suggestedTarget)}.`;
    }

    return {
      monthKey: mk,
      monthName,
      fullTitle,
      totalSpent,
      totalIncome,
      prevTotal,
      deltaVsPrev,
      prevMonthName,
      youSaved,
      topCat: topCat ? `${CAT[topCat[0]]?.emoji || ''} ${topCat[0]}` : '—',
      topCatAmount: topCat ? topCat[1] : 0,
      mostExpensiveDayStr,
      largestTx: largestTx ? `${fmt(largestTx.amount)} (${largestTx.name})` : '—',
      budgetAdherence,
      winText,
      leakText,
      nextMonthTarget,
      txCount: monthExpenses.length,
    };
  },

  /* Render the report view / modal */
  render(targetMonthKey) {
    this.activeMonthKey = targetMonthKey || this.activeMonthKey || monthKey(new Date());
    const data = this.generateReportData(this.activeMonthKey);
    const monthsList = this.getAvailableMonths();

    const container = document.getElementById('monthlyReportBody');
    if (!container) return;

    const deltaClass = data.deltaVsPrev === null ? '' : (data.deltaVsPrev <= 0 ? 'report-delta-good' : 'report-delta-bad');
    const deltaIcon = data.deltaVsPrev === null ? '' : (data.deltaVsPrev <= 0 ? '↓' : '↑');
    const deltaText = data.deltaVsPrev === null
      ? 'First tracked month'
      : `${deltaIcon} ${Math.abs(data.deltaVsPrev)}% from ${data.prevMonthName}`;

    container.innerHTML = `
      <!-- Month Selector Bar -->
      <div class="report-month-bar">
        <label for="reportMonthSelect" class="report-select-label">Reviewing:</label>
        <select id="reportMonthSelect" class="field-input report-select" onchange="MonthlyReport.render(this.value)">
          ${monthsList.map(m => `
            <option value="${m}" ${m === this.activeMonthKey ? 'selected' : ''}>
              ${monthLabel(m)}
            </option>
          `).join('')}
        </select>
      </div>

      <!-- Main Journal Sheet -->
      <div class="report-journal-card" id="reportJournalCard">
        <div class="report-hero">
          <div class="report-tag">SPENDSENSE MONTHLY JOURNAL</div>
          <h2 class="report-month-title">${data.monthName}</h2>
          <div class="report-month-tagline">Your money, decoded.</div>
          
          <div class="report-big-spent">
            <span class="report-spent-val">${fmt(data.totalSpent)}</span>
            <span class="report-spent-label">spent</span>
          </div>
          <div class="report-delta ${deltaClass}">${deltaText}</div>
        </div>

        <!-- 5-Metric Snapshot Grid -->
        <div class="report-snapshot-grid">
          <div class="report-metric">
            <span class="report-metric-label">You saved</span>
            <span class="report-metric-val" style="color:var(--green)">${fmt(data.youSaved)}</span>
          </div>
          <div class="report-metric">
            <span class="report-metric-label">Biggest category</span>
            <span class="report-metric-val">${data.topCat}</span>
          </div>
          <div class="report-metric">
            <span class="report-metric-label">Most expensive day</span>
            <span class="report-metric-val">${data.mostExpensiveDayStr}</span>
          </div>
          <div class="report-metric">
            <span class="report-metric-label">Largest transaction</span>
            <span class="report-metric-val">${data.largestTx}</span>
          </div>
          <div class="report-metric">
            <span class="report-metric-label">Budget adherence</span>
            <span class="report-metric-val" style="color:var(--accent)">${data.budgetAdherence}%</span>
          </div>
        </div>

        <!-- Narrative Highlights -->
        <div class="report-story-sections">
          <div class="report-story-block report-win-block">
            <div class="report-story-header">
              <span class="report-story-icon">🏆</span>
              <span class="report-story-title">Your biggest win</span>
            </div>
            <div class="report-story-body">${data.winText}</div>
          </div>

          <div class="report-story-block report-leak-block">
            <div class="report-story-header">
              <span class="report-story-icon">⚠️</span>
              <span class="report-story-title">Your biggest leak</span>
            </div>
            <div class="report-story-body">${data.leakText}</div>
          </div>

          <div class="report-story-block report-next-block">
            <div class="report-story-header">
              <span class="report-story-icon">🎯</span>
              <span class="report-story-title">Next month focus</span>
            </div>
            <div class="report-story-body">${data.nextMonthTarget}</div>
          </div>
        </div>

        <div class="report-footer">
          <span>SpendSense · Personal Financial Journal</span>
          <span>${data.txCount} transactions analyzed</span>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="report-actions">
        <button class="add-btn" onclick="MonthlyReport.downloadImage()">
          <span>📸 Download Decoded Report</span>
          <span>↓</span>
        </button>
      </div>
    `;
  },

  showModal() {
    const modal = document.getElementById('monthlyReportModal');
    if (!modal) return;
    modal.classList.add('show');
    this.render();
  },

  hideModal() {
    const modal = document.getElementById('monthlyReportModal');
    if (modal) modal.classList.remove('show');
  },

  /* High-resolution PNG exporter for the Monthly Financial Report */
  downloadImage() {
    const data = this.generateReportData(this.activeMonthKey);
    const W = 900, H = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0c0c0e');
    bg.addColorStop(1, '#16161a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle ambient glow
    const glow = (x, y, r, color) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    };
    glow(120, 100, 300, 'rgba(52,196,150,0.14)');
    glow(W - 100, H - 150, 260, 'rgba(42,157,120,0.12)');

    // Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a8a8a';
    ctx.font = '600 18px sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('SPENDSENSE · FINANCIAL JOURNAL', W / 2, 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 52px sans-serif';
    ctx.fillText(data.monthName.toUpperCase(), W / 2, 135);

    ctx.fillStyle = '#8a8a8a';
    ctx.font = '500 22px sans-serif';
    ctx.fillText('Your money, decoded.', W / 2, 175);

    // Big Total
    ctx.fillStyle = '#34c496';
    ctx.font = '800 78px sans-serif';
    ctx.fillText(fmt(data.totalSpent), W / 2, 275);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 20px sans-serif';
    const deltaText = data.deltaVsPrev === null
      ? 'First tracked month'
      : `${data.deltaVsPrev <= 0 ? '↓' : '↑'} ${Math.abs(data.deltaVsPrev)}% from ${data.prevMonthName}`;
    ctx.fillText(deltaText, W / 2, 315);

    // Metrics Box
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(80, 360); ctx.lineTo(W - 80, 360); ctx.stroke();

    const metrics = [
      ['YOU SAVED', fmt(data.youSaved)],
      ['BIGGEST CATEGORY', data.topCat],
      ['MOST EXPENSIVE DAY', data.mostExpensiveDayStr],
      ['LARGEST TRANSACTION', data.largestTx],
      ['BUDGET ADHERENCE', `${data.budgetAdherence}%`],
    ];

    let y = 410;
    metrics.forEach(([label, val]) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8a8a8a';
      ctx.font = '600 16px sans-serif';
      ctx.fillText(label, 90, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 20px sans-serif';
      ctx.fillText(val, W - 90, y);

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.moveTo(90, y + 16); ctx.lineTo(W - 90, y + 16); ctx.stroke();
      y += 54;
    });

    // Story Highlights
    y += 20;
    const stories = [
      ['🏆 YOUR BIGGEST WIN', data.winText, 'rgba(52,196,150,0.1)'],
      ['⚠️ YOUR BIGGEST LEAK', data.leakText, 'rgba(229,72,77,0.1)'],
      ['🎯 NEXT MONTH FOCUS', data.nextMonthTarget, 'rgba(232,191,90,0.1)'],
    ];

    stories.forEach(([title, body, bgCol]) => {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.beginPath();
      ctx.roundRect(80, y, W - 160, 95, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 18px sans-serif';
      ctx.fillText(title, 105, y + 36);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 16px sans-serif';
      ctx.fillText(body, 105, y + 68);

      y += 115;
    });

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '500 16px sans-serif';
    ctx.fillText('💸 SpendSense · Your money, unfiltered', W / 2, H - 40);

    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `spendsense_monthly_report_${data.monthKey}.png`,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('📸 Monthly Report downloaded!', 'success');
    });
  }
};
