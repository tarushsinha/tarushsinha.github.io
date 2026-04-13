import { useEffect, useState } from "react";
import rehypeRaw from "rehype-raw";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MiniMap from "./MiniMap";
import { WIKI_POSTS } from "../data/wiki";
import {
  filterWikiPosts,
  getAvailableTopics,
  normalizeContentTopics,
} from "../lib/wikiTopics";
import {
  formatReadingTime,
  formatReadingTimeMinutes,
  stripFrontmatter,
} from "../utils/readingTime";

export const POSTS = WIKI_POSTS;

const FILTERS = ["all", "article", "blog", "podcast"];

function formatDate(iso) {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function normalizeMarkdownLine(line) {
  if (/^\s*\|/.test(line)) return line;

  return line
    // Convert accidental quadruple markers back to standard bold.
    .replace(/\*{4}\s*([^*\n]+?)\s*\*{4}/g, "**$1**")
    // Normalize exporter output like `**Label: **Text` so the label stays bold
    // and the following text remains plain prose.
    .replace(/^([ \t>*-]*)\*\*([^*\n|]+?)\s+\*\*(\S.*)$/u, (_, prefix, label, rest) => {
      return `${prefix}**${label.trim()}** ${rest}`;
    })
    // Preserve a word boundary when exporter output closes bold immediately
    // before the next token, e.g. `**(70-80%)**and`.
    .replace(/(\*\*[^*\n|<>]+?\*\*)(?=[A-Za-z0-9])/g, "$1 ")
    // Fix malformed list/paragraph patterns like `***Label:**** text*`.
    .replace(/^([ \t>*-]*)\*\*\*([^*\n]+?)\*{4}(.*)\*$/u, (_, prefix, label, rest) => {
      return `${prefix}***${label}**${rest}*`;
    })
    // Fix italic lines where the opening `*` was inserted after the first letter.
    .replace(/^([ \t>*-]*)([A-Za-z])\*([A-Za-z][^\n]*?)\*$/u, (_, prefix, first, rest) => {
      return `${prefix}*${first}${rest}*`;
    });
}

function normalizeMarkdown(raw) {
  return raw
    .split("\n")
    .map(normalizeMarkdownLine)
    .join("\n");
}

function getPostReadingTimeLabel(post) {
  if (typeof post.readingTimeMinutes !== "number") return "";
  return formatReadingTimeMinutes(post.readingTimeMinutes);
}

function ArticleView({ post, onBack }) {
  const [content, setContent] = useState(null);
  const [readingTime, setReadingTime] = useState(getPostReadingTimeLabel(post));
  const formattedDate = formatDate(post.date);
  const topics = normalizeContentTopics(post);

  useEffect(() => {
    let cancelled = false;
    const computedReadingTime = getPostReadingTimeLabel(post);

    if (post.url || !post.file) {
      setContent(null);
      setReadingTime(null);
      return () => {
        cancelled = true;
      };
    }

    setContent(null);
    setReadingTime(computedReadingTime || null);

    fetch(`/content/${post.file}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load ${post.file}`);
        return response.text();
      })
      .then((raw) => {
        if (!cancelled) {
          setContent(normalizeMarkdown(stripFrontmatter(raw)));
          if (!computedReadingTime) {
            setReadingTime(formatReadingTime(raw));
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContent("*Article not found.*");
          setReadingTime(null);
        }
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
        {(formattedDate || readingTime) && (
          <div className="article-meta-line">
            {formattedDate && <span className="article-date">{formattedDate}</span>}
            {formattedDate && readingTime && <span className="article-meta-sep">·</span>}
            {readingTime && <span className="article-reading-time">{readingTime}</span>}
          </div>
        )}
        {topics.length > 0 && (
          <div className="article-topics">
            {topics.map((topic) => (
              <span key={topic} className="wiki-topic-pill article-topic-pill">{topic}</span>
            ))}
          </div>
        )}
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
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {content}
          </ReactMarkdown>
        ) : (
          <div className="article-loading">Loading…</div>
        )}
      </div>
    </div>
  );
}

export default function Wiki({ onAtlas, selectedPost, onSelectPost }) {
  const [filter, setFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");

  const topicOptions = getAvailableTopics(WIKI_POSTS, { type: filter });
  const visible = filterWikiPosts(WIKI_POSTS, { type: filter, topic: topicFilter });

  useEffect(() => {
    if (topicFilter === "all") return;
    if (topicOptions.includes(topicFilter)) return;
    setTopicFilter("all");
  }, [topicFilter, topicOptions]);

  if (selectedPost) {
    return <ArticleView post={selectedPost} onBack={() => onSelectPost(null)} />;
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
              type="button"
              className={`wiki-filter ${filter === filterName ? "on" : ""}`}
              onClick={() => setFilter(filterName)}
            >
              {filterName}
            </button>
          ))}
        </div>
        <div className="wiki-topic-section">
          <div className="wiki-topic-filters">
            <button
              type="button"
              className={`wiki-filter ${topicFilter === "all" ? "on" : ""}`}
              onClick={() => setTopicFilter("all")}
            >
              all topics
            </button>
            {topicOptions.map((topic) => (
              <button
                key={topic}
                type="button"
                className={`wiki-filter ${topicFilter === topic ? "on" : ""}`}
                onClick={() => setTopicFilter(topic)}
              >
                {topic}
              </button>
            ))}
          </div>
          {topicOptions.length === 0 && (
            <div className="wiki-topic-empty">No topics available for this content filter.</div>
          )}
        </div>
        <div className="wiki-posts">
          {visible.length === 0 && (
            <div className="wiki-empty">No posts yet. Sync markdown or add a podcast entry in `npm run atlas`.</div>
          )}
          {visible.map((post) => {
            const topics = normalizeContentTopics(post);

            return (
              <div
                key={post.id}
                className="wiki-post wiki-post-clickable"
                onClick={() => post.url ? window.open(post.url, "_blank", "noopener,noreferrer") : onSelectPost(post)}
              >
                <div className="wiki-post-left">
                  <span className={`wiki-type t-${post.type}`}>{post.type}</span>
                  <div className="wiki-post-copy">
                    <span className="wiki-post-title">{post.title}</span>
                    {topics.length > 0 && (
                      <div className="wiki-post-topics">
                        {topics.map((topic) => (
                          <span key={topic} className="wiki-topic-pill">{topic}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="wiki-post-meta">
                {post.readingTimeMinutes && (
                  <span className="wiki-post-reading-time">
                    {formatReadingTimeMinutes(post.readingTimeMinutes)}
                  </span>
                )}
                {post.date && post.readingTimeMinutes && <span className="wiki-post-meta-sep">·</span>}
                <span className="wiki-post-date">{formatDate(post.date)}</span>
                </div>
            </div>
            );
          })}
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
