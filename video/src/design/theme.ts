/**
 * Design System Theme
 * Professional course video styling
 */

// === SPACING SCALE ===
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// === SAFE MARGINS (for 1080p video) ===
export const SAFE_MARGIN = {
  horizontal: 80,
  vertical: 60,
  avatarOffset: 40,
} as const;

// === TYPOGRAPHY ===
export const FONT_SIZE = {
  caption: 14,
  body: 20,
  bodyLarge: 24,
  h4: 28,
  h3: 36,
  h2: 48,
  h1: 56,
  display: 72,
} as const;

export const FONT_WEIGHT = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const LINE_HEIGHT = {
  tight: 1.1,
  normal: 1.4,
  relaxed: 1.6,
} as const;

// === COLORS ===
export const COLORS = {
  // Background
  bgPrimary: '#0a0f1a',
  bgSecondary: '#111827',
  bgCard: '#1a2332',
  bgCardHover: '#1f2937',
  
  // Text
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  
  // Accent
  accent: '#6366f1',
  accentLight: '#818cf8',
  accentDark: '#4f46e5',
  
  // Semantic
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  
  // Overlays
  overlayLight: 'rgba(255, 255, 255, 0.05)',
  overlayDark: 'rgba(0, 0, 0, 0.4)',
  
  // Borders
  border: 'rgba(148, 163, 184, 0.12)',
  borderAccent: 'rgba(99, 102, 241, 0.4)',
} as const;

// === GRADIENTS ===
export const GRADIENTS = {
  background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #0f172a 100%)',
  backgroundRadial: 'radial-gradient(ellipse at top, #1a2332 0%, #0a0f1a 70%)',
  accent: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  vignette: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
  cardShine: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
} as const;

// === SHADOWS ===
export const SHADOWS = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  md: '0 4px 16px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.6)',
  glow: '0 0 40px rgba(99, 102, 241, 0.3)',
  avatar: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 4px rgba(99, 102, 241, 0.3)',
} as const;

// === BORDER RADIUS ===
export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// === ANIMATION ===
export const ANIMATION = {
  slideEntryDuration: 15, // frames
  bulletStagger: 6, // frames between bullets
  fadeInDuration: 12, // frames
  springConfig: {
    damping: 15,
    stiffness: 120,
    mass: 0.8,
  },
} as const;

// === LAYOUT ===
export const LAYOUT = {
  maxContentWidth: 1760, // 1920 - 2*80
  maxTextWidth: 900,
  twoColumnGap: 60,
  avatarSize: 180,
  progressBarHeight: 4,
  headerHeight: 80,
  footerHeight: 60,
} as const;

// === BULLET LIMITS ===
export const CONTENT_LIMITS = {
  maxBulletsPerSlide: 5,
  maxTitleLines: 2,
  maxBulletChars: 80,
} as const;

