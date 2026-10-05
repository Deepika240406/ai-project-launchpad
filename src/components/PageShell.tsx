import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { StickyCta } from './StickyCta';
import { Button, Section, Reveal } from './ui';
import { InboundReferralBanner } from './SharePanel';
import { useRegistration } from './RegistrationProvider';
import { track } from '../lib/analytics';
import { RouteLink, type Route } from '../lib/router';
import { cn } from '../lib/utils';

/**
 * Site chrome shared by every public page.
 * Navbar + main + footer + the mobile sticky CTA, so the primary action is
 * always one thumb away no matter which page a student lands on.
 */
export function PageShell({ children }: { children: ReactNode }) {
  const { openRegistration } = useRegistration();
  return (
    <>
      <InboundReferralBanner />
      <Navbar onRegister={() => openRegistration({ source: 'navbar' })} />
      <main id="main">{children}</main>
      <Footer />
      <StickyCta />
    </>
  );
}

/** Masthead for a sub-page: same hierarchy as the hero, less height. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  actions,
  meta,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-14">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-[-14rem] h-[30rem] w-[58rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(91,61,245,0.10),transparent)]" />
        <div className="absolute right-[-6rem] top-10 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(closest-side,rgba(14,147,176,0.09),transparent)]" />
      </div>

      <div className="container-x">
        <div className="max-w-3xl">
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="title-lg mt-5">{title}</h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-muted sm:text-base">
            {subtitle}
          </p>
          {actions ? <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div> : null}
          {meta ? <div className="mt-7">{meta}</div> : null}
        </div>
      </div>
    </section>
  );
}

/**
 * End-of-page conversion band. Every sub-page closes with one of these so a
 * student who reads to the bottom never has to scroll back up to act.
 */
export function CtaBand({
  title,
  body,
  source,
  primaryLabel = 'Reserve my free spot',
  secondary,
  register = true,
}: {
  title: ReactNode;
  body: ReactNode;
  source: string;
  primaryLabel?: string;
  secondary?: { label: string; to: Route };
  register?: boolean;
}) {
  const { openRegistration } = useRegistration();

  return (
    <Section className="pb-20 pt-4">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface-2 p-7 backdrop-blur-xl sm:p-9">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(204,255,77,0.42),transparent)]"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h2>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{body}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row lg:flex-col">
              {register ? (
                <Button
                  size="lg"
                  className="group"
                  onClick={() => {
                    track('cta_clicked', { location: source });
                    openRegistration({ source });
                  }}
                >
                  <span aria-hidden>🚀</span>
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              ) : null}
              {secondary ? (
                <RouteLink to={secondary.to} className="btn btn-secondary btn-lg">
                  {secondary.label}
                  <ArrowRight className="h-4 w-4" />
                </RouteLink>
              ) : null}
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/**
 * Compact in-page navigation used at the top of sub-pages: it keeps the
 * "where am I / what's next" question answered without a scroll.
 */
export function NextSteps({
  items,
  className,
}: {
  items: { label: string; detail: string; to: Route }[];
  className?: string;
}) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-3', className)}>
      {items.map((item) => (
        <RouteLink
          key={item.to}
          to={item.to}
          className="group rounded-2xl border border-line bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/70"
        >
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            {item.label}
            <ArrowRight className="h-3.5 w-3.5 text-brand-deep transition-transform group-hover:translate-x-0.5" />
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{item.detail}</p>
        </RouteLink>
      ))}
    </div>
  );
}
