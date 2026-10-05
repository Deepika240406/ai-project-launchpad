import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Check,
  Copy,
  PartyPopper,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { INTERESTS } from '../data/projects';
import { BRANCHES, EXPERIENCE_OPTIONS, REGISTRATION_TARGET, YEARS } from '../data/content';
import type { Experience, InterestId, Project } from '../lib/types';
import { useApp } from '../store/AppStore';
import { cn, isEmail, referralLink, nf } from '../lib/utils';
import { track } from '../lib/analytics';
import { Badge, Button, NoteTag, Modal, OptionGrid, ProgressBar, Spinner, useCopy } from './ui';
import { suggestForInterest } from '../lib/matching';
import { getIcon } from './icons';
import { SharePanel } from './SharePanel';
import { MILESTONES, STRETCH_GOALS } from '../data/content';
import { AmbassadorPoster } from './AmbassadorPoster';

export interface RegistrationHandle {
  open: (opts?: { projectId?: string; source?: string }) => void;
}

const STEPS = ['Your details', 'Your interest', 'Your project'];

interface FormState {
  name: string;
  email: string;
  college: string;
  branch: string;
  year: string;
  experience: Experience | null;
}

const emptyForm: FormState = {
  name: '',
  email: '',
  college: '',
  branch: '',
  year: YEARS[0],
  experience: null,
};

type Errors = Partial<Record<keyof FormState, string>>;

export function RegistrationModal({
  open,
  onClose,
  initialProjectId,
  source,
  initialMode = 'full',
}: {
  open: boolean;
  onClose: () => void;
  initialProjectId?: string;
  initialMode?: 'quick' | 'full';
  source: string;
}) {
  const { register, student, referrals, referralCount, showToast, totalRegistrations, workshopDate: workshopIso } =
    useApp();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [interest, setInterest] = useState<InterestId | null>(null);
  const [lockedProjectId, setLockedProjectId] = useState<string | undefined>(undefined);
  /** 'quick' = name + email + college → seat. 'full' = the project-match flow. */
  const [mode, setMode] = useState<'quick' | 'full'>('full');
  const [pipelineStage, setPipelineStage] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* Reset the flow each time it is opened, and honour a project the student already clicked. */
  useEffect(() => {
    if (!open) return;
    if (student) {
      setStep(3);
      return;
    }
    setStep(0);
    setInterest(null);
    setLockedProjectId(initialProjectId);
    setPipelineStage(0);
    setMode(initialMode ?? 'full');
    track('registration_started', { source, projectId: initialProjectId ?? null, mode: initialMode ?? 'full' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validateStep0 = useCallback(
    (forMode: 'quick' | 'full' = mode): boolean => {
      const e: Errors = {};
      if (form.name.trim().length < 2) e.name = 'Please enter your full name.';
      if (!isEmail(form.email)) e.email = 'Enter a valid email — this is where the join link goes.';
      if (form.college.trim().length < 3) e.college = 'Add your college name.';
      if (forMode === 'full') {
        if (!form.branch) e.branch = 'Pick your branch.';
        if (!form.year) e.year = 'Pick your year.';
        if (!form.experience) e.experience = 'Pick one — there is no wrong answer.';
      }
      setErrors(e);
      return Object.keys(e).length === 0;
    },
    [form, mode],
  );

  const recommendation: Project | null = useMemo(() => {
    if (step < 2) return null;
    return suggestForInterest(interest, form.experience, lockedProjectId);
  }, [step, interest, form.experience, lockedProjectId]);

  /* Fake-but-honest "matching" pipeline: it mirrors what the rule engine actually does. */
  useEffect(() => {
    if (step !== 2) return;
    setPipelineStage(0);
    const timers = [0, 380, 760].map((ms, i) =>
      window.setTimeout(() => setPipelineStage(i + 1), ms),
    );
    const done = window.setTimeout(() => {
      setGenerating(false);
      track('project_generated', {
        projectId: recommendation?.id ?? null,
        source: 'registration_step3',
        interest,
      });
    }, 1150);
    setGenerating(true);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /**
   * QUICK JOIN — the 10-second path. Name, email, college: a seat and a code.
   * Everything the full flow collects is enrichment, so it is genuinely
   * optional here rather than faked with default values.
   */
  const submitQuick = () => {
    if (!validateStep0('quick')) {
      showToast({
        title: 'Check the highlighted fields',
        description: 'Name, email and college are all it takes.',
        variant: 'error',
      });
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      const created = register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        college: form.college.trim(),
        branch: form.branch || undefined,
        year: form.year || undefined,
      });
      setSubmitting(false);
      setStep(3);
      track('quick_join_used', { code: created.code, source });
      track('registration_completed', {
        code: created.code,
        projectId: null,
        interest: null,
        experience: null,
        college: form.college,
        source,
        mode: 'quick',
      });
      showToast({
        title: `Seat reserved, ${created.name.split(' ')[0]} 🎉`,
        description: `Your referral code is ${created.code}.`,
        variant: 'success',
      });
    }, 450);
  };

  const submit = () => {
    if (!recommendation) return;
    setSubmitting(true);
    // Local-first: the student gets their code instantly; the store writes the
    // row to the campaign database in the background and reconciles the code.
    window.setTimeout(() => {
      const created = register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        college: form.college.trim(),
        branch: form.branch || undefined,
        year: form.year || undefined,
        experience: (form.experience ?? undefined) as Experience | undefined,
        interest: interest ?? 'unsure',
        recommendedProjectId: recommendation.id,
      });
      setSubmitting(false);
      setStep(3);
      if (lockedProjectId) {
        // Project chosen from a card counts as a project selection event.
        track('project_selected', { projectId: lockedProjectId, source: 'registration_locked' });
      }
      track('registration_completed', {
        code: created.code,
        projectId: recommendation.id,
        interest,
        experience: form.experience,
        college: form.college,
        source,
      });
      showToast({
        title: "You're in 🎉",
        description: `Seat reserved. Your referral code is ${created.code}.`,
        variant: 'success',
      });
    }, 700);
  };

  const workshopDate = new Date(workshopIso);

  return (
    <Modal open={open} onClose={onClose} size="lg" labelledBy="registration-title">
      {/* ---------------------------------------------------------------- header */}
      <div className="relative border-b border-line px-6 pb-5 pt-6 sm:px-8">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-violet/15 via-transparent to-transparent blur-2xl" aria-hidden />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg border border-brand/70 bg-brand/20">
              <Ticket className="h-3.5 w-3.5 text-brand-deep" />
            </span>
            <p className="mono-label">Free workshop · {REGISTRATION_TARGET} seats</p>
          </div>

          {step < 3 ? (
            <>
              <h2 id="registration-title" className="mt-3 pr-10 text-xl font-semibold text-ink sm:text-2xl">
                {step === 0
                  ? "Let's personalize your workshop."
                  : step === 1
                    ? 'What do you want to build?'
                    : 'Matching you to a project…'}
              </h2>
              <p className="mt-1.5 text-[13px] text-ink-muted">
                {step === 0
                  ? 'Three quick steps, about 40 seconds. Then you get a project idea built for you.'
                  : step === 1
                    ? 'Pick the area you are most curious about. You can change it later.'
                    : 'This is the same matching logic the workshop uses on day one.'}
              </p>

              {step === 0 ? (
                <div
                  role="tablist"
                  aria-label="Registration speed"
                  className="mt-4 inline-flex rounded-xl border border-line bg-surface-2 p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'quick'}
                    onClick={() => setMode('quick')}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition',
                      mode === 'quick' ? 'bg-brand text-white shadow-sm' : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    ⚡ Quick join · 10 seconds
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'full'}
                    onClick={() => setMode('full')}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition',
                      mode === 'full' ? 'bg-brand text-white shadow-sm' : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    🎯 Match my project · 40 seconds
                  </button>
                </div>
              ) : null}

              <div className="mt-5 flex items-center gap-2" aria-label={`Step ${step + 1} of 3`}>
                {STEPS.map((label, i) => (
                  <div key={label} className="flex flex-1 items-center gap-2">
                    <div className="flex-1">
                      <div
                        className={cn(
                          'h-1 rounded-full transition-colors duration-500',
                          i < step ? 'bg-brand' : i === step ? 'bg-brand' : 'bg-line',
                        )}
                      />
                      <p
                        className={cn(
                          'mt-2 hidden text-[11px] font-medium sm:block',
                          i <= step ? 'text-ink-muted' : 'text-ink-faint',
                        )}
                      >
                        {i + 1}. {label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <h2 id="registration-title" className="mt-3 pr-10 text-2xl font-semibold text-ink">
              <span className="hl">You&apos;re In!</span> 🎉
            </h2>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- body */}
      <div className="px-6 py-6 sm:px-8">
        {/* The success screen renders outside the AnimatePresence group on purpose:
            waiting for an exit animation here would delay the highest-emotion moment
            of the whole funnel by ~300ms for no benefit. */}
        {step === 3 && student ? (
          <SuccessPanel
            code={student.code}
            projectId={student.recommendedProjectId}
            referralCount={referralCount}
            referralNames={referrals.map((r) => r.name)}
            onClose={onClose}
            totalRegistrations={totalRegistrations}
          />
        ) : (
        <AnimatePresence mode="wait" initial={false}>
          {/* ============================== STEP 0 ============================== */}
          {step === 0 ? (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.24 }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Full name"
                  error={errors.name}
                  value={form.name}
                  onChange={(v) => set('name', v)}
                  placeholder="Deepika Reddy"
                  name="name"
                  firstFocus
                />
                <Field
                  label="Email"
                  type="email"
                  error={errors.email}
                  value={form.email}
                  onChange={(v) => set('email', v)}
                  placeholder="you@college.edu"
                  name="email"
                />
              </div>

              <Field
                label="College"
                error={errors.college}
                value={form.college}
                onChange={(v) => set('college', v)}
                placeholder="SSN College of Engineering"
                name="college"
              />
              <CampusNudge college={form.college} />

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Branch"
                  error={errors.branch}
                  value={form.branch}
                  onChange={(v) => set('branch', v)}
                  options={BRANCHES}
                  placeholder="Select branch"
                  name="branch"
                />
                <SelectField
                  label="Year"
                  error={errors.year}
                  value={form.year}
                  onChange={(v) => set('year', v)}
                  options={YEARS}
                  placeholder="Select year"
                  name="year"
                />
              </div>

              <div>
                <p className="mb-2.5 text-[13px] font-medium text-ink">
                  How comfortable are you with coding?
                </p>
                <OptionGrid
                  name="Coding experience"
                  options={EXPERIENCE_OPTIONS.map((e) => ({
                    id: e.id,
                    label: e.label,
                    emoji: e.emoji,
                    blurb: e.blurb,
                  }))}
                  value={form.experience}
                  onChange={(v) => set('experience', v as Experience)}
                  columns={3}
                />
                {errors.experience ? (
                  <p role="alert" className="mt-2 text-xs text-red-600">
                    {errors.experience}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-ink-faint">
                  We use this only to pick your project. No spam, ever.
                </p>
                <Button
                  size="lg"
                  disabled={submitting}
                  onClick={() => {
                    if (mode === 'quick') {
                      submitQuick();
                      return;
                    }
                    if (!validateStep0('full')) {
                      showToast({
                        title: 'Check the highlighted fields',
                        description: 'A couple of details are missing.',
                        variant: 'error',
                      });
                      return;
                    }
                    track('registration_step_completed', { step: 1, source });
                    setStep(1);
                  }}
                >
                  {mode === 'quick' ? (submitting ? 'Reserving…' : 'Reserve my seat') : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : null}

          {/* ============================== STEP 1 ============================== */}
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.24 }}
              className="space-y-5"
            >
              <OptionGrid
                name="Interest area"
                options={INTERESTS.map((i) => ({ id: i.id, label: i.label, emoji: i.emoji, blurb: i.blurb }))}
                value={interest}
                onChange={setInterest}
                columns={2}
              />

              <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  size="lg"
                  disabled={!interest}
                  onClick={() => {
                    track('registration_step_completed', { step: 2, interest, source });
                    setStep(2);
                  }}
                >
                  Show my project
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : null}

          {/* ============================== STEP 2 ============================== */}
          {step === 2 ? (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.24 }}
              className="space-y-5"
            >
              <div className="rounded-2xl border border-line bg-surface-2 p-4">
                <ul className="space-y-2.5">
                  {[
                    'Reading your interests and experience',
                    'Matching against 10 starter projects',
                    'Scoring for 60-minute feasibility',
                  ].map((label, i) => {
                    const done = pipelineStage > i;
                    return (
                      <li key={label} className="flex items-center gap-3 text-[13px]">
                        <span
                          className={cn(
                            'grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors',
                            done ? 'border-brand bg-brand/25' : 'border-line',
                          )}
                        >
                          {done ? (
                            <Check className="h-3 w-3 text-brand-deep" strokeWidth={3} />
                          ) : (
                            <Spinner className="h-2.5 w-2.5 border-line-strong" />
                          )}
                        </span>
                        <span className={done ? 'text-ink-muted' : 'text-ink-faint'}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <AnimatePresence>
                {!generating && recommendation ? (
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                    className="relative overflow-hidden rounded-2xl border border-brand/70 bg-brand/[0.12] p-5"
                  >
                    <RecommendationBody project={recommendation} />
                  </motion.div>
                ) : (
                  <div className="space-y-3" aria-hidden>
                    <div className="h-24 animate-pulse rounded-2xl border border-line bg-surface-2" />
                    <div className="h-10 w-2/3 animate-pulse rounded-xl border border-line bg-surface-2" />
                  </div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
                <Button
                  size="lg"
                  className="flex-1"
                  loading={submitting}
                  disabled={generating || !recommendation}
                  onClick={submit}
                >
                  Reserve my free spot
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>
                  <ArrowLeft className="h-4 w-4" />
                  Change interest
                </Button>
              </div>
            </motion.div>
          ) : null}

        </AnimatePresence>
        )}
      </div>

      {/* ---------------------------------------------------------------- footer */}
      {step < 3 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-6 py-3.5 sm:px-8">
          <p className="text-[11px] text-ink-faint">
            Free to attend · {nf(REGISTRATION_TARGET)} seats · Beginner friendly
          </p>
          <NoteTag label="Prototype" className="sm:hidden" />
        </div>
      ) : null}
    </Modal>
  );
}

/* ------------------------------------------------------------------ pieces */

function RecommendationBody({ project }: { project: Project }) {
  const Icon = getIcon(project.icon);
  return (
    <>
      <p className="mono-label">Based on your answers, you&apos;ll love</p>
      <div className="mt-3 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brand/70 bg-brand/20">
          <Icon className="h-5 w-5 text-brand-deep" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-ink">{project.name}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{project.tagline}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="acid">{project.difficulty}</Badge>
        <Badge tone="cy">{project.buildTime}</Badge>
        <Badge tone="neutral">{project.tech.join(' + ')}</Badge>
      </div>

      <p className="mt-5 text-[13px] font-semibold text-ink">You&apos;ll learn:</p>
      <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
        {project.learn.map((l) => (
          <li key={l} className="flex items-start gap-2 text-[13px] text-ink-muted">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-deep" strokeWidth={3} />
            {l}
          </li>
        ))}
      </ul>
    </>
  );
}

function SuccessPanel({
  code,
  projectId,
  referralCount,
  referralNames,
  onClose,
  totalRegistrations,
}: {
  code: string;
  projectId?: string;
  referralCount: number;
  referralNames: string[];
  onClose: () => void;
  totalRegistrations: number;
}) {
  const { copied, copy } = useCopy();
  const link = referralLink(code);
  const milestone = MILESTONES[0];
  const nextMilestone = MILESTONES.find((m) => m.count > referralCount) ?? MILESTONES[MILESTONES.length - 1];
  const { workshopDate: workshopIso, campus, student } = useApp();
  const workshop = new Date(workshopIso);

  // Campus standing, exact at the moment of joining — and the next collective
  // unlock, lit by the real seat count.
  const campusLine = campus?.rank
    ? `You are student #${campus.students} from your college — rank #${campus.rank} of ${campus.colleges} on the campus board.`
    : campus
      ? 'You put your college on the campus board — now make it climb.'
      : null;
  const nextGoal = STRETCH_GOALS.find((g) => g.at > totalRegistrations);
  const justUnlocked = [...STRETCH_GOALS].reverse().find((g) => g.at <= totalRegistrations);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative space-y-5"
    >
      <ConfettiBurst />

      {/* the game plan: one registered action, two that grow the campaign */}
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <p className="mono-label">Your next 3 moves</p>
        <ol className="mt-2.5 space-y-2">
          {[
            { done: true, text: 'Seat reserved — you are in.' },
            { done: false, text: 'Send your link to 3 friends who are also final year.' },
            { done: false, text: 'At 3 joins, the Verified Certificate & LinkedIn Badge unlock for you.' },
          ].map((row, i) => (
            <li key={row.text} className="flex items-start gap-2.5">
              <span
                className={cn(
                  'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                  row.done ? 'bg-brand text-white' : 'border border-line bg-surface-3 text-ink-faint',
                )}
              >
                {row.done ? '✓' : i + 1}
              </span>
              <span
                className={cn(
                  'text-[12px] leading-relaxed',
                  row.done ? 'text-ink' : 'font-medium text-ink-muted',
                )}
              >
                {row.text}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-brand/70 bg-gradient-to-br from-brand/[0.14] via-transparent to-transparent p-5">
        <PartyPopper className="absolute -right-2 -top-2 h-16 w-16 text-brand-deep/15" aria-hidden />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mono-label">Workshop</p>
            <p className="mt-1 text-[15px] font-semibold text-ink">
              Build Your First AI Project in 60 Minutes
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand bg-brand/25 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-deep" />
            Registered
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface-2 px-3.5 py-3">
            <p className="mono-label">Your slot</p>
            <p className="mt-1 text-[13px] font-medium text-ink">
              {workshop.toLocaleString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              IST
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 px-3.5 py-3">
            <p className="mono-label">Seat</p>
            <p className="mt-1 text-[13px] font-medium text-ink">
              #{nf(totalRegistrations)} of 500
            </p>
          </div>
        </div>

        <a
          href={calendarLink(projectId ?? 'your-project', workshop)}
          download="nxtwave-ai-workshop.ics"
          onClick={() => track('cta_clicked', { location: 'success_calendar' })}
          className="mt-3 inline-flex items-center gap-2 text-[12px] font-semibold text-brand-deep underline-offset-4 hover:underline"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Add to calendar
        </a>
      </div>

      {/* referral code */}
      <div className="rounded-2xl border border-violet/25 bg-violet/[0.08] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mono-label">Your referral code</p>
            <p className="mt-1.5 font-mono text-2xl font-bold tracking-wider text-ink">{code}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const ok = await copy(code);
              if (ok) {
                track('referral_link_copied', { code, kind: 'code' });
                // eslint-disable-next-line no-console
              }
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-brand-deep" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy code'}
          </Button>
        </div>
        <p className="mt-3 break-all rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-[11px] text-cyan">
          {link}
        </p>
      </div>

      {/* campus + cohort unlocks */}
      {(campusLine || nextGoal) && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {campusLine ? (
            <div className="rounded-2xl border border-line bg-surface-2 p-4">
              <p className="mono-label">Campus standing</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{campusLine}</p>
            </div>
          ) : null}
          {nextGoal ? (
            <div className="rounded-2xl border border-line bg-surface-2 p-4">
              <p className="mono-label">Next cohort unlock</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
                {nextGoal.emoji} <span className="font-semibold text-ink">{nextGoal.title}</span> unlocks for
                everyone at {nextGoal.at} seats — {nextGoal.at - totalRegistrations} to go.
                {justUnlocked ? ` ${justUnlocked.emoji} ${justUnlocked.title} is already yours.` : ''}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* the shareable asset */}
      <AmbassadorPoster
        code={code}
        name={student?.name ?? code}
        college={student?.college}
        projectId={projectId}
      />

      {/* referral progress */}
      <div className="rounded-2xl border border-line bg-surface-2 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Users className="h-4 w-4 text-brand-deep" />
            Invite 3 friends and unlock the Verified Certificate & LinkedIn Badge
          </p>
          <span className="font-mono text-[11px] text-ink-muted">{referralCount}/3</span>
        </div>

        <ProgressBar
          value={Math.min(referralCount, 3)}
          max={3}
          className="mt-3"
          size="sm"
          label={`${referralCount} / 3 friends joined`}
        />

        {referralNames.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {referralNames.map((n, i) => (
              <motion.span
                key={`${n}-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand/70 bg-brand/20 px-2.5 py-1 text-[11px] font-medium text-brand-deep"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
                {n}
              </motion.span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-ink-faint">
            No one has joined with your code yet. Send it to 3 friends who are also final year.
          </p>
        )}

        <div className="mt-4">
          <SharePanel code={code} variant="compact" />
        </div>

        {milestone && referralCount >= milestone.count ? (
          <p className="mt-3 text-[12px] text-brand-deep">
            ✓ Unlocked: {milestone.label} — sent to your email.
          </p>
        ) : null}
        {nextMilestone.count > referralCount ? (
          <p className="mt-3 text-[12px] text-ink-muted">
            Next up: {nextMilestone.label} at {nextMilestone.count} referrals.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button
          className="flex-1"
          onClick={() => {
            onClose();
            window.setTimeout(() => {
              document.getElementById('referrals')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 180);
          }}
        >
          Open my referral dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Back to the page
        </Button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ inputs */

function Field({
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  name,
  /** Marked so <Modal> focuses this field when the dialog opens, instead of
   *  using React's autoFocus (which fires mid-commit and breaks focus restore). */
  firstFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  name: string;
  firstFocus?: boolean;
}) {
  const id = `reg-${name}`;
  const errId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        data-autofocus={firstFocus ? 'true' : undefined}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errId : undefined}
        className={cn('field', error && 'field-error')}
      />
      {error ? (
        <p id={errId} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  placeholder,
  name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  error?: string;
  placeholder: string;
  name: string;
}) {
  const id = `reg-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={cn('field appearance-none pr-9', !value && 'text-ink-faint', error && 'field-error')}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Real .ics so "Add to calendar" genuinely works, dated to the real workshop. */
function calendarLink(projectId: string, start: Date) {
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NxtWave//AI Project Launchpad//EN',
    'BEGIN:VEVENT',
    `UID:${projectId}-${start.getTime()}@nxtwave`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    'SUMMARY:Build Your First AI Project in 60 Minutes (NxtWave)',
    `DESCRIPTION:Free beginner workshop. Your project: ${projectId}. Join link is sent by email.`,
    'LOCATION:Online',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}


/**
 * Live campus context while typing the college name — social pull at the exact
 * moment of decision. Phrasing is honest: the scoreboard is the real top of the
 * board, so "not on the board yet" never claims a college has zero students.
 */
function CampusNudge({ college }: { college: string }) {
  const { collegeScoreboard } = useApp();
  const typed = college.trim().toLowerCase();
  if (typed.length < 3) return null;

  const rows = collegeScoreboard ?? [];
  const idx = rows.findIndex((c) => {
    const n = c.college.toLowerCase();
    return n.includes(typed) || (typed.length > 5 && typed.includes(n));
  });

  return (
    <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-muted">
      <span aria-hidden>🏫</span>
      {idx >= 0 ? (
        <span>
          <span className="font-semibold text-ink">
            {rows[idx].students} student{rows[idx].students === 1 ? '' : 's'}
          </span>{' '}
          from {rows[idx].college} have joined — it is rank #{idx + 1} on the campus board. Help it climb.
        </span>
      ) : (
        <span>
          <span className="font-semibold text-ink">{college.trim()}</span> is not on the campus board yet —
          your registration could put it there.
        </span>
      )}
    </p>
  );
}


/**
 * A one-shot confetti burst — ~26 chips that fall once and never come back.
 * Deliberately small: a celebration, not a slot machine. Renders nothing on
 * reduced-motion devices.
 */
function ConfettiBurst() {
  const chips = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 320,
        rot: (Math.random() - 0.5) * 220,
        delay: Math.random() * 0.18,
        size: 5 + Math.random() * 6,
        color: ['#4F46E5', '#CCFF4D', '#6D28D9', '#0A7186', '#6366F1'][i % 5],
      })),
    [],
  );
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 overflow-hidden" aria-hidden>
      {chips.map((c) => (
        <motion.span
          key={c.id}
          initial={{ x: 0, y: 20, opacity: 1, rotate: 0 }}
          animate={{ x: c.x, y: 170, opacity: 0, rotate: c.rot }}
          transition={{ duration: 1.25, delay: c.delay, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            left: '50%',
            top: 8,
            width: c.size,
            height: c.size * 0.62,
            borderRadius: 2,
            backgroundColor: c.color,
          }}
        />
      ))}
    </div>
  );
}
