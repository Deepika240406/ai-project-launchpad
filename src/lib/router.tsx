import { useSyncExternalStore, type ReactNode } from 'react';

/**
 * Tiny 40-line router.
 *
 * Why not react-router: this prototype has to survive three environments —
 *  - `npm run dev` (server with SPA fallback, so /admin works directly)
 *  - a static host with a rewrite rule (same)
 *  - a single self-contained index.html opened over file:// or inside a
 *    sandboxed preview iframe (where /admin would 404 in the way a real URL works)
 *
 * So: links are always intercepted client-side, and the initial route is read
 * from either the pathname OR the hash. Both `/#/admin` and `/admin` work.
 */

export type Route = '/' | '/admin' | '/strategy' | '/join' | string;

function readLocation(): Route {
  if (typeof window === 'undefined') return '/';
  const hash = window.location.hash.replace(/^#/, '');
  if (hash && hash.startsWith('/')) return hash;
  const path = window.location.pathname.replace(/\/index\.html$/, '');
  return path === '' ? '/' : path;
}

let current: Route = readLocation();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => current, () => '/');
}

/**
 * Path-based history only works on a real http(s) origin. Inside a sandboxed
 * preview iframe, a file:// document or a blob/srcdoc document the origin is
 * opaque and pushState throws — there we fall back to the hash form, which
 * always works. The route state itself is kept in memory either way, so
 * navigation is never dependent on the URL being writable.
 */
function canUsePaths(): boolean {
  try {
    return /^https?:$/.test(window.location.protocol);
  } catch {
    return false;
  }
}

export function navigate(to: Route, opts: { replace?: boolean; keepScroll?: boolean } = {}) {
  if (to === current) return;
  current = to;

  const url = canUsePaths() ? to : `#${to}`;
  try {
    if (opts.replace) window.history.replaceState({}, '', url);
    else window.history.pushState({}, '', url);
  } catch {
    try {
      window.location.hash = to;
    } catch {
      /* opaque origin: in-memory routing still works */
    }
  }

  if (!opts.keepScroll) {
    try {
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch {
      /* ignore */
    }
  }
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    current = readLocation();
    emit();
  });
  window.addEventListener('hashchange', () => {
    const next = readLocation();
    if (next !== current) {
      current = next;
      emit();
    }
  });
}

/** Anchor that always navigates client-side, never triggering a server request. */
export function RouteLink({
  to,
  children,
  className,
  onClick,
  ...rest
}: {
  to: Route;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>) {
  return (
    <a
      {...rest}
      href={to}
      className={className}
      onClick={(e) => {
        // Let people open a new tab with a modifier key if the host supports it.
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        navigate(to);
        onClick?.();
      }}
    >
      {children}
    </a>
  );
}
