import { ArrowRight, Archive, FlaskConical, Gauge, IdCard, type LucideIcon } from 'lucide-react';
import { Card, NoteTag, Reveal, Section, SectionHeading } from '../components/ui';
import { RouteLink, type Route } from '../lib/router';
import { useApp } from '../store/AppStore';
import { track } from '../lib/analytics';

/**
 * TOOL SHELF — the four free tools, surfaced on the home page.
 *
 * They are not decorations: each one is a reason to come back before the
 * workshop, and each one ends in the same place (reserve a seat). The shelf
 * also shows live progress — "2 ideas saved", "scored 78/100" — which is the
 * cheapest possible reason someone returns to a link they got on WhatsApp.
 */

type Tool = {
  to: Route;
  label: string;
  body: string;
  icon: LucideIcon;
  /** Rendered as a small status pill when the visitor has used the tool. */
  status?: string;
};

export function ToolShelf() {
  const { vaultCount, quiz } = useApp();

  const tools: Tool[] = [
    {
      to: '/quiz',
      label: 'Readiness check',
      body: 'Five questions, two minutes, one honest score — plus the difficulty of AI project that actually fits where you are.',
      icon: Gauge,
      status: quiz ? `You scored ${quiz.score}/100` : undefined,
    },
    {
      to: '/vault',
      label: 'Idea Vault',
      body: 'Shortlist the ideas you like, add notes, then work the six-stage checklist for whichever one you pick.',
      icon: Archive,
      status: vaultCount ? `${vaultCount} idea${vaultCount === 1 ? '' : 's'} saved` : undefined,
    },
    {
      to: '/prompt-lab',
      label: 'Prompt Lab',
      body: 'Generates the exact build prompt for your project — role, task, output contract, constraints, guardrails. Copy, paste, build.',
      icon: FlaskConical,
    },
    {
      to: '/card',
      label: 'Card Studio',
      body: 'Turn your project into a share card with your name and a QR code. Download the PNG, post it, send the link.',
      icon: IdCard,
    },
  ];

  return (
    <Section id="tools" className="border-t border-line">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow={
            <>
              <IdCard className="h-3 w-3 text-brand-deep" />
              Free tools
            </>
          }
          title="Use these before the workshop."
          subtitle="Four small tools that work right now, without an account. They all end in the same place: a project you can actually build."
        />
        <NoteTag label="Works offline" />
      </div>

      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        {tools.map((t, i) => (
          <Reveal key={t.to} delay={i * 0.05}>
            <RouteLink
              to={t.to}
              onClick={() => track('cta_clicked', { location: 'home_tool_shelf', target: t.to })}
              className="group block h-full"
            >
              <Card className="card-hover flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface-2">
                    <t.icon className="h-4.5 w-4.5 text-brand-deep" />
                  </span>
                  {t.status ? (
                    <span className="rounded-full border border-brand-deep/30 bg-brand/[0.16] px-2.5 py-1 font-mono text-[10px] font-semibold text-brand-deep">
                      {t.status}
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-ink">{t.label}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-muted">{t.body}</p>

                <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-deep">
                  Open
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </Card>
            </RouteLink>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
