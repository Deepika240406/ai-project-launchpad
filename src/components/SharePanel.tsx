import { useState } from 'react';
import { Check, Copy, Linkedin, Share2 } from 'lucide-react';
import { cn, referralLink, whatsappShareUrl, linkedinShareUrl, WHATSAPP_MESSAGE, copyText } from '../lib/utils';
import { track } from '../lib/analytics';
import { Button, useCopy } from './ui';
import { useApp } from '../store/AppStore';

/**
 * WHATSAPP GROWTH LOOP
 * ------------------------------------------------------------------
 * The share message deliberately contains three things that raise click-through:
 *   1. social proof  — "I just registered"
 *   2. the promise   — "we'll actually build an AI project"
 *   3. a personalised link with the sender's code
 * It is pre-filled so sharing costs one tap and zero typing on a phone.
 */
/** Opens a share target, and degrades to "copy the message" when popups are
 *  blocked (sandboxed iframes, strict in-app browsers such as Instagram's). */
export async function openOrCopy(url: string, fallbackText: string): Promise<'opened' | 'copied'> {
  let win: Window | null = null;
  try {
    win = window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    win = null;
  }
  if (win) return 'opened';
  await copyText(fallbackText);
  return 'copied';
}

export function SharePanel({
  code,
  projectName,
  className,
  variant = 'full',
  onShared,
}: {
  code: string;
  projectName?: string;
  className?: string;
  variant?: 'full' | 'compact';
  onShared?: (channel: 'whatsapp' | 'linkedin' | 'copy') => void;
}) {
  const link = referralLink(code);
  const { copied, copy } = useCopy();
  const [showPreview, setShowPreview] = useState(false);
  const { showToast } = useApp();

  const shareWhatsApp = async () => {
    track('whatsapp_share_clicked', { code, source: variant });
    onShared?.('whatsapp');
    const result = await openOrCopy(whatsappShareUrl(code, link), WHATSAPP_MESSAGE(code, link));
    if (result === 'copied') {
      showToast({
        title: 'Message copied to clipboard',
        description: 'Open WhatsApp and paste it into your batch group.',
        variant: 'info',
      });
    }
  };

  const shareLinkedIn = async () => {
    track('linkedin_share_clicked', { code });
    const result = await openOrCopy(linkedinShareUrl(link, projectName), `${link}`);
    if (result === 'copied') {
      showToast({
        title: 'Referral link copied',
        description: 'Paste it into your LinkedIn post.',
        variant: 'info',
      });
    }
  };

  const copyLink = async () => {
    const ok = await copy(link);
    if (ok) {
      track('referral_link_copied', { code });
      onShared?.('copy');
    }
  };

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        <Button variant="whatsapp" onClick={shareWhatsApp} className="flex-1">
          <WhatsAppGlyph className="h-4 w-4" />
          Share on WhatsApp
        </Button>
        <Button variant="secondary" onClick={copyLink} aria-live="polite">
          {copied ? <Check className="h-4 w-4 text-brand-deep" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <Button variant="whatsapp" size="lg" onClick={shareWhatsApp} className="w-full">
        <WhatsAppGlyph className="h-4 w-4" />
        Share on WhatsApp
      </Button>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" onClick={copyLink} aria-live="polite">
          {copied ? <Check className="h-4 w-4 text-brand-deep" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Link copied' : 'Copy referral link'}
        </Button>
        <Button variant="secondary" onClick={shareLinkedIn}>
          <Linkedin className="h-4 w-4" />
          Share on LinkedIn
        </Button>
      </div>

      <div className="rounded-xl border border-line bg-surface-2 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="mono-label">Your referral link</p>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="text-[11px] font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            {showPreview ? 'Hide message' : 'Preview message'}
          </button>
        </div>
        <p className="mt-2 break-all font-mono text-[11px] text-brand-deep">{link}</p>

        {showPreview ? (
          <pre className="mt-3 max-h-44 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-card p-3 font-sans text-[12px] leading-relaxed text-ink-muted">
            {WHATSAPP_MESSAGE(code, link)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.78.97-.96 1.17-.17.2-.35.22-.65.07-.3-.15-1.13-.42-2.16-1.33-.8-.71-1.34-1.59-1.5-1.89-.15-.3-.02-.46.13-.61.15-.15.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.6-1.45-.83-1.98-.22-.53-.44-.46-.6-.46h-.5c-.17 0-.45.07-.68.32-.22.25-.86.84-.86 2.05 0 1.2.88 2.37 1 2.53.13.15 1.72 2.63 4.18 3.68.58.25 1.04.4 1.4.51.6.19 1.14.16 1.57.1.48-.07 1.5-.61 1.72-1.2.22-.6.22-1.1.15-1.2-.07-.1-.27-.17-.57-.32z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.53 0-3.03-.41-4.34-1.19l-.31-.18-3.22.84.86-3.14-.2-.32a8.2 8.2 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24s-3.7 8.24-8.24 8.24z" />
    </svg>
  );
}

/** Small inline "share with 3 friends" affordance used across sections. */
export function ShareWithThree({ code, projectName }: { code: string; projectName?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface-2 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5">
        <Share2 className="h-4 w-4 text-brand-deep" />
        <div>
          <p className="text-[13px] font-semibold text-ink">Share with 3 friends</p>
          <p className="text-[11px] text-ink-muted">Unlocks the Verified Certificate & LinkedIn Badge.</p>
        </div>
      </div>
      <SharePanel code={code} projectName={projectName} variant="compact" className="sm:w-auto" />
    </div>
  );
}

/** Attribution banner shown to a student who arrived through someone's link. */
export function InboundReferralBanner() {
  const { inboundRef, student } = useApp();
  if (student || !inboundRef) return null;
  return (
    <div className="border-b border-brand/70 bg-brand/[0.12]">
      <div className="container-x flex flex-wrap items-center justify-center gap-2 py-2.5 text-center text-[12px] text-ink-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-deep" />
        You were invited by a friend using code{' '}
        <span className="rounded-md border border-brand/70 bg-brand/20 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-deep">
          {inboundRef}
        </span>
        — you both get referral credit.
      </div>
    </div>
  );
}
