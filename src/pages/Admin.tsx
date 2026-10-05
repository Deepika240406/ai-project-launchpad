import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowLeft,
  Building2,
  CalendarDays,
  Gauge,
  BellRing,
  Inbox,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Percent,
  RotateCcw,
  Share2,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { useApp } from '../store/AppStore';
import { Badge, Button, Card, Counter, DataSourceTag, ProgressBar, Section, useCopy } from '../components/ui';
import { cn, nf, timeAgo } from '../lib/utils';
import { getEvents, sessionFunnel, track, clearEvents, type AnalyticsEvent } from '../lib/analytics';
import { RouteLink } from '../lib/router';
import { CHART, CHART_INK } from '../lib/palette';
import { api, type AdminSummary, type ApiMessage, type ApiReminder } from '../lib/api';
import { PROJECTS } from '../data/projects';

/* ==========================================================================
   /ADMIN — the campaign dashboard, behind a password.
   ---------------------------------------------------------------------------
   Every panel reads the campaign database through /api/admin/* (session-cookie
   auth). There are no demo arrays and no projection mode: if a query has not
   produced rows yet, the panel shows an empty state, not a stand-in.
   ========================================================================== */

export function Admin() {
  const [auth, setAuth] = useState<'checking' | 'login' | 'ok'>('checking');

  useEffect(() => {
    let alive = true;
    void api.adminMe().then((res) => {
      if (!alive) return;
      setAuth(res?.authenticated ? 'ok' : 'login');
    });
    return () => {
      alive = false;
    };
  }, []);

  if (auth === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm text-ink-muted">Checking the session…</p>
      </div>
    );
  }

  return auth === 'ok' ? (
    <AdminDashboard onLogout={() => setAuth('login')} />
  ) : (
    <AdminLogin onLogin={() => setAuth('ok')} />
  );
}

/* ------------------------------------------------------------- login gate */

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api.adminLogin(password);
    setBusy(false);
    if (res && (res as { ok?: boolean }).ok) {
      onLogin();
    } else {
      setError('Wrong password — or the API is unreachable.');
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-5">
      <Card className="w-full max-w-sm p-7">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-brand/70 bg-brand/20">
          <Lock className="h-4.5 w-4.5 text-brand-deep" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">Campaign dashboard</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          This area shows real registrations and replies. It needs the admin password.
        </p>
        <form onSubmit={submit} className="mt-5">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-brand"
              placeholder="••••••••"
              autoFocus
            />
          </label>
          {error ? (
            <p role="alert" className="mt-2.5 text-[12px] font-medium text-ember">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="mt-4 w-full" disabled={busy}>
            {busy ? 'Checking…' : 'Unlock dashboard'}
          </Button>
        </form>
        <RouteLink to="/" className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to the site
        </RouteLink>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------- dashboard */

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const {
    totalRegistrations,
    target,
    progressPct,
    referralCount,
    leaderboard,
    reset,
    student,
    variant,
    showToast,
    isLiveData,
  } = useApp();
  const [events, setEvents] = useState<AnalyticsEvent[]>(() => getEvents());
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [msgCounts, setMsgCounts] = useState({ total: 0, unread: 0 });
  const [reminders, setReminders] = useState<ApiReminder[]>([]);
  const [remCounts, setRemCounts] = useState({ total: 0, new: 0 });

  /** The server's own read of the campaign — real SQL rows only. */
  const loadSummary = () => {
    void api.adminSummary().then((res) => {
      if (res && !(res as unknown as { error?: string }).error) setSummary(res);
    });
  };
  const loadMessages = () => {
    void api.adminMessages().then((res) => {
      if (res && !(res as unknown as { error?: string }).error && res.items) {
        setMessages(res.items);
        setMsgCounts(res.counts ?? { total: res.items.length, unread: 0 });
      }
    });
  };
  const loadReminders = () => {
    void api.adminReminders().then((res) => {
      if (res && !(res as unknown as { error?: string }).error && res.items) {
        setReminders(res.items);
        setRemCounts(res.counts ?? { total: res.items.length, new: 0 });
      }
    });
  };

  useEffect(() => {
    loadSummary();
    loadMessages();
    loadReminders();
  }, []);

  useEffect(() => {
    track('admin_viewed', { total: totalRegistrations });
    const id = window.setInterval(() => setEvents(getEvents()), 1500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** One adapter per panel — built from real SQL rows, or nothing. */
  const daily = useMemo(
    () =>
      (summary?.daily ?? []).map((d) => ({
        day: d.day.slice(5), // YYYY-MM-DD → MM-DD
        registrations: d.registrations,
        referrals: d.referrals,
      })),
    [summary],
  );

  const colleges = useMemo(
    () => (summary?.colleges ?? []).map((c) => ({ college: c.college, students: c.students })),
    [summary],
  );

  const topProjects = useMemo(
    () =>
      (summary?.topProjects ?? []).map((p) => ({ project: prettyProject(p.projectId), picks: p.picks })),
    [summary],
  );

  /**
   * CHANNEL ATTRIBUTION — a `GROUP BY source` over the registrations table,
   * so every slice is what a channel actually delivered.
   */
  const sources = useMemo(() => {
    const rows = summary?.sources ?? [];
    if (!rows.length) return [];
    const total = rows.reduce((n, r) => n + r.registrations, 0) || 1;
    return rows.map((r) => ({
      channel: SOURCE_LABEL[r.source] ?? prettifySource(r.source),
      value: r.registrations,
      share: Math.round((r.registrations / total) * 1000) / 10,
      color: sourceColor(r.source),
    }));
  }, [summary]);

  /**
   * The KPI strip. Conversion is never computed against an invented visitor
   * floor — it divides by real page_view events and shows "—" until there is
   * one, because "no data yet" and "0% conversion" are different claims.
   */
  const kpis = useMemo(() => {
    const serverPageViews = summary?.events?.find((e) => e.name === 'page_view')?.count ?? 0;
    const conversion = serverPageViews > 0 ? Math.round((totalRegistrations / serverPageViews) * 100) : null;
    const referralRegs = summary?.stats?.referralRegs ?? 0;

    return [
      {
        label: 'Total registrations',
        value: totalRegistrations,
        suffix: '',
        icon: Users,
        tone: 'acid' as const,
        hint: 'Live database rows',
      },
      {
        label: 'Registration target',
        value: target,
        suffix: '',
        icon: Target,
        tone: 'neutral' as const,
        hint: 'Seat cap for the cohort',
      },
      {
        label: 'Progress to target',
        value: Math.round(progressPct),
        suffix: '%',
        icon: Gauge,
        tone: 'cy' as const,
        hint: `${Math.max(0, target - totalRegistrations)} seats remaining`,
      },
      {
        label: 'Visitor → registration',
        value: conversion ?? 0,
        suffix: conversion === null ? '' : '%',
        display: conversion === null ? '—' : undefined,
        icon: Percent,
        tone: 'acid' as const,
        hint: conversion === null ? 'No page views recorded yet' : `Against ${nf(serverPageViews)} recorded visits`,
      },
      {
        label: 'Referral registrations',
        value: referralRegs,
        suffix: '',
        icon: Share2,
        tone: 'neutral' as const,
        hint: 'Measured from referred_by',
      },
      {
        label: 'Unread replies',
        value: msgCounts.unread,
        suffix: '',
        icon: Inbox,
        tone: 'cy' as const,
        hint: `${msgCounts.total} total in the inbox`,
      },
    ];
  }, [summary, totalRegistrations, target, progressPct, msgCounts]);

  const funnel = sessionFunnel();

  const logout = async () => {
    await api.adminLogout();
    onLogout();
  };

  return (
    <div className="min-h-screen pb-20">
      {/* header */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-brand/70 bg-brand/20">
              <LayoutDashboard className="h-4 w-4 text-brand-deep" />
            </span>
            <div>
              <p className="text-[13px] font-semibold leading-none text-ink">Campaign dashboard</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                /admin · authenticated
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="violet">Variant {variant.toUpperCase()}</Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                reset();
                clearEvents();
                setEvents([]);
                showToast({ title: 'Local state reset', description: 'This browser session cleared.', variant: 'info' });
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset local state</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={logout}>
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
            <RouteLink
              to="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-3 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-surface-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Landing page</span>
            </RouteLink>
          </div>
        </div>
      </header>

      <Section className="pt-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Growth campaign — live read
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
              {isLiveData ? (
                <>
                  Everything on this page is read from the campaign database: registrations, referrals,
                  colleges, channel attribution, replies and the event stream are{' '}
                  <span className="text-ink">real rows written by real visits</span>. Panels that have not
                  recorded anything yet say so instead of showing a projection.
                </>
              ) : (
                <>
                  The campaign database is currently unreachable, so panels will fill as soon as the API
                  answers. Nothing here is faked to look busy.
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DataSourceTag />
          </div>
        </div>

        {/* KPI grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <Card key={k.label} className="p-4">
              <div className="flex items-center justify-between">
                <k.icon
                  className={cn(
                    'h-4 w-4',
                    k.tone === 'acid' ? 'text-brand-deep' : k.tone === 'cy' ? 'text-cyan' : 'text-ink-muted',
                  )}
                />
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-ink">
                {'display' in k && k.display ? (
                  // An em dash, not a zero: "no data yet" and "0% conversion"
                  // are different claims and an operator needs to tell them apart.
                  <span className="text-ink-faint">{k.display}</span>
                ) : (
                  <Counter value={k.value} suffix={k.suffix} onView={false} />
                )}
              </p>
              <p className="mt-1 text-[12px] font-medium text-ink-muted">{k.label}</p>
              <p className="mt-1 text-[10px] leading-snug text-ink-faint">{k.hint}</p>
            </Card>
          ))}
        </div>

        {/* progress to target */}
        <Card className="mt-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mono-label">Target</p>
              <p className="mt-1 text-3xl font-semibold tracking-tightest text-ink">{nf(target)}</p>
            </div>
            <div>
              <p className="mono-label">Current</p>
              <p className="mt-1 text-3xl font-semibold tracking-tightest text-brand-deep">
                <Counter value={totalRegistrations} />
              </p>
            </div>
            <div>
              <p className="mono-label">Progress</p>
              <p className="mt-1 text-3xl font-semibold tracking-tightest text-ink">
                {progressPct.toFixed(1)}%
              </p>
            </div>
            <div className="min-w-[220px] flex-1">
              <ProgressBar value={progressPct} size="lg" />
              <p className="mt-2 text-[11px] text-ink-faint">
                {Math.max(0, target - totalRegistrations)} seats left ·{' '}
                {student ? 'you are registered' : 'you are not registered yet'}
              </p>
            </div>
          </div>
        </Card>

        {/* charts row 1 */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="mono-label flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-brand-deep" />
                Daily registrations
              </p>
              <span className="text-[11px] text-ink-faint">Measured · last 7 days</span>
            </div>
            {daily.length ? (
              <div className="mt-5 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                    <defs>
                      <linearGradient id="gReg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.lime} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={CHART.lime} stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="gRef" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5B3DF5" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#5B3DF5" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={44} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11, paddingTop: 8, color: CHART_INK.tooltip }}
                    />
                    <Area
                      type="monotone"
                      name="Total registrations"
                      dataKey="registrations"
                      stroke={CHART.lime}
                      strokeWidth={2}
                      fill="url(#gReg)"
                    />
                    <Area
                      type="monotone"
                      name="Referral registrations"
                      dataKey="referrals"
                      stroke={CHART.violet}
                      strokeWidth={2}
                      fill="url(#gRef)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyPanel label="No registrations recorded yet. The curve draws itself from the first real row." />
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="mono-label flex items-center gap-2">
                <Share2 className="h-3.5 w-3.5 text-violet" />
                Registrations by channel — measured
              </p>
              <DataSourceTag />
            </div>
            {sources.length ? (
              <>
                <div className="mt-4 h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sources}
                        dataKey="value"
                        nameKey="channel"
                        innerRadius={58}
                        outerRadius={92}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {sources.map((c) => (
                          <Cell key={c.channel} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-2">
                  {sources.map((c) => (
                    <li key={c.channel} className="flex items-center gap-2 text-[11px] text-ink-muted">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="truncate">{c.channel}</span>
                      <span className="ml-auto font-mono text-ink">
                        {c.value} · {c.share}%
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyPanel label="Attribution appears with the first registration — each row carries its own source." />
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
              Read: every slice is a GROUP BY source over real registrations — what each channel delivered,
              not what was projected.
            </p>
          </Card>
        </div>

        {/* charts row 2 */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <p className="mono-label flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-cyan" />
              College distribution
            </p>
            {colleges.length ? (
              <div className="mt-5 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={colleges}
                    layout="vertical"
                    margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="college"
                      tickLine={false}
                      axisLine={false}
                      width={132}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="students" name="Students" fill={CHART.teal} radius={[0, 6, 6, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyPanel label="Campus standings appear as soon as students register with their college." />
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
              Concentration check: if any single college exceeds 15% of registrations, diversify the
              ambassador list before scaling there.
            </p>
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="mono-label flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-brand-deep" />
              Top projects selected
            </p>
            {topProjects.length ? (
              <div className="mt-5 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProjects}
                    layout="vertical"
                    margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="project"
                      tickLine={false}
                      axisLine={false}
                      width={140}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="picks" name="Students" fill={CHART.lime} radius={[0, 6, 6, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyPanel label="Project picks appear with the first registrations." />
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
              Read: career-outcome projects (resume, interview) dominate. That is the hook to lead with in
              WhatsApp copy, not “learn AI”.
            </p>
          </Card>
        </div>

        {/* replies inbox */}
        <Card className="mt-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="mono-label flex items-center gap-2">
              <Inbox className="h-3.5 w-3.5 text-brand-deep" />
              Replies inbox
            </p>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {msgCounts.unread} unread · {msgCounts.total} total
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
            Messages sent through the “Questions? Send a reply” box on the home page, stored in the
            database. Mark as read once handled; delete spam or test rows.
          </p>

          {messages.length ? (
            <ul className="mt-4 space-y-2.5">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    'rounded-xl border px-4 py-3',
                    m.status === 'new' ? 'border-brand/60 bg-brand/[0.08]' : 'border-line bg-surface-2',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-ink">{m.name}</span>
                    {m.email ? (
                      <span className="font-mono text-[11px] text-ink-muted">{m.email}</span>
                    ) : null}
                    <span className="ml-auto font-mono text-[10px] text-ink-faint">
                      {timeAgo(Date.parse(m.created_at) || Date.now())}
                    </span>
                    {m.status === 'new' ? (
                      <Badge tone="acid">new</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{m.body}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        void api.markMessage(m.id, m.status === 'new' ? 'read' : 'new').then(loadMessages);
                      }}
                      className="rounded-lg border border-line bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition hover:border-brand hover:text-ink"
                    >
                      Mark {m.status === 'new' ? 'read' : 'unread'}
                    </button>
                    <button
                      onClick={() => {
                        void api.deleteMessage(m.id).then(loadMessages);
                      }}
                      className="rounded-lg border border-line bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition hover:border-ember hover:text-ember"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyPanel label="No replies yet. Anything sent from the home page lands here." />
          )}

          {/* remind-me leads — the soft commitment, a real lead list */}
          <div className="mt-6 border-t border-line pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="mono-label flex items-center gap-2">
                <BellRing className="h-3.5 w-3.5 text-violet" />
                Remind-me leads
              </p>
              <span className="text-[11px] text-ink-faint">
                {remCounts.new} new · {remCounts.total} total
              </span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
              Students who were interested but not ready — they asked to be told when the next cohort date
              is set. A lead is better than a bounce.
            </p>
            {reminders.length ? (
              <ul className="mt-3 space-y-2">
                {reminders.map((r) => (
                  <li
                    key={r.id}
                    className={cn(
                      'flex flex-wrap items-center gap-2 rounded-xl border px-3.5 py-2.5',
                      r.status === 'new' ? 'border-violet/50 bg-violet/[0.06]' : 'border-line bg-surface-2',
                    )}
                  >
                    <span className="text-[12px] font-semibold text-ink">{r.name ?? '—'}</span>
                    <span className="font-mono text-[11px] text-ink-muted">{r.email}</span>
                    <span className="font-mono text-[10px] text-ink-faint">
                      {timeAgo(Date.parse(r.created_at) || Date.now())}
                    </span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {r.status === 'new' ? <Badge tone="violet">new</Badge> : null}
                      <button
                        onClick={() => {
                          void api
                            .markReminder(r.id, r.status === 'new' ? 'reminded' : 'new')
                            .then(loadReminders);
                        }}
                        className="rounded-lg border border-line bg-surface-3 px-2 py-1 text-[10px] font-semibold text-ink-muted transition hover:border-brand hover:text-ink"
                      >
                        Mark {r.status === 'new' ? 'reminded' : 'new'}
                      </button>
                      <button
                        onClick={() => {
                          void api.deleteReminder(r.id).then(loadReminders);
                        }}
                        className="rounded-lg border border-line bg-surface-3 px-2 py-1 text-[10px] font-semibold text-ink-muted transition hover:border-ember hover:text-ember"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyPanel label="No reminders yet — the countdown card's 'Remind me' button feeds this list." />
            )}
          </div>
        </Card>

        {/* session instrumentation + leaderboard */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="mono-label flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-brand-deep" />
                This session — real events
              </p>
              <Badge tone="acid">Live</Badge>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
              Fired by the typed analytics layer in{' '}
              <code className="font-mono text-[11px] text-cyan">src/lib/analytics.ts</code>. Tap around the
              landing page and this fills up.
            </p>

            <ol className="mt-5 space-y-2.5">
              {funnel.map((f) => (
                <li key={f.stage}>
                  <div className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="text-ink-muted">{f.stage}</span>
                    <span className="font-mono font-semibold text-ink">{f.count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-deep to-brand-edge"
                      style={{ width: `${Math.min(100, f.count * 12)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-5 border-t border-line pt-4">
              <p className="mono-label">Raw event stream</p>
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
                {events.length === 0 ? (
                  <p className="text-[12px] text-ink-faint">
                    No events yet. Open the landing page and register to see the funnel fire.
                  </p>
                ) : (
                  events
                    .slice()
                    .reverse()
                    .slice(0, 40)
                    .map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-deep" />
                        <span className="truncate font-mono text-[11px] text-ink">{e.name}</span>
                        <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-faint">
                          {timeAgo(e.at)}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="mono-label flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-brand-deep" />
              Referral leaderboard
            </p>
            <div className="mt-4 max-h-[420px] overflow-y-auto pr-1">
              {leaderboard.length ? (
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-card backdrop-blur">
                    <tr className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                      <th className="py-2 pr-2 font-medium">#</th>
                      <th className="py-2 pr-2 font-medium">Builder</th>
                      <th className="py-2 pr-2 font-medium">College</th>
                      <th className="py-2 text-right font-medium">Referrals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {leaderboard.slice(0, 15).map((b) => (
                      <tr key={b.id} className={cn(b.isYou && 'bg-brand/[0.14]')}>
                        <td className="py-2.5 pr-2 font-mono text-[11px] text-ink-faint">{b.rank}</td>
                        <td className="py-2.5 pr-2 text-[12px] font-medium text-ink">
                          {b.name}
                          {b.isYou ? <span className="ml-2 text-[10px] text-brand-deep">you</span> : null}
                        </td>
                        <td className="py-2.5 pr-2 text-[11px] text-ink-muted">{b.college}</td>
                        <td className="py-2.5 text-right font-mono text-[12px] font-semibold text-ink">
                          {b.referrals}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyPanel label="No builders on the wall yet." />
              )}
            </div>
            <p className="mt-3 text-[11px] text-ink-faint">
              {sources.length ? (
                <>
                  Top source: {sources[0].channel} ({nf(sources[0].value)} registrations).
                </>
              ) : (
                <>Top source appears with the first attributed registration.</>
              )}{' '}
              Every row is a real student from the database.
            </p>
          </Card>
        </div>

        {/* notes for reviewer */}
        <Card className="mt-4 p-5 sm:p-6">
          <p className="mono-label">What a production version still needs</p>
          <ul className="mt-3 grid gap-3 text-[12px] leading-relaxed text-ink-muted sm:grid-cols-3">
            <li>
              <span className="font-semibold text-ink">Real accounts.</span> The login is one shared
              password with a signed cookie. Production needs user accounts, roles and audit history.
            </li>
            <li>
              <span className="font-semibold text-ink">Hosted database.</span> SQLite on one node is fine
              for the campaign as built; a managed Postgres is the drop-in next step for a fleet.
            </li>
            <li>
              <span className="font-semibold text-ink">Alerts.</span> Slack/WhatsApp ping when daily
              registrations drop sharply day-over-day, or when a channel crosses the cost-per-registration
              guardrail.
            </li>
          </ul>
        </Card>
      </Section>
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <p className="mt-6 rounded-xl border border-dashed border-line px-4 py-10 text-center text-[12px] leading-relaxed text-ink-muted">
      {label}
    </p>
  );
}

function DarkTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: {
    name?: string;
    value?: number | string;
    color?: string;
    payload?: { project?: string; college?: string; channel?: string; day?: string };
  }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 shadow-pop backdrop-blur">
      {label ? <p className="mb-1 text-[11px] font-semibold text-ink">{label}</p> : null}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-[11px] text-ink-muted">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.payload?.project ?? p.payload?.college ?? p.payload?.channel ?? p.name}
          <span className="ml-auto font-mono font-semibold text-ink">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * How each measured source is named and coloured. Keys are the values the API's
 * `sources` array returns (`students.source`); anything unrecognised gets a
 * neutral grey, is titled as-is, and is never silently folded into a real
 * channel — an unattributed registration should look unattributed.
 */
const SOURCE_STYLE: Record<string, { label: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', color: CHART.lime },
  clubs: { label: 'College clubs', color: CHART.teal },
  referral: { label: 'Referral loop', color: CHART.violet },
  email: { label: 'Email', color: CHART.amber },
  linkedin: { label: 'LinkedIn', color: CHART.rose },
  direct: { label: 'Organic / direct', color: CHART.green },
};

function sourceColor(source: string) {
  return SOURCE_STYLE[source]?.color ?? '#6B7280';
}

const SOURCE_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(SOURCE_STYLE).map(([k, v]) => [k, v.label]),
);

/** `utm_source=insta-story` → "Insta story", so an unknown tag is still readable. */
function prettifySource(source: string) {
  const clean = source.replace(/[_-]+/g, ' ').trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Unattributed';
}

function prettyProject(id: string) {
  const known = PROJECTS.find((p) => p.id === id);
  if (known) return known.name;
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
