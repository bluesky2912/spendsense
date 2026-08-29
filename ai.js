/* ══════════════════════════════════════
   GROQ_API_KEY is declared in ai.local.js, which is gitignored
   and loaded via a <script> tag BEFORE this file in index.html.
   Never put a real key directly in this file — it gets committed
   to git and shipped to every visitor's browser.
   ══════════════════════════════════════ */

/* ── Send from input field ── */
function sendCoach() {
  const input = document.getElementById('aiInput');
  const q     = input.value.trim();
  if (!q) return;
  input.value = '';
  askCoach(q);
}

/* ── Build spending context ── */
function buildSpendingContext() {
  const monthly    = getMonthlyTotal(expenses);
  const weekly     = getWeeklyTotal(expenses);
  const today      = getTodayTotal(expenses);
  const cats       = getCategoryBreakdown(expenses);
  const catsSorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const streak     = getSpendingStreak(expenses);
  const avg        = getAvgDailySpend(expenses);
  const maxExp     = getMaxExpense(expenses);

  const now      = new Date();
  const day      = now.getDate();
  const dim      = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const forecast = expenses.length > 3
    ? Math.round(monthly / day * dim)
    : 0;

  const budgetPct = budget.monthly
    ? Math.round((monthly / budget.monthly) * 100)
    : null;

  const recent = expenses
    .slice(-5)
    .map(e => `${e.name} ₹${e.amount} (${e.category}) on ${e.date}`)
    .join(', ');

  const goalsCtx = (typeof goals !== 'undefined' && goals.length)
    ? goals.map(g => `"${g.name}": saved ₹${g.saved} of ₹${g.target}`).join(', ')
    : 'No savings goals set';

  return `
User's financial data (all amounts in Indian Rupees ₹):

BUDGET:
- Monthly budget: ₹${budget.monthly || 'not set'}
- Weekly budget:  ₹${budget.weekly  || 'not set'}

THIS MONTH:
- Spent so far:       ₹${Math.round(monthly)}${budgetPct !== null ? ` (${budgetPct}% of budget)` : ''}
- Days elapsed:       ${day} of ${dim}
- Month-end forecast: ₹${forecast || 'insufficient data'}

THIS WEEK:
- Weekly spend: ₹${Math.round(weekly)}

TODAY:
- Today's spend: ₹${Math.round(today)}

AVERAGES:
- Avg daily spend: ₹${Math.round(avg)}
- Tracking streak: ${streak} day${streak !== 1 ? 's' : ''}

CATEGORY BREAKDOWN (this month):
${catsSorted.slice(0, 8).map(([k, v]) => `- ${CAT[k]?.emoji || ''} ${k}: ₹${Math.round(v)}`).join('\n') || '- No data yet'}

TOP EXPENSE:
- ${maxExp ? `₹${maxExp.amount} on "${maxExp.name}" (${maxExp.category})` : 'None yet'}

RECENT EXPENSES:
- ${recent || 'None yet'}

SAVINGS GOALS:
- ${goalsCtx}

TOTAL TRACKED:
- ${expenses.length} expense${expenses.length !== 1 ? 's' : ''} logged
`.trim();
}

/* ── System prompt ── */
const SYSTEM_PROMPT_NORMAL = `You are a friendly, sharp, and practical AI spending coach embedded in an Indian personal finance app called SpendSense.

Your job: give concise, personalised, actionable financial advice based on the user's real spending data.

Guidelines:
- Keep answers to 2–5 sentences unless listing multiple points
- Use Indian context: ₹, Swiggy, Zomato, Flipkart, Ola, IRCTC, UPI etc.
- Be warm but direct — like a knowledgeable friend, not a robot
- Use "- " bullet points when listing 3+ distinct items (they render as a real list)
- Use **bold** around key numbers or the single most important takeaway, sparingly
- Never lecture or moralize — just give useful insight
- If data is sparse, say so kindly and give general advice
- Avoid generic disclaimers like "consult a financial advisor"`;

const SYSTEM_PROMPT_SAVAGE = `You are a blunt, funny, no-filter financial roast-coach embedded in an Indian personal finance app called SpendSense. The user has switched on "Savage Mode," which means they explicitly want brutal honesty over encouragement.

Your job: give genuinely useful, accurate financial advice based on the user's real spending data — but deliver it with sharp, funny, roasting commentary. Mock bad habits, celebrate good ones sarcastically, and don't soften the truth.

Guidelines:
- Keep answers to 2–5 sentences unless listing multiple points
- Use Indian context: ₹, Swiggy, Zomato, Flipkart, Ola, IRCTC, UPI etc.
- Be savage and funny, but the underlying advice must still be genuinely correct and useful — roast the behavior, not the person, and never be cruel about things like debt, income level, or circumstances outside their control
- Use "- " bullet points when listing 3+ distinct items (they render as a real list)
- Use **bold** around key numbers or the single most important takeaway, sparingly
- No corporate disclaimers, no "consult a financial advisor" — just the roast and the real advice
- If data is sparse, roast them for not tracking anything yet, then give general advice`;

function getSystemPrompt() {
  return (typeof savageMode !== 'undefined' && savageMode) ? SYSTEM_PROMPT_SAVAGE : SYSTEM_PROMPT_NORMAL;
}

/* ── Lightweight, safe markdown → HTML (bold + bullet lists only) ── */
function renderMarkdownLite(text) {
  let safe = String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  const lines = safe.split('\n');
  let html = '';
  let inList = false;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) { html += '<ul class="coach-list">'; inList = true; }
      html += `<li>${trimmed.replace(/^[-*]\s+/, '')}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      if (trimmed) html += `<p>${trimmed}</p>`;
    }
  });
  if (inList) html += '</ul>';
  return html || '<p></p>';
}

/* ── Cascading reveal for a freshly-rendered coach reply ── */
function animateCoachReply(bubble) {
  const blocks = bubble.querySelectorAll('p, li');
  blocks.forEach((b, i) => {
    b.style.opacity = '0';
    b.style.animation = `coachReveal .35s ${i * 70}ms cubic-bezier(.2,.8,.2,1) forwards`;
  });
}

/* ── Contextual follow-up chips shown after each reply ── */
function appendFollowUpChips(msgs) {
  const suggestions = ['Tell me more', 'What should I cut first?', 'Am I on track this month?'];
  const wrap = document.createElement('div');
  wrap.className = 'ai-followup-chips';
  wrap.innerHTML = suggestions.map(s =>
    `<button class="ai-quick-btn" onclick="askCoach('${s.replace(/'/g, "\\'")}')">${s}</button>`
  ).join('');
  msgs.appendChild(wrap);
}

/* ── Chat history persistence ── */
let chatHistory = [];

function loadChatHistory() {
  chatHistory = Storage.getChatHistory();
  if (!chatHistory.length) return;

  const msgs = document.getElementById('aiMessages');
  msgs.innerHTML = '';
  chatHistory.forEach(m => {
    const bubble = document.createElement('div');
    bubble.className = m.role === 'user' ? 'ai-msg user' : 'ai-msg coach';
    if (m.role === 'user') {
      bubble.textContent = m.text;
    } else {
      bubble.innerHTML = renderMarkdownLite(m.text);
    }
    msgs.appendChild(bubble);
  });
  msgs.scrollTop = msgs.scrollHeight;
}

function clearChat() {
  if (!confirm('Clear chat history?')) return;
  chatHistory = [];
  Storage.saveChatHistory(chatHistory);
  document.getElementById('aiMessages').innerHTML = `
    <div class="ai-msg coach" style="color:var(--text3); font-size:12px">
      Ask me anything about your spending — where it's going, what to cut, whether you're on track. I'll answer from your real data, and it stays on your device.
    </div>`;
  showToast('🗑️ Chat cleared', 'default');
}

/* ── Main coach function ── */
async function askCoach(question) {
  const msgs = document.getElementById('aiMessages');

  if (!GROQ_API_KEY || GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
    const errBubble = document.createElement('div');
    errBubble.className   = 'ai-msg coach';
    errBubble.style.color = 'var(--red)';
    errBubble.textContent = '⚠️ Add your Groq API key in ai.js. Get one FREE at console.groq.com — no credit card needed!';
    msgs.appendChild(errBubble);
    msgs.scrollTop = msgs.scrollHeight;
    return;
  }

  // User bubble
  const userBubble = document.createElement('div');
  userBubble.className   = 'ai-msg user';
  userBubble.textContent = question;
  msgs.appendChild(userBubble);
  if (typeof markDailyAction === 'function') markDailyAction('askedCoach');

  chatHistory.push({ role: 'user', text: question });
  Storage.saveChatHistory(chatHistory);

  // Typing indicator
  const typingBubble = document.createElement('div');
  typingBubble.className   = 'ai-msg typing';
  typingBubble.id          = 'aiTyping';
  typingBubble.textContent = '🧠 Thinking…';
  msgs.appendChild(typingBubble);
  msgs.scrollTop = msgs.scrollHeight;

  const context = buildSpendingContext();

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        max_tokens: 600,
        temperature: 0.7,
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user',   content: `Here is my spending data:\n\n${context}\n\nMy question: ${question}` },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data  = await response.json();
    const reply = data?.choices?.[0]?.message?.content
      || "Sorry, I couldn't process that right now. Try again!";

    document.getElementById('aiTyping')?.remove();

    chatHistory.push({ role: 'coach', text: reply });
    Storage.saveChatHistory(chatHistory);

    const coachBubble = document.createElement('div');
    coachBubble.className = 'ai-msg coach';
    coachBubble.innerHTML = renderMarkdownLite(reply);
    msgs.appendChild(coachBubble);
    animateCoachReply(coachBubble);
    appendFollowUpChips(msgs);

  } catch (err) {
    document.getElementById('aiTyping')?.remove();
    const errBubble = document.createElement('div');
    errBubble.className   = 'ai-msg coach';
    errBubble.style.color = 'var(--red)';
    errBubble.textContent = `⚠️ Error: ${err.message}`;
    msgs.appendChild(errBubble);
  }

  msgs.scrollTop = msgs.scrollHeight;
}