# TRELA Lab website

Website of the Trusted and RELiable Architectures (TRELA) Lab at UC San Diego, directed by Prof. Yiorgos Makris.
Built with the [Lab Website Template](https://github.com/greenelab/lab-website-template) (Jekyll) and deployed to GitHub Pages by GitHub Actions.

## Editing content

Almost everything lives in plain data files, so most updates need no HTML.

| What | Where |
| --- | --- |
| Lab name, description, social accounts | `_config.yaml` (`links:` holds email, Instagram, X, LinkedIn, GitHub, Hugging Face, Google Scholar) |
| Publications | `_data/sources.yaml` (newest first) |
| Code, datasets, models for a paper | `buttons:` of that paper in `_data/sources.yaml` |
| Research thrusts | `_data/thrusts.yaml` |
| Projects (with code/dataset/model buttons) | `_data/projects.yaml` |
| Current members | one file per person in `_members/` (photo in `images/team/`) |
| Alumni | `_data/alumni.yaml` |
| News, highlights, lab life | one Markdown file per post in `_posts/` named `YYYY-MM-DD-title.md` |
| Featured social media posts | `_data/social.yaml` |
| Sponsors | `_data/sponsors.yaml` |

### Add a publication

Add an entry near the top of `_data/sources.yaml`, in date order:

```yaml
- type: conference            # journal | conference | workshop | book-chapter | patent
  title: My New Paper
  authors:
    - A. Student
    - '**Y. Makris**'
  publisher: Proceedings of the IEEE VLSI Test Symposium (VTS)
  date: '2026-01-01'          # only the year is shown
  link: https://doi.org/10.1109/xxxx   # where the title points
  award: Best Paper Award     # optional
  buttons:
    - type: doi
      link: https://doi.org/10.1109/xxxx
    - type: pdf
      link: files/papers/my-paper.pdf
    - type: code
      link: https://github.com/<org>/<repo>
    - type: model
      link: https://huggingface.co/<org>/<model>
    - type: dataset
      link: https://huggingface.co/datasets/<org>/<dataset>
  tags:
    - conference
```

On every push, GitHub Actions copies `_data/sources.yaml` into `_data/citations.yaml`, which the site renders.
To have the citation filled in automatically from a DOI, add `id: doi:10.xxxx/yyyy` to the entry.
Hand-written fields always override the automatic ones.

### Automatic publication sync

Every Monday the `sync-publications` workflow looks for new papers by Prof. Makris on
[Google Scholar](https://scholar.google.com/citations?user=dUO4lKwAAAAJ) and [OpenAlex](https://openalex.org/A5078818440)
and opens a pull request that adds them to `_data/sources-synced.yaml`.
Nothing goes live until that pull request is merged.

- A paper is skipped when its DOI, or its title with a year within one year, already appears in `sources.yaml` or `sources-synced.yaml`, so nothing is listed twice.
- Metadata (authors, DOI) comes from OpenAlex. Google Scholar confirms authorship and provides cleaner venue names.
- The pull request flags papers found on only one source and papers whose title matches an older entry (possibly a journal version of a conference paper).
- To reject a paper for good, delete it and add its title to `ignore` in `_data/publication-sync.yaml`.
- Settings such as the first year to sync and exclusion rules are in `_data/publication-sync.yaml`. Run it by hand from the Actions tab (Run workflow) or locally with `python _cite/sync_publications.py --dry-run`.
- Optional repository secrets: `GOOGLE_SCHOLAR_API_KEY` (a [SerpAPI](https://serpapi.com) key, which makes Scholar reliable from GitHub's servers) and `OPENALEX_MAILTO` (a contact email for OpenAlex).
- ResearchGate is not synced: it blocks automated access and offers no API. OpenAlex indexes the same papers.

### Add a news post or lab-life highlight

Create `_posts/2026-11-02-retreat.md`:

```markdown
---
title: "Fall lab retreat"
image: images/news/retreat.jpg   # optional banner
tags:
  - lab-life
---

A short description, links, and photos.
```

Useful tags: `award`, `grant`, `paper`, `press`, `people`, `lab-life`.

### Feature posts from Instagram, X, or LinkedIn

Add the post URL to `_data/social.yaml`.
The home and news pages embed the posts listed there with each platform's official embed.
Selecting posts by hand keeps the site free of API keys.
Automatic syncing would need platform API access: an Instagram Business or Creator account with a Graph API token, a paid X API tier, and LinkedIn has no open API for page posts.

## Branches and previews

- `main` is the live site: every push to `main` rebuilds and deploys it.
- Any other branch is published as a preview at `https://trela.github.io/preview/<branch>/` on every push, so changes can be reviewed before merging. Delete a preview by removing its folder from the `gh-pages` branch.
- Pull requests into `main` also get their own preview at `/preview/pr-<number>/`.

## Previewing locally

Requires Ruby 3.1 and Bundler:

```bash
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000.
The `.docker` folder has a Docker setup that does the same without installing Ruby.
