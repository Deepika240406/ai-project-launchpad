import { HelpCircle } from 'lucide-react';
import { FAQ } from '../data/content';
import { useRegistration } from './RegistrationProvider';
import { Accordion, Button, Reveal, Section, SectionHeading } from './ui';
import { track } from '../lib/analytics';

export function Faq() {
  const { openRegistration } = useRegistration();

  return (
    <Section id="faq" className="border-t border-line">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div>
          <SectionHeading
            eyebrow={
              <>
                <HelpCircle className="h-3 w-3 text-brand-deep" />
                Straight answers
              </>
            }
            title="The questions that stop people registering."
            subtitle="Every one of these came up while designing the funnel. If yours is missing, the honest answer is: it is still free, and you still leave with a project."
          />

          <Reveal>
            <div className="mt-8 rounded-2xl border border-brand/70 bg-brand/[0.12] p-5">
              <p className="text-[13px] font-semibold text-ink">Still unsure?</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
                Register first, decide later. It costs nothing, and the project idea is yours to keep even if you
                cannot attend live.
              </p>
              <Button className="mt-4 w-full" onClick={() => openRegistration({ source: 'faq' })}>
                Reserve my free spot
              </Button>
            </div>
          </Reveal>
        </div>

        <Accordion
          items={FAQ}
          onToggle={(q) => track('faq_opened', { question: q.slice(0, 60) })}
        />
      </div>
    </Section>
  );
}
