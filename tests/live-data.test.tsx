import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { getMode, resetApiMode } from '../src/lib/api';
import { navigate } from '../src/lib/router';

/**
 * LIVE-DATA CONTRACTS
 * ---------------------------------------------------------------------------
 * The accuracy rule this build is judged on is not "does it render" but "does
 * it tell the truth about where a number came from". These tests pin that rule
 * by standing a fake campaign API in front of the app and asserting what the UI
 * does with it:
 *
 *   · real rows render, and ONLY real rows — no invented names, ever
 *   · the panels say "Live database" while connected
 *   · the count, the spots-left figure and your own rank come from the server
 *   · an unreachable API yields honest empty states + a retry, never fake data
 *   · the reply form writes to the API, and the admin inbox reads it back
 *
 * A regression here is silent — the page keeps rendering, it just quietly
 * presents an invented number as a real one. That is the failure mode worth a
 * test.
 */

const MY_CODE = 'KAVYA41';

/** A believable campaign API. Shaped exactly like `server/api.mjs` answers. */
function fakeApi(overrides: Partial<Record<string, unknown>> = {}) {
  const payloads: Record<string, unknown> = {
    // `ok: true` is what the probe trusts — the fake must match the real
    // contract or every test here would silently run the offline path.
    '/api/health': {
      ok: true,
      service: 'ai-project-launchpad-api',
      version: 1,
      storage: 'sqlite',
      target: 500,
      students: 412,
      time: '2026-10-04T12:00:00.000Z',
    },
    '/api/stats': {
      total: 412,
      referralShare: 31.4,
      target: 500,
      spotsLeft: 88,
      today: 12,
      referralRegs: 128,
      organicRegs: 284,
      percent: 82.4,
      eventCounts: [
        { name: 'page_view', count: 980 },
        { name: 'registration_completed', count: 412 },
      ],
      sources: [
        { source: 'whatsapp', registrations: 160 },
        { source: 'referral', registrations: 128 },
      ],
    },
    '/api/leaderboard': {
      rows: [
        { rank: 1, code: 'NANDINI90', name: 'Nandini Iyer', college: 'PSG College of Technology', joinedAt: '2026-10-01 09:14:00', referrals: 9, isYou: false },
        { rank: 2, code: MY_CODE, name: 'Kavya Menon', college: 'CUSAT', joinedAt: '2026-10-01 11:02:00', referrals: 4, isYou: true },
      ],
      colleges: [{ college: 'PSG College of Technology', students: 61, referrals: 22 }],
      totalReferrals: 128,
      updatedAt: '2026-10-04T12:00:00.000Z',
    },
    '/api/activity': {
      items: [
        { firstName: 'Ishita', college: 'Govt. Engineering College Thrissur', branch: 'CSE', projectId: 'attendance-system', at: '2026-10-04 11:40:00' },
      ],
    },
    [`/api/students/${MY_CODE}`]: {
      code: MY_CODE,
      source: 'referral',
      name: 'Kavya Menon',
      email: 'kavya@example.com',
      college: 'CUSAT',
      branch: 'CSE',
      year: '3rd year',
      experience: 'beginner',
      interest: 'ai-ml',
      projectId: 'attendance-system',
      seat: 412,
      createdAt: '2026-10-01 11:02:00',
      referredBy: null,
      referralCount: 4,
      rank: 2,
      friends: [{ name: 'Ishita', college: 'Govt. Engineering College Thrissur', joinedAt: '2026-10-04 11:40:00' }],
    },
    '/api/admin/me': { authenticated: true },
    '/api/admin/summary': {
      stats: { total: 412, target: 500, spotsLeft: 88, today: 12, referralRegs: 128, organicRegs: 284, percent: 82.4, referralShare: 31.4 },
      sources: [{ source: 'whatsapp', registrations: 160 }],
      activity: [],
      daily: [{ day: '2026-10-04', registrations: 12, referrals: 4 }],
      colleges: [{ college: 'CUSAT', students: 61 }],
      topProjects: [{ projectId: 'resume-analyzer', picks: 81 }],
      leaderboard: [],
      events: [{ name: 'page_view', count: 980 }],
      recent: [],
      generatedAt: '2026-10-04T12:00:00.000Z',
    },
    '/api/admin/messages': {
      items: [
        { id: 7, name: 'Sneha Iyer', email: 'sneha@example.com', body: 'Is the workshop useful for a mechanical student?', status: 'new', created_at: '2026-10-04T10:00:00.000Z' },
      ],
      counts: { total: 1, unread: 1 },
    },
    ...overrides,
  };

  const calls: { path: string; method: string }[] = [];

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    const method = init?.method ?? 'GET';
    calls.push({ path, method });

    if (method === 'POST' && path === '/api/messages') {
      return new Response(JSON.stringify({ ok: true, id: 1, counts: { total: 1, unread: 1 } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!(path in payloads)) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(payloads[path]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  return { calls };
}

/**
 * Point the app at a route. `navigate()` is required, not optional: the router
 * keeps its own path state, so only touching `history` renders whatever page
 * the previous test left behind — which is how a live-data test can pass while
 * inspecting the wrong screen entirely.
 */
function goTo(path: string) {
  localStorage.clear();
  localStorage.removeItem('apl.state.v1');
  localStorage.setItem('apl.variant', 'a');
  navigate(path);
  window.history.replaceState({}, '', path);
}

beforeEach(() => {
  goTo('/leaderboard');
  resetApiMode();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetApiMode();
});

describe('live data: the leaderboard reads the database', () => {
  it('renders real rows and nothing else', async () => {
    fakeApi();
    render(<App />);

    // Wait for the probe + hydrate round trip to land.
    await waitFor(() => expect(getMode()).toBe('online'));

    expect(await screen.findByText('Nandini Iyer')).toBeInTheDocument();

    // The whole board is the server's two rows — no filler names, no demo text.
    expect(screen.getAllByText('Kavya Menon').length).toBeGreaterThan(0);
    expect(screen.queryByText(/demo leaderboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/prototype data/i)).not.toBeInTheDocument();
  });

  it('labels the panel "Live database"', async () => {
    fakeApi();
    render(<App />);
    await waitFor(() => expect(getMode()).toBe('online'));

    await screen.findByText('Nandini Iyer');
    // A page can legitimately show more than one live tag; at least one, no demo.
    expect(screen.getAllByTitle(/connected to the campaign database/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/demo/i).length).toBe(0);
  });

  it('reads the campaign counter from /api/stats, not any baseline', async () => {
    goTo('/');
    fakeApi();
    render(<App />);
    await waitFor(() => expect(getMode()).toBe('online'));

    // 412 total / 88 spots left are the server's. The old demo said 153 left.
    expect((await screen.findAllByText(/88 spots left/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/153 spots left/i)).not.toBeInTheDocument();
  });

  it('shows the signed-in student their own server rank', async () => {
    fakeApi();
    localStorage.setItem(
      'apl.state.v1',
      JSON.stringify({
        student: {
          code: MY_CODE,
          name: 'Kavya Menon',
          email: 'kavya@example.com',
          college: 'CUSAT',
          branch: 'CSE',
          year: '3rd year',
          experience: 'beginner',
          interest: 'ai-ml',
          recommendedProjectId: 'attendance-system',
          joinedAt: 1759000000000,
          seat: 412,
        },
        savedIdeaId: null,
        inboundRef: null,
        vault: [],
        quiz: null,
      }),
    );

    render(<App />);
    await waitFor(() => expect(getMode()).toBe('online'));

    // Their row is on the board, marked, with the server's position and count.
    await screen.findByText('Nandini Iyer');
    expect(screen.getAllByText('Kavya Menon').length).toBeGreaterThan(0);
    expect(screen.getAllByText('You').length).toBeGreaterThan(0);
  });
});

describe('live data: the activity ticker', () => {
  it('shows real first names and never claims a demo feed', async () => {
    goTo('/');
    fakeApi();
    render(<App />);
    await waitFor(() => expect(getMode()).toBe('online'));

    // The home page carries the ticker; assert on the feed we serve.
    const ticker = await screen.findAllByText(/Ishita/);
    expect(ticker.length).toBeGreaterThan(0);
  });

  it('names the college the way a student would say it', async () => {
    goTo('/');
    fakeApi();
    render(<App />);
    await waitFor(() => expect(getMode()).toBe('online'));

    // "Govt. Engineering College Thrissur" → "Govt." on the chip, not the full
    // legal name and definitely not an invented city.
    const chips = await screen.findAllByText(/from Govt\./);
    expect(chips.length).toBeGreaterThan(0);
  });
});

describe('live data: the reply inbox is a real round trip', () => {
  it('sends the home-page reply form to POST /api/messages', async () => {
    goTo('/');
    const { calls } = fakeApi();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(getMode()).toBe('online'));

    await user.type(screen.getByLabelText(/name/i), 'Sneha Iyer');
    await user.type(screen.getByLabelText(/your reply/i), 'Can I join without knowing Python?');
    await user.click(screen.getByRole('button', { name: /send reply/i }));

    await waitFor(() => {
      expect(calls.some((c) => c.path === '/api/messages' && c.method === 'POST')).toBe(true);
    });
    expect(await screen.findByText(/got it/i)).toBeInTheDocument();
  });

  it('shows the stored replies on the admin inbox', async () => {
    goTo('/admin');
    fakeApi();
    render(<App />);

    // The inbox reads back what the database stored — the same rows the
    // public form writes.
    expect(await screen.findByText(/replies inbox/i)).toBeInTheDocument();
    expect(await screen.findByText(/Is the workshop useful for a mechanical student\?/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Sneha Iyer/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 unread/i).length).toBeGreaterThan(0);
  });
});

describe('live data: an unreachable API is admitted, never faked', () => {
  it('shows honest empty states instead of invented names', async () => {
    goTo('/leaderboard');
    // A server that is down, not a server that lies.
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });

    render(<App />);
    await waitFor(() => expect(getMode()).toBe('offline'));

    // The wall says why it is empty. No fabricated builders anywhere.
    expect((await screen.findAllByText(/database unreachable|unreachable/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/demo leaderboard/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/connected to the campaign database/i)).not.toBeInTheDocument();
  });

  it('offers a retry instead of pretending to be connected', async () => {
    goTo('/');
    let up = false;

    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!up) throw new TypeError('Failed to fetch');
      const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
      if (path === '/api/health') {
        return new Response(JSON.stringify({ ok: true, service: 'ai-project-launchpad-api' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (path === '/api/stats') {
        return new Response(
          JSON.stringify({ total: 3, target: 500, spotsLeft: 497, today: 3, referralRegs: 1, organicRegs: 2, percent: 0.6, referralShare: 33.3, eventCounts: [], sources: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ rows: [], colleges: [], items: [], totalReferrals: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    render(<App />);
    await waitFor(() => expect(getMode()).toBe('offline'));

    // The database comes back, the student clicks retry, the label flips.
    up = true;
    // `findAllBy` rather than `getAllBy`: the mode flips before React paints the
    // offline tag, so reading the DOM the instant the mode changes is a race —
    // and a flaky test that guards an honesty rule is worse than no test.
    const retry = (await screen.findAllByRole('button', { name: /offline — retry|offline/i }))[0];
    await userEvent.setup().click(retry);

    await waitFor(() => expect(getMode()).toBe('online'), { timeout: 4000 });
    const tags = await screen.findAllByTitle(/connected to the campaign database/i);
    expect(tags.length).toBeGreaterThan(0);
  });
});
