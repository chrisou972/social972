import type { LucideIcon } from 'lucide-react'
import {
  Accessibility,
  Baby,
  BriefcaseBusiness,
  Building2,
  Compass,
  Gavel,
  HandHeart,
  HeartPulse,
  Home,
  ShieldAlert,
  UsersRound,
  Venus,
} from 'lucide-react'

export const categoryVisuals: Record<
  string,
  {
    icon: LucideIcon
    accent: string
    softAccent: string
  }
> = {
  ccas: {
    icon: Home,
    accent: '#f59e0b',
    softAccent: 'rgba(245, 158, 11, 0.16)',
  },
  france_services: {
    icon: Compass,
    accent: '#60a5fa',
    softAccent: 'rgba(96, 165, 250, 0.18)',
  },
  point_justice: {
    icon: Gavel,
    accent: '#f97316',
    softAccent: 'rgba(249, 115, 22, 0.16)',
  },
  mission_locale: {
    icon: UsersRound,
    accent: '#14b8a6',
    softAccent: 'rgba(20, 184, 166, 0.16)',
  },
  france_travail: {
    icon: BriefcaseBusiness,
    accent: '#4f46e5',
    softAccent: 'rgba(79, 70, 229, 0.16)',
  },
  cpam: {
    icon: HeartPulse,
    accent: '#ef4444',
    softAccent: 'rgba(239, 68, 68, 0.14)',
  },
  caf: {
    icon: HandHeart,
    accent: '#22c55e',
    softAccent: 'rgba(34, 197, 94, 0.16)',
  },
  pmi: {
    icon: Baby,
    accent: '#fb7185',
    softAccent: 'rgba(251, 113, 133, 0.16)',
  },
  pif: {
    icon: UsersRound,
    accent: '#f97316',
    softAccent: 'rgba(249, 115, 22, 0.16)',
  },
  mdph: {
    icon: Accessibility,
    accent: '#22c55e',
    softAccent: 'rgba(34, 197, 94, 0.16)',
  },
  cap_emploi: {
    icon: Building2,
    accent: '#06b6d4',
    softAccent: 'rgba(6, 182, 212, 0.16)',
  },
  drdfe: {
    icon: Venus,
    accent: '#ec4899',
    softAccent: 'rgba(236, 72, 153, 0.16)',
  },
  aav: {
    icon: ShieldAlert,
    accent: '#ef4444',
    softAccent: 'rgba(239, 68, 68, 0.14)',
  },
  clic: {
    icon: HandHeart,
    accent: '#f59e0b',
    softAccent: 'rgba(245, 158, 11, 0.16)',
  },
  aidants: {
    icon: HandHeart,
    accent: '#8b5cf6',
    softAccent: 'rgba(139, 92, 246, 0.16)',
  },
  ars: {
    icon: HeartPulse,
    accent: '#0ea5e9',
    softAccent: 'rgba(14, 165, 233, 0.16)',
  },
}
