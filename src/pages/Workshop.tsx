import { ArrowRight, CalendarClock, Timer } from 'lucide-react';
import { Roadmap, Inside } from '../components/Experience';
import { Faq } from '../components/Faq';
import { CtaBand, PageHero, PageShell } from '../components/PageShell';
import { Countdown } from '../components/Countdown';
import { Button, NoteTag, Section, StatPill } from '../components/ui';
import { useRegistration } from '../components/RegistrationProvider';
import { track } from '../lib/analytics';
import { OUTCOMES } from '../data/content';

export function Workshop() {
  const { openRegistration } = useRegistration();

  return (
    <PageShell>
      <PageHero
        eyebrow={
          <>
            <Timer className="h-3 w-3 text-brand-deep" />
            The workshop
          </>
        }
        title={
          <>
            Sixty minutes, planned
            <br />
            <span className="text-ink-muted">to the minute.</span>
          </>
        }
        subtitle="No prerequisites, no paid tools, no GPU. You start building at minute 20 and keep going. This page is the whole session, so you know exactly what you are signing up for."
        actions={
          <>
            <Button
              size="lg"
              onClick={() => {
                track('cta_clicked', { location: 'workshop_hero' });
                openRegistration({ source: 'workshop_hero' });
              }}
            >
              <span aria-hidden>🚀</span>
              Reserve my free spot
              <ArrowRight className="h-4 w-4" />
            </Button>
            <span className="text-[12px] text-ink-faint">Free · 500 seats · Beginner friendly</span>
          </>
        }
        meta={
          <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <StatPill label="Format" value="Live online" />
              <StatPill label="Duration" value="60 minutes" />
              <StatPill label="You need" value="A laptop" />
              <StatPill label="Cost" value="₹0" tone="acid" />
            </div>
            <div className="min-w-[280px] flex-1 rounded-2xl border border-line bg-surface-2 p-4 sm:p-5">
              <Countdown compact />
            </div>
          </div>
        }
      />

      <Roadmap />
      <Inside />

      {/* expected outcomes live here rather than on the home page: this is the
          page a student reads when deciding whether the 60 minutes are worth it */}
      <Section className="border-t border-line">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            What you will leave with
          </h2>
          <span className="chip border-dashed">Expected outcome — not a testimonial</span>
        </div>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
          We are not quoting students, because this workshop has not run yet. These are the five things the
          session is designed to produce, and each one is checkable by the end of the hour.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {OUTCOMES.map((o) => (
            <div key={o.title} className="rounded-2xl border border-line bg-card p-4">
              <CalendarClock className="h-4 w-4 text-brand-deep" />
              <p className="mt-3 text-[13px] font-semibold text-ink">{o.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{o.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <NoteTag label="Prototype" />
          <p className="text-[12px] text-ink-faint">
            The seat cap is enforced by the registration database and the countdown runs to the real
            workshop date — the 60-minute format is the constraint that shapes everything above.
          </p>
        </div>
      </Section>

      <Faq />

      <CtaBand
        source="workshop_final"
        title="One sitting. One working project."
        body="If you have ever finished a tutorial and had nothing to show for it, this is the hour that fixes that. Bring your laptop."
        secondary={{ label: 'Pick your project first', to: '/projects' }}
      />
    </PageShell>
  );
}
