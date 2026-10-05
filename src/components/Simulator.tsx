import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BookmarkCheck, Bot, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { INTERESTS } from '../data/projects';
import { EXPERIENCE_OPTIONS, SIMULATOR_PROBLEMS } from '../data/content';
import { suggestForSimulator } from '../lib/matching';
import type { Experience, InterestId, ProblemArea } from '../lib/types';
import type { Recommendation } from '../lib/recommend';
import { useApp } from '../store/AppStore';
import { useRegistration } from './RegistrationProvider';
import { Badge, Button, OptionGrid, Section, SectionHeading, Spinner } from './ui';
import { cn } from '../lib/utils';
import { track } from '../lib/analytics';
import { getIcon } from './icons';

/**
 * AI PROJECT SIMULATOR
 * ------------------------------------------------------------------
 * Same rule engine as the registration flow, but open to anyone — no signup
 * required. It is the strongest "let me try before I commit" device on the
 * page, and it produces the `simulator_completed` event that separates
 * curious visitors from real prospects.
 */
export function Simulator() {
  const [interest, setInterest] = useState<InterestId | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [problem, setProblem] = useState<ProblemArea | null>(null);
  const [result, setResult] = useState<Recommendation | null>(null);
  const [generating, setGenerating] = useState(false);
  const [run, setRun] = useState(0);

  const { saveIdea, savedIdeaId, showToast } = useApp();
  const { openRegistration } = useRegistration();

  const ready = Boolean(interest && experience && problem);

  const generate = () => {
    if (!interest || !experience || !problem) return;
    setGenerating(true);
    setResult(null);
    window.setTimeout(() => {
      const rec = suggestForSimulator({ interest, experience, problem });
      setResult(rec);
      setGenerating(false);
      setRun((r) => r + 1);
      track('simulator_completed', {
        interest,
        experience,
        problem,
        projectId: rec.project.id,
      });
    }, 850);
  };

  const reset = () => {
    setInterest(null);
    setExperience(null);
    setProblem(null);
    setResult(null);
  };

  const Icon = result ? getIcon(result.project.icon) : Bot;

  return (
    <Section id="simulator" className="border-t border-line">
      <SectionHeading
        eyebrow={
          <>
            <Wand2 className="h-3 w-3 text-brand-deep" />
            Project simulator
          </>
        }
        title="Don't know what to build?"
        subtitle="Three questions. One project you can actually finish in the workshop. No signup needed to try it."
      />

      <div className="mt-10 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        {/* ------------------------------------------------------------ inputs */}
        <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
          <Step index={1} done={Boolean(interest)} title="What are you interested in?">
            <OptionGrid
              name="Interest"
              columns={2}
              options={INTERESTS.map((i) => ({ id: i.id, label: i.label, emoji: i.emoji }))}
              value={interest}
              onChange={(v) => {
                setInterest(v);
                track('simulator_started', { step: 1, interest: v });
              }}
            />
          </Step>

          <AnimatePresence>
            {interest ? (
              <Stage key="q2">
                <Step index={2} done={Boolean(experience)} title="How comfortable are you with coding?">
                  <OptionGrid
                    name="Experience"
                    columns={3}
                    options={EXPERIENCE_OPTIONS.map((e) => ({ id: e.id, label: e.label, emoji: e.emoji }))}
                    value={experience}
                    onChange={setExperience}
                  />
                </Step>
              </Stage>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {experience ? (
              <Stage key="q3">
                <Step index={3} done={Boolean(problem)} title="What problem do you want to solve?">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SIMULATOR_PROBLEMS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={problem === p.id}
                        onClick={() => setProblem(p.id)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-[13px] font-medium transition',
                          problem === p.id
                            ? 'border-brand bg-brand/[0.16] text-ink'
                            : 'border-line bg-surface-2 text-ink-muted hover:border-line-strong hover:text-ink',
                        )}
                      >
                        <span aria-hidden>{p.emoji}</span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </Step>
              </Stage>
            ) : null}
          </AnimatePresence>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-5">
            <Button onClick={generate} disabled={!ready} loading={generating} className="flex-1">
              {generating ? 'Matching…' : result ? 'Generate another' : 'Generate my project'}
              {!generating ? <Sparkles className="h-4 w-4" /> : null}
            </Button>
            {interest ? (
              <Button variant="ghost" onClick={reset} aria-label="Reset answers">
                <RefreshCw className="h-3.5 w-3.5" />
                Reset
              </Button>
            ) : null}
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            Runs entirely in your browser — a rule engine over 10 project templates. No data leaves this page.
          </p>
        </div>

        {/* ------------------------------------------------------------ output */}
        <div className="relative min-h-[380px] overflow-hidden rounded-2xl border border-line bg-surface-2 p-5 sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(91,61,245,0.10),transparent)]"
          />

          <AnimatePresence mode="wait">
            {generating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative flex h-full min-h-[340px] flex-col items-center justify-center gap-4 text-center"
              >
                <Spinner className="h-6 w-6 text-brand-deep" />
                <p className="text-sm text-ink-muted">
                  Matching your answers against 10 project templates…
                </p>
                <div className="w-full max-w-xs space-y-2" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-3 animate-pulse rounded-full bg-surface-3"
                      style={{ animationDelay: `${i * 120}ms`, width: `${100 - i * 18}%` }}
                    />
                  ))}
                </div>
              </motion.div>
            ) : result ? (
              <motion.div
                key={`result-${run}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <p className="mono-label">Your project match</p>
                <div className="mt-3 flex items-start gap-3.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brand/70 bg-brand/20">
                    <Icon className="h-5 w-5 text-brand-deep" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{result.project.name}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                      {result.project.tagline}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="acid">{result.project.difficulty}</Badge>
                  <Badge tone="cy">{result.project.buildTime}</Badge>
                  <Badge tone="neutral">{result.project.tech.join(' + ')}</Badge>
                </div>

                <div className="mt-5 rounded-xl border border-line bg-surface-2 p-4">
                  <p className="mono-label">Why this one</p>
                  <ul className="mt-2.5 space-y-2">
                    {result.reasons.map((r) => (
                      <li key={r} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-muted">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-deep" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-4 text-[12px] leading-relaxed text-ink-faint">
                  <span className="font-semibold text-ink-muted">Interview line you&apos;ll earn:</span>{' '}
                  “{result.project.interviewLine}”
                </p>

                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      saveIdea(result.project.id);
                      track('idea_saved', { projectId: result.project.id, source: 'simulator' });
                      showToast({
                        title: 'Idea saved ✓',
                        description: `${result.project.name} is pinned. Register to build it in the workshop.`,
                        variant: 'success',
                        action: {
                          label: 'Reserve my seat →',
                          onClick: () =>
                            openRegistration({ projectId: result.project.id, source: 'simulator_saved' }),
                        },
                      });
                    }}
                  >
                    <BookmarkCheck className="h-4 w-4" />
                    {savedIdeaId === result.project.id ? 'Saved — build it now' : 'Save this idea'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => openRegistration({ projectId: result.project.id, source: 'simulator' })}
                  >
                    Build this with me
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative flex h-full min-h-[340px] flex-col items-center justify-center text-center"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface-3">
                  <Bot className="h-5 w-5 text-ink-muted" />
                </span>
                <p className="mt-4 max-w-xs text-sm font-medium text-ink">
                  Your project will appear here
                </p>
                <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-muted">
                  Answer the three questions on the left. We match against interest, experience and the problem
                  you care about.
                </p>
                <div className="mt-6 flex gap-1.5" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        i === 0 && interest ? 'w-8 bg-brand-deep' : i === 1 && experience ? 'w-8 bg-brand-deep' : i === 2 && problem ? 'w-8 bg-brand-deep' : 'w-1.5 bg-line-strong',
                      )}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

function Step({
  index,
  title,
  done,
  children,
}: {
  index: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-5 first:pt-0">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={cn(
            'grid h-5 w-5 place-items-center rounded-full border font-mono text-[10px] font-bold',
            done ? 'border-brand bg-brand/25 text-brand-deep' : 'border-line text-ink-faint',
          )}
        >
          {index}
        </span>
        <p className="text-[13px] font-semibold text-ink">{title}</p>
      </div>
      {children}
    </div>
  );
}
