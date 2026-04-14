import { useEffect, useMemo, useState } from "react";
import Atlas from "./components/Atlas";
import Wiki from "./components/Wiki";
import About from "./components/About";
import { WIKI_POSTS } from "./data/wiki";
import {
  findWikiPostBySlug,
  getWikiPostPath,
  normalizePathname,
  parseAppRoute,
} from "./lib/routes";
import "./App.css";

export default function App() {
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));

  const route = useMemo(() => parseAppRoute(pathname), [pathname]);
  const selectedWikiPost = useMemo(
    () => (route.articleSlug ? findWikiPostBySlug(WIKI_POSTS, route.articleSlug) : null),
    [route.articleSlug]
  );
  const canonicalPath = route.section === "wiki" && route.articleSlug && !selectedWikiPost
    ? "/wiki"
    : route.canonicalPath;

  function navigate(path, { replace = false } = {}) {
    const nextPath = normalizePathname(path);
    const method = replace ? "replaceState" : "pushState";
    window.history[method](null, "", nextPath);
    setPathname(nextPath);
  }

  useEffect(() => {
    const onPopState = () => {
      setPathname(normalizePathname(window.location.pathname));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (canonicalPath !== pathname) {
      navigate(canonicalPath, { replace: true });
    }
  }, [canonicalPath, pathname]);

  useEffect(() => {
    const pageTitle = route.section === "wiki" && selectedWikiPost
      ? `${selectedWikiPost.title} | Tarush's Hub`
      : route.section === "wiki"
        ? "Wiki | Tarush's Hub"
        : route.section === "atlas"
          ? "Atlas | Tarush's Hub"
          : "Tarush's Hub";
    document.title = pageTitle;

    const canonicalUrl = `${window.location.origin}${canonicalPath}`;
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) canonicalLink.setAttribute("href", canonicalUrl);
  }, [canonicalPath, route.section, selectedWikiPost]);

  function openWikiPost(post) {
    if (!post) return;
    if (post.url) {
      window.open(post.url, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(getWikiPostPath(post));
  }

  function openWikiIndex() {
    navigate("/wiki");
  }

  return (
    <div className="site">
      <nav className="nav">
        <button className="nav-name" onClick={() => navigate("/")}>
          Tarush <span className="nav-kanji">道</span>
        </button>
        <div className="nav-tabs">
          {[
            { id: "about", label: "about", path: "/" },
            { id: "wiki", label: "wiki", path: "/wiki" },
            { id: "atlas", label: "atlas", path: "/atlas" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${route.section === tab.id ? "active" : ""}`}
              onClick={() => navigate(tab.path)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="main">
        {route.section === "atlas" && <Atlas onAbout={() => navigate("/")} onWiki={() => navigate("/wiki")} />}
        {route.section === "wiki"  && (
          <Wiki
            onAtlas={() => navigate("/atlas")}
            selectedPost={selectedWikiPost}
            onSelectPost={openWikiPost}
            onOpenIndex={openWikiIndex}
          />
        )}
        {route.section === "about" && (
          <About
            onAtlas={() => navigate("/atlas")}
            onWiki={openWikiIndex}
            onOpenPost={openWikiPost}
          />
        )}
      </main>
    </div>
  );
}
