import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { PROJECTS } from '../data/projects';
import { PROJECT_ROTATION } from '../data/rotation';
import { recommendProject } from '../lib/recommend';
import type { Project } from '../lib/types';
import { cn } from '../lib/utils';
import { track } from '../lib/analytics';
import { useApp } from '../store/AppStore';
import { projectById } from '../data/projects';
import { Badge, Button } from './ui';
import { getIcon } from './icons';

/**
 * HERO INTERACTIVE ELEMENT — the AI Project Generator.
 *
 * Why this exists instead of a static hero image: the single biggest drop-off
 * for this audience is "I don't know what I'd even build". This turns the value
 * prop into something the student *experiences* in 5 seconds, and it is the
 * top of the funnel (project_generated events feed the admin conversion read).
 */
export function ProjectGenerator({ onBuild }: { onBuild: (project: Project) => void }) {
  const [phase, setPhase] = useState<'idle' | 'shuffling' | 'result'>('idle');
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<Project | null>(null);
  const [seen, setSeen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { savedIdeaId } = useApp();
  const reduce = useReducedMotion();

  /* Fire project_generator_open once, when the card is actually seen. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || seen) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setSeen(true);
          track('project_generator_open', { location: 'hero' });
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [seen]);

  /* Idle ticker: quietly cycles real project names so the card feels alive. */
  useEffect(() => {
    if (phase !== 'idle' || reduce) return;
    const id = window.setInterval(() => setRotation((r) => (r + 1) % PROJECT_ROTATION.length), 1700);
    return () => window.clearInterval(id);
  }, [phase, reduce]);

  const generate = () => {
    setPhase('shuffling');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const spinMs = reduceMotion ? 120 : 950;
    const spin = window.setInterval(
      () => setResult(PROJECTS[Math.floor(Math.random() * PROJECTS.length)]),
      90,
    );

    window.setTimeout(() => {
      window.clearInterval(spin);
      // Honour a previously saved idea first — continuity beats novelty.
      const saved = savedIdeaId ? projectById(savedIdeaId) : undefined;
      const pick =
        saved ??
        recommendProject({
          seed: Date.now() % 97,
          interest: 'unsure',
        }).project;
      setResult(pick);
      setPhase('result');
      track('project_generated', { projectId: pick.id, source: 'hero_generator' });
    }, spinMs);
  };

  const active = result ?? PROJECTS[rotation % PROJECTS.length];
  const ActiveIcon = getIcon(active.icon);

  return (
    <div ref={containerRef} className="relative">
      {/* glow */}
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-violet/18 via-cyan/12 to-brand/20 opacity-60 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-3xl border border-line bg-card p-5 shadow-pop backdrop-blur-2xl sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md border border-brand/70 bg-brand/20">
              <Wand2 className="h-3 w-3 text-brand-deep" />
            </span>
            <span className="mono-label">AI project generator</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-3 px-2.5 py-1 text-[10px] font-medium text-ink-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-deep" />
            {PROJECTS.length} starter projects
          </span>
        </div>

        <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          What could <span className="gradient-text">you</span> build?
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          Tap once. Get a real project you can finish in one sitting.
        </p>

        {/* idea ticker */}
        <div className="relative mt-5 h-[132px] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            {phase !== 'result' ? (
              <motion.div
                key="ticker"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <div className="flex h-full flex-col justify-center gap-1.5">
                  {PROJECT_ROTATION.map((name, i) => {
                    const offset = (i - (rotation % PROJECT_ROTATION.length) + PROJECT_ROTATION.length) % PROJECT_ROTATION.length;
                    const isActive = offset === 0;
                    if (offset > 2) return null;
                    return (
                      <motion.div
                        key={name}
                        layout
                        animate={{
                          opacity: isActive ? 1 : 0.28 - offset * 0.08,
                          scale: isActive ? 1 : 0.97,
                          x: isActive ? 0 : 6,
                        }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                          'flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5',
                          isActive
                            ? 'border-brand/70 bg-brand/[0.14]'
                            : 'border-line bg-surface-2',
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 shrink-0 rounded-full',
                            isActive ? 'bg-brand' : 'bg-line-strong',
                          )}
                        />
                        <span
                          className={cn(
                            'truncate text-[13px] font-medium',
                            isActive ? 'text-ink' : 'text-ink-faint',
                          )}
                        >
                          {name}
                        </span>
                        {isActive && phase === 'shuffling' ? (
                          <Sparkles className="ml-auto h-3.5 w-3.5 animate-pulse text-brand-deep" />
                        ) : null}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <div className="flex h-full flex-col rounded-2xl border border-brand/70 bg-gradient-to-br from-brand/[0.14] to-transparent p-4">
                  <p className="mono-label">Your AI project</p>
                  <div className="mt-1.5 flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand/70 bg-brand/20">
                      <ActiveIcon className="h-4 w-4 text-brand-deep" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-semibold text-ink">{active.name}</h3>
                      <p className="line-clamp-2 text-[12px] leading-snug text-ink-muted">
                        {active.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    <Badge tone="acid">{active.difficulty}</Badge>
                    <Badge tone="cy">{active.buildTime}</Badge>
                    <Badge tone="neutral">{active.tech.slice(0, 2).join(' + ')}</Badge>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* actions */}
        <div className="mt-5 flex flex-col gap-2.5">
          {phase === 'result' && result ? (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => onBuild(result)}>
                Build this with me
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                aria-label="Generate another project idea"
                onClick={generate}
                className="px-3.5"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={generate} loading={phase === 'shuffling'} className="w-full">
              {phase === 'shuffling' ? 'Matching your project…' : 'Generate my project'}
              {phase !== 'shuffling' ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          )}

          <p className="text-center text-[11px] text-ink-faint">
            Matched live from {PROJECTS.length} beginner-scoped projects. Takes 2 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
