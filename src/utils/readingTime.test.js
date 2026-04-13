import { readFileSync } from "fs";
import path from "path";
import {
  estimateReadingTime,
  formatReadingTime,
  formatReadingTimeMinutes,
} from "./readingTime";

describe("reading time estimation", () => {
  it("ignores frontmatter and markdown syntax when estimating", () => {
    const markdown = `---
title: "Short Note"
date: "2024-01-01"
---

# Heading

This is a short article with a [link](https://example.com), some \`inline code\`,
and a list:

- one
- two
- three
`;

    expect(estimateReadingTime(markdown)).toEqual({
      minutes: 1,
      words: 18,
    });
    expect(formatReadingTime(markdown)).toBe("1 min read");
  });

  it("uses 145 words per minute as the default estimate", () => {
    const markdown = Array.from({ length: 146 }, () => "study").join(" ");

    expect(estimateReadingTime(markdown)).toEqual({
      minutes: 2,
      words: 146,
    });
    expect(formatReadingTime(markdown)).toBe("2 min read");
    expect(formatReadingTimeMinutes(2)).toBe("2 min read");
  });

  it("returns a multi-minute estimate for the existing long-form article", () => {
    const articlePath = path.join(
      process.cwd(),
      "public/content/articles/protein-supplement-comparison.md"
    );
    const markdown = readFileSync(articlePath, "utf8");
    const result = estimateReadingTime(markdown);

    expect(result.words).toBeGreaterThan(200);
    expect(result.minutes).toBe(11);
    expect(formatReadingTime(markdown)).toBe("11 min read");
  });
});
