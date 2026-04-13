import { useState } from "react";
import Atlas from "./components/Atlas";
import Wiki from "./components/Wiki";
import About from "./components/About";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState("about");
  const [selectedWikiPost, setSelectedWikiPost] = useState(null);

  function openWikiPost(post) {
    if (!post) return;
    if (post.url) {
      window.open(post.url, "_blank", "noopener,noreferrer");
      return;
    }
    setSelectedWikiPost(post);
    setTab("wiki");
  }

  function openWikiIndex() {
    setSelectedWikiPost(null);
    setTab("wiki");
  }

  return (
    <div className="site">
      <nav className="nav">
        <button className="nav-name" onClick={() => setTab("about")}>
          Tarush <span className="nav-kanji">道</span>
        </button>
        <div className="nav-tabs">
          {["about", "wiki", "atlas"].map((t) => (
            <button
              key={t}
              className={`nav-tab ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>
      <main className="main">
        {tab === "atlas" && <Atlas onAbout={() => setTab("about")} onWiki={() => setTab("wiki")} />}
        {tab === "wiki"  && (
          <Wiki
            onAtlas={() => setTab("atlas")}
            selectedPost={selectedWikiPost}
            onSelectPost={setSelectedWikiPost}
          />
        )}
        {tab === "about" && (
          <About
            onAtlas={() => setTab("atlas")}
            onWiki={openWikiIndex}
            onOpenPost={openWikiPost}
          />
        )}
      </main>
    </div>
  );
}
