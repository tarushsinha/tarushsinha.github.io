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

## Conversion

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

    write_article_file(title)



if __name__ == "__main__":
    main()