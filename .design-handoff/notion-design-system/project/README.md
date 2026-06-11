# Notion Design System

A recreation of Notion's visual language and UI kit, distilled from a community-rebuilt Figma file. This system covers Notion's marketing surfaces (notion.so homepage, pricing, product pages, sign-up) and the core in-product workspace (sidebar, page editor, blocks, inline UI).

Notion is "the connected workspace where better, faster work happens" — wikis, docs, and projects in one tool, with an editor built around composable blocks.

## Sources

- **Figma file:** *Notion UI – Free UI Kit (Recreated) (Community)* — mounted as a virtual filesystem and used as the primary source of truth for layout, color, type, spacing and copy. Frames focused on:
  - `46-3` — homepage / iOS+Android landing (1440 wide)
  - `46-4` — sign-up screen (1440 wide)
  - `46-6` — sign-up alternate (1440 wide)
  - `46-7` — Connections detail (Make integration)
  - `46-11` — Notion AI marketing page (dark theme reference)
  - `46-13`, `46-14` — long-scroll homepage variants (1920 wide)
  - `46-1` (Wiki/Docs/Projects), `46-2` (Wiki only), `46-5` (Notion for everyone), `46-8` (Tired of Evernote?), `46-12` (Careers) for additional patterns
- **Uploaded font files:** *requested* `SFPRODISPLAYBOLD.OTF`, `SFPRODISPLAYMEDIUM.OTF`, `SFPRODISPLAYREGULAR.OTF`, `SFPRODISPLAYTHINITALIC.OTF`, `SFPRODISPLAYULTRALIGHTITALIC.OTF` — **NOT actually present** in `uploads/` at build time. See "Font substitutions" below.

## Font substitutions (please confirm)

The Figma uses **Inter** as the primary typeface (1,547 occurrences across all weights — Regular, Medium, Semi Bold, Bold) plus **Helvetica** as a secondary face used inside mocked product screenshots. The brief mentioned uploading SF Pro Display files but `uploads/` was empty, so we picked **Inter** for UI/body and the user later uploaded **Helvetica Now Display Medium** which is now wired in as the display face for h1/h2 headlines (via `--font-display`).

If you want SF Pro Display back, please re-attach the .OTF files and we'll swap. SF Pro and Inter share very similar metrics, so the swap is one-line in `colors_and_type.css`.

## Themes

This system ships **two coordinated themes**:

1. **Light (warm)** — `--bg: #FFFDFA` (the warm off-white Notion uses across marketing) with `#37352F` body text. This is the bright, paper-like daytime theme — what notion.so looks like out of the box.
2. **Dark** — `#191919` background with near-white text, scaled grays from the in-product dark mode plus a slightly desaturated red accent so it doesn't vibrate against the dark canvas.

Both themes share the same red accent (`#EA4E43`) used for the primary CTA, the same blue (`#2383E2`) for hyperlinks/focus, and the same warm neutral scale anchored on Notion's signature `#37352F`.

## Index

- `README.md` — this file (start here)
- `SKILL.md` — Agent-Skills-compatible entry point
- `colors_and_type.css` — CSS variables for color, type, spacing, radius, shadow (both themes)
- `fonts/` — local font face declarations / Google Fonts loader
- `assets/` — Notion logo (mark + wordmark), product icons, sign-up provider icons
- `preview/` — design system cards (typography, color, spacing, components, brand)
- `ui_kits/`
  - `marketing/` — notion.so homepage, pricing, sign-up, AI page (dark)
  - `app/` — in-product workspace (sidebar, editor, blocks, command menu)

---

## Content fundamentals

Notion's voice is **plainspoken, confident, slightly wry**. Sentences are short. Verbs do the work. The brand never tries to sound enterprise.

**Tone & person**

- Second person, almost always — "your team," "you can," "build your own."
- First-person plural for company moments only ("We craft an experience…", "We adapt to the way your team thinks").
- Direct address. Never "users," rarely "customers."

**Casing**

- Sentence case for headlines, body, navigation, buttons. Title Case is reserved for product proper nouns ("Notion AI", "Web Clipper").
- Section labels in marketing footers/columns use **Sentence case** ("Get started", "Switch from Evernote") — not ALL CAPS, not Title Case.

**Punctuation & rhythm**

- Em dashes — used freely, no spaces around them in editorial copy ("knowledge base — Notion is your team's all-in-one workspace").
- Periods on body sentences. Headlines often drop the period for shorter, punchier delivery: "Tasks. Projects. Infinite flexibility." — but full stops on declarative phrases are fine.
- Triple-noun headlines are a recurring beat: *"Your wiki, docs, & projects. Together."* / *"Tasks. Projects. Infinite flexibility."* / *"New tools, new ways to work."*

**Concrete vocabulary**

- "Workspace" not "platform." "Page" not "document." "Block" for the atomic unit. "Connect" for integrations. "Build" for the verb cluster around making your own setup.
- Pricing tiers: Free, Plus, Business, Enterprise. The legacy "Personal Pro" survives in some flows.
- Product nouns: Notion AI, Wikis, Docs, Projects, Calendar, Connections, Templates, AI Connectors, API.

**Emoji**

- Almost never in marketing copy. Notion's brand voice is restrained.
- Inside the *product* emoji are everywhere — every page can have one as its icon, and they're a load-bearing visual element. The marketing site, ironically, leaves emoji out and leans on the hand-drawn illustration set instead.

**Examples (lifted verbatim from the Figma)**

- Hero: "Your wiki, docs, & projects. Together."
- Sub: "Notion is the connected workspace where better, faster work happens."
- Section header: "Powerful building blocks"
- Body: "Notion adapts to the way your team thinks and works."
- CTA: "Try Notion free" / "Request a demo" / "Get started"
- Form: "Work email" / "Enter your email address..." / "Continue with email"
- Legal: "By clicking 'Continue with Apple/Google/Email/SAML' above, you acknowledge…"

**Vibe**

Calm, confident, generous with whitespace. Reads like a thoughtful product team explaining their tool to another thoughtful product team. Never hypes. Never uses words like "revolutionary" or "delightful." Lets the product (and the customer logos and quotes) carry the emotional weight.

---

## Visual foundations

### Color

Notion's palette is **warm neutral on warm off-white**, with a single saturated red accent and a sparingly used blue.

- **Background (warm white):** `#FFFDFA` — slightly cream. Almost everything sits on this.
- **Slight-warm panel:** `#F9F5F1` — used for grouped sections, comparison cards.
- **Card / surface:** `#FFFFFF` pure — actual paper-white cards are reserved for floating UI (popovers, table rows, mock screenshots).
- **Body text:** `#37352F` — the most-used non-black. Almost-black, slightly warm. This is the *Notion brown-black*.
- **Display text:** `#040404` / `#050505` / `#000` for the boldest headlines.
- **Muted text:** `rgba(55,53,47,0.65)` — for labels, captions, footers.
- **Subtle borders:** `rgba(55,53,47,0.16)` for hairlines; `rgba(15,15,15,0.15)` for control borders.
- **Accent (red):** `#EA4E43` — primary CTA fill, brand splash, the "Try Notion free" button. Used sparingly — typically one per viewport.
- **Soft red surface:** `#FDECC8` warm cream / `#FDF5F2` for "Continue with email" tinted button.
- **Link / focus blue:** `#2383E2` and `#0A85D1` — for inline links, focus rings, callouts inside the editor.

Dark theme inverts the canvas to `#191919` and steps up to `#2F2F2F` for elevated surfaces, with text at `#E6E6E5` and dimmed text around `rgba(255,255,255,0.6)`. The accent red shifts to `#FF675F` (slightly desaturated) so it doesn't vibrate.

### Type

- **Display / headlines:** **Helvetica Now Display Medium** — uploaded by the user (`fonts/HelveticaNowDisplay-Medium.ttf`). Used for h1/h2 hero copy via `--font-display`. Tracks slightly tight (`-0.02em` / `-0.015em`) per modern Notion display lockups.
- **UI / body:** Inter (Notion uses a stack of "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI Variable Display', 'Segoe UI', Helvetica, 'Apple Color Emoji', Arial, sans-serif"). For this kit, we load **Inter** from Google Fonts — the Figma uses Inter throughout for body and UI.
- **Editorial / serif:** Georgia (used for the alternate "Serif" page style inside Notion). 6 occurrences in the source.
- **Mono:** `iawriter-mono, Nitti, Menlo, Courier, monospace` — Notion's native code stack.
- **Weights in active use:** 400 Regular (body), 500 Medium (UI labels, nav), 600 Semi Bold (sub-headings, emphasis), 700 Bold (display headlines, big numbers).
- **Headline scale:** Big hero is **50px / 700** at `lineHeight: 55px`. Sub-hero is 36px or 24px. Section titles 18px Bold. Body 14–16px.
- **Letter-spacing:** Effectively zero. Notion does not track its type. The display headlines feel airy because of generous leading, not letter-spacing.

### Spacing & layout

- **Marketing grid:** 1440 or 1920 wide canvas, hero content centered to ~960px column. 240px outer gutter on the 1440 layout.
- **Spacing scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 80 / 120 / 160. The sign-up form lives in a 320×414 card. Section gaps run 80–160px.
- **In-product:** much tighter. Sidebar items 28px tall. Block padding 3px / 2px. Page max-width 708px (the famous "narrow" page width) or full bleed.

### Backgrounds

- Almost always **flat warm white** for marketing and **flat dark** for AI / dark-theme pages. No gradients on the main canvas.
- Section backgrounds shift to `#F9F5F1` to group features without using cards.
- Notion AI page uses **pure black `#000`** with a subtle violet hero gradient.
- Hand-drawn line illustrations are everywhere as the dominant brand imagery — small, monochrome (#37352F on warm white), placed beside section headers, never full-bleed photography.

### Animation

- Notion is mostly **still**. Marketing pages have minimal animation; the in-product UI is all about responsiveness, not flourish.
- Hover states use **opacity drops** (`opacity: 0.85`) or background tint (`rgba(55,53,47,0.06)` hover background on sidebar items).
- Press: a brief background darken on buttons; the red CTA goes one shade darker on press, no shrink.
- Easing when used: standard `cubic-bezier(0.4, 0, 0.2, 1)`, ~150ms. Drag-to-reorder is the rare exception with a subtle lift shadow.

### Hover & press

- **Sidebar/menu items:** `background: rgba(55,53,47,0.08)` on hover; `0.16` on active/pressed.
- **Buttons (primary red):** `#EA4E43` → `#D9433A` on hover. No transform.
- **Buttons (secondary):** white card → `#F9F5F1` on hover, plus a 1px darker border.
- **Links:** underline on hover; color stays `#2383E2`.
- **Block hover (inside editor):** the `+` and `⋮⋮` handles fade in at the left margin (`opacity 0 → 1`, ~80ms).

### Borders & dividers

- Borders are almost always **hairlines**: `1px solid rgba(55,53,47,0.16)` for content dividers, `1px solid rgba(15,15,15,0.15)` for control outlines.
- Inputs gain a focus ring of `0 0 0 2px rgba(35,131,226,0.35)` plus a `1px` inset blue border.

### Shadows (THE Notion shadow system)

Notion uses a **stacked, multi-layer, very subtle shadow** as its signature elevation. From the Figma:

```
0px 0.667px 3.502px 0px rgba(0,0,0,0.008),
0px 2.933px 7.252px 0px rgba(0,0,0,0.016),
0px 7.200px 14.462px 0px rgba(0,0,0,0.02),
0px 13.867px 28.348px 0px rgba(0,0,0,0.024),
0px 23.333px 52.123px 0px rgba(0,0,0,0.03),
0px 36px 89px 0px rgba(0,0,0,0.04)
```

This 6-layer shadow is the headline / hero card lift. Smaller shadows for buttons and inputs use just one or two layers. Inputs get an inset shadow on focus instead of a glow. We expose three named tiers in CSS: `--shadow-1` (subtle), `--shadow-2` (popover), `--shadow-3` (the famous hero stack).

### Corner radius

- **3–4px** for buttons, inputs, sidebar items. Notion is *not* a 12-or-16px-radius brand. It's tight, square-ish, paper-feeling.
- 6–8px for cards and tooltips.
- The famous Notion `N` logo / page favicon uses a `2px` radius on its container.
- No fully-rounded pills except a couple of feature badges.

### Transparency & blur

- Used sparingly. The editor's slash menu and command palette use a `rgba(255,255,255,0.95)` background with `backdrop-filter: blur(8px)` over the page content.
- Sidebar in dark mode uses subtle alpha on hover backgrounds (`rgba(255,255,255,0.06)` → `0.10`).

### Imagery & illustration

- **Black-line, hand-drawn vignettes** are Notion's signature illustration style — a person at a laptop, a snail with a shell of files, etc. Always monochrome (`#37352F`) on warm white, never colored. Replicate the *placement* and *vibe*; don't redraw.
- Customer logos appear as a wordmark row, in their own brand colors at small size (Pixar, Curology, Loom, MatchGroup, Headspace).
- Product mock screenshots show real-looking Notion pages — text-heavy, light backgrounds, tiny font sizes used purely for "look at the depth of this."

### Layout rules

- Generous vertical whitespace: 80–160px between hero sections.
- Headlines hard-wrap to 2 lines at most. The wrap point is intentional ("Your wiki, docs, & projects. \n Together.") — designed.
- Marketing top nav is fixed at the very top: 70px tall, 1300px max content width, logo left + nav center + Demo/Login/CTA right.
- The red CTA is *always* the rightmost element in the nav. It's the only red on the screen most of the time.

