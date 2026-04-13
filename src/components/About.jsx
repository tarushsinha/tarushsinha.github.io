import MiniMap from "./MiniMap";
import { LOCATIONS, TRIPS } from "../data/atlas";
import { WIKI_POSTS } from "../data/wiki";

const LINKS = [
  { name: "Resume",    desc: "Experience & background", color: "#a07848", url: "/resume.pdf" },
  { name: "LinkedIn",  desc: "Professional profile",    color: "#4a5c48", url: "https://www.linkedin.com/in/tarushsinha/" },
  { name: "GitHub",    desc: "Code & projects",         color: "#3a3830", url: "https://github.com/tarushsinha" },
  { name: "Goodreads", desc: "Just started tracking - what I'm reading",        color: "#7a5c3a", url: "https://www.goodreads.com/user/show/189092370-tarush-sinha" },
];

function formatDate(iso) {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function About({ onAtlas, onWiki, onOpenPost }) {
  const hubs = LOCATIONS.filter((l) => l.hub).length;
  const visited = LOCATIONS.length;
  const continents = 6;
  const recent = [...WIKI_POSTS]
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 3);

  return (
    <div className="about-wrap">
      <div className="about-main">
        <div className="about-name">Tarush Sinha</div>
        <div className="about-role">experience · express · evolve</div>
        <div className="about-bio">
          <div>Based in California, previously Singapore and Washington D.C.</div> 
          <div>I build things, write about what I'm learning, and collect places.</div>
          <div>This site is a living record of that journey.</div>
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
            <button type="button" key={post.id} className="about-wiki-post" onClick={() => onOpenPost(post)}>
              <span className={`wiki-type t-${post.type}`}>{post.type}</span>
              <div className="about-wiki-post-body">
                <div className="about-wiki-post-title">{post.title}</div>
                <div className="about-wiki-post-date">{formatDate(post.date)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
