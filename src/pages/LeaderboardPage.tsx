import { ArrowRight, Share2, Trophy } from 'lucide-react';
import { Referrals } from '../components/Referrals';
import { Leaderboard } from '../components/Leaderboard';
import { CtaBand, PageHero, PageShell } from '../components/PageShell';
import { Button, StatPill } from '../components/ui';
import { useRegistration } from '../components/RegistrationProvider';
import { useApp } from '../store/AppStore';
import { track } from '../lib/analytics';
import { nf } from '../lib/utils';

export function LeaderboardPage() {
  const { openRegistration } = useRegistration();
  const { student, referralCount, myRank, totalRegistrations, target } = useApp();

  return (
    <PageShell>
      <PageHero
        eyebrow={
          <>
            <Trophy className="h-3 w-3 text-brand-deep" />
            Builder Wall &amp; referrals
          </>
        }
        title={
          student ? (
            <>
              {student.name.split(' ')[0]}, you&apos;re on the wall.
              <br />
              <span className="text-ink-muted">
                {referralCount > 0
                  ? `${referralCount} friend${referralCount === 1 ? '' : 's'} joined with your code.`
                  : 'Your first referral is waiting.'}
              </span>
            </>
          ) : (
            <>
              Bring 3 friends.
              <br />
              <span className="text-ink-muted">Unlock the AI Project Starter Kit.</span>
            </>
          )
        }
        subtitle="Registration gets you a code, a personalised project card and a pre-written WhatsApp message. Every friend who joins moves you up a public leaderboard — and referrals are the channel that carries half of the 500 registrations."
        actions={
          <>
            <Button
              size="lg"
              onClick={() => {
                track('cta_clicked', { location: 'leaderboard_hero' });
                openRegistration({ source: 'leaderboard_hero' });
              }}
            >
              <span aria-hidden>🚀</span>
              {student ? 'Open my referral dashboard' : 'Get my referral code'}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <span className="inline-flex items-center gap-2 text-[12px] text-ink-faint">
              <Share2 className="h-3.5 w-3.5" />
              Sharing is one tap — no typing
            </span>
          </>
        }
        meta={
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatPill label="Your rank" value={myRank ? `#${myRank}` : '—'} tone="acid" />
            <StatPill label="Your referrals" value={String(referralCount)} tone="cy" />
            <StatPill label="Registrations" value={`${nf(totalRegistrations)} / ${nf(target)}`} />
            <StatPill label="Rewards from" value="1 friend" />
          </div>
        }
      />

      <Referrals />
      <Leaderboard />

      <CtaBand
        source="leaderboard_final"
        title="Your code only works if you use it."
        body="Send it to three friends who are also final year — the ones with the same project anxiety you have. That's the whole ask."
        primaryLabel={student ? 'Open my dashboard' : 'Get my referral code'}
        secondary={{ label: 'Browse the projects', to: '/projects' }}
      />
    </PageShell>
  );
}
