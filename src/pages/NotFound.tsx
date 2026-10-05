import { ArrowLeft, Compass } from 'lucide-react';
import { RouteLink } from '../lib/router';
import { Button } from '../components/ui';

export function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface-3">
          <Compass className="h-5 w-5 text-ink-muted" />
        </span>
        <p className="mono-label mt-5">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          This page isn&apos;t part of the prototype.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
          The site has four public pages — home, the workshop, the project catalogue and the Builder Wall —
          plus the growth write-up and the campaign dashboard.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <RouteLink to="/">
            <Button>
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Button>
          </RouteLink>
          <RouteLink to="/projects">
            <Button variant="secondary">Projects</Button>
          </RouteLink>
          <RouteLink to="/workshop">
            <Button variant="secondary">Workshop</Button>
          </RouteLink>
          <RouteLink to="/strategy">
            <Button variant="secondary">Growth plan</Button>
          </RouteLink>
        </div>
      </div>
    </main>
  );
}
