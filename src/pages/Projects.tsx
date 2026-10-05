import { ArrowRight, LayoutGrid, Wand2 } from 'lucide-react';
import { ProjectsSection } from '../components/ProjectsSection';
import { Simulator } from '../components/Simulator';
import { CtaBand, PageHero, PageShell } from '../components/PageShell';
import { Button, StatPill } from '../components/ui';
import { useRegistration } from '../components/RegistrationProvider';
import { useApp } from '../store/AppStore';
import { track } from '../lib/analytics';
import { projectById, PROJECTS } from '../data/projects';
import { getIcon } from '../components/icons';

export function Projects() {
  const { openRegistration } = useRegistration();
  const { savedIdeaId } = useApp();
  const saved = savedIdeaId ? projectById(savedIdeaId) : undefined;
  const SavedIcon = getIcon(saved?.icon);

  return (
    <PageShell>
      <PageHero
        eyebrow={
          <>
            <LayoutGrid className="h-3 w-3 text-brand-deep" />
            The project catalogue
          </>
        }
        title={
          <>
            Ten projects.
            <br />
            <span className="text-ink-muted">Pick the one that sounds like you.</span>
          </>
        }
        subtitle="Every project here is scoped to finish in a single 60-minute session with free tools only. Tap any card for the full breakdown — what you'll learn, the stack, and the interview line you'll be able to say afterwards."
        actions={
          <>
            <Button
              size="lg"
              onClick={() => {
                track('cta_clicked', { location: 'projects_hero' });
                openRegistration({
                  projectId: saved?.id,
                  source: 'projects_hero',
                });
              }}
            >
              <span aria-hidden>🚀</span>
              {saved ? `Build ${saved.name}` : 'Reserve my free spot'}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                track('simulator_started', { source: 'projects_hero' });
                document.getElementById('simulator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <Wand2 className="h-3.5 w-3.5" />
              Match me to a project
            </Button>
          </>
        }
        meta={
          <div className="flex flex-wrap items-end gap-6">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <StatPill label="Projects" value={String(PROJECTS.length)} />
              <StatPill label="Beginner scoped" value={`${PROJECTS.filter((p) => p.difficulty === 'Beginner').length}`} tone="acid" />
              <StatPill label="Build time" value="60 min" />
              <StatPill label="Cost to build" value="₹0" tone="cy" />
            </div>
            {saved ? (
              <div className="inline-flex items-center gap-3 rounded-2xl border border-brand/70 bg-brand/[0.12] px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/70 bg-brand/20">
                  <SavedIcon className="h-4 w-4 text-brand-deep" />
                </span>
                <div>
                  <p className="mono-label">Your saved idea</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-ink">{saved.name}</p>
                </div>
              </div>
            ) : null}
          </div>
        }
      />

      <ProjectsSection />
      <Simulator />

      <CtaBand
        source="projects_final"
        title="Found your project? Reserve the seat."
        body="Registration takes 40 seconds and you'll get a referral code you can use to bring friends along. The Starter Kit unlocks at three referrals."
        secondary={{ label: 'See the Builder Wall', to: '/leaderboard' }}
      />
    </PageShell>
  );
}
