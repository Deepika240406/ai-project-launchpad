import { ArrowRight, Github, LayoutDashboard, Linkedin, Mail } from 'lucide-react';
import { Logo } from './Navbar';
import { useRegistration } from './RegistrationProvider';
import { RouteLink } from '../lib/router';

export function Footer() {
  const { openRegistration } = useRegistration();

  return (
    <footer className="border-t border-line bg-surface-2">
      <div className="container-x py-12">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ink-muted">
              An interactive growth prototype built for the NxtWave Growth Intern challenge. Free workshop:
              <span className="text-ink"> Build Your First AI Project in 60 Minutes.</span>
            </p>
            <button
              onClick={() => openRegistration({ source: 'footer' })}
              className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-brand-deep underline-offset-4 hover:underline"
            >
              Register free
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div>
            <p className="mono-label">Pages</p>
            <ul className="mt-4 space-y-2.5 text-[13px]">
              {[
                { label: 'Home', to: '/' },
                { label: 'The 60-minute workshop', to: '/workshop' },
                { label: 'All 10 projects', to: '/projects' },
                { label: 'Builder Wall & referrals', to: '/leaderboard' },
                { label: 'Growth plan (for reviewers)', to: '/strategy' },
                { label: 'Campaign dashboard', to: '/admin' },
              ].map((l) => (
                <li key={l.to}>
                  <RouteLink to={l.to} className="text-ink-muted transition-colors hover:text-ink">
                    {l.label}
                  </RouteLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mono-label">Free tools</p>
            <ul className="mt-4 space-y-2.5 text-[13px]">
              {[
                { label: 'Readiness check', to: '/quiz' },
                { label: 'Idea Vault', to: '/vault' },
                { label: 'Prompt Lab', to: '/prompt-lab' },
                { label: 'Card Studio', to: '/card' },
              ].map((l) => (
                <li key={l.to}>
                  <RouteLink to={l.to} className="text-ink-muted transition-colors hover:text-ink">
                    {l.label}
                  </RouteLink>
                </li>
              ))}
            </ul>

            <p className="mono-label mt-7">Also here</p>
            <ul className="mt-4 space-y-2.5 text-[13px]">
              <li>
                <RouteLink
                  to="/workshop"
                  className="inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-ink"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Agenda &amp; what&apos;s included
                </RouteLink>
              </li>
              <li>
                <RouteLink
                  to="/leaderboard"
                  className="inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-ink"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Your referral dashboard
                </RouteLink>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-ink"
                >
                  <Github className="h-3.5 w-3.5" />
                  Source code
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/prashanth-ar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-ink"
                >
                  <Linkedin className="h-3.5 w-3.5" />
                  Challenge contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="hairline my-8" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[11px] leading-relaxed text-ink-faint">
            Every campaign number — registrations, leaderboard, activity, channels — is read live from the
            campaign database. Student stories are real, published NxtWave testimonials —{" "}
            <span className="text-ink-muted">nothing here is fabricated.</span>
          </p>
          <p className="text-[11px] text-ink-faint">
            Built with React, TypeScript, Tailwind &amp; Framer Motion · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
