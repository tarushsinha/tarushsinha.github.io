// =============================================================
//  ATLAS DATA  —  edit by hand or via: npm run atlas
// =============================================================

export const LOCATIONS = [
  {
    id: "nyc",
    name: "New York City",
    country: "USA",
    coords: [-74.006, 40.7128],
    hub: true,
    hubColor: "#a07848",
    visits: [
      { id: "nyc-1", label: "Home base", dateRange: "2018 – present", notes: "Current home.", albumUrl: null },
    ],
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    coords: [103.8198, 1.3521],
    hub: true,
    hubColor: "#7a9a78",
    visits: [
      { id: "sg-1", label: "Lived here", dateRange: "2015 – 2018", notes: "Expat years.", albumUrl: null },
    ],
  },
  { id: "london",      name: "London",        country: "UK",           coords: [-0.1276,   51.5074], hub: false, visits: [{ id: "lon-1", label: "Summer trip", dateRange: "July 2019",   notes: "", albumUrl: null }] },
  { id: "tokyo",       name: "Tokyo",         country: "Japan",        coords: [139.6917,  35.6895], hub: false, visits: [{ id: "tok-1", label: "Spring visit", dateRange: "April 2022", notes: "Cherry blossom season.", albumUrl: null }] },
  { id: "sydney",      name: "Sydney",        country: "Australia",    coords: [151.2093, -33.8688], hub: false, visits: [] },
  { id: "capetown",    name: "Cape Town",     country: "South Africa", coords: [18.4241,  -33.9249], hub: false, visits: [] },
  { id: "buenosaires", name: "Buenos Aires",  country: "Argentina",    coords: [-58.3816, -34.6037], hub: false, visits: [] },
  { id: "dubai",       name: "Dubai",         country: "UAE",          coords: [55.2708,   25.2048], hub: false, visits: [] },
  { id: "bangkok",     name: "Bangkok",       country: "Thailand",     coords: [100.5018,  13.7563], hub: false, visits: [] },
  { id: "paris",       name: "Paris",         country: "France",       coords: [2.3522,    48.8566], hub: false, visits: [] },
  { id: "reykjavik",   name: "Reykjavik",     country: "Iceland",      coords: [-21.9426,  64.1466], hub: false, visits: [] },
  { id: "marrakech",   name: "Marrakech",     country: "Morocco",      coords: [-7.9811,   31.6295], hub: false, visits: [] },
  { id: "bali",        name: "Bali",          country: "Indonesia",    coords: [115.1889,  -8.4095], hub: false, visits: [] },
  { id: "seoul",       name: "Seoul",         country: "South Korea",  coords: [126.978,   37.5665], hub: false, visits: [] },
];

export const TRIPS = [
  { id: "trip-1",  label: "NYC → London",        from: "nyc",       to: "london",      color: "#7a6aaa", year: 2019 },
  { id: "trip-2",  label: "NYC → Singapore",      from: "nyc",       to: "singapore",   color: "#a07848", year: 2015 },
  { id: "trip-3",  label: "Singapore → Tokyo",    from: "singapore", to: "tokyo",       color: "#7a9a78", year: 2016 },
  { id: "trip-4",  label: "Singapore → Sydney",   from: "singapore", to: "sydney",      color: "#7a9a78", year: 2017 },
  { id: "trip-5",  label: "NYC → Buenos Aires",   from: "nyc",       to: "buenosaires", color: "#c87858", year: 2020 },
  { id: "trip-6",  label: "Singapore → Dubai",    from: "singapore", to: "dubai",       color: "#9a8a5a", year: 2016 },
  { id: "trip-7",  label: "NYC → Cape Town",      from: "nyc",       to: "capetown",    color: "#6a8a7a", year: 2021 },
  { id: "trip-8",  label: "NYC → Reykjavik",      from: "nyc",       to: "reykjavik",   color: "#6a8aaa", year: 2022 },
  { id: "trip-9",  label: "Singapore → Bangkok",  from: "singapore", to: "bangkok",     color: "#9a7a5a", year: 2017 },
  { id: "trip-10", label: "NYC → Paris",          from: "nyc",       to: "paris",       color: "#aa7a8a", year: 2023 },
];
