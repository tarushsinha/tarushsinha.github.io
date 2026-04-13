# Spec: Article Reading Time

## Assumptions
- Articles and blog posts are rendered through `src/components/Wiki.jsx` by fetching markdown from `public/content/**`.
- Reading time is only required on local markdown article pages, not on podcast/external-link entries.
- A lightweight estimate based on markdown body word count is acceptable; exact per-reader timing is not required.

## Objective
Add an automatic reading-time label to article pages and wiki list rows so existing markdown posts show a concise, consistent estimate without manual frontmatter maintenance.

## Commands
- Build: `npm run build`
- Test: `CI=true npx react-scripts test --watch=false`
- Dev: `npm start`

## Project Structure
- `src/components/Wiki.jsx` renders the article page and fetches markdown content.
- `src/utils/readingTime.js` will hold computed reading-time logic.
- `src/**/*.test.js` will hold behavior tests for the new utility.

## Code Style
Use small pure functions for markdown-to-reading-time computation and keep UI changes additive in the existing article metadata area.

## Testing Strategy
- Add unit tests for reading-time estimation from markdown with frontmatter, links, code fences, and existing article content.
- Verify generated wiki metadata includes computed reading time for markdown posts.
- Run the production build to verify the article page and wiki list still compile through the current architecture.

## Boundaries
- Always: keep the change additive, computed, and scoped to article rendering.
- Ask first: adding new dependencies, changing content schema, or altering wiki sync behavior broadly.
- Never: manual per-article reading-time metadata, collection renames, or unrelated wiki/travel refactors.

## Success Criteria
- Local markdown article pages show a reading-time label with consistent formatting.
- Wiki list rows show reading time for local markdown posts without manual metadata edits.
- Existing article rendering still works for current markdown content.
- The computation works for multiple markdown article shapes without manual metadata edits.
- `npm run build` succeeds.

## Open Questions
- None blocking. The default estimate will use `145` words per minute.
