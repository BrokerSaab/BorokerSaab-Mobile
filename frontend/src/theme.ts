export const colors = {
  surface: '#FFFFFF',
  onSurface: '#1C1C1E',
  surfaceSecondary: '#F2F2F7',
  onSurfaceSecondary: '#3A3A3C',
  surfaceTertiary: '#E5E5EA',
  onSurfaceTertiary: '#8E8E93',
  surfaceInverse: '#0B1F3A',
  onSurfaceInverse: '#FFFFFF',
  brand: '#0B1F3A',
  brandPrimary: '#0B1F3A',
  brandSecondary: '#D4AF37',
  brandSecondaryLight: '#FDF6E3',
  onBrandSecondary: '#45350A',
  success: '#34C759',
  warning: '#FFCC00',
  error: '#FF3B30',
  info: '#0B1F3A',
  border: '#E5E5EA',
  borderStrong: '#C7C7CC',
  divider: '#EEEFF3',
  textMuted: '#8E8E93',
  textSubtle: '#6B7280',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, '3xl': 48 } as const;
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 } as const;

export const statusColors: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: '#FEF3C7', fg: '#92400E' },
  ACCEPTED: { bg: '#DBEAFE', fg: '#1E40AF' },
  COMPLETED: { bg: '#D1FAE5', fg: '#065F46' },
  CANCELLED: { bg: '#FEE2E2', fg: '#991B1B' },
  REQUESTED: { bg: '#DBEAFE', fg: '#1E40AF' },
  QUOTED: { bg: '#E0E7FF', fg: '#3730A3' },
  OPEN: { bg: '#DBEAFE', fg: '#1E40AF' },
  IN_PROGRESS: { bg: '#E0E7FF', fg: '#3730A3' },
  AWAITING_CONFIRM: { bg: '#FEF3C7', fg: '#92400E' },
  CONFIRMED: { bg: '#D1FAE5', fg: '#065F46' },
  CLOSED: { bg: '#E5E7EB', fg: '#374151' },
  APPROVED: { bg: '#D1FAE5', fg: '#065F46' },
};
