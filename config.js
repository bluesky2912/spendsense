/* ============================================================
   config.js — SpendSense Premium AI
   Category definitions, colour tokens, keyword maps,
   savage mode lines, and achievement milestones.
   ============================================================ */

/* ── Category definitions ── */
const CAT = {
  Food:          { emoji: '🍔', color: '#c1825a', bg: 'rgba(193,130,90,0.14)' },
  Transport:     { emoji: '🚗', color: '#6b8caf', bg: 'rgba(107,140,175,0.14)' },
  Shopping:      { emoji: '🛍', color: '#9b7ba8', bg: 'rgba(155,123,168,0.14)' },
  Entertainment: { emoji: '🎬', color: '#b8809a', bg: 'rgba(184,128,154,0.14)' },
  Health:        { emoji: '💊', color: '#4a9b82', bg: 'rgba(74,155,130,0.14)'  },
  Bills:         { emoji: '💡', color: '#c4a24e', bg: 'rgba(196,162,78,0.14)' },
  Education:     { emoji: '📚', color: '#7a94b8', bg: 'rgba(122,148,184,0.14)' },
  Travel:        { emoji: '✈️', color: '#5aab8a', bg: 'rgba(90,171,138,0.14)' },
  Random:        { emoji: '🎲', color: '#b17b70', bg: 'rgba(177,123,112,0.14)' },
  Other:         { emoji: '📌', color: '#8f8f95', bg: 'rgba(143,143,149,0.14)' },
};

/* ── Payment methods ── */
const PAYMENT_METHODS = {
  Cash: { emoji: '💵', color: '#4a9b82' },
  Card: { emoji: '💳', color: '#7a94b8' },
  UPI:  { emoji: '📲', color: '#9b7ba8' },
};

/* ── Income sources ── */
const INCOME_SOURCES = {
  Salary:     { emoji: '💼', color: '#4a9b82' },
  Freelance:  { emoji: '💻', color: '#7a94b8' },
  Investment: { emoji: '📈', color: '#5aab8a' },
  Gift:       { emoji: '🎁', color: '#b8809a' },
  Refund:     { emoji: '↩️', color: '#c4a24e' },
  Other:      { emoji: '💵', color: '#8f8f95' },
};

/* ── Smart category keyword map ── */
const CAT_KEYWORDS = {
  Food:          ['swiggy','zomato','food','restaurant','cafe','coffee','tea','lunch','dinner','breakfast','domino','pizza','burger','biryani','chai','hotel','eat','meal','blinkit','zepto','instamart'],
  Transport:     ['uber','ola','metro','bus','auto','petrol','fuel','diesel','cab','taxi','rapido','bike','train','flight','irctc','toll','parking','rapido'],
  Shopping:      ['amazon','flipkart','myntra','ajio','shop','buy','purchase','cloth','fashion','mall','market','meesho','nykaa','jiomart'],
  Entertainment: ['netflix','prime','hotstar','disney','spotify','youtube','movie','cinema','pvr','inox','game','pub','bar','bookmyshow','club'],
  Health:        ['pharmacy','medicine','doctor','hospital','clinic','gym','health','apollo','medplus','chemist','netmeds','practo','1mg'],
  Bills:         ['electricity','bill','recharge','airtel','jio','vi','bsnl','broadband','internet','rent','emi','loan','insurance','postpaid','prepaid'],
  Education:     ['course','udemy','book','school','college','tuition','exam','fee','coursera','unacademy','byju','vedantu'],
  Travel:        ['hotel','flight','makemytrip','booking','goibibo','oyo','hostel','trip','holiday','tour','cleartrip','airbnb'],
  Random:        ['random','misc','other','miscellaneous'],
};

/* ── Savage Mode lines ── */
const SAVAGE_LINES = {
  Food: [
    "😭 Another meal? Your stomach is your biggest investor.",
    "🍟 Bro is funding a personal Zomato empire.",
    "Gordon Ramsay could feed a village with what you dropped today.",
    "Your taste buds: thriving. Your savings: not so much. 💀",
    "This isn't a food budget, it's a lifestyle endorsement deal.",
  ],
  Shopping: [
    "🛍️💀 Sir this is not a shopping spree, this is a personality disorder.",
    "Amazon should name a warehouse after you at this rate.",
    "Your wallet just filed for emotional distress.",
    "The economy is saved. Congratulations. 🎉",
    "Your closet is full. Your bank account is empty. Balance.",
  ],
  Entertainment: [
    "You don't *watch* content, you *fund* it. Big difference.",
    "Netflix, Prime, Disney+ AND going out? Humble yourself 🦗",
    "Entertainment budget: ∞. Retirement plan: 💀",
    "You're basically a media company now. Pay yourself a salary.",
  ],
  Random: [
    "🎲 'Random'? Your financial advisor just fainted.",
    "Chaotic spending detected. Dave Ramsey has left the chat. 💀",
    "Random charges: the silent killer of every budget since 1987.",
    "What even IS this 💀 Never explain. Never apologize.",
  ],
  Transport: [
    "You do know buses exist right? Just a thought. 🚌",
    "Uber charges so high your carbon footprint filed a restraining order.",
    "At this rate you could've bought a bicycle. Last month.",
    "Getting places is expensive when you refuse to walk 500m. 💀",
  ],
  Health: [
    "Investing in health? Respect. This is your ONLY valid flex. 💊",
    "Your body: valued. Your wallet: not so much. Still based.",
    "The irony of spending money to stay healthy to keep spending money.",
  ],
  Bills: [
    "Bills paid = adult unlocked. Boring but necessary. 💡",
    "Electricity, internet, and regret. The holy trinity of adulting.",
    "If only vibes could power your router. 📶",
  ],
  Education: [
    "Investing in your brain. Respect. 📚",
    "Knowledge > material things. Still costs money tho. 💀",
    "Getting smarter. Wallet getting lighter. Peak human experience.",
  ],
  Travel: [
    "✈️ The world is your oyster and your bank account's nemesis.",
    "Travelling to cope. Financially unhinged. Spiritually thriving.",
    "Miles collected. Savings: none. Vibes: immaculate. ✨",
  ],
  default: [
    "Budget exceeded. Your ancestors are disappointed 👴",
    "Financial discipline has left the chat. 💀",
    "This is not a budget, this is a suggestion that you ignored.",
    "Money in → immediately out. The circle of life. 🌀",
    "Your bank account is doing a dramatic monologue rn. 🎭",
  ],
};

function getSavageLine(category, amount) {
  const templates = SAVAGE_LINES[category] || SAVAGE_LINES.default;
  const base = templates[Math.floor(Math.random() * templates.length)];

  const amt = Math.round(amount || 0);
  let tag = '';
  if (amt >= 5000)      tag = ` ₹${amt.toLocaleString('en-IN')}?! Screenshot this for your therapist.`;
  else if (amt >= 2000) tag = ` ₹${amt.toLocaleString('en-IN')} in one shot — bold move.`;
  else if (amt >= 500)  tag = ` That's ₹${amt.toLocaleString('en-IN')} you'll "forget" you spent by Friday.`;
  else if (amt > 0 && amt < 100) tag = ` Only ₹${amt}, but we're still watching. 👀`;

  return base + tag;
}

/* ── Level / XP progression ──
   Span (xp required) grows 1.25x each level so early levels come
   fast (satisfying start) and later ones take real commitment. ── */
const LEVEL_TITLES = [
  'Money Newbie', 'Budget Rookie', 'Receipt Wrangler', 'Expense Explorer',
  'Savings Scout', 'Budget Ninja', 'Finance Whisperer', 'Spend Sensei',
  'Wallet Guardian', 'Money Mogul',
];

function levelTitle(level) {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

function levelInfo(xpTotal) {
  let level = 1, base = 0, span = 60;
  while (xpTotal >= base + span) {
    base += span;
    level++;
    span = Math.round(span * 1.25);
  }
  return {
    level,
    into: xpTotal - base,
    span,
    pct: Math.min(100, Math.round(((xpTotal - base) / span) * 100)),
  };
}

/* ── Daily Quests — a pool of 6, with 3 rotating in each day so it
   stays varied instead of being the same static checklist forever. ── */
const QUEST_POOL = [
  {
    id: 'log1', icon: '📝', title: 'First entry of the day',
    desc: 'Log at least 1 expense today', xp: 10,
    check: exp => exp.filter(e => e.date === todayStr()).length >= 1,
  },
  {
    id: 'mood1', icon: '💭', title: 'Reflect on a spend',
    desc: 'Tag a mood on any expense today', xp: 10,
    check: exp => exp.some(e => e.date === todayStr() && e.mood),
  },
  {
    id: 'log3', icon: '🔥', title: 'Stay on top of it',
    desc: 'Log 3 expenses today', xp: 15,
    check: exp => exp.filter(e => e.date === todayStr()).length >= 3,
  },
  {
    id: 'income1', icon: '💰', title: 'Log income',
    desc: 'Add an income entry today', xp: 10,
    check: () => (typeof incomes !== 'undefined' && incomes.some(i => i.date === todayStr())),
  },
  {
    id: 'edit1', icon: '✏️', title: 'Tidy up',
    desc: 'Edit any expense today', xp: 8,
    check: () => (typeof getDailyAction === 'function' && getDailyAction('edited')),
  },
  {
    id: 'goal1', icon: '🎯', title: 'Fund a goal',
    desc: 'Put money toward a savings goal today', xp: 12,
    check: () => (typeof getDailyAction === 'function' && getDailyAction('contributed')),
  },
  {
    id: 'payment1', icon: '💳', title: 'Tag how you paid',
    desc: 'Add a payment method to any expense today', xp: 8,
    check: exp => exp.some(e => e.date === todayStr() && e.paymentMethod),
  },
  {
    id: 'dup1', icon: '⧉', title: 'Quick repeat',
    desc: 'Duplicate an expense today', xp: 8,
    check: () => (typeof getDailyAction === 'function' && getDailyAction('duplicated')),
  },
  {
    id: 'analytics1', icon: '📈', title: 'Check your numbers',
    desc: 'Visit the Analytics tab today', xp: 6,
    check: () => (typeof getDailyAction === 'function' && getDailyAction('visitedAnalytics')),
  },
  {
    id: 'coach1', icon: '🧠', title: 'Ask the coach',
    desc: 'Ask the AI Coach a question today', xp: 10,
    check: () => (typeof getDailyAction === 'function' && getDailyAction('askedCoach')),
  },
  {
    id: 'underpace', icon: '🏃', title: 'Beat the pace',
    desc: "Spend less than your daily average today", xp: 12,
    check: exp => {
      if (typeof budget === 'undefined' || !budget.monthly) return false;
      const todayTotal = exp.filter(e => e.date === todayStr()).reduce((s, e) => s + e.amount, 0);
      return todayTotal > 0 && todayTotal < (budget.monthly / 30);
    },
  },
];

/* Small seeded shuffle so the day's quests feel genuinely different
   rather than following an obvious repeating pattern. */
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Deterministic-but-varied: which quests show depends on the day,
   so tomorrow's set is different without needing any stored state. */
function todaysQuests() {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return seededShuffle(QUEST_POOL, dayIndex).slice(0, 3);
}

/* ── Achievement milestones ── */
const ACHIEVEMENTS = [
  {
    id: 'first', emoji: '🎉',
    title: 'First Expense!',
    desc: 'You started tracking. Legend.',
    check: (exp) => exp.length === 1,
  },
  {
    id: 'ten', emoji: '🔥',
    title: '10 Expenses!',
    desc: 'Getting into the habit.',
    check: (exp) => exp.length === 10,
  },
  {
    id: 'fifty', emoji: '💯',
    title: '50 Expenses!',
    desc: "You're a tracking machine.",
    check: (exp) => exp.length === 50,
  },
  {
    id: 'bigsave', emoji: '💰',
    title: 'Under Budget!',
    desc: 'Monthly spend under 50% of budget.',
    check: (exp, budget) => {
      if (!budget.monthly) return false;
      const n = new Date();
      const total = exp
        .filter(e => {
          const d = new Date(e.date + 'T12:00:00');
          return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
        })
        .reduce((s, e) => s + e.amount, 0);
      return budget.monthly > 0 && total / budget.monthly < 0.5 && total > 0;
    },
  },
  {
    id: 'nospend3', emoji: '💚',
    title: '3 No-Spend Days!',
    desc: 'Three consecutive zero-spend days!',
    check: (exp) => getNoSpendStreak(exp) >= 3,
  },
  {
    id: 'century', emoji: '💯',
    title: 'Century Club',
    desc: 'Logged 100 expenses total.',
    check: (exp) => exp.length >= 100,
  },
  {
    id: 'week_streak', emoji: '🗓️',
    title: 'Full Week Streak',
    desc: 'Tracked expenses 7 days in a row.',
    check: (exp) => getSpendingStreak(exp) >= 7,
  },
  {
    id: 'month_streak', emoji: '📅',
    title: 'Full Month Streak',
    desc: 'Tracked expenses 30 days in a row.',
    check: (exp) => getSpendingStreak(exp) >= 30,
  },
  {
    id: 'level5', emoji: '⭐',
    title: 'Level 5 Reached',
    desc: 'Hit level 5 — Savings Scout status.',
    check: () => (typeof xp !== 'undefined' && typeof levelInfo === 'function' && levelInfo(xp).level >= 5),
  },
  {
    id: 'first_income', emoji: '💼',
    title: 'First Paycheck',
    desc: 'Logged your first income entry.',
    check: () => (typeof incomes !== 'undefined' && incomes.length >= 1),
  },
  {
    id: 'first_settle', emoji: '🤝',
    title: 'Settled Up',
    desc: 'Recorded your first split settlement.',
    check: () => (typeof settlements !== 'undefined' && settlements.length >= 1),
  },
  {
    id: 'goal_complete', emoji: '🏁',
    title: 'Goal Crushed',
    desc: 'Fully funded a savings goal.',
    check: () => (typeof goals !== 'undefined' && goals.some(g => g.saved >= g.target)),
  },
];