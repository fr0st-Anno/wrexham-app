"""Synthetic provider responses only; never publish these as real sports data."""
import copy
import io
import json
import tempfile
import unittest
import urllib.error
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest.mock import patch
from scripts import update_sports as sports

SEASON = {'id': 123, 'startDate': '2026-08-01', 'endDate': '2027-05-31'}
TEAM = {'id': 1, 'name': 'Wrexham AFC'}
TABLE = {'competition': {'code': 'ELC'}, 'season': SEASON, 'standings': [
    {'type': 'HOME', 'table': []},
    {'type': 'TOTAL', 'table': [{'position': 1, 'team': TEAM, 'playedGames': 3, 'goalDifference': -1, 'points': 4}]}]}


def match(status='TIMED', date='2099-01-01T15:00:00Z', home=0, away=0):
    return {'id': 7, 'season': SEASON, 'homeTeam': TEAM, 'awayTeam': {'id': 2, 'name': 'Test opponents'},
            'utcDate': date, 'status': status, 'score': {'fullTime': {'home': home, 'away': away}}}


class SportsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name)/'sports.json'
        self.health = Path(self.temp.name)/'health.json'
        self.previous = '{"existing": "keep me"}'
        self.output.write_text(self.previous)
        for name, value in [('OUTPUT', self.output), ('HEALTH', self.health), ('TOKEN', 'test-secret')]:
            p = patch.object(sports, name, value); p.start(); self.addCleanup(p.stop)
        self.matches = {'competition': {'code': 'ELC'}, 'matches': [match(), match('FINISHED', '2026-01-01T15:00:00Z')]}

    def run_update(self, table=None, matches=None, squad=None):
        responses = [table or TABLE, matches or self.matches, squad if squad is not None else {'squad': []}]
        with patch.object(sports, 'get', side_effect=responses), redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            return sports.main()

    def test_success_and_nil_nil(self):
        self.assertEqual(self.run_update(), 0)
        data = json.loads(self.output.read_text())
        self.assertEqual(data['results'][0]['home_score'], 0)
        self.assertEqual(data['standings'][0]['goal_difference'], -1)
        self.assertEqual(data['season']['start'], '2026-08-01')
        self.assertNotIn('test-secret', self.output.read_text()+self.health.read_text())

    def test_match_states_and_team_filter(self):
        self.matches['matches'] += [match('POSTPONED'), match('IN_PLAY'), match('CANCELLED'), match('TIMED', '2020-01-01T00:00:00Z')]
        other = match(); other['homeTeam'] = {'id': 3}; self.matches['matches'].append(other)
        self.assertEqual(self.run_update(), 0)
        data = json.loads(self.output.read_text())
        self.assertEqual(len(data['fixtures']), 1)
        self.assertEqual(len(data['pending']), 4)

    def test_no_token_preserves_snapshot(self):
        with patch.object(sports, 'TOKEN', ''), patch.object(sports, 'get') as get, redirect_stdout(io.StringIO()):
            self.assertEqual(sports.main(), 0); get.assert_not_called()
        self.assertEqual(self.output.read_text(), self.previous)
        self.assertEqual(json.loads(self.health.read_text())['status'], 'not_configured')

    def test_http_failures_do_not_leak_or_erase(self):
        for code, expected in [(400,'unavailable'),(401,'unauthorized'),(403,'access_denied'),(404,'unavailable'),(429,'rate_limited'),(500,'unavailable')]:
            err = urllib.error.HTTPError('https://example.test', code, 'test-secret', {}, None)
            log = io.StringIO()
            with patch.object(sports, 'get', side_effect=err), redirect_stderr(log):
                self.assertEqual(sports.main(), 1)
            self.assertEqual(self.output.read_text(), self.previous)
            self.assertEqual(json.loads(self.health.read_text())['status'], expected)
            self.assertNotIn('test-secret', log.getvalue()+self.health.read_text())
            self.assertIn(f'Football-data.org HTTP status: {code}', log.getvalue())

    def test_invalid_table_and_mixed_seasons_preserve_snapshot(self):
        for mutate in ['missing_total','missing_number','wrong_season','bad_date','missing_team']:
            table, matches = copy.deepcopy(TABLE), copy.deepcopy(self.matches)
            if mutate=='missing_total': table['standings'] = []
            if mutate=='missing_number': table['standings'][1]['table'][0]['points'] = None
            if mutate=='wrong_season': matches['matches'][0]['season'] = {'id': 999}
            if mutate=='bad_date': matches['matches'][0]['utcDate'] = 'invalid'
            if mutate=='missing_team': table['standings'][1]['table'][0]['team'] = {'id': 2, 'name': 'Other club'}
            self.assertEqual(self.run_update(table, matches), 1, mutate)
            self.assertEqual(self.output.read_text(), self.previous)

    def test_empty_matches_is_valid_off_season(self):
        self.matches['matches'] = []
        self.assertEqual(self.run_update(), 0)
        self.assertEqual(json.loads(self.output.read_text())['fixtures'], [])

    def test_optional_squad_failure_keeps_core_data(self):
        self.assertEqual(self.run_update(squad=urllib.error.URLError('no access')), 0)
        self.assertTrue(json.loads(self.output.read_text())['standings'])

    def test_request_auth_is_header_only(self):
        with patch.object(sports.urllib.request, 'urlopen') as open_url:
            response = open_url.return_value.__enter__.return_value
            response.status = 200; response.read.return_value = b'{}'
            sports.get('/competitions/ELC/standings')
            request = open_url.call_args.args[0]
            self.assertNotIn('test-secret', request.full_url)
            self.assertEqual(request.get_header('X-auth-token'), 'test-secret')


if __name__ == '__main__':
    unittest.main()
