# Wrexham Reds — Unofficial Wrexham AFC News Hub

Version 1.2: a wider, mobile-friendly fan app: Wrexham news, transfer categories, injury reports, bookmarks, search, and official Wrexham AFC YouTube uploads with supported in-app playback.

## What's included

- **RSS news:** Wrexham Reds (`https://www.wrexhamreds.com/feed/`), BBC Welsh Football, BBC Sport Championship, BBC Football and Sky Sports Football. All article cards show source attribution, headline, a short RSS excerpt and link directly to the original publisher.
- **Official Wrexham AFC club website:** direct link, *not* automatically imported; no official RSS feed or reuse permission verified.
- **YouTube:** official club channel `UCS7BAYpqOSaYy-pZp6oO4PA`, loaded from its public Atom feed. Standard YouTube embed; videos may disallow external playback. Shorts aren't reliably identified separately in the Atom feed.
- **Search, categories, local bookmarks** (saved in your browser).
- **GitHub Actions** RSS updater intended every 30 minutes and **GitHub Pages** website hosting. Cron runs are best-effort and may be delayed or skipped.

This is an **unofficial**, independent fan project. Wrexham Reds (`wrexhamreds.com`) is a fan news site, **not** Wrexham AFC's official website. News labels are automated guesses, not editorial verification. Only a club-published announcement should be treated as officially confirmed. No paid APIs, scraping of full articles or copied article imagery are used.

## Open on your PC

Unzip and double-click `index.html`. The design and navigation work, but most browsers restrict `fetch()` when opened through `file://`; the feed list will correctly say preview mode. For a fully accurate local test run `python -m http.server 8000` from this folder, then visit `http://localhost:8000`.

## Deploy to GitHub Pages

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

Plain HTML/CSS/JavaScript + Python standard library; no npm, API keys, paid services or build steps needed.

## Preview vs. live news (important)

When you open `index.html` on your computer (or before the updater runs), the cards are explicitly labelled **EXAMPLE CONTENT**. They are design demonstrations, **not real headlines, transfers or videos**. The examples can be searched, filtered and bookmarked for testing.

After publishing the files to GitHub Pages, go to the **Actions** tab and manually run **Update news and videos** once. Once `data/content.json` has an `updated_at` value and fetched stories, the real cards replace the examples. The scheduled workflow aims to run every 30 minutes, but GitHub Actions may delay or skip scheduled executions.

On desktop, press `Ctrl+0` to restore browser zoom to 100%. The editorial layout now scales wider at large screen sizes.
