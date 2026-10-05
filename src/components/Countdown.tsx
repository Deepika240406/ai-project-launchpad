import { useEffect, useRef, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { cn, countdownParts, two } from '../lib/utils';
import { track } from '../lib/analytics';
import { useApp } from '../store/AppStore';

/**
 * Countdown to the real workshop date.
 *
 * The date comes from the server catalogue (WORKSHOP_DATE env var) and is
 * printed in full next to the timer — a countdown with no date attached is
 * scarcity theatre; a countdown to a date you can read is information. If the
 * date has passed, the block honestly says the next cohort is being scheduled
 * instead of freezing at 00:00.
 */
export function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return { ...countdownParts(target.getTime() - now), total: Math.max(0, target.getTime() - now) };
}

export function Countdown({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { workshopDate } = useApp();
  const target = useRef(new Date(workshopDate)).current;
  const passed = target.getTime() <= Date.now();
  const { days, hours, minutes, seconds, total } = useCountdown(target);
  const [fired, setFired] = useState(false);

  useEffect(() => {
    if (!fired) {
      track('countdown_viewed', { hoursLeft: Math.round(total / 36e5) });
      setFired(true);
    }
  }, [fired, total]);

  const cells = [
    { label: 'Days', value: days },
    { label: 'Hours', value: hours },
    { label: 'Minutes', value: minutes },
    { label: 'Seconds', value: seconds },
  ];

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="mono-label flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5" />
          {passed ? 'Workshop schedule' : 'Workshop starts in'}
        </p>
      </div>

      {passed ? (
        <p className="rounded-xl border border-line bg-surface-2 p-4 text-sm text-ink-muted">
          The last cohort date has passed — the next session is being scheduled. Register and you
          will be first to hear the date.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-live="off">
          {cells.map((c) => (
            <div
              key={c.label}
              className={cn(
                'relative overflow-hidden rounded-xl border border-line bg-gradient-to-b from-surface-3 to-transparent text-center',
                compact ? 'px-1 py-2' : 'px-2 py-3 sm:py-4',
              )}
            >
              <span
                className={cn(
                  'block font-mono font-semibold tabular-nums text-ink',
                  compact ? 'text-lg' : 'text-2xl sm:text-3xl',
                )}
              >
                {two(c.value)}
              </span>
              <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                {c.label}
              </span>
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-muted">
        Live online ·{' '}
        <time dateTime={target.toISOString()}>
          {target.toLocaleString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </time>{' '}
        IST
      </p>
    </div>
  );
}
