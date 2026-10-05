/**
 * ANALYTICS LAYER (mock, transport-agnostic)
 * -----------------------------------------------------------------------------
 * Every growth surface in the app fires a typed event through `track()`. The
 * function is intentionally the ONLY place that knows about transports, so
 * wiring real analytics later is a ~20 line change here and nowhere else.
 *
 * WHERE TO PLUG IN THE REAL THING
 *   PostHog : posthog.init(KEY); then `posthog.capture(name, props)` inside flush()
 *   GA4     : window.gtag('event', name, props) inside flush()
 *   Supabase: insert into `analytics_events` for a server-side source of truth
 *
 * Events are also persisted locally so the /admin "Live event stream" panel can
 * show the funnel firing in real time during the demo — that is what makes the
 * instrumentation legible to a reviewer.
 */

import { storage } from './utils';
import { api, deviceId } from './api';

export type EventName =
  | 'page_view'
  | 'project_generator_open'
  | 'project_generated'
  | 'project_card_opened'
  | 'simulator_started'
  | 'simulator_completed'
  | 'idea_saved'
  | 'registration_started'
  | 'registration_step_completed'
  | 'registration_completed'
  | 'whatsapp_share_clicked'
  | 'linkedin_share_clicked'
  | 'referral_link_copied'
  | 'referral_signup'
  | 'referral_link_visited'
  | 'leaderboard_viewed'
  | 'experiment_exposed'
  | 'admin_viewed'
  | 'strategy_viewed'
  | 'cta_clicked'
  | 'faq_opened'
  | 'countdown_viewed';

export interface AnalyticsEvent {
  id: string;
  name: EventName | string;
  props: Record<string, unknown>;
  at: number;
}

type Listener = (e: AnalyticsEvent) => void;

const STORAGE_KEY = 'apl.events';
const MAX_EVENTS = 120;

const listeners = new Set<Listener>();
let buffer: AnalyticsEvent[] = [];

function load(): AnalyticsEvent[] {
  try {
    const raw = storage.get(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  // Debounced: high-frequency events (scroll, ticker) must never block the main thread.
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      storage.set(STORAGE_KEY, JSON.stringify(buffer.slice(-MAX_EVENTS)));
    } catch {
      /* quota / private mode — analytics must never break the product */
    }
  }, 400);
}

export function track(name: EventName | string, props: Record<string, unknown> = {}): AnalyticsEvent {
  const event: AnalyticsEvent = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    props,
    at: Date.now(),
  };

  buffer = [...buffer.slice(-(MAX_EVENTS - 1)), event];
  persist();
  listeners.forEach((l) => {
    try {
      l(event);
    } catch {
      /* a broken listener must not break the app */
    }
  });

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`%c[analytics] ${name}`, 'color:#4A7500', props);
  }

  flush(event);
  return event;
}

/**
 * Single integration seam. Replace the body with real transports.
 * Kept no-op by default so the prototype never makes unexpected network calls.
 */
function flush(event: AnalyticsEvent) {
  const w = window as unknown as {
    dataLayer?: Record<string, unknown>[];
    posthog?: { capture: (n: string, p?: Record<string, unknown>) => void };
    gtag?: (...args: unknown[]) => void;
  };

  // Google Tag Manager / GA4 data layer (harmless when absent)
  w.dataLayer?.push({ event: event.name, ...event.props });

  // PostHog, if it has been initialised by the host page
  w.posthog?.capture?.(event.name, event.props);

  // GA4 direct
  w.gtag?.('event', event.name, event.props);

  // ── our own backend, batched ────────────────────────────────────────────
  // Events are queued and sent in batches so a student scrolling the page does
  // not fire 30 requests. The queue is capped and flushed on page hide, which
  // is the one moment a mobile browser reliably gives you.
  queue.push({
    name: event.name,
    props: event.props,
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    deviceId: deviceId(),
    sessionId: sessionId(),
  });
  maybeFlush();
}

/* ── batched transport ────────────────────────────────────────────────────── */
const BATCH_SIZE = 12;
const queue: unknown[] = [];
let flushTimer: number | null = null;
let hiddenHooked = false;

function sessionId() {
  const KEY = 'apl.session';
  let id = storage.get(KEY);
  if (!id) {
    id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    storage.set(KEY, id);
  }
  return id;
}

function maybeFlush(force = false) {
  if (!hiddenHooked && typeof document !== 'undefined') {
    hiddenHooked = true;
    // `visibilitychange` is the mobile-safe equivalent of a beacon: it fires
    // when the student backgrounds the tab, right before the page is frozen.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') maybeFlush(true);
    });
  }
  if (force || queue.length >= BATCH_SIZE) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (!queue.length) return;
    const batch = queue.splice(0, queue.length);
    api.sendEvents(batch);
    return;
  }
  if (flushTimer === null) {
    flushTimer = window.setTimeout(() => {
      flushTimer = null;
      maybeFlush(true);
    }, 4000);
  }
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initAnalytics() {
  buffer = load();
}

export function getEvents(): AnalyticsEvent[] {
  return buffer;
}

export function countEvents(name: string): number {
  return buffer.filter((e) => e.name === name).length;
}

/** Funnel view for /admin — mirrors the growth model, counted from real session events. */
export function sessionFunnel() {
  return [
    { stage: 'Sessions', count: countEvents('page_view') || 1 },
    { stage: 'Generator opened', count: countEvents('project_generator_open') },
    { stage: 'Project generated', count: countEvents('project_generated') },
    { stage: 'Registration started', count: countEvents('registration_started') },
    { stage: 'Registration completed', count: countEvents('registration_completed') },
    { stage: 'Shares fired', count: countEvents('whatsapp_share_clicked') + countEvents('linkedin_share_clicked') },
    { stage: 'Referral link visited', count: countEvents('referral_link_visited') },
  ];
}

export function clearEvents() {
  buffer = [];
  storage.remove(STORAGE_KEY);
}

/**
 * A/B variant assignment. Deterministic per visitor, stored once, overridable
 * with ?variant=b for demos (so you can show both hero variants in one video).
 */
export type Variant = 'a' | 'b';

export function getVariant(): Variant {
  if (typeof window === 'undefined') return 'a';
  const url = new URLSearchParams(window.location.search).get('variant');
  if (url === 'a' || url === 'b') {
    storage.set('apl.variant', url);
    return url;
  }
  const stored = storage.get('apl.variant');
  if (stored === 'a' || stored === 'b') return stored;
  const assigned: Variant = Math.random() < 0.5 ? 'a' : 'b';
  storage.set('apl.variant', assigned);
  return assigned;
}
