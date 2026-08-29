/* ============================================================
   stories.js — SpendSense Narrative Financial Intelligence
   "Insight first. Visualization second."
   Translates raw numbers and charts into clear, compelling,
   human stories with interactive visual graphs embedded below.
   ============================================================ */

const Stories = {
  /* Generate all narrative stories from current & historical data */
  generateStories() {
    const list = expenses || [];
    if (!list.length) return [];

    const stories = [];
    const now = new Date();
    const currentMonthKey = monthKey(now);
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKeyStr = monthKey(prevMonthDate);

    // Current month expenses
    const curMonthExp = list.filter(e => {
      const d = parseDate(e.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const curTotal = curMonthExp.reduce((s, e) => s + e.amount, 0);

    // Previous month expenses
    const prevMonthExp = list.filter(e => {
      const d = parseDate(e.date);
      return d.getFullYear() === prevMonthDate.getFullYear() && d.getMonth() === prevMonthDate.getMonth();
    });
    const prevTotal = prevMonthExp.reduce((s, e) => s + e.amount, 0);

    // Category breakdowns
    const curCats = {};
    curMonthExp.forEach(e => { curCats[e.category] = (curCats[e.category] || 0) + e.amount; });
    const prevCats = {};
    prevMonthExp.forEach(e => { prevCats[e.category] = (prevCats[e.category] || 0) + e.amount; });

    // ──────────────────────────────────────────
    // STORY 1: Top Category Narrative + Spike Detection
    // ──────────────────────────────────────────
    const sortedCats = Object.entries(curCats).sort((a, b) => b[1] - a[1]);
    if (sortedCats.length > 0 && curTotal > 0) {
      const [topCat, topAmount] = sortedCats[0];
      const topCatEmoji = CAT[topCat]?.emoji || '🏆';
      const pctOfTotal = Math.round((topAmount / curTotal) * 100);
      const prevCatAmount = prevCats[topCat] || 0;

      let trendNarrative = '';
      if (prevCatAmount > 0) {
        const delta = Math.round(((topAmount - prevCatAmount) / prevCatAmount) * 100);
        const prevMonthName = prevMonthDate.toLocaleDateString('en-IN', { month: 'long' });
        trendNarrative = delta >= 0
          ? `up ${delta}% from ${prevMonthName}.`
          : `down ${Math.abs(delta)}% from ${prevMonthName}.`;
      } else {
        trendNarrative = `making up ${pctOfTotal}% of your total budget.`;
      }

      // Detect biggest spike in this category
      const spike = this.detectCategorySpike(curMonthExp, topCat);
      let spikeText = '';
      if (spike) {
        spikeText = `Your biggest spike happened between ${spike.rangeStr} (${fmt(spike.total)} across ${spike.count} transactions).`;
      }

      stories.push({
        id: 'top-cat-story',
        category: topCat,
        icon: topCatEmoji,
        title: `${topCatEmoji} ${topCat} became your biggest expense this month.`,
        subtitle: `You spent ${fmt(topAmount)}, ${trendNarrative}`,
        detail: spikeText || `${topCat} represents ${pctOfTotal}% of all your spending so far this month.`,
        chartType: 'category-timeline',
        data: {
          category: topCat,
          expenses: curMonthExp.filter(e => e.category === topCat),
          spike,
        },
      });
    }

    // ──────────────────────────────────────────
    // STORY 2: Fastest Rising Category (The "Leak")
    // ──────────────────────────────────────────
    let biggestSurge = null;
    Object.keys(curCats).forEach(cat => {
      const cur = curCats[cat];
      const prev = prevCats[cat] || 0;
      if (prev >= 300 && cur > prev) {
        const pctIncrease = Math.round(((cur - prev) / prev) * 100);
        const diffAmt = cur - prev;
        if (pctIncrease >= 20 && (!biggestSurge || diffAmt > biggestSurge.diffAmt)) {
          biggestSurge = { cat, cur, prev, pctIncrease, diffAmt };
        }
      }
    });

    if (biggestSurge && biggestSurge.cat !== sortedCats[0]?.[0]) {
      const catEmoji = CAT[biggestSurge.cat]?.emoji || '📈';
      stories.push({
        id: 'rising-leak-story',
        category: biggestSurge.cat,
        icon: '⚠️',
        title: `${catEmoji} ${biggestSurge.cat} spending jumped ${biggestSurge.pctIncrease}%.`,
        subtitle: `Increased by ${fmt(biggestSurge.diffAmt)} compared to last month.`,
        detail: `You've spent ${fmt(biggestSurge.cur)} so far vs ${fmt(biggestSurge.prev)} previously. Keeping an eye on this can free up savings.`,
        chartType: 'category-comparison',
        data: {
          cat: biggestSurge.cat,
          cur: biggestSurge.cur,
          prev: biggestSurge.prev,
        },
      });
    }

    // ──────────────────────────────────────────
    // STORY 3: Biggest Discipline Win (Category Cut)
    // ──────────────────────────────────────────
    let biggestCut = null;
    Object.keys(prevCats).forEach(cat => {
      const prev = prevCats[cat];
      const cur = curCats[cat] || 0;
      if (prev >= 500 && cur < prev) {
        const diffAmt = prev - cur;
        const pctDrop = Math.round((diffAmt / prev) * 100);
        if (pctDrop >= 15 && (!biggestCut || diffAmt > biggestCut.diffAmt)) {
          biggestCut = { cat, cur, prev, pctDrop, diffAmt };
        }
      }
    });

    if (biggestCut) {
      const catEmoji = CAT[biggestCut.cat]?.emoji || '🌿';
      stories.push({
        id: 'discipline-win-story',
        category: biggestCut.cat,
        icon: '🏆',
        title: `🏆 Big win: You reduced ${catEmoji} ${biggestCut.cat} by ${fmt(biggestCut.diffAmt)}.`,
        subtitle: `Spending dropped by ${biggestCut.pctDrop}% vs last month.`,
        detail: `Great financial control. This saved amount goes straight into your wealth reserve.`,
        chartType: 'category-comparison',
        data: {
          cat: biggestCut.cat,
          cur: biggestCut.cur,
          prev: biggestCut.prev,
        },
      });
    }

    // ──────────────────────────────────────────
    // STORY 4: Weekend vs Weekday Behavioral Pattern
    // ──────────────────────────────────────────
    const wv = getWeekendVsWeekday(curMonthExp.length >= 5 ? curMonthExp : list);
    if (wv.hasWeekend && wv.hasWeekday && wv.wdayAvg > 0) {
      const diffPct = Math.round(((wv.wendAvg - wv.wdayAvg) / wv.wdayAvg) * 100);
      if (Math.abs(diffPct) >= 20) {
        const isHigher = diffPct > 0;
        stories.push({
          id: 'weekend-habit-story',
          icon: isHigher ? '🎉' : '🧘',
          title: isHigher
            ? `🎉 Weekend spending is ${diffPct}% higher than weekdays.`
            : `🧘 Disciplined weekends: You spend ${Math.abs(diffPct)}% less on weekends.`,
          subtitle: `Averaging ${fmt(Math.round(wv.wendAvg))}/day on weekends vs ${fmt(Math.round(wv.wdayAvg))}/day on weekdays.`,
          detail: isHigher
            ? `Socializing and dining out drive most of your Saturday & Sunday spending spikes.`
            : `Consistent and calm spending rhythm throughout your entire week.`,
          chartType: 'weekend-weekday-bars',
          data: {
            wendAvg: wv.wendAvg,
            wdayAvg: wv.wdayAvg,
          },
        });
      }
    }

    // ──────────────────────────────────────────
    // STORY 5: Peak Day Highlight
    // ──────────────────────────────────────────
    const dailyTotals = {};
    curMonthExp.forEach(e => { dailyTotals[e.date] = (dailyTotals[e.date] || 0) + e.amount; });
    const peakDayEntry = Object.entries(dailyTotals).sort((a, b) => b[1] - a[1])[0];

    if (peakDayEntry && peakDayEntry[1] > 1500) {
      const peakDate = parseDate(peakDayEntry[0]);
      const peakDateStr = peakDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const peakDayExpenses = curMonthExp.filter(e => e.date === peakDayEntry[0]);
      const biggestTx = peakDayExpenses.sort((a, b) => b.amount - a.amount)[0];

      stories.push({
        id: 'peak-day-story',
        icon: '⚡',
        title: `⚡ ${peakDateStr} was your heaviest spending day (${fmt(peakDayEntry[1])}).`,
        subtitle: biggestTx ? `Driven by ${biggestTx.name} (${fmt(biggestTx.amount)}).` : `Peak activity recorded on this date.`,
        detail: `A single peak day accounted for ${Math.round((peakDayEntry[1] / Math.max(curTotal, 1)) * 100)}% of your month's total.`,
        chartType: 'day-breakdown',
        data: {
          dateStr: peakDateStr,
          total: peakDayEntry[1],
          expenses: peakDayExpenses,
        },
      });
    }

    return stories;
  },

  /* Detect 3-4 day clusters of high spending in a category */
  detectCategorySpike(expensesList, category) {
    const catExpenses = expensesList
      .filter(e => e.category === category)
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));

    if (catExpenses.length < 2) return null;

    let maxCluster = null;
    let maxClusterTotal = 0;

    for (let i = 0; i < catExpenses.length; i++) {
      const startDate = parseDate(catExpenses[i].date);
      const cluster = [catExpenses[i]];
      let clusterTotal = catExpenses[i].amount;

      for (let j = i + 1; j < catExpenses.length; j++) {
        const nextDate = parseDate(catExpenses[j].date);
        const diffDays = (nextDate - startDate) / 86400000;
        if (diffDays <= 4) {
          cluster.push(catExpenses[j]);
          clusterTotal += catExpenses[j].amount;
        } else {
          break;
        }
      }

      if (cluster.length >= 2 && clusterTotal > maxClusterTotal && clusterTotal >= 800) {
        maxClusterTotal = clusterTotal;
        const first = parseDate(cluster[0].date);
        const last = parseDate(cluster[cluster.length - 1].date);
        const mName = first.toLocaleDateString('en-IN', { month: 'short' });
        const rangeStr = first.getDate() === last.getDate()
          ? `${mName} ${first.getDate()}`
          : `${mName} ${first.getDate()}–${last.getDate()}`;

        maxCluster = {
          count: cluster.length,
          total: clusterTotal,
          rangeStr,
          items: cluster,
        };
      }
    }

    return maxCluster;
  },

  /* Render story cards in the Analytics and Dashboard views */
  renderStoryCards(containerId) {
    const container = document.getElementById(containerId || 'analyticsStoriesContainer');
    if (!container) return;

    const storiesList = this.generateStories();

    if (!storiesList.length) {
      container.innerHTML = `
        <div class="story-empty">
          <div class="story-empty-icon">📖</div>
          <div class="story-empty-title">Your financial story is writing itself</div>
          <div class="story-empty-desc">As you log expenses this month, SpendSense will automatically uncover your patterns, surges, and spending rhythms here.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="stories-list">
        ${storiesList.map((story, index) => `
          <div class="story-card" id="story_card_${story.id}">
            <div class="story-header">
              <span class="story-badge">${story.icon} INSIGHT</span>
            </div>
            <h3 class="story-headline">${escapeHtml(story.title)}</h3>
            <div class="story-subheadline">${escapeHtml(story.subtitle)}</div>
            <p class="story-narrative">${escapeHtml(story.detail)}</p>

            <!-- Embedded Graph Underneath -->
            <div class="story-visual-wrap">
              <div class="story-chart-header">
                <span>Visual Breakdown</span>
              </div>
              <div class="story-chart-canvas-wrap">
                <canvas id="story_canvas_${index}" height="110"></canvas>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Render individual micro charts for each story
    setTimeout(() => {
      storiesList.forEach((story, index) => {
        this.renderStoryMicroChart(story, `story_canvas_${index}`);
      });
    }, 50);
  },

  /* Render embedded micro chart underneath the narrative */
  renderStoryMicroChart(story, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const isLight = document.body.classList.contains('light');

    if (story.chartType === 'category-timeline') {
      // 7-day or daily distribution for this category
      const expList = story.data.expenses || [];
      const dailyMap = {};
      expList.forEach(e => { dailyMap[e.date] = (dailyMap[e.date] || 0) + e.amount; });

      const sortedDates = Object.keys(dailyMap).sort();
      if (!sortedDates.length) return;

      const labels = sortedDates.map(d => parseDate(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
      const dataPoints = sortedDates.map(d => dailyMap[d]);

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data: dataPoints,
            backgroundColor: 'rgba(52, 196, 150, 0.45)',
            borderColor: '#34c496',
            borderWidth: 1.5,
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: ctx => ` ${fmt(ctx.raw)}` }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: isLight ? '#666' : '#888', font: { size: 10 } } },
            y: { grid: { color: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }, ticks: { callback: v => fmtShort(v), color: isLight ? '#666' : '#888', font: { size: 9 } } }
          }
        }
      });
    } else if (story.chartType === 'category-comparison') {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Last Month', 'This Month'],
          datasets: [{
            data: [story.data.prev, story.data.cur],
            backgroundColor: [isLight ? '#cbd5e1' : '#334155', story.data.cur > story.data.prev ? '#e5484d' : '#34c496'],
            borderRadius: 6,
            barThickness: 32,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } } },
          scales: {
            x: { grid: { display: false }, ticks: { color: isLight ? '#666' : '#888', font: { size: 10 } } },
            y: { grid: { color: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }, ticks: { callback: v => fmtShort(v), color: isLight ? '#666' : '#888', font: { size: 9 } } }
          }
        }
      });
    } else if (story.chartType === 'weekend-weekday-bars') {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Weekdays (Daily Avg)', 'Weekends (Daily Avg)'],
          datasets: [{
            data: [story.data.wdayAvg, story.data.wendAvg],
            backgroundColor: ['#6b8caf', '#f2994a'],
            borderRadius: 6,
            barThickness: 36,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(Math.round(ctx.raw))}` } } },
          scales: {
            x: { grid: { display: false }, ticks: { color: isLight ? '#666' : '#888', font: { size: 10 } } },
            y: { grid: { color: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }, ticks: { callback: v => fmtShort(v), color: isLight ? '#666' : '#888', font: { size: 9 } } }
          }
        }
      });
    } else if (story.chartType === 'day-breakdown') {
      const items = (story.data.expenses || []).slice(0, 4);
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: items.map(i => i.name.slice(0, 12)),
          datasets: [{
            data: items.map(i => i.amount),
            backgroundColor: '#e8bf5a',
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } } },
          scales: {
            x: { grid: { display: false }, ticks: { color: isLight ? '#666' : '#888', font: { size: 10 } } },
            y: { grid: { color: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }, ticks: { callback: v => fmtShort(v), color: isLight ? '#666' : '#888', font: { size: 9 } } }
          }
        }
      });
    }
  }
};
