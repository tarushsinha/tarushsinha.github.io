import { renderToStaticMarkup } from "react-dom/server";
import About from "./About";

jest.mock("./MiniMap", () => function MiniMap() {
  return <div>MiniMap</div>;
});

describe("About homepage layout content", () => {
  it("renders the homepage sections in stacked reading order", () => {
    const html = renderToStaticMarkup(
      <About onAtlas={() => {}} onWiki={() => {}} onOpenPost={() => {}} />
    );

    expect(html).toContain("Tarush Sinha");
    expect(html).toContain("GitHub");
    expect(html).toContain("Recent writing");
    expect(html).toContain("View full atlas");
    expect(html).toContain("Continents");

    expect(html.indexOf("GitHub")).toBeGreaterThan(html.indexOf("Tarush Sinha"));
    expect(html.indexOf("Recent writing")).toBeGreaterThan(html.indexOf("GitHub"));
    expect(html.indexOf("View full atlas")).toBeGreaterThan(html.indexOf("Recent writing"));
    expect(html.indexOf("Continents")).toBeGreaterThan(html.indexOf("View full atlas"));
  });
});
