import { ArrowRight, Play, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { RouteLink } from '../lib/router';
import { motion } from 'framer-motion';
import { useApp } from '../store/AppStore';
import { useRegistration } from './RegistrationProvider';
import { ProjectGenerator } from './ProjectGenerator';
import { LivePulse } from './ActivityTicker';
import { Button, Counter } from './ui';
import { nf } from '../lib/utils';
import { track } from '../lib/analytics';
import type { Project } from '../lib/types';

/**
 * The headline is the product's promise, pinned by the brief — not an
 * experiment. It used to A/B against "Stop Watching AI Tutorials. Build One.";
 * the fixed promise is the one that ships: name the deliverable and the
 * deadline. The lime highlight sits on "AI Project", the two words that make
 * the promise specific.
 */
const HEADLINE = {
  top: 'Build Your First',
  accent: 'AI Project',
  bottom: 'in 60 Minutes.',
} as const;

const CTA_LABEL = 'Reserve My Free Spot';

export function Hero() {
  const { totalRegistrations, target, spotsLeft, progressPct, variant, isLiveData } = useApp();
  const { openRegistration } = useRegistration();
  const head = HEADLINE;
  const cta = CTA_LABEL;

  const buildWith = (project: Project) =>
    openRegistration({ projectId: project.id, source: 'hero_generator' });

  const register = (location: string) => {
    track('cta_clicked', { location, label: cta, variant });
    openRegistration({ source: location });
  };

  return (
    <section id="top" className="relative overflow-hidden pt-28 pb-14 sm:pt-32 lg:pt-36 lg:pb-20">
      {/* background layers */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-12rem] h-[38rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(91,61,245,0.10),transparent)]" />
        <div className="absolute right-[-8rem] top-24 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(closest-side,rgba(14,147,176,0.10),transparent)]" />
        <div className="absolute bottom-[-10rem] left-[-6rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(closest-side,rgba(204,255,77,0.32),transparent)]" />
      </div>

      <div className="container-x">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* ------------------------------------------------------------ copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center gap-2.5"
            >
              <span className="eyebrow">
                <Sparkles className="h-3 w-3 text-brand-deep" />
                Free workshop · by NxtWave
              </span>
              <LivePulse className="hidden sm:inline-flex" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="title-xl mt-6"
            >
              <span className="block">{head.top}</span>
              <span className="block">
                {/* The highlighter is the signature: ink on lime is 16.4:1, the
                    strongest pair in the system, so the promise lands on the one
                    colour no competitor uses this way. */}
                <span className="hl">{head.accent}</span>
              </span>
              <span className="block">{head.bottom}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.14 }}
              className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-muted sm:text-lg"
            >
              <span className="font-medium text-ink">No experience? No problem.</span> Pick an idea,
              follow the workflow, ship your first AI-powered prototype — and walk away with something
              you can actually put on your resume.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button size="lg" onClick={() => register('hero_primary')} className="group">
                <span aria-hidden>🚀</span>
                {cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <RouteLink to="/projects" className="btn btn-secondary btn-lg">
                <Play className="h-3.5 w-3.5" />
                See what I&apos;ll build
              </RouteLink>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-3"
            >
              <button
                type="button"
                onClick={() => {
                  track('cta_clicked', { location: 'hero_quick_join' });
                  openRegistration({ source: 'hero_quick_join', mode: 'quick' });
                }}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-deep underline decoration-brand/40 underline-offset-4 transition hover:decoration-brand"
              >
                <Zap className="h-3.5 w-3.5" />
                In a hurry? Quick join in 10 seconds — name, email, done.
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-medium text-ink-muted"
            >
              {['Free', '60 minutes', 'Beginner friendly', '500 seats'].map((t, i) => (
                <span key={t} className="inline-flex items-center gap-2">
                  {i > 0 ? <span className="hidden h-1 w-1 rounded-full bg-line-strong sm:inline-block" /> : null}
                  {i === 0 ? <span className="h-1.5 w-1.5 rounded-full bg-lime-ink" /> : null}
                  {t}
                </span>
              ))}
            </motion.div>

            {/* scarcity, honestly framed */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.34 }}
              className="mt-8 max-w-md rounded-2xl border border-line bg-surface-2 p-4 backdrop-blur"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="mono-label">Seats filling</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                    <Counter value={totalRegistrations} /> <span className="text-ink-faint">/ {target}</span>
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ember/30 bg-ember/10 px-2.5 py-1 text-[11px] font-semibold text-ember">
                  {spotsLeft} spots left
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brand-deep to-brand-edge"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-faint">
                <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-ink-faint" />
                {isLiveData ? (
                  <>
                    Counted from the campaign database — {nf(totalRegistrations)} students have registered, and
                    the seat cap is {nf(target)}.
                  </>
                ) : (
                  <>
                    The campaign database is unreachable right now — the seat cap is {nf(target)} and the
                    60-minute format is real. Retry from the momentum section to see live counts.
                  </>
                )}
              </p>
            </motion.div>
          </div>

          {/* ------------------------------------------------------- interactivity */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProjectGenerator onBuild={buildWith} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
