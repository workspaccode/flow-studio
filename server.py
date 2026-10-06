"""Run Flow Studio and persist domain projects in ./projects. No dependencies."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlsplit, unquote
import base64
import json
import os
import re
import threading
import uuid

ROOT = Path(__file__).resolve().parent
PROJECTS = Path(os.environ.get('FLOW_STUDIO_PROJECTS', ROOT / 'projects')).resolve()
LOCK = threading.Lock()


def project_dir(key):
    if not re.fullmatch(r'[a-f0-9]{32}', key):
        raise ValueError('Invalid project ID')
    path = PROJECTS / key
    if path.is_symlink():
        raise ValueError('Invalid project folder')
    return path


def atomic(path, text):
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(text, encoding='utf-8')
    os.replace(temp, path)


def persist(folder, payload, creating=False):
    if not isinstance(payload, dict):
        raise ValueError('Invalid project payload')
    p = payload.get('project')
    status = payload.get('status', 'draft')
    if status not in ('draft', 'active', 'complete'):
        raise ValueError('Invalid project status')
    if not isinstance(p, dict) or p.get('format') != 'flow-studio' or p.get('version') != 1:
        raise ValueError('Invalid Flow Studio project')
    if not isinstance(p.get('title'), str) or not p['title'].strip() or len(p['title']) > 100:
        raise ValueError('Project name must contain 1–100 characters')
    if not isinstance(p.get('nodes'), list) or not isinstance(p.get('edges'), list) or not isinstance(p.get('assets'), dict):
        raise ValueError('Invalid project data')
    if len(p['nodes']) > 100 or len(p['edges']) > 200:
        raise ValueError('Project exceeds element limit')
    decoded = []
    for key, asset in p['assets'].items():
        if not re.fullmatch(r'[\w-]{1,100}', key):
            raise ValueError('Invalid asset name')
        if not isinstance(asset, dict) or any(not isinstance(asset.get(field), (int, float)) or isinstance(asset.get(field), bool) or not 1 <= asset[field] <= 10000 for field in ('width', 'height')):
            raise ValueError('Invalid asset dimensions')
        match = re.fullmatch(r'data:image/(png|jpeg|gif|webp|svg\+xml);base64,(.+)', asset.get('src', ''), re.DOTALL)
        if not match:
            raise ValueError('Assets must be embedded images')
        data = base64.b64decode(match[2], validate=True)
        ext = {'svg+xml': 'svg', 'jpeg': 'jpg'}.get(match[1], match[1])
        decoded.append((f'{key}.{ext}', data))
    old = json.loads((folder / 'metadata.json').read_text()) if not creating else {}
    now = datetime.now(timezone.utc).isoformat()
    metadata = {'id': folder.name, 'title': p['title'], 'status': status, 'createdAt': old.get('createdAt', now), 'updatedAt': now,
                'nodes': len(p['nodes']), 'edges': len(p['edges']), 'assets': len(p['assets']), 'folder': str(folder)}
    folder.mkdir(parents=True, exist_ok=not creating)
    assets = folder / 'assets'
    if assets.is_symlink():
        raise ValueError('Invalid assets folder')
    assets.mkdir(exist_ok=True)
    for name, data in decoded:
        # Asset filenames use validated keys and media extensions only.
        target = assets / name
        if target.is_symlink():
            raise ValueError('Invalid asset path')
        temp = assets / (name + '.tmp')
        temp.write_bytes(data)
        os.replace(temp, target)
    atomic(folder / 'project.flow.json', json.dumps(p, ensure_ascii=False, indent=2))
    atomic(folder / 'metadata.json', json.dumps(metadata, ensure_ascii=False, indent=2))
    atomic(folder / 'assets.json', json.dumps({key: {'file': next(name for name, _ in decoded if name.rsplit('.', 1)[0] == key), 'width': asset['width'], 'height': asset['height']} for key, asset in p['assets'].items()}, ensure_ascii=False, indent=2))
    return metadata


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def json_response(self, data, status=200):
        raw = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(raw)

    def safe_request(self):
        host = self.headers.get('Host', '')
        origin = self.headers.get('Origin')
        return host in (f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}') and (not origin or origin in ('http://' + host, 'http://127.0.0.1:5173', 'http://localhost:5173'))

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path.startswith('/api/domain/'):
            if not self.safe_request():
                return self.json_response({'error': 'Local requests only'}, 403)
            try:
                with LOCK:
                    if path == '/api/domain/projects':
                        entries = []
                        if PROJECTS.exists():
                            for folder in PROJECTS.iterdir():
                                if folder.is_dir() and not folder.is_symlink() and (folder / 'metadata.json').is_file():
                                    try:
                                        entries.append(json.loads((folder / 'metadata.json').read_text()))
                                    except (ValueError, OSError):
                                        continue
                        return self.json_response({'projects': sorted(entries, key=lambda e: e['updatedAt'], reverse=True), 'root': str(PROJECTS)})
                    key = path.removeprefix('/api/domain/projects/')
                    folder = project_dir(key)
                    return self.json_response({'metadata': json.loads((folder / 'metadata.json').read_text()), 'project': json.loads((folder / 'project.flow.json').read_text())})
            except FileNotFoundError:
                return self.json_response({'error': 'Project folder not found'}, 404)
            except (ValueError, OSError) as exc:
                return self.json_response({'error': str(exc)}, 400)
        if path == '/':
            self.path = '/dist/index.html' if (ROOT / 'dist/index.html').is_file() else '/Flow-Studio.html'
        elif path.startswith('/assets/') and (ROOT / 'dist/index.html').is_file():
            self.path = '/dist' + path
        super().do_GET()

    def write_project(self, creating):
        if not self.safe_request():
            return self.json_response({'error': 'Local requests only'}, 403)
        try:
            path = unquote(urlsplit(self.path).path)
            if creating and path != '/api/domain/projects':
                raise ValueError('Invalid create endpoint')
            if not creating and not path.startswith('/api/domain/projects/'):
                raise ValueError('Invalid save endpoint')
            size = int(self.headers.get('Content-Length', '0'))
            if size <= 0 or size > 25 * 1024 * 1024:
                raise ValueError('Project limit is 25 MB')
            payload = json.loads(self.rfile.read(size))
            with LOCK:
                folder = project_dir(uuid.uuid4().hex if creating else path.removeprefix('/api/domain/projects/'))
                metadata = persist(folder, payload, creating)
            self.json_response({'metadata': metadata}, 201 if creating else 200)
        except FileNotFoundError:
            self.json_response({'error': 'Project folder not found'}, 404)
        except (ValueError, OSError, KeyError, TypeError) as exc:
            self.json_response({'error': str(exc)}, 400)

    def do_POST(self):
        self.write_project(True)

    def do_PUT(self):
        self.write_project(False)


if __name__ == '__main__':
    port = int(os.environ.get('FLOW_STUDIO_PORT', '8765'))
    print(f'Flow Studio: http://127.0.0.1:{port}/#domain', flush=True)
    print('Domain projects:', PROJECTS, flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
