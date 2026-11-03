---
name: DigiHisab Modern Fintech
colors:
  surface: '#0d131f'
  surface-dim: '#0d131f'
  surface-bright: '#333946'
  surface-container-lowest: '#080e19'
  surface-container-low: '#161c27'
  surface-container: '#1a202b'
  surface-container-high: '#242a36'
  surface-container-highest: '#2f3541'
  on-surface: '#dde2f3'
  on-surface-variant: '#bacac1'
  inverse-surface: '#dde2f3'
  inverse-on-surface: '#2a303d'
  outline: '#85948c'
  outline-variant: '#3b4a43'
  surface-tint: '#29e0aa'
  primary: '#45f1ba'
  on-primary: '#003828'
  primary-container: '#00d49f'
  on-primary-container: '#00563e'
  inverse-primary: '#006c4f'
  secondary: '#89ceff'
  on-secondary: '#00344d'
  secondary-container: '#00a2e6'
  on-secondary-container: '#00344e'
  tertiary: '#cbd7f7'
  on-tertiary: '#243049'
  tertiary-container: '#afbbda'
  on-tertiary-container: '#3f4b65'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#55fdc5'
  primary-fixed-dim: '#29e0aa'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#00513b'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#bac6e6'
  on-tertiary-fixed: '#0f1b33'
  on-tertiary-fixed-variant: '#3b4760'
  background: '#0d131f'
  on-background: '#dde2f3'
  surface-variant: '#2f3541'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-numeric:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-badge:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a high-precision, institutional-grade dark interface for next-generation digital ledger, bookkeeping, and payment infrastructure. Catering to small-and-medium enterprise merchants, corporate treasurers, and digital-first consumers across Pakistan, the visual tone balances cutting-edge fiscal agility with sovereign-grade security.

The aesthetic synthesizes **Corporate Modernism** with subtle **Precision Glass and Technical Edge** styling:
- **Atmospheric Depth:** A deep midnight canvas paired with layered surface cards creates focus around mission-critical metrics, cash flow balances, and transaction states.
- **High-Signal Accents:** Luminescent mint and electric cyan guide interaction flows, denoting liquidity, successful clearing, and immediate action items.
- **Bilingual Equilibrium:** Dual-script architectural balance treats English numerals/labels and Urdu typography with equal visual hierarchy, accommodating bidirectional (LTR/RTL) ledgers without jarring layout shifts.
- **Institutional Assurance:** Micro-borders, crisp tabular alignments, and authoritative compliance verification modules evoke total transparency and security.

## Colors

The color system operates on an ultra-dark slate-navy base to reduce glare in prolonged bookkeeping sessions while maximizing contrast for high-stakes financial data.

- **Primary (`#00D49F` - Vibrant Mint):** Reserved for primary interactive elements, payment triggers, surplus balances, confirmed ledger reconciliations, and primary action buttons.
- **Secondary (`#0EA5E9` - Sky Electric Blue):** Utilized for system status notifications, analytics lines, linked account indicators, and institutional rail tags (e.g., Raast, 1LINK).
- **Base Canvas (`#070D18` - Deep Navy):** The structural canvas background providing immense visual depth.
- **Surface Elevation (`#0D1627` - Slate Card Surface):** Elevated containers, tables, floating balance trays, and sheet dialogs.
- **Structural Stroke (`#17233B` - Slate Border):** Exacting 1px borders providing clear spatial containment without overwhelming contrast.
- **Functional Semantics:**
  - *Debit / Negative Drift:* `#F43F5E` (Rose Coral)
  - *Pending / Escrow Warning:* `#F59E0B` (Amber Gold)
  - *Text Primary:* `#F8FAFC` (Slate 50)
  - *Text Secondary / Meta:* `#94A3B8` (Slate 400)
  - *Text Muted:* `#64748B` (Slate 500)

## Typography

The typographical framework is engineered for numeric precision, fast visual scanning, and cross-lingual parity.

- **Headline (`Space Grotesk`):** Modern, geometric, and distinctively technical. Gives executive summaries and account overviews an assertive, tech-forward authority.
- **Body & Operations (`Inter`):** Neutral, utilitarian, and rendered with optimized optical kerning for high-density ledgers and complex forms.
- **Ledger & Metrics (`JetBrains Mono`):** Dedicated to currency counts (PKR amounts, transaction hashes, timestamps, IBANs), ensuring monospaced, columnar visual alignment.
- **Urdu Script Adaptability:** Urdu typography must leverage system fallback Naskh/Nastaliq font stacks (such as `Noto Nastaliq Urdu` or `Noto Sans Arabic`) alongside `Inter`. When switching to Urdu locales:
  - Increase line-height multiplier by `1.25x` to prevent diacritical and vertical glyph clipping.
  - Scale baseline text up by `1px` relative to English body copy to ensure comparable legibility.

## Layout & Spacing

The layout model is anchored on an 8pt spatial grid with a 4pt sub-grid for fine internal component alignments (chips, inputs, data badges).

- **Grid Architecture:** 
  - **Mobile (< 768px):** 4-column layout, `1rem` outer margins, `1.25rem` gutter. Stacked single-column card flows prioritize quick entry and balance checks.
  - **Tablet (768px - 1024px):** 8-column layout, `1.5rem` margins, dynamic double-column ledger arrangement.
  - **Desktop (> 1024px):** 12-column layout with a fixed max-width container of `1440px` and `2.5rem` margins, offering split-pane views for real-time ledger auditing and live reconciliations.
- **Bidirectional Reflow (RTL / LTR):** The layout system automatically swaps column alignments, action sheet triggers, and sidebar drawers when toggled to Urdu, preserving identical structural rhythm without breaking grid geometry.

## Elevation & Depth

In this dark fintech paradigm, depth is primarily communicated through **controlled surface tonal shifts** and **low-contrast structural borders**, rather than heavy blurry drop shadows.

- **Level 0 (Canvas):** `#070D18` — Base viewport background.
- **Level 1 (Card & Module Shells):** `#0D1627` with a 1px continuous stroke of `#17233B`. No shadow on static rest.
- **Level 2 (Hover & Elevated States):** `#111C33` with a 1px border of `#203152` and an ambient tint shadow `0 8px 24px -4px rgba(0, 0, 0, 0.45)`.
- **Level 3 (Modals, Slide-overs, & Popovers):** `#0E182B` with a border of `#253960`, augmented by a subtle mint rim illumination `0 0 0 1px rgba(0, 212, 159, 0.15), 0 20px 32px -8px rgba(0, 0, 0, 0.7)`.
- **Active Interactive Glow:** Critical primary actions feature a micro-ambient glow `0 0 16px rgba(0, 212, 159, 0.25)` to direct immediate visual focus.

## Shapes

The shape system adopts **Level 2 Roundedness**, balancing functional enterprise precision with tactile consumer appeal:

- **Standard Elements (0.5rem / 8px):** Applied to form fields, data badges, verification pills, and tabular rows.
- **Container Surfaces (1rem / 16px):** Applied to transaction cards, dashboard metric pods, financial ledger tables, and modal dialogs.
- **Hero & Drawer Panels (1.5rem / 24px):** Applied to expansive hero balance cards and sliding mobile settlement sheets.
- **Full Pill (`9999px`):** Reserved exclusively for dynamic status chips (e.g., "Settled", "Raast Verified", "SBP Compliant") and quick counter tags.

## Components

### Buttons & Interactive Controls
- **Primary CTA:** Solid background of vibrant mint (`#00D49F`) with dark navy label text (`#070D18`), weight 600. On hover, background shifts to `#00F0B5` with a subtle outer glow (`rgba(0, 212, 159, 0.3)`).
- **Secondary CTA:** Surface `#0D1627` with a 1px border of `#0EA5E9` and text in `#0EA5E9`. Hover introduces a 10% alpha cyan fill.
- **Ghost / Tertiary Action:** Transparent background with `#94A3B8` text, transitioning to `#F8FAFC` and surface `#17233B` on hover.

### Financial Data Cards & Ledgers
- Base container styled with `#0D1627` and border `#17233B`.
- Header houses the dual-script account title alongside a monospaced identifier.
- Currency counters highlight credits in `#00D49F` and debits in `#F43F5E`, paired with tabular alignment for immediate balance scanning.

### Pakistani Fintech Rails & Compliance Badges
- **Trust Chips (Raast, 1LINK, SBP Regulated):** High-density pills built on a subtle `#0D1627` base, bounded by a 1px border (`rgba(14, 165, 233, 0.3)`), containing an active indicator dot (`#0EA5E9`) and `JetBrains Mono` label text.
- **State Badges:**
  - *Cleared / FBR Active:* Green tint (`rgba(0, 212, 159, 0.1)` fill, `#00D49F` border, `#00D49F` label).
  - *Pending Verification:* Amber tint (`rgba(245, 158, 11, 0.1)` fill, `#F59E0B` border, `#F59E0B` label).

### Input Fields & Ledger Entries
- Inputs reside on a recessed background `#050912` with a 1px border of `#17233B`.
- Default text `#F8FAFC` and placeholder `#64748B`.
- Focus state triggers an outline transition to `#00D49F` with an inner ring shadow `0 0 0 1px #00D49F`.
- Dual LTR/RTL support: Currency prefix `PKR` or `روپے` shifts gracefully based on document directionality without breaking input margins.

### Checkboxes, Radio Buttons, & Switches
- Checkbox frames use `#17233B` border on `#070D18`. When checked, surfaces fill with `#00D49F` displaying a `#070D18` tick mark.
- Toggle switches use a track of `#17233B` and active thumb of `#00D49F`.