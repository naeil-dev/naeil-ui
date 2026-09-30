import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).parents[1] / 'scripts' / 'twenty_first.py'

class ClientTest(unittest.TestCase):
    def test_helper_exists(self):
        self.assertTrue(SCRIPT.exists(), 'missing reusable 21st client')

    @unittest.skipUnless(SCRIPT.exists(), 'helper not implemented yet')
    def test_real_stdio_and_error_handling(self):
        spec = importlib.util.spec_from_file_location('twenty_first', SCRIPT)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        with tempfile.TemporaryDirectory() as folder:
            server = Path(folder) / 'server.py'
            server.write_text('''import sys,json
for line in sys.stdin:
 q=json.loads(line)
 if 'id' not in q:continue
 method=q['method']
 if method=='initialize':r={'protocolVersion':'2024-11-05','capabilities':{}}
 elif method=='tools/list':r={'tools':[{'name':'get_usage'},{'name':'search'}]}
 elif q['params']['name']=='get_usage':r={'content':[{'type':'text','text':'{"remaining":2}'}]}
 else:
  print(json.dumps({'jsonrpc':'2.0','method':'notifications/progress','params':{}}),flush=True)
  r={'content':[{'type':'text','text':q['params']['arguments']['query']}]}
 print(json.dumps({'jsonrpc':'2.0','id':q['id'],'result':r}),flush=True)
''')
            result = m.run([sys.executable,str(server)], query='table toolbar', timeout=2)
            self.assertEqual(result['status'],'searched')
            self.assertIn('search',result['tools'])
            self.assertIn('table toolbar',json.dumps(result['search']))
            self.assertEqual(m.run([sys.executable,str(server)],timeout=2)['status'],'connected')
            server.write_text('import time; time.sleep(10)')
            with self.assertRaises(m.ClientError):m.run([sys.executable,str(server)],timeout=0.1)
            server.write_text('print("SECRET-test-value"); raise SystemExit(1)')
            with self.assertRaises(m.ClientError) as caught:m.run([sys.executable,str(server)],timeout=1)
            self.assertNotIn('SECRET',str(caught.exception))

    @unittest.skipUnless(SCRIPT.exists(), 'helper not implemented yet')
    def test_usage_error_stops_before_search_and_hides_raw_error(self):
        spec = importlib.util.spec_from_file_location('twenty_first', SCRIPT)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        with tempfile.TemporaryDirectory() as folder:
            log = Path(folder) / 'calls.jsonl'
            server = Path(folder) / 'server.py'
            server.write_text("""import sys,json
for line in sys.stdin:
 q=json.loads(line)
 with open(sys.argv[1],'a') as f:f.write(json.dumps(q)+'\\n')
 if 'id' not in q:continue
 if q['method']=='initialize':r={'protocolVersion':'2024-11-05','capabilities':{}}
 elif q['method']=='tools/list':r={'tools':[{'name':'get_usage'},{'name':'search'}]}
 else:r={'isError':True,'content':[{'type':'text','text':'SECRET-payment-error'}]}
 print(json.dumps({'jsonrpc':'2.0','id':q['id'],'result':r}),flush=True)
""")
            with self.assertRaises(m.ClientError) as caught:
                m.run([sys.executable,str(server),str(log)],query='table',timeout=2)
            self.assertNotIn('SECRET',str(caught.exception))
            calls=[json.loads(line) for line in log.read_text().splitlines()]
            tool_calls=[q['params']['name'] for q in calls if q['method']=='tools/call']
            self.assertEqual(tool_calls,['get_usage'])

    def test_server_request_ids_blank_lines_and_response_are_distinct(self):
        spec = importlib.util.spec_from_file_location('twenty_first', SCRIPT)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        with tempfile.TemporaryDirectory() as folder:
            server = Path(folder) / 'server.py'
            server.write_text("""import sys,json
for line in sys.stdin:
 q=json.loads(line)
 if 'method' not in q or 'id' not in q:continue
 if q['method']=='initialize':
  print(json.dumps({'jsonrpc':'2.0','id':q['id'],'method':'ping'}),flush=True)
  reply=json.loads(sys.stdin.readline())
  if reply.get('result')!={}:raise SystemExit(2)
  print(json.dumps({'jsonrpc':'2.0','id':q['id'],'method':'unsupported'}),flush=True)
  reply=json.loads(sys.stdin.readline())
  if reply.get('error',{}).get('code')!=-32601:raise SystemExit(3)
  r={'protocolVersion':'2024-11-05','capabilities':{}}
 elif q['method']=='tools/list':r={'tools':[{'name':'get_usage'}]}
 else:r={'content':[{'type':'text','text':'Account usage: remaining 2'}]}
 print('',flush=True)
 print(json.dumps({'jsonrpc':'2.0','id':q['id'],'result':r}),flush=True)
""")
            self.assertEqual(m.run([sys.executable,str(server)],timeout=1)['status'],'connected')

    def test_timeout_cleans_launcher_descendants(self):
        import os
        import subprocess
        import time
        spec = importlib.util.spec_from_file_location('twenty_first', SCRIPT)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        with tempfile.TemporaryDirectory() as folder:
            server = Path(folder) / 'server.py'
            pid_file = Path(folder) / 'pid'
            server.write_text("import signal,subprocess,time,sys\nsignal.signal(signal.SIGTERM,signal.SIG_IGN)\np=subprocess.Popen([sys.executable,'-c','import time;time.sleep(30)'])\nopen(sys.argv[1],'w').write(str(p.pid))\ntime.sleep(30)\n")
            try:
                with self.assertRaises(m.ClientError):m.run([sys.executable,str(server),str(pid_file)],timeout=0.3)
                pid=int(pid_file.read_text())
                state=subprocess.run(['ps','-p',str(pid),'-o','stat='],capture_output=True,text=True).stdout.strip()
                self.assertTrue(not state or state.startswith('Z'), 'descendant still running')
            finally:
                if pid_file.exists():
                    try:os.kill(int(pid_file.read_text()),9)
                    except ProcessLookupError:pass

class ResponseValidationTest(unittest.TestCase):
    def test_malformed_tools_empty_tool_results_and_valid_empty_search(self):
        spec = importlib.util.spec_from_file_location('client_validation', SCRIPT)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        with tempfile.TemporaryDirectory() as folder:
            server = Path(folder) / 'server.py'
            server.write_text("""import json,sys
mode=sys.argv[1]
for line in sys.stdin:
 q=json.loads(line)
 if 'id' not in q:continue
 if q['method']=='initialize':r={'protocolVersion':'2024-11-05','capabilities':{}}
 elif q['method']=='tools/list':r={'tools':None if mode=='bad-tools' else [{'name':True}] if mode=='bad-name' else [{'name':'get_usage'},{'name':'search'}]}
 elif q['params']['name']=='get_usage':r={} if mode=='empty-usage' else {'content':[]} if mode=='no-usage-data' else {'content':[{'type':'text','text':'Account usage: remaining 2'}]}
 else:r={} if mode=='empty-search' else {'content':[]}
 print(json.dumps({'jsonrpc':'2.0','id':q['id'],'result':r}),flush=True)
""")
            for mode in ['bad-tools','bad-name','empty-usage','no-usage-data','empty-search']:
                with self.subTest(mode=mode):
                    with self.assertRaises(m.ClientError):
                        m.run([sys.executable,str(server),mode],query='table',timeout=1)
            result=m.run([sys.executable,str(server),'valid'],query='table',timeout=1)
            self.assertEqual(result['status'],'searched')
            self.assertEqual(result['search']['content'],[])

    def test_nonfinite_timeout_is_rejected_before_launcher_runs(self):
        import subprocess
        with tempfile.TemporaryDirectory() as folder:
            launched=Path(folder)/'launched'
            server=Path(folder)/'server.py'
            server.write_text('from pathlib import Path; Path('+repr(str(launched))+').touch()')
            for value in ['nan','inf','-inf','0']:
                with self.subTest(value=value):
                    launched.unlink(missing_ok=True)
                    p=subprocess.run([sys.executable,str(SCRIPT),'status','--launcher',str(server),'--timeout='+value],capture_output=True,text=True,timeout=5)
                    self.assertEqual(p.returncode,2)
                    self.assertNotIn('Traceback',p.stderr)
                    self.assertFalse(launched.exists())

if __name__=='__main__':unittest.main()
