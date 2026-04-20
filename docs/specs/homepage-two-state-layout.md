# Spec: Homepage Two-State Responsive Layout

## Current Problem Summary
- The About homepage uses a fixed three-column grid in [`src/components/About.jsx`](/Users/tarushsinha/Documents/tarushsinha.github.io/src/components/About.jsx) and [`src/App.css`](/Users/tarushsinha/Documents/tarushsinha.github.io/src/App.css) with no breakpoint-driven layout switch.
- Narrow and portrait viewports therefore get a squeezed desktop layout instead of a real mobile reading flow.
- The Recent Writing rail is height-coupled to the grid and uses internal scrolling, which can feel visually truncated when the surrounding columns do not establish a stable shared height.
- The layout relies on `flex: 1`, `min-height: 0`, and nested overflow rules that are useful for the wide desktop shell but awkward for a stacked page that should scroll naturally.

## Objective
Create exactly two strong homepage layout states driven primarily by viewport width:
- `stacked`: a true single-column vertical flow for narrow and portrait-like widths
- `wide`: the existing desktop-style multi-column composition for wide viewports

Preserve all current homepage content, navigation, links, atlas/about/wiki routing, and data rendering.

## Target Behavior

### Stacked State
- Triggered by narrow available width, not device detection.
- Uses a single-column reading flow in this order:
  1. Intro/about
  2. Profile/action links
  3. Recent writing
  4. Atlas/map preview
  5. Stats
- Show at most 5 recent writing items in the homepage stack so the section stays scannable without an internal scroll region.
- Page height is content-driven and scrolls naturally.
- Remove desktop-only height coupling and internal panel assumptions where they cause cutoff behavior.

### Wide State
- Triggered by one strong desktop breakpoint.
- Preserves the existing multi-column homepage feel.
- Recent Writing remains a dedicated rail and visually reaches the bottom of the page region.
- If the post list exceeds the available region, the list may scroll internally without the panel appearing prematurely cut off.

## Breakpoint Strategy
- Use a width-first breakpoint in CSS for the homepage layout shell.
- Default to the stacked layout and promote to the wide layout at a single strong breakpoint once there is enough horizontal space to support three intentional regions.
- Do not introduce a separate device-class mode. Avoid portrait-desktop hacks unless a minor refinement is required after implementation.

## DOM / CSS Strategy
- Keep existing homepage content and interactions, but refactor the About page shell into explicit layout regions that are easy to reorder in stacked mode.
- Split the current combined left column into semantic intro and links sections so stacked mode can place links directly after the intro without changing behavior.
- Use a single homepage grid definition for wide mode and a simple vertical flow for stacked mode.
- Let the outer homepage container size naturally in stacked mode; only use `min-height: 0` and internal overflow on the Recent Writing region in wide mode where the desktop rail benefits from it.
- Keep atlas, wiki, article, and nav behavior unchanged unless a small shared layout fix is required for consistency.

## Risks / Regression Points
- Route and link callbacks on About must remain unchanged.
- Atlas and Wiki layouts share the same stylesheet; homepage-specific changes must not regress their rendering.
- Wide-mode height balancing can regress if `min-height: 0`, grid stretch, or nested overflow are applied in the wrong place.
- Stacked-mode ordering must remain semantically and visually intentional without duplicating content.

## Verification
- Run existing unit tests.
- Build with `npm run build`.
- Manually verify About in narrow and wide widths, including nav, Recent Writing clicks, atlas entry points, and wiki navigation.
