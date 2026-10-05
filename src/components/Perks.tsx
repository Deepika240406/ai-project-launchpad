import { motion } from 'framer-motion';
import { Gift, Users } from 'lucide-react';
import { MILESTONES } from '../data/content';
import { useApp } from '../store/AppStore';
import { Section, spotMouse } from './ui';
import { getIcon } from './icons';
import { cn } from '../lib/utils';

/**
 * INVITE CLASSMATES. UNLOCK ELITE PERKS.
 * ------------------------------------------------------------------
 * The reward ladder, presented the way it deserves: three cards, three clear
 * asks, real perks. A student should be able to point at card two and say
 * "I want that" in under a second — that is the whole design brief.
 *
 * If the student is registered, the cards know: unlocked tiers light up from
 * their real referral count.
 */
export function Perks() {
  const { isRegistered, referralCount } = useApp();

  return (
    <Section className="border-t border-line">
      <div className="flex flex-col items-center text-center">
        <span className="eyebrow">
          <Gift className="h-3 w-3 text-violet" />
          Viral Peer Referral Rewards
        </span>
        <h2 className="title-lg mt-4 max-w-3xl text-balance">
          Invite Classmates.{' '}
          <span className="bg-gradient-to-r from-brand-deep to-violet bg-clip-text text-transparent">
            Unlock Elite Perks.
          </span>
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          Learning with your peers is more effective together. When you refer your batchmates to this free
          workshop, both of you walk away with career-accelerating benefits.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MILESTONES.map((m, i) => {
          const Icon = getIcon(m.icon);
          const unlocked = isRegistered && referralCount >= m.count;
          return (
            <motion.div
              key={m.count}
              onMouseMove={spotMouse}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className={cn(
                'spot card-hover flex h-full flex-col rounded-2xl border bg-card p-5 sm:p-6',
                unlocked ? 'border-violet/60 bg-violet/[0.05]' : 'border-line',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-violet/30 bg-violet/10">
                  <Icon className="h-4.5 w-4.5 text-violet" />
                </span>
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-bold',
                    unlocked
                      ? 'border-violet/50 bg-violet/15 text-violet'
                      : 'border-violet/30 bg-violet/[0.07] text-violet',
                  )}
                >
                  {unlocked ? '✓ Unlocked' : `${m.count} ${m.count === 1 ? 'Classmate' : 'Classmates'}`}
                </span>
              </div>

              <h3 className="mt-5 text-[16px] font-semibold leading-snug tracking-tight text-ink">
                {m.label}
              </h3>
              <p className="mt-2.5 flex-1 text-[12.5px] leading-relaxed text-ink-muted">{m.detail}</p>

              <div className="mt-5 flex items-center justify-between border-t border-line pt-3.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-faint">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  Milestone Goal
                </span>
                <span className="font-mono text-[11.5px] font-bold text-violet">
                  {m.count} {m.count === 1 ? 'Registration' : 'Registrations'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-ink-faint">
        Rewards stack — the more classmates you bring, the more you unlock. All digital, all free to earn.
      </p>
    </Section>
  );
}
