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
import ssl
import sys
import urllib3
import requests
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path
from requests.adapters import HTTPAdapter

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

class _SSLIgnoreEOFAdapter(HTTPAdapter):
    """Tolerate premature EOF during TLS handshake (Python 3.14 + some servers)."""
    def init_poolmanager(self, *args, **kwargs):
        ctx = ssl.create_default_context()
        ctx.check_hostname = True
        ctx.verify_mode = ssl.CERT_REQUIRED
        ctx.options |= getattr(ssl, "OP_IGNORE_UNEXPECTED_EOF", 0)
        kwargs["ssl_context"] = ctx
        retry = urllib3.Retry(
            total=5,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"],
        )
        kwargs["retries"] = retry
        super().init_poolmanager(*args, **kwargs)

_SESSION = requests.Session()
_SESSION.headers.update(HEADERS)
_SESSION.mount("https://", _SSLIgnoreEOFAdapter())

# ARTICLES_DIR = "_articles"

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
    response = _SESSION.get(url)
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
        response = _SESSION.post(url, json=payload)
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
            response = _SESSION.get(url, params=params)
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

def _render_children(block, depth):
    """Render any children stored on a block, returning a string or empty string."""
    children = block.get("children", [])
    if not children:
        return ""
    return "\n\n" + blocks_to_markdown(children, depth=0)

def block_to_md(block, depth=0):
    block_type = block.get("type")
    data = block.get(block_type, {})
    indent = "  " * depth

    if block_type == "paragraph":
        return f"{indent}{notion_rich_text_to_md(data.get('rich_text', []))}" + _render_children(block, depth)

    if block_type == "heading_1":
        return f"{indent}# {notion_rich_text_to_md(data.get('rich_text', []))}" + _render_children(block, depth)
    if block_type == "heading_2":
        return f"{indent}## {notion_rich_text_to_md(data.get('rich_text', []))}" + _render_children(block, depth)
    if block_type == "heading_3":
        return f"{indent}### {notion_rich_text_to_md(data.get('rich_text', []))}" + _render_children(block, depth)

    if block_type == "bulleted_list_item":
        text = notion_rich_text_to_md(data.get("rich_text", []))
        line = f"- {text}"
        children = block.get("children", [])
        if children:
            child_lines = []
            for child in children:
                child_md = block_to_md(child, depth=0)
                if child_md:
                    indented = "\n".join("  " + l if l.strip() else l for l in child_md.splitlines())
                    child_lines.append(indented)
            if child_lines:
                line = line + "\n" + "\n".join(child_lines)
        return line

    if block_type == "numbered_list_item":
        text = notion_rich_text_to_md(data.get("rich_text", []))
        line = f"1. {text}"
        children = block.get("children", [])
        if children:
            child_lines = []
            for child in children:
                child_md = block_to_md(child, depth=0)
                if child_md:
                    indented = "\n".join("   " + l if l.strip() else l for l in child_md.splitlines())
                    child_lines.append(indented)
            if child_lines:
                line = line + "\n" + "\n".join(child_lines)
        return line

    if block_type == "to_do":
        checkbox = "x" if data.get("checked") else " "
        line = f"{indent}- [{checkbox}] {notion_rich_text_to_md(data.get('rich_text', []))}"
        children = block.get("children", [])
        if children:
            line = f"{line}\n\n{blocks_to_markdown(children, depth=0)}"
        return line

    if block_type == "quote":
        return f"{indent}> {notion_rich_text_to_md(data.get('rich_text', []))}" + _render_children(block, depth)

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
        return f"{indent}> {prefix}{notion_rich_text_to_md(data.get('rich_text', []))}" + _render_children(block, depth)

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
        header_line = f"**{summary}**" if summary else ""
        if children:
            child_md = blocks_to_markdown(children, depth=0)
            return f"{header_line}\n\n{child_md}" if header_line else child_md
        return header_line

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
    return "\n\n".join(rendered)

def write_article_file(title, slug, date, tags, notion_id, body_md, output_dir):
    if output_dir is None:
        return None

    output_path = Path(output_dir)
    if not output_path.is_dir():
        return None
    out_path = output_path / f"{slug}.md"

    overwrite = os.environ.get("OVERWRITE") == "1"
    dry_run = os.environ.get("DRY_RUN") == "1"

    if out_path.exists() and not overwrite:
        print(f"Refusing to overwrite existing file: {out_path} (set OVERWRITE=1 to override)")
        return str(out_path)

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
        return str(out_path)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(final_content)

    return str(out_path)

## Interactive selection

def parse_selection_input(raw_input, max_selection):
    choice = raw_input.strip()
    if not choice:
        raise ValueError("Please enter at least one article number.")

    tokens = choice.split(",")
    selected_indexes = []
    seen = set()

    for token in tokens:
        token = token.strip()
        if not token:
            raise ValueError("Invalid selection format. Use numbers and ranges like 1,3-5.")

        range_match = re.fullmatch(r"(\d+)\s*-\s*(\d+)", token)
        if range_match:
            start = int(range_match.group(1))
            end = int(range_match.group(2))
            if start > end:
                raise ValueError(f"Invalid range '{token}'. Ranges must go from smaller to larger numbers.")
            values = range(start, end + 1)
        elif re.fullmatch(r"\d+", token):
            values = [int(token)]
        else:
            raise ValueError(f"Invalid selection '{token}'. Use numbers and ranges like 1,3-5.")

        for value in values:
            if not 1 <= value <= max_selection:
                raise ValueError(f"Selection '{value}' is out of range. Choose numbers between 1 and {max_selection}.")
            if value not in seen:
                seen.add(value)
                selected_indexes.append(value - 1)

    return selected_indexes

def prompt_for_article_selection(articles):
    while True:
        choice = input("\nEnter article number(s) to export (example: 1,3-5) or 'q' to quit: ").strip()
        if choice.lower() == "q":
            print("Aborted.")
            return None

        try:
            selected_indexes = parse_selection_input(choice, len(articles))
        except ValueError as exc:
            print(exc)
            continue

        return [articles[index] for index in selected_indexes]

def list_subdirectories(base_dir: Path):
    return sorted([path for path in base_dir.iterdir() if path.is_dir()], key=lambda path: path.name.lower())

def prompt_for_existing_directory(base_dir: Path):
    directories = list_subdirectories(base_dir)
    if not directories:
        print("No subdirectories found in the current working directory.")
        return None

    while True:
        print("\nFolders in current directory:\n")
        for idx, directory in enumerate(directories, start=1):
            print(f"{idx}. {directory.name}")

        choice = input("\nEnter folder number to use, or 'b' to go back: ").strip()
        if choice.lower() == "b":
            return None

        try:
            index = int(choice) - 1
            assert 0 <= index < len(directories)
        except (ValueError, AssertionError):
            print("Invalid selection. Enter one of the listed folder numbers or 'b' to go back.")
            continue

        return directories[index]

def prompt_for_new_directory(base_dir: Path):
    while True:
        folder_name = input("\nEnter new folder name, or 'b' to go back: ").strip()
        if folder_name.lower() == "b":
            return None

        if not folder_name:
            print("Folder name cannot be empty.")
            continue

        folder_path = Path(folder_name)
        if folder_path.is_absolute() or folder_path.name != folder_name or folder_name in {".", ".."}:
            print("Enter a single folder name only, not a path.")
            continue

        destination = base_dir / folder_name
        if destination.exists() and not destination.is_dir():
            print(f"'{folder_name}' already exists and is not a directory.")
            continue

        destination.mkdir(parents=False, exist_ok=True)
        return destination

def prompt_for_output_directory():
    base_dir = Path.cwd()

    while True:
        print("\nChoose output location:")
        print("1. Current directory")
        print("2. Choose existing folder in current directory")
        print("3. Create new folder in current directory")
        print("q. Quit")

        choice = input("\nSelect an option: ").strip().lower()

        if choice == "q":
            print("Aborted.")
            return None
        if choice == "1":
            return base_dir
        if choice == "2":
            selected_dir = prompt_for_existing_directory(base_dir)
            if selected_dir is not None:
                return selected_dir
            continue
        if choice == "3":
            selected_dir = prompt_for_new_directory(base_dir)
            if selected_dir is not None:
                return selected_dir
            continue

        print("Invalid selection. Choose 1, 2, 3, or 'q'.")

def export_selected_articles(selected_articles, output_dir):
    if output_dir is None:
        return []

    exported_paths = []
    sync_date = datetime.now().date().isoformat()

    for article in selected_articles:
        sync_title = article["title"]
        sync_notion_page_id = article["id"]
        sync_tags = article["tags"]
        sync_slug = slugify(sync_title)

        print(f"\nExporting:\n Title: {sync_title}\n Slug: {sync_slug}\n Date: {sync_date}\n Tags: {sync_tags}\n")
        print("Fetching Notion blocks...")

        blocks = fetch_blocks(sync_notion_page_id)
        sync_body_md = blocks_to_markdown(blocks)

        out_path = write_article_file(
            sync_title,
            sync_slug,
            sync_date,
            sync_tags,
            sync_notion_page_id,
            sync_body_md,
            output_dir=output_dir,
        )
        if out_path is None:
            print("No valid output directory selected. Nothing was exported.")
            return exported_paths
        print(f"Output path: {out_path}")
        exported_paths.append(out_path)

    return exported_paths

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

    selected_articles = prompt_for_article_selection(articles)
    if not selected_articles:
        return

    output_dir = prompt_for_output_directory()
    if output_dir is None:
        return

    exported_paths = export_selected_articles(selected_articles, output_dir)
    print(f"\nExported {len(exported_paths)} file(s) to: {Path(output_dir).resolve()}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nCancelled by user.")
