import unittest
import types
import sys

if "requests" not in sys.modules:
    sys.modules["requests"] = types.ModuleType("requests")

if "dotenv" not in sys.modules:
    dotenv_stub = types.ModuleType("dotenv")
    dotenv_stub.load_dotenv = lambda: None
    sys.modules["dotenv"] = dotenv_stub

from sync_notion_article import blocks_to_markdown, fetch_block_children_recursive


class _FakeChildrenApi:
    def __init__(self, pages):
        self.pages = pages
        self.calls = []

    def list(self, block_id, page_size=100, start_cursor=None):
        self.calls.append((block_id, start_cursor))
        key = (block_id, start_cursor)
        return self.pages[key]


class _FakeBlocksApi:
    def __init__(self, pages):
        self.children = _FakeChildrenApi(pages)


class _FakeNotionClient:
    def __init__(self, pages):
        self.blocks = _FakeBlocksApi(pages)


class NotionExporterBlockTests(unittest.TestCase):
    def test_recursive_fetch_attaches_children_for_nested_blocks(self):
        pages = {
            ("page-1", None): {
                "results": [
                    {
                        "id": "toggle-1",
                        "type": "toggle",
                        "has_children": True,
                        "toggle": {"rich_text": [{"plain_text": "Animal-Based", "annotations": {}}]},
                    }
                ],
                "has_more": True,
                "next_cursor": "cursor-1",
            },
            ("page-1", "cursor-1"): {
                "results": [
                    {
                        "id": "para-top",
                        "type": "paragraph",
                        "has_children": False,
                        "paragraph": {"rich_text": [{"plain_text": "Top level", "annotations": {}}]},
                    }
                ],
                "has_more": False,
                "next_cursor": None,
            },
            ("toggle-1", None): {
                "results": [
                    {
                        "id": "heading-1",
                        "type": "heading_3",
                        "has_children": True,
                        "heading_3": {"rich_text": [{"plain_text": "Whey", "annotations": {}}]},
                    }
                ],
                "has_more": False,
                "next_cursor": None,
            },
            ("heading-1", None): {
                "results": [
                    {
                        "id": "para-1",
                        "type": "paragraph",
                        "has_children": False,
                        "paragraph": {"rich_text": [{"plain_text": "Fast digesting", "annotations": {}}]},
                    }
                ],
                "has_more": False,
                "next_cursor": None,
            },
        }

        notion = _FakeNotionClient(pages)
        blocks = fetch_block_children_recursive(notion, "page-1")

        self.assertEqual(len(blocks), 2)
        self.assertIn(("page-1", None), notion.blocks.children.calls)
        self.assertIn(("page-1", "cursor-1"), notion.blocks.children.calls)
        self.assertIn(("toggle-1", None), notion.blocks.children.calls)
        self.assertIn(("heading-1", None), notion.blocks.children.calls)

        top_toggle = blocks[0]
        self.assertTrue(top_toggle["has_children"])
        self.assertIn("children", top_toggle)
        self.assertEqual(top_toggle["children"][0]["id"], "heading-1")
        self.assertIn("children", top_toggle["children"][0])
        self.assertEqual(top_toggle["children"][0]["children"][0]["id"], "para-1")

    def test_toggle_with_nested_content_and_nested_toggle(self):
        fixture = [
            {
                "type": "toggle",
                "toggle": {
                    "rich_text": [{"plain_text": "Supplements", "annotations": {}}],
                },
                "children": [
                    {
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{"plain_text": "Whey is fast digesting.", "annotations": {}}],
                        },
                    },
                    {
                        "type": "toggle",
                        "toggle": {
                            "rich_text": [{"plain_text": "Casein Notes", "annotations": {}}],
                        },
                        "children": [
                            {
                                "type": "paragraph",
                                "paragraph": {
                                    "rich_text": [{"plain_text": "Casein digests slowly.", "annotations": {}}],
                                },
                            }
                        ],
                    },
                ],
            }
        ]

        md = blocks_to_markdown(fixture)
        self.assertIn("<details>", md)
        self.assertIn("<summary>Supplements</summary>", md)
        self.assertIn("Whey is fast digesting.", md)
        self.assertIn("<summary>Casein Notes</summary>", md)
        self.assertIn("Casein digests slowly.", md)

    def test_table_with_header_and_data_rows(self):
        fixture = [
            {
                "type": "table",
                "table": {
                    "has_column_header": True,
                    "table_width": 3,
                },
                "children": [
                    {
                        "type": "table_row",
                        "table_row": {
                            "cells": [
                                [{"plain_text": "Supplement", "annotations": {}}],
                                [{"plain_text": "Protein (g)", "annotations": {}}],
                                [{"plain_text": "Price", "annotations": {}}],
                            ]
                        },
                    },
                    {
                        "type": "table_row",
                        "table_row": {
                            "cells": [
                                [{"plain_text": "Whey Isolate", "annotations": {}}],
                                [{"plain_text": "25", "annotations": {}}],
                                [{"plain_text": "$39", "annotations": {}}],
                            ]
                        },
                    },
                    {
                        "type": "table_row",
                        "table_row": {
                            "cells": [
                                [{"plain_text": "Casein", "annotations": {}}],
                                [{"plain_text": "24", "annotations": {}}],
                                [{"plain_text": "$34", "annotations": {}}],
                            ]
                        },
                    },
                ],
            }
        ]

        md = blocks_to_markdown(fixture)
        self.assertIn("| Supplement | Protein (g) | Price |", md)
        self.assertIn("| --- | --- | --- |", md)
        self.assertIn("| Whey Isolate | 25 | $39 |", md)
        self.assertIn("| Casein | 24 | $34 |", md)

    def test_table_without_header_does_not_create_fake_col_labels(self):
        fixture = [
            {
                "type": "table",
                "table": {
                    "has_column_header": False,
                    "table_width": 3,
                },
                "children": [
                    {
                        "type": "table_row",
                        "table_row": {
                            "cells": [
                                [{"plain_text": "Animal-Based", "annotations": {}}],
                                [{"plain_text": "Whey", "annotations": {}}],
                                [{"plain_text": "Fast", "annotations": {}}],
                            ]
                        },
                    },
                    {
                        "type": "table_row",
                        "table_row": {
                            "cells": [
                                [{"plain_text": "Plant-Based", "annotations": {}}],
                                [{"plain_text": "Soy", "annotations": {}}],
                                [{"plain_text": "Moderate", "annotations": {}}],
                            ]
                        },
                    },
                ],
            }
        ]

        md = blocks_to_markdown(fixture)
        self.assertNotIn("Col 1", md)
        self.assertIn("|  |  |  |", md)
        self.assertIn("| --- | --- | --- |", md)
        self.assertIn("| Animal-Based | Whey | Fast |", md)
        self.assertIn("| Plant-Based | Soy | Moderate |", md)


if __name__ == "__main__":
    unittest.main()
