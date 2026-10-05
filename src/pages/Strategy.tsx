import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Compass,
  Gauge,
  GitBranch,
  Layers,
  LineChart,
  Sparkles,
  Target,
  Users,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Card, DataSourceTag, Section } from '../components/ui';
import { useRegistration } from '../components/RegistrationProvider';
import { useApp } from '../store/AppStore';
import { track } from '../lib/analytics';
import { cn, nf } from '../lib/utils';
import { RouteLink } from '../lib/router';

/* ==========================================================================
   /STRATEGY — the growth story, with the live scoreboard underneath it.
   ---------------------------------------------------------------------------
   Rules for this page (agreed with the user): every number shown is either
   MEASURED from the campaign database or clearly a goal / product rule.
   Projections, modelled funnels, channel targets and budget splits are gone
   from the site — the full written plan lives in growth-plan.html, the 5-slide
   submission document, not in the product.
   ========================================================================== */

const SECTIONS = [
  { id: 'student', label: 'Target student' },
  { id: 'why', label: 'Why they care' },
  { id: 'triggers', label: 'Registration triggers' },
  { id: 'channels', label: 'Channels' },
  { id: 'growth-engine', label: 'The loop, measured' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'thinking', label: 'How I thought' },
  { id: 'ai-notes', label: 'AI + learning notes' },
  { id: 'assumptions', label: 'Assumptions' },
  { id: 'architecture', label: 'Architecture' },
];

/** Channel strategy, written as judgement — no contribution or cost numbers. */
const CHANNELS = [
  {
    name: 'WhatsApp college communities',
    why: 'Highest trust channel for Indian students. A message from a classmate outperforms any ad, and forwarding is frictionless.',
    action:
      'Ambassadors drop the link in targeted final-year groups with a “project idea” hook message instead of a generic invite.',
  },
  {
    name: 'College coding clubs & placement cells',
    why: 'Existing, permissioned distribution. Clubs already own the attention of exactly the students who care about a portfolio.',
    action:
      'Club leads get the referral engine plus a shareable college-vs-college scoreboard. The incentive is status, not cash.',
  },
  {
    name: 'Referral loop (built into the product)',
    why: 'The only channel that compounds. Every registrant gets a personalised project and a shareable link at the moment of peak enthusiasm.',
    action:
      'The success screen hands over the project card, the code and a pre-filled WhatsApp message in one tap.',
  },
  {
    name: 'Email (placement-cell lists)',
    why: 'Cheap and scalable, but low intent. Used as a reminder layer, never as the primary ask.',
    action: 'One announcement and one reminder to opted-in department lists.',
  },
  {
    name: 'LinkedIn student communities',
    why: 'Small volume, high credibility. Makes the campaign look legitimate when students search for it.',
    action: 'Ambassador posts with the project card as the creative.',
  },
  {
    name: 'Organic / direct (search, shares, word of mouth)',
    why: 'Free upside. Everyone who arrives without a tracked link lands here — and every share message carries one.',
    action:
      'Nothing to buy. Measured separately so a paid channel is never credited for spillover.',
  },
];

export function Strategy() {
  const [active, setActive] = useState('student');
  const { openRegistration } = useRegistration();
  const { totalRegistrations, target, eventCounts, sources, collegeScoreboard, referralRegs } = useApp();

  useEffect(() => {
    track('strategy_viewed');
  }, []);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: [0, 0.15, 0.4] },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ------------------------------------------------- live measurements */
  const countOf = (name: string) => eventCounts.find((e) => e.name === name)?.count ?? 0;
  const pageViews = countOf('page_view');
  const generatorOpens = countOf('project_generator_open');
  const regStarts = countOf('registration_started');
  const regCompletions = countOf('registration_completed');
  const shares = countOf('whatsapp_share_clicked');
  const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—');
  const topCollegeShare = (() => {
    const cols = collegeScoreboard ?? [];
    const total = cols.reduce((n, c) => n + c.students, 0);
    return total && cols[0] ? `${((cols[0].students / total) * 100).toFixed(1)}%` : '—';
  })();

  return (
    <div className="min-h-screen pb-24">
      {/* header */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-violet/30 bg-violet/10">
              <Compass className="h-4 w-4 text-violet" />
            </span>
            <div>
              <p className="text-[13px] font-semibold leading-none text-ink">Growth strategy</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                /strategy · for reviewers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RouteLink
              to="/admin"
              className="hidden items-center gap-1.5 rounded-xl border border-line bg-surface-3 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-surface-4 sm:inline-flex"
            >
              <Gauge className="h-3.5 w-3.5" />
              Dashboard
            </RouteLink>
            <RouteLink
              to="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-3 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-surface-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Product
            </RouteLink>
          </div>
        </div>
      </header>

      <Section className="pt-10">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-14">
          {/* ---------------------------------------------------------- index */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="mono-label">On this page</p>
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => jump(s.id)}
                  className={cn(
                    'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition',
                    active === s.id
                      ? 'bg-surface-4 text-ink'
                      : 'text-ink-muted hover:bg-surface-3 hover:text-ink',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </nav>

            <div className="mt-6 hidden rounded-xl border border-line bg-surface-2 p-3.5 lg:block">
              <p className="text-[11px] leading-relaxed text-ink-faint">
                Built in 48 hours for the NxtWave Growth Intern challenge. The product is live and every
                campaign number on this page is measured from its database.
              </p>
            </div>
          </aside>

          {/* ---------------------------------------------------------- content */}
          <div className="min-w-0">
            <div className="max-w-3xl">
              <Badge tone="violet">
                <Sparkles className="h-3 w-3" />
                NxtWave Growth Intern — Growth Challenge
              </Badge>
              <h1 className="title-lg mt-5">
                Get 500 final-year students into a free 60-minute AI workshop.
                <br />
                <span className="text-ink-muted">One coherent loop, measured end to end.</span>
              </h1>
              <p className="mt-5 text-[15px] leading-relaxed text-ink-muted">
                The plan below is one coherent growth experiment, not a list of tactics. The product you just
                came from exists to execute it: it converts a visitor into a project-matched registrant, then
                hands them a referral link at the moment of peak enthusiasm — which is the only channel that
                compounds and costs nothing per acquisition. Everything the campaign claims is counted in the
                campaign database, and this page reads from it live.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => openRegistration({ source: 'strategy_page' })}>
                  See the funnel in action
                </Button>
                <RouteLink to="/admin" className="btn btn-secondary">
                  Open campaign dashboard
                </RouteLink>
              </div>
            </div>

            {/* ------------------------------------------------------ 1. student */}
            <Block id="student" icon={Users} title="1. The target student" kicker="Who exactly">
              <p>
                One primary persona, chosen because it is big enough to yield 500 and narrow enough to write
                copy for.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <PersonaCard
                  title="Primary — “Placement Season Priya”"
                  lines={[
                    'Final year (2026 batch), tier-2/3 engineering college in a tier-1/2 city',
                    'CSE / IT / AI-DS branch, 6.5–8 CGPA',
                    'Knows basic Python or Java, has done 2–3 academic projects',
                    'Placement prep starts in 6 weeks; her resume has no project she is proud of',
                    'Uses a phone most of the day; laptop for college work',
                    'Gets most information from WhatsApp groups and seniors, not LinkedIn',
                  ]}
                />
                <PersonaCard
                  title="Secondary — “AI-curious Aarav”"
                  lines={[
                    'Third year, already building small projects, wants one AI project on the resume',
                    'Higher intent, lower volume — converts better',
                    'Also our best referral source: one sharer brings friends',
                  ]}
                  muted
                />
              </div>
              <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4">
                <p className="text-[13px] font-semibold text-ink">Deliberately excluded</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                  Working professionals, first/second years, and “AI enthusiasts” with no placement pressure.
                  They dilute the message — a workshop that promises a portfolio project means nothing to
                  someone who is not about to interview.
                </p>
              </div>
            </Block>

            {/* ---------------------------------------------------------- 2. why */}
            <Block id="why" icon={Target} title="2. Why they care" kicker="Motivation ladder">
              <p>
                The workshop sells an emotion, not a curriculum. Working up the ladder from the surface reason
                to the real one:
              </p>
              <ol className="space-y-3">
                {[
                  ['Level 1 — Surface', '“AI is the future.” A reason to click, not to attend. Every other webinar uses it.'],
                  ['Level 2 — Utility', 'AI skills are on job descriptions. Still abstract until placement week.'],
                  ['Level 3 — Identity', '“I want to be someone who builds AI, not someone who watches AI videos.” This is what the hero copy targets.'],
                  ['Level 4 — Fear', 'Final year ends in months and the resume has nothing defensible. This is the real driver, and the pain-point section names it out loud.'],
                ].map(([label, text]) => (
                  <li key={label} className="flex gap-3.5 rounded-xl border border-line bg-card p-4">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-deep" />
                    <div>
                      <p className="text-[13px] font-semibold text-ink">{label}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
                <span className="font-semibold text-ink">Implication for the product:</span> lead with the
                deliverable (a working prototype + a project idea), never the technology. The first interactive
                thing a visitor can do is generate the project they will build — that is the moment the
                workshop stops being generic.
              </p>
            </Block>

            {/* ----------------------------------------------------- 3. triggers */}
            <Block id="triggers" icon={Sparkles} title="3. What makes them register" kicker="Registration triggers">
              <p>Five triggers, in the order they fire inside the product:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['A specific idea, not a topic', '“AI Resume Analyzer” beats “learn AI”. Specificity removes the “I don’t know what I’d build” objection in seconds.'],
                  ['A 60-minute, single-sitting promise', 'The commitment is small enough to say yes to immediately, and the deadline is the reason they finish.'],
                  ['Zero prerequisites, stated explicitly', '“No experience needed” alone is not enough — we say what they need (a laptop) and what they do not (GPU, paid tools, prior AI knowledge).'],
                  ['Visible peers already in', 'Seats filling + activity ticker + leaderboard: the workshop looks like something their classmates have joined.'],
                  ['A reason to invite friends', 'Referral codes with a ladder of digital rewards give them status for sharing, so registration is not a transaction — it is an entry ticket to a game.'],
                ].map(([title, text], i) => (
                  <div key={title} className="rounded-xl border border-line bg-card p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-6 w-6 place-items-center rounded-lg border border-brand/70 bg-brand/20 font-mono text-[10px] font-bold text-brand-deep">
                        {i + 1}
                      </span>
                      <p className="text-[13px] font-semibold text-ink">{title}</p>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{text}</p>
                  </div>
                ))}
              </div>
            </Block>
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------------- 4. channels */}
      <Section id="channels" className="border-t border-line">
        <div className="max-w-3xl">
          <h2 className="title-lg flex items-center gap-3">
            <Target className="h-6 w-6 text-brand-deep" />
            4. Channels, ranked by judgement
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
            Six channels, prioritised — not twenty ideas. The ranking is a bet about trust and permission; the
            measured attribution below is how the bet gets scored. No channel is listed with a projected
            number: contributions are counted from each registration&apos;s own source field, and cost is
            tracked in the campaign&apos;s own budget sheet (the written plan lives in growth-plan.html).
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-brand/70 bg-brand/20 font-mono text-[10px] font-bold text-brand-deep">
                    {i + 1}
                  </span>
                  <p className="text-[13px] font-semibold leading-snug text-ink">{c.name}</p>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">{c.why}</p>
                <p className="mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-muted">
                  <span className="font-semibold text-ink">Action: </span>
                  {c.action}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------- 5. the loop, measured */}
      <Section id="growth-engine" className="border-t border-line">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <h2 className="title-lg flex items-center gap-3">
              <LineChart className="h-6 w-6 text-brand-deep" />
              5. The loop, measured
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
              The product IS the campaign: generate a project → register → get a code → share → friends
              register → rank rises → share again. These panels are the loop&apos;s live vitals — every value
              is counted from stored events and registrations, not modelled.
            </p>
          </div>
          <DataSourceTag />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card className="p-5 sm:p-6">
            <p className="mono-label">Live funnel</p>
            <ul className="mt-4 space-y-3">
              {[
                { k: 'Visited the site', v: pageViews },
                { k: 'Opened the project generator', v: generatorOpens },
                { k: 'Started registration', v: regStarts },
                { k: 'Completed registration', v: regCompletions },
                { k: 'Clicked WhatsApp share', v: shares },
              ].map((row) => (
                <li key={row.k}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] text-ink-muted">{row.k}</span>
                    <span className="font-mono text-[13px] font-semibold text-ink">{nf(row.v)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-brand-deep to-brand-edge"
                      initial={{ width: 0 }}
                      whileInView={{
                        width: `${(row.v / Math.max(1, pageViews, ...[generatorOpens, regStarts, regCompletions, shares])) * 100}%`,
                      }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9 }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
              Counted from analytics events stored by the API. With no visitors yet, every stage is honestly
              zero.
            </p>
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="mono-label">Where registrations come from</p>
            {sources.length ? (
              <ul className="mt-4 space-y-3">
                {sources.map((row, i) => (
                  <li key={row.source}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] text-ink-muted">{row.source}</span>
                      <span className="font-mono text-[13px] font-semibold text-ink">
                        {nf(row.registrations)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-cyan to-violet"
                        initial={{ width: 0 }}
                        whileInView={{
                          width: `${(row.registrations / Math.max(1, ...sources.map((x) => x.registrations))) * 100}%`,
                        }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: i * 0.06 }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-line px-3.5 py-6 text-center text-[12px] leading-relaxed text-ink-muted">
                Attribution appears as soon as registrations land. Every row carries the channel it came from.
              </p>
            )}
            <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
              Measured from each registration&apos;s own source field — never inferred.
            </p>
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="mono-label">Progress to the seat cap</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-4xl font-semibold leading-none tracking-tightest text-ink">
                {nf(totalRegistrations)}
              </span>
              <span className="pb-0.5 text-lg font-semibold text-ink-faint">/ {nf(target)}</span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
              Seats are the product rule and the honest scarcity: the cap is enforced by the database, not by a
              countdown trick.
            </p>
            <div className="mt-4 space-y-2.5 border-t border-line pt-4 text-[12px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ink-muted">Visitor → generator open</span>
                <span className="font-mono font-semibold text-ink">{pct(generatorOpens, pageViews)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ink-muted">Generator → registration start</span>
                <span className="font-mono font-semibold text-ink">{pct(regStarts, generatorOpens)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ink-muted">Registrant → WhatsApp share</span>
                <span className="font-mono font-semibold text-ink">{pct(shares, regCompletions)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ink-muted">Referral share of registrations</span>
                <span className="font-mono font-semibold text-ink">
                  {pct(referralRegs, totalRegistrations)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* ------------------------------------------------------------- metrics */}
      <Section id="metrics" className="border-t border-line">
        <div className="max-w-3xl">
          <h2 className="title-lg flex items-center gap-3">
            <Gauge className="h-6 w-6 text-brand-deep" />
            6. Key metrics
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
            One number the campaign is judged on, three that predict it, and three that protect it. The
            “current” column is measured; the “goal” column is the bar — labelled as a goal, never shown as a
            result.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <MetricGroup
            title="North star"
            tone="acid"
            items={[
              ['Verified registrations', 'goal: 500', `current: ${nf(totalRegistrations)} · capped by seats, so it cannot be gamed by chasing volume`],
              ['Attendance rate', 'goal: 60%+', 'current: measured after the session · registration is a promise; attendance is the proof'],
            ]}
          />
          <MetricGroup
            title="Leading indicators"
            tone="cy"
            items={[
              ['Visitor → generator open', 'goal: ≥ 65%', `current: ${pct(generatorOpens, pageViews)} · if low, the hero is not landing`],
              ['Generator → registration start', 'goal: ≥ 75%', `current: ${pct(regStarts, generatorOpens)} · whether the project match is convincing`],
              ['Sharing rate', 'goal: ≥ 20%', `current: ${pct(shares, regCompletions)} · leading indicator of the referral loop`],
            ]}
          />
          <MetricGroup
            title="Guardrails"
            tone="violet"
            items={[
              ['Cost per registration', 'goal: < ₹15', 'current: tracked in the campaign budget sheet (offline)'],
              ['College concentration', 'goal: < 15%', `current: ${topCollegeShare} of registrations from the top college`],
              ['Referral quality', 'rule: 1 credit / verified email', 'server-side, device-attributed — protects the leaderboard from gaming'],
            ]}
          />
        </div>
      </Section>

      {/* ------------------------------------------------------------ thinking */}
      <Section id="thinking" className="border-t border-line">
        <div className="max-w-3xl">
          <h2 className="title-lg flex items-center gap-3">
            <Brain className="h-6 w-6 text-brand-deep" />
            7. How I thought
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
            The three questions from the challenge brief, answered honestly.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <ThinkingCard
            icon={GitBranch}
            title="What changed between my first idea and the final solution?"
            body={[
              'First idea: a landing page with a registration form, plus a campaign plan. Exactly the “everyone builds a landing page” trap the brief warns about.',
              'What changed: I stopped treating the page as the asset and made the referral engine the asset. The page is now a funnel — generate a project → register → get a personalised project card → share a link → climb a leaderboard.',
              'The second change was scope honesty. I cut a live AI API for the recommender (no key, no latency, no cost) and went rule-based and explainable instead. An LLM would have made the demo look cleverer and the product worse.',
              'Third: I cut paid ads from the budget entirely. At this budget size, ads buy impressions from the wrong audience; ambassadors buy permission inside the right WhatsApp groups.',
            ]}
          />
          <ThinkingCard
            icon={Clock}
            title="If I had another 24 hours, what would I improve?"
            body={[
              '1. WhatsApp: a WhatsApp Business API flow so registration can complete inside WhatsApp with no page load at all.',
              '2. Post-workshop retention loop: an automated nudge to finish the deploy, because that is where students actually churn, plus a gallery of finished student projects as proof for the next cohort.',
              '3. Ambassador console: per-college links, live targets, and an auto-generated daily scoreboard message they can forward without writing anything.',
              '4. A placement-gap quiz as a pre-registration hook — better qualification signal than the interest chips, and it doubles as a shareable result card.',
            ]}
          />
          <ThinkingCard
            icon={XCircle}
            title="What did AI suggest that I rejected?"
            body={[
              '“Add a countdown with a fake 24-hour expiry and reset it daily.” Rejected — manufactured scarcity breaks trust the moment a student notices the reset, and the seat cap already provides real scarcity.',
              '“Include fake student testimonials with Indian names and college logos.” Rejected — the brief explicitly warns against it, and a reviewer who spots one fabricated quote discounts the whole submission.',
              '“Lead with ‘Learn AI & Machine Learning’ as the headline.” Rejected — it describes the workshop, not the outcome. “Build Your First AI Project in 60 Minutes” names the deliverable and the deadline.',
              '“Add a chatbot that answers workshop questions.” Rejected for this scope — it solves a support problem the campaign does not have, while the FAQ and the reply box solve it with zero latency.',
            ]}
          />
        </div>
      </Section>

      {/* ----------------------------------------------------------- AI notes */}
      <Section id="ai-notes" className="border-t border-line">
        <div className="max-w-3xl">
          <h2 className="title-lg flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-brand-deep" />
            8. AI + learning notes
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
            Three real examples of the loop I actually ran: what I asked, what the model suggested, and what I
            changed — including the parts I threw away.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {[
            {
              n: 'Example 1',
              asked:
                '“Act as a growth lead at an Indian edtech company. Give me a prioritised acquisition plan to get 500 final-year engineering students to register for a free AI workshop with a small budget and 7 days.”',
              suggested:
                'A 12-channel list — Instagram reels, YouTube shorts, Telegram, Reddit, SEO blog, Discord, paid ads, college fests, email, LinkedIn, WhatsApp, influencers.',
              changed:
                'Rejected 7 of the 12. Instagram/YouTube/paid ads cannot be tested meaningfully in 7 days at this budget, and Reddit/Discord have negligible final-year-engineering density in India. Collapsed the list into 6 ranked channels with the reasoning written down, so the plan is falsifiable. The AI gave breadth; prioritisation and channel economics were mine.',
            },
            {
              n: 'Example 2',
              asked:
                '“I have a landing page and a registration form. How do I get students to invite their friends without paying for rewards?”',
              suggested:
                'A points system with a rewards catalogue (Amazon vouchers, course discounts, swag) and a tiered affiliate scheme with cash payouts.',
              changed:
                'Kept the tiered idea, killed the cash and the catalogue. Replaced it with four digital milestones (checklist → starter kit → priority Q&A → Builder Wall feature) that cost ₹0 to fulfil and are worth more to a student than a small voucher. Also added the thing the model did not suggest, which is the actual growth mechanic: you only start sharing if you already received something worth sharing, so the personalised project card comes before the referral link in the flow.',
            },
            {
              n: 'Example 3',
              asked:
                '“Write the hero copy for a free AI workshop landing page targeting final-year engineering students.”',
              suggested:
                '“Unlock Your AI Potential: Master Artificial Intelligence with Industry-Expert Mentors and Build Future-Ready Skills.”',
              changed:
                'Rewrote completely. It is buzzword soup that says nothing a 21-year-old would repeat to a friend. Shipped a concrete deliverable headline instead — “Build Your First AI Project in 60 Minutes” — and kept the loss-framed line (“Stop watching. Start building.”) as supporting copy. This is the clearest example of where AI helps (volume of options) and where it does not (taste for the audience).',
            },
          ].map((ex, i) => (
            <motion.div
              key={ex.n}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
            >
              <Card className="p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <Badge tone="violet">{ex.n}</Badge>
                  <span className="text-[11px] text-ink-faint">ask → suggestion → decision</span>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <NoteCol label="What I asked" icon={Users} tone="neutral" text={ex.asked} mono />
                  <NoteCol label="What AI suggested" icon={Brain} tone="violet" text={ex.suggested} />
                  <NoteCol label="What I changed and why" icon={CheckCircle2} tone="acid" text={ex.changed} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-surface-2 p-5 sm:p-6">
          <p className="text-[13px] font-semibold text-ink">What I learned about working with AI tools</p>
          <ul className="mt-3 grid gap-2.5 text-[13px] leading-relaxed text-ink-muted sm:grid-cols-2">
            <li>
              <span className="font-semibold text-ink">AI is best at options; humans must choose.</span> Every
              rejection above was a prioritisation call, and prioritisation is the actual skill being tested.
            </li>
            <li>
              <span className="font-semibold text-ink">Taste does not come from the model.</span> The copy that
              works for a 21-year-old in Coimbatore is not the copy that wins a marketing brief.
            </li>
            <li>
              <span className="font-semibold text-ink">Speed comes from scaffolding, not from prose.</span> The
              highest-value use was generating the boring 40% — component scaffolding, chart configs, the
              analytics event list — so my time went into the funnel, the loop and the engineering decisions.
            </li>
            <li>
              <span className="font-semibold text-ink">AI cannot tell you what to cut.</span> Every deletion in
              this product (the chatbot, the fake scarcity, the paid ads, the LLM recommender, the demo data)
              came from asking “does this move registrations?” — not from the model.
            </li>
          </ul>
        </div>
      </Section>

      {/* --------------------------------------------------------- assumptions */}
      <Section id="assumptions" className="border-t border-line">
        <div className="max-w-3xl">
          <h2 className="title-lg flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-ember" />
            9. Assumptions &amp; where numbers come from
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
            Stated plainly, so nothing on this site can be mistaken for something it is not.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <p className="mono-label flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-cyan" />
              Assumptions
            </p>
            <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-ink-muted">
              {[
                'A 60-minute free workshop on a weekday evening is an acceptable commitment for a final-year student. If evening attendance fails, the format moves to weekend mornings.',
                'The seat cap of 500 is enforced. If it is not, the scarcity copy is a lie and must be removed.',
                'Millions of final-year students exist across tier-2/3 colleges, so 500 is a rate problem, not a market-size problem.',
                'The 60-minute promise is credible. Every project in the catalogue is scoped to finish in one sitting by a beginner with provided code.',
                'Students will share if the reward is status rather than cash. This is the single biggest assumption in the referral loop.',
                'WhatsApp message forwarding is permissionless inside groups. Ambassadors are recruited through club leads, not cold outreach.',
              ].map((a) => (
                <li key={a} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                  {a}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="mono-label flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-ember" />
              Where every number on this site comes from
            </p>
            <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-ink-muted">
              {[
                'Registrations, leaderboard, activity feed, college standings, channel attribution and the funnel — read live from the campaign database (SQLite via the Express API).',
                'Counts start at zero and move only when real people register. There is no seeded baseline and no demo fallback anywhere in the product.',
                'Product rules — the 500-seat cap, the milestone thresholds, the 60-minute format, the ₹0 reward cost — are labelled as rules wherever they appear.',
                'Goals (“≥ 65%”, “< ₹15”) are targets, shown in a goal column, never presented as results.',
                'The workshop date is a real, explicit datetime configured on the server (WORKSHOP_DATE), printed next to the countdown.',
                'The full written growth plan — budget split, channel targets, the 7-day schedule — is the separate growth-plan.html submission document. It is a plan, so it does not appear as data on the product.',
              ].map((a) => (
                <li key={a} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                  {a}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      {/* -------------------------------------------------------- architecture */}
      <Section id="architecture" className="border-t border-line">
        <div className="max-w-3xl">
          <h2 className="title-lg flex items-center gap-3">
            <Layers className="h-6 w-6 text-brand-deep" />
            10. Architecture &amp; production path
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
            React 18 + TypeScript + Tailwind + Framer Motion + Recharts on the front; Node 20 + Express +
            better-sqlite3 on the back, with versioned migrations and one shared catalogue. Full setup
            instructions, the analytics event list and the deployment path are in the README next to this
            project.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <p className="mono-label">Running now</p>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-muted">
              <li>SQLite database behind a JSON API — registrations, referrals, events, saved ideas, replies</li>
              <li>Referral codes + server-side attribution, self-referral blocked per device</li>
              <li>Admin dashboard behind a password, with a replies inbox</li>
              <li>One catalogue file shared by client and server, enforced by tests</li>
              <li>Versioned, append-only schema migrations</li>
            </ul>
          </Card>
          <Card className="p-5">
            <p className="mono-label">Production (next step)</p>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-muted">
              <li>Hosted Postgres (Neon/Supabase) in place of the local SQLite file</li>
              <li>PostHog for the funnel, GA4 for acquisition (one analytics seam)</li>
              <li>WhatsApp Business API for the in-chat share flow</li>
              <li>Deploys with OG image + per-college UTM links</li>
              <li>Admin auth with real accounts + session expiry</li>
            </ul>
          </Card>
          <Card className="p-5">
            <p className="mono-label">Why this shape</p>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-muted">
              <li>The whole loop works in one process, so it demos with no infrastructure</li>
              <li>The recommender is deterministic, so nothing depends on an API key</li>
              <li>Every campaign number is a SQL query — nothing to keep in sync by hand</li>
              <li>Analytics is one seam, so swapping in a real provider touches one function</li>
            </ul>
          </Card>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Block({
  id,
  icon: Icon,
  title,
  kicker,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-14 scroll-mt-24 first:mt-0">
      <p className="mono-label">{kicker}</p>
      <h2 className="mt-2 flex items-center gap-3 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        <Icon className="h-5 w-5 shrink-0 text-brand-deep" />
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

function PersonaCard({ title, lines, muted }: { title: string; lines: string[]; muted?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-5',
        muted ? 'border-line bg-surface-2' : 'border-brand/70 bg-brand/[0.12]',
      )}
    >
      <p className={cn('text-[14px] font-semibold', muted ? 'text-ink-muted' : 'text-ink')}>{title}</p>
      <ul className="mt-3 space-y-2">
        {lines.map((l) => (
          <li key={l} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-muted">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-deep" />
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: [string, string, string][];
  tone: 'acid' | 'cy' | 'violet';
}) {
  return (
    <Card className="p-5 sm:p-6">
      <Badge tone={tone}>{title}</Badge>
      <ul className="mt-5 space-y-4">
        {items.map(([name, target, why]) => (
          <li key={name}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold text-ink">{name}</p>
              <p className="shrink-0 font-mono text-[12px] font-semibold text-brand-deep">{target}</p>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{why}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ThinkingCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string[];
}) {
  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-brand/70 bg-brand/20">
        <Icon className="h-4 w-4 text-brand-deep" />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold leading-snug text-ink">{title}</h3>
      <div className="mt-3 space-y-3">
        {body.map((p) => (
          <p key={p} className="text-[13px] leading-relaxed text-ink-muted">
            {p}
          </p>
        ))}
      </div>
    </Card>
  );
}

function NoteCol({
  label,
  icon: Icon,
  tone,
  text,
  mono,
}: {
  label: string;
  icon: React.ElementType;
  tone: 'neutral' | 'violet' | 'acid';
  text: string;
  mono?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        tone === 'violet'
          ? 'border-violet/25 bg-violet/[0.07]'
          : tone === 'acid'
            ? 'border-brand/70 bg-brand/[0.12]'
            : 'border-line bg-surface-2',
      )}
    >
      <p className="mono-label flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p
        className={cn(
          'mt-2.5 text-[12px] leading-relaxed text-ink-muted',
          mono && 'rounded-lg border border-line bg-surface-2 p-2.5 font-mono text-[11px]',
        )}
      >
        {text}
      </p>
    </div>
  );
}
