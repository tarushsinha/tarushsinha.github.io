const DEFAULT_WORDS_PER_MINUTE = 145;
const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export function stripFrontmatter(raw) {
  if (!raw.startsWith("---\n")) return raw;
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return raw;
  return raw.slice(end + 5).trim();
}

function markdownToPlainText(raw) {
  return stripFrontmatter(raw)
    .replace(/^```.*$/gm, " ")
    .replace(/`/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/^[ \t]{0,3}(#{1,6}|[-*+]|\d+\.)\s+/gm, "")
    .replace(/^[ \t]*>\s?/gm, "")
    .replace(/[*_~]+/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function estimateReadingTime(markdown, wordsPerMinute = DEFAULT_WORDS_PER_MINUTE) {
  const words = markdownToPlainText(markdown).match(WORD_PATTERN)?.length ?? 0;

  return {
    words,
    minutes: Math.max(1, Math.ceil(words / wordsPerMinute)),
  };
}

export function formatReadingTimeMinutes(minutes) {
  return `${Math.max(1, minutes)} min read`;
}

export function formatReadingTime(markdown, wordsPerMinute = DEFAULT_WORDS_PER_MINUTE) {
  const { minutes } = estimateReadingTime(markdown, wordsPerMinute);
  return formatReadingTimeMinutes(minutes);
}
