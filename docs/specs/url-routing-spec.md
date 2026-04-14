# Spec: URL-Based Navigation

## Current Behavior
- The site is a single-page app with section state held in `src/App.jsx`.
- Primary navigation is driven by local React state (`tab`) rather than the browser URL.
- Wiki article detail is also local state (`selectedWikiPost`), so returning to Wiki can reopen the last article unless the parent resets it.
- Direct deep links like `/wiki/protein-supplement-comparison` are not resolved by the app today.

## Objective
Introduce lightweight URL-driven routing so the browser location is the source of truth for the active section and wiki article, while preserving the existing layout and visual design.

## Route Model
- `/` -> About
- `/about` -> redirect to `/`
- `/wiki` -> Wiki landing page
- `/wiki/:articleSlug` -> Wiki article detail
- `/atlas` -> Atlas
- Unknown `/wiki/:slug` -> fallback to `/wiki`
- Unknown non-wiki routes -> fallback to `/`

## Wiki Article State
- Wiki article state is URL-derived, not persisted in local component state.
- Clicking a wiki post pushes `/wiki/:articleSlug`.
- Clicking Back from article detail returns to `/wiki`.
- Navigating away from Wiki and then returning to `/wiki` must always show the wiki landing page.
- Article slug resolution uses `post.slug` when available, otherwise `post.id`, then filename/title-derived slug as a final fallback.

## Implementation Approach
- Use the browser History API (`pushState`, `replaceState`, `popstate`) instead of introducing a routing library.
- Add small route helpers for path normalization, route matching, canonical path generation, and wiki slug lookup.
- Keep route definitions declarative and centralized in a small helper module.
- Add a `public/404.html` redirect shim so GitHub Pages direct visits to nested routes bootstrap the SPA correctly.

## Verification
- Unit-test route parsing and canonical path generation.
- Build the app with `npm run build`.
- Verify route-driven navigation for navbar, About internal links, Atlas internal links, wiki list rows, article back navigation, and deep-link rendering.

## Boundaries
- Preserve current layout and styling.
- Do not refactor unrelated content, atlas logic, or topic filtering behavior.
- Keep changes scoped to navigation, routing helpers, and wiki article selection flow.
