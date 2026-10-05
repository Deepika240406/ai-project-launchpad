import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { clearEvents, getEvents } from '../src/lib/analytics';
import { navigate } from '../src/lib/router';

/**
 * Multi-page contracts: every nav item resolves to a real page, the active page
 * is marked for assistive tech, per-route SEO is written, and the registration
 * funnel is reachable from all four public pages.
 */

function reset(path = '/') {
  localStorage.clear();
  clearEvents();
  localStorage.setItem('apl.variant', 'a');
  navigate(path);
  window.history.replaceState({}, '', path);
}

const nav = () => within(screen.getByRole('banner'));

describe('site navigation', () => {
  beforeEach(() => reset('/'));

  it('renders all four public pages from their URLs', () => {
    const pages: [string, RegExp][] = [
      ['/', /60 minutes/i],
      ['/workshop', /sixty minutes, planned/i],
      ['/projects', /ten projects\./i],
      ['/leaderboard', /bring 3 friends/i],
    ];

    pages.forEach(([path, heading]) => {
      reset(path);
      const { unmount } = render(<App />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(heading);
      unmount();
    });
  });

  it('navigates between pages with the navbar and marks the active page', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(nav().getByRole('link', { name: 'Projects' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/ten projects/i);
    expect(nav().getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
    expect(nav().getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');

    await user.click(nav().getByRole('link', { name: 'Leaderboard' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/bring 3 friends/i);

    await user.click(nav().getByRole('link', { name: 'Workshop' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/sixty minutes/i);

    await user.click(nav().getByRole('link', { name: 'Home' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/60 minutes/i);
  });

  it('opens the registration modal from every public page', async () => {
    const user = userEvent.setup();
    for (const path of ['/', '/workshop', '/projects', '/leaderboard']) {
      reset(path);
      const { unmount } = render(<App />);
      await user.click(screen.getByRole('button', { name: /register free for the workshop/i }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(within(screen.getByRole('dialog')).getByText(/let's personalize your workshop/i)).toBeInTheDocument();
      unmount();
    }
  }, 30000);

  it('keeps a cross-page route to registration (CTA band → register → projects)', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Home's CTA band button
    await user.click(screen.getAllByRole('button', { name: /reserve my free spot/i })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // …and then continue to a different page without losing the session
    await user.click(nav().getByRole('link', { name: 'Projects' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/ten projects/i);
  }, 30000);

  it('links the home teasers to their deeper pages', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('link', { name: /see all 10 projects/i }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/ten projects/i);
  });

  it('renders the simulator on the projects page, not the home page', async () => {
    reset('/projects');
    render(<App />);
    const simulator = document.getElementById('simulator');
    expect(simulator).not.toBeNull();
    expect(within(simulator as HTMLElement).getByText(/don't know what to build\?/i)).toBeInTheDocument();
    expect(document.getElementById('top')).toBeNull();
  });

  it('renders the referral dashboard and the wall on the leaderboard page', () => {
    reset('/leaderboard');
    render(<App />);
    expect(document.getElementById('referrals')).not.toBeNull();
    expect(document.getElementById('leaderboard')).not.toBeNull();
    expect(screen.getAllByText(/top builders this week/i).length).toBeGreaterThan(0);
  });

  it('writes per-route SEO (title, canonical, robots)', async () => {
    reset('/admin');
    render(<App />);
    await waitFor(() =>
      expect(document.title).toBe('Campaign Dashboard | AI Project Launchpad'),
    );
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex,nofollow',
    );

    reset('/projects');
    render(<App />);
    await waitFor(() => expect(document.title).toMatch(/10 Beginner AI Project Ideas/i));
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      expect.stringContaining('/projects'),
    );
  });

  it('tracks page_view for each page visited', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(nav().getByRole('link', { name: 'Workshop' }));
    await waitFor(() => expect(getEvents().filter((e) => e.name === 'page_view').length).toBeGreaterThan(1));
  });
});
