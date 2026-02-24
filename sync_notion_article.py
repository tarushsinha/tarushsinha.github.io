#!/usr/bin/env python3

"""
Interactive Notion -> Jekyll article exporter

1. Query a Notion Database
2. Return list of complete wiki articles
3. Pick article to sync by number
4. Formatting:
    a. Generate slug from article title
    b. Use sync date as article date
    c. Convert Notion article into Markdown
    d. Writes _articles/<slug>.md with YAML front matter
"""

import os
import re
import sys
import requests
from datetime import datetime
from dotenv import load_dotenv

#load variables from .env into os.environ
load_dotenv()

## Configuration

NOTION_API_KEY = os.environ.get("NOTION_API_KEY")
NOTION_DB_ID = os.environ.get("NOTION_DB_ID")

## getting DATA_SOURCE_ID
# curl https://api.notion.com/v1/databases/$NOTION_DB_ID \
#   -H "Authorization: Bearer $NOTION_API_KEY" \
#   -H "Notion-Version: 2025-09-03"
NOTION_DATA_SOURCE_ID = os.environ.get("NOTION_DATA_SOURCE_ID")

## ------------------------------------------------------------

NOTION_VERSION = "2025-09-03"
HEADERS = {
    "Authorization": f"Bearer {NOTION_API_KEY}" if NOTION_API_KEY else "",
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
}

ARTICLES_DIR = "_articles"

## Helpers

def ensure_API_config():
    if not NOTION_API_KEY:
        print("ERROR: NOTION_API_KEY is not set in your environment.")
        sys.exit(1)

    # if not NOTION_DB_ID and not NOTION_DATA_SOURCE_ID:
    #     print(
    #         "ERROR: You must set either NOTION_DB_ID(recommended) OR NOTION_DATA_SOURCE_ID "
    #         "in your environment."
    #     )
    #     sys.exit(1)
    
    # print("Success")

def resolve_data_source_id() -> str:
    """
    Decide which data_source_id to use

    Priority:
        1. NOTION_DATA_SOURCE_ID (explicitly set in .env)
        2. Discover from NOTION_DB by calling GET /v1/databases/{db_id}
            and reading .data_sources[]=
    """
    if NOTION_DATA_SOURCE_ID:
        return NOTION_DATA_SOURCE_ID
    
    if not NOTION_DB_ID:
        print(
            "ERROR: NOTION_DB_ID is not set, and NOTION_DATA_SOURCE_ID is also not set"
        )
        sys.exit(1)
    
    #Discover data sourcea from database metadata
    url = f"https://api.notion.com/v1/databases/{NOTION_DB_ID}"
    response = requests.get(url, headers = HEADERS)
    try:
        response.raise_for_status()
    except requests.HTTPError as e:
        print("ERROR: Failed to retrieve database metadata")
        print("Status:", response.status_code)
        print("Response:", response.text[:1000])
        raise e
    
    data = response.json()
    data_sources = data.get("data_sources", [])

    if not data_sources:
        print(
            "ERROR: No data_sources found for this database. " \
            "Make sure this database has at least one data source and " \
            "you're using API 2025-09-03"
        )
        sys.exit(1)
    
    if len(data_sources) == 1:
        ds = data_sources[0]
        print(f"Using data source: {ds.get('name') or '(no name)'} [{ds['id']}]")
        return ds["id"]
    
    print("Multiple data sources found for this database:")
    for idx,ds in enumerate(data_sources, start=1):
        print(f"{idx}. {ds.get('name') or '(no name)'} [{ds['id']}]")
    
    choice = input("Select data source number to use: ").strip()
    try:
        index = int(choice) - 1
        assert 0 <= index <len(data_sources)
    except (ValueError, AssertionError):
        print("Invalid Selection")
        sys.exit(1)

    ds = data_sources[index]
    print(f"Using data source: {ds.get('name') or '(no name)'} [{ds['id']}]")
    return ds["id"]

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")

def rich_text_to_plain(rt_array):
    parts = []
    for rt in rt_array:
        parts.append(rt.get("plain_text", ""))
    return "".join(parts)

## API Calls

def query_data_source(data_source_id: str):
    """
    Query the Notion data source for pages

    Uses:
        POST /v1/data_sources/{data_source_id}/query

    Filters Status == 'Completed' so only finished wiki articles are returned
    """
    url = f"https://api.notion.com/v1/data_sources/{data_source_id}/query"

    body = {
        "filter": {
            "property": "Status",
            "status": {"equals": "Done"},
        }
    }

    results = []
    payload = body
    while True:
        response = requests.post(url, headers=HEADERS, json=payload)
        response.raise_for_status()
        data = response.json()
        results.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        payload["start_cursor"] = data["next_cursor"]

    return results

def fetch_block_children(block_id: str) -> list[dict]:
    """
    Fetch all direct children for a block/page with pagination.
    """
    return fetch_block_children_paginated(block_id)

def fetch_block_children_paginated(block_id: str, notion=None) -> list[dict]:
    """
    Fetch all direct children for a block/page with pagination.

    If `notion` is provided, it is expected to expose:
        notion.blocks.children.list(block_id=..., page_size=..., start_cursor=...)
    Otherwise this falls back to direct HTTP requests.
    """
    results = []
    next_cursor = None

    while True:
        if notion is not None:
            kwargs = {"block_id": block_id, "page_size": 100}
            if next_cursor:
                kwargs["start_cursor"] = next_cursor
            data = notion.blocks.children.list(**kwargs)
        else:
            url = f"https://api.notion.com/v1/blocks/{block_id}/children?page_size=100"
            params = {}
            if next_cursor:
                params["start_cursor"] = next_cursor
            response = requests.get(url, headers=HEADERS, params=params)
            if not response.ok:
                print("ERROR: Failed to fetch block children")
                print("Status:", response.status_code)
                print("Response:", response.text[:800])
                response.raise_for_status()
            data = response.json()

        results.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        next_cursor = data.get("next_cursor")

    return results

def fetch_block_children_recursive(notion, block_id: str, depth=0, max_depth=50, active_path=None) -> list[dict]:
    """
    Recursively fetch block children for any block that has_children=True.
    """
    if depth > max_depth:
        return []

    if active_path is None:
        active_path = set()

    children = fetch_block_children_paginated(block_id, notion=notion)
    for child in children:
        child_id = child.get("id")
        if child.get("has_children"):
            if not child_id or child_id in active_path:
                child["children"] = []
                continue

            active_path.add(child_id)
            child["children"] = fetch_block_children_recursive(
                notion,
                child_id,
                depth=depth + 1,
                max_depth=max_depth,
                active_path=active_path,
            )
            active_path.remove(child_id)

    return children

def fetch_blocks(page_id: str):
    """
    Fetch top-level blocks for a page
    
    
    :param page_id: Description
    :type page_id: str
    """
    return fetch_block_children_recursive(None, page_id)



## Conversion

def notion_rich_text_to_md(rt_array):
    parts = []
    for rt in rt_array or []:
        text = rt.get("plain_text", "")
        href = rt.get("href")
        annotations = rt.get("annotations", {}) or {}

        if href:
            text = f"[{text}]({href})"
        if annotations.get("code"):
            text = f"`{text}`"
        if annotations.get("bold"):
            text = f"**{text}**"
        if annotations.get("italic"):
            text = f"*{text}*"
        if annotations.get("strikethrough"):
            text = f"~~{text}~~"
        if annotations.get("underline"):
            text = f"<u>{text}</u>"

        parts.append(text)
    return "".join(parts)

def _escape_table_cell(text: str) -> str:
    return text.replace("|", r"\|").replace("\n", "<br>")

def _render_table_markdown(table_block: dict, depth=0):
    indent = "  " * depth
    table_data = table_block.get("table", {}) or {}
    row_blocks = [b for b in table_block.get("children", []) if b.get("type") == "table_row"]

    rows = []
    for row_block in row_blocks:
        cells = row_block.get("table_row", {}).get("cells", [])
        row = []
        for cell_rt in cells:
            cell_text = notion_rich_text_to_md(cell_rt)
            row.append(_escape_table_cell(cell_text))
        rows.append(row)

    inferred_width = max((len(r) for r in rows), default=0)
    width = max(inferred_width, table_data.get("table_width", 0) or 0)
    if width <= 0:
        return f"{indent}<table></table>"

    normalized = []
    for row in rows:
        normalized.append(row + [""] * (width - len(row)))

    has_column_header = bool(table_data.get("has_column_header"))
    if has_column_header and normalized:
        header = normalized[0]
        data_rows = normalized[1:]
    else:
        # Markdown tables require a header row; keep it empty when Notion
        # table has no explicit column header so we avoid synthetic "Col N".
        header = [""] * width
        data_rows = normalized

    lines = [
        f"{indent}| " + " | ".join(header) + " |",
        f"{indent}| " + " | ".join(["---"] * width) + " |",
    ]
    for row in data_rows:
        lines.append(f"{indent}| " + " | ".join(row) + " |")

    return "\n".join(lines)

def block_to_md(block, depth=0):
    block_type = block.get("type")
    data = block.get(block_type, {})
    indent = "  " * depth

    if block_type == "paragraph":
        return f"{indent}{notion_rich_text_to_md(data.get('rich_text', []))}"

    if block_type == "heading_1":
        return f"{indent}# {notion_rich_text_to_md(data.get('rich_text', []))}"
    if block_type == "heading_2":
        return f"{indent}## {notion_rich_text_to_md(data.get('rich_text', []))}"
    if block_type == "heading_3":
        return f"{indent}### {notion_rich_text_to_md(data.get('rich_text', []))}"

    if block_type == "bulleted_list_item":
        line = f"{indent}- {notion_rich_text_to_md(data.get('rich_text', []))}"
        children = block.get("children", [])
        if children:
            line = f"{line}\n{blocks_to_markdown(children, depth + 1, list_context=True)}"
        return line

    if block_type == "numbered_list_item":
        line = f"{indent}1. {notion_rich_text_to_md(data.get('rich_text', []))}"
        children = block.get("children", [])
        if children:
            line = f"{line}\n{blocks_to_markdown(children, depth + 1, list_context=True)}"
        return line

    if block_type == "to_do":
        checkbox = "x" if data.get("checked") else " "
        line = f"{indent}- [{checkbox}] {notion_rich_text_to_md(data.get('rich_text', []))}"
        children = block.get("children", [])
        if children:
            line = f"{line}\n{blocks_to_markdown(children, depth + 1, list_context=True)}"
        return line

    if block_type == "quote":
        return f"{indent}> {notion_rich_text_to_md(data.get('rich_text', []))}"

    if block_type == "code":
        language = data.get("language", "")
        code_text = notion_rich_text_to_md(data.get("rich_text", []))
        return f"{indent}```{language}\n{code_text}\n{indent}```"

    if block_type == "divider":
        return f"{indent}---"

    if block_type == "callout":
        icon = block.get("callout", {}).get("icon", {})
        emoji = icon.get("emoji", "")
        prefix = f"{emoji} " if emoji else ""
        return f"{indent}> {prefix}{notion_rich_text_to_md(data.get('rich_text', []))}"

    if block_type == "image":
        image_data = data or {}
        image_type = image_data.get("type")
        if image_type == "external":
            url = image_data.get("external", {}).get("url", "")
        else:
            url = image_data.get("file", {}).get("url", "")
        caption = notion_rich_text_to_md(image_data.get("caption", []))
        alt = caption if caption else "image"
        return f"{indent}![{alt}]({url})"

    if block_type == "toggle":
        summary = notion_rich_text_to_md(data.get("rich_text", []))
        children = block.get("children", [])
        if children:
            child_md = blocks_to_markdown(children, depth=depth)
            return f"{indent}<details>\n{indent}<summary>{summary}</summary>\n\n{child_md}\n\n{indent}</details>"
        return f"{indent}<details>\n{indent}<summary>{summary}</summary>\n{indent}</details>"

    if block_type == "table":
        return _render_table_markdown(block, depth=depth)

    if block_type == "table_row":
        row_cells = block.get("table_row", {}).get("cells", [])
        row = [_escape_table_cell(notion_rich_text_to_md(cell)) for cell in row_cells]
        return f"{indent}| " + " | ".join(row) + " |"

    return f"{indent}<!-- Unsupported block type: {block_type} -->"

def blocks_to_markdown(blocks, depth=0, list_context=False):
    rendered = []
    for block in blocks or []:
        md = block_to_md(block, depth=depth)
        if md is not None and md != "":
            rendered.append(md)

    separator = "\n" if list_context else "\n\n"
    return separator.join(rendered)

def write_article_file(title, slug, date, tags, notion_id, body_md):
    os.makedirs(ARTICLES_DIR, exist_ok=True)
    out_path = os.path.join(ARTICLES_DIR, f"{slug}.md")

    overwrite = os.environ.get("OVERWRITE") == "1"
    dry_run = os.environ.get("DRY_RUN") == "1"

    if os.path.exists(out_path) and not overwrite:
        print(f"Refusing to overwrite existing file: {out_path} (set OVERWRITE=1 to override)")
        return out_path

    safe_title = title.replace('"', '\\"')
    front_matter_lines = [
        "---",
        "layout: article",
        f'title: "{safe_title}"',
        f'date: "{date}"',
    ]
    if tags:
        safe_tags = [f'"{t.replace(chr(34), chr(92) + chr(34))}"' for t in tags]
        front_matter_lines.append(f"tags: [{', '.join(safe_tags)}]")
    front_matter_lines.extend(
        [
            f'notion_id: "{notion_id}"',
            f'slug: "{slug}"',
            "---",
            "",
        ]
    )

    front_matter = "\n".join(front_matter_lines)
    final_content = f"{front_matter}{body_md.rstrip()}\n"

    if dry_run:
        print("DRY_RUN=1, preview only:")
        lines = final_content.splitlines()
        preview = "\n".join(lines[:60])
        print(preview)
        if len(lines) > 60:
            print("\n... (truncated)")
        return out_path

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(final_content)

    return out_path

## Interactive selection

def main():
    ensure_API_config()

    #Resolve data_source_id based on env / DB metadata
    data_source_id = resolve_data_source_id()

    pages = query_data_source(data_source_id)
    if not pages:
        print("No pages found (check Status filter or check data source contents)")
        return
    
    #Build list of candidates to publish
    articles = []
    for page in pages:
        props = page["properties"]
        title = rich_text_to_plain(props["Name"]["title"])
        
        tags_raw = props.get("Tags", {}).get("multi_select", [])
        tags = [t["name"] for t in tags_raw]

        articles.append({
            "id": page["id"],
            "title": title,
            "tags": tags
        })

    #Show menu
    print("\nArticles available for export:\n")
    for idx, article in enumerate(articles, start=1):
        tag_str = ", ".join(article["tags"]) if article["tags"] else "No tags"
        print(f"{idx}. {article['title']} [{tag_str}]")

    #user choice
    choice = input("\nEnter the number of the article to export (or 'q' to quit): ").strip()
    if choice.lower() == "q":
        print("Aborted.")
        return

    try:
        index = int(choice) - 1
        assert 0 <= index < len(articles)
    except (ValueError, AssertionError):
        print("Invalid selection")
        return
    
    selected = articles[index]
    syncTitle = selected["title"]
    sync_notion_page_id = selected["id"]
    sync_tags = selected["tags"]
    sync_date = datetime.now().date().isoformat()
    sync_slug = slugify(syncTitle)

    print(f"\nExporting:\n Title: {syncTitle}\n Slug: {sync_slug}\n Date: {sync_date}\n Tags: {sync_tags}\n")

    print("Fetching Notion blocks...")
    blocks = fetch_blocks(sync_notion_page_id)
    sync_body_md = blocks_to_markdown(blocks)

    # Write into destination (_articles, or _textposts)
    out_path = write_article_file(syncTitle, sync_slug, sync_date, sync_tags, sync_notion_page_id, sync_body_md)
    print(f"Output path: {out_path}")

if __name__ == "__main__":
    main()
