import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import MiniMap from "./MiniMap";
import { WIKI_POSTS } from "../data/wiki";

export const POSTS = WIKI_POSTS;

const FILTERS = ["all", "article", "blog", "podcast"];

function formatDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function stripFrontmatter(raw) {
  if (!raw.startsWith("---\n")) return raw;
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return raw;
  return raw.slice(end + 5).trim();
}

function ArticleView({ post, onBack }) {
  const [content, setContent] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (post.url || !post.file) {
      setContent(null);
      return () => {
        cancelled = true;
      };
    }

    fetch(`/content/${post.file}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load ${post.file}`);
        return response.text();
      })
      .then((raw) => {
        if (!cancelled) setContent(stripFrontmatter(raw));
      })
      .catch(() => {
        if (!cancelled) setContent("*Article not found.*");
      });

    return () => {
      cancelled = true;
    };
  }, [post.file, post.url]);

  return (
    <div className="article-wrap">
      <div className="article-header">
        <button className="article-back" onClick={onBack}>← back</button>
        <span className={`wiki-type t-${post.type}`}>{post.type}</span>
      </div>
      <div className="article-meta">
        <div className="article-title">{post.title}</div>
        <div className="article-date">{formatDate(post.date)}</div>
      </div>
      <div className="article-body">
        {post.url ? (
          <div className="article-external">
            <p>This entry links to an external source.</p>
            <a href={post.url} target="_blank" rel="noopener noreferrer" className="article-ext-link">
              Open {post.title} ↗
            </a>
          </div>
        ) : content ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <div className="article-loading">Loading…</div>
        )}
      </div>
    </div>
  );
}

export default function Wiki({ onAtlas }) {
  const [filter, setFilter] = useState("all");
  const [reading, setReading] = useState(null);

  const sorted = [...WIKI_POSTS].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const visible = filter === "all" ? sorted : sorted.filter((post) => post.type === filter);

  if (reading) {
    return <ArticleView post={reading} onBack={() => setReading(null)} />;
  }

  return (
    <div className="wiki-wrap">
      <div className="wiki-main">
        <div className="wiki-title">Wiki</div>
        <div className="wiki-sub">Articles, essays, field notes and podcast episodes.</div>
        <div className="wiki-filters">
          {FILTERS.map((filterName) => (
            <button
              key={filterName}
              className={`wiki-filter ${filter === filterName ? "on" : ""}`}
              onClick={() => setFilter(filterName)}
            >
              {filterName}
            </button>
          ))}
        </div>
        <div className="wiki-posts">
          {visible.length === 0 && (
            <div className="wiki-empty">No posts yet. Sync markdown or add a podcast entry in `npm run atlas`.</div>
          )}
          {visible.map((post) => (
            <div
              key={post.id}
              className="wiki-post wiki-post-clickable"
              onClick={() => post.url ? window.open(post.url, "_blank", "noopener,noreferrer") : setReading(post)}
            >
              <div className="wiki-post-left">
                <span className={`wiki-type t-${post.type}`}>{post.type}</span>
                <span className="wiki-post-title">{post.title}</span>
              </div>
              <span className="wiki-post-date">{formatDate(post.date)}</span>
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
