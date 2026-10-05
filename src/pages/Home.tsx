import { motion } from 'framer-motion';
import { ArrowRight, LayoutGrid, LineChart, Share2, Sparkles, Timer, Trophy } from 'lucide-react';
import { Hero } from '../components/Hero';
import { Momentum } from '../components/Momentum';
import { PainPoints } from '../components/PainPoints';
import { ToolShelf } from '../components/ToolShelf';
import { ProjectCard, ProjectDetailModal } from '../components/ProjectCard';
import { CtaBand, PageShell } from '../components/PageShell';
import {
  Button,
  Card,
  Counter,
  DataSourceTag,
  NoteTag,
  Reveal,
  Section,
  SectionHeading,
} from '../components/ui';
import { PROJECTS } from '../data/projects';
import { ROADMAP, MILESTONES } from '../data/content';
import { useApp } from '../store/AppStore';
import { api } from '../lib/api';
import { LoopDiagram } from '../components/LoopDiagram';
import { Mentors } from '../components/Mentors';
import { Perks } from '../components/Perks';
import { Testimonials } from '../components/Testimonials';
import { spotMouse } from '../components/ui';
import { useRegistration } from '../components/RegistrationProvider';
import { RouteLink } from '../lib/router';
import { cn, nf } from '../lib/utils';
import { track } from '../lib/analytics';
import { useState } from 'react';
import type { Project } from '../lib/types';

/**
 * HOME — the first 15 seconds of the funnel.
 *
 * Deliberately short now that the site has real pages: it answers "what is this,
 * why should I care, what will I build, and where do I go next", then hands off
 * to /projects, /workshop and /leaderboard. A multi-page site that still dumps
 * everything on the home page would defeat the point.
 */
export function Home() {
  return (
    <PageShell>
      <Hero />
      <Momentum />
      <PainPoints />
      <FunnelTeaser />
      <ProjectsTeaser />
      <Mentors />
      <LoopTeaser />
      <Perks />
      <GrowthTeaser />
      <Testimonials />
      <ToolShelf />
      <AskSection />
      <HomeNext />
      <CtaBand
        source="home_final"
        title="60 minutes. One working prototype. Zero cost."
        body="Bring your idea — we will help you build it. You leave with a deployed AI project and a sentence you can defend in any interview."
        secondary={{ label: 'See the 10 projects', to: '/projects' }}
      />
    </PageShell>
  );
}

/* ------------------------------------------------------------------ teasers */

/** The 60-minute sequence, compressed to one strip that links to /workshop. */
function FunnelTeaser() {
  return (
    <Section className="border-t border-line">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          eyebrow={
            <>
              <Timer className="h-3 w-3 text-brand-deep" />
              The 60 minutes
            </>
          }
          title="A build sequence, not a lecture."
          subtitle="You start building at minute 20 and never stop. Here is the whole session."
        />
        <RouteLink to="/workshop" className="btn btn-secondary shrink-0">
          What&apos;s inside the workshop
          <ArrowRight className="h-4 w-4" />
        </RouteLink>
      </div>

      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {ROADMAP.map((step, i) => (
          <motion.li
            key={step.time}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
            className="relative rounded-2xl border border-line bg-card p-4"
          >
            <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-brand-deep">
              {step.time}
            </span>
            <p className="mt-2 text-[13px] font-semibold text-ink">{step.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{step.detail}</p>
            <span
              aria-hidden
              className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-brand/60 to-transparent"
            />
          </motion.li>
        ))}
      </ol>
    </Section>
  );
}

/** Three real projects, with the full catalogue one tap away. */
function ProjectsTeaser() {
  const [open, setOpen] = useState<Project | null>(null);
  const { openRegistration } = useRegistration();
  const { savedIdeaId, saveIdea, showToast } = useApp();
  const featured = PROJECTS.slice(0, 3);

  return (
    <Section id="projects" className="border-t border-line">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          eyebrow={
            <>
              <LayoutGrid className="h-3 w-3 text-brand-deep" />
              What you&apos;ll build
            </>
          }
          title="Pick a project. Any of these finishes in one sitting."
          subtitle="Every project is scoped to 60 minutes with free tools only. Tap a card for the full breakdown."
        />
        <RouteLink to="/projects" className="btn btn-secondary shrink-0">
          See all {PROJECTS.length} projects
          <ArrowRight className="h-4 w-4" />
        </RouteLink>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((p, i) => (
          <ProjectCard
            key={p.id}
            project={p}
            index={i}
            onOpen={(proj) => {
              setOpen(proj);
              track('project_card_opened', { projectId: proj.id, source: 'home_teaser' });
            }}
          />
        ))}
      </div>

      <ProjectDetailModal
        project={open}
        saved={Boolean(open && savedIdeaId === open.id)}
        onClose={() => setOpen(null)}
        onSave={(p) => {
          saveIdea(p.id);
          showToast({ title: 'Idea saved', description: `${p.name} is pinned.`, variant: 'success' });
        }}
        onRegister={(p) => {
          setOpen(null);
          openRegistration({ projectId: p.id, source: 'home_teaser' });
        }}
      />
    </Section>
  );
}

/** The referral loop, plus a live snapshot of the wall. */
function LoopTeaser() {
  const { leaderboard, referralCount, isLiveData } = useApp();
  const top = leaderboard.slice(0, 3);

  return (
    <Section id="referrals" className="border-t border-line">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          eyebrow={
            <>
              <Share2 className="h-3 w-3 text-brand-deep" />
              The referral loop
            </>
          }
          title="Register once, get a link that keeps working."
          subtitle="Every registrant gets a code, a personalised project card and a one-tap WhatsApp message — and real perks for bringing your classmates along."
        />
        <RouteLink to="/leaderboard" className="btn btn-secondary shrink-0">
          Open the Builder Wall
          <ArrowRight className="h-4 w-4" />
        </RouteLink>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <p className="mono-label">How it works</p>
          <LoopDiagram className="mt-3 w-full" />
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              'Register free — 40 seconds.',
              'Get a project matched to your interests.',
              'Receive your own referral code.',
              'Share one pre-written WhatsApp message.',
              'Friends join; your count goes up.',
              'Climb the public Builder Wall.',
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-brand/70 bg-brand/20 font-mono text-[10px] font-bold text-brand-deep">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-[13px] leading-relaxed text-ink-muted">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-5 grid gap-2 border-t border-line pt-5 sm:grid-cols-2">
            {MILESTONES.slice(0, 2).map((m) => (
              <div key={m.count} className="rounded-xl border border-line bg-surface-2 px-3.5 py-3">
                <p className="font-mono text-[11px] font-bold text-brand-deep">
                  {m.count} {m.count === 1 ? 'friend' : 'friends'}
                </p>
                <p className="mt-1 text-[12px] font-medium text-ink">{m.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="mono-label">Top builders</p>
            <DataSourceTag />
          </div>
          {top.length ? (
          <ul className="mt-4 divide-y divide-line">
            {top.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-3">
                <span className="w-6 shrink-0 font-mono text-[12px] font-bold text-ink-faint">
                  #{b.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{b.name}</p>
                  <p className="truncate text-[11px] text-ink-faint">{b.college}</p>
                </div>
                <span className="shrink-0 font-mono text-[13px] font-bold text-ink">{b.referrals}</span>
              </li>
            ))}
          </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-line px-3.5 py-6 text-center text-[12px] leading-relaxed text-ink-muted">
              {isLiveData
                ? 'The wall is empty until the first registration lands. Yours can be the top row.'
                : 'The campaign database is unreachable — real rows appear here once it is back.'}
            </p>
          )}
          <div className="mt-4 rounded-xl border border-line bg-surface-2 px-3.5 py-3">
            <p className="text-[12px] leading-relaxed text-ink-muted">
              {referralCount > 0 ? (
                <>
                  You are on the wall with{' '}
                  <span className="font-semibold text-brand-deep">{referralCount} referral{referralCount === 1 ? '' : 's'}</span>.
                </>
              ) : (
                <>Register to claim your row — rewards start at a single referral.</>
              )}
            </p>
          </div>
        </Card>
      </div>
    </Section>
  );
}

/** Transparency strip: the growth loop, with every stage MEASURED live. */
function GrowthTeaser() {
  const { totalRegistrations, target, progressPct, eventCounts, sources, isLiveData } = useApp();

  const countOf = (name: string) => eventCounts.find((e) => e.name === name)?.count ?? 0;
  const stages = [
    { k: 'Visited the site', v: countOf('page_view') },
    { k: 'Opened the project generator', v: countOf('project_generator_open') },
    { k: 'Started registration', v: countOf('registration_started') },
    { k: 'Completed registration', v: countOf('registration_completed') },
  ];
  const maxStage = Math.max(1, ...stages.map((x) => x.v));
  const topSource = sources[0];

  return (
    <Section id="growth-engine" className="border-t border-line">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="mono-label flex items-center gap-2">
              <LineChart className="h-3.5 w-3.5 text-brand-deep" />
              The growth loop, measured
            </p>
            <DataSourceTag />
          </div>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-muted">
            This is not a webinar with a registration form — it is a loop: register, get a project and a
            link, bring friends, climb the wall. Every number on this page is counted from real product
            events and registration attribution{topSource ? <>, and the biggest channel so far is{' '}<span className="text-ink">{topSource.source}</span> ({topSource.registrations})</> : null}.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <span className="font-mono text-2xl font-bold tabular-nums text-ink">
              <Counter value={totalRegistrations} />
              <span className="text-ink-faint"> / {target}</span>
            </span>
            <span className="font-mono text-[12px] text-ink-faint">{progressPct.toFixed(1)}% to target</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5 border-t border-line pt-5">
            <RouteLink to="/strategy" className="btn btn-secondary">
              <Sparkles className="h-3.5 w-3.5" />
              Read the growth plan
            </RouteLink>
            <RouteLink to="/admin" className="btn btn-ghost">
              Open the dashboard
            </RouteLink>
          </div>
        </Card>

        <Card className="p-6 sm:p-7">
          <p className="mono-label">Live funnel</p>
          {isLiveData ? (
            <div className="mt-4 space-y-3">
              {stages.map((row) => (
                <div key={row.k}>
                  <div className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="text-ink-muted">{row.k}</span>
                    <span className="font-mono font-semibold text-ink">{nf(row.v)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-brand-deep to-brand-edge"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(row.v / maxStage) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9 }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-2 text-[11px] leading-relaxed text-ink-faint">
                Counted from analytics events stored by the API — not modelled.
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-line px-3.5 py-6 text-center text-[12px] leading-relaxed text-ink-muted">
              The funnel appears here once the campaign database is reachable.
            </p>
          )}
        </Card>
      </div>
    </Section>
  );
}

/** The public half of the replies inbox: a real form, stored in the database. */
function AskSection() {
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('That email does not look right.');
      return;
    }
    if (body.trim().length < 5) {
      setError('Please write a little more.');
      return;
    }
    setError(null);
    setStatus('sending');
    const res = await api.sendMessage({
      name: name.trim(),
      email: email.trim() || undefined,
      body: body.trim(),
    });
    if (res && !(res as { error?: string }).error) {
      setStatus('sent');
      track('reply_sent', { hasEmail: Boolean(email.trim()) });
      showToast({ title: 'Reply sent', description: 'It is in the team inbox — expect an answer by email.', variant: 'success' });
    } else {
      setStatus('error');
      setError('Could not send right now. Check your connection and try again.');
    }
  };

  return (
    <Section id="ask" className="border-t border-line">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeading
          eyebrow="Talk to the team"
          title="Questions? Send a reply."
          subtitle="Doubts about the workshop, the projects, or whether this is for you — write it here. It lands in a real inbox on the admin dashboard, and we answer by email."
        />
        <Card className="p-6 sm:p-7">
          {status === 'sent' ? (
            <div className="py-6 text-center">
              <p className="text-lg font-semibold text-ink">Got it — thank you. 🎉</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                Your reply is stored with the team.{' '}
                {email.trim() ? 'We will get back to you on your email.' : 'Add an email next time if you would like an answer.'}
              </p>
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => {
                  setName('');
                  setEmail('');
                  setBody('');
                  setStatus('idle');
                }}
              >
                Send another
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">Name *</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-brand"
                    placeholder="Your name"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">Email (optional)</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-brand"
                    placeholder="you@college.edu"
                  />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">Your reply *</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-brand"
                  placeholder="Ask anything — or tell us what would make you register."
                />
              </label>
              {error ? (
                <p role="alert" className="mt-2.5 text-[12px] font-medium text-ember">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="mt-4 w-full" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send reply'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </Section>
  );
}

/** Explicit "where next" cards — the thing a long single page never needed. */
function HomeNext() {
  return (
    <Section className="border-t border-line">
      <SectionHeading
        eyebrow="Keep going"
        title="Four pages, one funnel."
        subtitle="Every page ends with the same offer. Pick whichever question you still have."
      />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: Timer,
            label: 'The workshop',
            detail: 'Minute-by-minute agenda, what is included, and the worries students ask about.',
            to: '/workshop' as const,
            wide: true,
          },
          {
            icon: LayoutGrid,
            label: 'All 10 projects',
            detail: 'Filter by difficulty, open any card, or let the simulator match you to one.',
            to: '/projects' as const,
            wide: false,
          },
          {
            icon: Trophy,
            label: 'Builder Wall',
            detail: 'Your referral code, milestone rewards, and the live leaderboard.',
            to: '/leaderboard' as const,
            wide: false,
          },
        ].map((item) => (
          <RouteLink
            key={item.label}
            to={item.to}
            onMouseMove={spotMouse}
            className={cn(
              'spot card-hover group flex flex-col rounded-2xl border border-line bg-card p-5',
              item.wide && 'sm:col-span-2 lg:col-span-1',
            )}
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-brand/70 bg-brand/20">
              <item.icon className="h-4 w-4 text-brand-deep" />
            </span>
            <p className="mt-3 flex items-center gap-1.5 text-[14px] font-semibold text-ink">
              {item.label}
              <ArrowRight className="h-3.5 w-3.5 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep" />
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{item.detail}</p>
          </RouteLink>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Back to top
        </Button>
        <span className="text-[12px] text-ink-faint">
          Or jump straight in — the registration takes 40 seconds.
        </span>
      </div>
    </Section>
  );
}
