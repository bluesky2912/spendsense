/* ============================================================
   config.js — SpendSense Premium AI
   Category definitions, colour tokens, keyword maps,
   savage mode lines, and achievement milestones.
   ============================================================ */

/* ── Category definitions ── */
const CAT = {
  Food:          { emoji: '🍔', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  Transport:     { emoji: '🚗', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  Shopping:      { emoji: '🛍', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  Entertainment: { emoji: '🎬', color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  Health:        { emoji: '💊', color: '#22d3a5', bg: 'rgba(34,211,165,0.15)' },
  Bills:         { emoji: '💡', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  Education:     { emoji: '📚', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  Travel:        { emoji: '✈️', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  Random:        { emoji: '🎲', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)'  },
  Other:         { emoji: '📌', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)'},
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

function getSavageLine(category) {
  const lines = SAVAGE_LINES[category] || SAVAGE_LINES.default;
  return lines[Math.floor(Math.random() * lines.length)];
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
];
