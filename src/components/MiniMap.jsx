import { useEffect, useState } from "react";
import * as d3geo from "d3-geo";
import * as topojson from "topojson-client";
import { LOCATIONS, TRIPS } from "../data/atlas";

export default function MiniMap({ height = 150 }) {
  const [world, setWorld] = useState(null);
  const W = 200, H = height;

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then(setWorld);
  }, []);

  const projection = d3geo.geoNaturalEarth1().scale(W / 6.4).translate([W / 2, H / 2]);
  const pathGen    = d3geo.geoPath().projection(projection);
  const project    = (c) => projection(c);

  const landFeatures = world
    ? topojson.feature(world, world.objects.countries).features
    : [];

  function arcPath(x1, y1, x2, y2) {
    const dist = Math.sqrt((x2-x1)**2+(y2-y1)**2);
    const mx = (x1+x2)/2, my = (y1+y2)/2 - dist*0.28;
    return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
  }

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <path d={pathGen({ type: "Sphere" })} fill="#d4e8f0" />
      {landFeatures.map((f, i) => (
        <path key={i} d={pathGen(f)} fill="#a8b890" stroke="#c8c4b0" strokeWidth="0.3" />
      ))}
      {TRIPS.map((t) => {
        const from = LOCATIONS.find((l) => l.id === t.from);
        const to   = LOCATIONS.find((l) => l.id === t.to);
        if (!from || !to) return null;
        const [x1,y1] = project(from.coords);
        const [x2,y2] = project(to.coords);
        return (
          <path key={t.id} d={arcPath(x1,y1,x2,y2)} fill="none"
            stroke={t.color} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.7" />
        );
      })}
      {LOCATIONS.map((l) => {
        const pt = project(l.coords);
        if (!pt) return null;
        const [cx,cy] = pt;
        return l.hub
          ? <circle key={l.id} cx={cx} cy={cy} r={2.5} fill={l.hubColor} />
          : <circle key={l.id} cx={cx} cy={cy} r={1.5} fill="none" stroke="#4a5c48" strokeWidth="0.8" />;
      })}
    </svg>
  );
}
