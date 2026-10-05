import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Copy,
  Download,
  IdCard,
  ImageDown,
  Link2,
  Share2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { PageHero, PageShell, CtaBand, NextSteps } from '../components/PageShell';
import { Button, Badge, Card, NoteTag, Section, SectionHeading, Spinner, useCopy } from '../components/ui';
import { SharePanel } from '../components/SharePanel';
import { getIcon } from '../components/icons';
import { PROJECTS, projectById } from '../data/projects';
import { useApp } from '../store/AppStore';
import { useRegistration } from '../components/RegistrationProvider';
import { cn, copyText, displayName, referralLink, WHATSAPP_MESSAGE } from '../lib/utils';
import { makeQrDataUrl } from '../lib/qr';
import { track } from '../lib/analytics';

/**
 * PROJECT CARD STUDIO  (/card)
 * ---------------------------------------------------------------------------
 * The referral link is a URL. A project card is an *asset* — it is what a
 * student is actually willing to post in a WhatsApp status or a college group,
 * and the QR code is what makes that image tappable again.
 *
 * Rendered as real DOM (not <canvas>) so the card inherits the design system,
 * then rasterised with html-to-image at 2x for a crisp 1080×1350 share image.
 */

const CARD_W = 540; // logical px → 1080 at 2x
const CARD_H = 675; // → 1350 at 2x (4:5, the WhatsApp/IG portrait ratio)

type Theme = 'light' | 'lime';

export function CardStudio() {
  const { student, quiz, savedIdeaId, showToast } = useApp();
  const { openRegistration } = useRegistration();

  const defaultProjectId = student?.recommendedProjectId ?? savedIdeaId ?? PROJECTS[0].id;
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [theme, setTheme] = useState<Theme>('light');
  const [showQr, setShowQr] = useState(true);
  const [qr, setQr] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { copied, copy } = useCopy();

  const project = projectById(projectId) ?? PROJECTS[0];
  const Icon = getIcon(project.icon);
  const name = student ? displayName(student.name) : 'Your name';
  const college = student?.college ?? 'Your college';
  const code = student?.code ?? null;
  const link = code ? referralLink(code) : '';

  useEffect(() => {
    track('cta_clicked', { location: 'card_studio' });
  }, []);

  /* QR is regenerated only when the destination actually changes. */
  useEffect(() => {
    if (!link || !showQr) {
      setQr('');
      return;
    }
    let alive = true;
    makeQrDataUrl(link, 240).then((url) => {
      if (alive) setQr(url);
    });
    return () => {
      alive = false;
    };
  }, [link, showQr]);

  const caption = useMemo(() => {
    const base = `I'm building a "${project.name}" at NxtWave's free 60-minute AI workshop 🔨\n\n${project.tagline}\n\nIt runs on ${project.tech.join(' + ')} — and it's beginner friendly.`;
    return code ? `${base}\n\nJoin with my link: ${link}` : base;
  }, [project, code, link]);

  const download = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    setRendering(true);
    track('cta_clicked', { location: 'card_download', projectId: project.id });
    try {
      // Loaded on demand so the library stays out of the initial bundle.
      const { toPng } = await import('html-to-image');
      // Let the DOM settle so fonts/layout are final before rasterising.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        width: CARD_W,
        height: CARD_H,
        cacheBust: true,
        backgroundColor: theme === 'lime' ? '#CCFF4D' : '#FFFFFF',
        style: { transform: 'none' },
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `nxtwave-ai-project-${project.id}.png`;
      a.click();
      showToast({
        title: 'Card downloaded',
        description: 'Post it in your batch group — the QR links back to you.',
        variant: 'success',
      });
    } catch {
      showToast({
        title: 'Could not export the image',
        description: 'Your browser blocked the download. Try "Copy caption" instead.',
        variant: 'error',
      });
    } finally {
      setDownloading(false);
      setRendering(false);
    }
  }, [project, theme, showToast]);

  return (
    <PageShell>
      <PageHero
        eyebrow={
          <>
            <IdCard className="h-3 w-3 text-brand-deep" />
            Project card studio
          </>
        }
        title={
          <>
            Turn your project into
            <br />
            <span className="text-ink-muted">something you can post.</span>
          </>
        }
        subtitle="Pick your project, and this builds a share-ready card with your name and a QR code that links straight back to your referral. Download the PNG, drop it in a WhatsApp status or your batch group — images get shared, links get ignored."
      />

      <Section className="pt-4">
        <div className="grid gap-6 lg:grid-cols-[1fr_460px] lg:gap-10">
          {/* ------------------------------------------------------- controls */}
          <div className="space-y-4">
            <Card className="p-5 sm:p-6">
              <p className="mono-label">1 · Choose your project</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {PROJECTS.map((p) => {
                  const PIcon = getIcon(p.icon);
                  const active = p.id === projectId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProjectId(p.id);
                        track('project_selected', { projectId: p.id, source: 'card_studio' });
                      }}
                      aria-pressed={active}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-3 text-left transition',
                        active
                          ? 'border-brand-deep/40 bg-brand/[0.14]'
                          : 'border-line bg-surface-2 hover:border-line-strong hover:bg-surface-3',
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-8 w-8 shrink-0 place-items-center rounded-lg border',
                          active ? 'border-brand-deep/30 bg-card' : 'border-line bg-card',
                        )}
                      >
                        <PIcon className={cn('h-4 w-4', active ? 'text-brand-deep' : 'text-ink-faint')} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-semibold text-ink">{p.name}</span>
                        <span className="mt-0.5 block text-[10px] text-ink-faint">{p.difficulty}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <p className="mono-label">2 · Style it</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'light' as Theme, label: 'Paper' },
                    { id: 'lime' as Theme, label: 'Lime' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    aria-pressed={theme === t.id}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[12px] font-semibold transition',
                      theme === t.id
                        ? 'border-brand-deep/40 bg-brand/[0.14] text-ink'
                        : 'border-line bg-surface-2 text-ink-muted hover:border-line-strong',
                    )}
                  >
                    <span
                      className={cn(
                        'h-3 w-3 rounded-full border border-line',
                        t.id === 'lime' ? 'bg-brand' : 'bg-card',
                      )}
                    />
                    {t.label}
                  </button>
                ))}
                <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-[12px] font-medium text-ink-muted">
                  <input
                    type="checkbox"
                    checked={showQr}
                    onChange={(e) => setShowQr(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-line-strong accent-brand-deep"
                  />
                  Include QR code
                </label>
              </div>
              {!code ? (
                <p className="mt-3 rounded-lg border border-ember/30 bg-ember/10 px-3 py-2 text-[11px] leading-relaxed text-ember">
                  You are not registered yet, so the card has no personal QR. Register free and this becomes a
                  working referral asset.
                </p>
              ) : null}
            </Card>

            <Card className="p-5 sm:p-6">
              <p className="mono-label">3 · Share it</p>
              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                <Button onClick={download} loading={downloading} className="flex-1">
                  <ImageDown className="h-4 w-4" />
                  {downloading ? 'Rendering PNG…' : 'Download card (1080×1350)'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const ok = await copy(caption);
                    if (ok) {
                      track('referral_link_copied', { kind: 'caption' });
                      showToast({ title: 'Caption copied', description: 'Paste it with the card image.', variant: 'success' });
                    }
                  }}
                  aria-live="polite"
                >
                  {copied ? <Check className="h-4 w-4 text-brand-deep" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy caption'}
                </Button>
              </div>

              {code ? (
                <div className="mt-4">
                  <SharePanel code={code} projectName={project.name} variant="compact" />
                </div>
              ) : (
                <Button
                  variant="ink"
                  className="mt-4 w-full"
                  onClick={() => openRegistration({ projectId: project.id, source: 'card_studio' })}
                >
                  Register free to unlock my QR
                </Button>
              )}

              <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3.5">
                <p className="mono-label">Caption preview</p>
                <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-ink-muted">
                  {caption}
                </pre>
              </div>
            </Card>

            <div className="flex flex-wrap items-center gap-3">
              <NoteTag label="Renders in your browser" />
              <p className="text-[11px] leading-relaxed text-ink-faint">
                Nothing is uploaded. The PNG is generated locally from this page.
              </p>
            </div>
          </div>

          {/* --------------------------------------------------- live preview */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center justify-between gap-3 pb-3">
              <p className="mono-label">Live preview</p>
              {rendering ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
                  <Spinner className="h-3 w-3" /> rendering
                </span>
              ) : null}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-2xl border border-line bg-surface-2 p-4 shadow-card"
            >
              {/* Fixed logical size so the exported PNG is always 1080×1350.
                  Scaled down visually on small screens only. */}
              <div className="flex justify-center">
                <div
                  className="origin-top scale-[0.62] sm:scale-75 lg:scale-[0.82]"
                  style={{ width: CARD_W, height: CARD_H }}
                >
                  <ProjectCardArt
                    ref={cardRef}
                    theme={theme}
                    name={name}
                    college={college}
                    projectName={project.name}
                    tagline={project.tagline}
                    tech={project.tech}
                    difficulty={project.difficulty}
                    buildTime={project.buildTime}
                    code={code}
                    qr={showQr ? qr : ''}
                    Icon={Icon}
                  />
                </div>
              </div>
            </motion.div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <MiniStat label="Export size" value="1080×1350" />
              <MiniStat label="Ratio" value="4 : 5" />
              <MiniStat label="Format" value="PNG" />
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
              Portrait 4:5 is deliberate — it is the ratio WhatsApp status, Instagram and LinkedIn all show
              without cropping, so the QR never gets cut off.
            </p>
          </div>
        </div>
      </Section>

      <Section className="border-t border-line pt-12">
        <SectionHeading
          eyebrow={
            <>
              <Sparkles className="h-3 w-3 text-brand-deep" />
              More tools
            </>
          }
          title="Keep the momentum going."
        />
        <NextSteps
          className="mt-8"
          items={[
            {
              label: 'Prompt Lab',
              detail: 'Generate the build prompt for this project — role, task, format, constraints.',
              to: '/prompt-lab',
            },
            {
              label: 'Idea Vault',
              detail: 'Keep your shortlist, notes and the six-stage build checklist in one place.',
              to: '/vault',
            },
            {
              label: 'Readiness check',
              detail: 'Five questions, one score, one honest recommendation about where to start.',
              to: '/quiz',
            },
          ]}
        />
      </Section>

      <CtaBand
        source="card_studio_final"
        title="A card with no QR is just a picture."
        body="Register free and your card starts carrying a scannable link — every screenshot someone saves becomes a possible visit to your referral."
        secondary={{ label: 'Back to projects', to: '/projects' }}
      />
    </PageShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2.5 text-center">
      <p className="mono-label">{label}</p>
      <p className="mt-1 font-mono text-[12px] font-semibold text-ink">{value}</p>
    </div>
  );
}

/* --------------------------------------------------------------------------
   The artwork itself. Pure presentational + forwardRef so html-to-image can
   rasterise the exact same node the user is looking at (no second code path to
   drift out of sync).
   -------------------------------------------------------------------------- */

interface ArtProps {
  theme: Theme;
  name: string;
  college: string;
  projectName: string;
  tagline: string;
  tech: string[];
  difficulty: string;
  buildTime: string;
  code: string | null;
  qr: string;
  Icon: React.ElementType;
}

const ProjectCardArt = forwardRef<HTMLDivElement, ArtProps>(({
  theme,
  name,
  college,
  projectName,
  tagline,
  tech,
  difficulty,
  buildTime,
  code,
  qr,
  Icon,
}, ref) => {
  const lime = theme === 'lime';
  return (
    <div
      ref={ref}
      style={{ width: CARD_W, height: CARD_H }}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-[26px] border',
        lime ? 'border-brand-deep/25 bg-brand' : 'border-line bg-card',
      )}
    >
      {/* texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(11,15,25,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,15,25,0.045) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(120% 70% at 50% 0%, #000 10%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full',
          lime ? 'bg-white/25' : 'bg-violet/10',
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -left-20 bottom-24 h-56 w-56 rounded-full',
          lime ? 'bg-white/20' : 'bg-cyan/10',
        )}
      />

      <div className="relative flex h-full flex-col p-[34px]">
        {/* header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'grid h-9 w-9 place-items-center rounded-xl border',
                lime ? 'border-brand-deep/25 bg-white/70' : 'border-line bg-surface-2',
              )}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path
                  d="M6 18V6l12 12V6"
                  fill="none"
                  stroke="#0B0F19"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <p className="text-[12px] font-semibold leading-none text-ink">NxtWave</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink/60">
                AI Project Launchpad
              </p>
            </div>
          </div>
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em]',
              lime ? 'border-brand-deep/30 bg-white/60 text-ink' : 'border-line bg-surface-2 text-ink-muted',
            )}
          >
            {difficulty}
          </span>
        </div>

        {/* project */}
        <div className="mt-9">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink/55">
            I&apos;m building
          </p>
          <div className="mt-3 flex items-start gap-3">
            <span
              className={cn(
                'grid h-12 w-12 shrink-0 place-items-center rounded-2xl border',
                lime ? 'border-brand-deep/25 bg-white/70' : 'border-line bg-surface-2',
              )}
            >
              <Icon className="h-6 w-6 text-ink" />
            </span>
            <h3 className="text-[30px] font-semibold leading-[1.08] tracking-tightest text-ink">
              {projectName}
            </h3>
          </div>
          <p className="mt-3 max-w-[400px] text-[13px] leading-relaxed text-ink/70">{tagline}</p>
        </div>

        {/* meta */}
        <div className="mt-5 flex flex-wrap gap-1.5">
          <span className="rounded-lg border border-ink/10 bg-white/60 px-2.5 py-1 font-mono text-[10px] font-medium text-ink/80">
            ⏱ {buildTime}
          </span>
          {tech.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-lg border border-ink/10 bg-white/60 px-2.5 py-1 font-mono text-[10px] font-medium text-ink/80"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="flex-1" />

        {/* footer: who + where to go */}
        <div className="mt-6 flex items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink/55">By</p>
            <p className="mt-1.5 truncate text-[19px] font-semibold leading-tight text-ink">{name}</p>
            <p className="mt-0.5 truncate text-[11px] text-ink/60">{college}</p>

            <div
              className={cn(
                'mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5',
                lime ? 'border-brand-deep/25 bg-white/70' : 'border-line bg-surface-2',
              )}
            >
              {code ? (
                <>
                  <Link2 className="h-3 w-3 text-ink/70" />
                  <span className="font-mono text-[10px] font-bold tracking-wider text-ink">{code}</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3 text-ink/70" />
                  <span className="font-mono text-[10px] font-bold tracking-wider text-ink">
                    JOIN ME — FREE
                  </span>
                </>
              )}
            </div>
          </div>

          {qr ? (
            <div
              className={cn(
                'shrink-0 rounded-2xl border p-2',
                lime ? 'border-brand-deep/25 bg-white' : 'border-line bg-card',
              )}
            >
              <img src={qr} alt="Scan to open the referral link" width={92} height={92} className="block" />
              <p className="mt-1 text-center font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-ink/60">
                Scan to join
              </p>
            </div>
          ) : (
            <div
              className={cn(
                'shrink-0 rounded-2xl border px-3 py-4 text-center',
                lime ? 'border-brand-deep/25 bg-white/60' : 'border-dashed border-line-strong bg-surface-2',
              )}
            >
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink/55">
                Register to
                <br />
                unlock QR
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ProjectCardArt.displayName = 'ProjectCardArt';
