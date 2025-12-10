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

def ensure_config():
    if not NOTION_API_KEY:
        print("ERROR: NOTION_API_KEY is not set in your environment.")
        sys.exit(1)

    if not NOTION_DB_ID and not NOTION_DATA_SOURCE_ID:
        print(
            "ERROR: You must set either NOTION_DB_ID(recommended) OR NOTION_DATA_SOURCE_ID "
            "in your environment."
        )
        sys.exit(1)
    
    print("Success")


## API Calls

## Conversion

## Interactive selection

def main():
    print("Suc1")
    ensure_config()
    print("suc2")


if __name__ == "__main__":
    main()
