import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { clearEvents } from '../src/lib/analytics';
import { navigate } from '../src/lib/router';

/**
 * Accessibility + keyboard contracts. These are the checks a reviewer will spot
 * instantly if broken: unlabelled icon buttons, a modal you cannot escape, and a
 * skip link that does not exist.
 */
function reset(path = '/') {
  localStorage.clear();
  clearEvents();
  localStorage.setItem('apl.variant', 'a');
  navigate(path);
  window.history.replaceState({}, '', path);
}

describe('accessibility', () => {
  beforeEach(() => reset('/'));

  it('exposes a skip link and a single h1', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: /skip to content/i })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('gives every button an accessible name', () => {
    render(<App />);
    const unnamed = screen
      .getAllByRole('button')
      .filter((b) => !(b.getAttribute('aria-label') || b.textContent?.trim()));
    expect(unnamed).toHaveLength(0);
  });

  it('labels the progress bars on the home page', () => {
    render(<App />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBeGreaterThan(0);
    bars.forEach((b) => expect(b).toHaveAttribute('aria-label'));
  });

  it('closes the registration modal on Escape and restores focus', async () => {
    const user = userEvent.setup();
    render(<App />);
    const trigger = within(document.getElementById('top') as HTMLElement).getByRole('button', {
      name: /reserve my free spot/i,
    });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    await user.keyboard('{Escape}');
    // AnimatePresence unmounts after the exit transition, so wait for it.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), { timeout: 3000 });
    expect(trigger).toHaveFocus();
  });

  it('supports keyboard selection in the experience radio group', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      within(document.getElementById('top') as HTMLElement).getByRole('button', {
        name: /reserve my free spot/i,
      }),
    );
    const dialog = await screen.findByRole('dialog');
    const group = within(dialog);

    /* fireEvent (not user-event) on purpose here: this assertion is about the
     * radio group's activation + roving-tabindex logic, and jsdom has no layout
     * engine, so user-event's pointer simulation is not deterministic about
     * which node receives the click inside a freshly-mounted dialog. The full
     * pointer path — a real click on a real radio inside the same dialog — is
     * covered in tests/funnel.test.tsx. */
    const beginner = group.getByRole('radio', { name: /beginner/i });
    fireEvent.click(beginner);
    await waitFor(() => expect(beginner).toHaveAttribute('aria-checked', 'true'));

    // Arrow keys move the selection, so the group is usable without a mouse.
    fireEvent.keyDown(beginner, { key: 'ArrowRight' });
    await waitFor(() =>
      expect(group.getByRole('radio', { name: /intermediate/i })).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    );
    expect(group.getByRole('radio', { name: /beginner/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('marks the hero generator button as busy while generating', async () => {
    const user = userEvent.setup();
    render(<App />);
    const hero = within(document.getElementById('top') as HTMLElement);
    await user.click(hero.getByRole('button', { name: /generate my project/i }));
    expect(await hero.findByRole('button', { name: /matching your project/i })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('marks invalid registration fields with aria-invalid', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      within(document.getElementById('top') as HTMLElement).getByRole('button', {
        name: /reserve my free spot/i,
      }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^continue$/i }));
    expect(within(dialog).getByLabelText(/full name/i)).toHaveAttribute('aria-invalid', 'true');
  });
});
