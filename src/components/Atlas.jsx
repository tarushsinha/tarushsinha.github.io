import { useEffect, useRef, useState, useCallback } from "react";
import * as d3geo from "d3-geo";
import * as topojson from "topojson-client";
import { LOCATIONS, TRIPS } from "../data/atlas";
import LocationDrawer from "./LocationDrawer";

// Natural Earth projection — classic, undistorted world map feel
const PROJECTION = d3geo.geoNaturalEarth1;

// Terrain color by approximate latitude band & region
// These paint onto the landmass as a stylized illustrated feel
function landColor(feature) {
  const [lng, lat] = d3geo.geoCentroid(feature);
  // Polar
  if (lat > 65 || lat < -55) return "#dedad0";
  // Tropics — warm greens
  if (lat > -25 && lat < 25) {
    if (lng > 60 && lng < 150) return "#8aaa72"; // SE Asia
    if (lng > -20 && lng < 55) return "#7aaa68"; // Africa
    if (lng > -85 && lng < -30) return "#88aa74"; // S America
    return "#8aaa72";
  }
  // Mid latitudes
  if (lat >= 25 && lat < 50) {
    if (lng > 25 && lng < 145) return "#a0b888"; // Asia mid
    if (lng > -15 && lng < 45) return "#a8b890"; // Europe
    if (lng > -130 && lng < -60) return "#98b880"; // N America
    return "#a0b888";
  }
  // Higher latitudes
  if (lat >= 50) {
    if (lng > -180 && lng < -50) return "#b8c8a0"; // Canada
    if (lng > -15 && lng < 60)   return "#b0c098"; // N Europe/Russia
    return "#b4c49c";
  }
  return "#a8b890";
}

function mountainPaths(ctx, path) {
  // Symbolic mountain triangles at major ranges
  const ranges = [
    { coords: [-110, 48], size: 8 }, // Rockies
    { coords: [-72,  -32], size: 7 }, // Andes
    { coords: [86,   28], size: 9 }, // Himalayas
    { coords: [88,   32], size: 8 },
    { coords: [90,   35], size: 7 },
    { coords: [10,   46], size: 7 }, // Alps
    { coords: [36,   39], size: 6 }, // Caucasus
    { coords: [130,  35], size: 5 }, // Japan
  ];
  return ranges;
}

export default function Atlas({ onAbout, onWiki }) {
  const svgRef = useRef(null);
  const [world, setWorld] = useState(null);
  const [dimensions, setDimensions] = useState({ w: 900, h: 480 });
  const [selected, setSelected] = useState(null); // location id

  // Load world topojson from CDN
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then(setWorld)
      .catch(console.error);
  }, []);

  // Resize observer
  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      setDimensions({ w, h: Math.round(w * 0.52) });
    });
    ro.observe(svgRef.current.parentElement);
    return () => ro.disconnect();
  }, []);

  const { w, h } = dimensions;

  const projection = PROJECTION().scale(w / 6.4).translate([w / 2, h / 2]);
  const pathGen = d3geo.geoPath().projection(projection);

  // Convert location [lng,lat] → [x,y]
  const project = (coords) => projection(coords);

  // Arc between two [x,y] points — curves upward proportional to distance
  function arcPath(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - dist * 0.28;
    return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
  }

  const handlePinClick = useCallback((locId, e) => {
    e.stopPropagation();
    setSelected(locId === selected ? null : locId);
  }, [selected]);

  // Rendered land features
  const landFeatures = world
    ? topojson.feature(world, world.objects.countries).features
    : [];

  const graticule = d3geo.geoGraticule()();
  const sphere = { type: "Sphere" };

  return (
    <div className="atlas-wrap">
      <div className="atlas-map-container" ref={svgRef}>
        <svg
          width="100%"
          viewBox={`0 0 ${w} ${h}`}
          style={{ display: "block" }}
          onClick={() => setSelected(null)}
        >
          {/* Ocean */}
          <path d={pathGen(sphere)} fill="#d4e8f0" />

          {/* Graticule */}
          <path
            d={pathGen(graticule)}
            fill="none"
            stroke="#c0d8e8"
            strokeWidth="0.3"
            opacity="0.6"
          />

          {/* Land — illustrated terrain colors */}
          {landFeatures.map((f, i) => (
            <path
              key={i}
              d={pathGen(f)}
              fill={landColor(f)}
              stroke="#c8c4b0"
              strokeWidth="0.4"
            />
          ))}

          {/* Sphere outline */}
          <path
            d={pathGen(sphere)}
            fill="none"
            stroke="#a8c4d4"
            strokeWidth="0.8"
          />

          {/* Flight arcs */}
          {TRIPS.map((trip) => {
            const from = LOCATIONS.find((l) => l.id === trip.from);
            const to   = LOCATIONS.find((l) => l.id === trip.to);
            if (!from || !to) return null;
            const [x1, y1] = project(from.coords);
            const [x2, y2] = project(to.coords);
            if (!x1 || !x2) return null;
            return (
              <g key={trip.id}>
                {/* Shadow arc */}
                <path
                  d={arcPath(x1, y1, x2, y2)}
                  fill="none"
                  stroke="rgba(0,0,0,0.08)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                {/* Colored arc */}
                <path
                  d={arcPath(x1, y1, x2, y2)}
                  fill="none"
                  stroke={trip.color}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeDasharray="4,3"
                  opacity="0.82"
                />
              </g>
            );
          })}

          {/* Pins */}
          {LOCATIONS.map((loc) => {
            const pt = project(loc.coords);
            if (!pt) return null;
            const [cx, cy] = pt;
            const isSelected = selected === loc.id;
            const hasVisits = loc.visits.length > 0;

            return (
              <g
                key={loc.id}
                onClick={(e) => handlePinClick(loc.id, e)}
                style={{ cursor: "pointer" }}
              >
                {loc.hub ? (
                  <>
                    {/* Hub: filled ring pin */}
                    <circle cx={cx} cy={cy} r={isSelected ? 9 : 7} fill={loc.hubColor} opacity="0.2" />
                    <circle cx={cx} cy={cy} r={isSelected ? 6 : 5} fill={loc.hubColor} stroke="#faf8f4" strokeWidth="1.5" />
                    <circle cx={cx} cy={cy} r={isSelected ? 2.5 : 2} fill="#faf8f4" />
                  </>
                ) : (
                  <>
                    {/* Visited: outline ring */}
                    {isSelected && <circle cx={cx} cy={cy} r={8} fill={hasVisits ? "#4a5c4820" : "#9a969020"} />}
                    <circle
                      cx={cx} cy={cy} r={isSelected ? 5 : 4}
                      fill={isSelected ? (hasVisits ? "#4a5c4830" : "#9a969030") : "rgba(250,248,244,0.7)"}
                      stroke={hasVisits ? "#4a5c48" : "#9a9690"}
                      strokeWidth="1.5"
                    />
                    {hasVisits && <circle cx={cx} cy={cy} r={1.5} fill="#4a5c48" />}
                  </>
                )}

                {/* City label — show on hover/select */}
                {(isSelected || loc.hub) && (
                  <text
                    x={cx}
                    y={cy - (loc.hub ? 10 : 9)}
                    textAnchor="middle"
                    fontSize={loc.hub ? "9" : "8"}
                    fontWeight={loc.hub ? "600" : "400"}
                    fill={loc.hub ? loc.hubColor : "#3a3830"}
                    fontFamily="Instrument Sans, sans-serif"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {loc.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="atlas-stats">
        <div className="atlas-stat"><div className="atlas-stat-n">6</div><div className="atlas-stat-l">Continents</div></div>
        <div className="atlas-stat"><div className="atlas-stat-n">{LOCATIONS.length}</div><div className="atlas-stat-l">Locations</div></div>
        <div className="atlas-stat"><div className="atlas-stat-n">{TRIPS.length}</div><div className="atlas-stat-l">Trips logged</div></div>
        <div className="atlas-stat"><div className="atlas-stat-n">{LOCATIONS.filter(l => l.hub).length}</div><div className="atlas-stat-l">Home bases</div></div>
      </div>

      <div className="atlas-legend">
        <span className="atlas-legend-title">Key —</span>
        <div className="leg-item"><div className="leg-pin-hub"></div> Home base (lived)</div>
        <div className="leg-item"><div className="leg-pin-visit"></div> Visited</div>
        <div className="leg-item"><div className="leg-thread"></div> Flight path</div>
        <div className="leg-item" style={{ color: "var(--stone)", fontSize: 11 }}>Click any pin to see visits + photos</div>
      </div>

      <div className="atlas-footer">
        <div className="atlas-footer-cell">
          <div className="section-tag">Wiki</div>
          <button className="atlas-footer-link" onClick={onWiki}>Writing, essays &amp; podcasts →</button>
        </div>
        <div className="atlas-footer-cell">
          <div className="section-tag">About</div>
          <button className="atlas-footer-link" onClick={onAbout}>Background &amp; links →</button>
        </div>
      </div>

      {selected && (
        <LocationDrawer
          location={LOCATIONS.find((l) => l.id === selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
