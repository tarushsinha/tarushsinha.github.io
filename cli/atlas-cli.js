#!/usr/bin/env node
// =============================================================
//  ATLAS CLI  —  npm run atlas
//  Manage locations, trips, visits and photo albums from
//  your terminal. Edits src/data/atlas.js directly.
//  Run `npm run deploy` afterwards to publish to GitHub Pages.
// =============================================================

import { createRequire } from "module";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const require = createRequire(import.meta.url);
const inquirer = (await import("inquirer")).default;
const chalk = (await import("chalk")).default;
const { nanoid } = await import("nanoid");

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "../src/data/atlas.js");

// ── Read / Write helpers ──────────────────────────────────────

function readData() {
  const src = readFileSync(DATA_PATH, "utf8");
  const locsMatch = src.match(/export const LOCATIONS = (\[[\s\S]*?\]);\n\nexport const TRIPS/);
  const tripsMatch = src.match(/export const TRIPS = (\[[\s\S]*?\]);\n/);
  if (!locsMatch || !tripsMatch) throw new Error("Could not parse atlas.js — check file format.");

  // Use Function constructor to safely evaluate JS array literals
  const locations = new Function(`return ${locsMatch[1]}`)();
  const trips = new Function(`return ${tripsMatch[1]}`)();
  return { locations, trips };
}

function writeData({ locations, trips }) {
  const locJson = JSON.stringify(locations, null, 2)
    .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g, "$1:") // unquote keys
    .replace(/"/g, '"');                                  // keep string values

  const tripJson = JSON.stringify(trips, null, 2)
    .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g, "$1:");

  const output =
`// =============================================================
//  ATLAS DATA  —  edit by hand or via: npm run atlas
// =============================================================

export const LOCATIONS = ${locJson};

export const TRIPS = ${tripJson};
`;
  writeFileSync(DATA_PATH, output, "utf8");
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
    const to   = locations.find((l) => l.id === t.to)?.name   ?? t.to;
    const swatch = chalk.hex(t.color)("██");
    console.log(`  ${swatch} ${chalk.cyan(t.id.padEnd(12))} ${from} → ${to}  (${t.year})`);
  });
}

// ── Actions ───────────────────────────────────────────────────

async function addLocation(data) {
  console.log(chalk.bold.green("\n  Add new location\n"));
  const answers = await inquirer.prompt([
    { name: "name",    message: "City name:",    type: "input" },
    { name: "country", message: "Country:",      type: "input" },
    { name: "lng",     message: "Longitude:",    type: "input", validate: (v) => !isNaN(parseFloat(v)) || "Must be a number" },
    { name: "lat",     message: "Latitude:",     type: "input", validate: (v) => !isNaN(parseFloat(v)) || "Must be a number" },
    { name: "hub",     message: "Is this a hub (place you lived)?", type: "confirm", default: false },
    { name: "hubColor", message: "Hub pin color (hex):", type: "input", default: "#a07848", when: (a) => a.hub },
  ]);

  const id = answers.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (data.locations.find((l) => l.id === id)) {
    console.log(chalk.yellow(`  Location "${id}" already exists.`));
    return;
  }

  data.locations.push({
    id,
    name:     answers.name,
    country:  answers.country,
    coords:   [parseFloat(answers.lng), parseFloat(answers.lat)],
    hub:      answers.hub,
    ...(answers.hub ? { hubColor: answers.hubColor } : {}),
    visits:   [],
  });

  console.log(chalk.green(`\n  ✓ Added ${answers.name}`));
}

async function addTrip(data) {
  console.log(chalk.bold.green("\n  Add new trip\n"));
  printLocations(data.locations);

  const locationChoices = data.locations.map((l) => ({ name: `${l.name}, ${l.country}`, value: l.id }));

  const answers = await inquirer.prompt([
    { name: "from",  message: "From (origin):",      type: "list", choices: locationChoices },
    { name: "to",    message: "To (destination):",   type: "list", choices: locationChoices, validate: (v, a) => v !== a.from || "Must differ from origin" },
    { name: "year",  message: "Year of trip:",        type: "input", validate: (v) => !isNaN(parseInt(v)) || "Must be a number" },
    { name: "color", message: "Arc/thread color (hex):", type: "input", default: "#a07848" },
    { name: "label", message: "Label (optional, auto-generated if blank):", type: "input", default: "" },
  ]);

  const fromName = data.locations.find((l) => l.id === answers.from).name;
  const toName   = data.locations.find((l) => l.id === answers.to).name;

  data.trips.push({
    id:    `trip-${nanoid(6)}`,
    label: answers.label || `${fromName} → ${toName}`,
    from:  answers.from,
    to:    answers.to,
    color: answers.color,
    year:  parseInt(answers.year),
  });

  console.log(chalk.green(`\n  ✓ Added trip: ${fromName} → ${toName}`));
}

async function addVisit(data) {
  console.log(chalk.bold.green("\n  Add visit / photo album to a location\n"));
  printLocations(data.locations);

  const locationChoices = data.locations.map((l) => ({ name: `${l.name}, ${l.country}`, value: l.id }));

  const { locId } = await inquirer.prompt([
    { name: "locId", message: "Which location?", type: "list", choices: locationChoices },
  ]);

  const loc = data.locations.find((l) => l.id === locId);
  console.log(chalk.dim(`\n  ${loc.name} has ${loc.visits.length} existing visit(s).\n`));

  const answers = await inquirer.prompt([
    { name: "label",     message: "Visit label (e.g. 'Summer 2023'):", type: "input" },
    { name: "dateRange", message: "Date range (e.g. 'June – July 2023'):", type: "input" },
    { name: "notes",     message: "Notes (optional):", type: "input", default: "" },
    { name: "albumUrl",  message: "Google Photos album URL (or leave blank):", type: "input", default: "" },
  ]);

  loc.visits.push({
    id:        `${locId}-${nanoid(4)}`,
    label:     answers.label,
    dateRange: answers.dateRange,
    notes:     answers.notes || "",
    albumUrl:  answers.albumUrl || null,
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
    { name: "visitId",  message: "Which visit?",         type: "list",  choices: visitChoices },
    { name: "albumUrl", message: "Google Photos URL:",   type: "input" },
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
    const to   = data.locations.find((l) => l.id === t.to)?.name   ?? t.to;
    return { name: `${t.label || `${from} → ${to}`} (${t.year})`, value: t.id };
  });

  const { tripId, confirm } = await inquirer.prompt([
    { name: "tripId",  message: "Which trip to remove?", type: "list",    choices: tripChoices },
    { name: "confirm", message: "Are you sure?",         type: "confirm", default: false },
  ]);

  if (confirm) {
    data.trips = data.trips.filter((t) => t.id !== tripId);
    console.log(chalk.green("  ✓ Removed."));
  }
}

async function listAll(data) {
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

// ── Main menu ─────────────────────────────────────────────────

async function main() {
  console.log(chalk.bold.hex("#a07848")("\n  ✈  ATLAS CLI\n"));
  console.log(chalk.dim("  Editing: src/data/atlas.js"));
  console.log(chalk.dim("  Deploy:  npm run deploy\n"));

  const data = readData();

  const { action } = await inquirer.prompt([
    {
      name:    "action",
      message: "What would you like to do?",
      type:    "list",
      choices: [
        { name: "📍  Add location",              value: "add-location" },
        { name: "✈️   Add trip (arc/thread)",     value: "add-trip"     },
        { name: "🗓️   Add visit to a location",   value: "add-visit"    },
        { name: "🖼️   Update photo album URL",    value: "update-album" },
        { name: "🗑️   Remove a trip",             value: "remove-trip"  },
        { name: "📋  List all data",             value: "list"         },
        { name: "Exit",                           value: "exit"         },
      ],
    },
  ]);

  if (action === "exit") {
    console.log(chalk.dim("\n  Bye.\n"));
    return;
  }
  if (action === "list")         { await listAll(data);       writeData(data); }
  if (action === "add-location") { await addLocation(data);   writeData(data); }
  if (action === "add-trip")     { await addTrip(data);       writeData(data); }
  if (action === "add-visit")    { await addVisit(data);      writeData(data); }
  if (action === "update-album") { await updateAlbum(data);   writeData(data); }
  if (action === "remove-trip")  { await removeTrip(data);    writeData(data); }

  if (action !== "exit" && action !== "list") {
    console.log(chalk.dim("\n  atlas.js updated. Run `npm run deploy` to publish.\n"));
  }

  // Loop back
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
