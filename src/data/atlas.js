// =============================================================
//  ATLAS DATA  —  edit by hand or via: npm run atlas
// =============================================================

export const LOCATIONS = [
  {
    id: "nyc",
    name: "New York City",
    country: "USA",
    coords: [
      -74.006,
      40.7128
    ],
    hub: false,
    hubColor: "#a07848",
    visits: []
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    coords: [
      103.8198,
      1.3521
    ],
    hub: true,
    hubColor: "#7a9a78",
    visits: [
      {
        id: "sg-1",
        label: "Golden Age",
        dateRange: "2006 – 2010",
        notes: "Expat years.",
        albumUrl: null
      }
    ]
  },
  {
    id: "london",
    name: "London",
    country: "UK",
    coords: [
      -0.1276,
      51.5074
    ],
    hub: false,
    visits: [
      {
        id: "lon-1",
        label: "Summer trip",
        dateRange: "2002",
        notes: "",
        albumUrl: null
      }
    ]
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    coords: [
      139.6917,
      35.6895
    ],
    hub: false,
    visits: [
      {
        id: "tok-1",
        label: "Spring Visit",
        dateRange: "2006",
        notes: "Cherry blossom season.",
        albumUrl: null
      }
    ]
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    coords: [
      55.2708,
      25.2048
    ],
    hub: false,
    visits: []
  },
  {
    id: "bali",
    name: "Bali",
    country: "Indonesia",
    coords: [
      115.1889,
      -8.4095
    ],
    hub: false,
    visits: []
  },
  {
    id: "seoul",
    name: "Seoul",
    country: "South Korea",
    coords: [
      126.978,
      37.5665
    ],
    hub: false,
    visits: []
  },
  {
    id: "chicago",
    name: "Chicago",
    country: "USA",
    coords: [
      -87.6298,
      41.8781
    ],
    hub: true,
    hubColor: "#a07848",
    visits: [
      {
        id: "chicago-R8bB",
        label: "Inception",
        dateRange: "1996 - 2000",
        notes: "",
        albumUrl: null
      }
    ]
  },
  {
    id: "sfbayarea",
    name: "SF Bay Area",
    country: "USA",
    coords: [
      -122.1158,
      37.6965
    ],
    hub: true,
    hubColor: "#000080",
    visits: [
      {
        id: "sfbayarea-Pxu3",
        label: "First Steps",
        dateRange: "2000 - 2006",
        notes: "",
        albumUrl: null
      },
      {
        id: "sfbayarea-CNMh",
        label: "Matador Moment",
        dateRange: "2010 - 2014",
        notes: "",
        albumUrl: null
      },
      {
        id: "sfbayarea-rZuD",
        label: "Home Base",
        dateRange: "2020 - Present",
        notes: "",
        albumUrl: null
      }
    ]
  },
  {
    id: "washingtondc",
    name: "Washington D.C.",
    country: "USA",
    coords: [
      -77.0364,
      38.8951
    ],
    hub: true,
    hubColor: "#2C5F34",
    visits: [
      {
        id: "washingtondc-wttD",
        label: "Terrapin Time",
        dateRange: "2014 - 2019",
        notes: "",
        albumUrl: null
      }
    ]
  }
];

export const TRIPS = [
  {
    id: "trip-1",
    label: "SF → London",
    from: "sfbayarea",
    to: "london",
    color: "#c87858",
    year: 2002
  },
  {
    id: "trip-3",
    label: "Singapore → Tokyo",
    from: "singapore",
    to: "tokyo",
    color: "#7a9a78",
    year: 2007
  },
  {
    id: "trip-6",
    label: "Singapore → Dubai",
    from: "singapore",
    to: "dubai",
    color: "#7a9a78",
    year: 2010
  },
  {
    id: "trip-Rls5Kj",
    label: "SF → Singapore",
    from: "sfbayarea",
    to: "singapore",
    color: "#c87858",
    year: 2006
  }
];
