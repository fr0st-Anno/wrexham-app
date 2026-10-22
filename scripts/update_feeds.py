#!/usr/bin/env python3
"""Create static JSON for GitHub Pages from public RSS/Atom headlines.

Uses only the standard library. This script does NOT scrape article bodies.
"""
import hashlib
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data' / 'content.json'
CHANNEL_ID = 'UCS7BAYpqOSaYy-pZp6oO4PA'
SOURCES = [
    ('Wrexham Reds', 'https://www.wrexhamreds.com/feed/', True, False),
    ('BBC Welsh Football', 'https://feeds.bbci.co.uk/sport/football/welsh/rss.xml', False, False),
    ('BBC Sport Championship', 'https://feeds.bbci.co.uk/sport/football/championship/rss.xml', False, False),
    ('BBC Sport', 'https://feeds.bbci.co.uk/sport/football/rss.xml', False, False),
    ('Sky Sports', 'https://www.skysports.com/rss/11095', False, False),
    ('Wrexham AFC YouTube', f'https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}', True, True),
]
WATCH = re.compile(r'\bwrexham\b|\bwxmafc\b|\bracecourse ground\b|\bphil parkinson\b', re.I)
TRANSFER = re.compile(r'transfer|sign(?:ed|ing|s)?\b|deal\b|bid\b|loan move|contract|target|departure|depart|exit|linked|rumou?r', re.I)
INJURY = re.compile(r'injur|fitness|recovery|sidelined|doubt\b|out for|training return|setback', re.I)
MATCH = re.compile(r'fixture|match|vs\.?\b|preview|line-?up|lineup|result|highlights|win\b|lose\b|draw\b|score|kick.?off', re.I)
PLAYER = re.compile(r'player|squad|midfield|striker|defender|goalkeeper|captain', re.I)
TAGS = re.compile(r'<[^>]+>')


def clean(value, limit=360):
    value = html.unescape(TAGS.sub(' ', value or ''))
    return re.sub(r'\s+', ' ', value).strip()[:limit]


def text_in(element, tag):
    child = element.find(tag)
    return ''.join(child.itertext()).strip() if child is not None else ''


def iso_date(date_text):
    if not date_text:
        return None
    try:
        dt = parsedate_to_datetime(date_text)
    except (ValueError, TypeError):
        try:
            dt = datetime.fromisoformat(date_text.replace('Z', '+00:00'))
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat(timespec='seconds')


def valid_url(value):
    u = urllib.parse.urlsplit(value)
    return value if u.scheme in {'http', 'https'} and u.netloc else None


def category(text):
    if INJURY.search(text):
        return 'Injuries'
    if TRANSFER.search(text):
        return 'Transfers'
    if MATCH.search(text):
        return 'Matches'
    if PLAYER.search(text):
        return 'Players'
    return 'Club'


def fetch_xml(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'WrexhamFanNewsHub/1.1 (+https://github.com/; RSS headline reader)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
    })
    with urllib.request.urlopen(req, timeout=20) as response:
        if response.status != 200:
            raise ValueError(f'HTTP {response.status}')
        blob = response.read(2_000_000)
        if len(blob) >= 2_000_000:
            raise ValueError('Feed too large')
    return ET.fromstring(blob)


def read_rss(root, source, include_all):
    out = []
    for item in root.findall('.//item')[:100]:
        title = clean(text_in(item, 'title'), 210)
        summary = clean(text_in(item, 'description'), 300)
        link = valid_url(text_in(item, 'link'))
        if not title or not link:
            continue
        if not include_all and not WATCH.search(f'{title} {summary}'):
            continue
        ident = hashlib.sha256((source + '|' + link).encode()).hexdigest()[:22]
        out.append({
            'id': ident, 'title': title, 'summary': summary, 'url': link,
            'source': source, 'published': iso_date(text_in(item, 'pubDate')),
            'category': category(f'{title} {summary}'),
        })
    return out


def read_youtube(root):
    ns = {'atom': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015'}
    out = []
    for entry in root.findall('atom:entry', ns)[:20]:
        video_id = text_in(entry, '{http://www.youtube.com/xml/schemas/2015}videoId')
        if not re.fullmatch(r'[A-Za-z0-9_-]{11}', video_id):
            continue
        out.append({
            'video_id': video_id,
            'title': clean(text_in(entry, '{http://www.w3.org/2005/Atom}title'), 180),
            'published': iso_date(text_in(entry, '{http://www.w3.org/2005/Atom}published')),
        })
    return out


def main():
    try:
        previous = json.loads(OUTPUT.read_text('utf-8'))
    except (FileNotFoundError, ValueError, OSError):
        previous = {'updated_at': None, 'news': [], 'videos': [], 'sources': {}}

    stories = []
    videos = []
    states = {}
    successes = 0
    news_success = False
    video_success = False
    for name, url, include_all, is_video in SOURCES:
        try:
            feed = fetch_xml(url)
            if is_video:
                videos = read_youtube(feed)
                video_success = True
                count = len(videos)
            else:
                articles = read_rss(feed, name, include_all)
                stories.extend(articles)
                news_success = True
                count = len(articles)
            successes += 1
            states[name] = f'OK ({count} relevant items)'
            print(f'{name}: fetched {count} relevant items')
        except (urllib.error.URLError, ValueError, ET.ParseError, TimeoutError, OSError) as exc:
            states[name] = 'Unavailable during this update'
            print(f'{name}: unavailable ({exc})', file=sys.stderr)
    if not successes:
        print('No feeds available; leaving existing data unchanged.', file=sys.stderr)
        return 1

    # Retain older stories from any source whose fetch failed, so one outage does not erase them.
    failed = set(states) - {name for name, state in states.items() if state.startswith('OK')}
    stories.extend(story for story in previous.get('news', []) if story.get('source') in failed)
    if not video_success:
        videos = previous.get('videos', [])

    seen, unique = set(), []
    for item in sorted(stories, key=lambda n: n.get('published') or '', reverse=True):
        key = re.sub(r'[^a-z0-9]+', '', item['title'].lower())
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    output = {
        'updated_at': datetime.now(timezone.utc).isoformat(timespec='seconds') if (news_success or video_success) else previous.get('updated_at'),
        'news': unique[:150],
        'videos': videos[:20],
        'sources': states,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {len(output["news"])} stories and {len(output["videos"])} videos.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
