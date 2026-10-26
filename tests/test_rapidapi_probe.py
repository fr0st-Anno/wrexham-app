import io
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch, MagicMock
from scripts import probe_rapidapi as probe


class ProbeTests(unittest.TestCase):
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
        for _ in range(2):
            client.get('/football-teams-search', {'search':'Wrexham'})
        request = client.opener.open.call_args.args[0]
        self.assertNotIn('test-secret', request.full_url)
        self.assertEqual(request.get_header('X-rapidapi-key'), 'test-secret')
        with self.assertRaises(ValueError):
            client.get('/football-teams-search', {})
        self.assertEqual(client.opener.open.call_count, 2)
        self.assertIsNone(probe.NoRedirect().redirect_request(None,None,302,'',{},'https://other.test'))

    def test_missing_key_uses_no_requests(self):
        with patch.dict('os.environ', {'RAPIDAPI_KEY':''}), patch.object(probe.Client, 'get') as get, redirect_stdout(io.StringIO()):
            self.assertEqual(probe.main(), 1)
            get.assert_not_called()
