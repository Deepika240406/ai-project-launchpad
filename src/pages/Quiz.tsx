import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { CtaBand, NextSteps, PageHero, PageShell } from '../components/PageShell';
import { Button, Card, NoteTag, ProgressBar, Section, SectionHeading } from '../components/ui';
import { ShareWithThree } from '../components/SharePanel';
import { getIcon } from '../components/icons';
import { BANDS, MAX_SCORE, QUIZ, bandFor, type QuizOption, type QuizQuestion } from '../data/quiz';
import { recommendProject } from '../lib/recommend';
import { useApp } from '../store/AppStore';
import { useRegistration } from '../components/RegistrationProvider';
import { cn, nf } from '../lib/utils';
import { track } from '../lib/analytics';

/**
 * READINESS CHECK  (/quiz)
 * ---------------------------------------------------------------------------
 * Why this exists instead of a "which AI project are you?" novelty quiz:
 * it produces three things the funnel actually needs —
 *   1. a self-assessment moment that raises intent before the ask,
 *   2. a scored band that justifies the *difficulty* we recommend,
 *   3. the interest + problem signals the recommender needs, without asking
 *      the student to fill a long form.
 *
 * The score is additive and every point is traceable, so we can show the
 * student why they scored where they did. No black box.
 */
export function Quiz() {
  const [answers, setAnswers] = useState<Record<string, QuizOption>>({});
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const { setQuizResult, quiz, showToast, student, saveIdea } = useApp();
  const { openRegistration } = useRegistration();

  const question: QuizQuestion = QUIZ[index];
  const answered = Boolean(answers[question.id]);
  const progress = (Object.keys(answers).length / QUIZ.length) * 100;

  const result = useMemo(() => {
    const picked = Object.values(answers);
    const score = Math.round((picked.reduce((n, o) => n + o.points, 0) / MAX_SCORE) * 100);
    const band = bandFor(score);
    const interest = picked.find((o) => o.interest)?.interest ?? 'unsure';
    const problem = picked.find((o) => o.problem)?.problem ?? 'career';
    const recommendation = recommendProject({ interest, problem, experience: band.id === 'strong' ? 'Advanced' : band.id === 'ready' ? 'Intermediate' : 'Beginner' });
    return { score, band, recommendation };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  const pick = (option: QuizOption) => {
    setAnswers((a) => ({ ...a, [question.id]: option }));
    track('simulator_started', { source: 'quiz', question: question.id, option: option.id });
    window.setTimeout(() => {
      if (index < QUIZ.length - 1) setIndex((i) => i + 1);
      else finish({ ...answers, [question.id]: option });
    }, 220);
  };

  const finish = (finalAnswers: Record<string, QuizOption>) => {
    const picked = Object.values(finalAnswers);
    const score = Math.round((picked.reduce((n, o) => n + o.points, 0) / MAX_SCORE) * 100);
    setQuizResult({
      score,
      band: bandFor(score).id,
      answers: picked.map((o) => ({ questionId: o.id, optionId: o.id, points: o.points })),
      completedAt: Date.now(),
    });
    setDone(true);
    track('simulator_completed', { source: 'quiz', score });
    showToast({
      title: `Readiness score: ${score}/100`,
      description: 'We picked a project difficulty to match.',
      variant: 'success',
    });
  };

  const reset = () => {
    setAnswers({});
    setIndex(0);
    setDone(false);
  };

  const RecommendationIcon = getIcon(result.recommendation.project.icon);
  const previous = quiz;

  return (
    <PageShell>
      <PageHero
        eyebrow={
          <>
            <Gauge className="h-3 w-3 text-brand-deep" />
            Readiness check
          </>
        }
        title={
          <>
            Five questions.
            <br />
            <span className="text-ink-muted">One honest score.</span>
          </>
        }
        subtitle="Not a personality quiz. Each answer is something the workshop actually uses — your coding comfort decides your project difficulty, and what you are stuck on decides what we tell you to do first. Two minutes."
        meta={
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <QuizStat label="Questions" value="5" />
            <QuizStat label="Time" value="~2 min" />
            <QuizStat label="Scored out of" value="100" />
            <QuizStat label="Saved?" value="Locally" tone="brand" />
          </div>
        }
      />

      <Section className="pt-4">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-8">
          {/* ------------------------------------------------------ questions */}
          <div>
            {!done ? (
              <Card className="p-5 sm:p-7">
                <div className="flex items-center justify-between gap-4">
                  <p className="mono-label">
                    Question {index + 1} of {QUIZ.length}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-ink-faint">
                      {nf(Math.round(progress))}%
                    </span>
                    {Object.keys(answers).length > 0 ? (
                      <button
                        onClick={reset}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-faint transition hover:text-ink"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Start over
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-4">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-brand-deep to-brand-edge"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-7"
                  >
                    <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                      {question.prompt}
                    </h2>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{question.helper}</p>

                    <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                      {question.options.map((o) => {
                        const active = answers[question.id]?.id === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => pick(o)}
                            aria-pressed={active}
                            className={cn(
                              'flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200',
                              active
                                ? 'border-brand-deep/45 bg-brand/[0.16] shadow-[0_0_0_1px_rgba(79,70,229,0.35)]'
                                : 'border-line bg-card hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card',
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition',
                                active ? 'border-brand-deep bg-brand-deep' : 'border-line-strong',
                              )}
                            >
                              {active ? <CheckCircle2 className="h-3 w-3 text-white" /> : null}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[13px] font-semibold text-ink">{o.label}</span>
                              {o.detail ? (
                                <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">
                                  {o.detail}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
                      <Button
                        variant="ghost"
                        onClick={() => setIndex((i) => Math.max(0, i - 1))}
                        disabled={index === 0}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        onClick={() => {
                          if (index < QUIZ.length - 1) setIndex((i) => i + 1);
                          else finish(answers);
                        }}
                        disabled={!answered}
                      >
                        {index === QUIZ.length - 1 ? 'See my score' : 'Next question'}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </Card>
            ) : (
              /* ------------------------------------------------------- result */
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                <Card className="overflow-hidden p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div>
                      <p className="mono-label">Your readiness score</p>
                      <div className="mt-3 flex items-end gap-3">
                        <span className="font-mono text-5xl font-bold leading-none tracking-tightest text-ink">
                          {result.score}
                        </span>
                        <span className="pb-1 font-mono text-lg text-ink-faint">/100</span>
                      </div>
                      <p className="mt-3 text-[13px] font-semibold text-brand-deep">
                        {result.band.label} · {result.band.headline}
                      </p>
                    </div>

                    <div className="min-w-[220px] flex-1">
                      <ProgressBar value={result.score} size="lg" label="Score" showValue />
                      <div className="mt-3 flex justify-between font-mono text-[10px] text-ink-faint">
                        {BANDS.map((b) => (
                          <span key={b.id}>{b.label}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="mt-6 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
                    {result.band.body}
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {result.band.advice.map((a, i) => (
                      <div key={a} className="rounded-xl border border-line bg-surface-2 p-3.5">
                        <span className="font-mono text-[10px] font-bold text-brand-deep">
                          DO THIS {i + 1}
                        </span>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{a}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* recommendation */}
                <Card className="p-5 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="mono-label flex items-center gap-2">
                      <Target className="h-3.5 w-3.5 text-violet" />
                      Your matched project
                    </p>
                    <span className="chip border-dashed">Based on your 5 answers</span>
                  </div>

                  <div className="mt-5 flex items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-line bg-surface-2">
                      <RecommendationIcon className="h-5 w-5 text-violet" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-ink">{result.recommendation.project.name}</h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                        {result.recommendation.project.tagline}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="chip">{result.recommendation.project.difficulty}</span>
                        <span className="chip">{result.recommendation.project.buildTime}</span>
                        <span className="chip">{result.recommendation.project.tech.join(' + ')}</span>
                      </div>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-2">
                    {result.recommendation.reasons.map((r) => (
                      <li key={r} className="flex items-start gap-2.5 text-[12px] leading-relaxed text-ink-muted">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-deep" />
                        {r}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex flex-wrap gap-2.5">
                    <Button
                      onClick={() => {
                        saveIdea(result.recommendation.project.id);
                        openRegistration({
                          projectId: result.recommendation.project.id,
                          source: 'quiz_result',
                        });
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                      Build this with me
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        saveIdea(result.recommendation.project.id);
                        showToast({ title: 'Idea pinned', description: 'It will be waiting on the projects page.', variant: 'success' });
                      }}
                    >
                      Pin this idea
                    </Button>
                    <Button variant="ghost" onClick={reset}>
                      <RefreshCw className="h-4 w-4" />
                      Retake
                    </Button>
                  </div>

                  {student?.code ? (
                    <div className="mt-6 border-t border-line pt-5">
                      <ShareWithThree code={student.code} projectName={result.recommendation.project.name} />
                    </div>
                  ) : null}
                </Card>

                <div className="flex flex-wrap items-center gap-3">
                  <NoteTag label="Rule-based scoring" />
                  <p className="text-[11px] leading-relaxed text-ink-faint">
                    Every point is traceable to one of your answers. Nothing is inferred from your device or
                    sent anywhere.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* ------------------------------------------------------ side rail */}
          <div className="space-y-4">
            <Card className="p-5">
              <p className="mono-label flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-deep" />
                What this is not
              </p>
              <ul className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-ink-muted">
                <li>
                  <span className="font-semibold text-ink">Not a gate.</span> Every band gets the same
                  workshop. The score only changes which project difficulty we hand you first.
                </li>
                <li>
                  <span className="font-semibold text-ink">Not a certificate.</span> It is a self-assessment
                  to make your first hour more useful, not a credential.
                </li>
                <li>
                  <span className="font-semibold text-ink">Not saved to a server.</span> Your answers stay in
                  this browser.
                </li>
              </ul>
            </Card>

            {previous ? (
              <Card className="p-5">
                <p className="mono-label">Last attempt</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-2xl font-bold text-ink">{previous.score}</span>
                  <span className="chip">{BANDS.find((b) => b.id === previous.band)?.label}</span>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
                  Retake it after the workshop — the coding-comfort answer usually moves.
                </p>
              </Card>
            ) : null}

            <Card className="p-5">
              <p className="mono-label flex items-center gap-2">
                <Gauge className="h-3.5 w-3.5 text-cyan" />
                How the score works
              </p>
              <table className="mt-3 w-full text-left">
                <tbody className="divide-y divide-line">
                  {QUIZ.map((q) => (
                    <tr key={q.id}>
                      <td className="py-2 pr-3 text-[11px] text-ink-muted">{q.prompt.split(' ').slice(0, 4).join(' ')}…</td>
                      <td className="py-2 text-right font-mono text-[11px] text-ink-faint">
                        max {Math.max(...q.options.map((o) => o.points))}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-3 text-[11px] font-semibold text-ink">Total</td>
                    <td className="pt-3 text-right font-mono text-[11px] font-semibold text-brand-deep">
                      {MAX_SCORE}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      </Section>

      <Section className="border-t border-line pt-12">
        <SectionHeading eyebrow="More tools" title="Two more things worth two minutes." />
        <NextSteps
          className="mt-8"
          items={[
            { label: 'Prompt Lab', detail: 'Write the build prompt for whichever project you land on.', to: '/prompt-lab' },
            { label: 'Idea Vault', detail: 'Park the recommendation and work the six-stage checklist.', to: '/vault' },
            { label: 'Card Studio', detail: 'Turn your project into a share-ready card with a QR code.', to: '/card' },
          ]}
        />
      </Section>

      <CtaBand
        source="quiz_final"
        title="Knowing your score is not the same as shipping."
        body="The workshop is one hour with a deadline and a fallback repo. That combination is why students finish here when they never finished alone."
        secondary={{ label: 'Read the 60-minute agenda', to: '/workshop' }}
      />
    </PageShell>
  );
}

function QuizStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'brand';
}) {
  return (
    <div className="rounded-xl border border-line bg-card px-3.5 py-2.5">
      <p className="mono-label">{label}</p>
      <p
        className={cn(
          'mt-1 font-mono text-[13px] font-semibold',
          tone === 'brand' ? 'text-brand-deep' : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}
