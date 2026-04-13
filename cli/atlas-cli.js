#!/usr/bin/env node
// =============================================================
//  ATLAS CLI  —  npm run atlas
//  Manage atlas data, sync markdown wiki posts, and manage podcasts.
//  Edits src/data/atlas.js, src/data/wiki.js, public/content/**/*.md,
//  and public/content/podcasts/index.json
// =============================================================

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { basename, dirname, extname, join, relative, sep } from "path";
import { fileURLToPath } from "url";
import { estimateReadingTime } from "../src/utils/readingTime.js";

const inquirer = (await import("inquirer")).default;
const chalk = (await import("chalk")).default;
const { nanoid } = await import("nanoid");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ATLAS_PATH = join(__dirname, "../src/data/atlas.js");
const WIKI_PATH = join(__dirname, "../src/data/wiki.js");
const CONTENT_DIR = join(__dirname, "../public/content");
const PODCASTS_DIR = join(CONTENT_DIR, "podcasts");
const PODCASTS_INDEX_PATH = join(PODCASTS_DIR, "index.json");

const WIKI_TYPES = ["article", "blog", "podcast"];
const FOLDER_TYPE_MAP = {
  articles: "article",
  article: "article",
  blog: "blog",
  blogs: "blog",
};
const CLASSIFICATION_TAGS = new Set(["article", "blog", "podcast", "essay", "wiki"]);

ensureDir(CONTENT_DIR);
ensureDir(PODCASTS_DIR);

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseArrayValue(value) {
  const inner = value.slice(1, -1).trim();
  if (!inner) return [];
  const parts = inner.match(/"[^"]*"|'[^']*'|[^,]+/g) || [];
  return parts
    .map((part) => part.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function normalizeLabel(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeLabelKey(value) {
  return normalizeLabel(value).toLowerCase();
}

function readListValue(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function readTopicMetadata(frontmatter) {
  return [...readListValue(frontmatter.tags), ...readListValue(frontmatter.topics)];
}

function normalizeContentTopics(frontmatter) {
  const seen = new Set();
  const topics = [];

  for (const rawTopic of readTopicMetadata(frontmatter)) {
    const label = normalizeLabel(rawTopic);
    const key = normalizeLabelKey(label);

    if (!label || CLASSIFICATION_TAGS.has(key) || seen.has(key)) continue;

    seen.add(key);
    topics.push(label);
  }

  return topics;
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---\n")) return { data: {}, body: raw };

  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return { data: {}, body: raw };

  const header = raw.slice(4, end).trim();
  const body = raw.slice(end + 5);
  const data = {};

  for (const line of header.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf(":");
    if (sep === -1) continue;

    const key = trimmed.slice(0, sep).trim();
    const value = trimmed.slice(sep + 1).trim();

    if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = parseArrayValue(value);
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return { data, body };
}

function stringifyFrontmatter(data) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      const items = value.map((item) => `"${String(item).replace(/"/g, '\\"')}"`).join(", ");
      lines.push(`${key}: [${items}]`);
      continue;
    }

    if (value === null || value === undefined || value === "") continue;
    lines.push(`${key}: "${String(value).replace(/"/g, '\\"')}"`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

function inferTypeFromPath(relativePath) {
  const parts = relativePath.split(/[\\/]/).filter(Boolean);
  const folder = (parts.length > 1 ? parts[0] : "").toLowerCase();
  return FOLDER_TYPE_MAP[folder] || null;
}

function normalizeType(frontmatter, relativePath) {
  const direct = String(frontmatter.type || "").toLowerCase();
  if (direct === "essay" || direct === "wiki") return "article";
  if (WIKI_TYPES.includes(direct)) return direct;

  const tags = readTopicMetadata(frontmatter).map((tag) => String(tag).toLowerCase());
  if (tags.includes("essay") || tags.includes("wiki")) return "article";
  const taggedType = WIKI_TYPES.find((type) => tags.includes(type));
  if (taggedType) return taggedType;

  return inferTypeFromPath(relativePath) || "article";
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

function formatJsExport(name, value, commentLines) {
  const payload = JSON.stringify(value, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g, "$1:");
  const comments = commentLines.filter(Boolean).map((line) => `//  ${line}`).join("\n");
  return `// =============================================================
${comments}
// =============================================================

export const ${name} = ${payload};
`;
}

// ── Atlas read/write ──────────────────────────────────────────

function readAtlas() {
  const src = readFileSync(ATLAS_PATH, "utf8");
  const locsMatch = src.match(/export const LOCATIONS = (\[[\s\S]*?\]);\n\nexport const TRIPS/);
  const tripsMatch = src.match(/export const TRIPS = (\[[\s\S]*?\]);\n/);
  if (!locsMatch || !tripsMatch) throw new Error("Could not parse atlas.js — check file format.");

  const locations = new Function(`return ${locsMatch[1]}`)();
  const trips = new Function(`return ${tripsMatch[1]}`)();
  return { locations, trips };
}

function writeAtlas({ locations, trips }) {
  const locJson = JSON.stringify(locations, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g, "$1:");
  const tripJson = JSON.stringify(trips, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g, "$1:");
  writeFileSync(
    ATLAS_PATH,
    `// =============================================================
//  ATLAS DATA  —  edit by hand or via: npm run atlas
// =============================================================

export const LOCATIONS = ${locJson};

export const TRIPS = ${tripJson};
`,
    "utf8"
  );
}

// ── Wiki read/write ───────────────────────────────────────────

function readWiki() {
  if (!existsSync(WIKI_PATH)) return [];
  const src = readFileSync(WIKI_PATH, "utf8");
  const match = src.match(/export const WIKI_POSTS = (\[[\s\S]*?\]);\n?/);
  if (!match) return [];
  return new Function(`return ${match[1]}`)();
}

function writeWiki(posts) {
  writeFileSync(
    WIKI_PATH,
    formatJsExport("WIKI_POSTS", sortPosts(posts), [
      "WIKI DATA  —  managed via: npm run atlas",
      "Generated from markdown posts + public/content/podcasts/index.json",
    ]),
    "utf8"
  );
}

function readPodcastIndex() {
  if (!existsSync(PODCASTS_INDEX_PATH)) return [];
  const raw = readFileSync(PODCASTS_INDEX_PATH, "utf8").trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function writePodcastIndex(entries) {
  writeFileSync(PODCASTS_INDEX_PATH, `${JSON.stringify(sortPosts(entries), null, 2)}\n`, "utf8");
}

function walkMarkdownFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(absPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relative(CONTENT_DIR, absPath).split(sep).join("/"));
    }
  }

  return files.sort();
}

function ensureMarkdownMetadata(relativePath) {
  const absPath = join(CONTENT_DIR, relativePath);
  const raw = readFileSync(absPath, "utf8");
  const { data, body } = parseFrontmatter(raw);
  const next = { ...data };
  const inferredType = inferTypeFromPath(relativePath);
  const injected = [];

  if (!next.title) {
    next.title = basename(relativePath, extname(relativePath));
    injected.push(`title="${next.title}"`);
  }
  if (!next.slug) {
    next.slug = slugify(next.title);
    injected.push(`slug="${next.slug}"`);
  }
  const normalizedType = normalizeType(next, relativePath);
  if (!String(next.type || "").trim()) {
    next.type = normalizedType;
    injected.push(`type="${next.type}"`);
  } else if (next.type !== normalizedType) {
    next.type = normalizedType;
    injected.push(`type="${next.type}"`);
  }

  const normalizedTopics = normalizeContentTopics(next);
  const hadTopicAlias = Object.prototype.hasOwnProperty.call(next, "topics");
  if (hadTopicAlias) {
    delete next.topics;
    injected.push("topics->tags");
  }
  if (normalizedTopics.length > 0) {
    if (JSON.stringify(next.tags) !== JSON.stringify(normalizedTopics)) {
      next.tags = normalizedTopics;
      injected.push("tags normalized");
    }
  } else if (Object.prototype.hasOwnProperty.call(next, "tags")) {
    delete next.tags;
    injected.push("tags cleared");
  }

  const hadFrontmatter = raw.startsWith("---\n") && raw.indexOf("\n---\n", 4) !== -1;
  const frontmatterChanged = JSON.stringify(next) !== JSON.stringify(data);
  if (!hadFrontmatter || frontmatterChanged) {
    writeFileSync(absPath, `${stringifyFrontmatter(next)}${body.trimStart()}`, "utf8");
  }

  return {
    data: next,
    updated: !hadFrontmatter || frontmatterChanged,
    injected,
  };
}

function buildMarkdownPost(relativePath) {
  const result = ensureMarkdownMetadata(relativePath);
  const data = result.data;
  const id = data.slug || slugify(data.title || basename(relativePath, extname(relativePath)));
  const raw = readFileSync(join(CONTENT_DIR, relativePath), "utf8");

  return {
    post: {
      id,
      type: normalizeType(data, relativePath),
      title: data.title || basename(relativePath, extname(relativePath)),
      date: data.date || "",
      file: relativePath,
      url: null,
      source: "markdown",
      notionId: data.notion_id || null,
      topics: normalizeContentTopics(data),
      readingTimeMinutes: estimateReadingTime(raw).minutes,
    },
    sync: {
      file: relativePath,
      updated: result.updated,
      injected: result.injected,
    },
  };
}

function buildPodcastPosts() {
  return readPodcastIndex().map((entry) => ({
    id: entry.id || slugify(entry.title),
    type: "podcast",
    title: entry.title,
    date: entry.date || "",
    file: null,
    url: entry.url,
    source: "podcast",
    topics: normalizeContentTopics(entry),
  }));
}

function syncWikiFromSources() {
  ensureDir(CONTENT_DIR);
  ensureDir(PODCASTS_DIR);

  const files = walkMarkdownFiles(CONTENT_DIR);

  const processed = files.map(buildMarkdownPost);
  const markdownPosts = processed.map((entry) => entry.post);
  const podcastPosts = buildPodcastPosts();
  const nextPosts = [...markdownPosts, ...podcastPosts];

  writeWiki(nextPosts);
  return {
    markdownCount: markdownPosts.length,
    podcastCount: podcastPosts.length,
    updates: processed.map((entry) => entry.sync),
  };
}

// ── Pretty printers ───────────────────────────────────────────

function printLocations(locations) {
  console.log(chalk.bold("\n  Locations:"));
  locations.forEach((l) => {
    const tag = l.hub ? chalk.hex("#a07848")(" ★ hub") : "";
    console.log(`  ${chalk.cyan(l.id.padEnd(16))} ${l.name}, ${l.country}${tag}`);
  });
}

function printTrips(trips, locations) {
  console.log(chalk.bold("\n  Trips:"));
  trips.forEach((t) => {
    const from = locations.find((l) => l.id === t.from)?.name ?? t.from;
    const to = locations.find((l) => l.id === t.to)?.name ?? t.to;
    const swatch = chalk.hex(t.color)("██");
    console.log(`  ${swatch} ${chalk.cyan(t.id.padEnd(12))} ${from} → ${to}  (${t.year})`);
  });
}

function printWikiPosts(posts) {
  console.log(chalk.bold("\n  Wiki posts:"));
  sortPosts(posts).forEach((post) => {
    const source = post.url ? chalk.blue("external") : chalk.dim(post.file);
    console.log(`  ${chalk.cyan(post.type.padEnd(8))} ${String(post.date || "").padEnd(10)} ${post.title}  ${source}`);
  });
  console.log();
}

// ── Atlas actions ─────────────────────────────────────────────

async function addLocation(data) {
  console.log(chalk.bold.green("\n  Add new location\n"));
  const answers = await inquirer.prompt([
    { name: "name", message: "City name:", type: "input" },
    { name: "country", message: "Country:", type: "input" },
    { name: "lng", message: "Longitude:", type: "input", validate: (v) => !isNaN(parseFloat(v)) || "Must be a number" },
    { name: "lat", message: "Latitude:", type: "input", validate: (v) => !isNaN(parseFloat(v)) || "Must be a number" },
    { name: "hub", message: "Is this a hub (place you lived)?", type: "confirm", default: false },
    { name: "hubColor", message: "Hub pin color (hex):", type: "input", default: "#a07848", when: (a) => a.hub },
  ]);

  const id = answers.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (data.locations.find((l) => l.id === id)) {
    console.log(chalk.yellow(`  Location "${id}" already exists.`));
    return;
  }

  data.locations.push({
    id,
    name: answers.name,
    country: answers.country,
    coords: [parseFloat(answers.lng), parseFloat(answers.lat)],
    hub: answers.hub,
    ...(answers.hub ? { hubColor: answers.hubColor } : {}),
    visits: [],
  });

  console.log(chalk.green(`\n  ✓ Added ${answers.name}`));
}

async function addTrip(data) {
  console.log(chalk.bold.green("\n  Add new trip\n"));
  printLocations(data.locations);

  const locationChoices = data.locations.map((l) => ({ name: `${l.name}, ${l.country}`, value: l.id }));

  const answers = await inquirer.prompt([
    { name: "from", message: "From (origin):", type: "list", choices: locationChoices },
    { name: "to", message: "To (destination):", type: "list", choices: locationChoices, validate: (v, a) => v !== a.from || "Must differ from origin" },
    { name: "year", message: "Year of trip:", type: "input", validate: (v) => !isNaN(parseInt(v)) || "Must be a number" },
    { name: "color", message: "Arc/thread color (hex):", type: "input", default: "#a07848" },
    { name: "label", message: "Label (optional, auto-generated if blank):", type: "input", default: "" },
  ]);

  const fromName = data.locations.find((l) => l.id === answers.from).name;
  const toName = data.locations.find((l) => l.id === answers.to).name;

  data.trips.push({
    id: `trip-${nanoid(6)}`,
    label: answers.label || `${fromName} → ${toName}`,
    from: answers.from,
    to: answers.to,
    color: answers.color,
    year: parseInt(answers.year),
  });

  console.log(chalk.green(`\n  ✓ Added trip: ${fromName} → ${toName}`));

  const { addVisitNow } = await inquirer.prompt([
    {
      name: "addVisitNow",
      message: `Log a visit for ${toName} now?`,
      type: "confirm",
      default: true,
    },
  ]);

  if (addVisitNow) {
    await addVisit(data, {
      preselectedLocationId: answers.to,
      suggestedLabel: answers.label || `${fromName} → ${toName}`,
      suggestedDateRange: String(answers.year),
    });
  }
}

async function addVisit(data, options = {}) {
  console.log(chalk.bold.green("\n  Add visit / photo album to a location\n"));
  const {
    preselectedLocationId = null,
    suggestedLabel = "",
    suggestedDateRange = "",
  } = options;

  let locId = preselectedLocationId;

  if (!locId) {
    printLocations(data.locations);

    const locationChoices = data.locations.map((l) => ({ name: `${l.name}, ${l.country}`, value: l.id }));

    const response = await inquirer.prompt([
      { name: "locId", message: "Which location?", type: "list", choices: locationChoices },
    ]);
    locId = response.locId;
  }

  const loc = data.locations.find((l) => l.id === locId);
  console.log(chalk.dim(`\n  ${loc.name} has ${loc.visits.length} existing visit(s).\n`));

  const answers = await inquirer.prompt([
    { name: "label", message: "Visit label (e.g. 'Summer 2023'):", type: "input", default: suggestedLabel },
    { name: "dateRange", message: "Date range (e.g. 'June – July 2023'):", type: "input", default: suggestedDateRange },
    { name: "notes", message: "Notes (optional):", type: "input", default: "" },
    { name: "albumUrl", message: "Google Photos album URL (or leave blank):", type: "input", default: "" },
  ]);

  loc.visits.push({
    id: `${locId}-${nanoid(4)}`,
    label: answers.label,
    dateRange: answers.dateRange,
    notes: answers.notes || "",
    albumUrl: answers.albumUrl || null,
  });

  console.log(chalk.green(`\n  ✓ Added visit to ${loc.name}`));
}

async function updateAlbum(data) {
  console.log(chalk.bold.green("\n  Update photo album URL\n"));

  const locChoices = data.locations
    .filter((l) => l.visits.length > 0)
    .map((l) => ({ name: `${l.name} (${l.visits.length} visit${l.visits.length > 1 ? "s" : ""})`, value: l.id }));

  if (!locChoices.length) {
    console.log(chalk.yellow("  No locations with visits yet. Add a visit first."));
    return;
  }

  const { locId } = await inquirer.prompt([
    { name: "locId", message: "Which location?", type: "list", choices: locChoices },
  ]);

  const loc = data.locations.find((l) => l.id === locId);
  const visitChoices = loc.visits.map((v) => ({
    name: `${v.label} (${v.dateRange}) — album: ${v.albumUrl ?? "none"}`,
    value: v.id,
  }));

  const { visitId, albumUrl } = await inquirer.prompt([
    { name: "visitId", message: "Which visit?", type: "list", choices: visitChoices },
    { name: "albumUrl", message: "Google Photos URL:", type: "input" },
  ]);

  const visit = loc.visits.find((v) => v.id === visitId);
  visit.albumUrl = albumUrl;
  console.log(chalk.green(`\n  ✓ Updated album URL for ${loc.name} / ${visit.label}`));
}

async function removeTrip(data) {
  console.log(chalk.bold.red("\n  Remove a trip\n"));
  printTrips(data.trips, data.locations);

  const tripChoices = data.trips.map((t) => {
    const from = data.locations.find((l) => l.id === t.from)?.name ?? t.from;
    const to = data.locations.find((l) => l.id === t.to)?.name ?? t.to;
    return { name: `${t.label || `${from} → ${to}`} (${t.year})`, value: t.id };
  });

  const { tripId, confirm } = await inquirer.prompt([
    { name: "tripId", message: "Which trip to remove?", type: "list", choices: tripChoices },
    { name: "confirm", message: "Are you sure?", type: "confirm", default: false },
  ]);

  if (confirm) {
    data.trips = data.trips.filter((t) => t.id !== tripId);
    console.log(chalk.green("  ✓ Removed."));
  }
}

async function listAllAtlas(data) {
  printLocations(data.locations);
  printTrips(data.trips, data.locations);
  console.log("\n  Visits by location:");
  data.locations.forEach((l) => {
    if (l.visits.length === 0) return;
    console.log(`\n  ${chalk.cyan(l.name)}:`);
    l.visits.forEach((v) => {
      const album = v.albumUrl ? chalk.blue(v.albumUrl) : chalk.dim("no album");
      console.log(`    • ${v.label}  ${chalk.dim(v.dateRange)}  ${album}`);
    });
  });
  console.log();
}

// ── Wiki actions ──────────────────────────────────────────────

async function syncWiki() {
  console.log(chalk.bold.green("\n  Sync wiki from content sources\n"));
  console.log(chalk.dim(`  Reading: ${CONTENT_DIR}\n`));
  const result = syncWikiFromSources();
  console.log(chalk.green(`  ✓ Synced ${result.markdownCount} markdown post(s).`));
  console.log(chalk.dim(`  Loaded ${result.podcastCount} podcast entr${result.podcastCount === 1 ? "y" : "ies"} from public/content/podcasts/index.json`));
  console.log(chalk.dim("  Folder mapping: articles → article, blog → blog"));
  result.updates.forEach((entry) => {
    if (!entry.updated) return;
    const detail = entry.injected.length ? entry.injected.join(", ") : "frontmatter normalized";
    console.log(chalk.dim(`  Updated ${entry.file}: ${detail}`));
  });
  console.log(chalk.dim("  Updated: src/data/wiki.js\n"));
}

async function addPodcastEntry() {
  console.log(chalk.bold.green("\n  Add podcast / external entry\n"));

  const answers = await inquirer.prompt([
    { name: "title", message: "Title:", type: "input" },
    { name: "date", message: "Date (YYYY-MM-DD):", type: "input", default: new Date().toISOString().slice(0, 10) },
    { name: "url", message: "URL:", type: "input", validate: (value) => value.trim() ? true : "URL is required" },
  ]);

  const entries = readPodcastIndex();
  const id = slugify(answers.title);
  if (entries.find((entry) => entry.id === id)) {
    console.log(chalk.yellow(`  An entry with id "${id}" already exists.`));
    return;
  }

  entries.push({
    id,
    title: answers.title,
    date: answers.date,
    url: answers.url,
  });

  writePodcastIndex(entries);
  syncWikiFromSources();
  console.log(chalk.green(`\n  ✓ Added "${answers.title}" to public/content/podcasts/index.json\n`));
}

async function listWikiEntries() {
  const posts = readWiki();
  if (!posts.length) {
    console.log(chalk.dim("\n  No wiki entries yet. Sync markdown or add a podcast entry first.\n"));
    return;
  }

  printWikiPosts(posts);
}

async function removePodcastEntry() {
  const entries = readPodcastIndex();

  if (!entries.length) {
    console.log(chalk.yellow("\n  No podcast / external entries to remove.\n"));
    return;
  }

  const { id, confirm } = await inquirer.prompt([
    {
      name: "id",
      message: "Which podcast entry do you want to remove?",
      type: "list",
      choices: entries.map((entry) => ({ name: `${entry.title} (${entry.date})`, value: entry.id })),
    },
    { name: "confirm", message: "Are you sure?", type: "confirm", default: false },
  ]);

  if (!confirm) return;

  writePodcastIndex(entries.filter((entry) => entry.id !== id));
  syncWikiFromSources();
  console.log(chalk.green("\n  ✓ Removed podcast entry from public/content/podcasts/index.json\n"));
}

// ── Main menu ─────────────────────────────────────────────────

async function manageAtlas() {
  const data = readAtlas();
  const { action } = await inquirer.prompt([
    {
      name: "action",
      message: "Atlas action:",
      type: "list",
      choices: [
        { name: "📍  Add location", value: "add-location" },
        { name: "✈️   Add trip (arc/thread)", value: "add-trip" },
        { name: "🗓️   Add visit to a location", value: "add-visit" },
        { name: "🖼️   Update photo album URL", value: "update-album" },
        { name: "🗑️   Remove a trip", value: "remove-trip" },
        { name: "📋  List all atlas data", value: "list" },
        { name: "← Back", value: "back" },
      ],
    },
  ]);

  if (action === "back") return;
  if (action === "list") {
    await listAllAtlas(data);
    return;
  }

  if (action === "add-location") await addLocation(data);
  if (action === "add-trip") await addTrip(data);
  if (action === "add-visit") await addVisit(data);
  if (action === "update-album") await updateAlbum(data);
  if (action === "remove-trip") await removeTrip(data);

  writeAtlas(data);
  console.log(chalk.dim("\n  atlas.js updated.\n"));
}

async function manageWiki() {
  const { action } = await inquirer.prompt([
    {
      name: "action",
      message: "Wiki action:",
      type: "list",
      choices: [
        { name: "🔄  Sync wiki manifest from content + podcasts", value: "sync" },
        { name: "🎙️   Add podcast / external link", value: "add-podcast" },
        { name: "📋  List wiki entries", value: "list" },
        { name: "🗑️   Remove podcast / external link", value: "remove-podcast" },
        { name: "← Back", value: "back" },
      ],
    },
  ]);

  if (action === "back") return;
  if (action === "sync") await syncWiki();
  if (action === "add-podcast") await addPodcastEntry();
  if (action === "list") await listWikiEntries();
  if (action === "remove-podcast") await removePodcastEntry();
}

async function main() {
  console.log(chalk.bold.hex("#a07848")("\n  ✈  ATLAS CLI\n"));
  console.log(chalk.dim("  Atlas: src/data/atlas.js"));
  console.log(chalk.dim("  Wiki:  src/data/wiki.js + public/content/**/*.md"));
  console.log(chalk.dim("  Podcasts: public/content/podcasts/index.json\n"));

  const { section } = await inquirer.prompt([
    {
      name: "section",
      message: "What would you like to manage?",
      type: "list",
      choices: [
        { name: "Atlas", value: "atlas" },
        { name: "Wiki", value: "wiki" },
        { name: "Exit", value: "exit" },
      ],
    },
  ]);

  if (section === "exit") {
    console.log(chalk.dim("\n  Bye.\n"));
    return;
  }

  if (section === "atlas") await manageAtlas();
  if (section === "wiki") await manageWiki();

  const { again } = await inquirer.prompt([
    { name: "again", message: "Do something else?", type: "confirm", default: true },
  ]);
  if (again) await main();
  else console.log(chalk.dim("\n  Done.\n"));
}

main().catch((e) => {
  console.error(chalk.red("\n  Error: " + e.message));
  process.exit(1);
});
