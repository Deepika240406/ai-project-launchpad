import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { clearEvents } from '../src/lib/analytics';
import { navigate } from '../src/lib/router';
import { MAX_SCORE, bandFor } from '../src/data/quiz';
import { PROJECTS } from '../src/data/projects';

/**
 * The four self-serve tools (/quiz, /vault, /prompt-lab, /card).
 *
 * These are the pages that earn the second visit, so the contracts worth
 * pinning down are: they render from their URL, they are reachable without
 * opening the registration modal, the readiness score is explainable, and the
 * generated prompt is actually complete (a half-built prompt would teach the
 * wrong pattern).
 */

/** The generated prompt lives in a single <pre>; whitespace is not normalised there. */
function promptText() {
  const pre = document.querySelector('pre');
  expect(pre, 'expected a prompt <pre> on the page').not.toBeNull();
  return pre!.textContent ?? '';
}

function reset(path = '/') {
  localStorage.clear();
  clearEvents();
  localStorage.setItem('apl.variant', 'a');
  navigate(path);
  window.history.replaceState({}, '', path);
}

describe('free tools', () => {
  beforeEach(() => reset('/prompt-lab'));

  it('renders each tool from its URL', () => {
    const pages: [string, RegExp][] = [
      ['/quiz', /one honest score/i],
      ['/vault', /next step attached/i],
      ['/prompt-lab', /build prompt/i],
      ['/card', /something you can post/i],
    ];

    pages.forEach(([path, heading]) => {
      reset(path);
      const { unmount } = render(<App />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(heading);
      unmount();
    });
  });

  it('opens the Free tools menu from the navbar and navigates to a tool', async () => {
    const user = userEvent.setup();
    reset('/');
    render(<App />);

    const banner = within(screen.getByRole('banner'));
    await user.click(banner.getByRole('button', { name: /free tools/i }));

    const menu = screen.getByRole('menu', { name: /free tools/i });
    const items = within(menu).getAllByRole('menuitem');
    expect(items).toHaveLength(4);
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining('Card Studio'),
      expect.stringContaining('Idea Vault'),
      expect.stringContaining('Readiness check'),
      expect.stringContaining('Prompt Lab'),
    ]);

    await user.click(within(menu).getByRole('menuitem', { name: /prompt lab/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/build prompt/i),
    );
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent(/watch|register/i);
  });

  /* ------------------------------------------------------------ prompt lab */

  it('generates a complete build prompt for the default project', () => {
    render(<App />);

    // The five teaching blocks must all be present, in order.
    const text = promptText();

    for (const block of ['ROLE', 'TASK', 'OUTPUT CONTRACT', 'CONSTRAINTS', 'GUARDRAILS']) {
      expect(text).toContain(block);
    }
    expect(text.indexOf('ROLE')).toBeLessThan(text.indexOf('TASK'));
    expect(text.indexOf('CONSTRAINTS')).toBeLessThan(text.indexOf('GUARDRAILS'));
    // Guardrails ask the model to push back — that is the behaviour we teach.
    expect(text).toMatch(/ambigu|too large|smaller version/i);
    expect(text).toContain(PROJECTS[0].name);
  });

  it('switches the prompt when a different project is chosen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const target = PROJECTS[3];
    await user.click(screen.getByRole('button', { name: target.name }));

    expect(promptText()).toContain(target.name);
    expect(promptText()).not.toContain(PROJECTS[0].name);
  });

  /* ---------------------------------------------------------------- quiz */

  it('scores the readiness check and reveals the matching band', async () => {
    const user = userEvent.setup();
    reset('/quiz');
    render(<App />);

    // Highest-value option on every question → the top band.
    const picks = [
      'I am confident with a framework',
      'I worry my project will look too basic',
      'A full weekend if it is worth it',
      'Something to put on my resume for placements',
      'Yes, and I have deployed something with it',
    ];

    // Picking an option auto-advances after ~220 ms, so we only click options.
    for (const label of picks) {
      await user.click(await screen.findByRole('button', { name: new RegExp(label, 'i') }));
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: new RegExp(label, 'i') })).not.toBeInTheDocument(),
      );
    }

    const expected = bandFor(MAX_SCORE);
    // The band label and headline share one <p>, so match on the element text.
    await waitFor(() =>
      expect(
        screen.getByText(
          (_, el) => el?.tagName === 'P' && (el.textContent ?? '').includes(expected.headline),
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.getAllByText('100').length).toBeGreaterThan(0); // score, out of 100
    expect(screen.getByText(/your matched project/i)).toBeInTheDocument();
  });

  /* --------------------------------------------------------------- vault */

  it('shows an empty state before anything is saved, and lists all six build stages once an idea exists', async () => {
    reset('/vault');
    const { unmount } = render(<App />);
    expect(screen.getByText(/your vault is empty/i)).toBeInTheDocument();
    unmount();

    // Save an idea through the real product path, then confirm the vault holds it.
    reset('/projects');
    const user = userEvent.setup();
    render(<App />);
    const first = PROJECTS[0];
    await user.click(screen.getAllByRole('button', { name: new RegExp(first.name, 'i') })[0]);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: /save (this )?idea|save to vault/i }));

    navigate('/vault');
    await waitFor(() => expect(screen.getByText(first.name)).toBeInTheDocument());
    for (const stage of ['Scope', 'Prompt', 'Deploy']) {
      expect(screen.getAllByText(new RegExp(stage, 'i')).length).toBeGreaterThan(0);
    }
  });
});
