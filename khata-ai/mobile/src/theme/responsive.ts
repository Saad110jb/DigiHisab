import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

// Baseline guideline dimensions based on standard mobile viewport (iPhone 11 / Galaxy S standard ~375 x 812 dp)
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

export const SCREEN_WIDTH = WINDOW_WIDTH;
export const SCREEN_HEIGHT = WINDOW_HEIGHT;

/**
 * Linear horizontal scaling based on screen width
 */
export const scale = (size: number): number => {
  return (WINDOW_WIDTH / GUIDELINE_BASE_WIDTH) * size;
};

/**
 * Linear vertical scaling based on screen height
 */
export const verticalScale = (size: number): number => {
  return (WINDOW_HEIGHT / GUIDELINE_BASE_HEIGHT) * size;
};

/**
 * Moderate non-linear scaling (default factor 0.5) to avoid overly large elements on tablets
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

/**
 * Responsive font scaler that caps extreme accessibility jumps
 */
export const fontScale = (size: number): number => {
  const scaled = moderateScale(size, 0.3);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * True if viewport width is less than 375dp (e.g. 320dp - 360dp budget Androids common in Pakistan)
 */
export const isSmallDevice: boolean = WINDOW_WIDTH < 375;

/**
 * True if viewport indicates a tablet or large foldable screen
 */
export const isTablet: boolean = WINDOW_WIDTH >= 600;

/**
 * Global constant capping system font accessibility scale multiplier to prevent UI blowouts
 */
export const MAX_FONT_SIZE_MULTIPLIER = 1.2;

/**
 * Helper props to spread onto Text / TextInput components for anti-overflow protection
 */
export const responsiveTextProps = {
  maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
  allowFontScaling: true,
};
