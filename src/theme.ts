// Color tokens — derived from the web app's CSS variables (--teal-500,
// --calm-500, etc.). Two palettes (light/dark) selected by useColorScheme()
// + manual override in ThemeContext.

export type Palette = {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;       // teal-500
  primaryDim: string;    // teal with alpha
  accent: string;        // calm-500
  warning: string;       // amber
  danger: string;
  success: string;
  bpmLow: string;
  bpmNormal: string;
  bpmHigh: string;
};

const teal500 = '#14b8a6';
const teal400 = '#2dd4bf';
const calm500 = '#0ea5e9';
const calm400 = '#38bdf8';
const amber500 = '#f59e0b';

export const lightPalette: Palette = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  primary: teal500,
  primaryDim: 'rgba(20, 184, 166, 0.15)',
  accent: calm500,
  warning: amber500,
  danger: '#ef4444',
  success: '#22c55e',
  bpmLow: calm400,
  bpmNormal: teal500,
  bpmHigh: '#ef4444',
};

export const darkPalette: Palette = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceElevated: '#293548',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  border: '#334155',
  primary: teal400,
  primaryDim: 'rgba(45, 212, 191, 0.15)',
  accent: calm400,
  warning: amber500,
  danger: '#ef4444',
  success: '#22c55e',
  bpmLow: calm400,
  bpmNormal: teal400,
  bpmHigh: '#ef4444',
};
