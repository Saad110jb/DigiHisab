import { Platform, TextStyle } from 'react-native';

/**
 * Digi Hisab Typography System
 * 
 * 1. Primary English Font: Plus Jakarta Sans for all English headings, action button labels,
 *    and high-visibility tabular currency amounts (e.g. 'Rs. 28,500', 'Rs. 85,000').
 * 2. Secondary Urdu Font: Noto Sans Arabic with clean baseline alignment for all bilingual
 *    microcopy ('گاہک کھاتہ', 'تقاضا', 'سٹاک الرٹ', 'منافع') without clipping or uneven vertical gaps.
 */

export const FONT_FAMILIES = {
  // Primary English & Tabular Amounts
  primaryBold: Platform.select({
    ios: 'Plus Jakarta Sans',
    android: 'PlusJakartaSans-Bold',
    default: 'Plus Jakarta Sans, sans-serif',
  }),
  primarySemiBold: Platform.select({
    ios: 'Plus Jakarta Sans',
    android: 'PlusJakartaSans-SemiBold',
    default: 'Plus Jakarta Sans, sans-serif',
  }),
  primaryMedium: Platform.select({
    ios: 'Plus Jakarta Sans',
    android: 'PlusJakartaSans-Medium',
    default: 'Plus Jakarta Sans, sans-serif',
  }),
  primaryRegular: Platform.select({
    ios: 'Plus Jakarta Sans',
    android: 'PlusJakartaSans-Regular',
    default: 'Plus Jakarta Sans, sans-serif',
  }),

  // Secondary Urdu Microcopy
  urduRegular: Platform.select({
    ios: 'Noto Sans Arabic',
    android: 'NotoSansArabic-Regular',
    default: 'Noto Sans Arabic, sans-serif',
  }),
  urduBold: Platform.select({
    ios: 'Noto Sans Arabic',
    android: 'NotoSansArabic-Bold',
    default: 'Noto Sans Arabic, sans-serif',
  }),
};

export const TYPOGRAPHY: Record<string, TextStyle> = {
  // Large Currency Amounts (e.g. Rs. 85,000, Rs. 148,500)
  currencyHero: {
    fontFamily: FONT_FAMILIES.primaryBold,
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  currencyLarge: {
    fontFamily: FONT_FAMILIES.primaryBold,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  currencyMedium: {
    fontFamily: FONT_FAMILIES.primaryBold,
    fontWeight: '800',
    fontSize: 14,
  },

  // English Headings
  h1: {
    fontFamily: FONT_FAMILIES.primaryBold,
    fontWeight: '800',
    fontSize: 20,
    color: '#0F172A',
  },
  h2: {
    fontFamily: FONT_FAMILIES.primaryBold,
    fontWeight: '700',
    fontSize: 16,
    color: '#0F172A',
  },
  h3: {
    fontFamily: FONT_FAMILIES.primarySemiBold,
    fontWeight: '700',
    fontSize: 14,
    color: '#0F172A',
  },

  // Action Button Labels
  actionLabel: {
    fontFamily: FONT_FAMILIES.primaryBold,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  actionLabelSmall: {
    fontFamily: FONT_FAMILIES.primarySemiBold,
    fontWeight: '700',
    fontSize: 11,
  },

  // Urdu Microcopy with clean baseline alignment
  urduSubtext: {
    fontFamily: FONT_FAMILIES.urduRegular,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    color: '#64748B',
  },
  urduMicro: {
    fontFamily: FONT_FAMILIES.urduRegular,
    fontSize: 9,
    lineHeight: 15,
    textAlign: 'center',
    color: '#64748B',
  },
  urduHeading: {
    fontFamily: FONT_FAMILIES.urduBold,
    fontSize: 14,
    lineHeight: 22,
    color: '#0F172A',
  },
};
