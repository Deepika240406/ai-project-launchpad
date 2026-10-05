import { useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { Clock, Github, Sparkles, Target } from 'lucide-react';
import type { Project } from '../lib/types';
import { cn } from '../lib/utils';
import { getIcon } from './icons';
import { Badge, Button, Modal } from './ui';
import { track } from '../lib/analytics';

const DIFFICULTY_TONE: Record<Project['difficulty'], 'acid' | 'cy' | 'violet'> = {
  Beginner: 'acid',
  'Beginner+': 'cy',
  Intermediate: 'violet',
};

/**
 * Interactive project card.
 * Hover = cursor-tracked spotlight (cheap: two motion values, no re-render),
 * Click = full detail sheet where the real decision happens.
 */
export function ProjectCard({
  project,
  index = 0,
  onOpen,
  compact = false,
}: {
  project: Project;
  index?: number;
  onOpen: (p: Project) => void;
  compact?: boolean;
}) {
  const Icon = getIcon(project.icon);
  const ref = useRef<HTMLButtonElement | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spotlight = useMotionTemplate`radial-gradient(360px circle at ${mx}px ${my}px, rgba(204,255,77,0.55), transparent 72%)`;

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      onMouseMove={onMove}
      onClick={() => onOpen(project)}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.35), ease: [0.22, 1, 0.36, 1] }}
      aria-label={`${project.name} — view project details`}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card p-5 text-left transition-all duration-300',
        'hover:-translate-y-1 hover:border-brand/70 hover:shadow-[0_2px_6px_rgba(11,15,25,0.05),0_26px_48px_-26px_rgba(11,15,25,0.30)]',
        'focus-visible:-translate-y-1',
        compact && 'p-4',
      )}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: spotlight }}
      />
      <span
        aria-hidden
        className={cn('pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br blur-2xl', project.accent)}
      />

      <div className="relative flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-3">
          <Icon className="h-[18px] w-[18px] text-brand-deep" />
        </span>
        <Badge tone={DIFFICULTY_TONE[project.difficulty]}>{project.difficulty}</Badge>
      </div>

      <h3 className="relative mt-4 text-[15px] font-semibold leading-snug text-ink">
        {project.name}
      </h3>
      <p className="relative mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
        {project.tagline}
      </p>

      <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
        {project.tech.slice(0, 3).map((t) => (
          <span
            key={t}
            className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-ink-faint"
          >
            {t}
          </span>
        ))}
        {project.tech.length > 3 ? (
          <span className="font-mono text-[10px] text-ink-faint">+{project.tech.length - 3}</span>
        ) : null}
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-line pt-3.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
          <Clock className="h-3.5 w-3.5 text-ink-faint" />
          {project.buildTime}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-deep opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          View details
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
            <path d="M2 6h8M6 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </motion.button>
  );
}

export function ProjectDetailModal({
  project,
  onClose,
  onRegister,
  onSave,
  saved,
}: {
  project: Project | null;
  onClose: () => void;
  onRegister: (p: Project) => void;
  onSave?: (p: Project) => void;
  saved?: boolean;
}) {
  const [generating, setGenerating] = useState(false);
  const Icon = project ? getIcon(project.icon) : Sparkles;

  if (!project) return null;

  return (
    <Modal open={Boolean(project)} onClose={onClose} size="lg" labelledBy="project-detail-title">
      <div className="relative">
        <div className={cn('absolute inset-x-0 top-0 h-40 bg-gradient-to-br blur-2xl', project.accent)} aria-hidden />
        <div className="relative p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface-3">
              <Icon className="h-5 w-5 text-brand-deep" />
            </span>
            <div>
              <p className="mono-label">Starter project</p>
              <h3 id="project-detail-title" className="mt-0.5 text-xl font-semibold text-ink">
                {project.name}
              </h3>
            </div>
          </div>

          <p className="mt-5 text-[15px] leading-relaxed text-ink-muted">{project.description}</p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Difficulty', value: project.difficulty as string, tone: 'acid' as const },
              { label: 'Build time', value: project.buildTime, tone: 'cy' as const },
              { label: 'Stack', value: project.tech.slice(0, 2).join(' + '), tone: 'neutral' as const },
              { label: 'Stack+', value: project.tech.slice(2).join(' + ') || '—', tone: 'neutral' as const },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-line bg-surface-2 px-3.5 py-3">
                <p className="mono-label">{s.label}</p>
                <p
                  className={cn(
                    'mt-1 text-[13px] font-semibold',
                    s.tone === 'acid' ? 'text-brand-deep' : s.tone === 'cy' ? 'text-cyan' : 'text-ink',
                  )}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Target className="h-4 w-4 text-brand-deep" />
                What you will learn
              </p>
              <ul className="mt-3 space-y-2">
                {project.learn.map((l) => (
                  <li key={l} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-deep" />
                    {l}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Github className="h-4 w-4 text-cyan" />
                Your interview line
              </p>
              <p className="mt-3 rounded-xl border border-line bg-surface-2 p-3.5 text-[13px] italic leading-relaxed text-ink-muted">
                “{project.interviewLine}”
              </p>
              <p className="mt-2.5 text-[11px] text-ink-faint">
                You leave the workshop able to say this sentence and defend it.
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Button
              size="lg"
              loading={generating}
              onClick={() => {
                setGenerating(true);
                track('project_selected', { projectId: project.id, source: 'detail_modal' });
                window.setTimeout(() => {
                  setGenerating(false);
                  onRegister(project);
                }, 420);
              }}
              className="flex-1"
            >
              Build this with me
              <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" aria-hidden>
                <path d="M2 6h8M6 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
            {onSave ? (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  onSave(project);
                  track('idea_saved', { projectId: project.id, source: 'detail_modal' });
                }}
              >
                {saved ? 'Saved ✓' : 'Save this idea'}
              </Button>
            ) : null}
          </div>
          <p className="mt-3 text-center text-[11px] text-ink-faint sm:text-left">
            Free · 60 minutes · Beginner friendly · 500 seats
          </p>
        </div>
      </div>
    </Modal>
  );
}
