import { useMemo, useState } from 'react';
import { LayoutGrid, Lightbulb } from 'lucide-react';
import { PROJECTS } from '../data/projects';
import type { Difficulty, Project } from '../lib/types';
import { useApp } from '../store/AppStore';
import { useRegistration } from './RegistrationProvider';
import { ProjectCard, ProjectDetailModal } from './ProjectCard';
import { Button, Reveal, Section, SectionHeading } from './ui';
import { cn } from '../lib/utils';
import { track } from '../lib/analytics';

const FILTERS: { id: 'all' | Difficulty; label: string }[] = [
  { id: 'all', label: 'All 10' },
  { id: 'Beginner', label: 'Beginner' },
  { id: 'Beginner+', label: 'Beginner+' },
  { id: 'Intermediate', label: 'Intermediate' },
];

export function ProjectsSection() {
  const [filter, setFilter] = useState<'all' | Difficulty>('all');
  const [open, setOpen] = useState<Project | null>(null);
  const { savedIdeaId, saveIdea, showToast } = useApp();
  const { openRegistration } = useRegistration();

  const visible = useMemo(
    () => (filter === 'all' ? PROJECTS : PROJECTS.filter((p) => p.difficulty === filter)),
    [filter],
  );

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
          title="Ten projects. Pick the one that sounds like you."
          subtitle="Every project on this list is scoped to finish in a single 60-minute session — with free tools only. Tap any card to see exactly what you'll walk away with."
        />

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter projects by difficulty">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                track('project_generator_open', { location: 'projects_filter', filter: f.id });
              }}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition',
                filter === f.id
                  ? 'border-brand bg-brand/20 text-brand-deep'
                  : 'border-line bg-surface-2 text-ink-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p, i) => (
          <ProjectCard
            key={p.id}
            project={p}
            index={i}
            onOpen={(proj) => {
              setOpen(proj);
              track('project_card_opened', { projectId: proj.id, source: 'projects_grid' });
            }}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="text-sm text-ink-muted">
            No projects at this difficulty yet. Try “All 10”.
          </p>
        </div>
      ) : null}

      <Reveal>
        <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-line bg-surface-2 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet/30 bg-violet/10">
              <Lightbulb className="h-4 w-4 text-violet" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Still nothing clicking?</p>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                Answer three questions and we&apos;ll match a project to your interests.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              track('simulator_started', { source: 'projects_section' });
              document.getElementById('simulator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            Match me to a project
          </Button>
        </div>
      </Reveal>

      <ProjectDetailModal
        project={open}
        saved={Boolean(open && savedIdeaId === open.id)}
        onClose={() => setOpen(null)}
        onSave={(p) => {
          saveIdea(p.id);
          showToast({
            title: 'Idea saved',
            description: `${p.name} is pinned to your workshop plan.`,
            variant: 'success',
          });
        }}
        onRegister={(p) => {
          setOpen(null);
          openRegistration({ projectId: p.id, source: 'project_card' });
        }}
      />
    </Section>
  );
}
