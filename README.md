# Wrexham Reds — Unofficial Wrexham AFC Fan Hub

**Next release (draft):** iPhone home-screen support, comfortable mobile controls, automatic Pages publishing, and improved Championship data handling. See [INSTALL.md](INSTALL.md) for the current activation and installation instructions. These replace the legacy ZIP and branch-based Pages instructions below. No merge or deployment is implied by this draft.

**Version 1.3**: Match Centre, Championship table, transfer desk, squad cards, improved mobile design, plus original RSS news, search, bookmarks and YouTube.

The original Wrexham news feed, transfer categories, injury reports, bookmarks, search and official Wrexham YouTube player remain available.

## What's included

- **RSS news:** Wrexham Reds (`https://www.wrexhamreds.com/feed/`), BBC Welsh Football, BBC Sport Championship, BBC Football and Sky Sports Football. All article cards show source attribution, headline, a short RSS excerpt and link directly to the original publisher.
- **Official Wrexham AFC club website:** direct link, *not* automatically imported; no official RSS feed or reuse permission verified.
- **YouTube:** official club channel `UCS7BAYpqOSaYy-pZp6oO4PA`, loaded from its public Atom feed. Standard YouTube embed; videos may disallow external playback. Shorts aren't reliably identified separately in the Atom feed.
- **Search, categories, local bookmarks** (saved in your browser).
- **GitHub Actions** RSS updater intended every 30 minutes and **GitHub Pages** website hosting. Cron runs are best-effort and may be delayed or skipped.

This is an **unofficial**, independent fan project. Wrexham Reds (`wrexhamreds.com`) is a fan news site, **not** Wrexham AFC's official website. News labels are automated guesses, not editorial verification. Only a club-published announcement should be treated as officially confirmed. No paid APIs, scraping of full articles or copied article imagery are used.

## Open on your PC

Unzip and double-click `index.html`. The design and navigation work, but most browsers restrict `fetch()` when opened through `file://`; the feed list will correctly say preview mode. For a fully accurate local test run `python -m http.server 8000` from this folder, then visit `http://localhost:8000`.

## New version upgrade for your existing GitHub Pages website

The upgrade ZIP intentionally does **not** contain `data/content.json`: keep the live headlines and video data that GitHub has already generated. Replace or add the other files, including the new `data/sports.json` and `scripts/update_sports.py`. Update the existing `.github/workflows/update-news.yml` to enable sports updates. **Do not replace the whole repository with only the ZIP contents**.

## Deploy to GitHub Pages (new repositories only)

1. Make a **new public** GitHub repository named, for example, `wrexham-app`.
2. Upload the **contents** of this folder, including the hidden `.github/workflows/update-news.yml` path. To keep hidden `.github` during upload, use Git or verify GitHub's web uploader includes it. With Git installed, `git init; git add .; git commit -m "Initial app"; git branch -M main; git remote add origin https://github.com/USERNAME/wrexham-app.git; git push -u origin main` (create the repository first).
3. In GitHub repository **Settings → Pages**, set Source to **Deploy from a branch**, Branch `main`, Folder `/(root)` and Save.
4. Go to **Actions → Update news and videos → Run workflow**. The workflow fetches RSS feeds into `data/content.json` and commits them to `main`. GitHub may require enabling workflows or permission to write repository contents under **Settings → Actions → General**.
5. Refresh the Pages URL: `https://USERNAME.github.io/wrexham-app/` (replace USERNAME). The scheduled updater will aim to run every 30 minutes while GitHub permits; GitHub schedules are not guaranteed to fire on time.

**Important:** the default Wrexham crest image is referenced from a public club-operated image URL, not redistributed inside the ZIP. It can fail to load or be subject to trademark and usage rights. Get permission before promoting a publicly branded fan app; the logo falls back to a letter W if unavailable. Replace the image URL in `index.html` if you have a permitted local crest asset. The shortcut favicon is a generic W symbol (not the club crest).

## RSS policy and reliability

- The RSS collection is deliberately restrained: title, date, short description and original URL, with source attribution. Respect each publisher's RSS terms and check licensing if going beyond private/non-commercial use. BBC RSS attribution/branding terms apply.
- No scraping of the Wrexham AFC official news site or Transfermarkt is included.
- A feed being listed does not guarantee every individual request will work. GitHub Actions network access must fetch feeds successfully. Failing feeds retain previous stories from that source so single-source failures don't wipe out all headlines.
- Wrexham-specific filtering applies to general BBC and Sky football feeds; stories not mentioned in a headline or excerpt can be missed.
- YouTube feed includes only recent uploads; no reliable distinct Shorts label. YouTube handles advertisements and embeddability.
- For public sharing, add an independent privacy notice if you start collecting personal data. This version has no analytics and only uses browser localStorage for bookmarks.

## News source URLs

- Wrexham Reds: https://www.wrexhamreds.com/feed/
- BBC Welsh Football: https://feeds.bbci.co.uk/sport/football/welsh/rss.xml
- BBC Sport Championship: https://feeds.bbci.co.uk/sport/football/championship/rss.xml
- BBC Sport Football: https://feeds.bbci.co.uk/sport/football/rss.xml
- Sky Sports Football: https://www.skysports.com/rss/11095
- Official Wrexham AFC YouTube: https://www.youtube.com/feeds/videos.xml?channel_id=UCS7BAYpqOSaYy-pZp6oO4PA

## Tech

Plain HTML/CSS/JavaScript + Python standard library; no npm or paid services needed for the existing news app. The **optional Championship integration requires a free football-data.org API token**, stored as a GitHub Actions secret.

## Preview vs. live news (important)

When you open `index.html` on your computer (or before the updater runs), the cards are explicitly labelled **EXAMPLE CONTENT**. They are design demonstrations, **not real headlines, transfers or videos**. The examples can be searched, filtered and bookmarked for testing.

After publishing the files to GitHub Pages, go to the **Actions** tab and manually run **Update news and videos** once. Once `data/content.json` has an `updated_at` value and fetched stories, the real cards replace the examples. The scheduled workflow aims to run every 30 minutes, but GitHub Actions may delay or skip scheduled executions.

On desktop, press `Ctrl+0` to restore browser zoom to 100%. The editorial layout now scales wider at large screen sizes.


## V1.3: Match centre and free Championship sports-data integration

The **News** and **Videos** sections continue using the original working GitHub Actions RSS workflow. The new **Match centre, results, league standings and player profiles** use `data/sports.json` (separate from `data/content.json`). No scores, positions, fixtures or squad members are invented. Without an enabled provider, these sections honestly show a "data not connected" message.

The EFL Championship is currently included in [football-data.org's free coverage](https://www.football-data.org/coverage). Sign up there for a free API token if eligible under their terms. **Never paste a token into `index.html`, `app.js` or a public GitHub repository.** Instead:

1. GitHub repository → **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: **`FOOTBALL_DATA_TOKEN`**. Value: your private football-data.org token.
3. On **Actions → Update news and videos → Run workflow**, run it manually once. It calls `scripts/update_sports.py` and writes `data/sports.json` (if access to Championship data succeeds).
4. Reload the website after the run completes. Future scheduled runs aim for every 30 minutes (not guaranteed).

The provider's **free tier has delayed scores/schedules**, so it is **not a second-by-second live score service**. The page shows the last successful refresh. Sports data may be empty if plan or endpoint restrictions change. Squads are only shown if the provider returns them for your plan; otherwise the squad section states the limitation.

**External sources**: FotMob and Flashscore are linked as third-party match resources but are **not scraped or polled**. EFL's upcoming-TV-games page is linked for official broadcasting selections, with the caveat that the EFL listings don't supply a verified open API. GOAL.com's Wrexham page is linked for transfer reading but is **not harvested**: their terms prohibit scraping/text and data mining and we have not confirmed an authorized RSS feed. The official Wrexham news site remains a link pending a confirmed reusable feed/permission.

The update script maintains existing sports content when the token isn't set or a request fails. For updating an existing deployed repository, upload the **new and changed files**, keeping any current live `data/content.json` intact, then manually run the workflow.
