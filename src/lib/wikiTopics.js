const CLASSIFICATION_TOPICS = new Set(["article", "blog", "podcast", "essay", "wiki"]);

function normalizeTopicLabel(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeTopicKey(value) {
  return normalizeTopicLabel(value).toLowerCase();
}

function readTopicValues(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

export function normalizeContentTopics(entry = {}) {
  const seen = new Set();
  const topics = [];

  for (const rawTopic of [...readTopicValues(entry.tags), ...readTopicValues(entry.topics)]) {
    const label = normalizeTopicLabel(rawTopic);
    const key = normalizeTopicKey(label);

    if (!label || CLASSIFICATION_TOPICS.has(key) || seen.has(key)) continue;

    seen.add(key);
    topics.push(label);
  }

  return topics;
}

export function sortWikiPosts(posts) {
  return [...posts].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

export function filterWikiPosts(posts, { type = "all", topic = "all" } = {}) {
  const topicKey = normalizeTopicKey(topic);

  return sortWikiPosts(posts).filter((post) => {
    if (type !== "all" && post.type !== type) return false;
    if (topic === "all") return true;
    return normalizeContentTopics(post).some((postTopic) => normalizeTopicKey(postTopic) === topicKey);
  });
}

export function getAvailableTopics(posts, { type = "all" } = {}) {
  const seen = new Set();
  const topics = [];

  filterWikiPosts(posts, { type, topic: "all" }).forEach((post) => {
    normalizeContentTopics(post).forEach((topic) => {
      const key = normalizeTopicKey(topic);
      if (seen.has(key)) return;
      seen.add(key);
      topics.push(topic);
    });
  });

  return topics.sort((left, right) => left.localeCompare(right));
}
