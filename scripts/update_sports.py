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
HEALTH = OUTPUT.with_name('sports-status.json')
TOKEN = os.environ.get('FOOTBALL_DATA_TOKEN', '').strip()
ROOT = 'https://api.football-data.org/v4'


def get(endpoint):
    if not TOKEN:
        raise RuntimeError('No API token available')
    request = urllib.request.Request(
        ROOT + endpoint,
        headers={'X-Auth-Token': TOKEN, 'Accept': 'application/json',
                 'User-Agent': 'WrexhamReds-FanHub/1.4 (Championship match-data reader)'},
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        if response.status != 200:
            raise ValueError(f'Remote service HTTP {response.status}')
        raw = response.read(2_000_000)
        if len(raw) >= 2_000_000:
            raise ValueError('Response too large')
    return json.loads(raw)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    temporary.replace(path)


def health(status):
    # Only a fixed status code is public, never response bodies or credentials.
    write_json(HEALTH, {'status': status, 'checked_at': datetime.now(timezone.utc).isoformat(timespec='seconds')})


def validate_payloads(standings, matches):
    if not isinstance(standings, dict) or not isinstance(matches, dict):
        raise ValueError('Invalid response')
    season = standings.get('season') or {}
    if not season.get('id') or not season.get('startDate') or not season.get('endDate'):
        raise ValueError('Season absent')
    if (matches.get('competition') or {}).get('code') != 'ELC' or (standings.get('competition') or {}).get('code') != 'ELC':
        raise ValueError('Wrong competition')
    if not isinstance(matches.get('matches'), list):
        raise ValueError('Match list absent')
    for match in matches['matches']:
        if (match.get('season') or {}).get('id') != season['id']:
            raise ValueError('Mixed seasons')
        date = datetime.fromisoformat(match['utcDate'].replace('Z', '+00:00'))
        if date.tzinfo is None or not match.get('status'):
            raise ValueError('Invalid match')
    return season


def simplify_match(match):
    home = match.get('homeTeam') or {}
    away = match.get('awayTeam') or {}
    full = (match.get('score') or {}).get('fullTime') or {}
    return {
        'id': match.get('id'),
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
        health('not_configured')
        return 0
    try:
        standings_payload = get('/competitions/ELC/standings')
        matches_payload = get('/competitions/ELC/matches')
        season = validate_payloads(standings_payload, matches_payload)
        tables = standings_payload.get('standings', [])
        table = next((t.get('table') or [] for t in tables if t.get('type') == 'TOTAL'), [])
        if not table:
            raise ValueError('Overall standings absent')
        for row in table:
            if not (row.get('team') or {}).get('id') or not (row.get('team') or {}).get('name'):
                raise ValueError('Invalid standings team')
            if any(type(row.get(k)) is not int for k in ('position', 'playedGames', 'goalDifference', 'points')):
                raise ValueError('Invalid standings values')
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
        team = next((r['team'] for r in table if 'wrexham' in r['team']['name'].lower()), None)
        if not team:
            raise ValueError('Wrexham not found in Championship team list; keeping existing data.')
        team_id = team.get('id')
        def is_wrexham(match):
            return team_id in [((match.get(key) or {}).get('id')) for key in ('homeTeam','awayTeam')]
        today = datetime.now(timezone.utc)
        all_wrexham = [m for m in matches_payload.get('matches', []) if is_wrexham(m)]
        upcoming = sorted([m for m in all_wrexham if m.get('status') in ('SCHEDULED', 'TIMED') and datetime.fromisoformat(m['utcDate'].replace('Z','+00:00')) >= today], key=lambda m: m['utcDate'])
        pending = sorted([m for m in all_wrexham if m.get('status') not in ('FINISHED', 'AWARDED') and m not in upcoming], key=lambda m: m['utcDate'], reverse=True)
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
            'season': {'start': season['startDate'], 'end': season['endDate']},
            'standings': standings,
            'fixtures': [simplify_match(m) for m in upcoming[:8]],
            'results': [simplify_match(m) for m in finished[:8]],
            'pending': [simplify_match(m) for m in pending[:8]],
            'squad': squad[:65],
        }
        # Guard against a successful HTTP response with an unexpected schema.
        if not standings or not isinstance(matches_payload.get('matches'), list):
            raise ValueError('Championship standings or match list absent; keeping previous data.')
        write_json(OUTPUT, new_data)
        health('connected')
        print(f"Sports ready: {len(standings)} teams, {len(new_data['fixtures'])} upcoming, {len(new_data['results'])} results, {len(squad)} players.")
    except (urllib.error.URLError, ValueError, TimeoutError, KeyError, TypeError, AttributeError) as exc:
        print('Sports feed unavailable or token lacks access; previous data preserved:', type(exc).__name__, file=sys.stderr)
        code = getattr(exc, 'code', None)
        # Log only the numeric status: error messages and bodies can contain credentials.
        if type(code) is int:
            print(f'Football-data.org HTTP status: {code}', file=sys.stderr)
        health({401: 'unauthorized', 403: 'access_denied', 429: 'rate_limited'}.get(code, 'unavailable'))
        return 1
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
