"""Read-only 21st MCP status/search through the already configured stdio launcher."""
import argparse
import json
import os
from pathlib import Path
import selectors
import signal
import subprocess
import sys
import time


class ClientError(Exception):
    """Safe diagnostic: never includes child output or authentication data."""


class Client:
    def __init__(self, command, timeout):
        self.timeout = timeout
        self.next_id = 0
        self.buffer = b''
        self.process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                        stderr=subprocess.DEVNULL, start_new_session=True)
        self.selector = selectors.DefaultSelector()
        self.selector.register(self.process.stdout, selectors.EVENT_READ)

    def send(self, message):
        try:
            self.process.stdin.write((json.dumps({'jsonrpc': '2.0', **message}) + '\n').encode())
            self.process.stdin.flush()
        except (BrokenPipeError, OSError):
            raise ClientError('MCP launcher stopped; check local configuration.') from None

    def call(self, method, params):
        self.next_id += 1
        request_id = self.next_id
        self.send({'id': request_id, 'method': method, 'params': params})
        deadline = time.monotonic() + self.timeout
        while True:
            if time.monotonic() >= deadline:
                raise ClientError('MCP timed out; no automatic retry was made.')
            if b'\n' not in self.buffer:
                remaining = deadline - time.monotonic()
                if remaining <= 0 or not self.selector.select(remaining):
                    raise ClientError('MCP timed out; no automatic retry was made.')
                chunk = os.read(self.process.stdout.fileno(), 65536)
                if not chunk:
                    raise ClientError('MCP closed before replying; verify launcher/authentication.')
                self.buffer += chunk
                if len(self.buffer) > 8 * 1024 * 1024:
                    raise ClientError('MCP response exceeded the bounded reader size.')
                continue
            raw, self.buffer = self.buffer.split(b'\n', 1)
            if not raw.strip():
                continue
            try:
                message = json.loads(raw)
            except (ValueError, UnicodeError):
                raise ClientError('Launcher returned non-JSON protocol output; output suppressed.') from None
            if not isinstance(message, dict):
                raise ClientError('Invalid MCP response.')
            if 'method' in message:
                if 'id' in message:
                    reply = {'result': {}} if message['method'] == 'ping' else {
                        'error': {'code': -32601, 'message': 'Client method not supported'}}
                    self.send({'id': message['id'], **reply})
                continue
            if message.get('id') != request_id:
                if time.monotonic() >= deadline:
                    raise ClientError('MCP timed out while receiving notifications.')
                continue
            if 'error' in message:
                raise ClientError('MCP rejected the request; raw error suppressed. No retry made.')
            result = message.get('result')
            if not isinstance(result, dict):
                raise ClientError('MCP returned an invalid result.')
            if result.get('isError'):
                raise ClientError('MCP tool failed; check authentication/allowance. No retry made.')
            return result

    def close(self):
        self.selector.close()
        try:
            self.process.stdin.close()
        except (BrokenPipeError, OSError):
            pass
        try:
            self.process.wait(timeout=0.5)
        except subprocess.TimeoutExpired:
            pass
        # Each launcher has its own session, so descendants can be cleaned safely.
        for sig in (signal.SIGTERM, signal.SIGKILL):
            try:
                os.killpg(self.process.pid, sig)
            except ProcessLookupError:
                pass
            if sig == signal.SIGTERM:
                try:
                    self.process.wait(timeout=0.5)
                except subprocess.TimeoutExpired:
                    pass
        self.process.wait()
        self.process.stdout.close()


def run(command, query=None, timeout=30):
    client = Client(command, timeout)
    try:
        client.call('initialize', {'protocolVersion': '2024-11-05', 'capabilities': {},
                                  'clientInfo': {'name': 'frontend-reference-workflow', 'version': '2'}})
        client.send({'method': 'notifications/initialized'})
        names = []
        cursor = None
        for _ in range(10):
            result = client.call('tools/list', {'cursor': cursor} if cursor else {})
            names.extend(item['name'] for item in result.get('tools', []) if isinstance(item, dict) and 'name' in item)
            cursor = result.get('nextCursor')
            if not cursor:
                break
        else:
            raise ClientError('Tool pagination exceeded limit.')
        if 'get_usage' not in names:
            raise ClientError('get_usage unavailable; account status is unverified.')
        usage = client.call('tools/call', {'name': 'get_usage', 'arguments': {}})
        output = {'status': 'connected', 'transport': 'configured-stdio-launcher',
                  'tools': names, 'usage': usage, 'codeRetrieved': False}
        if query is not None:
            if 'search' not in names:
                raise ClientError('Search unavailable; no substitute tool was invoked.')
            output['search'] = client.call('tools/call', {'name': 'search',
                'arguments': {'query': query, 'type': 'component', 'limit': 3}})
            output['status'] = 'searched'
        return output
    finally:
        client.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['status', 'search'])
    parser.add_argument('--query', help='Announce the design gap and query to the user before search.')
    parser.add_argument('--launcher', type=Path, default=Path.home()/'.local/share/naeil-frontend/21st-mcp/launch.py')
    parser.add_argument('--timeout', type=float, default=30)
    args = parser.parse_args()
    if args.timeout <= 0 or (args.action == 'search' and not args.query):
        parser.error('Use a positive timeout and provide --query for search.')
    if not args.launcher.is_file():
        print(json.dumps({'status': 'blocked', 'reason': 'Configured launcher is missing; no installation attempted.'}))
        return 2
    try:
        result = run([sys.executable, str(args.launcher)],
                     args.query if args.action == 'search' else None, args.timeout)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (ClientError, OSError) as exc:
        reason = str(exc) if isinstance(exc, ClientError) else 'Cannot start configured MCP launcher.'
        print(json.dumps({'status': 'blocked', 'reason': reason}))
        return 2


if __name__ == '__main__':
    sys.exit(main())
