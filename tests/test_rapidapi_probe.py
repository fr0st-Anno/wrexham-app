import io
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch, MagicMock
from scripts import probe_rapidapi as probe


class ProbeTests(unittest.TestCase):
    def test_structure_omits_values_and_sensitive_field_names(self):
        payload = {'data': [{'name':'Private Name', 'stats': {'score':7.2}}],
                   'apiToken':'private-token', 'MYSECRET':'hidden', 'bad\nfield':'hidden'}
        result = probe.structure(payload, 'MYSECRET')
        text = str(result)
        for value in ['Private Name', '7.2', 'private-token', 'apiToken', 'MYSECRET', 'hidden', 'bad\nfield']:
            self.assertNotIn(value, text)
        self.assertIn({'path':'$.data[].stats.score', 'type':'number'}, result)

    def test_structure_is_bounded_and_handles_scalar_response(self):
        self.assertEqual(probe.structure('private response', ''), [{'path':'$', 'type':'string'}])
        payload = {f'field{i}': [{f'nested{j}': j for j in range(50)}] for i in range(50)}
        self.assertLessEqual(len(probe.structure(payload, '')), 120)

    def test_exact_team_only(self):
        data = {'data': [{'name':'Wrexham AFC','id':123}, {'name':'Wrexham Women','id':456}]}
        self.assertEqual(probe.wrexham_ids(data), {'123'})
        self.assertEqual(probe.wrexham_ids({'name':'Wrexham','id':'secret'}), set())

    def test_ambiguous_search_stops_after_one_request(self):
        with patch.dict('os.environ', {'RAPIDAPI_KEY':'test-secret'}), patch.object(probe.Client, 'get', return_value=[{'name':'Wrexham','id':1},{'name':'Wrexham','id':2}]) as get, redirect_stdout(io.StringIO()):
            self.assertEqual(probe.main(), 1)
            self.assertEqual(get.call_count, 1)

    def test_summary_does_not_echo_values_or_unknown_keys(self):
        result = probe.summarize({'players':[{'rating':7.2,'image':'test-secret','test-secret':'test-secret'}], 'season':None})
        self.assertEqual(result, {'player':1,'rating':1,'image':1,'season':0})
        self.assertNotIn('test-secret', str(result))

    def test_request_boundary_and_header_only_auth(self):
        client = probe.Client('test-secret')
        client.opener = MagicMock()
        client.opener.open.return_value.__enter__.return_value.read.return_value = b'{}'
        for _ in range(3):
            client.get('/football-teams-search', {'search':'Wrexham'})
        request = client.opener.open.call_args.args[0]
        self.assertNotIn('test-secret', request.full_url)
        self.assertEqual(request.get_header('X-rapidapi-key'), 'test-secret')
        with self.assertRaises(ValueError):
            client.get('/football-teams-search', {})
        self.assertEqual(client.opener.open.call_count, 3)
        self.assertIsNone(probe.NoRedirect().redirect_request(None,None,302,'',{},'https://other.test'))

    def test_missing_key_uses_no_requests(self):
        with patch.dict('os.environ', {'RAPIDAPI_KEY':''}), patch.object(probe.Client, 'get') as get, redirect_stdout(io.StringIO()):
            self.assertEqual(probe.main(), 1)
            get.assert_not_called()

    def test_player_matching_rejects_unknown_and_ambiguous_ids(self):
        roster = [{'name': 'Test Player'}]
        self.assertEqual(probe.player_candidates([{'name':'TEST PLAYER','id':42}, {'name':'Unknown','id':43}], roster), [('test player','42')])
        self.assertEqual(probe.player_candidates([{'name':'Test Player','id':42}, {'name':'Test Player','id':43}], roster), [])
        self.assertEqual(probe.player_candidates([{'name':'Test Player','id':'secret'}], roster), [])

    def test_detail_request_uses_matched_id_without_logging_response(self):
        output = io.StringIO()
        responses = [{'name':'Wrexham','id':1}, {'players':[{'name':'Test Player','id':42}]}, {'rating':7.2,'photo':'private-value'}]
        with patch.dict('os.environ', {'RAPIDAPI_KEY':'test-secret'}), patch.object(probe.Client, 'get', side_effect=responses) as get, patch.object(probe.Path, 'read_text', return_value='{"squad":[{"name":"Test Player"}]}'), redirect_stdout(output):
            self.assertEqual(probe.main(), 0)
        self.assertEqual(get.call_count, 3)
        self.assertEqual(get.call_args.args, ('/football-get-player-detail', {'playerid':'42'}))
        self.assertNotIn('private-value', output.getvalue())
        self.assertNotIn('test-secret', output.getvalue())

