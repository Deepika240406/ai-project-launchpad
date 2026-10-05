import { useState } from 'react';
import { motion } from 'framer-motion';
import { BellRing, Check, Lock, Unlock, Users, WifiOff } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { api } from '../lib/api';
import { STRETCH_GOALS } from '../data/content';
import { ActivityTicker } from './ActivityTicker';
import { Countdown } from './Countdown';
import { Button, Card, Counter, DataSourceTag, ProgressBar, spotMouse } from './ui';
import { cn } from '../lib/utils';
import { track } from '../lib/analytics';

/**
 * LIVE REGISTRATION MOMENTUM
 * ------------------------------------------------------------------
 * Every number here is read from the registrations table. When the table is
 * empty the counter says 0 — that is the honest answer. When the database
 * cannot be reached the section says that and offers a retry, instead of
 * inventing activity.
 */
export function Momentum() {
  const {
    totalRegistrations,
    target,
    spotsLeft,
    progressPct,
    isLiveData,
    reconnect,
  } = useApp();
  const nf = (n: number) => n.toLocaleString('en-IN');

  return (
    <section className="relative py-14 sm:py-16">
      <div className="container-x">
        <Card className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            {/* left: the number */}
            <div className="relative p-6 sm:p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(204,255,77,0.40),transparent)]"
              />
              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="mono-label flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    We&apos;re building together
                  </p>
                  {isLiveData ? <DataSourceTag /> : null}
                </div>

                <div className="mt-5 flex items-end gap-3">
                  <span className="text-5xl font-semibold leading-none tracking-tightest text-ink sm:text-6xl">
                    <Counter value={totalRegistrations} />
                  </span>
                  <span className="pb-1 text-2xl font-semibold text-ink-faint sm:text-3xl">
                    / {target}
                  </span>
                </div>
                <p className="mt-2 text-[13px] text-ink-muted">final-year students registered</p>

                <div className="mt-6">
                  <ProgressBar value={progressPct} size="lg" />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <motion.span
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      className="inline-flex items-center gap-2 text-[13px] font-semibold text-ember"
                    >
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember" />
                      {spotsLeft} spots left
                    </motion.span>
                    <span className="font-mono text-[11px] text-ink-faint">
                      {progressPct.toFixed(1)}% to target
                    </span>
                  </div>
                </div>

                <p className="mt-5 max-w-md text-[12px] leading-relaxed text-ink-faint">
                  {isLiveData ? (
                    <>
                      Read live from the registrations table — {nf(totalRegistrations)} of {nf(target)} seats
                      taken. The counter updates for every visitor as soon as anybody registers.
                    </>
                  ) : (
                    <span className="inline-flex flex-wrap items-center gap-3">
                      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>
                        The campaign database could not be reached. The counter will show real
                        registrations as soon as the connection is back.
                      </span>
                      <Button size="sm" variant="outline" onClick={reconnect}>
                        Retry
                      </Button>
                    </span>
                  )}
                </p>
              </div>

              <div className="relative mt-6 border-t border-line pt-1">
                <ActivityTicker className="-mx-6 sm:-mx-8" />
              </div>
            </div>

            {/* right: countdown */}
            <div className="border-t border-line bg-surface-2 p-6 sm:p-8 lg:border-l lg:border-t-0">
              <Countdown />
              <div className="mt-6 space-y-3 border-t border-line pt-6">
                {[
                  { k: 'Format', v: 'Live online, 60 minutes' },
                  { k: 'Cost', v: 'Free — no card, no upsell' },
                  { k: 'You need', v: 'A laptop + internet' },
                  { k: 'You leave with', v: 'A deployed AI prototype' },
                ].map((row) => (
                  <div key={row.k} className="flex items-center justify-between gap-4 text-[13px]">
                    <span className="text-ink-faint">{row.k}</span>
                    <span className="text-right font-medium text-ink">{row.v}</span>
                  </div>
                ))}
              </div>

              <RemindMe />
            </div>
          </div>
        </Card>

        {/* ── cohort stretch goals: real unlocks, lit by the real seat count ── */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {STRETCH_GOALS.map((g, i) => {
            const unlocked = totalRegistrations >= g.at;
            return (
              <motion.div
                key={g.at}
                onMouseMove={spotMouse}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className={cn(
                  'spot rounded-2xl border p-4',
                  unlocked ? 'border-brand/60 bg-brand/[0.10]' : 'border-line bg-surface-2',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-ink">
                    <span aria-hidden className="mr-1.5">{g.emoji}</span>
                    {g.title}
                  </p>
                  {unlocked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      <Unlock className="h-3 w-3" aria-hidden />
                      Unlocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      <Lock className="h-3 w-3" aria-hidden />
                      {g.at - totalRegistrations} to go
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">{g.detail}</p>
                <p className="mt-2 font-mono text-[10px] text-ink-faint">unlocks at {g.at} seats</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** The soft commitment: an email now, a seat later — nothing is lost. */
function RemindMe() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setState('error');
      return;
    }
    setState('sending');
    const res = await api.sendReminder({ email: email.trim() });
    if (res && !(res as { error?: string }).error) {
      setState('done');
      track('remind_me_clicked', { duplicate: Boolean((res as { duplicate?: boolean }).duplicate) });
    } else {
      setState('error');
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <BellRing className="h-3.5 w-3.5 text-brand-deep" aria-hidden />
        Not ready to commit yet?
      </p>
      {state === 'done' ? (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-ink-muted">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-chart-green" aria-hidden />
          Noted — we will email you when the next cohort date is set. Your seat is not reserved, but your
          reminder is.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-2.5 flex flex-wrap gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Email for the reminder</span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state === 'error') setState('idle');
              }}
              placeholder="you@college.edu"
              className="w-full rounded-lg border border-line bg-surface-3 px-3 py-2 text-[12px] text-ink outline-none transition focus:border-brand"
            />
          </label>
          <button
            type="submit"
            disabled={state === 'sending'}
            className="rounded-lg border border-line bg-surface-3 px-3 py-2 text-[12px] font-semibold text-ink-muted transition hover:border-brand hover:text-ink"
          >
            {state === 'sending' ? 'Saving…' : 'Remind me'}
          </button>
          {state === 'error' ? (
            <p role="alert" className="w-full text-[11px] text-ember">
              Enter a valid email — that is where the reminder goes.
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
