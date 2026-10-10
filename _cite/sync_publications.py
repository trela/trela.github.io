"""
find new publications on OpenAlex and Google Scholar and append them to
_data/sources-synced.yaml, skipping anything already listed on the site

usage: python _cite/sync_publications.py [--since YEAR] [--dry-run]

env:
  GOOGLE_SCHOLAR_API_KEY  optional SerpAPI key; without it the public Scholar profile page is read once
  OPENALEX_MAILTO         optional contact email for the OpenAlex polite pool
  SYNC_REPORT             optional path for a Markdown summary (used as the pull request body)
"""

import argparse
import difflib
import html
import json
import os
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "_data" / "publication-sync.yaml"
CURATED = ROOT / "_data" / "sources.yaml"
SYNCED = ROOT / "_data" / "sources-synced.yaml"

TYPE_MAP = {"article": "journal", "conference-paper": "conference", "book-chapter": "book-chapter"}
PREPRINT = "preprint"
CONFERENCE_WORDS = re.compile(r"(?i)proceedings|conference|symposium|workshop|\b(itc|vts|dac|date|iccad|host)\b")

warnings = []


def warn(message):
    warnings.append(message)
    print(f"WARNING: {message}")


def fetch(url, headers=None, as_json=True):
    """get url with retries, return None on failure"""
    headers = {"User-Agent": "trela-publication-sync", **(headers or {})}
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60) as response:
                body = response.read().decode("utf-8", errors="ignore")
                return json.loads(body) if as_json else body
        except Exception as error:
            last = error
            time.sleep(5 * (attempt + 1))
    warn(f"could not fetch {url.split('?')[0]}: {last}")
    return None


def norm_title(title):
    title = html.unescape(re.sub(r"<[^>]+>", "", title or ""))
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()


def same_title(a, b):
    a, b = norm_title(a), norm_title(b)
    return bool(a) and (a == b or difflib.SequenceMatcher(None, a, b).ratio() >= 0.92)


def initials(name):
    """'Yiorgos Makris' -> 'Y. Makris', 'Hsiao-Chun Wu' -> 'H.-C. Wu'"""
    name = re.sub(r"^(prof|dr|mr|ms|mrs)\.?\s+", "", name.strip(), flags=re.I)
    parts = name.replace(".", ". ").split()
    if len(parts) < 2:
        return name
    given = ["-".join(p[0].upper() + "." for p in part.split("-") if p) for part in parts[:-1]]
    return " ".join(given + [parts[-1]])


def clean_venue(venue):
    # scholar shortens details with an ellipsis, e.g. "Venue …, 2025"
    venue = re.sub(r"\s*(\.\.\.|\u2026)", "", (venue or "").replace("\u00a0", " ")).strip()
    venue = re.sub(r"(,\s*[^,]*\d[^,]*)?,\s*(19|20)\d\d$", "", venue)  # trailing ", pages, year"
    venue = re.sub(r"\s+\d+\s*\(\d+\)$", "", venue)  # trailing "volume (issue)"
    venue = re.sub(r"^(19|20)\d\d\s+", "", venue)  # leading year
    return venue.strip(" ,")


# sources

def openalex_works(author, since):
    mailto = os.environ.get("OPENALEX_MAILTO", "")
    works, cursor = [], "*"
    while cursor:
        params = {
            "filter": f"author.id:{author},publication_year:>{since - 1}",
            "per-page": 50,
            "cursor": cursor,
            "select": "id,doi,title,publication_year,type,authorships,primary_location,locations",
        }
        if mailto:
            params["mailto"] = mailto
        data = fetch("https://api.openalex.org/works?" + urllib.parse.urlencode(params))
        if not data:
            return works
        works += data["results"]
        cursor = data["meta"].get("next_cursor") if data["results"] else None
    return works


def openalex_venue(work):
    locations = [work.get("primary_location") or {}] + (work.get("locations") or [])
    for location in locations:
        source = location.get("source") or {}
        if source.get("display_name") and source.get("type") != "repository":
            # openalex joins alternative names with "/": keep the most complete one
            names = [n.strip() for n in source["display_name"].split("/") if n.strip() and "..." not in n]
            name = max(names or [source["display_name"]], key=len)
            return clean_venue(re.sub(r"^Proceedings\s*[-,]\s*", "", name))
    return ""


def scholar_items(user):
    key = os.environ.get("GOOGLE_SCHOLAR_API_KEY", "")
    if key:
        params = {"engine": "google_scholar_author", "author_id": user, "sort": "pubdate", "num": 100, "api_key": key}
        data = fetch("https://serpapi.com/search.json?" + urllib.parse.urlencode(params))
        return [
            {
                "title": a.get("title", ""),
                "authors": a.get("authors", ""),
                "venue": a.get("publication", ""),
                "year": int(a["year"]) if str(a.get("year", "")).isdigit() else None,
                "link": a.get("link", ""),
            }
            for a in (data or {}).get("articles", [])
        ]

    url = f"https://scholar.google.com/citations?hl=en&user={user}&view_op=list_works&sortby=pubdate&cstart=0&pagesize=100"
    page = fetch(url, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"}, as_json=False)
    rows = re.findall(r'<tr class="gsc_a_tr">(.*?)</tr>', page or "", re.S)
    if page is not None and not rows:
        warn("Google Scholar returned no publications (probably blocked); continuing with OpenAlex only")
    items = []
    for row in rows:
        title = re.search(r'<a href="([^"]*)" class="gsc_a_at">(.*?)</a>', row, re.S)
        grays = [html.unescape(re.sub(r"<[^>]+>", "", g)) for g in re.findall(r'<div class="gs_gray">(.*?)</div>', row, re.S)]
        year = re.sub(r"<[^>]+>", "", (re.search(r'class="gsc_a_y">(.*?)</td>', row, re.S) or [None, ""])[1]).strip()
        if not title:
            continue
        items.append({
            "title": html.unescape(re.sub(r"<[^>]+>", "", title.group(2))),
            "authors": grays[0] if grays else "",
            "venue": grays[1] if len(grays) > 1 else "",
            "year": int(year) if year.isdigit() else None,
            "link": "https://scholar.google.com" + html.unescape(title.group(1)),
        })
    return items


# candidate building

def from_openalex(work, author):
    authors = []
    for authorship in work.get("authorships") or []:
        person = authorship.get("author") or {}
        name = initials(person.get("display_name") or authorship.get("raw_author_name") or "")
        if (person.get("id") or "").endswith(author):
            name = f"**{name}**"
        authors.append(name)
    doi = (work.get("doi") or "").replace("https://doi.org/", "").lower()
    return {
        "type": TYPE_MAP.get(work["type"], work["type"]),
        "title": html.unescape(re.sub(r"<[^>]+>", "", work["title"] or "")).strip(),
        "authors": authors,
        "publisher": openalex_venue(work),
        "year": work.get("publication_year"),
        "doi": doi,
        "link": f"https://doi.org/{doi}" if doi else work["id"],
        "sync": ["openalex"],
        "_preprint": work["type"] == PREPRINT,
    }


def from_scholar(item):
    authors = [a.strip() for a in item["authors"].split(",") if a.strip() and a.strip() != "..."]
    authors = [initials(a) for a in authors]
    authors = [f"**{a}**" if a == "Y. Makris" else a for a in authors]
    venue = clean_venue(item["venue"])
    return {
        "type": "conference" if CONFERENCE_WORDS.search(venue) else "journal",
        "title": item["title"].strip(),
        "authors": authors,
        "publisher": venue,
        "year": item["year"],
        "doi": "",
        "link": item["link"],
        "sync": ["google-scholar"],
        "_preprint": False,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--since", type=int, help="override since_year from the config")
    parser.add_argument("--dry-run", action="store_true", help="report only, do not write")
    args = parser.parse_args()

    config = yaml.safe_load(CONFIG.read_text()) or {}
    since = args.since or int(config.get("since_year", 2025))
    exclude = [re.compile(p, re.I) for p in config.get("exclude_patterns") or []]
    ignore = [str(i).lower() for i in config.get("ignore") or []]
    curated = yaml.safe_load(CURATED.read_text()) or []
    synced = (yaml.safe_load(SYNCED.read_text()) if SYNCED.exists() else None) or []
    existing = curated + synced

    def excluded(c):
        return any(p.search(c["title"]) or p.search(c["publisher"] or "") for p in exclude)

    def ignored(c):
        return any(i == (c["doi"] or "").lower() or same_title(i, c["title"]) for i in ignore)

    # openalex candidates, merging duplicates and preferring published over preprint
    author = config["openalex_author"]
    candidates = []
    for work in openalex_works(author, since):
        if work["type"] not in TYPE_MAP and work["type"] != PREPRINT:
            continue
        c = from_openalex(work, author)
        twin = next((d for d in candidates if same_title(d["title"], c["title"])), None)
        if twin is None:
            candidates.append(c)
        elif twin["_preprint"] and not c["_preprint"]:
            candidates[candidates.index(twin)] = c

    # scholar confirms openalex items, fills missing venues, and adds scholar-only items
    for item in scholar_items(config["google_scholar_user"]):
        if not item["year"] or item["year"] < since:
            continue
        match = next((c for c in candidates if same_title(c["title"], item["title"])
                      and abs((c["year"] or 0) - item["year"]) <= 1), None)
        if match:
            match["sync"].append("google-scholar")
            # scholar venue names are cleaner than openalex ones, unless scholar cut them off
            if item["venue"]:
                match["publisher"] = clean_venue(item["venue"])
            if not match["doi"]:
                match["link"] = item["link"]
        else:
            candidates.append(from_scholar(item))

    for c in candidates:
        if c["type"] == "journal" and CONFERENCE_WORDS.search(c["publisher"] or ""):
            c["type"] = "conference"

    added, versions, skipped = [], [], 0
    for c in candidates:
        if excluded(c) or ignored(c) or (c["_preprint"] and "google-scholar" not in c["sync"]):
            skipped += 1
            continue
        same_doi = c["doi"] and any((e.get("doi") or "").lower() == c["doi"] for e in existing)
        twins = [e for e in existing if same_title(e["title"], c["title"])]
        close = [e for e in twins if abs(int(str(e["date"])[:4]) - (c["year"] or 0)) <= 1]
        if same_doi or close:
            continue
        entry = {
            "type": c["type"],
            "title": c["title"],
            "authors": c["authors"],
            "publisher": c["publisher"],
            "date": f"{c['year']}-01-01",
            "link": c["link"],
        }
        if c["doi"]:
            entry["doi"] = c["doi"]
            entry["buttons"] = [{"type": "doi", "link": c["link"]}]
        entry["tags"] = [c["type"]]
        entry["sync"] = c["sync"]
        added.append(entry)
        existing.append(entry)
        if twins:
            versions.append(entry["title"])

    # report
    lines = [f"Publication sync found **{len(added)}** new publication(s) published since {since}.", ""]
    for e in added:
        flags = []
        if len(e["sync"]) == 1:
            flags.append(f"only on {e['sync'][0]}, please check")
        if e["title"] in versions:
            flags.append("same title as an existing entry, possibly a new version")
        flag = f" ({'; '.join(flags)})" if flags else ""
        lines.append(f"- {e['date'][:4]} · {e['type']} · [{e['title']}]({e['link']}) · {e['publisher']}{flag}")
    lines += ["", "Delete any entry you do not want from `_data/sources-synced.yaml` and add its title to `ignore` in "
              "`_data/publication-sync.yaml` so it is not suggested again."]
    if warnings:
        lines += ["", "Warnings:"] + [f"- {w}" for w in warnings]
    report = "\n".join(lines)
    print(report)
    if os.environ.get("SYNC_REPORT"):
        Path(os.environ["SYNC_REPORT"]).write_text(report + "\n")

    if added and not args.dry_run:
        merged = sorted(synced + added, key=lambda e: -int(str(e["date"])[:4]))
        header = ("# Publications added automatically by _cite/sync_publications.py (reviewed through pull requests).\n"
                  "# Edit entries freely: add code, dataset or model buttons as in sources.yaml.\n\n")
        SYNCED.write_text(header + yaml.dump(merged, sort_keys=False, allow_unicode=True, width=1000))


if __name__ == "__main__":
    main()
