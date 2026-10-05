import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { cn, clamp, copyText } from '../lib/utils';
import { useApp } from '../store/AppStore';

/* ============================== BUTTON ============================== */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'whatsapp' | 'outline' | 'ink';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const sizeCls =
    size === 'lg' ? 'px-7 py-4 text-[15px]' : size === 'sm' ? 'px-3.5 py-2 text-xs' : '';
  const variantCls =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'secondary'
        ? 'btn-secondary'
        : variant === 'ghost'
          ? 'btn-ghost'
          : variant === 'outline'
            ? 'border border-brand text-brand-deep hover:bg-brand/20 active:scale-[0.98]'
            : 'btn-whatsapp';

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn('btn', variantCls, sizeCls, className)}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-current border-t-transparent opacity-70',
        className ?? 'h-4 w-4',
      )}
    />
  );
}

/* ============================== SURFACES ============================== */

export function Card({
  className,
  children,
  as: As = 'div',
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { as?: React.ElementType }) {
  return (
    <As
      {...rest}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-line bg-card shadow-card backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'acid' | 'violet' | 'cy' | 'warn';
  className?: string;
}) {
  const tones = {
    neutral: 'border-line bg-surface-3 text-ink-muted',
    acid: 'border-brand/70 bg-brand/20 text-brand-deep',
    violet: 'border-violet/35 bg-violet/10 text-violet',
    cy: 'border-cyan/35 bg-cyan/10 text-cyan',
    warn: 'border-ember/40 bg-ember/10 text-ember',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Honest labelling of simulated content. Used everywhere demo data appears. */
/**
 * A small dashed chip for honest capability notes ("Runs in your browser",
 * "Rule-based scoring"). Nothing on the site is demo data any more, so this is
 * a neutral annotation, not a disclaimer.
 */
export function NoteTag({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-dashed border-line-strong bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint',
        className,
      )}
    >
      {label}
    </span>
  );
}

/**
 * BACKEND TAG — tells the truth about where the number on screen came from.
 *
 * "Live database" means a real API answered and these figures are shared across
 * every visitor. Without an answer the tag becomes a retry affordance — the UI
 * shows empty states, never invented numbers, so there is nothing else to label.
 */
export function DataSourceTag({ className }: { className?: string }) {
  const { mode, isLiveData, reconnect } = useApp();

  if (isLiveData) {
    return (
      <span
        title="Connected to the campaign database. These numbers are shared across every visitor."
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/[0.10] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-brand-deep',
          className,
        )}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
        </span>
        Live database
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={reconnect}
      title={
        mode === 'offline'
          ? 'The campaign database could not be reached. Click to retry.'
          : 'Checking for the campaign database…'
      }
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-dashed border-line-strong bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint transition hover:text-ink',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-ember" aria-hidden />
      {mode === 'unknown' ? 'Connecting…' : 'Offline — retry'}
    </button>
  );
}

/**
 * Cursor spotlight: feed this to any element with the `spot` class and a soft
 * radial glow follows the pointer across it. Coordinates land in --mx/--my.
 */
export function spotMouse<T extends HTMLElement>(e: React.MouseEvent<T>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

/* ============================== SECTION ============================== */

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
      <h2 className="title-lg max-w-3xl">{title}</h2>
      {subtitle ? (
        <p className="max-w-2xl text-[15px] leading-relaxed text-ink-muted sm:text-base">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function Section({
  id,
  children,
  className,
  bleed = false,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  bleed?: boolean;
}) {
  return (
    <section id={id} className={cn('relative scroll-mt-24 py-16 sm:py-20 lg:py-24', className)}>
      {bleed ? children : <div className="container-x">{children}</div>}
    </section>
  );
}

/* ============================== REVEAL ============================== */

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'li' | 'span';
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-70px' }}
      variants={revealVariants}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}

/* ============================== COUNTER ============================== */

export function Counter({
  value,
  duration = 1200,
  className,
  prefix = '',
  suffix = '',
  decimals = 0,
  /** delay start until scrolled into view */
  onView = true,
}: {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  onView?: boolean;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(onView && !reduce ? 0 : value);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!onView) started.current = true;
  }, [onView]);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const run = () => {
      const from = 0;
      const start = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        const t = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(from + (value - from) * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    };

    if (!onView || started.current) return run();

    const el = ref.current;
    if (!el) return;
    let cleanup: void | (() => void);
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          started.current = true;
          cleanup = run();
          obs.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cleanup?.();
    };
  }, [value, duration, onView, reduce]);

  const formatted = display.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/* ============================== EMPTY STATE ============================== */

/**
 * Every list in this product can be empty, and an empty list is the most
 * common place to lose a user. One primitive, always with a next action.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface-2/60 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl border border-line bg-card">
        <Icon className="h-5 w-5 text-ink-faint" />
      </span>
      <p className="mt-4 text-[14px] font-semibold text-ink">{title}</p>
      <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-ink-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ============================== PROGRESS ============================== */

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  label,
  showValue = false,
  size = 'md',
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const p = clamp((value / max) * 100, 0, 100);
  const h = size === 'lg' ? 'h-4' : size === 'sm' ? 'h-1.5' : 'h-2.5';
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          {label ? <span className="text-xs text-ink-muted">{label}</span> : <span />}
          {showValue ? (
            <span className="font-mono text-xs text-ink-muted tabular-nums">
              {Math.round(p)}%
            </span>
          ) : null}
        </div>
      )}
      <div
        className={cn('w-full overflow-hidden rounded-full bg-surface-4', h)}
        role="progressbar"
        aria-valuenow={Math.round(p)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <motion.div
          className={cn(
            'h-full rounded-full bg-gradient-to-r from-brand-deep to-brand-edge',
            barClassName,
          )}
          initial={{ width: 0 }}
          whileInView={{ width: `${p}%` }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

/* ============================== MODAL ============================== */

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  className,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  className?: string;
  size?: 'md' | 'lg';
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousActive = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();

  // Whoever opened the dialog gets focus back when it closes.
  const restoreFocus = useCallback(() => {
    const el = previousActive.current;
    if (el && document.contains(el)) el.focus({ preventScroll: true });
  }, []);

  // Scroll lock + focus handling + keyboard trap.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    // NOTE: this assignment is why fields inside a dialog must NOT use React's
    // `autoFocus` prop — that fires during commit and would make the dialog's
    // own first field look like "the element that opened the dialog".
    // Focus management belongs to the modal (see focusFirst below).
    previousActive.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;

      /* Prefer a real form control over any button. The dialog's own close
       * button sits first in the DOM, and focusing it means a keyboard user
       * lands on "Close" instead of the first field — and a stray space or
       * Enter while they think they are typing dismisses the whole dialog.
       * Buttons are only used as a fallback (e.g. an action-only dialog). */
      const target =
        panel.querySelector<HTMLElement>(
          '[data-autofocus], input:not([type="hidden"]), select, textarea',
        ) ?? panel.querySelector<HTMLElement>('button:not([disabled]), a[href]');

      target?.focus({ preventScroll: true });
    };
    const t = window.setTimeout(focusFirst, 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;

      /* Focus restore.
       * Removing a subtree that currently holds focus sends focus to <body>, so
       * restoring too early gets undone by the exit transition. We therefore
       * restore immediately (instant-close / reduced-motion path) and again once
       * the panel has genuinely left the DOM. A MutationObserver is used instead
       * of the animation library's exit callback so the behaviour does not
       * depend on how a given animation engine schedules its completion. */
      restoreFocus();

      const panel = panelRef.current;
      if (panel && document.contains(panel)) {
        const observer = new MutationObserver(() => {
          if (!document.contains(panel)) {
            observer.disconnect();
            restoreFocus();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window.setTimeout(() => observer.disconnect(), 2500);
      }
    };
  }, [open, onClose, restoreFocus]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        // The direct child of AnimatePresence must itself be a motion component,
        // otherwise the exit transition has nothing to bind to.
        <motion.div
          key="modal"
          className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-ink/45 backdrop-blur-md"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-10 max-h-[94dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-line bg-card shadow-pop backdrop-blur-2xl sm:rounded-3xl',
              size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
              className,
            )}
          >
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute right-4 top-4 z-20 rounded-lg border border-line bg-surface-3 p-1.5 text-ink-muted transition hover:bg-surface-4 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/* ============================== TOASTS ============================== */

export function Toaster() {
  const { toast, dismissToast } = useApp();
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-card p-4 shadow-pop backdrop-blur-xl"
            role="status"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full',
                  toast.variant === 'error'
                    ? 'bg-red-500/15 text-red-600'
                    : toast.variant === 'success'
                      ? 'bg-brand/25 text-brand-deep'
                      : toast.variant === 'info'
                        ? 'bg-cyan/15 text-cyan'
                        : 'bg-line text-ink',
                )}
              >
                {toast.variant === 'error' ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : toast.variant === 'success' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Info className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                    {toast.description}
                  </p>
                ) : null}
                {toast.action ? (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      dismissToast();
                    }}
                    className="mt-2.5 text-xs font-semibold text-brand-deep underline-offset-4 hover:underline"
                  >
                    {toast.action.label}
                  </button>
                ) : null}
              </div>
              <button
                onClick={dismissToast}
                aria-label="Dismiss notification"
                className="rounded-md p-1 text-ink-faint transition hover:bg-line hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-brand"
              initial={{ width: '100%' }}
              animate={{ width: 0 }}
              transition={{ duration: toast.action ? 7 : 4.2, ease: 'linear' }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

/* ============================== OPTION GROUP ============================== */

export interface Option<T extends string> {
  id: T;
  label: string;
  emoji?: string;
  blurb?: string;
}

/**
 * Radio-group built from buttons: keyboard navigable with arrow keys,
 * big tap targets for mobile (students arrive from WhatsApp on a phone).
 */
export function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
  name,
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
  name: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const cols = columns;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % options.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (index - 1 + options.length) % options.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = options.length - 1;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(options[index].id);
      return;
    }
    if (next >= 0) {
      e.preventDefault();
      refs.current[next]?.focus();
      onChange(options[next].id);
    }
    void cols;
  };

  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn(
        'grid gap-2.5',
        columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : columns === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1',
      )}
    >
      {options.map((opt, i) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active || (value === null && i === 0) ? 0 : -1}
            onClick={() => onChange(opt.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200',
              active
                ? 'border-brand bg-brand/[0.16] shadow-[0_0_0_1px_rgba(79,70,229,0.35)]'
                : 'border-line bg-surface-2 hover:border-line-strong hover:bg-surface-3',
            )}
          >
            {opt.emoji ? <span className="text-lg leading-none">{opt.emoji}</span> : null}
            <span className="min-w-0 flex-1">
              <span className={cn('block text-sm font-semibold', active ? 'text-ink' : 'text-ink/90')}>
                {opt.label}
              </span>
              {opt.blurb ? (
                <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{opt.blurb}</span>
              ) : null}
            </span>
            <span
              className={cn(
                'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition',
                active ? 'border-brand bg-brand' : 'border-line-strong',
              )}
              aria-hidden
            >
              {active ? <Check className="h-2.5 w-2.5 text-ink" strokeWidth={4} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================== ACCORDION ============================== */

export function Accordion({
  items,
  onToggle,
}: {
  items: { q: string; a: string }[];
  onToggle?: (q: string) => void;
}) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <h3>
              <button
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                id={`faq-btn-${i}`}
                onClick={() => {
                  const next = isOpen ? null : i;
                  setOpen(next);
                  if (next !== null) onToggle?.(item.q);
                }}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-surface-2"
              >
                <span className="text-sm font-medium text-ink sm:text-[15px]">{item.q}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-ink-muted"
                  aria-hidden
                >
                  <svg viewBox="0 0 12 12" className="h-3 w-3">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="content"
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-btn-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 pr-12 text-sm leading-relaxed text-ink-muted">{item.a}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* ============================== MISC ============================== */

export function StatPill({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'neutral' | 'acid' | 'cy';
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5">
      <p className="mono-label">{label}</p>
      <p
        className={cn(
          'mt-1 text-sm font-semibold tabular-nums',
          tone === 'acid' ? 'text-brand-deep' : tone === 'cy' ? 'text-cyan' : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function useIdSafe(prefix: string) {
  const id = useId();
  return useMemo(() => `${prefix}-${id.replace(/[:]/g, '')}`, [prefix, id]);
}

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
    return ok;
  }, []);
  return { copied, copy };
}
