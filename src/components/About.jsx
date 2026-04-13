import MiniMap from "./MiniMap";
import { LOCATIONS, TRIPS } from "../data/atlas";
import { WIKI_POSTS } from "../data/wiki";

const LINKS = [
  { name: "Resume",    desc: "Experience & background", color: "#a07848", url: "#" },
  { name: "LinkedIn",  desc: "Professional profile",    color: "#4a5c48", url: "#" },
  { name: "GitHub",    desc: "Code & projects",         color: "#3a3830", url: "#" },
  { name: "Goodreads", desc: "What I'm reading",        color: "#7a5c3a", url: "#" },
];

export default function About({ onAtlas, onWiki }) {
  const hubs = LOCATIONS.filter((l) => l.hub).length;
  const visited = LOCATIONS.length;
  const continents = 6;
  const recent = [...WIKI_POSTS]
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 3);

  return (
    <div className="about-wrap">
      <div className="about-main">
        <div className="about-name">Your Name</div>
        <div className="about-role">Builder · writer · frequent flyer</div>
        <div className="about-bio">
          Based in New York. Previously Singapore. I build things, write about
          what I'm learning, and collect places. This site is a living document
          of all three.
        </div>
        <div className="about-divider" />
        <div className="about-links">
          {LINKS.map((link) => (
            <a key={link.name} href={link.url} className="about-link" target="_blank" rel="noopener noreferrer">
              <div className="about-link-left">
                <div className="about-link-dot" style={{ background: link.color }} />
                <div>
                  <div className="about-link-name">{link.name}</div>
                  <div className="about-link-desc">{link.desc}</div>
                </div>
              </div>
              <span className="about-link-arr">↗</span>
            </a>
          ))}
        </div>
      </div>

      <div className="about-right">
        <div className="about-map-thumb" onClick={onAtlas} title="Open atlas">
          <MiniMap height={150} />
        </div>
        <button className="about-map-cta" onClick={onAtlas}>
          View full atlas →
        </button>
        <div className="about-stats">
          <div className="about-stat">
            <div className="about-stat-n">{continents}</div>
            <div className="about-stat-l">Continents</div>
          </div>
          <div className="about-stat">
            <div className="about-stat-n">{visited}</div>
            <div className="about-stat-l">Locations</div>
          </div>
          <div className="about-stat">
            <div className="about-stat-n">{TRIPS.length}</div>
            <div className="about-stat-l">Trips</div>
          </div>
          <div className="about-stat">
            <div className="about-stat-n">{hubs}</div>
            <div className="about-stat-l">Home bases</div>
          </div>
        </div>
      </div>

      <div className="about-wiki-panel">
        <div className="about-wiki-header">
          <span className="about-wiki-title">Recent writing</span>
          <button className="about-wiki-all" onClick={onWiki}>all →</button>
        </div>
        <div className="about-wiki-posts">
          {recent.map((post) => (
            <div key={post.id} className="about-wiki-post">
              <span className={`wiki-type t-${post.type}`}>{post.type}</span>
              <div className="about-wiki-post-body">
                <div className="about-wiki-post-title">{post.title}</div>
                <div className="about-wiki-post-date">{post.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
