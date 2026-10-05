import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  LeaderboardBuilder,
  QuizResult,
  RankedBuilder,
  Referral,
  RegisteredStudent,
  VaultIdea,
} from '../lib/types';
import { DEFAULT_WORKSHOP_DATE, REGISTRATION_TARGET } from '../data/content';
import { makeReferralCode, storage } from '../lib/utils';
import { getVariant, track, type Variant } from '../lib/analytics';
import {
  api,
  deviceId,
  getMode,
  onModeChange,
  probe,
  type ApiActivityItem,
  type ApiClassScore,
  type ApiCollegeScore,
  type ApiFriend,
  type ApiLeaderRow,
  type ApiStats,
  type Mode,
} from '../lib/api';

/* ==========================================================================
   APP STORE
   ---------------------------------------------------------------------------
   One source of truth for the campaign's numbers, and those numbers are REAL:
   they come from the shared database or they do not appear. There is no demo
   fallback anywhere in this file — when the server cannot be reached the store
   reports that (mode: 'offline') and the UI shows empty/error states instead of
   invented rows.
   ========================================================================== */

const STORAGE_KEY = 'apl.state.v1';

/**
 * Campaign-wide reads that only the server can answer. Held separately from
 * `server` (which is about *your* numbers) because these are shared state that
 * every visitor sees identically.
 */
interface CampaignData {
  leaderboard: ApiLeaderRow[];
  colleges: ApiCollegeScore[];
  /** (college, branch) cohorts — the class-vs-class challenge. */
  classes: ApiClassScore[];
  activity: ApiActivityItem[];
  /** The real workshop datetime, from the server catalogue. */
  workshopDate: string;
}

/** Numbers that came from the server, cached so a reload shows them instantly. */
interface ServerSnapshot {
  rank: number;
  referralCount: number;
  total: number;
  target: number;
  spotsLeft: number;
  percent: number;
  /** Registrations made through the referral loop, measured server-side. */
  referralRegs: number;
  /** The live funnel, counted from real analytics rows. */
  eventCounts: { name: string; count: number }[];
  /** Measured channel attribution. */
  sources: { source: string; registrations: number }[];
}

interface PersistedState {
  student: RegisteredStudent | null;
  savedIdeaId: string | null;
  inboundRef: string | null;
  /** Workspace: the student's own ideas, checklist progress and quiz result. */
  vault: VaultIdea[];
  quiz: QuizResult | null;
  /** Last-known server truth. Null until the first successful fetch. */
  server: ServerSnapshot | null;
  /** Shared campaign reads. Null until the first successful fetch. */
  campaign: CampaignData | null;
  /** Real people who joined through this student's link. Null until fetched. */
  friends: Referral[] | null;
  /** The student's exact college standing at the moment they joined. */
  campus: { students: number; rank: number | null; colleges: number } | null;
  /** Share-link funnel for the signed-in student: visits → real joins. */
  impact: { visits: number; joined: number } | null;
  /** Where this visitor arrived from (?src= / ?utm_source=), sent at registration. */
  source: string | null;
}

interface AppContextValue {
  student: RegisteredStudent | null;
  isRegistered: boolean;
  /** Real referred friends, from the database. */
  referrals: Referral[];
  referralCount: number;
  savedIdeaId: string | null;
  inboundRef: string | null;
  /** Workspace state */
  vault: VaultIdea[];
  quiz: QuizResult | null;
  vaultCount: number;
  totalStagesDone: number;
  /** Registrations in the campaign database. 0 is an honest number. */
  totalRegistrations: number;
  spotsLeft: number;
  target: number;
  progressPct: number;
  shareCode: string | null;
  leaderboard: RankedBuilder[];
  myRank: number | null;
  variant: Variant;
  /** 'online' = a real API answered; 'offline' = it could not be reached. */
  mode: Mode;
  /** True when the numbers on screen came from the shared database. */
  isLiveData: boolean;
  /** Re-probe the API after a failure (surfaced as a "retry" affordance). */
  reconnect: () => void;
  /** The real referrer table, when the API answered. Null = unreachable. */
  liveLeaderboard: ApiLeaderRow[] | null;
  /** Real campus competition, when the API answered. */
  collegeScoreboard: ApiCollegeScore[] | null;
  /** Real class cohorts (college + branch), when the API answered. */
  classScoreboard: ApiClassScore[] | null;
  /** Real recent registrations for the ticker, when the API answered. */
  liveActivity: ApiActivityItem[] | null;
  /** The real workshop datetime (ISO) the countdown counts down to. */
  workshopDate: string;
  /** Registrations made through the referral loop, measured server-side. */
  referralRegs: number;
  /** The live funnel stages, counted from real events. */
  eventCounts: { name: string; count: number }[];
  /** Measured channel attribution. */
  sources: { source: string; registrations: number }[];
  /** Exact standing of the signed-in student's college: {students, rank, colleges}. */
  campus: { students: number; rank: number | null; colleges: number } | null;
  /** Share-link funnel for the signed-in student: {visits, joined}. */
  impact: { visits: number; joined: number } | null;
  register: (payload: Omit<RegisteredStudent, 'code' | 'joinedAt'>) => RegisteredStudent;
  saveIdea: (projectId: string) => void;
  /* ---- workspace actions ---- */
  addVaultIdea: (idea: Omit<VaultIdea, 'id' | 'createdAt' | 'stages'> & { stages?: string[] }) => VaultIdea;
  updateVaultIdea: (id: string, patch: Partial<Omit<VaultIdea, 'id' | 'createdAt'>>) => void;
  removeVaultIdea: (id: string) => void;
  toggleStage: (ideaId: string, stageId: string) => void;
  setQuizResult: (result: QuizResult) => void;
  reset: () => void;
  toast: ToastState | null;
  showToast: (t: Omit<ToastState, 'id'>) => void;
  dismissToast: () => void;
}

export interface ToastState {
  id: number;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
}

const AppContext = createContext<AppContextValue | null>(null);

const EMPTY_STATE: PersistedState = {
  student: null,
  savedIdeaId: null,
  inboundRef: null,
  vault: [],
  quiz: null,
  server: null,
  campaign: null,
  friends: null,
  campus: null,
  impact: null,
  source: null,
};

function loadState(): PersistedState {
  try {
    const raw = storage.get(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedState> & { referrals?: unknown };
    // `referrals` was the old demo-simulator list. Drop it on the floor.
    delete parsed.referrals;
    return { ...EMPTY_STATE, ...parsed };
  } catch {
    return EMPTY_STATE;
  }
}

function saveState(state: PersistedState) {
  // storage.set never throws (see lib/utils), so a sandboxed iframe degrades
  // to in-memory state instead of crashing.
  storage.set(STORAGE_KEY, JSON.stringify(state));
}

function statsToSnapshot(stats: ApiStats, prev: ServerSnapshot | null): ServerSnapshot {
  return {
    rank: prev?.rank ?? 0,
    referralCount: prev?.referralCount ?? 0,
    total: stats.total,
    target: stats.target,
    spotsLeft: stats.spotsLeft,
    percent: stats.percent,
    referralRegs: stats.referralRegs,
    eventCounts: stats.eventCounts ?? [],
    sources: stats.sources ?? [],
  };
}

function mapFriends(friends: ApiFriend[] | undefined): Referral[] {
  return (friends ?? []).map((f, i) => ({
    id: `friend-${i}-${f.joinedAt}`,
    name: f.name,
    college: f.college ?? 'Not specified',
    joinedAt: Date.parse(f.joinedAt) || Date.now(),
  }));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [toast, setToast] = useState<ToastState | null>(null);
  const [variant] = useState<Variant>(() => getVariant());
  const [mode, setMode] = useState<Mode>(() => getMode());

  // A ref mirror of state so action creators can read + return values synchronously.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Capture ?ref= and ?src= once per page load.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      const code = ref.toUpperCase().slice(0, 16);
      setState((s) => (s.student ? s : { ...s, inboundRef: code }));
      track('referral_link_visited', { code });
    }

    // Attribution: the link a student actually arrived on (`?src=whatsapp`,
    // or any `?utm_source=`). Stored and sent with the registration, so the
    // campaign's channel numbers are measured rather than assumed.
    const source = (params.get('src') ?? params.get('utm_source') ?? '').toLowerCase().slice(0, 30);
    if (source) {
      setState((s) => (s.student ? s : { ...s, source }));
      track('arrival_attributed', { source });
    }
  }, []);

  /**
   * One health probe decides the session's mode, then the authoritative numbers
   * are pulled once. Deliberately a single mount effect: polling would burn a
   * student's mobile data to animate a counter nobody is watching.
   */
  useEffect(() => {
    let alive = true;
    const unsubscribe = onModeChange((m) => alive && setMode(m));

    void (async () => {
      const m = await probe();
      if (!alive || m !== 'online') return;

      const code = stateRef.current.student?.code;
      const [stats, student, campaign] = await Promise.all([
        api.stats(),
        code ? api.student(code) : Promise.resolve(null),
        // One round trip for everything shared, rather than three separate
        // effects that each stall the first paint.
        api.leaderboard(code).then(async (board) => {
          if (!board) return null;
          const [activity, catalogue] = await Promise.all([api.activity(12), api.catalogue()]);
          return {
            leaderboard: board.rows,
            colleges: board.colleges ?? [],
            classes: board.classes ?? [],
            activity: activity?.items ?? [],
            workshopDate: catalogue?.workshopDate ?? DEFAULT_WORKSHOP_DATE,
          } satisfies CampaignData;
        }),
      ]);
      if (!alive) return;

      setState((s) => ({
        ...s,
        campaign: campaign ?? s.campaign,
        friends: student?.friends ? mapFriends(student.friends) : s.friends,
        impact: student?.impact ?? s.impact,
        server: stats
          ? {
              ...statsToSnapshot(stats, s.server),
              rank: student?.rank ?? s.server?.rank ?? 0,
              referralCount: student?.referralCount ?? s.server?.referralCount ?? 0,
            }
          : s.server,
      }));
    })();

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const showToast = useCallback((t: Omit<ToastState, 'id'>) => {
    setToast({ ...t, id: Date.now() });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const reconnect = useCallback(() => {
    void (async () => {
      const m = await api.retry();
      setMode(m);
      if (m !== 'online') return;
      const code = stateRef.current.student?.code;
      const [stats, student, board, activity] = await Promise.all([
        api.stats(),
        code ? api.student(code) : Promise.resolve(null),
        api.leaderboard(code),
        api.activity(12),
      ]);
      setState((s) => ({
        ...s,
        server: stats
          ? {
              ...statsToSnapshot(stats, s.server),
              rank: student?.rank ?? s.server?.rank ?? 0,
              referralCount: student?.referralCount ?? s.server?.referralCount ?? 0,
            }
          : s.server,
        friends: student?.friends ? mapFriends(student.friends) : s.friends,
        campaign: board
          ? {
              leaderboard: board.rows,
              colleges: board.colleges ?? [],
              classes: board.classes ?? [],
              activity: activity?.items ?? s.campaign?.activity ?? [],
              workshopDate: s.campaign?.workshopDate ?? DEFAULT_WORKSHOP_DATE,
            }
          : s.campaign,
      }));
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.action ? 7000 : 4200;
    const timer = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ---------------------------------------------------------------- mutations */

  /**
   * Registration is LOCAL-FIRST-BY-DESIGN and then reconciled with the server.
   *
   * The student gets their code and confirmation on the same tick — no spinner,
   * no waiting on a network round trip at the highest-emotion moment of the
   * funnel. The API call then runs in the background and, when it answers,
   * replaces the locally guessed code with the authoritative one and swaps in
   * real campaign numbers. If it fails, nothing breaks: the local code was
   * already shown and the session simply stays in offline mode.
   */
  const register = useCallback<AppContextValue['register']>((payload) => {
    const code = makeReferralCode(payload.name, payload.email);
    const student: RegisteredStudent = { ...payload, code, joinedAt: Date.now() };
    setState((s) => ({ ...s, student }));

    void (async () => {
      const res = await api.register({
        name: payload.name,
        email: payload.email,
        college: payload.college,
        branch: payload.branch,
        year: payload.year,
        experience: payload.experience,
        interest: payload.interest,
        projectId: payload.recommendedProjectId,
        ref: stateRef.current.inboundRef,
        source: stateRef.current.source,
        deviceId: deviceId(),
      });
      if (!res || (res as { error?: string }).error) return;

      // A real referred signup: the event fires only when a person registered
      // through someone's link — never on a button press.
      if (stateRef.current.inboundRef) {
        track('referral_signup', { code: stateRef.current.inboundRef });
      }

      const saved = res as unknown as {
        code: string;
        seat: number;
        rank: number;
        referralCount: number;
        friends: ApiFriend[];
        campus: { students: number; rank: number | null; colleges: number } | null;
        impact: { visits: number; joined: number } | null;
        stats: ApiStats;
      };

      setState((s) =>
        s.student
          ? {
              ...s,
              // Only replace the code if the server disagrees — the local one is
              // already on screen, so a silent identity swap is not acceptable.
              student: { ...s.student, code: saved.code, seat: saved.seat },
              friends: mapFriends(saved.friends),
              campus: saved.campus ?? s.campus,
              impact: saved.impact ?? s.impact,
              server: {
                ...statsToSnapshot(saved.stats, s.server),
                rank: saved.rank,
                referralCount: saved.referralCount,
              },
            }
          : s,
      );
    })();

    return student;
  }, []);

  const saveIdea = useCallback<AppContextValue['saveIdea']>((projectId) => {
    setState((s) => ({ ...s, savedIdeaId: projectId }));
  }, []);

  const addVaultIdea = useCallback<AppContextValue['addVaultIdea']>((idea) => {
    const created: VaultIdea = {
      id: `idea-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      stages: [],
      ...idea,
    };
    setState((s) => ({ ...s, vault: [created, ...s.vault] }));
    return created;
  }, []);

  const updateVaultIdea = useCallback<AppContextValue['updateVaultIdea']>((id, patch) => {
    setState((s) => ({
      ...s,
      vault: s.vault.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }, []);

  const removeVaultIdea = useCallback<AppContextValue['removeVaultIdea']>((id) => {
    setState((s) => ({ ...s, vault: s.vault.filter((i) => i.id !== id) }));
  }, []);

  const toggleStage = useCallback<AppContextValue['toggleStage']>((ideaId, stageId) => {
    setState((s) => ({
      ...s,
      vault: s.vault.map((i) =>
        i.id === ideaId
          ? {
              ...i,
              stages: i.stages.includes(stageId)
                ? i.stages.filter((x) => x !== stageId)
                : [...i.stages, stageId],
            }
          : i,
      ),
    }));
  }, []);

  const setQuizResult = useCallback<AppContextValue['setQuizResult']>((result) => {
    setState((s) => ({ ...s, quiz: result }));
  }, []);

  /**
   * Workspace sync. One effect covers the vault and the readiness check rather
   * than sprinkling network calls through four components.
   *
   * Hydration is deliberately one-way-on-empty: if this device already has
   * ideas we keep them and push them up (a student mid-build must never have
   * their list silently replaced), and only when the device is empty do we pull
   * the server copy down. That is the safe direction for a merge without a
   * conflict UI.
   */
  const hydrated = useRef(false);
  useEffect(() => {
    if (mode !== 'online' || hydrated.current) return;
    hydrated.current = true;
    void (async () => {
      const [vault, quiz] = await Promise.all([api.vault(), api.quiz()]);
      if (!vault && !quiz) return;
      setState((s) => {
        const pullVault = s.vault.length === 0 && !!vault?.ideas?.length;
        const pullQuiz = !s.quiz && !!quiz?.result;
        if (!pullVault && !pullQuiz) return s;
        return {
          ...s,
          vault: pullVault
            ? (vault!.ideas as unknown[]).map((i) => {
                const row = i as Record<string, unknown>;
                return {
                  id: String(row.id),
                  title: String(row.title ?? ''),
                  pitch: String(row.pitch ?? ''),
                  notes: String(row.note ?? ''),
                  priority: (row.priority ?? '') as never,
                  projectId: String(row.project_id ?? ''),
                  stages: (row.stages as string[]) ?? [],
                  createdAt: Date.parse(String(row.created_at)) || Date.now(),
                } as never;
              })
            : s.vault,
          quiz: pullQuiz
            ? ({
                score: quiz!.result!.score,
                band: quiz!.result!.band as never,
                answers: quiz!.result!.answers,
                completedAt: Date.parse(quiz!.result!.created_at) || Date.now(),
              } as never)
            : s.quiz,
        };
      });
    })();
  }, [mode]);

  // Push vault changes up. Debounced by React's own batching; the API upserts,
  // so a repeat write is harmless.
  const lastPushed = useRef('');
  useEffect(() => {
    if (mode !== 'online') return;
    const fingerprint = JSON.stringify(state.vault);
    if (fingerprint === lastPushed.current) return;
    lastPushed.current = fingerprint;
    for (const idea of state.vault) {
      void api.saveVaultIdea({
        projectId: idea.projectId ?? idea.title,
        title: idea.title,
        pitch: idea.pitch,
        note: idea.notes,
        priority: idea.priority,
        stages: idea.stages,
        studentCode: state.student?.code ?? null,
      });
    }
  }, [mode, state.vault, state.student?.code]);

  const lastQuiz = useRef('');
  useEffect(() => {
    if (mode !== 'online' || !state.quiz) return;
    const fingerprint = `${state.quiz.score}-${state.quiz.completedAt}`;
    if (fingerprint === lastQuiz.current) return;
    lastQuiz.current = fingerprint;
    void api.saveQuiz({
      score: state.quiz.score,
      band: state.quiz.band,
      answers: state.quiz.answers,
      studentCode: state.student?.code ?? null,
    });
  }, [mode, state.quiz, state.student?.code]);

  const reset = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  /* ---------------------------------------------------------------- derived */

  const value = useMemo<AppContextValue>(() => {
    const server = state.server;
    const workshopDate = state.campaign?.workshopDate ?? DEFAULT_WORKSHOP_DATE;
    // Server truth when we have it. When we do not, the answer is 0 / unknown —
    // never an invented number.
    const referralCount = server?.referralCount ?? 0;
    const totalRegistrations = server?.total ?? 0;

    /**
     * The store-level leaderboard, so *every* consumer (home band, referral
     * engine, /leaderboard) reads the same rows. When the API answered it is the
     * real referrer query, re-ranked here only because the server's board is
     * capped by `limit` — a student outside that window still gets an honest
     * position instead of vanishing.
     */
    const leaderboard: RankedBuilder[] = (() => {
      const live = state.campaign?.leaderboard;
      const rows: LeaderboardBuilder[] = (live ?? []).map((r) => ({
        id: r.code,
        name: r.name,
        college: r.college ?? 'Not specified',
        referrals: r.referrals,
      }));

      if (state.student && !rows.some((r) => r.id === state.student?.code)) {
        const liveRank = state.server?.rank;
        rows.push({
          id: state.student.code,
          name: state.student.name,
          college: state.student.college || 'Not specified',
          referrals: referralCount,
          // Only the server knows a position among many rows; offline the sort
          // below computes one locally from what little exists.
          rank: live && liveRank ? liveRank : undefined,
        });
      }

      return rows
        .sort((a, b) => b.referrals - a.referrals || a.name.localeCompare(b.name))
        .map((b, i) => ({ ...b, rank: b.rank ?? i + 1, isYou: b.id === state.student?.code }));
    })();

    const myRank =
      server?.rank ??
      (state.student ? (leaderboard.find((b) => b.isYou)?.rank ?? null) : null);

    return {
      student: state.student,
      isRegistered: Boolean(state.student),
      referrals: state.friends ?? [],
      campus: state.campus,
      impact: state.impact,
      referralCount,
      savedIdeaId: state.savedIdeaId,
      inboundRef: state.inboundRef,
      vault: state.vault,
      quiz: state.quiz,
      vaultCount: state.vault.length,
      totalStagesDone: state.vault.reduce((n, i) => n + i.stages.length, 0),
      totalRegistrations,
      spotsLeft: server?.spotsLeft ?? Math.max(0, REGISTRATION_TARGET - totalRegistrations),
      target: REGISTRATION_TARGET,
      progressPct: Math.min(100, (totalRegistrations / REGISTRATION_TARGET) * 100),
      shareCode: state.student?.code ?? null,
      leaderboard,
      myRank,
      variant,
      mode,
      isLiveData: mode === 'online' && !!server,
      reconnect,
      liveLeaderboard: state.campaign?.leaderboard ?? null,
      collegeScoreboard: state.campaign?.colleges ?? null,
      classScoreboard: state.campaign?.classes ?? null,
      liveActivity: state.campaign?.activity ?? null,
      workshopDate,
      referralRegs: server?.referralRegs ?? 0,
      eventCounts: server?.eventCounts ?? [],
      sources: server?.sources ?? [],
      register,
      saveIdea,
      addVaultIdea,
      updateVaultIdea,
      removeVaultIdea,
      toggleStage,
      setQuizResult,
      reset,
      toast,
      showToast,
      dismissToast,
    };
  }, [
    state,
    toast,
    variant,
    mode,
    reconnect,
    register,
    saveIdea,
    addVaultIdea,
    updateVaultIdea,
    removeVaultIdea,
    toggleStage,
    setQuizResult,
    reset,
    showToast,
    dismissToast,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
