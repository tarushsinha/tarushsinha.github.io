import { useState } from "react";
import MiniMap from "./MiniMap";

const POSTS = [
  { id: 1, type: "essay",   title: "On building things in public",     date: "Apr 2025", url: null },
  { id: 2, type: "podcast", title: "Episode 08 — AI tools I actually use", date: "Mar 2025", url: null },
  { id: 3, type: "blog",    title: "React patterns I keep coming back to",  date: "Mar 2025", url: null },
  { id: 4, type: "wiki",    title: "Southeast Asia travel logistics",    date: "Feb 2025", url: null },
  { id: 5, type: "essay",   title: "Notes on living between time zones", date: "Jan 2025", url: null },
  { id: 6, type: "blog",    title: "Tools I shipped in 2024",           date: "Dec 2024", url: null },
  { id: 7, type: "podcast", title: "Episode 07 — On slow travel",       date: "Nov 2024", url: null },
];

const FILTERS = ["all", "essay", "blog", "podcast", "wiki"];

export default function Wiki({ onAtlas }) {
  const [filter, setFilter] = useState("all");

  const visible = filter === "all" ? POSTS : POSTS.filter((p) => p.type === filter);

  return (
    <div className="wiki-wrap">
      <div className="wiki-main">
        <div className="wiki-title">Wiki</div>
        <div className="wiki-sub">Articles, essays, field notes and podcast episodes.</div>
        <div className="wiki-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`wiki-filter ${filter === f ? "on" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="wiki-posts">
          {visible.map((post) => (
            <div key={post.id} className="wiki-post">
              <div className="wiki-post-left">
                <span className={`wiki-type t-${post.type}`}>{post.type}</span>
                <span className="wiki-post-title">{post.title}</span>
              </div>
              <span className="wiki-post-date">{post.date}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="wiki-aside">
        <div className="wiki-map-mini" onClick={onAtlas} title="Open atlas">
          <MiniMap height={160} />
        </div>
        <button className="wiki-aside-link" onClick={onAtlas}>
          Open atlas →
        </button>
      </div>
    </div>
  );
}
