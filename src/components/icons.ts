import {
  BadgeCheck,
  Briefcase,
  Building2,
  Code2,
  FileSearch,
  GraduationCap,
  MessagesSquare,
  NotebookPen,
  Package,
  ScanFace,
  ShieldAlert,
  Sparkles,
  Trophy,
  Wallet,
  ListChecks,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icon registry: project + milestone data stores icon *names* (so the data layer
 * stays serialisable/fetchable), and this map is the only place that knows about
 * the icon library.
 */
export const ICONS: Record<string, LucideIcon> = {
  FileSearch,
  MessagesSquare,
  Wallet,
  GraduationCap,
  Building2,
  Sparkles,
  NotebookPen,
  ScanFace,
  Briefcase,
  ShieldAlert,
  Trophy,
  Package,
  ListChecks,
  Code2,
  BadgeCheck,
  UserCheck,
};

export const getIcon = (name?: string): LucideIcon => (name && ICONS[name]) || Sparkles;
