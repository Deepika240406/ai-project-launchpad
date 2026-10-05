import { useEffect, useRef, useState } from 'react';
import { Download, Share2, Sparkles } from 'lucide-react';
import { Button } from './ui';
import { referralLink } from '../lib/utils';
import { track } from '../lib/analytics';
import { useApp } from '../store/AppStore';
import { projectById } from '../data/projects';

/**
 * AMBASSADOR POSTER — the shareable asset that turns a student into a channel.
 *
 * A phone-shaped status image: who is building, what they are building, and a
 * QR code straight to their join link — so a WhatsApp status, a story or a
 * printed sticker all convert without anyone typing a URL. Rasterised with
 * html-to-image (already the Card Studio engine) and lazily imported so the
 * funnel bundle never pays for it.
 */
export function AmbassadorPoster({
  code,
  name,
  college,
  projectId,
}: {
  code: string;
  name: string;
  college?: string;
  projectId?: string;
}) {
  const { totalRegistrations, target } = useApp();
  const posterRef = useRef<HTMLDivElement>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle');
  const link = referralLink(code);
  const project = projectId ? projectById(projectId) : undefined;
  const first = name.split(' ')[0];

  useEffect(() => {
    let alive = true;
    void import('qrcode').then((QR) =>
      QR.toDataURL(link, {
        width: 220,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#1E1B4B', light: '#FFFFFF' },
      }).then((url: string) => {
        if (alive) setQr(url);
      }),
    );
    return () => {
      alive = false;
    };
  }, [link]);

  const download = async () => {
    if (!posterRef.current) return;
    setBusy('rendering');
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(posterRef.current, {
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `nxtwave-ambassador-${code.toLowerCase()}.png`;
      a.click();
      setBusy('done');
      track('poster_downloaded', { code, projectId: projectId ?? null });
    } catch {
      setBusy('error');
    }
  };

  const shareWhatsApp = () => {
    const text = `I'm building "${project?.name ?? 'an AI project'}" at the free NxtWave AI workshop — 60 minutes, beginner friendly. Join with my link: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    track('whatsapp_share_clicked', { code, source: 'poster' });
  };

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="mono-label flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-brand-deep" />
          Your ambassador poster
        </p>
        <span className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">PNG · phone status</span>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
        Download it, put it on your WhatsApp status or class group — the QR code is your join link, so every
        scan is a referral for you.
      </p>

      {/* ── the artwork (what gets rasterised) ── */}
      <div className="mt-4 overflow-hidden rounded-xl border border-line">
        <div
          ref={posterRef}
          style={{
            width: '100%',
            aspectRatio: '4 / 5',
            background:
              'linear-gradient(160deg, #4F46E5 0%, #3730A3 55%, #1E1B4B 100%)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '7%',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          }}
        >
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.85 }}>
              NxtWave · AI Project Launchpad
            </p>
            <p style={{ marginTop: 12, fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
              {first} is building
              <br />
              {project ? project.name : 'an AI project'}
            </p>
            <p style={{ marginTop: 8, fontSize: 12.5, opacity: 0.9, lineHeight: 1.5 }}>
              in 60 minutes, live. Free, beginner friendly — and you&apos;re invited.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                background: '#fff',
                borderRadius: 10,
                padding: 6,
                width: 88,
                height: 88,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR code to the join link" width={76} height={76} />
              ) : (
                <span style={{ fontSize: 9, color: '#1E1B4B' }}>QR…</span>
              )}
            </div>
            <div>
              <p style={{ fontSize: 11, opacity: 0.85 }}>Scan to claim your seat</p>
              <p style={{ fontSize: 15, fontWeight: 700, marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>
                {code}
              </p>
              <p style={{ fontSize: 10.5, opacity: 0.8, marginTop: 4 }}>
                {totalRegistrations}/{target} seats taken
                {college ? ` · ${college}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={download} disabled={busy === 'rendering'}>
          <Download className="h-3.5 w-3.5" />
          {busy === 'rendering' ? 'Rendering…' : busy === 'done' ? 'Saved ✓' : 'Download poster'}
        </Button>
        <Button size="sm" variant="whatsapp" onClick={shareWhatsApp}>
          <Share2 className="h-3.5 w-3.5" />
          Share + link
        </Button>
      </div>
      {busy === 'error' ? (
        <p role="alert" className="mt-2 text-[11px] text-ember">
          Could not render the image in this browser — long-press the poster to save it instead.
        </p>
      ) : null}
    </div>
  );
}
