import { useEffect } from 'react';
import { AppProvider } from './store/AppStore';
import { RegistrationProvider } from './components/RegistrationProvider';
import { Toaster } from './components/ui';
import { Home } from './pages/Home';
import { Workshop } from './pages/Workshop';
import { Projects } from './pages/Projects';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { Strategy } from './pages/Strategy';
import { Admin } from './pages/Admin';
import { CardStudio } from './pages/CardStudio';
import { Vault } from './pages/Vault';
import { Quiz } from './pages/Quiz';
import { PromptLab } from './pages/PromptLab';
import { NotFound } from './pages/NotFound';
import { useRoute } from './lib/router';
import { track } from './lib/analytics';

/**
 * SITE MAP
 *   /            Home            — the funnel: hero, momentum, pain, teasers
 *   /workshop    Workshop        — agenda, what's inside, FAQ
 *   /projects    Projects        — catalogue + AI project simulator
 *   /leaderboard Leaderboard     — referral engine + Builder Wall
 *   /card        Card Studio     — shareable project card + QR + PNG export
 *   /vault       Idea Vault      — saved ideas, notes, 6-stage build checklist
 *   /quiz        Readiness check — 5 questions, score, matched project
 *   /prompt-lab  Prompt Lab      — generates the build prompt for a project
 *   /join        Referral landing — Home with the registration modal auto-opened
 *   /strategy    Growth plan     — for reviewers: model, budget, AI notes
 *   /admin       Dashboard       — live campaign read + event stream
 *
 * Public pages share <PageShell> (navbar, footer, sticky mobile CTA) so the
 * primary action is available on every page; /strategy and /admin are their own
 * surfaces with their own headers.
 */

interface RouteMeta {
  title: string;
  description: string;
  /** Demo/internal surfaces stay out of the index. */
  noindex?: boolean;
}

const META: Record<string, RouteMeta> = {
  '/': {
    title: 'Build Your First AI Project in 60 Minutes | NxtWave',
    description:
      'Join a free beginner-friendly workshop and build your first AI-powered project in just 60 minutes.',
  },
  '/workshop': {
    title: 'The 60-Minute Workshop — Agenda & What’s Included | NxtWave',
    description:
      'Minute-by-minute agenda for NxtWave’s free AI workshop: choose an idea, build the core, connect AI, deploy. No prerequisites, free tools only.',
  },
  '/projects': {
    title: '10 Beginner AI Project Ideas You Can Build in 60 Minutes | NxtWave',
    description:
      'AI Resume Analyzer, Interview Coach, Study Buddy and more — every project scoped to finish in one 60-minute session with free tools. Match yourself with the simulator.',
  },
  '/leaderboard': {
    title: 'Builder Wall — Referral Leaderboard | AI Project Launchpad',
    description:
      'Get your referral code, invite classmates and unlock elite perks. Live leaderboard of the builders bringing the most students.',
  },
  '/join': {
    title: 'You’ve been invited — free AI workshop | NxtWave',
    description:
      'A friend invited you to NxtWave’s free workshop. Pick a project, register in 40 seconds, and ship a working AI prototype in 60 minutes.',
  },
  '/card': {
    title: 'Project Card Studio — Make a Shareable AI Project Card | NxtWave',
    description:
      'Turn your AI project into a 1080x1350 share card with your name and a QR code that links back to your referral. Download the PNG, post it, done.',
  },
  '/vault': {
    title: 'Idea Vault — Shortlist and Build Checklist | AI Project Launchpad',
    description:
      'Keep your AI project ideas, notes and priorities in one place, then work the six-stage build checklist: scope, input, output, prompt, wire, deploy.',
  },
  '/quiz': {
    title: 'AI Project Readiness Check — Free 2-Minute Score | NxtWave',
    description:
      'Five questions, one honest score out of 100, and the AI project difficulty that matches where you actually are. No signup required.',
  },
  '/prompt-lab': {
    title: 'Prompt Lab — Build the Prompt for Your AI Project | NxtWave',
    description:
      'Generate a build prompt with role, task, output contract, constraints and guardrails — then learn why each block exists so the pattern transfers.',
  },
  '/strategy': {
    title: 'Growth Strategy & AI Notes | AI Project Launchpad',
    description:
      'The growth plan behind the AI Project Launchpad: target student, channels, the 500-registration model, ₹2,000 budget and the AI decisions I rejected.',
  },
  '/admin': {
    title: 'Campaign Dashboard | AI Project Launchpad',
    description:
      'Prototype campaign dashboard: registrations, channel mix, colleges, top projects and referrals.',
    noindex: true,
  },
};

/** Writes per-route <title>, description, canonical and robots directive. */
function useSeo(route: string) {
  useEffect(() => {
    const meta = META[route] ?? {
      title: 'Page not found | AI Project Launchpad',
      description: 'This page is not part of the prototype.',
      noindex: true,
    };

    document.title = meta.title;

    const setTag = (selector: string, attrs: Record<string, string>) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      if (!el) {
        const tag = selector.startsWith('link')
          ? document.createElement('link')
          : document.createElement('meta');
        Object.entries(attrs).forEach(([k, v]) => tag.setAttribute(k, v));
        document.head.appendChild(tag);
        el = tag as HTMLMetaElement;
      }
      return el;
    };

    setTag('meta[name="description"]', { name: 'description', content: meta.description });
    setTag('meta[property="og:title"]', { property: 'og:title', content: meta.title });
    setTag('meta[property="og:description"]', {
      property: 'og:description',
      content: meta.description,
    });

    const robots = setTag('meta[name="robots"]', {
      name: 'robots',
      content: meta.noindex ? 'noindex,nofollow' : 'index,follow',
    });
    robots.setAttribute('content', meta.noindex ? 'noindex,nofollow' : 'index,follow');

    // Canonical: strip the referral query so every invite link points at one URL.
    const origin = window.location.origin;
    const clean = route === '/' ? '' : route;
    const canonical = setTag('link[rel="canonical"]', {
      rel: 'canonical',
      href: `${origin}${clean}`,
    });
    canonical.setAttribute('href', `${origin}${clean}`);
  }, [route]);
}

/**
 * One page_view per page, fired centrally. Doing this per page component was
 * the previous approach and it silently broke the moment the site was split
 * into pages — the funnel's top metric disappeared from /admin.
 */
function usePageViews(route: string) {
  useEffect(() => {
    track('page_view', {
      path: route,
      ref: new URLSearchParams(window.location.search).get('ref') ?? null,
      referrer: document.referrer || null,
    });
  }, [route]);
}

function RoutedPage({ route }: { route: string }) {
  switch (route) {
    case '/':
    case '/join':
      return <Home />;
    case '/workshop':
      return <Workshop />;
    case '/projects':
      return <Projects />;
    case '/leaderboard':
      return <LeaderboardPage />;
    case '/card':
      return <CardStudio />;
    case '/vault':
      return <Vault />;
    case '/quiz':
      return <Quiz />;
    case '/prompt-lab':
      return <PromptLab />;
    case '/strategy':
      return <Strategy />;
    case '/admin':
      return <Admin />;
    default:
      return <NotFound />;
  }
}

export function App() {
  const route = useRoute();
  useSeo(route);
  usePageViews(route);

  return (
    <AppProvider>
      <RegistrationProvider autoOpen={route === '/join'} autoOpenDelay={route === '/join' ? 900 : 0}>
        <RoutedPage route={route} />
        <Toaster />
      </RegistrationProvider>
    </AppProvider>
  );
}
