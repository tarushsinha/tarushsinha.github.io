import {
  filterWikiPosts,
  getAvailableTopics,
  normalizeContentTopics,
} from "./wikiTopics";

describe("normalizeContentTopics", () => {
  it("merges tags and legacy topics while removing classification markers", () => {
    expect(
      normalizeContentTopics({
        tags: ["Fitness & Health", "article", "strength"],
        topics: ["fitness & health", "Recovery", "blog"],
      })
    ).toEqual(["Fitness & Health", "strength", "Recovery"]);
  });

  it("returns an empty array when no topical metadata exists", () => {
    expect(normalizeContentTopics({ type: "article" })).toEqual([]);
  });
});

describe("wiki topic helpers", () => {
  const posts = [
    {
      id: "article-1",
      type: "article",
      title: "Article One",
      topics: ["Fitness & Health", "Strength"],
      date: "2024-02-01",
    },
    {
      id: "blog-1",
      type: "blog",
      title: "Blog One",
      topics: ["Travel", "Strength"],
      date: "2024-03-01",
    },
    {
      id: "podcast-1",
      type: "podcast",
      title: "Podcast One",
      topics: [],
      date: "2024-01-01",
    },
  ];

  it("aggregates available topics from the filtered content set", () => {
    expect(getAvailableTopics(posts, { type: "all" })).toEqual([
      "Fitness & Health",
      "Strength",
      "Travel",
    ]);

    expect(getAvailableTopics(posts, { type: "blog" })).toEqual([
      "Strength",
      "Travel",
    ]);
  });

  it("filters posts by type and topic together", () => {
    expect(
      filterWikiPosts(posts, { type: "all", topic: "Strength" }).map((post) => post.id)
    ).toEqual(["blog-1", "article-1"]);

    expect(
      filterWikiPosts(posts, { type: "article", topic: "Strength" }).map((post) => post.id)
    ).toEqual(["article-1"]);

    expect(
      filterWikiPosts(posts, { type: "article", topic: "Travel" }).map((post) => post.id)
    ).toEqual([]);
  });
});
