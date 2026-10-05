import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Guarantee a clean document between tests. Portalled modal trees survive a
 * plain unmount race in jsdom, and leftover duplicate ids make label lookups
 * resolve against the wrong element.
 */
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

/**
 * jsdom is missing the browser APIs this app touches (observers, matchMedia,
 * clipboard, scrollIntoView). Rather than guarding every call site with
 * `typeof window !== 'undefined'`, the tests polyfill them once here — the same
 * approach a CI environment would use.
 */

if (!('IntersectionObserver' in globalThis)) {
  class IO {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(target: Element) {
      // Report as in-view so scroll-triggered counters/reveals resolve.
      this.cb(
        [{ isIntersecting: true, intersectionRatio: 1, target } as unknown as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  // @ts-expect-error test polyfill
  globalThis.IntersectionObserver = IO;
}

if (!('ResizeObserver' in globalThis)) {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error test polyfill
  globalThis.ResizeObserver = RO;
}

/**
 * Tests run with `prefers-reduced-motion: reduce`, which is a legitimate and
 * valuable configuration: it exercises the reduced-motion branches of Counter,
 * Reveal and the generator, and it keeps rAF-driven animation frames from
 * interleaving with assertions (unsettled React updates => flaky DOM reads).
 */
if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.matchMedia = ((query: string) => ({
    matches: /prefers-reduced-motion/.test(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

if (!window.scrollTo) {
  window.scrollTo = (() => {}) as unknown as typeof window.scrollTo;
}

if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: async () => undefined,
    },
    configurable: true,
  });
}

// Silence the noisy "not implemented" errors jsdom throws for navigation.
window.addEventListener('error', (e) => {
  if (String(e.message).includes('Not implemented')) e.preventDefault();
});
