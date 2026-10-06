import base64
import json
from pathlib import Path
import tempfile
import unittest
import server


class DomainFolderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old_root = server.PROJECTS
        server.PROJECTS = Path(self.temp.name)
        self.folder = server.project_dir('a' * 32)
        self.project = {'format': 'flow-studio', 'version': 1, 'title': 'مشروع الاختبار',
                        'nodes': [], 'edges': [], 'assets': {'sun': {
                            'width': 1, 'height': 1, 'src': 'data:image/gif;base64,' + base64.b64encode(b'GIF89a').decode()}}}

    def tearDown(self):
        server.PROJECTS = self.old_root
        self.temp.cleanup()

    def test_create_and_update_preserve_assets_and_creation_time(self):
        first = server.persist(self.folder, {'project': self.project}, True)
        self.assertEqual((self.folder / 'assets/sun.gif').read_bytes(), b'GIF89a')
        self.assertEqual(json.loads((self.folder / 'assets.json').read_text())['sun']['file'], 'sun.gif')
        self.project['title'] = 'اسم جديد'
        second = server.persist(self.folder, {'project': self.project, 'status': 'complete'})
        self.assertEqual(first['createdAt'], second['createdAt'])
        self.assertEqual(second['status'], 'complete')
        self.assertEqual(json.loads((self.folder / 'project.flow.json').read_text())['title'], 'اسم جديد')

    def test_invalid_save_does_not_replace_existing_project(self):
        server.persist(self.folder, {'project': self.project}, True)
        before = (self.folder / 'project.flow.json').read_bytes()
        with self.assertRaises(ValueError):
            server.persist(self.folder, {'project': self.project, 'status': 'invalid'})
        self.assertEqual((self.folder / 'project.flow.json').read_bytes(), before)

    def test_malformed_asset_leaves_existing_files_unchanged(self):
        server.persist(self.folder, {'project': self.project}, True)
        before = (self.folder / 'project.flow.json').read_bytes()
        del self.project['assets']['sun']['width']
        with self.assertRaises(ValueError):
            server.persist(self.folder, {'project': self.project})
        self.assertEqual((self.folder / 'project.flow.json').read_bytes(), before)

    def test_asset_and_project_paths_cannot_escape_folder(self):
        with self.assertRaises(ValueError):
            server.project_dir('../outside')
        self.project['assets']['../outside'] = self.project['assets']['sun']
        with self.assertRaises(ValueError):
            server.persist(self.folder, {'project': self.project}, True)
        self.assertFalse(self.folder.exists())


if __name__ == '__main__':
    unittest.main()
