# Branding & Design System

## 1. Typography (Totem)

- **Font Family:** `Inter`, sans-serif (MUI Joy Default).
- **Headers:**
  - `h1` (24px/32px): Page Titles.
  - `h2` (20px/28px): Section Headers.
  - `h3` (18px/24px): Card Titles / Key Metrics.
  - `title-lg` (16px): Subsection Headers.
- **Body:**
  - `body-md` (14px): Standard text.
  - `body-sm` (12px): Secondary text / metadata.
  - `body-xs` (10px): Tertiary text / captions.

## 2. Color Palette (Theme Tokens)

- **Primary:** Slate/Grey (#374151 base). Used for structural elements and active states.
- **Backgrounds:**
  - `background.body`: Main app background.
  - `background.surface`: Card/Sheet backgrounds.
  - `background.level1`: Muted areas / sidebars.
- **Semantic Colors:**
  - **Success:** Positive values, Income, Savings, Growth.
  - **Danger:** Negative values, Debt, Overdue, Errors.
  - **Warning:** Alerts, Overdraft Risks.
- **Gradients:**
  - Use subtle linear gradients for progress bars (e.g. Overdraft projection).

## 3. Component Standards

- **Cards:** `variant="outlined"` with `borderRadius="sm"`.
- **Avatars:** `size="lg"` for entity headers, `size="sm"` for lists/assignees.
  - Dynamic Background: `getEmojiColor(emoji, isDark)`
- **Inputs:** `variant="outlined"` or `soft`.
- **Buttons:** `variant="solid"` for primary actions, `variant="plain"` or `soft` for secondary.

## 4. Module Header Standard (The "Passport" Header)

All top-level dashboard pages (Household, Finance Modules, People, etc.) MUST use the `ModuleHeader` component:

- **Left Side:**
  - **Avatar:** `size="lg"` (64px) with dynamic emoji background.
  - **Title:** `h2` heading.
  - **Subtitle:** `body-sm` description.
- **Right Side:**
  - **Action Stack:** Primary actions (e.g. "Add New", "Edit") stacked horizontally.

## 5. Financial Card Standard

All financial dashboard cards MUST adhere to this layout (implemented in `FinanceCard`):

### A. Header Row

- **Left:**
  - **Avatar:** `size="lg"` (64px usually), dynamic emoji background.
  - **Text:** Title (`title-lg` or `h3`) + Subtitle (`body-sm`, e.g., Provider/Bank).
- **Right:**
  - **Primary Metric:** `h3` (e.g., Balance, Valuation).
    - **Color:** `success` (Assets/Income/Positive) or `danger` (Liabilities/Debt/Negative).
  - **Secondary Metric:** `body-xs` (e.g., Interest Rate, AER, Limit).

### B. Body

- **Divider:** Horizontal divider separating header from content.
- **Content:** Grid or Stack of metrics (Progress bars, dates, breakdown).

### C. Footer

- **Top Border:** Optional (if distinct from body).
- **Left:** `AvatarGroup` (Assignees).
- **Right:** Action Buttons (Edit, Delete, Add Pot, etc.).

## 5. Tone & Voice

- **Professional but Personal:** "Manage your household wealth" not "Data Entry".
- **Direct:** "Add Income" not "Click here to add a new income source".
- **Encouraging:** Use Green/Success colors for positive financial habits.
