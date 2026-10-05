# AI Project Launchpad — NxtWave Growth Intern Challenge

**Tagline:** _Stop watching AI tutorials. Build something in 60 minutes._

A working growth product (not a landing page) for NxtWave's free workshop
**“Build Your First AI Project in 60 Minutes”**, built to hit **500 final-year
engineering students in 7 days on a ₹2,000 budget**.

The product is the campaign. A visitor generates a project idea → registers in a
3-step modal → receives a personalised project card + referral code → shares a
pre-filled WhatsApp message → climbs a public leaderboard. That loop is the
acquisition channel that gets the campaign to 500 without paid ads.

---

## 1. TL;DR

| | |
|---|---|
| **Product** | Interactive AI project-discovery funnel + referral engine |
| **Growth model** | Register → personalised project + referral link → friends register → rank rises → repeat. Modelled targets live in `growth-plan.html`; the site shows only measured numbers |
| **Budget** | ₹2,000, 40% of it to student ambassadors; **zero to paid ads** |
| **Stack** | React 18 · TypeScript · Tailwind CSS · Framer Motion · Recharts · Vite |
| **Backend** | **Node + Express + SQLite** — real persistence, channel attribution, versioned migrations, a passworded `/admin` with a replies inbox. Every number on the site is read from this database (§15) |
| **Tests** | **144 passing specs in 8 files** — funnel, navigation, tools, a11y, colour, the API contract (incl. admin auth + replies), the migration path, and the real-or-nothing data rules (`npm test`) |
| **Return hook** | 4 free tools that work with no signup: readiness check, Idea Vault, Prompt Lab, Card Studio |
| **Time to demo** | ~3 minutes, start to finish (see §7) |

---

## 2. Site map

The site is deliberately **multi-page**. A single long scroll is the default shape
for a launch page, but this is a funnel with four different questions in it —
"what is this?", "what happens in the hour?", "what would I build?", "how do I
bring friends?" — and each deserves its own page, its own `<title>`, and its own
shareable URL.

| Route | Page | What it does |
|---|---|---|
| `/` | **Home** | The 15-second pitch: hero + interactive project generator, live seat momentum, pain → transformation, teaser strips for the workshop / projects / referral loop, the 500-registration model, and a conversion band. |
| `/workshop` | **The workshop** | Minute-by-minute 60-minute agenda, what's included, what you'll leave with, and the FAQ that handles objections. Has its own countdown. |
| `/projects` | **Projects** | The full catalogue of 10 projects with difficulty filters and detail sheets, plus the **AI Project Simulator** (3 questions → a matched project). |
| `/leaderboard` | **Builder Wall** | The referral engine: your code, progress bar, milestone ladder, referral feed, and the public leaderboard + college scoreboard. |
| `/quiz` | **Readiness check** | Five questions → a score out of 100, the band that matches it, and the project difficulty that fits. Saves to the browser, then offers the seat. |
| `/vault` | **Idea Vault** | Shortlist projects, keep notes and priority, and work the **six-stage build checklist** (scope → input → output → prompt → wire → deploy) with progress persisted locally. |
| `/prompt-lab` | **Prompt Lab** | Builds the prompt a student pastes into their AI tool: role, task, output contract, constraints, guardrails — plus a plain-English note on *why* each block exists. Copy or download. |
| `/card` | **Card Studio** | Renders a real 1080×1350 project card from DOM (name, project, difficulty, optional QR to their referral) and exports it as a PNG for WhatsApp status / batch groups. |
| `/join?ref=CODE` | **Invite landing** | Home, with the registration modal auto-opened and an attribution banner naming the friend who invited you. |
| `/strategy` | **Growth plan** | For reviewers: persona, why they care, registration triggers, channel model, 500-registration maths, ₹2,000 budget, 7-day plan, metrics, experiments, **"How I thought"** and the **AI + learning notes**. |
| `/admin` | **Dashboard** | Campaign read: KPIs, 7-day curve, channel mix, college distribution, top projects, referral leaderboard, and a live event stream from the visitor's own session. |

The four tools are grouped behind one **Free tools** menu in the navbar (and
listed in the footer and on the home page in a "use these before the workshop"
shelf) so the primary nav stays about the workshop itself.

Every public page shares the same navbar, footer and mobile sticky CTA, and closes
with a conversion band — so the primary action is never more than one tap away
regardless of where a student enters. Each tool is a reusable reason to come back
before the session, and each one terminates in the same action: reserve a seat.

`/?variant=a` or `?variant=b` forces either half of the live hero/CTA A/B test.

## 3. Run it as a website

```bash
npm install
npm run seed      # 347 students / 87 referrals -> data/launchpad.db
npm run build     # production bundle -> dist/
npm start         # app + API on http://localhost:4173
```

`npm start` now runs the **backend and the frontend together** (§15): `/api/*` is
the real API, static files come from `dist/`, and unknown routes fall through to
the SPA so `/admin`, `/strategy` and `/join?ref=CODE` all resolve client-side.
No API reachable? The app degrades to the localStorage prototype and says so.

`server/server.mjs` behaves like the deploy target: `/assets/*` is cached
immutably, and the manifest/icons/robots/sitemap are served with correct MIME
types.

For hot-reload development use `npm run dev` (Vite, port 5173) instead.

---

## 4. Deploy to a permanent public URL

The repo is already configured for one-click deploys — no server code, no env vars,
no database required for the demo.

| Host | Steps | Config file (included) |
|---|---|---|
| **Vercel** | `npm i -g vercel && vercel` in the project folder → accept defaults | `vercel.json` |
| **Netlify** | drag `dist/` onto app.netlify.com/drop, or connect the repo | `netlify.toml` |
| **Cloudflare Pages** | connect the repo, build `npm run build`, output `dist` | `public/_redirects` |
| **GitHub Pages** | push `dist/` to a `gh-pages` branch | ⚠️ needs a 404.html copy of index.html for deep links |

Both configs include the SPA rewrite that keeps `/admin` and `/strategy` working on
refresh, plus immutable caching for hashed assets. Before going live, replace the
placeholder domain `ai-project-launchpad.vercel.app` in `index.html`, `robots.txt`
and `sitemap.xml` with your real URL. The sitemap lists the eight indexable
pages; `/admin` and `/strategy` are deliberately excluded and marked `noindex`
(a `noindex` URL in a sitemap is a contradiction search engines penalise).

**Custom domain / OG image:** social scrapers will not resolve a relative
`og:image`, so after deploying set the absolute URL in `index.html`:

```html
<meta property="og:image" content="https://your-domain.com/og.png" />
```

---

## 5. All scripts

```bash
npm run dev           # Vite dev server with HMR (0.0.0.0:5173)
ALLOW_SEED=1 npm run seed          # DEV FIXTURE: fill data/launchpad.db with fictional rows
ALLOW_SEED=1 npm run seed:reset    # wipe every table, then re-seed the fixture
npm run build         # typecheck + production bundle -> dist/
npm start             # app + API on 0.0.0.0:4173   <-- use this
npm run build:single  # ONE self-contained index.html -> dist-single/
npm test              # Vitest suite (144 specs, 8 files)
npm run typecheck     # tsc --noEmit
node server/server.mjs 8080   # server on a custom port
```

Requires Node 18+ (Node 20 recommended). **No API keys, no external database** —
the database is a file. Optional env vars: `CAMPAIGN_TARGET` (default 500),
`DB_PATH` (default `data/launchpad.db`), `ADMIN_PASSWORD` (default `launchpad`),
`ADMIN_SESSION_SECRET`, `WORKSHOP_DATE` (ISO datetime for the countdown).

`ALLOW_SEED=1` exists for one reason: the seed writes FICTIONAL rows the site
would present as real registrations. The production site starts at zero and
counts only real people — never run the seed against a database a real student
can reach.

`npm run dev` runs Vite only, so the frontend falls back to offline mode unless
you also run `npm start` in another terminal — which is exactly the behaviour the
fallback exists for.

## 6. Credentials

| What | Value |
|---|---|
| `/admin` password | `launchpad` (override with `ADMIN_PASSWORD`) |
| Session | signed HttpOnly cookie, 12 hours, no server-side state |

Everything public — the funnel, the leaderboard, the tools — needs no login.
Your workspace (vault, quiz, saved ideas) lives in the browser and is mirrored
to the server per device id; reset it with **Reset local state** in `/admin`
or by clearing site data.

---

## 7. The 3-minute demo script

Run this and every claim on `/strategy` becomes visible:

1. **0:00 — Home.** Headline, live seats bar (starts `0/500` and moves only when
   real people register), the reply box, and the measured funnel. (~15s)
2. **0:20 — Generate a project.** Click **Generate my project** → a real project
   appears → **Build this with me**. The generator is the first conversion step,
   so the visitor is already invested before any form appears. (~20s)
3. **0:40 — Register.** 3 steps: details → interest → matched project (the
   matching pipeline visibly runs). Then **Reserve my free spot**. (~40s)
4. **1:20 — Success screen.** Referral code (`DEEPIKA47`-style), seat number, add
   to calendar (real .ics dated to the real workshop), referral link, and the
   pre-filled WhatsApp message. A friend registering through that link is what
   moves the count — nothing is simulated. (~30s)
5. **1:50 — `/leaderboard`.** Your code, progress, milestone ladder, referral feed,
   then the public wall with your own row highlighted and your rank rising. (~25s)
6. **2:15 — `/workshop` and `/projects`.** Minute-by-minute agenda, then the
   catalogue with the AI Project Simulator matching an idea live. Two pages, one
   sentence each — the point is the IA, not the scroll. (~25s)
7. **2:25 — Free tools (optional, 10s each).** Open the **Free tools** menu:
   `/prompt-lab` generates the build prompt, `/quiz` scores readiness in five
   clicks, `/card` renders a share card with a QR to your referral. Skip one of
   the earlier stops if you are over time — these are the return-visit hook.
8. **2:45 — `/admin`.** Unlock with the password. Daily registrations, measured
   channel mix, colleges, top projects, the replies inbox, and the **real**
   session event stream from the clicks you just made. (~15s)
9. **3:00 — `/strategy`.** Persona → triggers → channels → the loop, measured →
   metrics with live values → AI + learning notes. (~15s)

---

## 8. Architecture

```
src/
├── main.tsx                  # bootstrap + analytics hydration
├── App.tsx                   # route table (10 routes) + per-route SEO
├── index.css                 # THE design system: tokens, primitives, utilities
├── lib/
│   ├── types.ts              # shared domain types
│   ├── analytics.ts          # typed event layer + variant assignment + ONE transport seam
│   ├── recommend.ts          # rule-based project recommender (explainable, deterministic)
│   ├── matching.ts           # façade over the recommender used by the UI
│   ├── buildStages.ts        # the six build stages the Idea Vault tracks
│   ├── qr.ts                 # QR data-URL helper (Card Studio) — lazy-loaded
│   ├── router.tsx            # 40-line router (works on a static host AND file://)
│   └── utils.ts              # referral codes, share URLs, clipboard, safe storage
├── store/AppStore.tsx        # single source of truth (registration, referrals, rank, vault, quiz)
├── data/
│   ├── projects.ts           # 10 starter projects (the product catalogue)
│   ├── content.ts            # product copy + rules (FAQ, milestones, roadmap…). No data
│   ├── quiz.ts               # readiness check: 5 questions, additive score, 3 bands
│   └── rotation.ts           # hero ticker copy
├── components/               # ui.tsx primitives, PageShell/PageHero/CtaBand, one file per funnel section
└── pages/
    ├── Home.tsx              # / — hero, momentum, pain, teaser strips, tool shelf
    ├── Workshop.tsx          # /workshop — agenda, what's inside, outcomes, FAQ
    ├── Projects.tsx          # /projects — catalogue + simulator
    ├── LeaderboardPage.tsx   # /leaderboard — referral engine + Builder Wall
    ├── Quiz.tsx              # /quiz — readiness check → band + matched project
    ├── Vault.tsx             # /vault — shortlist, notes, six-stage checklist
    ├── PromptLab.tsx         # /prompt-lab — builds the prompt, explains the blocks
    ├── CardStudio.tsx        # /card — DOM-rendered share card → PNG
    ├── Strategy.tsx          # /strategy — growth plan + AI notes (reviewers)
    ├── Admin.tsx             # /admin — campaign dashboard
    └── NotFound.tsx          # 404
```

**Design decisions worth defending**

- **Rule-based recommender, not an LLM.** The matching is deterministic, instant,
  free, offline and *explainable* — we can show the student exactly why a project
  was chosen. An LLM would add latency, cost and an API key to a step where
  correctness matters more than novelty.
- **Multi-page over one long scroll.** Each page owns one question, one `<h1>`,
  one `<title>` and one shareable URL — which also makes each page independently
  linkable from a WhatsApp message ("check the projects" beats "scroll down").
- **One design system in `index.css`.** White canvas with soft brand washes,
  lime primary fill (with a dark green for anything lime-coloured that has to be
  *read*), violet/cyan secondaries, one focus ring, one card primitive. No
  CSS-in-JS sprawl, no per-section restyling. The whole palette is semantic
  (`ink` / `surface` / `line` / `brand`), so a dark mode is a token swap, not a
  rewrite.
- **The free tools cost nothing to run.** No API keys, no server: the readiness
  score, the recommendation, the prompt builder and the share card are all
  deterministic client-side logic. They work offline, in a sandboxed iframe, and
  on a free static host — which is the only way a student on a ₹0 budget can use
  them at 11pm on a weak connection.
- **No demo data at all.** There is no fixture file, no fallback table and no
  seeded baseline in the product: numbers are SQL or they do not appear (§13).
- **Analytics is one seam.** `track()` in `lib/analytics.ts` fans out to a local
  buffer (for the admin stream) and to GTM/PostHog/GA4 if present.
- **A real backend behind one interface.** Every network call in the app goes
  through `src/lib/api.ts`, and every SQL statement lives in `server/db.mjs`. No
  component touches either, so swapping SQLite for Postgres is two files.
- **One catalogue, imported by both sides.** `server/catalogue.mjs` holds the
  project slugs, interests, experience levels, years and channels; the client
  keeps its own TypeScript copy because it must render offline. Two copies is a
  real cost — this one had already drifted and cost a column of data — so
  `tests/catalogue.test.ts` compares them and fails the suite on any disagreement.
- **Safe storage wrapper.** `localStorage` throws inside sandboxed iframes;
  `storage` in `lib/utils.ts` swallows that so the app degrades to in-memory
  state instead of white-screening.
- **Heavy libraries are dynamically imported.** `html-to-image` (Card Studio) and
  `qrcode` only load when a student actually opens `/card`, so the first paint on
  a phone over 4G is not carrying a PNG encoder they may never use.

### Colour: indigo leads, lime highlights

The first light theme had a **three-colour problem**: indigo, teal and lime were
all selling at once, and the headline gradient animated through *all three*
(`#4a2fd6 → #0b7a8f → #4a7500`) so the two words "AI Project" were literally
three different colours at every frame, fading olive mid-word. That is what made
a technically-fine page look unfinished. The palette was rebuilt around one
sentence:

> **Indigo leads. Lime highlights. Nothing else competes.**

| Role | Colour | Why this one |
|---|---|---|
| Interactive — buttons, links, focus, active | **Indigo `#4F46E5`** | Works in *both* directions: 6.3:1 as text, 6.3:1 under white text |
| Indigo on tinted chips | **`#3730A3`** | 9.9:1 — a chip's tint lightens the surface, which is where plain indigo thins out |
| **The highlighter** | **Lime `#CCFF4D`** | Ink on it is **16.4:1**, the strongest pair we own. Used in exactly four places |
| Chart / state accents | violet, teal, rose, amber, green, lime-dark | Six separable hues, all ≥3:1 as marks on white |

The hero headline is now **ink + one lime swash + ink**, and the swash wipes in
like a marker on load (`.hl`, with a reduced-motion branch that shows it fully
drawn). The lime swash appears in exactly four places — the headline, the
registration success moment, one Card Studio theme, and a fold whisper — which is
what makes it a signature instead of decoration. Two supporting accents were
**demoted out of the chrome** to chart-and-state roles; four accents all doing
half a job was the actual reason the screen read as busy.

**Enforced, not documented.** `tests/colour.test.ts` (**43 specs**) imports the
live Tailwind config and asserts every pairing, including the two rules that
carry the design: *lime must stay unusable as text* (so nobody "brightens" it
later and quietly deletes the dots and bars), and *indigo must work as a fill and
as text on that fill*. It also guards the categorical chart palette, which had
its own failures: `#5B3DF5` next to `#7C5CF5` were two violets nobody can
separate in a stacked bar, and a light grey-blue measured 2.56:1 — on a white
chart every mark has to be mid-to-dark, so **hue is the only separator left**,
and the six series now sit 45°–169° apart in `src/lib/palette.ts`.

An earlier audit of the *first* white theme found **14 failing WCAG pairs**, two
of them invisible UI (a lime progress bar at **1.02:1** against its own track; 15
status dots at **1.17:1** on white). The full before/after, every ratio computed
live, is in **`colour-system.html`**; `public/og.png`, the icons and the 2-page
growth plan were regenerated in the same palette by `scripts/make-assets.py`.

---

## 9. The growth loop

```
Student registers
      ↓
Receives a personalised AI project  ← the reason they share at all
      ↓
Gets a referral code + pre-filled WhatsApp message
      ↓
Shares with friends (1 tap, zero typing on a phone)
      ↓
Friends register → attributed to the code
      ↓
Referral count + rank rise (public Builder Wall)
      ↓
Peer pressure + status → shares again
      ↓
More registrations
```

Why it compounds, and why it is the centre of the product:

1. **The share happens at peak enthusiasm** — seconds after receiving something
   valuable (their own project idea), not on a generic “invite a friend” page.
2. **The reward ladder starts at one referral.** Milestone 1 is free and instant;
   the ladder then runs to 10 (Builder Wall feature). All rewards are digital, so
   the marginal cost of the whole loop is ₹0.
3. **Status, not cash, is the incentive.** Students share for rank. A leaderboard
   keeps them sharing for 7 days; a ₹100 voucher would not.
4. **It half-solves the target.** 125 sharers × 2 friends ≈ 250 of the 500
   registrations, at zero cost per acquisition.

---

## 9b. Join-fast features (the conversion layer)

| Feature | What it does | Why it speeds up joining |
|---|---|---|
| **⚡ Quick Join** | Name + email + college → seat + code. The full project-match flow is one tap away, never a wall | Time-to-registered drops from ~40s to ~10s |
| **Campus nudge** | Live "N from your college have joined — rank #R" while typing the college name; exact campus standing on the success screen | Social pull at the exact moment of decision |
| **Class challenge** | (College, branch) cohorts compete on `/leaderboard` | Students join to put their class on the board |
| **Ambassador poster** | Downloadable phone-status PNG: name, project, QR to their join link | Every student becomes a walking channel |
| **Cohort stretch goals** | Real unlocks at 100 / 250 / 500 seats, lit by the real count | Joining feels like joining a movement — no fake scarcity |
| **Remind me** | One email for students not ready yet → admin lead list | Interested-but-not-ready visitors are captured, not lost |

## 10. Referral mechanism (as built)

| Piece | Implementation |
|---|---|
| Code generation | `makeReferralCode(name, email)` → `DEEPIKA47`. First name, uppercased, plus a stable 2-digit suffix hashed from the email, so the same student always gets the same code |
| Link | `/join?ref=CODE` — resolves client-side, shows an attribution banner, auto-opens registration |
| Attribution | Inbound `ref` is captured once per page load and stored; `registration_completed` carries it |
| Share surfaces | WhatsApp (pre-filled message), copy link, LinkedIn; success screen, referral dashboard, mobile sticky CTA |
| Progress | 0→1→3→5→10 milestones with a progress bar and per-milestone unlock copy |
| Leaderboard | Ranked `referrals` with the visitor's own row injected and highlighted; college scoreboard for the ambassador hook |
| Anti-gaming (production) | One credit per verified email + unique constraint, device signal on codes, manual review above 10 referrals |
| Referrals, counted honestly | A referral exists only when a real person registers with the code — server-checked, device-blocked for self-referral |

**WhatsApp message** (pre-filled, personalised with the sender's link):

> I just registered for NxtWave's free "Build Your First AI Project in 60 Minutes"
> workshop 🚀
>
> You should join too! It's beginner-friendly and we'll actually build an AI project.
>
> Register with my link: `[REFERRAL LINK]`

---

## 11. Analytics events

Typed in `src/lib/analytics.ts`. Every event flows through one `track()` call,
so swapping in a real provider is a ~20-line change in one function.

| Event | Fired when | Key props |
|---|---|---|
| `page_view` | Any route mounts | `path`, `ref` |
| `project_generator_open` | Hero generator is ≥40% visible | `location` |
| `project_generated` | Generator settles on a project | `projectId`, `source` |
| `project_generator_open` | Project filter changed | `filter` |
| `project_card_opened` | A project card is tapped | `projectId` |
| `project_selected` | “Build this with me” / locked project | `projectId`, `source` |
| `simulator_started` | First simulator answer | `step`, `interest` |
| `simulator_completed` | Simulator returns a match | `interest`, `experience`, `problem`, `projectId` |
| `idea_saved` | “Save this idea” | `projectId` |
| `registration_started` | Modal opens | `source`, `projectId` |
| `registration_step_completed` | Each step advances | `step`, `interest` |
| `registration_completed` | Seat reserved | `code`, `projectId`, `interest`, `experience`, `college`, `source` |
| `whatsapp_share_clicked` | WhatsApp share tapped | `code`, `source` |
| `linkedin_share_clicked` | LinkedIn share tapped | `code` |
| `referral_link_copied` | Link or code copied | `code`, `kind` |
| `referral_link_visited` | A `?ref=` link is opened | `code` |
| `referral_signup` | A registration lands with someone's `?ref=` code | `code` |
| `quick_join_used` | The 10-second quick join completes | `code`, `source` |
| `remind_me_clicked` | "Remind me" is submitted | `duplicate` |
| `poster_downloaded` | The ambassador poster is saved | `code`, `projectId` |
| `arrival_attributed` | A `?src=` / `?utm_source=` link is opened | `source` |
| `reply_sent` | The home-page reply form is submitted | `hasEmail` |
| `leaderboard_viewed` | Leaderboard section seen | `rank`, `referrals` |
| `cta_clicked` | Any CTA, with location | `location`, `label` |
| `faq_opened` | FAQ item expanded | `question` |
| `countdown_viewed` | Countdown first seen | `hoursLeft` |
| `admin_viewed` / `strategy_viewed` | Reviewer routes | — |

**Where to plug in the real thing** — inside `flush()` in `src/lib/analytics.ts`:

```ts
w.dataLayer?.push({ event, ...props });          // GTM / GA4 (already wired, no-op if absent)
w.posthog?.capture?.(event, props);              // PostHog (already wired)
w.gtag?.('event', event, props);                 // GA4 direct (already wired)
// Supabase: await supabase.from('analytics_events').insert({...})
```

`/admin` also renders a **live, real** event stream and funnel from the current
session — the fastest way to prove the instrumentation works. Event counts are
persisted to the `events` table and drive the measured funnel on `/strategy`.

---

## 12. Assumptions

1. A 60-minute free evening workshop is an acceptable commitment for a final-year
   student. If evening attendance fails, move to weekend mornings.
2. The 500-seat cap is enforced — otherwise the scarcity copy must be removed.
3. The 60-minute promise is credible: every catalogue project is scoped to finish
   in one sitting, with the code provided.
4. Students share for **status** rather than cash (this is the biggest assumption
   in the referral loop).
5. An average sharer brings friends; the referral share of registrations is
   measured live on `/strategy` rather than assumed.
6. WhatsApp group forwarding is permissioned — ambassadors are recruited through
   club leads, not cold-DM'd.
7. Final-year engineering students are a large enough pool that 500 is a
   conversion problem, not a market-size problem.
8. Rule-based matching is good enough to pick a *starter* project. Personalisation
   should not delay the registration.

---

## 13. Where every number comes from

The site shows **no demo data at all**. This was a deliberate teardown of the
original prototype (which shipped a seeded 347-row campaign and labelled demo
panels): every number now comes from one of exactly two places.

| Numbers | Source |
|---|---|
| Registrations, seats left, leaderboard, activity feed, college standings, channel attribution, daily curve, top projects, the funnel | **Measured** — SQL over `students`, `referrals` and `events` |
| 500-seat cap · milestone thresholds (1/3/5/10) · 60-minute format · ₹0 reward cost · workshop date | **Product rules** — labelled as such wherever they appear |
| Metric goals on `/strategy` (`≥ 65%`, `< ₹15`, …) | **Goals**, shown in a goal column next to the measured current value |

What does **not** exist anywhere in the product: seeded rows, demo fallbacks,
projected funnels, channel contribution targets, a budget split, invented
ticker/leaderboard names, or a "simulate a friend" button. Counts start at zero
and move only when real people register. The full written growth plan (budget,
channel targets, the 7-day schedule) is the separate **`growth-plan.html`**
submission document — it is a plan, so it does not appear as data.

The one fixture left is `server/seed.mjs`, gated behind `ALLOW_SEED=1`, for
local UI work only.

---

## 14. Testing

`npm test` — **144 specs in 8 files**, all green (`npx vitest run`).

| File | Specs | What it pins |
|---|---|---|
| `tests/funnel.test.tsx` | 15 | Hero → generator → 3-step registration → success → referral dashboard; validation; the `/admin` login gate; routes |
| `tests/navigation.test.tsx` | 9 | Cross-page routing, CTA paths, deep links |
| `tests/tools.test.tsx` | 6 | Quiz, Vault, Prompt Lab, Card Studio |
| `tests/a11y.test.tsx` | 7 | Keyboard, focus, labels, landmarks |
| `tests/colour.test.ts` | 43 | Contrast + the categorical palette rules |
| `tests/api.test.ts` | 38 | The HTTP contract: registration + normalisation, attribution end-to-end, the referral loop, replies inbox, **admin auth**, analytics ingest, rate limits, the error contract |
| `tests/catalogue.test.ts` | 16 | The one id space, the channel alias table, migration v1→v4 (slug rewrites, lossless, idempotent) |
| `tests/live-data.test.tsx` | 10 | Real-or-nothing rules: live rows render unlabelled-as-demo-free, counters come from `/api/stats`, offline yields empty states + retry, the reply form round-trips to the inbox |

Two suites drive real infrastructure: `api.test.ts` spawns the actual server on
a random port against a throwaway SQLite file, and `catalogue.test.ts` boots
against v1-era fixture files to prove the migrations. `live-data.test.tsx`
stubs `fetch` with the real response shapes.



---

## 15. The backend

Node 20 + Express 5 + better-sqlite3. No ORM, no external database, no API
keys. Every public number on the site is a query against this database.

### Why one port

`node server/server.mjs` serves the built app (`dist/`) AND the JSON API from
the same origin, so there is no CORS, no second URL and no proxy in production.
The Vite dev server (5173) proxies nothing — the frontend detects a missing API
and shows honest empty states instead (see below).

### Schema (9 tables)

`students` (with `source` for channel attribution, `referred_by` for the loop),
`referrals` (referrer→referred, unique on the referred code), `events` (the
analytics sink), `messages` (**the replies inbox**), `reminders` (**remind-me
leads**), `vault_ideas`, `quiz_results`, `prompts`, `meta`, `sqlite_sequence`.

### The endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | `{ok, storage, students}` — the mode probe |
| GET | `/api/stats` | total, target, spotsLeft, today, referralRegs, percent, referralShare, **eventCounts** (the live funnel), **sources** (measured channel mix) |
| POST | `/api/register` | idempotent by `lower(email)`; normalises project/interest/experience/year/source onto the catalogue; unknown enrichment → `null`, never a 400; returns the student's exact `campus` standing |
| GET | `/api/activity?limit` | first name + college only |
| GET | `/api/catalogue` | projects, interests, experience, years, sources, `workshopDate` |
| GET | `/api/leaderboard?limit&you` | + `colleges` + `classes` (the class challenge) |
| GET | `/api/students/:code` | + `referralCount`, `rank`, `friends` (first names only) |
| POST | `/api/events` | ≤200 per batch |
| POST | `/api/messages` | the public reply form → the inbox |
| POST | `/api/reminders` | the soft commitment — idempotent per email |
| POST | `/api/admin/login` · `/api/admin/logout` | signed HttpOnly cookie (12h) |
| GET | `/api/admin/me` | `{authenticated}` — public |
| GET | `/api/admin/summary` | **auth** — sources, daily, colleges, topProjects, events, recent |
| GET · PATCH · DELETE | `/api/admin/messages[/:id]` | **auth** — list / mark read-unread / delete |
| GET · PATCH · DELETE | `/api/admin/reminders[/:id]` | **auth** — remind-me leads |
| GET · POST · DELETE | `/api/vault…` | device-keyed saved ideas |
| GET · POST | `/api/quiz…` | device-keyed quiz result |
| GET · POST | `/api/prompts…` | device-keyed saved prompts |

### Migrations, not resets

`server/db.mjs` carries an append-only `MIGRATIONS[]` (v1 schema → v2 attribution
+ email integrity → v3 one id space → v4 replies inbox). Each runs once, in
order, inside a transaction; the array index IS the version and a boot-time
guard throws if the names drift out of order. The database that is already in
front of students survives every schema change.

### Rate limiting and the error contract

60-second windows per IP+path: register 30 · events 240 · messages 12 · reminders
12 · admin login 10 · default 300. `X-RateLimit-Limit/Remaining` on every response, `429`
carries `Retry-After`. Failures are always JSON: `400 invalid_json`, `400
<field>_invalid`, `401 unauthorized`, `413 payload_too_large`, `404
unknown_endpoint`, `429 rate_limited`.

### Self-referral is blocked by device

A referral credit requires a registration with a code from a **different device
id** than the referrer's. Name/email matching is trivially gamed; the device
signal is not. (Pinned by tests.)

### When the API is unreachable

The frontend does not fabricate. Panels show empty states with the reason
("the campaign database is unreachable") and a retry control that re-probes.
This is the honest opposite of the original prototype's demo fallback — and it
is pinned by `tests/live-data.test.tsx`.

### Production deployment

- **One node process** (`npm run build && npm start`) behind a TLS proxy — app +
  API + SQLite file. Cheapest honest deployment; SQLite is fine at this scale.
- Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`; set `WORKSHOP_DATE` when the
  cohort is scheduled.
- For a fleet: move to hosted Postgres (Neon/Supabase) — only `server/db.mjs`
  changes — and a managed rate limiter. Keep the migrations.
- A serverless platform (Vercel/Netlify) can host the frontend, but the API
  needs a stateful host for the SQLite file; a single Fly.io/Railway node runs
  both.

---

## 16. What I deliberately did not build

- **Multi-user admin accounts.** One shared password + a signed cookie. Real
  accounts, roles and audit history belong to a production console.
- **A hosted database.** The single-node SQLite file is the right size for this
  campaign; Postgres is a swap, not a rewrite.
- **WhatsApp Business API.** The share flow deep-links into WhatsApp with the
  pre-filled message, which works today and needs no approval.
- **A chatbot.** The FAQ and the replies inbox answer the same questions with
  zero latency and zero cost.

---

## 17. License / attribution

Built for the NxtWave Growth Intern – Growth Challenge. Project names and the
workshop concept are part of the challenge submission; treat the rest as
MIT-licensed sample code.
