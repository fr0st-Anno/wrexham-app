#!/usr/bin/env python3
"""Optional football-data.org updater for Championship fixtures, table, and team roster.

Never exports the API key. If the key is absent, existing data stays untouched.
This is delayed free-tier data, NOT instantaneous live match scores.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUTPUT = Path(__file__).resolve().parents[1] / 'data' / 'sports.json'
TOKEN = os.environ.get('FOOTBALL_DATA_TOKEN', '').strip()
ROOT = 'https://api.football-data.org/v4'


def get(endpoint):
    if not TOKEN:
        raise RuntimeError('No API token available')
    request = urllib.request.Request(
        ROOT + endpoint,
        headers={'X-Auth-Token': TOKEN, 'Accept': 'application/json',
                 'User-Agent': 'WrexhamReds-FanHub/1.3 (Championship match-data reader)'},
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        if response.status != 200:
            raise ValueError(f'Remote service HTTP {response.status}')
        raw = response.read(2_000_000)
        if len(raw) >= 2_000_000:
            raise ValueError('Response too large')
    return json.loads(raw)


def simplify_match(match):
    home = match.get('homeTeam') or {}
    away = match.get('awayTeam') or {}
    full = (match.get('score') or {}).get('fullTime') or {}
    return {
        'home': home.get('shortName') or home.get('name') or 'Home',
        'away': away.get('shortName') or away.get('name') or 'Away',
        'kickoff': match.get('utcDate'),
        'competition': (match.get('competition') or {}).get('name') or 'Championship',
        'status': match.get('status'),
        'home_score': full.get('home'),
        'away_score': full.get('away'),
    }


def main():
    if not TOKEN:
        print('FOOTBALL_DATA_TOKEN not configured; sports section remains in setup mode.')
        return 0
    try:
        standings_payload = get('/competitions/ELC/standings')
        matches_payload = get('/competitions/ELC/matches')
        teams_payload = get('/competitions/ELC/teams')
        tables = standings_payload.get('standings', [])
        table = next((t.get('table') or [] for t in tables if t.get('type') == 'TOTAL'), [])
        if not table:
            table = tables[0].get('table') or [] if tables else []
        standings = [
            {
                'position': row.get('position'),
                'team': (row.get('team') or {}).get('shortName') or (row.get('team') or {}).get('name'),
                'played': row.get('playedGames'),
                'goal_difference': row.get('goalDifference'),
                'points': row.get('points'),
            }
            for row in table if (row.get('team') or {}).get('name')
        ]
        team = next((t for t in teams_payload.get('teams', []) if 'wrexham' in (t.get('name') or '').lower()), None)
        if not team:
            raise ValueError('Wrexham not found in Championship team list; keeping existing data.')
        team_id = team.get('id')
        def is_wrexham(match):
            return team_id in [((match.get(key) or {}).get('id')) for key in ('homeTeam','awayTeam')]
        today = datetime.now(timezone.utc)
        all_wrexham = [m for m in matches_payload.get('matches', []) if is_wrexham(m)]
        upcoming = sorted([m for m in all_wrexham if m.get('status') in ('SCHEDULED', 'TIMED', 'POSTPONED') and m.get('utcDate') and datetime.fromisoformat(m['utcDate'].replace('Z','+00:00')) >= today], key=lambda m: m.get('utcDate'))
        finished = sorted([m for m in all_wrexham if m.get('status') == 'FINISHED'], key=lambda m: m.get('utcDate') or '', reverse=True)
        squad = []
        try:
            detail = get('/teams/' + str(team_id))
            for player in detail.get('squad') or []:
                if player.get('role', 'PLAYER') != 'PLAYER':
                    continue
                squad.append({
                    'name': player.get('name'),
                    'position': player.get('position'),
                    'nationality': player.get('nationality'),
                    'dob': player.get('dateOfBirth'),
                })
        except (urllib.error.URLError, ValueError, json.JSONDecodeError, TimeoutError) as exc:
            print('Squad details unavailable with current plan; leaving roster empty.', file=sys.stderr)
        new_data = {
            'updated_at': today.isoformat(timespec='seconds'),
            'source': 'football-data.org',
            'status': 'connected',
            'standings': standings,
            'fixtures': [simplify_match(m) for m in upcoming[:8]],
            'results': [simplify_match(m) for m in finished[:8]],
            'squad': squad[:65],
        }
        # Guard against a successful HTTP response with an unexpected schema.
        if not standings or not isinstance(matches_payload.get('matches'), list):
            raise ValueError('Championship standings or match list absent; keeping previous data.')
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps(new_data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        print(f"Sports ready: {len(standings)} teams, {len(new_data['fixtures'])} upcoming, {len(new_data['results'])} results, {len(squad)} players.")
    except (urllib.error.URLError, ValueError, json.JSONDecodeError, TimeoutError) as exc:
        print('Sports feed unavailable or token lacks access; previous data preserved:', type(exc).__name__, file=sys.stderr)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
