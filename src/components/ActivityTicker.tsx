import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../store/AppStore';
import { cn } from '../lib/utils';

/**
 * Momentum band — real registrations only.
 *
 * The feed is rows from the registrations table (first name + college, nothing
 * else). When the database is empty the band says so; when the server cannot be
 * reached it says that instead. There is no fallback feed of invented names.
 */
export function ActivityTicker({ className }: { className?: string }) {
  const { liveActivity, isLiveData } = useApp();

  const items = useMemo(() => {
    const real = (liveActivity ?? []).map((a) => ({
      name: a.firstName,
      city: shortCollege(a.college),
    }));
    // Rendered twice so the marquee can loop seamlessly.
    return [...real, ...real];
  }, [liveActivity]);

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6">
        <p className="mono-label">Live activity</p>
        {isLiveData ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-chart-green" aria-hidden />
            Live database
          </span>
        ) : null}
      </div>

      {items.length ? (
        <div className="mask-fade-x mt-3 overflow-hidden py-2">
          <div className="flex w-max animate-marquee gap-3 pl-5 hover:[animation-play-state:paused] sm:pl-6">
            {items.map((item, i) => (
              <span
                key={`${item.name}-${i}`}
                aria-hidden={i >= items.length / 2}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs text-ink-muted"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-deep" />
                <span className="font-medium text-ink/90">{item.name}</span>
                <span className="text-ink-faint">from {item.city} just joined</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 px-5 pb-2 text-xs text-ink-faint sm:px-6">
          {isLiveData
            ? 'No registrations yet — the feed starts when the first students join.'
            : 'The live feed will appear here once the campaign database is reachable.'}
        </p>
      )}
    </div>
  );
}

/** The single "someone just joined" toast-style pulse used in the hero. */
export function LivePulse({ className }: { className?: string }) {
  const { liveActivity, isLiveData } = useApp();
  const [index, setIndex] = useState(0);

  const feed = useMemo(
    () => (liveActivity ?? []).map((a) => ({ name: a.firstName, city: shortCollege(a.college) })),
    [liveActivity],
  );

  useEffect(() => {
    if (!feed.length) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % feed.length), 4200);
    return () => window.clearInterval(id);
  }, [feed.length]);

  if (!isLiveData || !feed.length) return null;
  const item = feed[index % feed.length];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2.5 rounded-full border border-line bg-card py-1.5 pl-2 pr-3.5 backdrop-blur',
        className,
      )}
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute h-2 w-2 rounded-full bg-brand-deep animate-pulse-ring" aria-hidden />
        <span className="h-2 w-2 rounded-full bg-brand-deep" />
      </span>
      <motion.span
        key={item.name + index}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-xs text-ink-muted"
        aria-live="off"
      >
        <span className="font-medium text-ink">{item.name}</span> from {item.city} just joined
      </motion.span>
    </div>
  );
}

/**
 * A college name is too long for a chip and too formal for social proof, so it
 * is shortened the way a student would say it: "Sathyabama Institute of Science
 * & Technology" → "Sathyabama". Anything unrecognised falls back to the first
 * word rather than being hidden.
 */
function shortCollege(college: string) {
  const trimmed = (college ?? '').trim();
  if (!trimmed) return 'a college';
  const first = trimmed.split(/[\s,]+/)[0];
  return first.length > 2 ? first.replace(/[^A-Za-z&.]/g, '') : trimmed.slice(0, 18);
}
