import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useRegistration } from './RegistrationProvider';
import { Button, Counter } from './ui';
import { Countdown } from './Countdown';
import { cn } from '../lib/utils';
import { track } from '../lib/analytics';

export function FinalCta() {
  const { totalRegistrations, target, spotsLeft, isRegistered, student } = useApp();
  const { openRegistration } = useRegistration();

  return (
    <section id="register" className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[32rem] w-[64rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(204,255,77,0.40),transparent)]" />
      </div>

      <div className="container-x">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border border-line bg-card p-7 shadow-pop backdrop-blur-xl sm:p-10 lg:p-12"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(91,61,245,0.12),transparent)]"
          />

          <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <span className="eyebrow">
                <ShieldCheck className="h-3 w-3 text-brand-deep" />
                {isRegistered ? 'You are registered' : 'Last call for this cohort'}
              </span>

              <h2 className="title-lg mt-5">
                Your first AI project
                <br />
                <span className="gradient-text">doesn&apos;t need to be complicated.</span>
              </h2>

              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-muted sm:text-base">
                {isRegistered ? (
                  <>
                    You&apos;re set, {student?.code ? `code ${student.code}` : 'builder'}. Bring a friend —
                    they get the same project match, and you both move up the Builder Wall.
                  </>
                ) : (
                  <>
                    Bring your idea. We&apos;ll help you build it. Sixty minutes, one working prototype, and a
                    project you can explain to any interviewer.
                  </>
                )}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  onClick={() => {
                    track('cta_clicked', { location: 'final_cta' });
                    openRegistration({ source: 'final_cta' });
                  }}
                  className="group"
                >
                  <span aria-hidden>🚀</span>
                  {isRegistered ? 'Open my referral dashboard' : 'Reserve my free spot'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
                <p className="text-[12px] text-ink-faint">
                  Free · No card · {spotsLeft} spots left of {target}
                </p>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-ink-muted">
                <span>
                  <Counter value={totalRegistrations} className="font-semibold text-ink" /> students
                  registered
                </span>
                <span className="h-1 w-1 rounded-full bg-line-strong" />
                <span>Beginner friendly</span>
                <span className="h-1 w-1 rounded-full bg-line-strong" />
                <span>60 minutes, one sitting</span>
              </div>
            </div>

            <div className={cn('rounded-2xl border border-line bg-surface-2 p-5 sm:p-6')}>
              <Countdown />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
