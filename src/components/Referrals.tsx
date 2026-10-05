import { motion } from 'framer-motion';
import { Check, Copy, Gift, Link2, Lock, Medal, Share2, TrendingUp, Users } from 'lucide-react';
import { MILESTONES } from '../data/content';
import { useApp } from '../store/AppStore';
import { useRegistration } from './RegistrationProvider';
import { SharePanel, ShareWithThree } from './SharePanel';
import { AmbassadorPoster } from './AmbassadorPoster';
import {
  Badge,
  Button,
  Card,
  Counter,
  DataSourceTag,
  ProgressBar,
  Section,
  SectionHeading,
  useCopy,
} from './ui';
import { cn, initials, referralLink, timeAgo } from '../lib/utils';
import { track } from '../lib/analytics';
import { getIcon } from './icons';

/**
 * REFERRAL ENGINE
 * ------------------------------------------------------------------
 * The loop: register → receive a personalised project + code → share to
 * WhatsApp → friends register → count rises → rank rises → share again.
 *
 * Two design decisions that make it work for students:
 *  1. The reward ladder starts at ONE referral (free, instantly earned).
 *  2. Rewards are digital and free to fulfil, so the loop stays profitable
 *     inside a ₹2,000 budget.
 */
export function Referrals() {
  const { student, referralCount, referrals, myRank, leaderboard, referralRegs, totalRegistrations, impact } =
    useApp();
  const { openRegistration } = useRegistration();
  const { copied, copy } = useCopy();
  const measuredImpact = impact && impact.visits > 0 ? impact : null;
  const nextMilestone = MILESTONES.find((m) => m.count > referralCount);
  const goal = nextMilestone?.count ?? MILESTONES[MILESTONES.length - 1].count;
  const link = student ? referralLink(student.code) : '';
  const totalLeaders = leaderboard.length;

  // The referral list is real: rows come from the students table via the
  // signed-in student's code. There is no simulator button — a referral counts
  // when a real person registers with the link.

  return (
    <Section id="referrals" className="border-t border-line">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          eyebrow={
            <>
              <Share2 className="h-3 w-3 text-brand-deep" />
              Referral engine
            </>
          }
          title="Invite classmates. Unlock elite perks."
          subtitle="Every registrant gets a code, a personalised project card and a one-tap WhatsApp message. The loop is the acquisition channel — it is why 500 is reachable without a paid ad budget."
        />
        <DataSourceTag className="self-start lg:self-end" />
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ------------------------------------------------- registered: dashboard */}
        {student ? (
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mono-label">Your referral code</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="font-mono text-2xl font-bold tracking-wider text-ink">
                    {student.code}
                  </span>
                  <button
                    onClick={async () => {
                      const ok = await copy(student.code);
                      if (ok) track('referral_link_copied', { code: student.code, kind: 'code' });
                    }}
                    aria-label="Copy referral code"
                    className="rounded-lg border border-line bg-surface-3 p-1.5 text-ink-muted transition hover:text-ink"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-brand-deep" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatBox label="Registrations" value={referralCount} tone="acid" />
                <StatBox label="Your rank" value={myRank ? `#${myRank}` : `#${totalLeaders}`} />
                <StatBox label="Link visits" value={impact?.visits ?? 0} />
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-end justify-between gap-3">
                <p className="text-[13px] text-ink-muted">
                  Progress to next reward:{' '}
                  <span className="font-semibold text-ink">
                    {referralCount} / {goal}
                  </span>
                </p>
                <span className="font-mono text-[11px] text-ink-faint">
                  {nextMilestone ? nextMilestone.label : 'All rewards unlocked'}
                </span>
              </div>
              <ProgressBar value={referralCount} max={goal} />
            </div>

            <div className="mt-5 rounded-xl border border-line bg-surface-2 p-3.5">
              <p className="mono-label">Your link</p>
              <p className="mt-1.5 break-all font-mono text-[11px] text-cyan">{link}</p>
              {measuredImpact ? (
                <p className="mt-2 border-t border-line pt-2 text-[11px] leading-relaxed text-ink-muted">
                  Your link has been opened{' '}
                  <span className="font-semibold text-ink">{measuredImpact.visits}×</span> and turned into{' '}
                  <span className="font-semibold text-ink">{measuredImpact.joined}</span> join
                  {measuredImpact.joined === 1 ? '' : 's'} — a{' '}
                  {((measuredImpact.joined / measuredImpact.visits) * 100).toFixed(0)}% conversion.{' '}
                  {measuredImpact.joined / measuredImpact.visits < 0.2
                    ? 'Try posting it where your classmates actually chat.'
                    : 'That is a working channel — keep it going.'}
                </p>
              ) : (
                <p className="mt-2 border-t border-line pt-2 text-[11px] leading-relaxed text-ink-faint">
                  Visits and joins through this link show up here — the funnel, measured.
                </p>
              )}
            </div>

            <div className="mt-5">
              <ShareWithThree code={student.code} />
            </div>

            {/* referral list */}
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-ink">
                  Who joined with your code ({referralCount})
                </p>
              </div>

              {referrals.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-line p-6 text-center">
                  <Users className="mx-auto h-5 w-5 text-ink-faint" />
                  <p className="mt-2.5 text-[13px] text-ink-muted">
                    Nobody yet. Your first referral is the hardest — start with the 3 friends who also have
                    final-year project stress.
                  </p>
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {referrals.map((r, i) => (
                    <motion.li
                      key={r.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.2) }}
                      className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-brand/70 bg-brand/20 font-mono text-[11px] font-bold text-brand-deep">
                        {initials(r.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">{r.name}</p>
                        <p className="truncate text-[11px] text-ink-faint">{r.college}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-ink-faint">
                        {timeAgo(r.joinedAt)}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        ) : (
          /* ------------------------------------------------- not registered: loop explainer */
          <Card className="p-6">
            <p className="mono-label">How the loop works</p>
            <h3 className="mt-2 text-lg font-semibold text-ink">
              Register once, and you get a link that keeps working.
            </h3>

            <ol className="mt-5 space-y-3">
              {[
                { icon: Medal, text: 'Register free — takes 40 seconds.' },
                { icon: Gift, text: 'Get a project matched to your interests + your own referral code.' },
                { icon: Link2, text: 'Share one pre-written WhatsApp message with friends.' },
                { icon: TrendingUp, text: 'Each friend who joins moves you up the Builder Wall.' },
              ].map((s, i) => (
                <li key={s.text} className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-line bg-surface-3 font-mono text-[11px] text-ink-muted">
                    {i + 1}
                  </span>
                  <div className="flex items-start gap-2 pt-1">
                    <s.icon className="mt-0.5 hidden h-3.5 w-3.5 shrink-0 text-brand-deep sm:block" />
                    <p className="text-[13px] leading-relaxed text-ink-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4">
              <p className="text-[12px] leading-relaxed text-ink-muted">
                <span className="font-semibold text-ink">Why this reaches 500:</span> one student bringing
                three friends quadruples every sharer. Referrals are the only channel on this page that
                compounds — and the only one that costs nothing per acquisition.
              </p>
            </div>

            <Button className="mt-5 w-full" onClick={() => openRegistration({ source: 'referrals_section' })}>
              Get my referral code
            </Button>
            <p className="mt-3 text-center text-[11px] text-ink-faint">
              Already registered? Open your dashboard above after registering.
            </p>
          </Card>
        )}

        {/* ------------------------------------------------------ milestone ladder */}
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="mono-label">Milestones</p>
            {student ? (
              <Badge tone="acid">
                {referralCount} referral{referralCount === 1 ? '' : 's'}
              </Badge>
            ) : (
              <Badge tone="neutral">Preview</Badge>
            )}
          </div>

          <ul className="mt-5 space-y-3">
            {MILESTONES.map((m, i) => {
              const unlocked = referralCount >= m.count;
              const Icon = getIcon(m.icon);
              return (
                <motion.li
                  key={m.count}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className={cn(
                    'relative flex items-start gap-3.5 rounded-xl border p-3.5 transition-colors',
                    unlocked
                      ? 'border-brand/70 bg-brand/[0.14]'
                      : 'border-line bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-xl border',
                      unlocked ? 'border-brand bg-brand/25' : 'border-line bg-surface-3',
                    )}
                  >
                    <Icon className={cn('h-4 w-4', unlocked ? 'text-brand-deep' : 'text-ink-faint')} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-mono text-[11px] font-bold',
                          unlocked ? 'text-brand-deep' : 'text-ink-faint',
                        )}
                      >
                        {m.count} {m.count === 1 ? 'friend' : 'friends'}
                      </span>
                      {unlocked ? (
                        <Check className="h-3 w-3 text-brand-deep" strokeWidth={3} />
                      ) : (
                        <Lock className="h-3 w-3 text-ink-faint" />
                      )}
                    </div>
                    <p className="mt-1 text-[13px] font-semibold text-ink">{m.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{m.detail}</p>
                  </div>
                </motion.li>
              );
            })}
          </ul>

          <div className="mt-5 rounded-xl border border-line bg-surface-2 p-4">
            <p className="text-[12px] leading-relaxed text-ink-muted">
              <span className="font-semibold text-ink">Cost per reward: ₹0.</span> Every milestone is
              digital — templates, priority in a Q&amp;A queue, a place on the wall. Campaign budget goes to
              distribution and ambassadors, never to prizes.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-surface-2 px-3.5 py-3">
              <p className="mono-label">Referral registrations</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                <Counter value={referralRegs} />
              </p>
              <p className="mt-0.5 text-[10px] text-ink-faint">
                Measured{totalRegistrations ? ` · ${((referralRegs / totalRegistrations) * 100).toFixed(1)}% of the campaign` : ''}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface-2 px-3.5 py-3">
              <p className="mono-label">Cost per referral</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-brand-deep">₹0</p>
              <p className="mt-0.5 text-[10px] text-ink-faint">
                Every reward is digital
              </p>
            </div>
          </div>

          {student ? (
            <div className="mt-5 space-y-4">
              <AmbassadorPoster
                code={student.code}
                name={student.name}
                college={student.college}
                projectId={student.recommendedProjectId}
              />
              <SharePanel code={student.code} />
            </div>
          ) : null}
        </Card>
      </div>
    </Section>
  );
}

function StatBox({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'neutral' | 'acid';
}) {
  return (
    <div className="min-w-[92px] rounded-xl border border-line bg-surface-2 px-3.5 py-2.5">
      <p className="mono-label">{label}</p>
      <p
        className={cn(
          'mt-1 text-lg font-semibold tabular-nums',
          tone === 'acid' ? 'text-brand-deep' : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}
