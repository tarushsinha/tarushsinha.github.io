# Personal Site

Personal website with an illustrated interactive world map, wiki, and about page.
Built with React + D3. Deployed to GitHub Pages with `gh-pages`.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start local dev server
npm start
```

If you pulled changes that added wiki markdown rendering, rerun `npm install` so `react-markdown` is installed locally.

## Local Preview

Development preview:

```bash
npm start
```

This runs the React dev server for interactive local development.

Production build:

```bash
npm run build
```

This only creates the `build/` folder locally. It does not push anything to GitHub.

Production-build preview:

```bash
npx serve -s build
```

Use this after `npm run build` to preview the built site locally before deploy.

---

## Deploy to GitHub Pages

```bash
npm run deploy
```

Recommended flow for this repo:

1. Test locally with `npm start` for dev preview and `npm run build` for a production build.
2. Push your feature branch and merge it into `master`.
3. Check out `master` locally and pull the latest changes.
4. Run `npm run deploy` from `master` when you are ready to publish.

This runs `npm run build` and then pushes the built `build/` output to the `gh-pages` branch.
For this repository, the site should be live at `https://tarushsinha.github.io`.

For this to work, GitHub Pages should be configured to publish from the `gh-pages` branch.

---

## Managing Atlas and Wiki data

All locations, trips, and photo albums are stored in `src/data/atlas.js`.
Generated wiki metadata is stored in `src/data/wiki.js`.
Markdown article files live in `public/content/`.
Podcast metadata lives in `public/content/podcasts/index.json`.
Folder-based typing is supported during sync:

- `public/content/articles/*.md` → `type: "article"` and tag `article`
- `public/content/blog/*.md` → `type: "blog"` and tag `blog`

### Option A — CLI (recommended)

```bash
npm run atlas
```

Interactive terminal menu. Options:

| Action | What it does |
|---|---|
| Add location | Add a new city/place to the map |
| Add trip | Add a flight arc between two locations, pick color |
| Add visit | Log a visit to a location (date, notes) |
| Update photo album | Attach a Google Photos album URL to a visit |
| Remove trip | Delete a trip arc |
| List all | Print all current data |

Wiki actions:

| Action | What it does |
|---|---|
| Sync wiki manifest | Scans `public/content/**/*.md`, reads `public/content/podcasts/index.json`, prints updated markdown files and injected frontmatter, and regenerates `src/data/wiki.js` |
| Add podcast / external link | Appends a podcast entry to `public/content/podcasts/index.json`, then regenerates `src/data/wiki.js` |
| List wiki entries | Prints the current generated wiki manifest |
| Remove podcast entry | Removes a podcast / external link entry from `public/content/podcasts/index.json`, then regenerates `src/data/wiki.js` |

Recommended wiki workflow:

1. Export Notion articles as markdown into `public/content/articles/` or `public/content/blog/`
2. Run `npm run atlas` and choose `Wiki` → `Sync wiki manifest from content + podcasts`
3. Add any podcast / NotebookLM links via `Wiki` → `Add podcast / external link`
4. Preview with `npm start` or `npm run build`
5. Merge to `master` and run `npm run deploy` when ready

### Option B — Edit directly

Open `src/data/atlas.js` and edit the `LOCATIONS` and `TRIPS` arrays directly.
Open `src/data/wiki.js` to inspect the generated wiki manifest if needed.

**Location fields:**
```js
{
  id: "cityname",           // unique slug, no spaces
  name: "City Name",
  country: "Country",
  coords: [lng, lat],       // longitude first, then latitude
  hub: true,                // true = place you lived (filled pin)
  hubColor: "#a07848",      // pin color (only if hub: true)
  visits: [
    {
      id: "cityname-1",
      label: "Trip name",
      dateRange: "Month Year",
      notes: "Optional notes",
      albumUrl: "https://photos.google.com/...",  // or null
    }
  ],
}
```

**Trip fields:**
```js
{
  id: "trip-1",
  label: "NYC → London",
  from: "nyc",              // location id
  to: "london",             // location id
  color: "#7a6aaa",         // arc/thread color
  year: 2019,
}
```

---

## Customization

| What | Where |
|---|---|
| Your name | `src/App.jsx` — line 1 of the nav |
| Bio / about text | `src/components/About.jsx` |
| Generated wiki manifest | `src/data/wiki.js` |
| Wiki markdown article files | `public/content/*.md` |
| Podcast metadata | `public/content/podcasts/index.json` |
| External links (LinkedIn, GitHub, etc.) | `src/components/About.jsx` — the `LINKS` array |
| Color theme | `src/App.css` — `:root` CSS variables |
| Map projection | `src/components/Atlas.jsx` — `PROJECTION` constant |

---

## Tech stack

- React 18
- React Markdown
- D3-geo + Natural Earth projection
- TopoJSON world atlas (loaded from CDN)
- GitHub Pages via `gh-pages`
- Node.js CLI with Inquirer.js
