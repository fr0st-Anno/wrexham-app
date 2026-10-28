"""Manual, at-most-three-call capability probe. No API responses are saved."""
import json
import os
import re
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

HOST = 'free-api-live-football-data.p.rapidapi.com'
ALLOWED = {'/football-teams-search', '/football-get-list-player', '/football-get-player-detail'}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Never forward the key to a redirect destination.


class Client:
    def __init__(self, key):
        self.key = key
        self.calls = 0
        self.opener = urllib.request.build_opener(NoRedirect())

    def get(self, path, params):
        if path not in ALLOWED or self.calls >= 3:
            raise ValueError('Probe boundary')
        self.calls += 1
        request = urllib.request.Request(
            'https://' + HOST + path + '?' + urllib.parse.urlencode(params),
            headers={'x-rapidapi-host': HOST, 'x-rapidapi-key': self.key, 'Accept': 'application/json'})
        with self.opener.open(request, timeout=25) as response:
            raw = response.read(2_000_001)
            if len(raw) > 2_000_000:
                raise ValueError('Response too large')
        return json.loads(raw)


def records(value, depth=0):
    if depth > 20:
        return
    if isinstance(value, dict):
        yield value
        for item in value.values():
            yield from records(item, depth+1)
    elif isinstance(value, list):
        for item in value:
            yield from records(item, depth+1)


def wrexham_ids(payload):
    found = set()
    for row in records(payload):
        name = row.get('name', row.get('teamName', ''))
        if not isinstance(name, str):
            continue
        name = re.sub(r'[^a-z0-9]', '', name.lower())
        identifier = row.get('id', row.get('teamId'))
        if name in {'wrexham', 'wrexhamafc', 'wrexhamfc'} and re.fullmatch(r'[0-9]{1,10}', str(identifier or '')):
            found.add(str(identifier))
    return found


def summarize(payload):
    # Fixed labels/counts only: never print arbitrary keys, URLs, names or values.
    groups = {'rating': {'rating', 'averagerating', 'ratingaverage'},
              'image': {'image', 'imageurl', 'photo', 'photourl', 'portrait', 'portraiturl'},
              'player': {'player', 'players', 'squad'},
              'season': {'season', 'seasonid', 'seasonname'}}
    counts = dict.fromkeys(groups, 0)
    for row in records(payload):
        for key, value in row.items():
            normalized = re.sub(r'[^a-z]', '', str(key).lower())
            for label, keys in groups.items():
                if normalized in keys and value is not None and value != '' and value != [] and value != {}:
                    counts[label] += 1
    return counts



def player_candidates(payload, known_squad):
    # Cross-check full names against our existing football-data roster.
    known = {p.get('name', '').casefold().strip() for p in known_squad
             if isinstance(p, dict) and isinstance(p.get('name'), str)}
    found = {}
    for row in records(payload):
        name = row.get('name', row.get('playerName'))
        identifier = row.get('id', row.get('playerId'))
        if (isinstance(name, str) and name.casefold().strip() in known
                and re.fullmatch(r'[0-9]{1,10}', str(identifier or ''))):
            found.setdefault(name.casefold().strip(), set()).add(str(identifier))
    return sorted((name, next(iter(ids))) for name, ids in found.items() if len(ids) == 1)


def main():
    key = os.environ.get('RAPIDAPI_KEY', '').strip()
    if not key:
        print('RAPIDAPI_KEY is missing. No requests made.')
        return 1
    client = Client(key)
    try:
        search = client.get('/football-teams-search', {'search': 'Wrexham'})
        candidates = wrexham_ids(search)
        print('Exact Wrexham team identifiers found:', len(candidates))
        if len(candidates) != 1:
            print('Stopped: team identity needs review. No squad request made.')
            return 1
        squad = client.get('/football-get-list-player', {'teamid': next(iter(candidates))})
        print('Squad response received. Populated candidate fields:', json.dumps(summarize(squad), sort_keys=True))
        roster = json.loads((Path(__file__).resolve().parents[1] / 'data/sports.json').read_text(encoding='utf-8'))
        matches = player_candidates(squad, roster.get('squad', []))
        print('Players matching existing roster:', len(matches))
        if not matches:
            print('Stopped: no unambiguous player match. No player detail request made.')
            return 1
        detail = client.get('/football-get-player-detail', {'playerid': matches[0][1]})
        print('One player detail response received. Populated candidate fields:', json.dumps(summarize(detail), sort_keys=True))
        print('Field detection only; does not verify current season, rating source, image availability or reuse rights.')
        print('Requests used:', client.calls)
        return 0
    except urllib.error.HTTPError as error:
        print('API request failed. HTTP status:', error.code)
        error.close()
    except (urllib.error.URLError, ValueError, TypeError, TimeoutError, RecursionError, OSError):
        print('API request failed or returned an unsupported response. No response contents logged.')
    print('Requests attempted:', client.calls)
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
