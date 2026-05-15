
const GROQ_API_KEY = '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';

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
const SYSTEM_PROMPT = `You are a friendly, sharp, and practical AI spending coach embedded in an Indian personal finance app called SpendSense.

Your job: give concise, personalised, actionable financial advice based on the user's real spending data.

Guidelines:
- Keep answers to 2–5 sentences unless listing multiple points
- Use Indian context: ₹, Swiggy, Zomato, Flipkart, Ola, IRCTC, UPI etc.
- Be warm but direct — like a knowledgeable friend, not a robot
- Use bullet points only when listing 3+ distinct items
- Never lecture or moralize — just give useful insight
- If data is sparse, say so kindly and give general advice
- Avoid generic disclaimers like "consult a financial advisor"`;

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
        model: 'llama-3.1-8b-instant',
        max_tokens: 600,
        temperature: 0.7,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
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

    const coachBubble = document.createElement('div');
    coachBubble.className   = 'ai-msg coach';
    coachBubble.textContent = reply;
    msgs.appendChild(coachBubble);

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
