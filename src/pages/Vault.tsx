import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive,
  Check,
  ChevronDown,
  FolderOpen,
  Lightbulb,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { CtaBand, NextSteps, PageHero, PageShell } from '../components/PageShell';
import { Button, Card, NoteTag, EmptyState, ProgressBar, Section, SectionHeading } from '../components/ui';
import { BUILD_STAGES } from '../lib/buildStages';
import { getIcon } from '../components/icons';
import { PROJECTS, projectById } from '../data/projects';
import { useApp } from '../store/AppStore';
import { useRegistration } from '../components/RegistrationProvider';
import { cn, timeAgo } from '../lib/utils';
import { track } from '../lib/analytics';
import type { VaultIdea } from '../lib/types';

/**
 * IDEA VAULT  (/vault)
 * ---------------------------------------------------------------------------
 * The problem this solves: a student's ideas live in four different notes apps
 * and none of them have a next step attached. The vault keeps a shortlist, adds
 * a priority, and — the part that matters — attaches the same six-stage build
 * journey to whichever idea they commit to.
 *
 * State is local (localStorage), so it works with no account. The Supabase path
 * is documented in the README.
 */

const PRIORITIES: { id: VaultIdea['priority']; label: string; tone: string }[] = [
  { id: 'now', label: 'Building now', tone: 'text-brand-deep bg-brand/[0.16] border-brand-deep/30' },
  { id: 'next', label: 'Next up', tone: 'text-violet bg-violet/10 border-violet/30' },
  { id: 'later', label: 'Someday', tone: 'text-ink-muted bg-surface-3 border-line-strong' },
  { id: '', label: 'No priority', tone: 'text-ink-faint bg-surface-2 border-line' },
];

const priorityStyle = (p: VaultIdea['priority']) =>
  PRIORITIES.find((x) => x.id === p)?.tone ?? PRIORITIES[3].tone;

const priorityLabel = (p: VaultIdea['priority']) =>
  PRIORITIES.find((x) => x.id === p)?.label ?? 'No priority';

export function Vault() {
  const {
    vault,
    vaultCount,
    totalStagesDone,
    quiz,
    savedIdeaId,
    addVaultIdea,
    updateVaultIdea,
    removeVaultIdea,
    toggleStage,
    showToast,
  } = useApp();
  const { openRegistration } = useRegistration();

  const [title, setTitle] = useState('');
  const [pitch, setPitch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalPossibleStages = vaultCount * BUILD_STAGES.length;
  const completion = totalPossibleStages
    ? Math.round((totalStagesDone / totalPossibleStages) * 100)
    : 0;

  const suggested = useMemo(() => {
    const picked = new Set(vault.map((i) => i.projectId));
    const fromQuiz = quiz ? projectById(quiz.answers[0]?.questionId) : undefined;
    void fromQuiz;
    return PROJECTS.filter((p) => !picked.has(p.id)).slice(0, 3);
  }, [vault, quiz]);

  const add = (payload: { title: string; pitch: string; projectId?: string; priority?: VaultIdea['priority'] }) => {
    if (!payload.title.trim()) return;
    const created = addVaultIdea({
      title: payload.title.trim(),
      pitch: payload.pitch.trim(),
      notes: '',
      priority: payload.priority ?? '',
      projectId: payload.projectId,
    });
    setExpanded(created.id);
    setTitle('');
    setPitch('');
    track('idea_saved', { source: 'vault', projectId: payload.projectId ?? null });
    showToast({ title: 'Added to your vault', description: 'Now give it a next step.', variant: 'success' });
  };

  return (
    <PageShell>
      <PageHero
        eyebrow={
          <>
            <Archive className="h-3 w-3 text-brand-deep" />
            Idea vault
          </>
        }
        title={
          <>
            Your project ideas,
            <br />
            <span className="text-ink-muted">with a next step attached.</span>
          </>
        }
        subtitle="A shortlist is not a plan. Add your ideas here, pick the one you are actually building, then work the six stages — scope, input, output, prompt, wire, deploy. It saves in your browser, no account needed."
        meta={
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <VaultStat label="Ideas saved" value={String(vaultCount)} />
            <VaultStat label="Stages done" value={`${totalStagesDone}/${totalPossibleStages || 0}`} tone="brand" />
            <VaultStat label="Overall progress" value={`${completion}%`} />
            <VaultStat label="Readiness score" value={quiz ? `${quiz.score}/100` : '—'} tone="violet" />
          </div>
        }
      />

      <Section className="pt-4">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
          {/* ------------------------------------------------------------ list */}
          <div className="space-y-4">
            {/* quick add */}
            <Card className="p-5 sm:p-6">
              <p className="mono-label">Add an idea</p>
              <div className="mt-4 space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && add({ title, pitch })}
                  placeholder="AI Attendance Alerts"
                  aria-label="Idea title"
                  className="field"
                />
                <textarea
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  rows={2}
                  placeholder="One sentence: it takes ___ and gives back ___."
                  aria-label="One-line pitch"
                  className="field resize-none"
                />
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button onClick={() => add({ title, pitch })} disabled={!title.trim()}>
                    <Plus className="h-4 w-4" />
                    Add to vault
                  </Button>
                  <span className="text-[11px] text-ink-faint">
                    Tip: if you cannot finish the sentence, the project is too big.
                  </span>
                </div>
              </div>
            </Card>

            {/* ideas */}
            {vaultCount === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="Your vault is empty"
                body="Add an idea above, or pull one in from the catalogue below. Everything you save here persists in this browser."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const first = PROJECTS[0];
                      add({ title: first.name, pitch: first.tagline, projectId: first.id, priority: 'now' });
                    }}
                  >
                    <Wand2 className="h-4 w-4" />
                    Start with a suggested project
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {vault.map((idea) => {
                  const project = idea.projectId ? projectById(idea.projectId) : undefined;
                  const Icon = getIcon(project?.icon);
                  const isOpen = expanded === idea.id;
                  const done = idea.stages.length;
                  const pct = Math.round((done / BUILD_STAGES.length) * 100);

                  return (
                    <motion.li
                      key={idea.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28 }}
                    >
                      <Card className="overflow-hidden">
                        <div className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2">
                            <Icon className={cn('h-4 w-4', project ? 'text-violet' : 'text-ink-faint')} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-[15px] font-semibold text-ink">{idea.title}</h3>
                              <span
                                className={cn(
                                  'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                  priorityStyle(idea.priority),
                                )}
                              >
                                {priorityLabel(idea.priority)}
                              </span>
                            </div>
                            {idea.pitch ? (
                              <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{idea.pitch}</p>
                            ) : null}
                            <p className="mt-1.5 font-mono text-[10px] text-ink-faint">
                              added {timeAgo(idea.createdAt)}
                              {savedIdeaId === idea.projectId ? ' · pinned on the projects page' : ''}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              onClick={() => {
                                setExpanded(isOpen ? null : idea.id);
                                if (!isOpen) track('faq_opened', { question: 'vault_idea_expanded' });
                              }}
                              aria-expanded={isOpen}
                              aria-label={isOpen ? `Collapse ${idea.title}` : `Expand ${idea.title}`}
                              className="rounded-lg border border-line bg-surface-2 p-2 text-ink-muted transition hover:bg-surface-3 hover:text-ink"
                            >
                              <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                            </button>
                            <button
                              onClick={() => {
                                removeVaultIdea(idea.id);
                                showToast({ title: 'Removed from vault', variant: 'info' });
                              }}
                              aria-label={`Delete ${idea.title}`}
                              className="rounded-lg border border-line bg-surface-2 p-2 text-ink-faint transition hover:border-red-300 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                          <div className="flex items-center gap-3">
                            <ProgressBar
                              value={pct}
                              size="sm"
                              className="flex-1"
                              label={`${done} of ${BUILD_STAGES.length} stages`}
                            />
                            <span className="shrink-0 font-mono text-[11px] font-semibold text-ink-muted">
                              {pct}%
                            </span>
                          </div>
                        </div>

                        <AnimatePresence initial={false}>
                          {isOpen ? (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden border-t border-line"
                            >
                              <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
                                {/* checklist */}
                                <div>
                                  <p className="mono-label">Build checklist</p>
                                  <ul className="mt-3 space-y-1.5">
                                    {BUILD_STAGES.map((stage) => {
                                      const checked = idea.stages.includes(stage.id);
                                      return (
                                        <li key={stage.id}>
                                          <button
                                            onClick={() => {
                                              toggleStage(idea.id, stage.id);
                                              if (!checked) track('idea_saved', { source: 'vault_stage', stage: stage.id });
                                            }}
                                            aria-pressed={checked}
                                            className={cn(
                                              'flex w-full items-start gap-3 rounded-xl border p-2.5 text-left transition',
                                              checked
                                                ? 'border-brand-deep/30 bg-brand/[0.14]'
                                                : 'border-line bg-surface-2 hover:border-line-strong',
                                            )}
                                          >
                                            <span
                                              className={cn(
                                                'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border',
                                                checked ? 'border-brand-deep bg-brand-deep' : 'border-line-strong',
                                              )}
                                            >
                                              {checked ? (
                                                <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                                              ) : null}
                                            </span>
                                            <span className="min-w-0">
                                              <span
                                                className={cn(
                                                  'block text-[12px] font-semibold',
                                                  checked ? 'text-ink' : 'text-ink-muted',
                                                )}
                                              >
                                                {stage.label}
                                              </span>
                                              <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-faint">
                                                {stage.detail}
                                              </span>
                                            </span>
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>

                                {/* notes + priority */}
                                <div className="space-y-4">
                                  <div>
                                    <label
                                      htmlFor={`notes-${idea.id}`}
                                      className="mono-label block"
                                    >
                                      Your notes
                                    </label>
                                    <textarea
                                      id={`notes-${idea.id}`}
                                      value={idea.notes}
                                      onChange={(e) => updateVaultIdea(idea.id, { notes: e.target.value })}
                                      rows={7}
                                      placeholder={'What will the screen show when it works?\nWhich API? Which dataset?\nWhat will you cut if time runs out?'}
                                      className="field mt-3 resize-none text-[12px]"
                                    />
                                  </div>

                                  <div>
                                    <p className="mono-label">Priority</p>
                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                      {PRIORITIES.map((p) => (
                                        <button
                                          key={p.id || 'none'}
                                          onClick={() => updateVaultIdea(idea.id, { priority: p.id })}
                                          aria-pressed={idea.priority === p.id}
                                          className={cn(
                                            'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition',
                                            idea.priority === p.id
                                              ? p.tone
                                              : 'border-line bg-surface-2 text-ink-faint hover:border-line-strong',
                                          )}
                                        >
                                          {p.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {project ? (
                                    <div className="rounded-xl border border-line bg-surface-2 p-3.5">
                                      <p className="mono-label">Based on</p>
                                      <p className="mt-1.5 text-[12px] font-semibold text-ink">{project.name}</p>
                                      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                                        {project.interviewLine}
                                      </p>
                                    </div>
                                  ) : null}

                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        openRegistration({ projectId: idea.projectId, source: 'vault' })
                                      }
                                    >
                                      Reserve my seat
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </Card>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ------------------------------------------------------- side rail */}
          <div className="space-y-4">
            <Card className="p-5">
              <p className="mono-label flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-brand-deep" />
                Pull in a suggestion
              </p>
              <ul className="mt-4 space-y-2">
                {suggested.map((p) => {
                  const SIcon = getIcon(p.icon);
                  return (
                    <li key={p.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-card">
                        <SIcon className="h-3.5 w-3.5 text-violet" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-ink">{p.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-muted">{p.tagline}</p>
                      </div>
                      <button
                        onClick={() => add({ title: p.name, pitch: p.tagline, projectId: p.id })}
                        aria-label={`Add ${p.name} to your vault`}
                        className="shrink-0 rounded-lg border border-line bg-card p-1.5 text-ink-muted transition hover:border-brand-deep/40 hover:text-brand-deep"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="p-5">
              <p className="mono-label flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-brand-deep" />
                Why six stages?
              </p>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
                Students do not fail at AI because the AI is hard. They fail because the project is unbounded.
                Each stage is a decision you can make in five minutes, which is what keeps a build inside the
                60-minute box.
              </p>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
                The checklist is deliberately short. Adding a seventh stage would make it a coursework rubric
                instead of a shipping tool.
              </p>
            </Card>

            <div className="flex flex-wrap items-center gap-3">
              <NoteTag label="Saved in your browser" />
              <p className="text-[11px] leading-relaxed text-ink-faint">
                No account, no upload. Clearing site data clears the vault.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section className="border-t border-line pt-12">
        <SectionHeading
          eyebrow="More tools"
          title="Round out the toolkit."
        />
        <NextSteps
          className="mt-8"
          items={[
            { label: 'Card Studio', detail: 'Turn the idea you picked into a shareable card with a QR code.', to: '/card' },
            { label: 'Prompt Lab', detail: 'Draft the build prompt so you know your inputs before you code.', to: '/prompt-lab' },
            { label: 'Readiness check', detail: 'Not sure you are ready? Score yourself in five questions.', to: '/quiz' },
          ]}
        />
      </Section>

      <CtaBand
        source="vault_final"
        title="A plan without a deadline stays a plan."
        body="The workshop is the deadline. Bring the idea you picked here and leave with it deployed — that is the whole trade."
        secondary={{ label: 'See the 60-minute agenda', to: '/workshop' }}
      />
    </PageShell>
  );
}

function VaultStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'brand' | 'violet';
}) {
  return (
    <div className="rounded-xl border border-line bg-card px-3.5 py-2.5">
      <p className="mono-label">{label}</p>
      <p
        className={cn(
          'mt-1 font-mono text-[13px] font-semibold',
          tone === 'brand' ? 'text-brand-deep' : tone === 'violet' ? 'text-violet' : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}
