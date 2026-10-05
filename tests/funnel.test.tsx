import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { clearEvents, getEvents } from '../src/lib/analytics';
import { PROJECTS } from '../src/data/projects';
import { makeReferralCode } from '../src/lib/utils';
import { navigate } from '../src/lib/router';

/**
 * These tests walk the exact path a reviewer walks in the 3-minute demo:
 * hero → project generator → 3-step registration → success screen → referral loop,
 * plus the simulator and the two secondary routes.
 *
 * They are also the regression net for the things that would embarrass a live demo:
 * form validation, the recommendation rule engine, analytics firing, and routing.
 */

type User = ReturnType<typeof userEvent.setup>;

function resetBrowser(path = '/') {
  localStorage.clear();
  clearEvents();
  // Pin the A/B variant so assertions are deterministic.
  localStorage.setItem('apl.variant', 'a');
  navigate(path);
  window.history.replaceState({}, '', path);
}

const hero = () => within(document.getElementById('top') as HTMLElement);
const simulator = () => within(document.getElementById('simulator') as HTMLElement);

async function openRegistrationFromHero(user: User) {
  await user.click(hero().getByRole('button', { name: /reserve my free spot/i }));
  // findBy* so the assertion retries while the modal mounts.
  return screen.findByRole('dialog');
}

async function completeStep1(user: User, dialog: HTMLElement) {
  const scope = within(dialog);
  await user.type(await scope.findByLabelText(/full name/i), 'Deepika Reddy');
  await user.type(scope.getByLabelText(/^email$/i), 'deepika@college.edu');
  await user.type(scope.getByLabelText(/college/i), 'SSN College of Engineering');
  await user.selectOptions(await scope.findByRole('combobox', { name: /branch/i }), 'CSE');
  await user.selectOptions(scope.getByRole('combobox', { name: /year/i }), 'Final year (2026)');
  await user.click(scope.getByRole('radio', { name: /beginner/i }));
  await user.click(scope.getByRole('button', { name: /^continue$/i }));
}

describe('AI Project Launchpad — funnel', () => {
  beforeEach(() => resetBrowser('/'));

  it('renders the hero with the primary promise and trust indicators', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/60 minutes/i);
    expect(hero().getByRole('button', { name: /reserve my free spot/i })).toBeInTheDocument();
    expect(screen.getAllByText(/beginner friendly/i).length).toBeGreaterThan(0);
    // No fabricated baseline: with nobody registered the site says so — the
    // seat cap is a product rule and the only number the hero guarantees.
    expect(screen.getAllByText(/seat cap is 500/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/demo campaign data/i)).not.toBeInTheDocument();
  });

  it('generates a project from the hero generator', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(hero().getByRole('button', { name: /generate my project/i }));

    await waitFor(
      () => {
        expect(hero().getByRole('button', { name: /build this with me/i })).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
    const html = document.getElementById('top')?.innerHTML ?? '';
    expect(PROJECTS.some((p) => html.includes(p.name))).toBe(true);
  });

  it('completes the 3-step registration and shows the success screen with a referral code', async () => {
    const user = userEvent.setup();
    render(<App />);

    const dialog = await openRegistrationFromHero(user);
    const dlg = within(dialog);

    await completeStep1(user, dialog);
    await user.click(await dlg.findByRole('radio', { name: /ai \/ ml/i }));
    await user.click(dlg.getByRole('button', { name: /show my project/i }));

    const reserve = await dlg.findByRole('button', { name: /reserve my free spot/i });
    await waitFor(() => expect(reserve).toBeEnabled(), { timeout: 4000 });
    await user.click(reserve);

    const expected = makeReferralCode('Deepika Reddy', 'deepika@college.edu');
    // The code appears more than once on purpose (code box + ambassador poster).
    const codes = await dlg.findAllByText(expected, undefined, { timeout: 5000 });
    expect(codes.length).toBeGreaterThan(0);
    expect(dlg.getByText('Registered', { exact: false })).toBeInTheDocument();
    expect(dlg.getByRole('button', { name: /share on whatsapp/i })).toBeInTheDocument();
    expect(dlg.getByText(/3 friends joined/i)).toBeInTheDocument();
    // The success screen is a launchpad, not a dead end: the game plan and the
    // seat map language are part of the funnel.
    expect(dlg.getAllByText(/your next 3 moves/i).length).toBeGreaterThan(0);
  }, 20000);

  it('fires the analytics events the growth model depends on', async () => {
    const user = userEvent.setup();
    render(<App />);

    const dialog = await openRegistrationFromHero(user);
    const dlg = within(dialog);
    await completeStep1(user, dialog);
    await user.click(await dlg.findByRole('radio', { name: /data science/i }));
    await user.click(dlg.getByRole('button', { name: /show my project/i }));
    const reserve = await dlg.findByRole('button', { name: /reserve my free spot/i });
    await waitFor(() => expect(reserve).toBeEnabled(), { timeout: 4000 });
    await user.click(reserve);
    await waitFor(() => expect(getEvents().some((e) => e.name === 'registration_completed')).toBe(true), {
      timeout: 5000,
    });

    const names = getEvents().map((e) => e.name);
    expect(names).toContain('page_view');
    expect(names).toContain('registration_started');
    expect(names).toContain('registration_step_completed');
    expect(names).toContain('registration_completed');
  }, 20000);

  it('hydrates a registered student with a real referral dashboard — and no simulator', async () => {
    // Seeding storage (rather than re-running the modal) also tests the
    // persistence path a returning student hits when they reopen the link.
    resetBrowser('/leaderboard');
    localStorage.setItem(
      'apl.state.v1',
      JSON.stringify({
        student: {
          name: 'Deepika Reddy',
          email: 'deepika@college.edu',
          college: 'SSN College of Engineering',
          branch: 'CSE',
          year: 'Final year (2026)',
          experience: 'Beginner',
          interest: 'ai-ml',
          recommendedProjectId: 'resume-analyzer',
          code: 'DEEPIKA47',
          joinedAt: Date.now(),
        },
        referrals: [],
        savedIdeaId: null,
        inboundRef: null,
      }),
    );

    render(<App />);

    // The referral dashboard renders with the persisted code.
    const referrals = within(document.getElementById('referrals') as HTMLElement);
    expect(referrals.getAllByText('DEEPIKA47').length).toBeGreaterThan(0);

    // A referral now counts only when a real person registers with the link,
    // so there is no simulator button and the list starts honestly empty.
    expect(referrals.queryByRole('button', { name: /simulate/i })).not.toBeInTheDocument();
    expect(referrals.getAllByText(/nobody yet/i).length).toBeGreaterThan(0);
    // Progress runs to the NEXT milestone — with zero referrals that is 0 / 1.
    expect(referrals.getAllByText(/0 \/ 1/).length).toBeGreaterThan(0);
  }, 20000);

  it('registers through the 10-second quick join with just name, email, college', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(hero().getByRole('button', { name: /reserve my free spot/i }));
    const dialog = await screen.findByRole('dialog');
    const dlg = within(dialog);

    // Switch to quick mode: the same modal, three fields, no steps after.
    await user.click(dlg.getByRole('tab', { name: /quick join/i }));
    await user.type(dlg.getByLabelText(/full name/i), 'Quick Singh');
    await user.type(dlg.getByLabelText(/^email$/i), 'quick@college.edu');
    await user.type(dlg.getByLabelText(/college/i), 'Anna University');

    await user.click(dlg.getByRole('button', { name: /reserve my seat/i }));

    const expected = makeReferralCode('Quick Singh', 'quick@college.edu');
    const codes = await dlg.findAllByText(expected, undefined, { timeout: 5000 });
    expect(codes.length).toBeGreaterThan(0);
    // No project-match step was needed to claim the seat.
    expect(dlg.queryByRole('button', { name: /show my project/i })).not.toBeInTheDocument();
  }, 20000);

  it('validates the registration form instead of submitting empty', async () => {
    const user = userEvent.setup();
    render(<App />);

    const dialog = await openRegistrationFromHero(user);
    await user.click(within(dialog).getByRole('button', { name: /^continue$/i }));

    expect(await within(dialog).findByText(/please enter your full name/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/enter a valid email/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/pick one — there is no wrong answer/i)).toBeInTheDocument();
  });

  it('runs the project simulator end to end on the projects page', async () => {
    resetBrowser('/projects');
    const user = userEvent.setup();
    render(<App />);

    const sim = simulator();
    await user.click(sim.getByRole('radio', { name: /ai \/ ml/i }));
    await user.click(await sim.findByRole('radio', { name: /beginner/i }));
    await user.click(await sim.findByRole('button', { name: /getting a job/i }));
    await user.click(sim.getByRole('button', { name: /generate my project/i }));

    await waitFor(() => expect(sim.getByText(/why this one/i)).toBeInTheDocument(), { timeout: 4000 });
    expect(sim.getByRole('button', { name: /save this idea/i })).toBeInTheDocument();
  }, 20000);
});

describe('secondary routes', () => {
  it('locks the campaign dashboard behind a login at /admin', async () => {
    resetBrowser('/admin');
    const user = userEvent.setup();
    render(<App />);

    // The gate first: a password field, and no dashboard panels behind it.
    expect(await screen.findByText(/campaign dashboard/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.queryByText(/daily registrations/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/replies inbox/i)).not.toBeInTheDocument();

    // A failed unlock says so instead of silently opening anything.
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /unlock dashboard/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/wrong password|unreachable/i);
    expect(screen.queryByText(/daily registrations/i)).not.toBeInTheDocument();
  }, 20000);

  it('renders the growth strategy page at /strategy', () => {
    resetBrowser('/strategy');
    render(<App />);
    expect(screen.getAllByText(/the target student/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ai \+ learning notes/i).length).toBeGreaterThan(0);
  });

  it('shows a 404 for unknown routes', () => {
    resetBrowser('/nope');
    render(<App />);
    expect(screen.getByText(/part of the prototype/i)).toBeInTheDocument();
  });
});

describe('recommendation engine', () => {
  it('never recommends an Intermediate project to a total beginner who is unsure', async () => {
    const { recommendProject } = await import('../src/lib/recommend');
    const rec = recommendProject({ interest: 'unsure', experience: 'Beginner', problem: 'career' });
    expect(rec.project.difficulty).toBe('Beginner');
    expect(rec.reasons.length).toBeGreaterThan(0);
  });

  it('honours a locked project chosen from a project card', async () => {
    const { suggestForInterest } = await import('../src/lib/matching');
    expect(suggestForInterest('data', 'Beginner', 'attendance-system').id).toBe('attendance-system');
  });

  it('is deterministic for identical inputs', async () => {
    const { recommendProject } = await import('../src/lib/recommend');
    const input = { interest: 'security', experience: 'Intermediate', problem: 'productivity' } as const;
    expect(recommendProject(input).project.id).toBe(recommendProject(input).project.id);
  });

  it('routes a security-interested student to the security project', async () => {
    const { recommendProject } = await import('../src/lib/recommend');
    expect(recommendProject({ interest: 'security', experience: 'Beginner' }).project.id).toBe(
      'phishing-detector',
    );
  });
});
