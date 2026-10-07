"""Offline regressions: python -B -m unittest discover -s tests -v (also requires Node.js)."""
import contextlib
import importlib.util
import io
import json
import runpy
import subprocess
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
spec = importlib.util.spec_from_file_location('align_lyrics', ROOT / 'analysis/align_lyrics.py')
align = importlib.util.module_from_spec(spec)
spec.loader.exec_module(align)


class CacheTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.audio = self.root / 'song.wav'
        self.audio.write_bytes(b'original song')
        self.cache = self.root / 'data/whisper_words.json'
        self.words = [{'w': 'hello', 'start': 1.0, 'end': 1.5}]
        patcher = patch.object(align, 'transcribe', return_value=self.words)
        self.transcribe = patcher.start()
        self.addCleanup(patcher.stop)
        stdout = contextlib.redirect_stdout(io.StringIO())
        stdout.__enter__()
        self.addCleanup(stdout.__exit__, None, None, None)

    def get(self, **kw):
        args = dict(audio=self.audio, lang='en', model='large-v3-turbo', backend='auto', prompt='hello')
        args.update(kw)
        return align.cached_transcribe(self.cache, **args)

    def test_unchanged_input_reuses_cache_and_keeps_list_format(self):
        self.assertEqual(self.get(), self.words)
        self.assertEqual(self.get(), self.words)
        self.assertEqual(json.loads(self.cache.read_text()), self.words)
        self.assertEqual(self.transcribe.call_count, 1)

    def test_changed_audio_of_same_size_invalidates_cache(self):
        self.get()
        self.audio.write_bytes(b'modified song')
        self.get()
        self.assertEqual(self.transcribe.call_count, 2)

    def test_new_vocal_source_invalidates_cache(self):
        self.get()
        vocals = self.root / 'vocals.wav'
        vocals.write_bytes(b'isolated vocals')
        self.get(audio=vocals)
        self.assertEqual(self.transcribe.call_args.args[0], vocals)
        self.assertEqual(self.transcribe.call_count, 2)

    def test_each_recognition_setting_invalidates_cache(self):
        for key, value in [('lang', 'zh'), ('model', 'large-v3'), ('backend', 'faster'), ('prompt', 'new lyrics')]:
            with self.subTest(key=key):
                self.get()
                before = self.transcribe.call_count
                self.get(**{key: value})
                self.assertEqual(self.transcribe.call_count, before + 1)

    def test_force_retranscribes(self):
        self.get()
        self.get(force=True)
        self.assertEqual(self.transcribe.call_count, 2)

    def test_legacy_or_invalid_metadata_is_not_trusted(self):
        self.get()
        meta = self.cache.with_suffix('.meta.json')
        for raw in [None, '{broken', '[]', '{}']:
            with self.subTest(raw=raw):
                if raw is None:
                    meta.unlink()
                else:
                    meta.write_text(raw)
                before = self.transcribe.call_count
                self.get()
                self.assertEqual(self.transcribe.call_count, before + 1)

    def test_cache_content_must_match_metadata(self):
        self.get()
        self.cache.write_text('[{"w":"stale","start":99,"end":100}]')
        self.assertEqual(self.get(), self.words)
        self.assertEqual(self.transcribe.call_count, 2)

    def test_transcription_failure_preserves_previous_cache(self):
        self.get()
        old = self.cache.read_bytes(), self.cache.with_suffix('.meta.json').read_bytes()
        self.transcribe.side_effect = RuntimeError('recognition failed')
        with self.assertRaises(RuntimeError):
            self.get(lang='zh')
        self.assertEqual(old, (self.cache.read_bytes(), self.cache.with_suffix('.meta.json').read_bytes()))

    def test_words_override_does_not_require_audio_or_whisper(self):
        (self.root / 'project.js').write_text('window.MV_PROJECT = {"title":"fixture"};')
        (self.root / 'lyrics.txt').write_text('hello\n')
        words = self.root / 'words.json'
        words.write_text(json.dumps(self.words))
        with patch.object(sys, 'argv', ['align_lyrics.py', str(self.root), '--words', str(words)]):
            align.main()
        self.transcribe.assert_not_called()
        self.assertTrue((self.root / 'data/lyrics.json').exists())

    def test_tuner_save_reuses_existing_transcript_without_recognition(self):
        import tune_lyrics
        self.get(lang='zh', model='large-v3')
        (self.root / 'project.js').write_text('window.MV_PROJECT = {"title":"fixture","audio":"song.wav"};')
        (self.root / 'lyrics.txt').write_text('hello\n')
        tuner = tune_lyrics.Tuner(self.root)

        def align_saved_words(args, **kwargs):
            self.assertIn('--words', args)
            self.assertEqual(Path(args[-1]).resolve(), self.cache.resolve())
            with patch.object(sys, 'argv', args[1:]):
                align.main()
            return types.SimpleNamespace(returncode=0, stdout='', stderr='')

        self.transcribe.reset_mock()
        with patch.object(tune_lyrics.subprocess, 'run', side_effect=align_saved_words):
            self.assertTrue(tuner.save({'set': [{'line': 0, 'word': 0, 'start': 1.2}]})['ok'])
        self.transcribe.assert_not_called()
        doc = json.loads((self.root / 'data/lyrics.json').read_text())
        self.assertEqual(doc['lines'][0]['words'][0]['start'], 1.2)

    def test_tuner_without_transcript_keeps_lrc_mode(self):
        import tune_lyrics
        (self.root / 'project.js').write_text('window.MV_PROJECT = {"title":"fixture","audio":"song.wav"};')
        (self.root / 'lyrics.txt').write_text('[00:01.00] hello\n')
        tuner = tune_lyrics.Tuner(self.root)
        with patch.object(tune_lyrics.subprocess, 'run', return_value=types.SimpleNamespace(returncode=0, stdout='', stderr='')) as run:
            self.assertTrue(tuner.save({})['ok'])
        self.assertEqual(run.call_args.args[0][-1], '--no-whisper')


class RendererTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.project = Path(self.tmp.name)
        (self.project / 'project.js').write_text('window.MV_PROJECT = {"title":"fixture","fps":24};')

    def load(self, *args):
        with patch.object(sys, 'argv', ['render.py', str(self.project), 'check', *args]):
            return runpy.run_path(str(ROOT / 'tools/render.py'), run_name='render_test')

    def check_status(self, scene_error=False, browser_error=False, lint=False):
        mod = self.load()
        g = mod['main'].__globals__
        closed = []

        class FakePage:
            def __init__(self, pw, errors):
                if browser_error:
                    errors.append('deliberate browser error')
                self.page = types.SimpleNamespace(evaluate=lambda _: None)
                self.info = {'title': 'fixture', 'from': 0, 'to': 1, 'fps': 24, 'width': 1920, 'height': 1080,
                             'warnings': [], 'shots': [{'name': 'shot', 'from': 0, 'to': 1}],
                             'lint': [{'t': 0, 'kind': 'offbeat', 'msg': 'warning only'}] if lint else []}

            def frame(self, t, samples, fmt, scene_errors):
                if scene_error:
                    scene_errors['shot'] = 'deliberate scene error'
                return b''

            def close(self):
                closed.append(True)

        g['Page'] = FakePage
        fake_pw = types.SimpleNamespace(sync_playwright=lambda: contextlib.nullcontext())
        with patch.dict(sys.modules, {'playwright.sync_api': fake_pw}), contextlib.redirect_stdout(io.StringIO()):
            try:
                g['main']()
                code = 0
            except SystemExit as e:
                code = e.code
        self.assertEqual(closed, [True])
        return code

    def test_check_fails_on_scene_error(self):
        self.assertEqual(self.check_status(scene_error=True), 1)

    def test_check_fails_on_browser_error(self):
        self.assertEqual(self.check_status(browser_error=True), 1)

    def test_check_succeeds_on_clean_render(self):
        self.assertEqual(self.check_status(), 0)

    def test_lint_warning_is_not_a_render_failure(self):
        self.assertEqual(self.check_status(lint=True), 0)

    def test_fps_override_reaches_page_url(self):
        mod = self.load('--fps', '60')
        page = types.SimpleNamespace(on=lambda *args: None, goto=lambda url: urls.append(url),
                                     wait_for_function=lambda *args, **kw: None,
                                     evaluate=lambda s: {'fps': 60} if s == 'MV_EXPORT.info' else s == 'window.MV_READY === true')
        urls = []
        mod['Page'].__init__.__globals__['launch'] = lambda _: types.SimpleNamespace(new_page=lambda **kw: page)
        pg = mod['Page'](None, [])
        self.assertIn('&fps=60', urls[0])
        self.assertEqual(pg.info['fps'], 60)

    def test_invalid_fps_is_rejected(self):
        for fps in ['0', '-1']:
            with self.subTest(fps=fps), self.assertRaises(SystemExit) as e:
                self.load('--fps', fps)
            self.assertEqual(str(e.exception), '--fps must be > 0')


class JavaScriptTests(unittest.TestCase):
    def test_timeline_and_export_sampling(self):
        subprocess.run(['node', '--test', str(ROOT / 'tests/engine.test.cjs')], check=True, cwd=ROOT)


if __name__ == '__main__':
    unittest.main()
