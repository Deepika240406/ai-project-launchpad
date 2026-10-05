import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect as useEffectRaw, useRef } from 'react';
import {
  Archive,
  ArrowRight,
  ChevronDown,
  FlaskConical,
  Gauge,
  IdCard,
  LayoutDashboard,
  Menu,
  Sparkles,
  X,
} from 'lucide-react';
import { cn, nf } from '../lib/utils';
import { useApp } from '../store/AppStore';
import { track } from '../lib/analytics';
import { Button } from './ui';
import { RouteLink, useRoute, type Route } from '../lib/router';

/**
 * Real site navigation: every item is a page, not a section anchor.
 * Active state is derived from the route, and the seat counter doubles as the
 * last remaining piece of urgency at the top of every page.
 */
const LINKS: { label: string; to: Route }[] = [
  { label: 'Home', to: '/' },
  { label: 'Workshop', to: '/workshop' },
  { label: 'Projects', to: '/projects' },
  { label: 'Leaderboard', to: '/leaderboard' },
];

const SECONDARY: { label: string; to: Route; detail: string }[] = [
  { label: 'Growth plan', to: '/strategy', detail: 'The 500-registration model, budget and AI notes' },
  { label: 'Dashboard', to: '/admin', detail: 'Live campaign read and event stream' },
];

/**
 * Four self-serve tools live under one menu rather than four more top-level
 * links — the primary nav stays about the workshop, and the tools are there for
 * anyone who wants to go deeper. Each is a real page.
 */
const TOOLS: { label: string; to: Route; detail: string; icon: React.ElementType }[] = [
  {
    label: 'Card Studio',
    to: '/card',
    detail: 'Make a shareable project card with a QR code',
    icon: IdCard,
  },
  {
    label: 'Idea Vault',
    to: '/vault',
    detail: 'Shortlist ideas + the six-stage build checklist',
    icon: Archive,
  },
  {
    label: 'Readiness check',
    to: '/quiz',
    detail: 'Five questions, one score, a matched project',
    icon: Gauge,
  },
  {
    label: 'Prompt Lab',
    to: '/prompt-lab',
    detail: 'Generate the build prompt for your project',
    icon: FlaskConical,
  },
];

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative grid h-8 w-8 place-items-center rounded-xl border border-brand bg-brand/[0.14]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            d="M6 18V6l12 12V6"
            fill="none"
            stroke="#4F46E5"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[13px] font-semibold tracking-tight text-ink">AI Project Launchpad</span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
          by NxtWave
        </span>
      </span>
    </span>
  );
}

export function Navbar({ onRegister }: { onRegister: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { totalRegistrations, target, isRegistered } = useApp();
  const route = useRoute();
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement | null>(null);

  useEffectRaw(() => {
    if (!toolsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!toolsRef.current?.contains(e.target as Node)) setToolsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setToolsOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [toolsOpen]);

  // Close the tools menu on navigation.
  useEffectRaw(() => setToolsOpen(false), [route]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile drawer whenever the page changes.
  useEffect(() => setOpen(false), [route]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const isActive = (to: Route) => (to === '/' ? route === '/' || route === '/join' : route === to);
  const toolsActive = TOOLS.some((t) => t.to === route);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-line bg-surface/85 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <nav className="container-x flex h-16 items-center justify-between gap-4 sm:h-[68px]">
          <RouteLink to="/" aria-label="AI Project Launchpad — home" className="shrink-0 rounded-lg">
            <Logo />
          </RouteLink>

          <div className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <RouteLink
                key={l.to}
                to={l.to}
                aria-current={isActive(l.to) ? 'page' : undefined}
                onClick={() => track('cta_clicked', { location: 'navbar', target: l.to })}
                className={cn(
                  'rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                  isActive(l.to)
                    ? 'bg-surface-3 text-ink'
                    : 'text-ink-muted hover:bg-surface-3 hover:text-ink',
                )}
              >
                {l.label}
              </RouteLink>
            ))}
            <div ref={toolsRef} className="relative">
              <button
                type="button"
                onClick={() => setToolsOpen((v) => !v)}
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                aria-controls="tools-menu"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                  toolsActive || toolsOpen
                    ? 'bg-surface-3 text-ink'
                    : 'text-ink-muted hover:bg-surface-3 hover:text-ink',
                )}
              >
                Free tools
                <ChevronDown
                  className={cn('h-3.5 w-3.5 transition-transform duration-200', toolsOpen && 'rotate-180')}
                />
              </button>

              <AnimatePresence>
                {toolsOpen ? (
                  <motion.div
                    id="tools-menu"
                    role="menu"
                    aria-label="Free tools"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute left-0 top-[calc(100%+8px)] w-[300px] overflow-hidden rounded-2xl border border-line bg-card p-1.5 shadow-pop"
                  >
                    {TOOLS.map((t) => (
                      <RouteLink
                        key={t.to}
                        to={t.to}
                        role="menuitem"
                        className={cn(
                          'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
                          isActive(t.to) ? 'bg-brand/[0.16]' : 'hover:bg-surface-2',
                        )}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2">
                          <t.icon className="h-3.5 w-3.5 text-brand-deep" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-semibold text-ink">{t.label}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">
                            {t.detail}
                          </span>
                        </span>
                      </RouteLink>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <span aria-hidden className="mx-1 h-4 w-px bg-line" />
            {SECONDARY.map((l) => (
              <RouteLink
                key={l.to}
                to={l.to}
                title={l.detail}
                className={cn(
                  'rounded-lg px-3 py-2 text-[12px] font-medium transition-colors',
                  isActive(l.to) ? 'bg-surface-3 text-ink' : 'text-ink-faint hover:text-ink-muted',
                )}
              >
                {l.label}
              </RouteLink>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-line bg-surface-3 px-3 py-1.5 xl:inline-flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-deep" />
              </span>
              <span className="font-mono text-[11px] tabular-nums text-ink-muted">
                {nf(totalRegistrations)}/{target}
              </span>
            </span>
            <Button
              onClick={onRegister}
              size="sm"
              className="hidden sm:inline-flex"
              aria-label="Register free for the workshop"
            >
              {isRegistered ? 'You’re registered' : 'Register Free'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface-3 text-ink lg:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open ? (
            <motion.div
              id="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-line bg-surface/85 backdrop-blur-xl lg:hidden"
            >
              <div className="container-x flex flex-col gap-1 py-4">
                {LINKS.map((l) => (
                  <RouteLink
                    key={l.to}
                    to={l.to}
                    aria-current={isActive(l.to) ? 'page' : undefined}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition',
                      isActive(l.to)
                        ? 'bg-surface-3 text-ink'
                        : 'text-ink-muted hover:bg-surface-3 hover:text-ink',
                    )}
                  >
                    {l.label}
                    <ArrowRight className="h-3.5 w-3.5 opacity-40" />
                  </RouteLink>
                ))}

                <div className="my-2 h-px bg-surface-4" />
                <p className="mono-label px-3 pb-1">Free tools</p>
                {TOOLS.map((t) => (
                  <RouteLink
                    key={t.to}
                    to={t.to}
                    aria-current={isActive(t.to) ? 'page' : undefined}
                    className={cn(
                      'flex items-start gap-3 rounded-xl px-3 py-3 transition',
                      isActive(t.to) ? 'bg-brand/[0.16]' : 'hover:bg-surface-3',
                    )}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2">
                      <t.icon className="h-3.5 w-3.5 text-brand-deep" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink">{t.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">{t.detail}</span>
                    </span>
                  </RouteLink>
                ))}

                <div className="my-2 h-px bg-surface-4" />
                <p className="mono-label px-3 pb-1">For reviewers</p>
                {SECONDARY.map((l) => (
                  <RouteLink
                    key={l.to}
                    to={l.to}
                    className="rounded-xl px-3 py-3 text-sm text-ink-muted transition hover:bg-surface-3 hover:text-ink"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span>
                        {l.label}
                        <span className="mt-0.5 block text-[11px] text-ink-faint">{l.detail}</span>
                      </span>
                      {l.to === '/admin' ? (
                        <LayoutDashboard className="h-4 w-4 shrink-0 opacity-50" />
                      ) : (
                        <Sparkles className="h-4 w-4 shrink-0 opacity-50" />
                      )}
                    </span>
                  </RouteLink>
                ))}

                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      setOpen(false);
                      onRegister();
                    }}
                    className="w-full"
                  >
                    Register Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p className="text-center text-[11px] text-ink-faint">
                    {nf(totalRegistrations)} / {nf(target)} seats taken
                  </p>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>
    </>
  );
}
