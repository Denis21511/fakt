import { loadFont as loadManrope } from '@remotion/google-fonts/Manrope';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { Easing } from 'remotion';

const manrope = loadManrope('normal', { weights: ['600', '700', '800'], subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'] });
const inter = loadInter('normal', { weights: ['400', '500', '600'], subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'] });

export const FONT_DISPLAY = manrope.fontFamily;
export const FONT_UI = inter.fontFamily;

/** Палитра приложения FAKT */
export const C = {
  steel: '#14171C',
  steel2: '#1E222A',
  steelLine: 'rgba(255,255,255,0.07)',
  text: '#F3F4F7',
  textDim: 'rgba(243,244,247,0.62)',
  cobalt: '#2F4FF0',
  lime: '#D5F36A',
  pos: '#3FBF86',
  neg: '#F0675B',
  paper: '#F7F7F2',
};

export const FPS = 30;
export const EASE = Easing.bezier(0.65, 0, 0.35, 1);
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** Пауза до начала голоса и после него в каждой сцене, сек. */
export const LEAD = 0.5;
export const TAIL = 0.9;
export const TRANSITION = 15;
