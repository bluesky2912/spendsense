# 💸 SpendSense — AI-Powered Expense Tracker

*Your money, unfiltered.*

SpendSense is a fast, offline-capable, installable expense tracker with an AI spending coach, real income/cash-flow tracking, shared-expense settling, and a genuine gamification layer (XP, levels, daily quests, achievements) — built to actually get opened every day, not just once.

It runs entirely as a static site. No backend required to use it. Optionally connect a free Firebase project for real login/logout with data synced across your devices.

---

## ✨ Features

**Core tracking**
- Add expenses with category, date, optional payment method (Cash/Card/UPI), split-with tagging, and an optional "worth it?" mood tag
- Edit, duplicate, or delete any entry (with one-tap undo)
- Search, filter, sort, and bulk-delete
- Smart category auto-detection as you type ("Swiggy" → 🍔 Food)
- Automatic duplicate-entry warnings
- CSV export, and CSV/UPI-SMS paste-to-import

**Income & cash flow**
- Track income separately from expenses, by source (Salary, Freelance, Investment, Gift, Refund, Other)
- Real savings rate, monthly Income vs. Expense chart, net cash-flow summary under your hero total

**Budgets & goals**
- Monthly/weekly budgets, with an income-based suggested budget
- Per-category budget limits with progress bars
- Savings goals with contribution tracking and completion confetti

**Recurring & automation**
- Set up recurring expenses (weekly/monthly), auto-added on schedule
- Automatic detection of expenses that *look* recurring, with a one-tap "set this up" suggestion

**Split & Settle**
- Tag any expense as split with someone (assumes a 50/50 share)
- See a running "who owes you" balance per person
- Record settlements with partial-payment support and a full settlement history

**Analytics**
- Algorithmic Smart Insights (category movers, weekend vs. weekday habits, savings rate — no AI call needed)
- Month-over-month comparison, category budget bars, monthly report card, no-spend challenge tracker
- Payment-method breakdown
- Shareable **Weekly Recap** card, downloadable as a PNG

**AI Spending Coach**
- Ask natural-language questions about your spending, answered using your real data
- Persistent chat history, markdown-formatted replies, contextual follow-up suggestions
- Runs on Groq's Llama models (fast, generous free tier)

**Gamification**
- XP and levels with fun rank titles, plus a full-screen cinematic level-up moment
- Rotating daily quests (3 of a pool of 6, different each day)
- 12 achievements, browsable any time in the Trophy Case
- Tracking streaks, a no-spend-day challenge, and an optional "Savage Mode" for blunt, roast-you commentary

**Accounts & sync (optional)**
- Works 100% offline/local with zero setup — just open it
- Optionally sign up/log in (Firebase Auth) to sync your data across devices
- "Continue without an account" always available — nothing is ever forced

**PWA**
- Installable to your home screen/dock, opens like a native app
- Works offline after first load (service worker caches the app shell)

**Design**
- Dark/light themes, dozens of coordinated micro-animations (magnetic buttons, liquid cursor trail, particle field, 3D tilt cards, morphing blob background, scroll reveals), all respecting `prefers-reduced-motion`

---

## 🗂 Project structure

```
spendsense/
├── index.html          Markup + all modal/overlay templates
├── style.css            All styling and animation keyframes
│
├── config.js             Category/income/payment definitions, quests, achievements, level curve
├── storage.js            localStorage read/write layer
├── utils.js               Formatting, date math, aggregations, animation helpers
│
├── app.js                Global state, init, gamification, income, split & settle, PWA install
├── dashboard.js         Hero, stat pills, heatmap, forecast, insights ticker
├── expenseList.js        Expense list render/filter/sort, edit/duplicate/delete, CSV/SMS import
├── charts.js               Bar/pie/trend/cash-flow charts (Chart.js)
├── analytics.js           Smart Insights, cash flow, weekly recap, report card, no-spend challenge
├── goals.js                Savings goals
├── recurring.js           Recurring expenses + auto-detection
├── ai.js                    AI Coach chat logic
├── auth.js                  Firebase login/logout + cloud sync layer
│
├── ai.local.js            🔒 Your Groq API key — gitignored, create locally (see below)
├── firebase-config.js  Your Firebase project config — safe to commit (see below)
├── firestore.rules        Reference copy of the security rules to paste into Firebase console
│
├── manifest.json          PWA manifest
├── sw.js                     Service worker (offline caching)
└── icon-192.png / icon-512.png   App icons
```

---

## 🚀 Getting started

Clone the repo, then serve `index.html` with any static file server (or just open it directly in a browser — most features work fine via `file://`, though the service worker requires `http(s)://`).

The app works immediately with zero configuration. Two features need a small one-time setup:

### 1. AI Coach (optional)

Create a file called `ai.local.js` in the project root (already gitignored — never commit this):

```js
const GROQ_API_KEY = 'your-groq-api-key-here';
```

Get a free key at [console.groq.com](https://console.groq.com). Without this file, everything else in the app works fine — you'll just get a friendly message if you open the AI Coach tab.

### 2. Cross-device login & sync (optional)

By default `firebase-config.js` has placeholder values and the app runs fully local — no login screen appears.

To enable real accounts with cross-device sync:

1. Create a free project at [console.firebase.google.com](https://console.firebase.google.com)
2. **Build → Authentication → Get started → Email/Password → Enable**
3. **Build → Firestore Database → Create database** (production mode)
4. In Firestore's **Rules** tab, paste the contents of `firestore.rules` and Publish
5. **Project Settings → General → Your apps → Web app (`</>`)** — copy the config object into `firebase-config.js`

Unlike the Groq key, this config is safe to commit — Firebase security comes from the rules in step 4, not from hiding this file.

---

## 📦 Deployment

This is a static site — GitHub Pages, Netlify, Vercel, or any static host works. For GitHub Pages:

1. Push to your repo's default branch
2. Repo Settings → Pages → set source to that branch
3. Done — auto-redeploys on every push

**Note:** the service worker aggressively caches the app shell for offline use. After deploying updates, if you don't see changes reflected, clear it via your browser's DevTools → Application → Storage → *Clear site data*.

---

## 🔒 Security notes

- `ai.local.js` contains a real secret and must never be committed — it's already in `.gitignore`. If a key is ever exposed, revoke and regenerate it at console.groq.com immediately.
- `firebase-config.js` is **not** a secret — Firebase is designed for this config to be public. Actual data protection comes entirely from the Firestore Security Rules (`firestore.rules`), which restrict every user to reading/writing only their own document.
- All data is stored in `localStorage` by default, or in Firestore under your own user ID if you're signed in. Nobody else can read it either way.

---

## 🛠 Tech stack

Vanilla JavaScript, no build step, no framework, no bundler — just `<script>` tags. Chart.js (CDN) for charts, Firebase (CDN, optional) for auth/sync, Groq API (optional) for the AI Coach. That's the entire dependency list.