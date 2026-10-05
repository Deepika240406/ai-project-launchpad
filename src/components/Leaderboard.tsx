import { motion } from 'framer-motion';
import { Building2, Crown, Flame, GraduationCap, Trophy, Users } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { Card, DataSourceTag, NoteTag, Reveal, Section, SectionHeading } from './ui';
import { cn, initials } from '../lib/utils';
import { track } from '../lib/analytics';
import { useEffect, useMemo } from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];

export function Leaderboard() {
  const { leaderboard, myRank, referralCount, student, liveLeaderboard, collegeScoreboard, classScoreboard, isLiveData } =
    useApp();

  /**
   * One source of truth: the store builds the board from the real referrer
   * query and appends the signed-in student's own row. Re-deriving it here
   * would be a second opinion about the same numbers.
   */
  const rows = leaderboard;

  /** College competition — a real GROUP BY over registrations. Empty is honest. */
  const colleges = useMemo(() => collegeScoreboard ?? [], [collegeScoreboard]);

  useEffect(() => {
    track('leaderboard_viewed', { rank: myRank, referrals: referralCount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const top = rows.slice(0, 8);
  const you = rows.find((b) => b.isYou);
  const youInTop = Boolean(you && you.rank <= 8);
  const ahead = you ? rows.find((b) => b.rank === you.rank - 1) : undefined;
  const toNextRank = ahead && you ? ahead.referrals - you.referrals + 1 : 0;

  return (
    <Section id="leaderboard" className="border-t border-line">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          eyebrow={
            <>
              <Trophy className="h-3 w-3 text-brand-deep" />
              Builder wall
            </>
          }
          title="Top builders this week"
          subtitle="Ranked by friends who actually joined. Status is the incentive — it costs nothing and students care about it more than vouchers."
        />
        <DataSourceTag className="self-start lg:self-end" />
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        {/* ------------------------------------------------------------- ranking */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <p className="mono-label flex items-center gap-2">
              <Flame className="h-3.5 w-3.5 text-ember" />
              Leaderboard
            </p>
            <span className="text-[11px] text-ink-faint">
              {isLiveData
                ? rows.length
                  ? 'Sorted by referrals · live from the database'
                  : 'Waiting for the first referrals'
                : 'Database unreachable'}
            </span>
          </div>

          {top.length ? (
          <ul className="divide-y divide-line">
            {top.map((b, i) => (
              <motion.li
                key={b.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3) }}
                className={cn(
                  'flex items-center gap-3.5 px-5 py-3.5 transition-colors',
                  b.isYou ? 'bg-brand/[0.14]' : 'hover:bg-surface-2',
                )}
              >
                <span
                  className={cn(
                    'w-7 shrink-0 text-center font-mono text-[13px] font-bold',
                    b.rank <= 3 ? 'text-ink' : 'text-ink-faint',
                  )}
                >
                  {MEDALS[b.rank - 1] ?? `#${b.rank}`}
                </span>

                <span
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full border font-mono text-[11px] font-bold',
                    b.isYou
                      ? 'border-brand bg-brand/25 text-brand-deep'
                      : 'border-line bg-surface-3 text-ink-muted',
                  )}
                >
                  {initials(b.name)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-[13px] font-semibold text-ink">
                    {b.name}
                    {b.isYou ? (
                      <span className="rounded-md border border-brand bg-brand/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-deep">
                        You
                      </span>
                    ) : null}
                    {b.rank === 1 ? <Crown className="h-3.5 w-3.5 text-brand-deep" /> : null}
                  </p>
                  <p className="truncate text-[11px] text-ink-faint">{b.college}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-mono text-[13px] font-bold tabular-nums text-ink">
                    {b.referrals}
                  </p>
                  <p className="text-[10px] text-ink-faint">referrals</p>
                </div>
              </motion.li>
            ))}

            {you && !youInTop ? (
              <>
                <li className="flex items-center justify-center gap-2 py-2 text-ink-faint">
                  <span className="h-px w-8 bg-line" />
                  <span className="text-[11px]">· · ·</span>
                  <span className="h-px w-8 bg-line" />
                </li>
                <li className="flex items-center gap-3.5 bg-brand/[0.14] px-5 py-3.5">
                  <span className="w-7 shrink-0 text-center font-mono text-[13px] font-bold text-ink-faint">
                    #{you.rank}
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brand bg-brand/25 font-mono text-[11px] font-bold text-brand-deep">
                    {initials(you.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-[13px] font-semibold text-ink">
                      {you.name}
                      <span className="rounded-md border border-brand bg-brand/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-deep">
                        You
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-ink-faint">{you.college}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[13px] font-bold tabular-nums text-ink">
                      {you.referrals}
                    </p>
                    <p className="text-[10px] text-ink-faint">referrals</p>
                  </div>
                </li>
              </>
            ) : null}
          </ul>
          ) : (
            <p className="px-5 py-8 text-center text-[13px] leading-relaxed text-ink-muted">
              {isLiveData
                ? 'The wall is empty — the first registration takes #1. Referring a friend is how you stay there.'
                : 'The campaign database is unreachable, so the wall stays empty instead of showing invented names.'}
            </p>
          )}

          <div className="border-t border-line px-5 py-4">
            {student ? (
              <p className="text-[12px] leading-relaxed text-ink-muted">
                {toNextRank > 0 ? (
                  <>
                    <span className="font-semibold text-ink">
                      {toNextRank} more referral{toNextRank === 1 ? '' : 's'}
                    </span>{' '}
                    and you pass {ahead?.name ?? 'the next builder'} to take #{you ? you.rank - 1 : 1}.
                  </>
                ) : (
                  <>You are ranked #{you?.rank} with {referralCount} referrals. Keep sharing to hold the spot.</>
                )}
              </p>
            ) : (
              <p className="text-[12px] leading-relaxed text-ink-muted">
                Register to enter the wall — your own row appears here as soon as your code lands. Rewards start
                at a single referral.
              </p>
            )}
          </div>
        </Card>

        {/* -------------------------------------------------- college scoreboard */}
        <div className="space-y-5">
          <Card className="p-5">
            <p className="mono-label flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-cyan" />
              College scoreboard
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              Ambassadors are given a countable target: “get 20 registrations from your college”. Colleges
              compete, and each campus becomes its own mini-channel.
            </p>

            {colleges.length ? (
            <ul className="mt-5 space-y-3">
              {colleges.map((c, i) => {
                // Scaled against the real leader so the bars stay comparable
                // whether this is a live GROUP BY or the seeded table.
                const max = Math.max(1, colleges[0].referrals);
                return (
                  <li key={c.college}>
                    <div className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="truncate text-ink-muted">
                        <span className="mr-1.5 font-mono text-ink-faint">{i + 1}.</span>
                        {c.college}
                      </span>
                      <span className="shrink-0 font-mono font-semibold text-ink">{c.referrals}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-cyan to-violet"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(c.referrals / max) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: i * 0.07 }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            ) : (
              <p className="mt-5 text-[12px] leading-relaxed text-ink-faint">
                Campus standings appear as soon as students register with their college.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <p className="mono-label flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 text-violet" />
              Class challenge
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              Branch-versus-branch, campus-versus-campus. Bring your class — the board counts every
              student who registers with their real college and branch.
            </p>
            {(classScoreboard ?? []).length ? (
              <ul className="mt-4 space-y-2.5">
                {(classScoreboard ?? []).slice(0, 6).map((c, i) => (
                  <li key={`${c.college}-${c.branch}`} className="flex items-center gap-3">
                    <span className="w-6 shrink-0 font-mono text-[11px] font-bold text-ink-faint">
                      #{i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-ink">
                        {c.branch} · {c.college}
                      </p>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-violet to-cyan"
                          initial={{ width: 0 }}
                          whileInView={{
                            width: `${(c.students / Math.max(1, ...(classScoreboard ?? []).map((x) => x.students))) * 100}%`,
                          }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[12px] font-bold text-ink">
                      {c.students}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-line px-3.5 py-5 text-center text-[12px] leading-relaxed text-ink-muted">
                No class has claimed the board yet. Register with your college and branch — your class
                could be the first name here.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <p className="mono-label flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-brand-deep" />
              Why a leaderboard, not a discount
            </p>
            <ul className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-ink-muted">
              <li>
                <span className="font-semibold text-ink">Zero cost.</span> Ranked status fulfils the reward
                with no cash out.
              </li>
              <li>
                <span className="font-semibold text-ink">Repeated sharing.</span> One share is a one-off;
                chasing a rank keeps students sending for 7 days.
              </li>
              <li>
                <span className="font-semibold text-ink">Public proof.</span> A visible wall makes the
                workshop look like a movement, not a webinar.
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <Reveal>
        <p className="mt-5 text-[11px] leading-relaxed text-ink-faint">
          {isLiveData ? (
            <>
              Every row above is a real registration read from the campaign database, ranked by the friends who
              actually joined with their code.
            </>
          ) : (
            <>
              The campaign database is unreachable right now. The wall shows nothing rather than invented
              names — retry the connection and real rows appear here.
            </>
          )}
        </p>
      </Reveal>
    </Section>
  );
}
