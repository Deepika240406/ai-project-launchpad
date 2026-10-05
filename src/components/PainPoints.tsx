import { motion } from 'framer-motion';
import { ArrowDown, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { OUTCOMES, PAIN_POINTS } from '../data/content';
import { useRegistration } from './RegistrationProvider';
import { Reveal, Section, SectionHeading } from './ui';

/**
 * PAIN → TRANSFORMATION
 * The section that answers "why should I care" in the student's own language.
 * No generic benefits: every line is something a final-year student has said.
 */
export function PainPoints() {
  const { openRegistration } = useRegistration();

  return (
    <Section id="why" className="border-t border-line">
      <SectionHeading
        eyebrow="Why this exists"
        title={
          <>
            Final year is coming.
            <br />
            <span className="text-ink-muted">Your GitHub is still empty.</span>
          </>
        }
        subtitle="Four things we hear from almost every final-year student. If any of these is you, this workshop was built for you."
      />

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {PAIN_POINTS.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.06}>
            <div className="group h-full rounded-2xl border border-line bg-card p-5 transition-colors hover:border-line">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-ember" />
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">“{p.title}”</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{p.detail}</p>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* -------------------------------------------------- transformation rail */}
      <div className="mt-14 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <Reveal>
          <div className="h-full rounded-2xl border border-line bg-surface-2 p-6">
            <p className="mono-label">Today</p>
            <ul className="mt-4 space-y-3">
              {['Tutorials', 'Confusion', 'Blank GitHub', 'Project anxiety'].map((t) => (
                <li key={t} className="flex items-center gap-3 text-[15px] text-ink-muted">
                  <span className="h-6 w-px bg-line" />
                  <span className="text-ink-faint line-through decoration-line-strong">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <div className="flex items-center justify-center lg:px-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid h-12 w-12 place-items-center rounded-full border border-brand/70 bg-brand/20"
          >
            <ArrowRight className="hidden h-5 w-5 text-brand-deep lg:block" />
            <ArrowDown className="h-5 w-5 text-brand-deep lg:hidden" />
          </motion.div>
        </div>

        <Reveal delay={0.1}>
          <div className="relative h-full overflow-hidden rounded-2xl border border-brand/70 bg-gradient-to-br from-brand/[0.14] via-transparent to-violet/[0.08] p-6">
            <p className="mono-label text-brand-deep">In 60 minutes</p>
            <ul className="mt-4 space-y-3">
              {['A working prototype', 'A portfolio project', 'A GitHub repo', 'AI experience', 'An interview talking point'].map(
                (t) => (
                  <li key={t} className="flex items-center gap-3 text-[15px] font-medium text-ink">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-deep" />
                    {t}
                  </li>
                ),
              )}
            </ul>
          </div>
        </Reveal>
      </div>

      {/* -------------------------------------------------- expected outcomes */}
      <div className="mt-14 rounded-2xl border border-line bg-surface-2 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink">What students will leave with</h3>
          <span className="chip border-dashed">Expected outcome — not a testimonial</span>
        </div>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
          We are not quoting students, because this workshop has not run yet. These are the five things the
          session is designed to produce.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {OUTCOMES.map((o, i) => (
            <motion.div
              key={o.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="rounded-xl border border-line bg-card p-4"
            >
              <CheckCircle2 className="h-4 w-4 text-brand-deep" />
              <p className="mt-3 text-[13px] font-semibold text-ink">{o.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{o.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <Reveal delay={0.1}>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            onClick={() => openRegistration({ source: 'pain_points' })}
            className="text-sm font-semibold text-brand-deep underline-offset-4 hover:underline"
          >
            Stop watching. Start building →
          </button>
          <span className="text-[12px] text-ink-faint">
            Takes 40 seconds to register · 60 minutes to finish your first build
          </span>
        </div>
      </Reveal>
    </Section>
  );
}
