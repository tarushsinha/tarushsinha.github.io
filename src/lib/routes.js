function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizePathname(pathname = "/") {
  let next = String(pathname || "/").trim();

  if (!next.startsWith("/")) next = `/${next}`;
  next = next.replace(/\/{2,}/g, "/");

  if (next.length > 1 && next.endsWith("/")) {
    next = next.slice(0, -1);
  }

  return next || "/";
}

export function getPostSlug(post) {
  if (!post) return "";

  if (post.slug) return slugify(post.slug);
  if (post.id) return slugify(post.id);
  if (post.file) {
    const match = String(post.file).match(/([^/]+)\.md$/);
    if (match) return slugify(match[1]);
  }

  return slugify(post.title);
}

export function getWikiPostPath(post) {
  const slug = getPostSlug(post);
  return slug ? `/wiki/${slug}` : "/wiki";
}

export function parseAppRoute(pathname) {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === "/" || normalizedPath === "/about") {
    return {
      section: "about",
      articleSlug: null,
      canonicalPath: "/",
    };
  }

  if (normalizedPath === "/wiki") {
    return {
      section: "wiki",
      articleSlug: null,
      canonicalPath: "/wiki",
    };
  }

  if (normalizedPath.startsWith("/wiki/")) {
    const articleSlug = slugify(normalizedPath.slice("/wiki/".length));
    return {
      section: "wiki",
      articleSlug: articleSlug || null,
      canonicalPath: articleSlug ? `/wiki/${articleSlug}` : "/wiki",
    };
  }

  if (normalizedPath === "/atlas") {
    return {
      section: "atlas",
      articleSlug: null,
      canonicalPath: "/atlas",
    };
  }

  return {
    section: "about",
    articleSlug: null,
    canonicalPath: "/",
  };
}

export function findWikiPostBySlug(posts, slug) {
  const normalizedSlug = slugify(slug);
  if (!normalizedSlug) return null;

  return posts.find((post) => getPostSlug(post) === normalizedSlug) || null;
}

export function restoreRedirectedPath(locationLike = window.location, historyLike = window.history) {
  const searchParams = new URLSearchParams(locationLike.search || "");
  const redirectedPath = searchParams.get("p");

  if (!redirectedPath) return false;

  const query = searchParams.get("q");
  const hash = searchParams.get("h");
  const nextPath = `${normalizePathname(redirectedPath)}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;

  historyLike.replaceState(null, "", nextPath);
  return true;
}
