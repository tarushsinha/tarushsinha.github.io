# Spec: Wiki Topic Filtering

## Objective
Add a native topic-filtering flow to the wiki by surfacing topical metadata from existing content entries. Success means article and blog content can expose normalized topics, the wiki renders a dedicated topic filter section under the existing type filters, and filtering changes the visible wiki entries without altering unrelated wiki behavior.

## Assumptions
- The wiki is a React app built with `react-scripts`.
- Markdown front matter is the source of truth for article/blog topic metadata.
- `type` remains the canonical content-classification field.
- Existing `tags` front matter may currently contain both topical labels and type markers such as `article`; the sync flow may normalize that to topical tags only.

## Commands
- Build: `npm run build`
- Test: `CI=true npx react-scripts test --watch=false --runInBand`
- Wiki sync: `npm run atlas`

## Project Structure
- `cli/atlas-cli.js` -> markdown/front-matter normalization and wiki data generation
- `src/data/wiki.js` -> generated wiki entry data consumed by the UI
- `src/components/Wiki.jsx` -> wiki filters and list rendering
- `src/App.css` -> wiki filter/topic styling
- `src/lib/` -> pure wiki topic/filter helpers and tests

## Code Style
Keep the change additive and low-risk. Prefer pure helper functions for normalization/filtering, preserve current naming and UI patterns, and keep metadata behavior explicit.

```js
const topics = normalizeContentTopics(frontmatter);
const visiblePosts = filterWikiPosts(posts, { type: selectedType, topic: selectedTopic });
```

## Testing Strategy
- Add small Jest tests for topic normalization and wiki filtering helpers.
- Cover mixed content inputs, including article and blog entries, duplicate tags, and type-like tags that should not surface as topics.
- Run the full build after implementation to confirm the UI still compiles.

## Boundaries
- Always: preserve current wiki type filters, keep `type` separate from topic metadata, keep changes additive
- Ask first: collection renames, content-directory moves, broad metadata redesign, cross-page visual refactors
- Never: modify reading-time logic, delete user content, change unrelated wiki/about/atlas behavior

## Content Contract For Tags / Topics
- Canonical front-matter field: `tags`
- Accepted legacy alias on read: `topics`
- `type` stays separate and is not surfaced as a topic
- During sync, `tags` and `topics` are merged, trimmed, deduped case-insensitively, and written back as `tags`
- Type-like values such as `article`, `blog`, `podcast`, `essay`, and `wiki` are treated as classification hints, not surfaced topics
- Generated wiki entries expose `topics: string[]`
- Topic filtering matches normalized topic labels from generated wiki entries

## Success Criteria
- Markdown content with `tags` or legacy `topics` produces normalized `topics` in generated wiki data
- If article and blog content both exist, both contribute topics to wiki filtering
- The wiki renders a dedicated topic filter section below the existing type filters
- Selecting a topic updates the visible wiki entries correctly
- `npm run build` succeeds

## Open Questions
- None blocking for this change; podcasts will remain type-filterable and may optionally carry topics if metadata is present, but the primary contract is for article/blog markdown content.
