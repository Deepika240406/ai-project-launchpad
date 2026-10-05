/**
 * API CLIENT
 * ---------------------------------------------------------------------------
 * The app talks to a real backend at `/api` on the SAME origin. Relative URLs,
 * never `http://localhost:8787` — the student's browser is not the machine the
 * server runs on, so an absolute host would work on a dev laptop and break the
 * moment it is proxied, previewed or deployed.
 *
 * THREE RULES, and they are the reason this prototype never looks broken:
 *
 * 1. **Probe once, then remember.** A single `/api/health` call decides whether
 *    this session is `online` or `offline`. Without the cache, every screen with
 *    a network call would stall for the timeout on a machine with no backend.
 *
 * 2. **Never throw at the UI.** Every call resolves to data or `null`. The store
 *    treats `null` as "use the local copy" — so a dead API degrades to the
 *    localStorage prototype instead of an error screen.
 *
 * 3. **The fallback is honest.** Offline mode is surfaced in the UI as a small
 *    "offline demo" tag, because silently pretending a local write was a global
 *    registration would be lying to the student about their referral counting.
 */
import { storage } from './utils';

const BASE = '/api';
const PROBE_TIMEOUT = 1500;
const CALL_TIMEOUT = 6000;

export type Mode = 'online' | 'offline' | 'unknown';

let mode: Mode = 'unknown';
let probePromise: Promise<Mode> | null = null;
const listeners = new Set<(m: Mode) => void>();

export function getMode(): Mode {
  return mode;
}

export function onModeChange(fn: (m: Mode) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setMode(next: Mode) {
  if (mode === next) return;
  mode = next;
  listeners.forEach((fn) => fn(next));
}

/** A stable per-browser id so anonymous tool use can be claimed at registration. */
export function deviceId(): string {
  const KEY = 'apl.device';
  let id = storage.get(KEY);
  if (!id) {
    id =
      (globalThis.crypto?.randomUUID?.() as string | undefined) ??
      `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    storage.set(KEY, id);
  }
  return id;
}

async function withTimeout(path: string, init: RequestInit = {}, ms = CALL_TIMEOUT) {
  if (typeof fetch !== 'function') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    if (!res.ok) {
      // 400s carry a machine-readable reason the form can render.
      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        return { error: body.error ?? 'bad_request', detail: body.detail ?? '' } as never;
      }
      if (res.status === 404) return null;
      return null;
    }
    return (await res.json()) as never;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Forget the cached probe and any listeners. A test seam: without it the first
 * test in a file would decide the mode for the rest of the file, which is
 * exactly how a "live data" test can pass while asserting on demo numbers.
 */
export function resetApiMode(): void {
  mode = 'unknown';
  probePromise = null;
}

/**
 * Is there a backend? Cached for the session. In a browser with no server this
 * fails in milliseconds with a connection error, not a 1.5s hang.
 */
export function probe(): Promise<Mode> {
  if (probePromise) return probePromise;
  probePromise = (async () => {
    const res = await withTimeout('/health', { method: 'GET' }, PROBE_TIMEOUT);
    const ok = !!res && (res as { ok?: boolean }).ok === true;
    setMode(ok ? 'online' : 'offline');
    return mode;
  })();
  return probePromise;
}

/** Call the API, but only if we already know it is up. */
async function call<T>(path: string, init?: RequestInit, { force = false } = {}): Promise<T | null> {
  if (!force) {
    const m = mode === 'unknown' ? await probe() : mode;
    if (m === 'offline') return null;
  }
  return withTimeout(path, init) as Promise<T | null>;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

/* ═══════════════════════════════════════════════════════════ typed surface */

export interface ApiStudent {
  code: string;
  name: string;
  email: string;
  college?: string;
  branch?: string;
  year?: string;
  experience?: string;
  interest?: string;
  projectId?: string;
  seat: number;
  referralCount: number;
  rank: number;
  referredBy?: string | null;
  duplicate?: boolean;
  friends?: ApiFriend[];
  impact?: { visits: number; joined: number };
}

export interface ApiStats {
  total: number;
  referralShare: number;
  target: number;
  spotsLeft: number;
  today: number;
  referralRegs: number;
  organicRegs: number;
  percent: number;
  /** The LIVE funnel: every stage counted from real analytics rows. */
  eventCounts: { name: string; count: number }[];
  /** Measured channel attribution — each registration's own source field. */
  sources: { source: string; registrations: number }[];
}

export interface ApiFriend {
  name: string;
  college: string | null;
  joinedAt: string;
}

export interface ApiClassScore {
  college: string;
  branch: string;
  students: number;
  referrals: number;
}

export interface ApiReminder {
  id: number;
  name: string | null;
  email: string;
  status: 'new' | 'reminded';
  created_at: string;
}

export interface ApiMessage {
  id: number;
  name: string;
  email: string | null;
  body: string;
  status: 'new' | 'read';
  created_at: string;
}

export interface ApiLeaderRow {
  rank: number;
  code: string;
  name: string;
  college: string | null;
  joinedAt: string;
  referrals: number;
  isYou: boolean;
}

export interface ApiActivityItem {
  firstName: string;
  college: string;
  branch: string;
  projectId: string | null;
  at: string;
}

export interface ApiCollegeScore {
  college: string;
  students: number;
  referrals: number;
}

export const api = {
  /** Force a fresh probe — used by the "reconnect" affordance. */
  async retry() {
    probePromise = null;
    return probe();
  },

  health: () => call<{ ok: boolean; students: number; target: number }>('/health'),

  stats: () => call<ApiStats>('/stats'),

  register: (body: Record<string, unknown>) =>
    call<ApiStudent & { stats: ApiStats; referredBy: string | null }>('/register', post(body)),

  student: (code: string) =>
    call<ApiStudent>(`/students/${encodeURIComponent(code)}`),

  leaderboard: (you?: string, limit = 25) =>
    call<{ rows: ApiLeaderRow[]; colleges: ApiCollegeScore[]; classes: ApiClassScore[]; totalReferrals: number }>(
      `/leaderboard?limit=${limit}${you ? `&you=${encodeURIComponent(you)}` : ''}`,
    ),

  /** Recent registrations for the activity ticker. First name + college only. */
  activity: (limit = 12) => call<{ items: ApiActivityItem[] }>(`/activity?limit=${limit}`),

  catalogue: () =>
    call<{
      projects: string[];
      interests: string[];
      experience: string[];
      years: string[];
      sources: string[];
      workshopDate: string;
    }>('/catalogue'),

  /* ----------------------------------------------------------- messages */
  sendReminder: (body: { name?: string; email: string }) =>
    // force: an explicit click must make a real attempt even if an earlier
    // probe failed — the student is watching the result.
    call<{ ok: boolean; id: number; duplicate?: boolean; error?: string }>(
      '/reminders',
      post(body),
      { force: true },
    ),

  sendMessage: (body: { name: string; email?: string; body: string }) =>
    // force: an explicit "send" must make a real attempt even if an earlier
    // probe failed — the user is watching the result, not a cached mode flag.
    call<{ ok: boolean; id: number; error?: string }>(
      '/messages',
      post({ ...body, deviceId: deviceId() }),
      { force: true },
    ),

  /* --------------------------------------------------------------- admin */
  adminLogin: (password: string) =>
    call<{ ok: boolean }>('/admin/login', post({ password }), { force: true }),

  adminLogout: () =>
    call<{ ok: boolean }>('/admin/logout', { method: 'POST' }, { force: true }),

  adminMe: () => call<{ authenticated: boolean }>('/admin/me', undefined, { force: true }),

  adminSummary: () => call<AdminSummary>('/admin/summary'),

  adminMessages: () =>
    call<{ items: ApiMessage[]; counts: { total: number; unread: number } }>('/admin/messages'),

  markMessage: (id: number, status: 'new' | 'read') =>
    call<{ item: ApiMessage }>(`/admin/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteMessage: (id: number) =>
    call<{ removed: boolean }>(`/admin/messages/${id}`, { method: 'DELETE' }),

  adminReminders: () =>
    call<{ items: ApiReminder[]; counts: { total: number; new: number } }>('/admin/reminders'),

  markReminder: (id: number, status: 'new' | 'reminded') =>
    call<{ item: ApiReminder }>(`/admin/reminders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteReminder: (id: number) =>
    call<{ removed: boolean }>(`/admin/reminders/${id}`, { method: 'DELETE' }),

  /* ------------------------------------------------------------- events */
  /** Fire-and-forget. Never awaited by the UI, never blocks a click. */
  sendEvents(events: unknown[]) {
    if (mode === 'offline' || !events.length) return;
    void withTimeout('/events', post({ events }), 4000);
  },

  /* -------------------------------------------------------------- tools */
  vault: (device = deviceId()) =>
    call<{ ideas: VaultIdea[] }>(`/vault/${encodeURIComponent(device)}`),

  saveVaultIdea: (idea: Record<string, unknown>) =>
    call<{ idea: VaultIdea }>('/vault', post({ ...idea, deviceId: deviceId() })),

  deleteVaultIdea: (projectId: string) =>
    call<{ removed: number }>(`/vault/${encodeURIComponent(deviceId())}/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    }),

  quiz: (device = deviceId()) => call<{ result: QuizResult | null }>(`/quiz/${encodeURIComponent(device)}`),

  saveQuiz: (result: Record<string, unknown>) => call<{ result: QuizResult }>('/quiz', post(result)),

  prompts: (device = deviceId()) => call<{ prompts: unknown[] }>(`/prompts/${encodeURIComponent(device)}`),

  savePrompt: (p: Record<string, unknown>) => call<{ ok: boolean }>('/prompts', post(p)),
};

/* ═══════════════════════════════════════════════════════════ response types */

export interface VaultIdea {
  id: number;
  device_id: string;
  student_code: string | null;
  project_id: string;
  note: string;
  priority: string;
  starred: boolean;
  stages: string[];
  created_at: string;
  updated_at: string;
}

export interface QuizResult {
  device_id: string;
  score: number;
  band: string;
  answers: { questionId: string; optionId: string; points: number }[];
  created_at: string;
}

export interface AdminSummary {
  stats: ApiStats;
  /** Measured attribution — each registration's own source field. */
  sources: { source: string; registrations: number }[];
  activity: ApiActivityItem[];
  daily: { day: string; registrations: number; referrals: number }[];
  colleges: { college: string; students: number }[];
  topProjects: { projectId: string; picks: number }[];
  leaderboard: { code: string; name: string; college: string | null; referrals: number }[];
  events: { name: string; count: number }[];
  recent: { name: string; props: Record<string, unknown>; path: string | null; at: string }[];
  generatedAt: string;
}
