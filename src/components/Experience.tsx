import { motion } from 'framer-motion';
import { Clock, Code2, FileDown, Github, LifeBuoy, MessageSquare, Rocket, Sparkles, Terminal } from 'lucide-react';
import { ROADMAP } from '../data/content';
import { useRegistration } from './RegistrationProvider';
import { Button, Reveal, Section, SectionHeading } from './ui';

/** 60-MINUTE EXPERIENCE — the timeline is the product. */
export function Roadmap() {
  const { openRegistration } = useRegistration();

  return (
    <Section id="how-it-works" className="border-t border-line">
      <SectionHeading
        eyebrow={
          <>
            <Clock className="h-3 w-3 text-brand-deep" />
            The 60 minutes, minute by minute
          </>
        }
        title="A build sequence, not a lecture."
        subtitle="Most workshops spend 50 minutes explaining and 10 minutes doing. This is the opposite: you are building from minute 20 and never stop."
      />

      <div className="relative mt-12">
        <div
          aria-hidden
          className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-brand-deep via-violet/50 to-transparent lg:left-0 lg:top-[59px] lg:h-px lg:w-full lg:bg-gradient-to-r"
        />
        <ol className="grid gap-8 lg:grid-cols-5 lg:gap-5">
          {ROADMAP.map((step, i) => (
            <motion.li
              key={step.time}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-70px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative pl-9 lg:pl-0 lg:pt-0"
            >
              <span
                aria-hidden
                className="absolute left-0 top-1 grid h-4 w-4 place-items-center rounded-full border border-brand bg-surface lg:top-[52px]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand-deep" />
              </span>

              <div className="lg:mb-[68px]">
                <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-brand-deep">
                  {step.time} MIN
                </span>
                <h3 className="mt-1.5 text-[15px] font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{step.detail}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>

      <Reveal>
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface-2 p-5">
          <p className="flex-1 text-[13px] text-ink-muted">
            <span className="font-semibold text-ink">The 60-minute rule:</span> if a step cannot be finished
            in its slot by a beginner, we cut it from the workshop. That is why every project ships with the
            code already written.
          </p>
          <Button onClick={() => openRegistration({ source: 'roadmap' })}>Reserve my free spot</Button>
        </div>
      </Reveal>
    </Section>
  );
}

const KIT = [
  {
    icon: Terminal,
    title: 'Live build-along',
    detail: 'You code at the same time, in the same file structure, with a fallback repo if you fall behind.',
  },
  {
    icon: Code2,
    title: 'Starter repo for your project',
    detail: 'Full working code for the project you picked — read it, run it, understand it, break it.',
  },
  {
    icon: Sparkles,
    title: 'Prompt library',
    detail: '20 reusable prompts for analysing, generating and structuring AI output.',
  },
  {
    icon: Rocket,
    title: 'Deployment walkthrough',
    detail: 'Push to GitHub and get a public URL others can actually open.',
  },
  {
    icon: LifeBuoy,
    title: '48-hour help thread',
    detail: 'Where you get unstuck after the session. Most people get stuck on day 2, not day 1.',
  },
  {
    icon: FileDown,
    title: 'Project write-up template',
    detail: 'The README + 3-line pitch structure that makes a project look senior.',
  },
];

/** WHAT'S INSIDE — reassurance for the "am I qualified for this" objection. */
export function Inside() {
  const { openRegistration } = useRegistration();

  return (
    <Section id="inside" className="border-t border-line">
      <SectionHeading
        eyebrow={
          <>
            <Github className="h-3 w-3 text-brand-deep" />
            What&apos;s inside
          </>
        }
        title="Everything you need is included. Nothing is assumed."
        subtitle="No prerequisites, no paid tools, no GPU. If you can open a browser and follow instructions, you can finish."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KIT.map((item, i) => (
          <Reveal key={item.title} delay={i * 0.05}>
            <div className="h-full rounded-2xl border border-line bg-card p-5 transition-colors hover:border-brand/70">
              <item.icon className="h-[18px] w-[18px] text-brand-deep" />
              <h3 className="mt-4 text-[15px] font-semibold text-ink">{item.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{item.detail}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-line bg-surface-2 p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <MessageSquare className="h-4 w-4 text-cyan" />
            Common worries, answered plainly
          </p>
          <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-ink-muted">
            <li>
              <span className="font-medium text-ink">“My code is weak.”</span> The session is built for
              students with basic Python or even none — you edit a working file instead of starting blank.
            </li>
            <li>
              <span className="font-medium text-ink">“I&apos;ll fall behind.”</span> Every step has a
              checkpoint file. You can rejoin at any minute mark.
            </li>
            <li>
              <span className="font-medium text-ink">“Is it a sales pitch?”</span> No. It is 60 minutes of
              building, and you leave with the repo either way.
            </li>
          </ul>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-brand/70 bg-gradient-to-br from-brand/[0.14] to-transparent p-6">
          <p className="mono-label text-brand-deep">Your commitment</p>
          <p className="mt-3 text-3xl font-semibold tracking-tightest text-ink">60 minutes</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            One sitting. One working project. That is the whole ask.
          </p>
          <Button className="mt-5 w-full" onClick={() => openRegistration({ source: 'inside' })}>
            Reserve my free spot
          </Button>
          <p className="mt-3 text-[11px] text-ink-faint">
            Free · 500 seats · Beginner friendly
          </p>
        </div>
      </div>
    </Section>
  );
}
