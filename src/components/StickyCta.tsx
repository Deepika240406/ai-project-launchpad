import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Share2 } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useRegistration } from './RegistrationProvider';
import { Button } from './ui';
import { nf, referralLink, whatsappShareUrl, WHATSAPP_MESSAGE } from '../lib/utils';
import { openOrCopy } from './SharePanel';
import { track } from '../lib/analytics';

/**
 * MOBILE BOTTOM CTA
 * Students open the link from WhatsApp on a phone, one-thumbed. The primary
 * action must never be more than a thumb away, and it must not cover content —
 * so it only appears after the hero and disappears near the footer.
 */
export function StickyCta() {
  const { totalRegistrations, target, isRegistered, shareCode } = useApp();
  const { openRegistration, isOpen } = useRegistration();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const nearEnd =
        y + window.innerHeight > document.documentElement.scrollHeight - 620;
      setVisible(y > 620 && !nearEnd);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const hidden = isOpen;

  return (
    <AnimatePresence>
      {visible && !hidden ? (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="safe-bottom fixed inset-x-0 bottom-0 z-40 lg:hidden"
        >
          <div className="border-t border-line bg-surface/85 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-ink-faint">
                  {isRegistered ? 'Your referral code' : `${nf(target - totalRegistrations)} spots left`}
                </p>
                <p className="truncate font-mono text-[12px] font-semibold text-ink">
                  {isRegistered ? shareCode : `${nf(totalRegistrations)} / ${nf(target)} registered`}
                </p>
              </div>
              <Button
                onClick={() => {
                  track('cta_clicked', { location: 'sticky_mobile' });
                  if (isRegistered && shareCode) {
                    // Once they are in, the CTA sells the loop: one tap opens
                    // WhatsApp with the pre-filled message and their link.
                    const link = referralLink(shareCode);
                    track('whatsapp_share_clicked', { code: shareCode, source: 'sticky_mobile' });
                    void openOrCopy(whatsappShareUrl(shareCode, link), WHATSAPP_MESSAGE(shareCode, link));
                    return;
                  }
                  openRegistration({ source: 'sticky_mobile' });
                }}
                className="shrink-0"
                size="sm"
              >
                {isRegistered ? (
                  <>
                    <Share2 className="h-3.5 w-3.5" />
                    Share with friends
                  </>
                ) : (
                  <>
                    <span aria-hidden>🚀</span>
                    Register Free
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
