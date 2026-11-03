---
name: Digi Hisab Ledger
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#43474d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777e'
  outline-variant: '#c4c6cd'
  surface-tint: '#4b607a'
  primary: '#000a19'
  on-primary: '#ffffff'
  primary-container: '#0b2239'
  on-primary-container: '#758aa6'
  inverse-primary: '#b3c8e6'
  secondary: '#006c4e'
  on-secondary: '#ffffff'
  secondary-container: '#8cf4c7'
  on-secondary-container: '#007151'
  tertiary: '#000c08'
  on-tertiary: '#ffffff'
  tertiary-container: '#00261f'
  on-tertiary-container: '#009983'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e4ff'
  primary-fixed-dim: '#b3c8e6'
  on-primary-fixed: '#051d33'
  on-primary-fixed-variant: '#344861'
  secondary-fixed: '#8ff6ca'
  secondary-fixed-dim: '#72daaf'
  on-secondary-fixed: '#002115'
  on-secondary-fixed-variant: '#00513a'
  tertiary-fixed: '#57fbdb'
  tertiary-fixed-dim: '#2adec0'
  on-tertiary-fixed: '#00201a'
  on-tertiary-fixed-variant: '#005144'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '800'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
  currency-display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system is constructed specifically for Pakistani micro-merchants (*dukandars*, *karyana* owners, wholesalers, and stallholders) operating in high-velocity, high-distraction retail settings. The brand personality balances institutional financial trust with street-level accessibility: reliable, rapid, dignified, and unmistakable.

The aesthetic fuses **Tactile Modernism** with **High-Contrast Utilitarianism**. Shop environments in urban markets (such as Anarkali or Jodia Bazaar) are characterized by glaring outdoor sunlight, fluctuating overhead fluorescent tube lights, dust, and constant physical disruption. The interface rejects subtle low-contrast gradients and fragile hairline dividers in favor of crisp delineation, solid surfaces, distinct balance ledgers (*Udhaar* vs. *Jama*), and finger-friendly tactile interaction targets.

Microcopy treats Roman Urdu and Nastaliq/Urdu scripts as first-class citizens alongside international numeral formatting. Critical financial status markers (such as cash drawer *Galla*, credit receivables *Lena Hai*, and supplier payables *Dena Hai*) must be legible at arm's length on low-cost Android displays under direct ambient glare.

## Colors

The palette is engineered around high functional contrast, clear fiscal polarity, and immediate ledger comprehension:

- **Primary Canvas & Chrome (`#0B2239` - Deep Trust Navy):** Represents the merchant's financial safety and foundational trust. Used for top app bars, primary action triggers, and primary numerical readouts.
- **Emerald Accent (`#108A65` - Wasool / Lena Hai):** Signifies positive cash inflows, completed collections, settled balances, and verified transactions. Tuned darker than standard greens to retain AAA contrast against white cards and light backgrounds.
- **Cyan Beacon (`#00D2B4` - Fast Action / Broadcast):** High-energy accent reserved for quick-action shortcuts, dynamic WhatsApp payment reminders, and primary sync status beacons.
- **Warning & Payables Red (`#E11D48` - Dena Hai / Udhaar Payables):** An unambiguous high-urgency red denoting money owed to suppliers, customer credit limits exceeded, and debt collection deadlines.
- **Galla Amber (`#D97706` - Cash Drawer / Pending):** Symbolizes physical *Galla* cash holdings, pending reversals, or in-transit balance transfers.
- **Surfaces & Borders:** Base background sits on `#F8FAFC`, primary card containers on `#FFFFFF`, and structural boundaries are reinforced with `#E2E8F0` to prevent washed-out visual grouping on budget LCD screens.

## Typography

The typographic engine uses **Inter** with system fallback cascading to **Noto Sans Arabic** and native device UI fonts. This ensures that mixed strings (such as `"Rs. 4,500 وصول (Received)"`) render without baseline clipping or awkward font-weight mismatches.

### Typographic Rules
- **Currency & Numerals:** Pakistani Rupee representations must always render as `Rs. ` prefix followed by comma-delimited numeric figures (`Rs. 1,25,000`). Digits use tabular figures (`tnum`) to maintain vertical scanning stability down ledger rows.
- **Bi-Directional Support:** When localized into Urdu/Arabic script, text line-height scales upward automatically by 20% to prevent descender clipping of Nastaliq/Urdu glyphs.
- **Microcopy Hierarchy:** Primary headlines highlight the metric amount first; secondary text displays the merchant/customer name in Bold Roman Urdu; tertiary text displays transaction timestamp and payment mode in Medium neutral tone.

## Layout & Spacing

The layout is built for **mobile-first, single-thumb execution**. Shopkeepers frequently operate phones with one hand while managing counter inventory or weighing produce with the other.

- **Grid Discipline:** Content uses a fluid 4-column layout on mobile devices (`<600px`), shifting to an 8-column layout on counter-mounted tablet docks (`601px - 1024px`).
- **Touch Targets:** No interactive touchpoint may be smaller than 48px × 48px, with an explicit 56px minimum height for primary transaction buttons (`+ Wasool` / `+ Udhaar`).
- **Thumb Zone Allocation:** High-frequency workflows (voice notes, search bar, keypad input, WhatsApp sharing) are anchored firmly to the bottom 40% of the viewport.

## Elevation & Depth

Visual hierarchy uses **Tactile Tonal Framing** over soft decorative shadows. In dusty environments or screens at low brightness, standard Material-style diffused shadows render as muddy visual noise.

- **Level 0 (Canvas):** Pure `#F8FAFC` base surface.
- **Level 1 (Card & Row Panels):** `#FFFFFF` surfaces bounded by a crisp 1px solid `#E2E8F0` stroke. A subtle ground shadow provides anchor: `box-shadow: 0 1px 3px 0 rgba(11, 34, 57, 0.08)`.
- **Level 2 (Active Sheets & Sticky Summaries):** Floating bottom summary bars (e.g., total *Galla* + pending receivables) utilize `0 4px 12px -2px rgba(11, 34, 57, 0.12)` with a 1px top border of `#CBD5E1`.
- **Level 3 (Modals & Numeric Keypads):** Deep backdrop overlay using `rgba(11, 34, 57, 0.65)` blur (4px) combined with prominent high-contrast popover panels `0 10px 25px -5px rgba(11, 34, 57, 0.25)`.
- **Level 4 (Transaction Polarity Cards):** Lena (*Green*) and Dena (*Red*) cards feature a dedicated 4px solid left-edge anchor stripe in their respective functional color to convey state instantly without requiring text reading.

## Shapes

The design system implements a **`Rounded` (0.5rem base)** profile to produce friendly, modern, and sturdy cards, buttons, and input blocks. 

- **Primary Cards and Ledger Tiles:** `0.75rem` (`rounded-lg`) corner radii for structured stability.
- **Action Buttons & Form Inputs:** `0.5rem` (`rounded-md`) corner radii to maintain distinct boundaries without appearing playful or toy-like.
- **Transaction Badges & Chips:** `1rem` (`rounded-xl` / pill form) to distinguish state indicators clearly from clickable square buttons.

## Components

### 1. Action Buttons (Wasool vs. Udhaar Triggers)
- **Primary Received (`+ Wasool / Lena`):** Solid `#108A65` background, `#FFFFFF` text, 56px height, full-width or split 50/50 with payables. Tactile tap active state depresses by `1px` with a darker `#0D6F52` overlay.
- **Primary Sent (`- Udhaar / Dena`):** Solid `#E11D48` background, `#FFFFFF` text, 56px height. Active state triggers `#BE123C`.
- **WhatsApp Reminder Button:** `#FFFFFF` background with 1.5px solid `#108A65` border, emerald typography, paired with WhatsApp brand green indicator icon. Minimum target 48px height.

### 2. Merchant Ledger Cards
- High-contrast white containers (`#FFFFFF`) framed by `1px solid #E2E8F0`.
- Left-hand layout displays Customer Avatar / Urdu initial letter in a `#0B2239` badge, alongside Customer Name and last activity timestamp.
- Right-hand layout aligns numeric amounts cleanly: Emerald `#108A65` for receivables, Red `#E11D48` for customer debt.

### 3. Galla & Summary Overview Bar
- A dual-panel metric widget anchored at dashboard top or sticky bottom.
- Navy background (`#0B2239`) with contrast white text for "Kul Udhaar" (Total Receivables) and Amber accent (`#D97706`) for "Aaj Ka Galla" (Today's Cash in Drawer).

### 4. Input Fields & Quick Numpad
- **Entry Fields:** 52px height, 1.5px border in `#CBD5E1`, focusing to 2px solid `#0B2239`. Always displays large label text with integrated Rupee (`Rs.`) adornment inside the left slot.
- **Custom Numeric Entry Pad:** Large touch-friendly grid items (minimum 64px height) with tactile feedback vibration and high-contrast numbers for rapid transaction logging without invoking Android OS software keyboards.

### 5. Filter Chips & Quick Selectors
- Pill-shaped (`rounded-xl`), 36px height, 1px solid `#CBD5E1`. Selected state switches to solid `#0B2239` background with white text and a cyan `#00D2B4` count indicator badge.

### 6. Voice Note & Audio Receipt Trigger
- Circular or pill-shaped prominent button with a microphone glyph, highlighting audio recording confirmation (vital for non-literate staff logging transactions via voice memo).