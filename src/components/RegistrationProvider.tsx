import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { RegistrationModal } from './RegistrationModal';

interface OpenOptions {
  /** Project the student already clicked, so the flow never re-asks. */
  projectId?: string;
  /** Where the modal was opened from — every call site is attributable in analytics. */
  source: string;
  /** 'quick' = take a seat in seconds; 'full' = the project-match flow. */
  mode?: 'quick' | 'full';
}

interface RegistrationContextValue {
  openRegistration: (opts?: OpenOptions) => void;
  closeRegistration: () => void;
  isOpen: boolean;
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

/**
 * One registration flow, mounted once at the app root, opened from anywhere.
 * This is why the funnel is 3 clicks instead of 3 navigations.
 */
export function RegistrationProvider({
  children,
  autoOpen = false,
  autoOpenDelay = 700,
}: {
  children: ReactNode;
  autoOpen?: boolean;
  autoOpenDelay?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [opts, setOpts] = useState<OpenOptions>({ source: 'unknown' });

  const openRegistration = useCallback((o?: OpenOptions) => {
    setOpts(o ?? { source: 'unknown' });
    setIsOpen(true);
  }, []);

  const closeRegistration = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!autoOpen) return;
    const t = window.setTimeout(() => openRegistration({ source: 'referral_link' }), autoOpenDelay);
    return () => window.clearTimeout(t);
  }, [autoOpen, autoOpenDelay, openRegistration]);

  const value = useMemo(
    () => ({ openRegistration, closeRegistration, isOpen }),
    [openRegistration, closeRegistration, isOpen],
  );

  return (
    <RegistrationContext.Provider value={value}>
      {children}
      <RegistrationModal
        open={isOpen}
        onClose={closeRegistration}
        initialProjectId={opts.projectId}
        source={opts.source}
        initialMode={opts.mode}
      />
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used inside <RegistrationProvider>');
  return ctx;
}
