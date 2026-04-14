import {
  findWikiPostBySlug,
  getPostSlug,
  getWikiPostPath,
  normalizePathname,
  parseAppRoute,
} from "./routes";

describe("route helpers", () => {
  const posts = [
    {
      id: "protein-supplement-comparison",
      title: "Protein Supplement Comparison",
      file: "articles/protein-supplement-comparison.md",
    },
    {
      slug: "fee-for-service-in-us-healthcare",
      title: "Fee-for-Service in US Healthcare",
      file: "articles/fee-for-service-in-us-healthcare.md",
    },
  ];

  it("normalizes pathnames consistently", () => {
    expect(normalizePathname("wiki")).toBe("/wiki");
    expect(normalizePathname("/wiki/")).toBe("/wiki");
    expect(normalizePathname("//wiki//fee-for-service//")).toBe("/wiki/fee-for-service");
  });

  it("parses top-level routes and canonical redirects", () => {
    expect(parseAppRoute("/")).toEqual({
      section: "about",
      articleSlug: null,
      canonicalPath: "/",
    });

    expect(parseAppRoute("/about")).toEqual({
      section: "about",
      articleSlug: null,
      canonicalPath: "/",
    });

    expect(parseAppRoute("/wiki")).toEqual({
      section: "wiki",
      articleSlug: null,
      canonicalPath: "/wiki",
    });

    expect(parseAppRoute("/atlas")).toEqual({
      section: "atlas",
      articleSlug: null,
      canonicalPath: "/atlas",
    });
  });

  it("parses wiki article routes", () => {
    expect(parseAppRoute("/wiki/protein-supplement-comparison")).toEqual({
      section: "wiki",
      articleSlug: "protein-supplement-comparison",
      canonicalPath: "/wiki/protein-supplement-comparison",
    });
  });

  it("derives stable wiki slugs from available fields", () => {
    expect(getPostSlug(posts[0])).toBe("protein-supplement-comparison");
    expect(getPostSlug(posts[1])).toBe("fee-for-service-in-us-healthcare");
    expect(getWikiPostPath(posts[1])).toBe("/wiki/fee-for-service-in-us-healthcare");
  });

  it("finds wiki posts by slug and falls back cleanly for unknown slugs", () => {
    expect(findWikiPostBySlug(posts, "protein-supplement-comparison")).toEqual(posts[0]);
    expect(findWikiPostBySlug(posts, "unknown-post")).toBeNull();
  });
});
