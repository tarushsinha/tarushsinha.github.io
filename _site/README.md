## Serve the Jekyll site locally

1. Ensure Ruby, Bundler, and Jekyll are installed (the GitHub Pages Gemfile already pins the supported versions).
2. Install dependencies: `bundle install`
3. Start the dev server: `bundle exec jekyll serve`
4. Visit http://localhost:4000 to preview the site. The server watches for changes and rebuilds automatically; stop it with `Ctrl+C`.

If `_config.yml` changes, restart the server so new settings are picked up.

## Syncing Notion wiki articles into Jekyll (`sync_notion_article.py`)

This project includes a small Python tool that pulls completed wiki pages from your Notion database and converts them into Markdown files under `_articles/`.

Copy `.env.example` into `.env` and update secrets on new machine

### 1. Create and work in a Python virtual environment

To avoid polluting system Python and to keep dependencies consistent across machines, create a local virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate

#To exit later, run:
deactivate
```

### 2. Installing dependences(in venv):
```pip install -r requirements.txt```

## Git workflow best practices

- **Create focused branches**: `git checkout -b feature/slug` off the latest `main`. Keep scope small and related to a single change.
- **Keep main current locally**: `git checkout main && git fetch origin && git pull --ff-only` before starting or merging work.
- **Regularly sync your branch**: `git checkout feature/slug && git rebase origin/main` (or merge) to keep up with upstream changes; resolve conflicts promptly.
- **Review before pushing**: run `bundle exec jekyll build` or the local server, check `git status`, and craft clear commits.
- **Open a pull request**: `git push -u origin feature/slug`, request review, ensure checks pass, then merge via a clean PR (fast-forward or squash). Delete the branch after merge to keep the repo tidy.

### Sample branch workflow

```bash
git checkout main
git fetch origin
git pull --ff-only        # update local main
git checkout -b feature/awesome-update
# make commits
bundle exec jekyll build  # sanity check
git fetch origin
git rebase origin/main    # keep branch current
git push -u origin feature/awesome-update
```

After review, use GitHub's squash-merge (or fast-forward) to integrate changes, then prune locally: `git branch -d feature/awesome-update` and `git fetch --prune`.

<!-- ### Keeping forks in sync

If you're working from a fork, add the upstream remote once:

```bash
git remote add upstream git@github.com:tarushsinha/tarushsinha.github.io.git
```

Then keep `main` updated with `git fetch upstream && git checkout main && git rebase upstream/main` so your branches track the latest changes. -->
