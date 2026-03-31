/**
 * SecureX Global Design Tokens
 * Static, elegant, production-ready.
 * NO shimmer, NO sweep, NO moving highlights on cards.
 *
 * Fonts: Syne (700/800 headings, 600 labels) + DM Mono (codes, numbers, stats)
 *   Link fonts via: android/app/src/main/assets/fonts/ → npx react-native-asset
 */

export const T = {
  // ── Background ────────────────────────────────────────
  bg: '#080c10',
  // Static orbs (Views with position:absolute, borderRadius:999)
  // Single large soft teal glow pinned top-right only
  orbTeal:   'rgba(0,128,128,0.18)',
  // (legacy / no longer used)
  orbIndigo: 'transparent',
  dotGrid: 'transparent',

  // ── Glass Card ────────────────────────────────────────
  glass:       'rgba(255,255,255,0.05)',
  border:      'rgba(255,255,255,0.09)',
  borderTop:   'rgba(255,255,255,0.13)',  // top highlight only
  insetTint:   'rgba(255,255,255,0.05)',  // inner shadow

  // ── Accent ────────────────────────────────────────────
  cyan:     '#00e5ff',
  cyanA70:  'rgba(0,229,255,0.70)',   // toggle ON
  cyanA18:  'rgba(0,229,255,0.18)',
  cyanA12:  'rgba(0,229,255,0.12)',
  cyanA08:  'rgba(0,229,255,0.08)',
  cyanA04:  'rgba(0,229,255,0.04)',

  // ── Status ────────────────────────────────────────────
  danger:    '#ff4d6d',
  dangerA14: 'rgba(255,77,109,0.14)',
  warning:   '#f5a623',
  warningA14:'rgba(245,166,35,0.14)',
  success:   '#06d6a0',
  successA14:'rgba(6,214,160,0.14)',

  // ── Typography Neutrals ───────────────────────────────
  white:  '#FFFFFF',
  muted:  'rgba(255,255,255,0.42)',
  faint:  'rgba(255,255,255,0.22)',

  // ── Palette ───────────────────────────────────────────
  purple:     '#a78bfa',
  purpleA14:  'rgba(167,139,250,0.14)',
  amber:      '#f5a623',
  amberA14:   'rgba(245,166,35,0.14)',

  // ── Type Scale (Syne) ────────────────────────────────
  // Screen title (Home, Settings, Security Center): 32px Syne 800
  fontHero:    { fontSize: 32, fontWeight: '800' as const, letterSpacing: 0.2, color: '#FFFFFF' },
  fontSection: { fontSize: 20, fontWeight: '800' as const, letterSpacing: 0.40, color: '#FFFFFF' },
  // Card title: 17px Syne 600
  fontCardTitle:{ fontSize: 17, fontWeight: '600' as const, letterSpacing: 0.1, color: '#FFFFFF' },
  // Card body/description: 14px muted
  fontBody:    { fontSize: 14, fontWeight: '500' as const, color: '#FFFFFF' },
  fontCaption: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.6, color: 'rgba(255,255,255,0.42)' },
  // App label "SECUREX": 11px muted uppercase tracking-widest
  fontLabel:   { fontSize: 11, fontWeight: '700' as const, letterSpacing: 3, textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.42)' },
  fontMono:    { fontSize: 13, fontWeight: '600' as const, letterSpacing: 1.5 },

  // ── Spacing ───────────────────────────────────────────
  pad:      24,    // screen horizontal
  // Cards — padding restored to 20/20
  cardPadV: 20,
  cardPadH: 20,
  gap:      10,    // list item gap
  // Section label spacing: 28 top, 12 bottom
  sectionGap: 12,

  // ── Radii ─────────────────────────────────────────────
  rCard: 20,
  rPill: 50,
  rChip: 14,

  // ── Shadows ───────────────────────────────────────────
  shadowCard: {
    shadowColor: '#000',
    shadowOpacity: 0.30,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  } as object,
};

// ── Brand colors for credential logos ────────────────────
// ── Brand colors for credential logos ────────────────────
const BRANDS: Record<string, string> = {
  google: '#4285F4', facebook: '#1877F2', instagram: '#C13584',
  twitter: '#1DA1F2', x: '#1DA1F2', github: '#8b949e',
  amazon: '#FF9900', netflix: '#E50914', spotify: '#1DB954',
  paypal: '#009CDE', apple: '#A2AAAD', microsoft: '#00A4EF',
  linkedin: '#0A66C2', discord: '#5865F2', twitch: '#9146FF',
  slack: '#4A154B', dropbox: '#0061FF',
};

export const CAT_COLORS: Record<string, string> = {
  Banking:  '#f5a623',
  Social:   '#8b5cf6',
  Work:     '#00e5ff',
  Shopping: '#06d6a0',
  Gaming:   '#ff4d6d',
  Email:    '#fb923c',
  Other:    '#6366f1',
};

export const getCategoryColor = (cat: string): string => {
  return CAT_COLORS[cat] || CAT_COLORS.Other;
};

export const getBrandColor = (name: string, category?: string): string => {
  const k = name.toLowerCase();
  for (const b of Object.keys(BRANDS)) { if (k.includes(b)) return BRANDS[b]; }
  if (category) return getCategoryColor(category);
  return T.cyanA18;
};
