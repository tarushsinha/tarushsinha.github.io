import { useState } from "react";
import Atlas from "./components/Atlas";
import Wiki from "./components/Wiki";
import About from "./components/About";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState("about");

  return (
    <div className="site">
      <nav className="nav">
        <div className="nav-name">
          Tarush Sinha <span className="nav-kanji">道</span>
        </div>
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
        {tab === "wiki"  && <Wiki  onAtlas={() => setTab("atlas")} />}
        {tab === "about" && <About onAtlas={() => setTab("atlas")} onWiki={() => setTab("wiki")} />}
      </main>
    </div>
  );
}
