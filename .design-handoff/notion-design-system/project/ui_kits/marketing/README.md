# Notion — Marketing UI Kit

Recreates notion.so's marketing surfaces.

## Pages
- **Home** — hero, customer logos, three feature cards, building blocks grid, final CTA
- **Pricing** — 4-tier comparison (Free / Plus / Business / Enterprise)
- **Sign up** — work-email + SSO (Google/Apple) with the warm-tinted "Continue with email" button (lifted exactly from Figma node 2:26960)
- **AI** — Notion AI page in dark theme

## Components (`components.jsx`)
`NotionLogo`, `TopNav`, `Section`, `SectionEyebrow`, `Footer`, plus three illustration placeholders (`DoodleDesk`, `DoodleBlocks`, `DoodleTeam`) standing in for the real hand-drawn brand vignettes.

## Notes
- Layout grid: ~1100px max content. Outer 32px gutter.
- Section vertical rhythm: 96–120px between hero blocks.
- Primary CTA (`Try Notion free`) is *always* the rightmost element of the nav.
- All copy lifted verbatim from the Figma source.
